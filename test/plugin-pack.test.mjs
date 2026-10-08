import { afterEach, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assemblePlugin, validatePlugin } from '../scripts/plugin-pack.mjs';

const temporary = [];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function setup() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'diagram-plugin-test-'));
  temporary.push(directory);
  const source = path.join(directory, 'source');
  await mkdir(path.join(source, 'skills/diagram-gen'), { recursive: true });
  await cp(
    new URL('../plugins/zudo-diagram-gen/plugin.json', import.meta.url),
    path.join(source, 'plugin.json'),
  );
  await writeFile(path.join(source, 'skills/diagram-gen/SKILL.md'), '# Diagram authoring\n');
  return { directory, source, destination: path.join(directory, 'zudo-diagram-gen') };
}
afterEach(async () => {
  for (const directory of temporary.splice(0))
    await rm(directory, { recursive: true, force: true });
});

async function refreshInventory(destination, relative) {
  const inventoryPath = path.join(destination, 'inventory.json');
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  inventory.files[relative] = hash(await readFile(path.join(destination, relative)));
  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
}

test('clean builds have identical hashes and extracted archive needs no checkout resources', async () => {
  const { directory, source, destination } = await setup();
  const first = await assemblePlugin(destination, { sourceDirectory: source, quiet: true });
  expect(first.toneCount).toBe(24);
  expect(first.fileCount).toBeGreaterThan(210);
  const zipPath = path.join(directory, 'plugin.zip');
  const zipped = spawnSync('zip', ['-q', '-X', '-r', zipPath, 'zudo-diagram-gen'], {
    cwd: directory,
  });
  expect(zipped.status).toBe(0);
  const extracted = path.join(directory, 'extracted');
  await mkdir(extracted);
  const unzipped = spawnSync('unzip', ['-q', zipPath, '-d', extracted]);
  expect(unzipped.status).toBe(0);
  expect(await validatePlugin(path.join(extracted, 'zudo-diagram-gen'))).toEqual(first);
  const second = await assemblePlugin(destination, { sourceDirectory: source, quiet: true });
  expect(second).toEqual(first);
});

test('missing and corrupted references fail after extraction', async () => {
  const { source, destination } = await setup();
  await assemblePlugin(destination, { sourceDirectory: source, quiet: true });
  const light = path.join(destination, 'skills/diagram-gen/tones/fine-outline/light.svg');
  await writeFile(light, '<svg/>');
  await expect(validatePlugin(destination)).rejects.toThrow(/Resource hash mismatch/);
  await rm(light);
  await expect(validatePlugin(destination)).rejects.toThrow(/Inventory file list differs/);
});

test('catalog path escape fails even with a matching inventory hash', async () => {
  const { source, destination } = await setup();
  await assemblePlugin(destination, { sourceDirectory: source, quiet: true });
  const relative = 'skills/diagram-gen/tones/catalog.json';
  const catalogPath = path.join(destination, relative);
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  catalog.tones[0].referenceFiles.light = '../outside.svg';
  await writeFile(catalogPath, JSON.stringify(catalog));
  await refreshInventory(destination, relative);
  await expect(validatePlugin(destination)).rejects.toThrow(/Unexpected tone reference/);
});

test('a substituted catalog ID fails even with 24 entries and a matching inventory hash', async () => {
  const { source, destination } = await setup();
  await assemblePlugin(destination, { sourceDirectory: source, quiet: true });
  const relative = 'skills/diagram-gen/tones/catalog.json';
  const catalogPath = path.join(destination, relative);
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  catalog.tones[0].id = 'replacement-tone';
  await writeFile(catalogPath, JSON.stringify(catalog));
  await refreshInventory(destination, relative);
  await expect(validatePlugin(destination)).rejects.toThrow(/Invalid or duplicate tone ID/);
});

test('assembly rejects symlinks and dependency entries', async () => {
  const { directory, source, destination } = await setup();
  await symlink(path.join(directory, 'outside'), path.join(source, 'skills/diagram-gen/escape'));
  await expect(
    assemblePlugin(destination, { sourceDirectory: source, quiet: true }),
  ).rejects.toThrow(/Unsafe entry/);
  await rm(path.join(source, 'skills/diagram-gen/escape'));
  await mkdir(path.join(source, 'node_modules'));
  await writeFile(path.join(source, 'node_modules/package.json'), '{}');
  await expect(
    assemblePlugin(destination, { sourceDirectory: source, quiet: true }),
  ).rejects.toThrow(/Forbidden package file/);
});

test('assembly refuses a second source tone tree', async () => {
  const { source, destination } = await setup();
  await mkdir(path.join(source, 'skills/diagram-gen/tones'));
  await expect(
    assemblePlugin(destination, { sourceDirectory: source, quiet: true }),
  ).rejects.toThrow(/must not contain copied tones/);
});
