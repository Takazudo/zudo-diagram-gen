import { lstat, realpath, mkdir, writeFile, rename, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertSourceOutput } from './source-protection.mjs';
import { loadContent } from './project.mjs';
import { renderGallery } from './render.mjs';
import { contained } from './placement.mjs';

const fail = (code, message) => {
  const error = new Error(message);
  error.code = code;
  throw error;
};
/** Export from validated source. Source trees and their realpath aliases are never outputs. */
export async function exportHtml(directory, { output, force = false } = {}) {
  if (typeof output !== 'string' || !/\.html?$/i.test(output) || typeof force !== 'boolean')
    fail('INVALID_ARGUMENT', 'Supply --out ending in .html or .htm.');
  const root = await realpath(path.resolve(directory));
  const destination = path.resolve(output);
  let ancestor = path.dirname(destination),
    suffix = [];
  while (true) {
    try {
      ancestor = await realpath(ancestor);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      suffix.unshift(path.basename(ancestor));
      ancestor = path.dirname(ancestor);
    }
  }
  const resolved = path.join(ancestor, ...suffix, path.basename(destination));
  if (
    [destination, resolved].some(
      (file) => contained(root, file) && !contained(path.join(root, 'exports'), file),
    )
  )
    fail(
      'RESOURCE_UNSAFE',
      'HTML output overlaps protected source; use exports/ or a destination outside source.',
    );
  await assertSourceOutput(root, resolved);
  try {
    const info = await lstat(destination);
    if (!info.isFile() || info.isSymbolicLink())
      fail('RESOURCE_UNSAFE', 'HTML output must be a regular file, never a symlink.');
    if (!force) fail('OUTPUT_CONFLICT', 'HTML output already exists; use --force explicitly.');
    if (info.nlink > 1) fail('RESOURCE_UNSAFE', 'HTML output must not be a hard-link alias.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const data = await loadContent(root);
  // System I/O diagnostics may include native source paths. Preserve actionable
  // project-relative identity without exposing the private export machine root.
  const portable = JSON.parse(JSON.stringify(data), (key, value) =>
    ['message', 'path'].includes(key) && typeof value === 'string'
      ? value.replaceAll(root, '.')
      : value,
  );
  let html;
  try {
    html = await renderGallery(portable);
  } catch (error) {
    if (!error.code)
      error.code = /budget|oversized|limit/.test(error.message)
        ? 'RESOURCE_UNSAFE'
        : 'VALIDATION_FAILED';
    throw error;
  }
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = path.join(path.dirname(destination), `.diagram-html-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, html, { flag: 'wx' });
    await assertSourceOutput(root, resolved);
    if (force) {
      // Recheck aliases and file ownership after rendering, before publishing.
      try {
        const current = await lstat(destination);
        if (!current.isFile() || current.isSymbolicLink() || current.nlink > 1)
          fail('RESOURCE_UNSAFE', 'Unsafe output changed during export.');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      await rename(temporary, destination);
    } else {
      // Exclusive final write protects a destination created during rendering.
      await writeFile(destination, await readFile(temporary), { flag: 'wx' });
    }
  } catch (error) {
    if (error.code === 'EEXIST') fail('OUTPUT_CONFLICT', 'HTML output already exists.');
    throw error;
  } finally {
    await rm(temporary, { force: true });
  }
  return {
    kind: data.kind,
    output: destination,
    bytes: Buffer.byteLength(html),
    candidates:
      data.kind === 'project'
        ? data.sessions.reduce((sum, s) => sum + (s.data?.candidates.length ?? 0), 0)
        : data.candidates.length,
    ok: data.ok ?? true,
    diagnostics: data.diagnostics ?? [],
  };
}
