import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

// A focused material/package check; aggregate consumer/build/browser acceptance is separate.
const exec = promisify(execFile);
const packageRoot = fileURLToPath(new URL('../packages/diagram-gen/', import.meta.url));
const archiveArg = process.argv[2];
if (process.argv.length > 3)
  throw new Error('Usage: node scripts/check-tone-archive.mjs [engine.tgz]');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'diagram-tone-consumer-'));
try {
  let archive;
  if (archiveArg) archive = await realpath(archiveArg);
  else {
    const packed = await exec(
      'npm',
      [
        'pack',
        '--ignore-scripts',
        '--json',
        '--cache',
        path.join(temporary, 'npm-cache'),
        '--pack-destination',
        temporary,
      ],
      { cwd: packageRoot },
    );
    archive = path.join(temporary, JSON.parse(packed.stdout)[0].filename);
  }
  await writeFile(
    path.join(temporary, 'package.json'),
    JSON.stringify({
      name: 'offline-tone-consumer',
      packageManager: 'pnpm@10.30.3',
      private: true,
      type: 'module',
      dependencies: { '@takazudo/zudo-diagram-gen': `file:${archive}` },
    }),
  );
  await exec(
    'corepack',
    ['pnpm', 'install', '--offline', '--ignore-scripts', '--config.auto-install-peers=false'],
    { cwd: temporary, maxBuffer: 4 * 1024 * 1024 },
  );
  const installed = path.join(temporary, 'node_modules/@takazudo/zudo-diagram-gen');
  const resolved = await realpath(installed);
  assert.ok(
    resolved.startsWith(`${temporary}${path.sep}`),
    'Consumer must resolve installed archive, not the workspace',
  );
  const verification = `
    import assert from 'node:assert/strict';
    import { readFile } from 'node:fs/promises';
    import { auditToneReferences } from './node_modules/@takazudo/zudo-diagram-gen/src/reference-audit.mjs';
    globalThis.fetch = () => { throw new Error('Network disabled'); };
    const result = await auditToneReferences();
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.toneCount, 24);
    const base = new URL('./node_modules/@takazudo/zudo-diagram-gen/tones/', import.meta.url);
    const catalog = JSON.parse(await readFile(new URL('catalog.json', base), 'utf8'));
    for (const tone of catalog.tones) {
      for (const reference of tone.bundledReferences.filter(reference => reference.required)) {
        const content = await readFile(new URL(reference.path, base), 'utf8');
        assert.ok(content.trim(), tone.id + '/' + reference.path);
      }
    }
    console.log(JSON.stringify({ ok: true, tones: result.toneCount, offlineResources: result.resources.length, requiredDescriptorReads: catalog.tones.reduce((count, tone) => count + tone.bundledReferences.filter(reference => reference.required).length, 0) }));
  `;
  await writeFile(path.join(temporary, 'verify.mjs'), verification);
  const checked = await exec(process.execPath, ['verify.mjs'], { cwd: temporary });
  console.log(checked.stdout.trim());
  const packageJson = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
  console.log(`PASS fresh offline installed archive: ${packageJson.name}@${packageJson.version}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
