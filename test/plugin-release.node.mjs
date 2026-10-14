import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { selectRelease, releaseAssetPlan } from '../scripts/plugin-release-plan.mjs';
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
  for (const value of [
    '1.0.0-next.1',
    '1.0.0+build',
    'v1.0.0',
    '01.0.0',
    '1.0',
    '../1.0.0',
    '',
    null,
  ]) {
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
  const output = execFileSync(
    process.execPath,
    ['scripts/plugin-release.mjs', 'bump', 'patch', '--dry-run'],
    { cwd: root, encoding: 'utf8' },
  );
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
    const output = execFileSync(
      process.execPath,
      [
        path.join(root, 'scripts/plugin-pack.mjs'),
        '--verify-dir',
        path.join(temporary, 'zudo-diagram-gen'),
      ],
      { cwd: temporary, encoding: 'utf8' },
    );
    assert.match(output, /toneCount: 24/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

async function releaseFixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'plugin-release-fixture-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'scripts'));
  await mkdir(path.join(directory, 'plugins/zudo-diagram-gen'), { recursive: true });
  await copyFile(
    path.join(root, 'scripts/plugin-release.mjs'),
    path.join(directory, 'scripts/plugin-release.mjs'),
  );
  await writeFile(
    path.join(directory, 'plugins/zudo-diagram-gen/plugin.json'),
    JSON.stringify({ name: 'zudo-diagram-gen', version: '0.1.0' }) + '\n',
  );
  await writeFile(path.join(directory, 'package.json'), '{"version":"9.9.9"}\n');
  const git = (...args) =>
    execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.name', 'Release fixture');
  git('config', 'user.email', 'release-fixture@example.invalid');
  git('add', '.');
  git('commit', '-qm', 'Fixture baseline');
  const invoke = (...args) =>
    spawnSync(process.execPath, ['scripts/plugin-release.mjs', ...args], {
      cwd: directory,
      encoding: 'utf8',
    });
  return { directory, git, invoke };
}

test('a real version bump updates only the plugin manifest', async (t) => {
  const { directory, invoke } = await releaseFixture(t);
  const result = invoke('bump', 'minor');
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(
    await readFile(path.join(directory, 'plugins/zudo-diagram-gen/plugin.json'), 'utf8'),
  );
  assert.equal(manifest.version, '0.2.0');
  assert.equal(
    await readFile(path.join(directory, 'package.json'), 'utf8'),
    '{"version":"9.9.9"}\n',
  );
  assert.notEqual(invoke('bump', '0.1.0').status, 0);
  assert.notEqual(invoke('bump', '--unknown').status, 0);
});

test('an existing version tag on another commit is refused', async (t) => {
  const { directory, git, invoke } = await releaseFixture(t);
  git('tag', '-a', 'v0.1.0', '-m', 'Fixture only');
  await writeFile(path.join(directory, 'change.txt'), 'new commit\n');
  git('add', 'change.txt');
  git('commit', '-qm', 'Advance fixture');
  const result = invoke('pack', '--tag', 'v0.1.0');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not point at the checked-out commit/);
});

test('a matching tag cannot package uncommitted content', async (t) => {
  const { directory, git, invoke } = await releaseFixture(t);
  git('tag', '-a', 'v0.1.0', '-m', 'Fixture only');
  await writeFile(path.join(directory, 'unreviewed.txt'), 'not in the tag\n');
  const result = invoke('pack', '--tag', 'v0.1.0');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires a clean working tree/);
});

async function completeFixture(t) {
  const fixture = await releaseFixture(t);
  for (const relative of [
    'plugins/zudo-diagram-gen',
    'packages/diagram-gen/tones',
    'LICENSE',
    'scripts/plugin-pack.mjs',
    'scripts/plugin-release-plan.mjs',
    '.gitignore',
  ]) {
    await cp(path.join(root, relative), path.join(fixture.directory, relative), {
      recursive: true,
    });
  }
  fixture.git('add', '.');
  fixture.git('commit', '-qm', 'Complete packaging inputs');
  return fixture;
}

test('clean annotated tag packages complete identical assets and fresh inventory repeatedly', async (t) => {
  const { directory, git, invoke } = await completeFixture(t);
  git('tag', '-a', 'v0.1.0', '-m', 'Fixture release');
  const commit = git('rev-parse', 'HEAD').trim();
  const result = invoke('pack', '--tag', 'v0.1.0');
  assert.equal(result.status, 0, result.stderr);
  const first = JSON.parse(result.stdout);
  assert.equal(first.version, '0.1.0');
  assert.equal(first.tag, 'v0.1.0');
  assert.equal(first.commit, commit);
  const bytes = await readFile(first.archive);
  assert.equal(path.basename(first.archive), 'zudo-diagram-gen-v0.1.0.zip');
  assert.deepEqual(
    await readFile(path.join(directory, 'artifacts/release/zudo-diagram-gen.zip')),
    bytes,
  );
  const sums = await readFile(path.join(directory, 'artifacts/release/SHA256SUMS'), 'utf8');
  assert.equal(
    sums,
    `${first.sha256}  zudo-diagram-gen-v0.1.0.zip\n${first.sha256}  zudo-diagram-gen.zip\n`,
  );
  execFileSync('sha256sum', ['-c', 'SHA256SUMS'], {
    cwd: path.join(directory, 'artifacts/release'),
  });
  const extracted = await mkdtemp(path.join(os.tmpdir(), 'tagged-plugin-extraction-'));
  t.after(() => rm(extracted, { recursive: true, force: true }));
  execFileSync('unzip', ['-q', first.archive, '-d', extracted]);
  const { validatePlugin } = await import('../scripts/plugin-pack.mjs');
  const verified = await validatePlugin(path.join(extracted, 'zudo-diagram-gen'));
  assert.equal(verified.toneCount, 24);
  assert.equal(verified.inventoryHash, first.inventoryHash);
  assert.equal(verified.fileCount, first.fileCount);
  const repeated = invoke('pack', '--tag', 'v0.1.0');
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.deepEqual(await readFile(JSON.parse(repeated.stdout).archive), bytes);
  assert.equal(git('status', '--porcelain'), '');
  await writeFile(path.join(directory, 'unreviewed.txt'), 'dirty');
  const failed = invoke('pack', '--tag', 'v0.1.0');
  assert.notEqual(failed.status, 0);
  assert.equal(failed.stdout, '');
  assert.deepEqual(await readFile(first.archive), bytes);
});

test('missing and lightweight tags cannot create an artifact', async (t) => {
  const { directory, git, invoke } = await releaseFixture(t);
  assert.notEqual(invoke('pack', '--tag', 'v0.1.0').status, 0);
  git('tag', 'v0.1.0');
  const result = invoke('pack', '--tag', 'v0.1.0');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /annotated tag/);
  assert.equal(result.stdout, '');
  await assert.rejects(readFile(path.join(directory, 'artifacts/release/SHA256SUMS')), {
    code: 'ENOENT',
  });
});

test('new, prepared PR, tag-only, partial draft and published retry select original state', () => {
  const state = { current: '0.1.0', tags: {}, releases: [], prs: [] };
  assert.equal(selectRelease(state).version, '0.1.0');
  const tag = { object: 'annotated', commit: 'original' };
  const tagged = { ...state, current: '0.2.0', tags: { 'v0.1.0': tag } };
  assert.equal(selectRelease(tagged).version, '0.2.0');
  for (const release of [null, { draft: true }, { draft: false }]) {
    const plan = selectRelease(
      { ...tagged, releases: release ? [{ ...release, tag_name: 'v0.1.0', assets: [] }] : [] },
      '0.1.0',
    );
    assert.equal(plan.mode, 'resume-tag');
    assert.equal(plan.commit, 'original');
  }
  assert.equal(selectRelease({ ...state, tags: { 'v0.1.0': tag } }).version, '0.1.1');
  const pr = {
    number: 7,
    head: {
      ref: 'release/plugin-v0.1.1',
      sha: 'pr-head',
      repo: { full_name: 'Takazudo/zudo-diagram-gen' },
    },
    base: { ref: 'main' },
  };
  assert.equal(selectRelease({ ...state, prs: [pr] }).commit, 'pr-head');
  assert.throws(
    () => selectRelease({ ...state, prs: [{ ...pr, base: { ref: 'other' } }] }),
    /target main/,
  );
  assert.throws(
    () =>
      selectRelease({
        ...state,
        prs: [{ ...pr, head: { ...pr.head, repo: { full_name: 'foreign/repo' } } }],
      }),
    /originate/,
  );
  assert.throws(() => selectRelease({ ...state, prs: [pr, pr] }), /Multiple/);
  assert.throws(() => selectRelease({ ...state, prs: [pr] }, 'minor'), /Another/);
  const expected = {
    'version.zip': Buffer.from('zip'),
    'stable.zip': Buffer.from('zip'),
    SHA256SUMS: Buffer.from('sums'),
  };
  assert.deepEqual(releaseAssetPlan(expected, { 'version.zip': expected['version.zip'] }).missing, [
    'stable.zip',
    'SHA256SUMS',
  ]);
  assert.equal(releaseAssetPlan(expected, expected, true).complete, true);
  assert.throws(
    () => releaseAssetPlan(expected, { 'version.zip': Buffer.from('wrong') }),
    /Conflicting/,
  );
  assert.throws(() => releaseAssetPlan(expected, {}, true), /missing/);
});

test('whole dry-run planner reads mocked remotes without changing checkout or Git state', async (t) => {
  const { directory, git } = await completeFixture(t);
  git('remote', 'add', 'origin', 'https://github.com/Takazudo/zudo-diagram-gen.git');
  const sha = git('rev-parse', 'HEAD').trim();
  const mocks = await mkdtemp(path.join(os.tmpdir(), 'release-query-mocks-'));
  t.after(() => rm(mocks, { recursive: true, force: true }));
  const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
  await writeFile(
    path.join(mocks, 'git'),
    `#!/bin/sh\nif [ "$1" = ls-remote ]; then if [ -n "$MOCK_REFS" ]; then printf '%s\\n' "$MOCK_REFS"; else printf '%s\\trefs/heads/main\\n' "$MOCK_MAIN"; fi; else exec '${realGit}' "$@"; fi\n`,
  );
  await writeFile(
    path.join(mocks, 'gh'),
    '#!/bin/sh\nif [ "$MOCK_QUERY_FAIL" = yes ]; then echo "authentication/network failure" >&2; exit 1; fi\nprintf "[[]]\\n"\n',
  );
  await chmod(path.join(mocks, 'git'), 0o755);
  await chmod(path.join(mocks, 'gh'), 0o755);
  const snapshot = () =>
    execFileSync('tar', ['-cf', '-', '.'], { cwd: directory, maxBuffer: 32 * 1024 * 1024 });
  const before = snapshot();
  const invoke = (extra = {}, args = []) =>
    spawnSync(process.execPath, ['scripts/plugin-release-plan.mjs', ...args], {
      cwd: directory,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${mocks}:${process.env.PATH}`, MOCK_MAIN: sha, ...extra },
    });
  const planned = invoke();
  assert.equal(planned.status, 0, planned.stderr);
  assert.equal(JSON.parse(planned.stdout).version, '0.1.0');
  assert.equal(JSON.parse(planned.stdout).commit, sha);
  const failed = invoke({ MOCK_QUERY_FAIL: 'yes' });
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /query failed/);
  assert.equal(failed.stdout, '');
  const insufficient = invoke({ MOCK_MAIN: '1234567890123456789012345678901234567890' });
  assert.notEqual(insufficient.status, 0);
  assert.match(insufficient.stderr, /Insufficient local history/);
  assert.deepEqual(snapshot(), before);
  git('tag', '-a', 'v0.1.0', '-m', 'Original fixture release');
  const tagObject = git('rev-parse', 'refs/tags/v0.1.0').trim();
  const manifest = path.join(directory, 'plugins/zudo-diagram-gen/plugin.json');
  const updated = JSON.parse(await readFile(manifest, 'utf8'));
  updated.version = '0.2.0';
  await writeFile(manifest, JSON.stringify(updated) + '\n');
  git('add', 'plugins/zudo-diagram-gen/plugin.json');
  git('commit', '-qm', 'Advance main beyond original release');
  const newer = git('rev-parse', 'HEAD').trim();
  const originalRefs = `${newer}\trefs/heads/main\n${tagObject}\trefs/tags/v0.1.0\n${sha}\trefs/tags/v0.1.0^{}`;
  const advancedBefore = snapshot();
  const resumed = invoke({ MOCK_REFS: originalRefs }, ['0.1.0']);
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.equal(JSON.parse(resumed.stdout).commit, sha);
  assert.equal(JSON.parse(resumed.stdout).sourceVersion, '0.1.0');
  assert.equal(JSON.parse(resumed.stdout).main, newer);
  const conflict = invoke({ MOCK_REFS: originalRefs.replace(tagObject, newer) }, ['0.1.0']);
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /tag objects differ/);
  assert.deepEqual(snapshot(), advancedBefore);
});
