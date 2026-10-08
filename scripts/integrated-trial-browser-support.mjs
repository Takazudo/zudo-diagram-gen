import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, isAbsolute, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export async function installed(root) {
  const require = createRequire(join(root, 'package.json'));
  const module = await realpath(require.resolve('@takazudo/zudo-diagram-gen'));
  const dependencyRoot = await realpath(join(root, 'node_modules'));
  const consumerRel = relative(await realpath(root), dependencyRoot);
  assert(
    !isAbsolute(consumerRel) && consumerRel !== '..' && !consumerRel.startsWith('../'),
    'Dependencies must be installed inside the consumer',
  );
  const rel = relative(dependencyRoot, module);
  assert(
    !isAbsolute(rel) && rel !== '..' && !rel.startsWith('../'),
    'Engine must resolve inside consumer node_modules',
  );
  return {
    engine: await import(pathToFileURL(module).href),
    module,
    cli: join(dirname(module), 'cli.mjs'),
    require,
  };
}
export async function sourceBytes(root, session, candidate, theme) {
  const metadataPath = join(root, session.path, candidate.sourcePath);
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  return readFile(join(dirname(metadataPath), metadata.assets[theme]));
}
export async function playwrightFor(consumer) {
  const module = await import(
    process.env.PROJECT_PLAYWRIGHT_MODULE ||
      pathToFileURL(consumer.require.resolve('playwright')).href
  );
  return module.default ?? module;
}
export function runNode(args, cwd) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', reject);
    child.on('close', (exitCode) => accept({ args, exitCode, stdout, stderr }));
  });
}
export async function poll(predicate, message, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) return;
    } catch (error) {
      last = error;
    }
    await new Promise((accept) => setTimeout(accept, 250));
  }
  throw new Error(`${message}${last ? `: ${last.message}` : ''}`);
}
export async function saveJSON(out, name, value) {
  await mkdir(out, { recursive: true });
  const path = join(out, name);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
  return { path, sha256: sha256(await readFile(path)) };
}
export function diagnostics(page) {
  const record = {
    pageErrors: [],
    consoleErrors: [],
    failedResponses: [],
    failedRequests: [],
    blockedRequests: [],
  };
  page.on('pageerror', (error) => record.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') record.consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400)
      record.failedResponses.push({ url: response.url(), status: response.status() });
  });
  page.on('requestfailed', (request) =>
    record.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }),
  );
  return record;
}
