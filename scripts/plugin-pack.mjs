import { createHash } from 'node:crypto';
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = path.join(root, 'plugins/zudo-diagram-gen');
const tones = path.join(root, 'packages/diagram-gen/tones');
const output = path.join(root, 'artifacts/plugin');
const inventoryName = 'inventory.json';
const expectedName = 'zudo-diagram-gen';
const schema = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
// Frozen distribution contract for this 24-tone release, independent of catalog ordering.
const expectedToneIds = new Set([
  'fine-outline',
  'soft-fill',
  'ink-silhouette',
  'offset-blocks',
  'editorial-serif',
  'swiss-grid',
  'ui-miniature',
  'contour-wash',
  'technical-blueprint',
  'isometric-wire',
  'isometric-solid',
  'paper-layers',
  'pencil-notebook',
  'marker-workshop',
  'chalkboard',
  'risograph-duo',
  'cut-paper',
  'halftone-manual',
  'pixel-schematic',
  'terminal',
  'circuit-route',
  'transit-wayfinding',
  'modular-geometric',
  'luminous-glass',
]);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function safePath(relative) {
  if (
    !relative ||
    relative.includes('\\') ||
    relative.includes('\0') ||
    path.posix.isAbsolute(relative) ||
    relative.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(`Unsafe path: ${relative}`);
  }
  return relative;
}

async function files(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const relative = safePath(prefix ? `${prefix}/${entry.name}` : entry.name);
    const absolute = path.join(directory, entry.name);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory()))
      throw new Error(`Unsafe entry: ${relative}`);
    if (stat.isDirectory()) result.push(...(await files(absolute, relative)));
    else result.push(relative);
  }
  return result;
}

async function copyTree(from, to) {
  for (const relative of await files(from)) {
    const target = path.join(to, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(from, relative), target);
  }
}

async function regularFile(directory, relative) {
  safePath(relative);
  const file = path.join(directory, relative);
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(`Expected regular file: ${relative}`);
  return readFile(file);
}

function referencePaths(tone) {
  return [
    tone.referenceFiles?.light,
    tone.referenceFiles?.dark,
    tone.scheme,
    tone.kit,
    ...(tone.bundledReferences ?? []).map((ref) => ref.path),
  ];
}

async function validateCatalog(directory) {
  const toneRoot = path.join(directory, 'skills/diagram-gen/tones');
  const catalog = JSON.parse(await regularFile(toneRoot, 'catalog.json'));
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.tones) || catalog.tones.length !== 24) {
    throw new Error('Expected the complete 24-tone catalog');
  }
  const ids = new Set();
  for (const tone of catalog.tones) {
    if (!expectedToneIds.has(tone.id) || ids.has(tone.id))
      throw new Error(`Invalid or duplicate tone ID: ${tone.id}`);
    ids.add(tone.id);
    for (const relative of referencePaths(tone)) {
      if (
        typeof relative !== 'string' ||
        (relative !== 'shared/provenance.md' &&
          relative !== 'shared/composition-meaning.md' &&
          !relative.startsWith(`${tone.id}/`))
      ) {
        throw new Error(`Unexpected tone reference: ${relative}`);
      }
      await regularFile(toneRoot, relative);
    }
    for (const relative of [`${tone.id}/source.svg`, `${tone.id}/kit.template.svg`])
      await regularFile(toneRoot, relative);
  }
  if (ids.size !== expectedToneIds.size) throw new Error('Missing expected tone ID');
  return catalog.tones.length;
}

function validateManifest(manifest) {
  if (
    manifest.$schema !== schema ||
    manifest.name !== expectedName ||
    !/^\d+\.\d+\.\d+$/.test(manifest.version) ||
    manifest.license !== 'MIT' ||
    !manifest.extensions?.['com.openai']?.interface ||
    manifest.mcpServers ||
    manifest.dependencies
  ) {
    throw new Error('Invalid portable plugin manifest');
  }
}

function forbidden(relative, bytes) {
  if (
    /(^|\/)(node_modules|\.git|\.env|package-lock\.json|pnpm-lock\.yaml|mcp\.json|\.mcp\.json|\.app\.json)(\/|$)/i.test(
      relative,
    ) ||
    /\.(?:key|pem|p12|pfx)$/i.test(relative)
  )
    throw new Error(`Forbidden package file: ${relative}`);
  if (
    relative !== 'plugin.json' &&
    relative !== 'LICENSE' &&
    !/^skills\/diagram-gen\/.+\.(?:md|json|svg|png|jpe?g|webp)$/.test(relative)
  )
    throw new Error(`Unexpected package file: ${relative}`);
  if (/\.(?:md|json|svg|txt)$/i.test(relative)) {
    const content = bytes.toString('utf8');
    if (
      /\/(?:Users|home)\/[^\s"'<>]+|[A-Za-z]:\\Users\\|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:sk-[A-Za-z0-9_-]{20,})/.test(
        content,
      )
    ) {
      throw new Error(`Potential machine path or secret: ${relative}`);
    }
  }
}

export async function validatePlugin(directory) {
  const all = await files(directory);
  if (!all.includes(inventoryName)) throw new Error('Missing inventory.json');
  const inventory = JSON.parse(await regularFile(directory, inventoryName));
  const listed = Object.keys(inventory.files ?? {}).sort();
  const actual = all.filter((name) => name !== inventoryName).sort();
  if (JSON.stringify(listed) !== JSON.stringify(actual))
    throw new Error('Inventory file list differs from package');
  if (inventory.schemaVersion !== 1 || inventory.name !== expectedName)
    throw new Error('Invalid inventory identity');
  for (const relative of actual) {
    const bytes = await regularFile(directory, relative);
    forbidden(relative, bytes);
    if (inventory.files[relative] !== sha256(bytes))
      throw new Error(`Resource hash mismatch: ${relative}`);
  }
  validateManifest(JSON.parse(await regularFile(directory, 'plugin.json')));
  await regularFile(directory, 'LICENSE');
  await regularFile(directory, 'skills/diagram-gen/SKILL.md');
  return {
    toneCount: await validateCatalog(directory),
    fileCount: actual.length,
    inventoryHash: sha256(await regularFile(directory, inventoryName)),
  };
}

export async function assemblePlugin(destination, options = {}) {
  const pluginSource = options.sourceDirectory ?? source;
  try {
    await lstat(path.join(pluginSource, 'skills/diagram-gen/tones'));
    throw new Error('Plugin source must not contain copied tones; assembly owns that directory');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await copyTree(pluginSource, destination);
  await copyTree(tones, path.join(destination, 'skills/diagram-gen/tones'));
  await copyFile(path.join(root, 'LICENSE'), path.join(destination, 'LICENSE'));
  // Source files are copied byte-for-byte. Inventory is stable across rebuilds with identical inputs.
  const entries = {};
  for (const relative of await files(destination)) {
    if (relative === inventoryName) throw new Error('Source may not supply inventory.json');
    const bytes = await regularFile(destination, relative);
    forbidden(relative, bytes);
    entries[relative] = sha256(bytes);
  }
  await writeFile(
    path.join(destination, inventoryName),
    `${JSON.stringify({ schemaVersion: 1, name: expectedName, files: entries }, null, 2)}\n`,
  );
  const result = await validatePlugin(destination);
  if (!options.quiet)
    console.log(
      `Validated ${result.toneCount} tones and ${result.fileCount} files; inventory SHA-256 ${result.inventoryHash}`,
    );
  return result;
}

async function main() {
  if (process.argv[2] === '--verify-dir') {
    if (!process.argv[3])
      throw new Error(
        'Usage: node scripts/plugin-pack.mjs --verify-dir <extracted plugin directory>',
      );
    console.log(await validatePlugin(path.resolve(process.argv[3])));
    return;
  }
  if (process.argv.length > 2) throw new Error('Usage: pnpm plugin-pack');
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'zudo-diagram-plugin-'));
  try {
    const directory = path.join(temporary, expectedName);
    await assemblePlugin(directory);
    await mkdir(output, { recursive: true });
    const archive = path.join(output, `${expectedName}.zip`);
    await rm(archive, { force: true });
    const result = spawnSync('zip', ['-q', '-X', '-r', archive, expectedName], {
      cwd: temporary,
      encoding: 'utf8',
    });
    if (result.status !== 0) throw new Error(`zip failed: ${result.stderr}`);
    console.log(archive);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
