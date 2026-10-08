import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, cp, mkdir, chmod, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, onTestFinished } from 'vitest';
const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
const fixture = fileURLToPath(new URL('../../../examples/project-ez-host', import.meta.url));
async function workspace() {
  const root = await mkdtemp(path.join(tmpdir(), 'diagram-workflow-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  const brief = path.join(root, 'brief.md');
  await writeFile(brief, '# Grounded facts\n## Intent\nShow the real feature.\n');
  return { root, brief, out: path.join(root, 'session') };
}
function run(args, env) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: env ?? process.env,
  });
  return { ...result, json: result.stdout.trim() ? JSON.parse(result.stdout) : null };
}
test('fresh CLI create and explicit resume preserve caller brief, stable identity and empty content', async () => {
  const { out, brief } = await workspace();
  const created = run(['new', '--out', out, '--brief', brief, '--json']);
  assert.equal(created.status, 0);
  assert.equal(created.json.command, 'new');
  assert.equal(created.json.data.installed, false);
  assert.equal(await readFile(path.join(out, 'brief.md'), 'utf8'), await readFile(brief, 'utf8'));
  for (const command of ['inspect', 'resume']) {
    const result = run([command, out, '--json']);
    assert.equal(result.status, 0);
    assert.equal(result.json.data.content.session.id, created.json.data.sessionId);
    assert.deepEqual(result.json.data.content.candidates, []);
    assert.equal(result.json.data.review, null);
    assert.equal(result.json.data.capabilities.capture.inspected, false);
    assert.equal(result.json.data.capabilities.browserReview, 'explicit-transfer-only');
  }
  const repeated = run(['new', '--out', out, '--brief', brief, '--json']);
  assert.equal(repeated.status, 4);
  assert.equal(repeated.json.errors[0].code, 'OUTPUT_CONFLICT');
  assert.equal(
    JSON.parse(await readFile(path.join(out, 'session.json'))).id,
    created.json.data.sessionId,
  );
});
test('project inspect exposes incomplete siblings without corrupting healthy content', async () => {
  const { out, brief } = await workspace();
  assert.equal(run(['new', '--out', out, '--brief', brief, '--project', '--json']).status, 0);
  const manifestPath = path.join(out, 'project.json');
  const manifest = JSON.parse(await readFile(manifestPath));
  manifest.sessions.push({ id: 'missing', path: 'sessions/missing', order: 1 });
  await writeFile(manifestPath, JSON.stringify(manifest));
  const result = run(['resume', out, '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.json.ok, false);
  assert.equal(result.json.data.content.sessions[0].status, 'valid');
  assert.equal(result.json.data.content.sessions[1].status, 'missing');
  assert.equal(result.json.errors[0].code, 'INCOMPLETE_PROJECT');
  assert.equal(run(['check', out, '--json-version', '1']).status, 1);
});
test('interrupted opt-in install preserves resumable files and keeps child logs on stderr', async () => {
  const { root, out, brief } = await workspace();
  const bin = path.join(root, 'bin');
  await mkdir(bin);
  await writeFile(
    path.join(bin, 'pnpm'),
    '#!/bin/sh\necho child-install-stdout\necho child-install-stderr >&2\nexit 7\n',
  );
  await chmod(path.join(bin, 'pnpm'), 0o755);
  const result = run(['new', '--out', out, '--brief', brief, '--install', '--json'], {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
  });
  assert.equal(result.status, 4);
  assert.equal(result.json.errors[0].code, 'IO_ERROR');
  assert.equal(result.json.data.directory, out);
  assert.equal(result.json.data.installed, false);
  assert.match(result.json.data.recovery, /pnpm install/);
  assert.match(result.stderr, /child-install-stdout/);
  assert.match(result.stderr, /child-install-stderr/);
  assert.match(result.json.errors[0].message, /Files are preserved|Workspace created/);
  assert.equal(run(['resume', out, '--json']).status, 0);
  assert.equal(run(['new', '--out', out, '--brief', brief, '--json']).status, 4);
});
test('symlink create and unreadable/oversized briefs fail before scaffolding', async () => {
  const { root, out, brief } = await workspace();
  await mkdir(out);
  const linked = path.join(root, 'linked');
  await symlink(out, linked);
  assert.equal(
    run(['new', '--out', linked, '--brief', brief, '--json']).json.errors[0].code,
    'RESOURCE_UNSAFE',
  );
  await writeFile(brief, 'x'.repeat(1024 * 1024 + 1));
  const result = run(['new', '--out', path.join(root, 'oversized'), '--brief', brief, '--json']);
  assert.equal(result.status, 4);
  assert.equal(result.json.errors[0].code, 'RESOURCE_UNSAFE');
});
for (const args of [
  ['new', '--out', 'x', '--brief', 'x', '--session', 'x', '--json'],
  ['new', '--out', 'x', '--out', 'y', '--brief', 'x', '--json'],
  ['resume', 'x', '--out', 'y', '--json'],
  ['inspect', 'x', '--json', '--json'],
  ['tones', 'list', '--unknown', '--json-version', '1'],
  ['check', '--json-version', '1', '--json-version', '1'],
  ['capture', 'x', '--session', 'x', '--out', 'x', '--out', 'y', '--json'],
  ['project', 'adopt', 'x', '--revision', 'r1', '--revision', 'r2', '--json'],
  ['export-html', 'x', '--out', 'x', '--force', '--force', '--json'],
  ['nonsense', '--json'],
  ['new', '--out=', '--brief', 'x', '--json'],
  ['resume', 'x', '--review=', '--json'],
  ['check', '--json-version=', '--json'],
])
  test(`argument errors have one parseable envelope: ${args.join(' ')}`, () => {
    const result = run(args);
    assert.equal(result.status, 2);
    assert.equal(result.json.schemaVersion, 1);
    assert.equal(result.json.ok, false);
    assert.equal(result.json.errors[0].code, 'INVALID_ARGUMENT');
  });
test('legacy JSON shapes remain bare while explicit versions are envelopes', () => {
  const bare = run(['check', fixture, '--json']);
  assert.equal(bare.status, 0);
  assert.ok(bare.json.summary);
  assert.equal(bare.json.command, undefined);
  const versioned = run(['check', fixture, '--json-version', '1']);
  assert.equal(versioned.json.command, 'check');
  assert.deepEqual(versioned.json.data, bare.json);
  const list = run(['tones', 'list', '--json']);
  assert.ok(list.json.tones.length);
  assert.equal(list.json.command, undefined);
  const tone = run(['tones', 'show', 'fine-outline', '--json-version', '1']);
  assert.equal(tone.status, 0);
  assert.ok(tone.json.data.examples.light);
  assert.ok(tone.json.data.scheme);
  assert.ok(tone.json.data.kit);
  assert.equal(
    run(['tones', 'list', '--json-version', '2']).json.errors[0].code,
    'UNSUPPORTED_VERSION',
  );
});
test('explicit review transfer preserves feedback and separately reports stale artwork', async () => {
  const { root, out } = await workspace();
  await cp(fixture, out, { recursive: true });
  const initial = run(['inspect', out, '--json']).json.data.content;
  const candidate = initial.candidates[0];
  const record = {
    id: candidate.id,
    fingerprint: candidate.fingerprint,
    keep: 'Facts',
    change: 'Spacing',
    action: 'refine',
  };
  const review = {
    schemaVersion: 1,
    type: 'zudo-diagram-review',
    sessionId: initial.session.id,
    records: [record],
    shortlist: [],
    chosenDirection: { id: candidate.id, fingerprint: candidate.fingerprint },
  };
  const reviewPath = path.join(root, 'review.json');
  await writeFile(reviewPath, JSON.stringify(review));
  const fresh = run(['resume', out, '--review', reviewPath, '--json']);
  assert.equal(fresh.status, 0);
  assert.equal(fresh.json.data.review.records[0].keep, 'Facts');
  assert.equal(fresh.json.data.reviewEvidence[0].candidates[0].compatibility.artwork, 'current');
  assert.equal(fresh.json.data.reviewEvidence[0].candidates[0].compatibility.capture, 'unknown');
  const metadataPath = path.join(out, candidate.sourcePath);
  const metadata = JSON.parse(await readFile(metadataPath));
  metadata.title += ' changed';
  await writeFile(metadataPath, JSON.stringify(metadata));
  const stale = run(['resume', out, '--review', reviewPath, '--json']);
  assert.equal(stale.status, 1);
  assert.equal(stale.json.errors[0].code, 'STALE_INPUT');
  assert.equal(stale.json.data.review.chosenDirection.fingerprint, candidate.fingerprint);
  assert.equal(stale.json.data.reviewEvidence[0].candidates[0].compatibility.artwork, 'stale');
  review.sessionId = 'foreign';
  await writeFile(reviewPath, JSON.stringify(review));
  assert.equal(
    run(['resume', out, '--review', reviewPath, '--json']).json.errors[0].code,
    'VALIDATION_FAILED',
  );
});
test('exact saved export has an envelope and missing themes are explicit failures', async () => {
  const { root } = await workspace();
  const candidate = run(['inspect', fixture, '--json']).json.data.content.candidates[0];
  const output = path.join(root, 'export.svg');
  const result = run([
    'export',
    candidate.id,
    '--session',
    fixture,
    '--theme',
    'light',
    '--out',
    output,
    '--json',
  ]);
  assert.equal(result.status, 0);
  assert.equal(result.json.command, 'export');
  assert.equal(await readFile(output, 'utf8'), candidate.assets.light);
  const failure = run([
    'export',
    candidate.id,
    '--session',
    fixture,
    '--theme',
    'invalid',
    '--out',
    output,
    '--json',
  ]);
  assert.notEqual(failure.status, 0);
  assert.equal(await readFile(output, 'utf8'), candidate.assets.light);
});

test('inaccessible review reports actionable IO and retains loaded content', async () => {
  const { out, brief, root } = await workspace();
  const created = run(['new', '--out', out, '--brief', brief, '--json']);
  const result = run(['resume', out, '--review', path.join(root, 'missing-review.json'), '--json']);
  assert.equal(result.status, 4);
  assert.equal(result.json.errors[0].code, 'IO_ERROR');
  assert.equal(result.json.data.content.session.id, created.json.data.sessionId);
});

test('export domain failures are validation failures while unsafe aliases remain resource errors', async () => {
  const { root, out } = await workspace();
  await cp(fixture, out, { recursive: true });
  const candidate = run(['inspect', out, '--json']).json.data.content.candidates[0];
  const destination = path.join(root, 'saved.svg');
  const missing = run([
    'export',
    'absent',
    '--session',
    out,
    '--theme',
    'light',
    '--out',
    destination,
    '--json',
  ]);
  assert.equal(missing.status, 1);
  assert.equal(missing.json.errors[0].code, 'VALIDATION_FAILED');
  const metadataPath = path.join(out, candidate.sourcePath);
  const metadata = JSON.parse(await readFile(metadataPath));
  delete metadata.assets.dark;
  await writeFile(metadataPath, JSON.stringify(metadata));
  const unavailable = run([
    'export',
    candidate.id,
    '--session',
    out,
    '--theme',
    'dark',
    '--out',
    destination,
    '--json',
  ]);
  assert.equal(unavailable.status, 1);
  assert.equal(unavailable.json.errors[0].code, 'VALIDATION_FAILED');
  await symlink(metadataPath, destination);
  const unsafe = run([
    'export',
    candidate.id,
    '--session',
    out,
    '--theme',
    'light',
    '--out',
    destination,
    '--json',
  ]);
  assert.equal(unsafe.status, 4);
  assert.equal(unsafe.json.errors[0].code, 'RESOURCE_UNSAFE');
});
test('relative engine archive is a usage failure and missing absolute archive is IO', async () => {
  const { root, out, brief } = await workspace();
  const usage = run([
    'new',
    '--out',
    out,
    '--brief',
    brief,
    '--engine-package',
    './bad.tgz',
    '--json',
  ]);
  assert.equal(usage.status, 2);
  assert.equal(usage.json.errors[0].code, 'INVALID_ARGUMENT');
  const missing = run([
    'new',
    '--out',
    out,
    '--brief',
    brief,
    '--engine-package',
    path.join(root, 'missing.tgz'),
    '--json',
  ]);
  assert.equal(missing.status, 4);
  assert.equal(missing.json.errors[0].code, 'IO_ERROR');
});

test('versioned project commands preserve fatal diagnostic codes, paths and exit classes', async () => {
  const { out } = await workspace();
  await mkdir(out);
  const cases = [
    { schemaVersion: 2, sessions: [], code: 'UNSUPPORTED_VERSION', exit: 2 },
    {
      schemaVersion: 1,
      sessions: [{ id: 'unsafe', path: '../outside', order: 0 }],
      code: 'RESOURCE_UNSAFE',
      exit: 4,
    },
  ];
  for (const item of cases) {
    await writeFile(
      path.join(out, 'project.json'),
      JSON.stringify({
        schemaVersion: item.schemaVersion,
        id: 'project',
        title: 'Project',
        sessions: item.sessions,
        comparisonSets: [],
      }),
    );
    for (const args of [
      ['check', out, '--json-version', '1'],
      ['inspect', out, '--json'],
      ['resume', out, '--json'],
      ['export-html', out, '--out', path.join(out, 'exports/fatal.html'), '--json'],
    ]) {
      const result = run(args);
      assert.equal(result.status, item.exit, args[0]);
      assert.equal(result.json.ok, false);
      assert.equal(result.stderr, '');
      assert.ok(result.json.errors.some((error) => error.code === item.code));
      assert.ok(result.json.errors.every((error) => typeof error.path === 'string'));
    }
    const legacy = run(['check', out, '--json']);
    assert.equal(legacy.status, 1);
    assert.equal(legacy.json.schemaVersion, undefined);
    assert.ok(Array.isArray(legacy.json.errors));
    const legacyHtml = spawnSync(
      process.execPath,
      [cli, 'export-html', out, '--out', path.join(out, 'exports/fatal.html')],
      { encoding: 'utf8' },
    );
    assert.equal(legacyHtml.status, 1);
  }
});

test('partial project resource errors keep healthy HTML content and override earlier incomplete diagnostics', async () => {
  const { root, out } = await workspace();
  await mkdir(path.join(out, 'sessions'), { recursive: true });
  await cp(fixture, path.join(out, 'sessions/healthy'), { recursive: true });
  await cp(fixture, path.join(out, 'sessions/unsafe'), { recursive: true });
  for (const id of ['healthy', 'unsafe']) {
    const file = path.join(out, `sessions/${id}/session.json`);
    const metadata = JSON.parse(await readFile(file));
    await writeFile(file, JSON.stringify({ ...metadata, id }));
  }
  await mkdir(path.join(out, 'placements'));
  await writeFile(path.join(root, 'outside.png'), 'outside resource');
  const metadata = JSON.parse(await readFile(path.join(out, 'sessions/unsafe/session.json')));
  const { width, height } = metadata.target;
  await symlink(path.join(root, 'outside.png'), path.join(out, 'placements/escape.png'));
  await writeFile(
    path.join(out, 'placements/unsafe.json'),
    JSON.stringify({
      schemaVersion: 1,
      frame: { width, height, background: 'transparent' },
      slot: { x: 0, y: 0, width, height },
      fit: 'contain',
      images: [{ path: 'escape.png', x: 0, y: 0, width: 1, height: 1 }],
    }),
  );
  await writeFile(
    path.join(out, 'project.json'),
    JSON.stringify({
      schemaVersion: 1,
      id: 'project',
      title: 'Project',
      sessions: [
        { id: 'healthy', path: 'sessions/healthy', order: 0 },
        { id: 'missing', path: 'sessions/missing', order: 1 },
        { id: 'unsafe', path: 'sessions/unsafe', order: 2, placement: 'placements/unsafe.json' },
      ],
      comparisonSets: [],
    }),
  );
  for (const args of [
    ['inspect', out, '--json'],
    ['resume', out, '--json'],
    ['check', out, '--json-version', '1'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 4, args[0]);
    assert.equal(result.json.errors[0].code, 'INCOMPLETE_PROJECT');
    assert.ok(
      result.json.errors.some(
        (error) => error.code === 'RESOURCE_UNSAFE' && error.path === 'sessions/unsafe',
      ),
    );
  }
  const html = path.join(root, 'partial.html');
  const exported = run(['export-html', out, '--out', html, '--json']);
  assert.equal(exported.status, 4);
  assert.equal(exported.json.ok, false);
  assert.equal(exported.json.data.kind, 'project');
  assert.ok(exported.json.data.candidates > 0);
  assert.equal(exported.json.errors[0].code, 'INCOMPLETE_PROJECT');
  assert.ok(exported.json.errors.some((error) => error.code === 'RESOURCE_UNSAFE'));
  const content = await readFile(html, 'utf8');
  assert.ok(content.includes('"id":"healthy"'));
  assert.ok(content.includes('"status":"missing"'));
  assert.ok(content.includes('"status":"invalid"'));
  assert.equal(run(['check', out, '--json']).status, 1);
  const human = spawnSync(
    process.execPath,
    [cli, 'export-html', out, '--out', path.join(root, 'legacy-partial.html')],
    { encoding: 'utf8' },
  );
  assert.equal(human.status, 1);
  assert.ok(
    (await readFile(path.join(root, 'legacy-partial.html'), 'utf8')).includes('"id":"healthy"'),
  );
});
