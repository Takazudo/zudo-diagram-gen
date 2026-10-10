import { readFile, writeFile, mkdir, readdir, lstat, unlink, realpath } from 'node:fs/promises';
import { resolve, join, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { loadSession } from './model.mjs';
import { createPageSource } from './render.mjs';
import {
  isProject,
  loadProject,
  projectPath,
  ProjectValidationError,
  manifestDiagnostics,
} from './project.mjs';
import { projectRoutes } from './project-render.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const ownershipFile = '.generated/diagram-routes.json';
export function createRunnerState() {
  return { lastValid: new Map(), project: null };
}

async function safeOutput(root, relative) {
  if (
    !/^pages\/(?:index\.tsx|sessions\/[a-z0-9][a-z0-9._-]*\/index\.tsx)$/i.test(relative) &&
    relative !== ownershipFile
  )
    throw new Error('Invalid generated output path.');
  return projectPath(root, relative);
}
async function existingFile(filename) {
  try {
    return await readFile(filename, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/** Hash ownership prevents marker-prefixed user edits from being overwritten or pruned. */
export async function writeOwnedRoutes(root, pages) {
  const ledgerFile = await safeOutput(root, ownershipFile);
  const ledgerText = await existingFile(ledgerFile);
  const ledger = ledgerText === null ? { schemaVersion: 1, routes: {} } : JSON.parse(ledgerText);
  if (
    ledger.schemaVersion !== 1 ||
    !ledger.routes ||
    typeof ledger.routes !== 'object' ||
    Array.isArray(ledger.routes)
  )
    throw new Error('Invalid generated-route ownership ledger.');
  const writes = [],
    deletes = [],
    routes = { ...ledger.routes };
  // Complete preflight before changing any route.
  for (const [relative, source] of pages) {
    const filename = await safeOutput(root, relative);
    const previous = await existingFile(filename);
    if (previous !== null && hash(previous) !== ledger.routes[relative] && previous !== source)
      throw new Error(
        `${relative} belongs to this project and is user-owned or modified. Preserve it. For a pre-ledger generated route, review its SHA-256 and explicitly call adoptGeneratedRoutes(directory, {expectedHashes}); see docs/agent-first/PROJECTS.md.`,
      );
    if (source !== previous) writes.push([filename, source, previous]);
    routes[relative] = hash(source);
  }
  for (const relative of Object.keys(ledger.routes)) {
    if (pages.has(relative)) continue;
    const filename = await safeOutput(root, relative);
    const previous = await existingFile(filename);
    if (previous !== null && hash(previous) === ledger.routes[relative]) deletes.push(filename);
    // A modified obsolete route becomes unowned, and is never removed.
    delete routes[relative];
  }
  for (const [filename, source, previous] of writes) {
    await mkdir(dirname(filename), { recursive: true });
    if (previous === null) await writeFile(filename, source, { flag: 'wx' });
    else {
      if ((await existingFile(filename)) !== previous)
        throw new Error(`Route changed during preparation: ${filename}`);
      await writeFile(filename, source);
    }
  }
  for (const filename of deletes) {
    const relative = filename.slice(root.length + 1).replaceAll('\\', '/');
    if (hash(await readFile(filename)) === ledger.routes[relative]) await unlink(filename);
  }
  const serialized = JSON.stringify({ schemaVersion: 1, routes }, null, 2) + '\n';
  if (serialized !== ledgerText) {
    await mkdir(dirname(ledgerFile), { recursive: true });
    await writeFile(ledgerFile, serialized);
  }
}

/** Explicit migration grants ownership only for caller-reviewed exact current bytes. */
export async function adoptGeneratedRoutes(directory, { expectedHashes } = {}) {
  const root = await realpath(resolve(directory));
  if (
    !expectedHashes ||
    typeof expectedHashes !== 'object' ||
    Array.isArray(expectedHashes) ||
    !Object.keys(expectedHashes).length
  )
    throw new Error('Supply reviewed generated-route SHA-256 expectedHashes.');
  const ledgerFile = await safeOutput(root, ownershipFile);
  const previous = await existingFile(ledgerFile);
  const ledger = previous === null ? { schemaVersion: 1, routes: {} } : JSON.parse(previous);
  if (
    ledger.schemaVersion !== 1 ||
    !ledger.routes ||
    typeof ledger.routes !== 'object' ||
    Array.isArray(ledger.routes)
  )
    throw new Error('Invalid generated-route ownership ledger.');
  const routes = { ...ledger.routes };
  for (const [relative, expected] of Object.entries(expectedHashes)) {
    if (
      relative === ownershipFile ||
      typeof expected !== 'string' ||
      !/^[a-f0-9]{64}$/.test(expected)
    )
      throw new Error('Adoption requires a route and exact SHA-256 hash.');
    const filename = await safeOutput(root, relative);
    const source = await existingFile(filename);
    if (
      source === null ||
      !source.startsWith('// Generated by zudo-diagram-gen.') ||
      hash(source) !== expected
    )
      throw new Error(
        `Adoption conflict: ${relative} differs from the reviewed hash or is not a generated route.`,
      );
    routes[relative] = expected;
  }
  // Recheck exact bytes after all preflight reads, before publishing the ledger.
  for (const [relative, expected] of Object.entries(expectedHashes))
    if (hash(await readFile(await safeOutput(root, relative))) !== expected)
      throw new Error(`Adoption conflict: ${relative} changed during review.`);
  if ((await existingFile(ledgerFile)) !== previous)
    throw new Error('Ownership ledger changed during adoption.');
  await mkdir(dirname(ledgerFile), { recursive: true });
  await writeFile(ledgerFile, JSON.stringify({ schemaVersion: 1, routes }, null, 2) + '\n', {
    flag: previous === null ? 'wx' : 'w',
  });
  return { routes: Object.keys(expectedHashes) };
}

export async function prepareProject(
  directory,
  zfbMajor = 2,
  { strict = false, state = createRunnerState() } = {},
) {
  const root = await realpath(resolve(directory));
  let data;
  if ((await isProject(root)) || state.project) {
    try {
      data = await loadProject(root, { strict, lastValid: state.lastValid });
    } catch (error) {
      if (strict || !state.project || !(error instanceof ProjectValidationError)) throw error;
      data = {
        ...state.project,
        ok: false,
        diagnostics: error.diagnostics,
        sessions: state.project.sessions.map((entry) => ({
          ...entry,
          status: entry.data ? 'stale' : entry.status,
          diagnostics: [...entry.diagnostics, ...error.diagnostics],
        })),
      };
      data.contentHash = hash(JSON.stringify(data));
    }
    await writeOwnedRoutes(root, await projectRoutes(data, zfbMajor));
    state.project = data;
  } else {
    data = await loadSession(root);
    await writeOwnedRoutes(
      root,
      new Map([['pages/index.tsx', await createPageSource(data, {}, zfbMajor)]]),
    );
  }
  return data;
}

/** Watch the small content tree, including additions, with a portable polling scan. */
export async function contentSignature(directory, state = {}) {
  const rows = [];
  async function visit(relative, recursive = true) {
    const full = join(directory, relative);
    let info;
    try {
      info = await lstat(full);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    if (info.isSymbolicLink()) {
      rows.push(`${relative}:symlink`);
      return;
    }
    if (info.isDirectory()) {
      if (!recursive) {
        rows.push(`${relative}:not-file`);
        return;
      }
      const entries = await readdir(full, { withFileTypes: true });
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.isSymbolicLink()) {
          rows.push(`${relative}/${entry.name}:symlink`);
          continue;
        }
        await visit(join(relative, entry.name));
      }
    } else if (/\.(json|svg|md|png|jpe?g|webp|woff2?|ttf|otf)$/i.test(relative)) {
      // Session validation rejects larger files. Track their metadata until they
      // become valid again rather than loading an unbounded file on each poll.
      const limit = /\.(svg|png|jpe?g|webp|woff2?|ttf|otf)$/i.test(relative)
        ? 16 * 1024 * 1024
        : 1024 * 1024;
      if (info.size > limit) rows.push(`${relative}:oversize:${info.size}:${info.mtimeMs}`);
      else {
        const contents = await readFile(full);
        rows.push(`${relative}:${createHash('sha256').update(contents).digest('hex')}`);
      }
    }
  }
  await visit('project.json', false);
  if ((await isProject(directory)) || state.manifest) {
    let manifest;
    try {
      const filename = await projectPath(directory, 'project.json');
      if ((await lstat(filename)).size > 1024 * 1024) throw new Error('Oversize manifest.');
      const bytes = await readFile(filename);
      if (bytes.length > 1024 * 1024) throw new Error('Oversize manifest.');
      manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (manifestDiagnostics(manifest).length) throw new Error('Invalid manifest.');
    } catch {
      manifest = state.manifest;
    }
    if (manifest?.schemaVersion === 1 && Array.isArray(manifest.sessions)) {
      state.manifest = manifest;
      for (const item of manifest.sessions) {
        try {
          if (!/^sessions\/[a-z0-9][a-z0-9._-]*$/i.test(item.path)) continue;
          await projectPath(directory, item.path);
          for (const child of ['session.json', 'brief.md', 'rounds'])
            await visit(`${item.path}/${child}`, child === 'rounds');
          if (item.placement) {
            const filename = await projectPath(directory, item.placement);
            await visit(item.placement, false);
            if ((await lstat(filename)).size <= 1024 * 1024) {
              const placement = JSON.parse(await readFile(filename, 'utf8'));
              for (const image of placement.images ?? []) {
                if (
                  typeof image.path !== 'string' ||
                  image.path.includes('\\') ||
                  image.path.startsWith('/') ||
                  image.path.includes('\0')
                )
                  continue;
                const imagePath = relative(
                  resolve(directory),
                  resolve(dirname(filename), image.path),
                ).replaceAll('\\', '/');
                await projectPath(directory, imagePath);
                await visit(imagePath, false);
              }
            }
          }
        } catch (error) {
          rows.push(`${item?.path}:unsafe:${error.message}`);
        }
      }
      if (manifest.style?.path) {
        try {
          await projectPath(directory, manifest.style.path);
          for (const name of ['style.json', 'scheme.json', 'kit.svg', 'palette.json'])
            await visit(join(dirname(manifest.style.path), name), false);
        } catch (error) {
          rows.push(`style:unsafe:${error.message}`);
        }
      }
    }
  } else
    for (const path of ['session.json', 'brief.md', 'rounds']) await visit(path, path === 'rounds');
  return rows.join('\n');
}

export async function runZfb(command, directory = '.', forwarded = []) {
  const root = await realpath(resolve(directory));
  const require = createRequire(join(root, 'package.json'));
  let manifest;
  try {
    manifest = require.resolve('@takazudo/zfb/package.json');
  } catch {
    throw new Error(
      'zfb is not installed in this session. Run pnpm install in its directory first.',
    );
  }
  const { version } = JSON.parse(await readFile(manifest, 'utf8'));
  const zfbMajor = Number(version.split('.')[0]);
  if (![2, 3, 4].includes(zfbMajor))
    throw new Error(`Unsupported installed zfb version: ${version}. Expected zfb 2, 3 or 4.`);
  const binary = join(dirname(manifest), 'bin', 'zfb.mjs');
  const state = createRunnerState();
  const watcherState = {};
  let signature = command === 'dev' ? await contentSignature(root, watcherState) : '';
  if (command !== 'preview')
    await prepareProject(root, zfbMajor, { strict: command === 'build', state });
  // zfb owns output/base configuration and reports missing preview builds itself.
  const child = spawn(process.execPath, [binary, command, ...forwarded], {
    cwd: root,
    stdio: 'inherit',
  });
  const completion = new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => accept(code ?? (signal === 'SIGINT' ? 130 : 1)));
  });
  const stopWatching =
    command === 'dev'
      ? await watchContent(
          root,
          async () => {
            await prepareProject(root, zfbMajor, { state });
            console.log('[diagram-gen] Updated gallery from registered content.');
          },
          {
            initialSignature: signature,
            watcherState,
            onError: (error) =>
              console.error(`[diagram-gen] Content is not ready: ${error.message}`),
          },
        )
      : () => {};
  const onInterrupt = () => child.kill('SIGINT');
  const onTerminate = () => child.kill('SIGTERM');
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  try {
    return await completion;
  } finally {
    await stopWatching();
    process.off('SIGINT', onInterrupt);
    process.off('SIGTERM', onTerminate);
  }
}

/** The same serialized polling loop drives dev and filesystem recovery tests. */
export async function watchContent(
  root,
  update,
  { intervalMs = 650, onError = console.error, watcherState = {}, initialSignature } = {},
) {
  let signature = initialSignature ?? (await contentSignature(root, watcherState));
  let pending = null;
  let stopped = false;
  const timer = setInterval(() => {
    if (pending || stopped) return;
    pending = (async () => {
      try {
        const next = await contentSignature(root, watcherState);
        if (next !== signature) {
          await update();
          signature = next;
        }
      } catch (error) {
        onError(error);
      }
    })().finally(() => {
      pending = null;
    });
  }, intervalMs);
  return async () => {
    stopped = true;
    clearInterval(timer);
    await pending;
  };
}
