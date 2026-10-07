import { lstat, realpath, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, dirname, join, parse, relative, isAbsolute } from 'node:path';
import { assertSourceOutput } from './source-protection.mjs';
import { randomUUID } from 'node:crypto';
const contains = (root, file) => {
  const rel = relative(root, file);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};
async function noLinks(filename) {
  let current = parse(filename).root;
  for (const part of filename.slice(current.length).split('/').filter(Boolean)) {
    current = join(current, part);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1))
        throw Object.assign(
          new Error(
            'Export destination overlaps session source files or unsafe symbolic links/hard-link aliases.',
          ),
          { code: 'RESOURCE_UNSAFE' },
        );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
export async function atomicSvgExport(root, output, bytes, resourceRoot = root) {
  root = await realpath(resolve(root));
  const destination = resolve(output);
  await noLinks(destination);
  const protectedRoot = await realpath(resolve(resourceRoot));
  if (!contains(protectedRoot, root))
    throw Object.assign(new Error('Session root must be contained in explicit resourceRoot.'), {
      code: 'RESOURCE_UNSAFE',
    });
  await assertSourceOutput(protectedRoot, destination, { sessionRoot: root });
  await mkdir(dirname(destination), { recursive: true });
  const temporary = join(dirname(destination), `.diagram-svg-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, bytes, { flag: 'wx' });
    await noLinks(destination);
    await assertSourceOutput(protectedRoot, destination, { sessionRoot: root });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  return destination;
}
