import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { nextVersion, packRelease, parseVersion } from '../scripts/plugin-release.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('stable versions and explicit bumps preserve semantic ordering', () => {
  assert.deepEqual(parseVersion('0.1.0'), [0n, 1n, 0n]);
  assert.equal(nextVersion('0.1.9'), '0.1.10');
  assert.equal(nextVersion('0.1.9', 'minor'), '0.2.0');
  assert.equal(nextVersion('1.9.9', 'major'), '2.0.0');
  assert.equal(nextVersion('0.1.9', '0.2.0'), '0.2.0');
  assert.equal(nextVersion('1.0.9007199254740992'), '1.0.9007199254740993');
});

test('rejects prereleases, ambiguous versions, equal versions and downgrades', () => {
  for (const value of ['1.0.0-next.1', '1.0.0+build', 'v1.0.0', '01.0.0', '1.0', '../1.0.0', '', null]) {
    assert.throws(() => parseVersion(value), /stable X.Y.Z/);
  }
  for (const target of ['0.1.0', '0.0.9', '0.0.99']) {
    assert.throws(() => nextVersion('0.1.0', target), /greater/);
  }
});

test('dry-run is read-only and reports the plugin version, not the workspace version', async () => {
  const manifest = path.join(root, 'plugins/zudo-diagram-gen/plugin.json');
  const before = await readFile(manifest, 'utf8');
  const current = JSON.parse(before).version;
  const output = execFileSync(process.execPath, ['scripts/plugin-release.mjs', 'bump', 'patch', '--dry-run'], { cwd: root, encoding: 'utf8' });
  assert.match(output, /\(dry run\)/);
  assert.ok(output.includes(nextVersion(current)));
  assert.equal(await readFile(manifest, 'utf8'), before);
});

test('a mismatched release tag fails before packaging', async () => {
  await assert.rejects(packRelease('v999999.999999.999999'), /Tag and plugin manifest/);
});

test('release ZIP rebuilds identically and validates outside the checkout', async () => {
  const first = await packRelease();
  const bytes = await readFile(first.archive);
  const second = await packRelease();
  assert.deepEqual(await readFile(second.archive), bytes);
  assert.equal(first.sha256, second.sha256);
  assert.equal(second.toneCount, 24);
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'plugin-release-test-'));
  try {
    execFileSync('unzip', ['-q', second.archive, '-d', temporary]);
    const output = execFileSync(process.execPath, [path.join(root, 'scripts/plugin-pack.mjs'), '--verify-dir', path.join(temporary, 'zudo-diagram-gen')], { cwd: temporary, encoding: 'utf8' });
    assert.match(output, /toneCount: 24/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
