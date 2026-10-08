import { lstat, realpath } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { projectPath, manifestDiagnostics } from './project.mjs';
import { safeRead } from './model.mjs';
const unsafe = (message) => {
  throw Object.assign(new Error(message), { code: 'RESOURCE_UNSAFE' });
};
const contains = (root, file) => {
  const rel = relative(root, file);
  return rel === '' || (rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel));
};
/** An exports directory is writable output space only for files that are not registered inputs. */
export async function assertSourceOutput(root, destination, { sessionRoot = root } = {}) {
  root = await realpath(resolve(root));
  sessionRoot = await realpath(resolve(sessionRoot));
  if (!contains(root, sessionRoot))
    unsafe('Session root must be contained in explicit resourceRoot.');
  if (!contains(root, destination)) return;
  if (
    !contains(join(root, 'exports'), destination) &&
    !contains(join(sessionRoot, 'exports'), destination)
  )
    unsafe(
      'Export destination overlaps session source files or project inputs; use exports/ or a file outside source.',
    );
  const files = new Set();
  const protect = async (input) => {
    let path;
    try {
      path = await projectPath(root, input);
    } catch (error) {
      if (error.code) throw error;
      unsafe(error.message);
    }
    files.add(path);
    return path;
  };
  const placement = async (input) => {
    await protect(input);
    let descriptor;
    try {
      descriptor = JSON.parse((await safeRead(root, input)).replace(/^\uFEFF/, ''));
    } catch (error) {
      if (error instanceof SyntaxError || error.message.endsWith('file does not exist.')) return;
      throw error;
    }
    for (const image of Array.isArray(descriptor?.images) ? descriptor.images : []) {
      const prefix = dirname(input);
      await protect(prefix === '.' ? image.path : `${prefix}/${image.path}`);
    }
  };
  const sessionPrefix = relative(root, sessionRoot).split('\\').join('/');
  const localPlacement = sessionPrefix ? `${sessionPrefix}/placement.json` : 'placement.json';
  await placement(localPlacement);
  let manifest;
  try {
    const metadata = await protect('project.json');
    if ((await lstat(metadata)).isFile())
      manifest = JSON.parse((await safeRead(root, 'project.json')).replace(/^\uFEFF/, ''));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (manifest) {
    const errors = manifestDiagnostics(manifest);
    if (errors.length) unsafe(errors.map((item) => item.message).join('\n'));
    for (const registration of manifest.sessions) {
      await protect(`${registration.path}/session.json`);
      await protect(`${registration.path}/brief.md`);
      if (registration.placement) await placement(registration.placement);
      else await placement(`${registration.path}/placement.json`);
    }
    if (manifest.style) {
      const revision = manifest.style.revision;
      if (manifest.style.path !== `styles/${revision}/style.json`)
        unsafe('Invalid registered style path.');
      for (const file of ['style.json', 'scheme.json', 'palette.json', 'kit.svg'])
        await protect(`styles/${revision}/${file}`);
    }
  }
  if (files.has(destination))
    unsafe(
      'Export destination overlaps session source files or registered project placement/style inputs.',
    );
}
