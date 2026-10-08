import { readFile, realpath, lstat } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { loadSession } from './model.mjs';
import { loadPlacement, portablePlacement } from './placement.mjs';
import { readStyleRevision } from './style.mjs';

const slugPattern = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/i;
const slug = { test: (value) => typeof value === 'string' && slugPattern.test(value) };
const hash = (value) => createHash('sha256').update(value).digest('hex');
const diagnostic = (code, message, path, sessionId) => ({
  code,
  message,
  path,
  ...(sessionId ? { sessionId } : {}),
});
export class ProjectValidationError extends Error {
  constructor(diagnostics) {
    super(diagnostics.map((item) => `${item.path}: ${item.message}`).join('\n'));
    this.name = 'ProjectValidationError';
    this.diagnostics = diagnostics;
    this.errors = diagnostics.map((item) => item.message);
  }
}

/** Refuse lexical escapes and symlink components before reading registered content. */
export async function projectPath(root, input) {
  if (
    typeof input !== 'string' ||
    !input ||
    input.includes('\\') ||
    input.includes('\0') ||
    isAbsolute(input) ||
    input.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('Expected a contained project-relative path without dot segments.');
  const base = await realpath(resolve(root));
  let current = base;
  for (const component of input.split('/')) {
    current = join(current, component);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error('Registered paths must not contain symbolic links.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const rel = relative(base, current);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error('Path escapes project root.');
  return current;
}
async function readJson(root, path) {
  const filename = await projectPath(root, path);
  const info = await lstat(filename);
  if (!info.isFile() || info.size > 1024 * 1024)
    throw new Error('Expected a JSON file no larger than 1 MiB.');
  const bytes = await readFile(filename);
  if (bytes.length > 1024 * 1024) throw new Error('JSON file grew beyond 1 MiB while reading.');
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
export function manifestDiagnostics(project) {
  const errors = [];
  const add = (message, path = 'project.json', code = 'VALIDATION_FAILED') =>
    errors.push(diagnostic(code, message, path));
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    add('Expected project object.');
    return errors;
  }
  if (project.schemaVersion !== 1)
    add('Only project schemaVersion 1 is supported.', 'project.json', 'UNSUPPORTED_VERSION');
  if (!slug.test(project.id ?? '')) add('Expected stable URL-safe project ID.');
  if (typeof project.title !== 'string' || !project.title.trim()) add('Expected project title.');
  if (!Array.isArray(project.sessions)) add('sessions must be an ordered array.');
  const ids = new Set(),
    paths = new Set(),
    orders = new Set();
  for (const [index, item] of (Array.isArray(project.sessions) ? project.sessions : []).entries()) {
    const path = `project.json sessions[${index}]`;
    if (!item || typeof item !== 'object') {
      add('Expected session registration.', path);
      continue;
    }
    if (!slug.test(item.id ?? '') || ids.has(item.id))
      add('Session IDs must be valid and unique.', path);
    if (
      typeof item.path !== 'string' ||
      !/^sessions\/[a-z0-9][a-z0-9._-]*$/i.test(item.path) ||
      paths.has(item.path)
    )
      add('Session paths must be unique sessions/<slug> paths.', path, 'RESOURCE_UNSAFE');
    if (!Number.isSafeInteger(item.order) || item.order < 0 || orders.has(item.order))
      add('Orders must be unique nonnegative integers.', path);
    ids.add(item.id);
    paths.add(item.path);
    orders.add(item.order);
  }
  if (!Array.isArray(project.comparisonSets)) add('comparisonSets must be an array.');
  const setIds = new Set();
  for (const set of Array.isArray(project.comparisonSets) ? project.comparisonSets : []) {
    if (
      !set ||
      !slug.test(set.id ?? '') ||
      setIds.has(set.id) ||
      typeof set.title !== 'string' ||
      !set.title.trim() ||
      !slug.test(set.toneId ?? '') ||
      !Array.isArray(set.entries)
    )
      add('Comparison sets require unique IDs, title, toneId and entries.');
    if (Array.isArray(set?.entries))
      for (const item of set.entries) {
        if (
          !item ||
          !slug.test(item.sessionId) ||
          !slug.test(item.candidateId) ||
          typeof item.fingerprint !== 'string' ||
          !/^[a-f0-9]{64}$/.test(item.fingerprint)
        )
          add('Comparison entries require sessionId, candidateId and exact SHA-256 fingerprint.');
      }
    setIds.add(set?.id);
  }
  return errors;
}

/** Compose ordinary session loading. Invalid siblings stay explicit; retention is caller owned. */
export async function loadProject(directory, { strict = false, lastValid = new Map() } = {}) {
  const root = await realpath(resolve(directory));
  let project;
  try {
    project = await readJson(root, 'project.json');
  } catch (error) {
    throw new ProjectValidationError([
      diagnostic(
        error.code === 'ENOENT' ? 'INCOMPLETE_PROJECT' : 'VALIDATION_FAILED',
        error.message,
        'project.json',
      ),
    ]);
  }
  const fatal = manifestDiagnostics(project);
  if (!project || typeof project !== 'object' || Array.isArray(project))
    throw new ProjectValidationError(fatal);
  // Validate every registration/reference before traversing even the first session.
  for (const item of Array.isArray(project.sessions) ? project.sessions : []) {
    for (const path of [item?.path, item?.placement].filter((value) => value !== undefined)) {
      try {
        await projectPath(root, path);
      } catch (error) {
        fatal.push(diagnostic('RESOURCE_UNSAFE', error.message, String(path), item?.id));
      }
    }
  }
  if (project.style !== undefined) {
    const style = project.style;
    if (
      !style ||
      !slug.test(style.revision ?? '') ||
      style.path !== `styles/${style.revision}/style.json` ||
      !/^[a-f0-9]{64}$/.test(style.hash ?? '')
    )
      fatal.push(
        diagnostic(
          'VALIDATION_FAILED',
          'style requires revision, styles/<revision>/style.json path and SHA-256 hash.',
          'project.json style',
        ),
      );
    else
      try {
        await projectPath(root, style.path);
      } catch (error) {
        fatal.push(diagnostic('RESOURCE_UNSAFE', error.message, style.path));
      }
  }
  if (fatal.length) throw new ProjectValidationError(fatal);
  const diagnostics = [],
    sessions = [];
  for (const item of [...project.sessions].sort((a, b) => a.order - b.order)) {
    const entry = { id: item.id, path: item.path, status: 'valid', data: null, diagnostics: [] };
    try {
      entry.data = await loadSession(await projectPath(root, item.path));
      if (entry.data.session.id !== item.id)
        throw new Error('Persisted session ID differs from project registration.');
      if (item.placement) {
        const loaded = await loadPlacement(root, entry.data.session.target, {
          placement: item.placement,
        });
        // Registered project references use the stricter no-symlink-component rule.
        for (const image of loaded.descriptor.images ?? []) {
          const descriptorDirectory = item.placement.split('/').slice(0, -1).join('/');
          await projectPath(
            root,
            descriptorDirectory ? `${descriptorDirectory}/${image.path}` : image.path,
          );
        }
        Object.assign(entry.data, portablePlacement(loaded));
      }
      entry.observedHash = entry.data.contentHash;
      lastValid.set(item.id, { path: item.path, data: entry.data });
    } catch (error) {
      entry.diagnostics = (error.errors ?? [error.message]).map((message) =>
        diagnostic(
          error.code === 'RESOURCE_UNSAFE' ? 'RESOURCE_UNSAFE' : 'VALIDATION_FAILED',
          message,
          item.path,
          item.id,
        ),
      );
      entry.status = error.code === 'ENOENT' ? 'missing' : 'invalid';
      try {
        await lstat(join(root, item.path));
      } catch (missing) {
        if (missing.code === 'ENOENT') {
          entry.status = 'missing';
          entry.diagnostics.forEach((item) => {
            item.code = 'INCOMPLETE_PROJECT';
          });
        }
      }
      const previous = lastValid.get(item.id);
      entry.data = null;
      if (previous?.path === item.path && previous.data.session.id === item.id) {
        entry.data = previous.data;
        entry.status = 'stale';
        entry.observedHash = previous.data.contentHash;
        entry.diagnostics.push(
          diagnostic(
            'STALE_INPUT',
            'Showing retained last-valid session data; current files are not valid.',
            item.path,
            item.id,
          ),
        );
      }
    }
    diagnostics.push(...entry.diagnostics);
    sessions.push(entry);
  }
  // Removed registrations cannot later inherit an unrelated retained snapshot.
  for (const id of lastValid.keys())
    if (!sessions.some((item) => item.id === id)) lastValid.delete(id);
  if (project.style) {
    try {
      const snapshot = await readStyleRevision(root, project.style.revision, {
        expectedHash: project.style.hash,
        sessions,
      });
      for (const session of sessions) if (session.data) session.data.styleHash = snapshot.hash;
    } catch (error) {
      diagnostics.push(
        diagnostic(
          error.code === 'STALE_INPUT' ? 'STALE_INPUT' : 'VALIDATION_FAILED',
          error.message,
          project.style.path,
        ),
      );
    }
  }
  const comparisonSets = project.comparisonSets.map((set) => {
    const errors = [],
      seen = new Set();
    const entries = set.entries.map((item) => {
      let status = 'valid';
      const add = (message, code = 'VALIDATION_FAILED') => {
        errors.push(diagnostic(code, message, `comparisonSets/${set.id}`, item?.sessionId));
        status = code === 'STALE_INPUT' ? 'stale' : 'invalid';
      };
      const session = sessions.find((entry) => entry.id === item?.sessionId);
      if (!session || seen.has(item?.sessionId)) add('Unknown or duplicate comparison session.');
      seen.add(item?.sessionId);
      const candidate = session?.data?.candidates.find((entry) => entry.id === item?.candidateId);
      if (!candidate) add('Exact comparison candidate is missing.', 'INCOMPLETE_PROJECT');
      else {
        if (candidate.toneId !== set.toneId) add('Comparison candidate tone mismatch.');
        if (candidate.fingerprint !== item.fingerprint)
          add('Comparison fingerprint is stale.', 'STALE_INPUT');
        if (session.status !== 'valid') add('Comparison session is not current.', 'STALE_INPUT');
      }
      return { ...item, status, availableThemes: candidate ? Object.keys(candidate.assets) : [] };
    });
    for (const session of sessions)
      if (!seen.has(session.id))
        errors.push(
          diagnostic(
            'INCOMPLETE_PROJECT',
            'Comparison set is missing session coverage.',
            `comparisonSets/${set.id}`,
            session.id,
          ),
        );
    diagnostics.push(...errors);
    return { ...set, entries, ok: errors.length === 0, diagnostics: errors };
  });
  const result = {
    kind: 'project',
    schemaVersion: 1,
    project,
    sessions,
    comparisonSets,
    diagnostics,
    ok: diagnostics.length === 0,
  };
  result.contentHash = hash(JSON.stringify(result));
  if (strict && !result.ok) throw new ProjectValidationError(diagnostics);
  return result;
}
export async function isProject(root) {
  try {
    await lstat(join(resolve(root), 'project.json'));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
export async function loadContent(root, options = {}) {
  return (await isProject(root)) ? loadProject(root, options) : loadSession(root);
}
export async function validateProject(root) {
  try {
    const data = await loadProject(root);
    return {
      ok: data.ok,
      errors: data.diagnostics.map((item) => `${item.path}: ${item.message}`),
      warnings: [],
      diagnostics: data.diagnostics,
      summary: {
        sessions: data.sessions.length,
        validSessions: data.sessions.filter((item) => item.status === 'valid').length,
        comparisonSets: data.comparisonSets.length,
      },
    };
  } catch (error) {
    if (!(error instanceof ProjectValidationError)) throw error;
    return {
      ok: false,
      errors: error.errors,
      warnings: [],
      diagnostics: error.diagnostics,
      summary: { sessions: 0, validSessions: 0, comparisonSets: 0 },
    };
  }
}
