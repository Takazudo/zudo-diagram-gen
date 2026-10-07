import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';
import { inspectRaster } from './capture-inputs.mjs';
import { canonicalHash, hashBytes } from './tone-context.mjs';
import { validatePlacement, renderPlacement } from '../client/placement.mjs';
export { validatePlacement, renderPlacement, canonicalHash, hashBytes };
export class CaptureError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
export const contained = (root, file) =>
  file === root ||
  (!path.relative(root, file).startsWith(`..${path.sep}`) &&
    path.relative(root, file) !== '..' &&
    !path.isAbsolute(path.relative(root, file)));
export async function readCaptureInput(root, requested, limit, label = 'Capture input') {
  const file = await realpath(requested);
  if (!contained(root, file))
    throw new CaptureError('RESOURCE_UNSAFE', `${label} escapes resource root.`);
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > limit)
      throw new CaptureError('RESOURCE_UNSAFE', `${label} must be a bounded regular file.`);
    const bytes = await handle.readFile();
    if (bytes.length > limit)
      throw new CaptureError('RESOURCE_UNSAFE', `${label} exceeds resource budget.`);
    return { file, bytes };
  } finally {
    await handle.close();
  }
}
async function readPlacement(root, target, { placement, theme = 'light' } = {}) {
  const realRoot = await realpath(root);
  let descriptor;
  let base = realRoot;
  let placementFile;
  if (typeof placement === 'string') {
    const input = await readCaptureInput(
      realRoot,
      path.resolve(root, placement),
      1048576,
      'Placement',
    );
    placementFile = input.file;
    descriptor = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(input.bytes));
    base = path.dirname(placementFile);
  } else descriptor = placement;
  try {
    descriptor = validatePlacement(descriptor, target, theme);
  } catch (error) {
    throw new CaptureError('VALIDATION_FAILED', error.message);
  }
  let inputBytes = Buffer.byteLength(JSON.stringify(descriptor));
  if (inputBytes > 1048576)
    throw new CaptureError('RESOURCE_UNSAFE', 'Placement descriptor exceeds 1 MiB.');
  const images = [];
  for (const entry of descriptor.images || []) {
    const { file, bytes } = await readCaptureInput(
      realRoot,
      path.resolve(base, entry.path),
      16 * 1024 * 1024,
      'Reference image',
    );
    const { mime } = inspectRaster(bytes);
    inputBytes += bytes.length;
    if (inputBytes > 64 * 1024 * 1024)
      throw new CaptureError('RESOURCE_UNSAFE', 'Combined placement inputs exceed 64 MiB.');
    images.push({
      ...entry,
      url: `data:${mime};base64,${bytes.toString('base64')}`,
      hash: hashBytes(bytes),
      file,
    });
  }
  const imageHashes = images.map(({ path, hash }) => ({ path, hash }));
  return {
    descriptor,
    images,
    inputBytes,
    placementFile,
    placementHash: canonicalHash({ descriptor, imageHashes }),
    imageHashes,
  };
}

/** Explicit projection for portable viewer data; private filesystem paths never escape. */
export function portablePlacement(loaded) {
  return {
    placement: loaded.descriptor,
    placementImages: loaded.images.map(({ path, x, y, width, height, url, hash }) => ({
      path,
      x,
      y,
      width,
      height,
      url,
      hash,
    })),
    placementHash: loaded.placementHash,
  };
}

export async function loadPlacement(root, target, options = {}) {
  try {
    return await readPlacement(root, target, options);
  } catch (error) {
    if (error instanceof CaptureError) throw error;
    throw new CaptureError(
      error.code?.startsWith('E') ? 'IO_ERROR' : 'VALIDATION_FAILED',
      error.code?.startsWith('E')
        ? 'Placement/reference could not be read safely.'
        : 'Placement JSON must contain valid UTF-8 and valid JSON.',
    );
  }
}
