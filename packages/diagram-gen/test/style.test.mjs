import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir, link } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { test, onTestFinished } from 'vitest';
import {
  createProject,
  loadSession,
  loadProject,
  exportCandidate,
  resolveToneContext,
  canonicalHash,
  lockProjectStyle,
  adoptProjectStyle,
  readStyleRevision,
  styleProvenance,
  createRefinement,
  reviewCompatibility,
  materializeKit,
} from '../src/index.mjs';
const exec = promisify(execFile);
const json = (file, value) => writeFile(file, JSON.stringify(value));
const svg =
  '\uFEFF<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200">\r\n<title>Public test selection, not user approval</title><path d="M1 2L3 4" fill="#123456"/></svg>\r\n';
const context = resolveToneContext('fine-outline');
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'diagram-style-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  await createProject({
    destination: root,
    project: true,
    sessions: [
      { slug: 's0', id: 's0' },
      { slug: 's1', id: 's1' },
    ],
  });
  for (const id of ['s0', 's1']) {
    const directory = join(root, `sessions/${id}/rounds/r01/c01`);
    await mkdir(directory);
    await json(join(directory, 'candidate.json'), {
      schemaVersion: 1,
      id: 'c01',
      title: 'Test fixture',
      toneId: 'fine-outline',
      order: 1,
      assets: { light: 'diagram.svg', dark: 'dark.svg' },
    });
    await writeFile(join(directory, 'diagram.svg'), svg);
    await writeFile(join(directory, 'dark.svg'), svg.replace('#123456', '#654321'));
  }
  const data = await loadProject(root);
  const selection = {
    schemaVersion: 1,
    kind: 'explicit-selection',
    purpose: 'test',
    baselines: data.sessions.map((session) => ({
      sessionId: session.id,
      candidateId: 'c01',
      fingerprint: session.data.candidates[0].fingerprint,
    })),
  };
  return { root, selection, palette: structuredClone((await context).scheme.palette) };
}
const lock = (f, revision = 'r1') =>
  lockProjectStyle(f.root, {
    toneId: 'fine-outline',
    palette: f.palette,
    selection: f.selection,
    revision,
  });
test('explicit lock/adoption integrates actual project loader, immutable constituent snapshots and session-qualified targets', async () => {
  const f = await fixture(),
    before = await loadProject(f.root);
  assert.equal(before.project.style, undefined);
  const result = await lock(f);
  assert.equal(result.adopted, true);
  assert.equal(result.selectionPurpose, 'test');
  const snapshot = await readStyleRevision(f.root, 'r1', {
    expectedHash: result.reference.hash,
    sessions: before.sessions,
  });
  assert.equal(snapshot.kit, (await context).kit.text);
  assert.deepEqual(snapshot.style.targets, [
    { sessionId: 's0', width: 360, height: 200 },
    { sessionId: 's1', width: 360, height: 200 },
  ]);
  const current = await loadProject(f.root, { strict: true });
  assert.equal(current.ok, true);
  assert.equal(current.sessions[0].data.styleHash, snapshot.hash);
  assert.equal(
    current.sessions[0].data.candidates[0].fingerprint,
    before.sessions[0].data.candidates[0].fingerprint,
  );
  const original = await readFile(join(f.root, 'styles/r1/style.json'));
  await assert.rejects(lock(f), /already exists/);
  f.palette.dark.accent = '#123456';
  const pending = await lock(f, 'r2');
  assert.equal(pending.adopted, false);
  assert.equal((await loadProject(f.root)).project.style.revision, 'r1');
  await adoptProjectStyle(f.root, { revision: 'r2' });
  assert.equal((await loadProject(f.root, { strict: true })).project.style.revision, 'r2');
  assert.deepEqual(await readFile(join(f.root, 'styles/r1/style.json')), original);
  await adoptProjectStyle(f.root, { revision: 'r2' });
  await assert.rejects(adoptProjectStyle(f.root, { revision: '../r1' }), /URL-safe/);
  await assert.rejects(lock(f, 1), /URL-safe/);
  await assert.rejects(adoptProjectStyle(f.root, { revision: 1 }), /URL-safe/);
});
test('preferences, foreign/stale/duplicate IDs, tone mismatch, malformed palettes and missing selections never lock', async () => {
  const f = await fixture();
  for (const selection of [
    undefined,
    { chosenDirection: f.selection.baselines[0] },
    { ...f.selection, purpose: 'preview' },
    { ...f.selection, baselines: [] },
    { ...f.selection, baselines: [...f.selection.baselines, f.selection.baselines[0]] },
    { ...f.selection, baselines: [{ ...f.selection.baselines[0], sessionId: 'foreign' }] },
    { ...f.selection, baselines: [{ ...f.selection.baselines[0], candidateId: 'foreign' }] },
    { ...f.selection, baselines: [{ ...f.selection.baselines[0], fingerprint: 'a'.repeat(64) }] },
  ])
    await assert.rejects(
      lockProjectStyle(f.root, {
        toneId: 'fine-outline',
        palette: f.palette,
        selection,
        revision: 'r1',
      }),
    );
  await assert.rejects(
    lockProjectStyle(f.root, {
      toneId: 'soft-fill',
      palette: f.palette,
      selection: f.selection,
      revision: 'r1',
    }),
    /tone differs/,
  );
  await assert.rejects(
    lockProjectStyle(f.root, {
      toneId: 'fine-outline',
      palette: { light: f.palette.light },
      selection: f.selection,
      revision: 'r1',
    }),
    /palette.dark/,
  );
  assert.equal((await loadProject(f.root)).project.style, undefined);
});
test('conflicting and interrupted operations preserve partial files and adopted metadata', async () => {
  const f = await fixture();
  await mkdir(join(f.root, '.style-operation'));
  await assert.rejects(lock(f), /active or interrupted/);
  await rm(join(f.root, '.style-operation'), { recursive: true });
  await mkdir(join(f.root, 'styles/r1'), { recursive: true });
  await writeFile(join(f.root, 'styles/r1/interrupted.txt'), 'preserve');
  await assert.rejects(lock(f), /partial\/interrupted/);
  assert.equal(await readFile(join(f.root, 'styles/r1/interrupted.txt'), 'utf8'), 'preserve');
  await assert.rejects(adoptProjectStyle(f.root, { revision: 'r1' }));
  await mkdir(join(f.root, 'styles/.stage-old'));
  await writeFile(join(f.root, 'styles/.stage-old/diagnostic'), 'preserve');
  const results = await Promise.allSettled([lock(f, 'r2'), lock(f, 'r2')]);
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal(await readFile(join(f.root, 'styles/.stage-old/diagnostic'), 'utf8'), 'preserve');
  assert.equal((await loadProject(f.root)).ok, true);
  assert.equal(
    (await readdir(f.root)).some((name) => name.startsWith('.style-project-')),
    false,
  );
});
test('saved locks survive catalog upgrades; later diagrams materialize saved kits and exact exports remain saved bytes', async () => {
  const f = await fixture();
  await lock(f);
  const snapshot = await readStyleRevision(f.root, 'r1');
  const changedCatalog = structuredClone((await context).scheme);
  changedCatalog.palette.light.ink = '#010203';
  changedCatalog.toneRevision = 'future';
  assert.notEqual(canonicalHash(changedCatalog), snapshot.style.schemeHash);
  const result = materializeKit(snapshot.kit, {
    scheme: snapshot.scheme,
    palette: snapshot.palette,
    theme: 'dark',
    instances: [{ id: 'later', primitive: 'person', width: 100, height: 100 }],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><title>Later test diagram</title></svg>',
  });
  assert.match(result, /kit-later-person/);
  const metadataPath = join(f.root, 'sessions/s0/rounds/r01/c01/candidate.json');
  const metadata = JSON.parse(await readFile(metadataPath));
  const old = (await loadSession(join(f.root, 'sessions/s0'))).candidates[0];
  metadata.provenance = styleProvenance(snapshot);
  metadata.assetHashes = old.assetHashes;
  await json(metadataPath, metadata);
  const current = (await loadSession(join(f.root, 'sessions/s0'))).candidates[0];
  assert.equal(current.fingerprint, old.fingerprint);
  const output = join(f.root, 'exports/saved.svg');
  await exportCandidate(join(f.root, 'sessions/s0'), 'c01', { output, resourceRoot: f.root });
  assert.deepEqual(await readFile(output), Buffer.from(svg));
  await exportCandidate(join(f.root, 'sessions/s0'), 'c01', { output, resourceRoot: f.root });
  assert.deepEqual(await readFile(output), Buffer.from(svg));
  assert.deepEqual((await readStyleRevision(f.root, 'r1')).palette, snapshot.palette);
});
test('style artwork placement and capture staleness remain independent and legacy fingerprints/feedback survive', async () => {
  const f = await fixture();
  const candidate = (await loadSession(join(f.root, 'sessions/s0'))).candidates[0];
  const note = {
    fingerprint: candidate.fingerprint,
    keep: 'Accepted path and labels',
    change: 'Spacing',
  };
  assert.deepEqual(reviewCompatibility(candidate, note), {
    artwork: 'current',
    style: 'unknown',
    placement: 'unknown',
    capture: 'unknown',
  });
  assert.deepEqual(
    reviewCompatibility(
      candidate,
      { ...note, styleHash: 'a', placementHash: 'b', captureHash: 'c' },
      { styleHash: 'd', placementHash: 'e', captureHash: 'f' },
    ),
    { artwork: 'current', style: 'stale', placement: 'stale', capture: 'stale' },
  );
  await lock(f);
  await writeFile(
    join(f.root, 'sessions/s0/rounds/r01/c01/diagram.svg'),
    svg.replace('M1 2L3 4', 'M1 2L4 5'),
  );
  const changed = (await loadSession(join(f.root, 'sessions/s0'))).candidates[0];
  assert.equal(reviewCompatibility(changed, note).artwork, 'stale');
  assert.equal(note.keep, 'Accepted path and labels');
  assert.equal(note.fingerprint, candidate.fingerprint);
  const data = await loadProject(f.root);
  assert.equal(data.ok, false);
  assert.equal(data.diagnostics[0].code, 'STALE_INPUT');
  f.selection.baselines[0].fingerprint = changed.fingerprint;
  await lock(f, 'r2');
  await adoptProjectStyle(f.root, { revision: 'r2' });
  assert.equal((await loadProject(f.root)).ok, true);
});
test('refinement copies named saved light/dark bytes, preserves feedback and creates new later-round lineage', async () => {
  const f = await fixture(),
    root = join(f.root, 'sessions/s0');
  const baseline = (await loadSession(root)).candidates[0];
  await mkdir(join(root, 'rounds/folder-two'));
  await json(join(root, 'rounds/folder-two/round.json'), {
    schemaVersion: 1,
    id: 'r02',
    title: 'Refine',
    order: 2,
    baselineCandidateId: baseline.id,
  });
  const feedback = {
    id: baseline.id,
    fingerprint: baseline.fingerprint,
    keep: 'Preserve geometry/facts',
    change: 'Improve spacing',
  };
  const args = {
    baselineCandidateId: baseline.id,
    fingerprint: baseline.fingerprint,
    roundId: 'r02',
    candidateId: 'c02',
    title: 'Refinement test',
    feedback,
  };
  for (const changed of [
    { candidateId: 'c01' },
    { candidateId: 'c02-' },
    { candidateId: 'c02.' },
    { candidateId: 'c02_' },
    { fingerprint: 'a'.repeat(64) },
    { roundId: 'r01' },
    { feedback: { ...feedback, fingerprint: 'a'.repeat(64) } },
  ])
    await assert.rejects(createRefinement(root, { ...args, ...changed }));
  await createRefinement(root, args);
  const child = (await loadSession(root)).candidates.find((item) => item.id === 'c02');
  assert.equal(child.parentCandidateId, 'c01');
  assert.equal(child.roundId, 'r02');
  assert.equal(child.assets.light, baseline.assets.light);
  assert.equal(child.assets.dark, baseline.assets.dark);
  const saved = JSON.parse(await readFile(join(root, child.sourcePath)));
  assert.deepEqual(saved.baselineFeedback, feedback);
  assert.deepEqual(await readFile(join(root, 'rounds/folder-two/c02/light.svg')), Buffer.from(svg));
  await assert.rejects(createRefinement(root, args), /unique/);
});
test('export rejects missing assets hash/revision mismatch source overlap symlink/hardlink without corruption', async () => {
  const f = await fixture(),
    root = join(f.root, 'sessions/s0');
  await lock(f);
  const snapshot = await readStyleRevision(f.root, 'r1');
  const metadataPath = join(root, 'rounds/r01/c01/candidate.json');
  const metadata = JSON.parse(await readFile(metadataPath));
  metadata.provenance = styleProvenance(snapshot);
  metadata.assetHashes = (await loadSession(root)).candidates[0].assetHashes;
  await json(metadataPath, metadata);
  const output = join(f.root, 'exports/saved.svg');
  await exportCandidate(root, 'c01', { output, resourceRoot: f.root });
  for (const destination of [
    join(f.root, 'project.json'),
    join(f.root, 'styles/r1/kit.svg'),
    metadataPath,
  ])
    await assert.rejects(
      exportCandidate(root, 'c01', { output: destination, resourceRoot: f.root }),
      /overlaps/,
    );
  await symlink(join(root, 'rounds/r01/c01/diagram.svg'), join(f.root, 'exports/link.svg'));
  await assert.rejects(
    exportCandidate(root, 'c01', {
      output: join(f.root, 'exports/link.svg'),
      resourceRoot: f.root,
    }),
    /unsafe|symbolic/,
  );
  await link(join(root, 'rounds/r01/c01/diagram.svg'), join(f.root, 'exports/hard.svg'));
  await assert.rejects(
    exportCandidate(root, 'c01', {
      output: join(f.root, 'exports/hard.svg'),
      resourceRoot: f.root,
    }),
    /hard-link/,
  );
  metadata.provenance.styleHash = 'a'.repeat(64);
  await json(metadataPath, metadata);
  await assert.rejects(
    exportCandidate(root, 'c01', { output, resourceRoot: f.root }),
    /reference hash mismatch/,
  );
  metadata.provenance = styleProvenance(snapshot);
  metadata.assetHashes.light = 'a'.repeat(64);
  await json(metadataPath, metadata);
  await assert.rejects(
    exportCandidate(root, 'c01', { output, resourceRoot: f.root }),
    /asset hash mismatch/,
  );
  delete metadata.assetHashes;
  await json(metadataPath, metadata);
  await rm(join(root, 'rounds/r01/c01/diagram.svg'));
  await assert.rejects(
    exportCandidate(root, 'c01', { output, resourceRoot: f.root }),
    /does not exist/,
  );
  assert.deepEqual(await readFile(output), Buffer.from(svg));
});
test('project command produces one envelope and rejects duplicate/unknown options and inferred selections', async () => {
  const f = await fixture();
  await json(join(f.root, 'selection.json'), f.selection);
  await json(join(f.root, 'palette.json'), f.palette);
  const cli = new URL('../src/cli.mjs', import.meta.url).pathname;
  const args = [
    'project',
    'lock',
    f.root,
    '--tone',
    'fine-outline',
    '--selection',
    join(f.root, 'selection.json'),
    '--palette',
    join(f.root, 'palette.json'),
    '--revision',
    'r1',
    '--json',
  ];
  const result = await exec(process.execPath, [cli, ...args]);
  assert.equal(JSON.parse(result.stdout).ok, true);
  const adopted = await exec(process.execPath, [
    cli,
    'project',
    'adopt',
    f.root,
    '--revision',
    'r1',
    '--json',
  ]);
  assert.equal(JSON.parse(adopted.stdout).data.selectionPurpose, 'test');
  for (const extra of [['--revision', 'r2'], ['--unknown']]) {
    try {
      await exec(process.execPath, [cli, ...args, ...extra]);
      assert.fail('Expected usage rejection');
    } catch (error) {
      assert.equal(error.code, 2);
      assert.equal(JSON.parse(error.stdout).errors[0].code, 'INVALID_ARGUMENT');
    }
  }
});

test('registered placement and image inputs under exports stay protected for SVG and HTML', async () => {
  const f = await fixture(),
    root = join(f.root, 'sessions/s0');
  await mkdir(join(f.root, 'exports'));
  const descriptor = {
    schemaVersion: 1,
    frame: { width: 360, height: 200, background: '#FFFFFF' },
    slot: { x: 0, y: 0, width: 360, height: 200 },
    fit: 'contain',
    images: [{ path: 'context.png', x: 0, y: 0, width: 10, height: 10 }],
  };
  const file = join(f.root, 'project.json');
  const project = JSON.parse(await readFile(file));
  project.sessions[0].placement = 'exports/placement.json';
  await json(file, project);
  await json(join(f.root, 'exports/placement.json'), descriptor);
  await writeFile(
    join(f.root, 'exports/context.png'),
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  for (const output of [
    join(f.root, 'exports/placement.json'),
    join(f.root, 'exports/context.png'),
  ])
    await assert.rejects(
      exportCandidate(root, 'c01', { output, resourceRoot: f.root }),
      /registered project/,
    );
  assert.equal((await loadProject(f.root)).ok, true);
  const { exportHtml } = await import('../src/index.mjs');
  project.sessions[0].placement = 'exports/placement.html';
  await json(file, project);
  await json(join(f.root, 'exports/placement.html'), { ...descriptor, images: [] });
  await assert.rejects(
    exportHtml(f.root, { output: join(f.root, 'exports/placement.html'), force: true }),
    (error) => error.code === 'RESOURCE_UNSAFE' && /registered project/.test(error.message),
  );
  assert.deepEqual(JSON.parse(await readFile(join(f.root, 'exports/placement.html'))), {
    ...descriptor,
    images: [],
  });
  assert.equal((await loadProject(f.root)).ok, true);
});
test('valid BOM-prefixed project and round metadata supports locks and refinement', async () => {
  const f = await fixture(),
    root = join(f.root, 'sessions/s0');
  const file = join(f.root, 'project.json');
  await writeFile(file, '\uFEFF' + (await readFile(file, 'utf8')));
  await lock(f);
  const baseline = (await loadSession(root)).candidates[0];
  await mkdir(join(root, 'rounds/r02'));
  await writeFile(
    join(root, 'rounds/r02/round.json'),
    '\uFEFF' + JSON.stringify({ schemaVersion: 1, id: 'r02', title: 'BOM test', order: 2 }),
  );
  await createRefinement(root, {
    baselineCandidateId: baseline.id,
    fingerprint: baseline.fingerprint,
    roundId: 'r02',
    candidateId: 'c02',
    title: 'BOM child',
  });
  assert.equal((await loadSession(root)).candidates.length, 2);
});

test('corrupt constituent hashes and symlinked style resources fail the actual loader/adoption without rewriting locks', async () => {
  const f = await fixture();
  await lock(f);
  await lock(f, 'r2');
  const paletteFile = join(f.root, 'styles/r2/palette.json');
  const before = await readFile(paletteFile);
  const changed = JSON.parse(before);
  changed.dark.warning = '#010203';
  await json(paletteFile, changed);
  await assert.rejects(adoptProjectStyle(f.root, { revision: 'r2' }), /constituent hash mismatch/);
  assert.equal((await loadProject(f.root)).project.style.revision, 'r1');
  await writeFile(paletteFile, before);
  const kitFile = join(f.root, 'styles/r1/kit.svg');
  const kit = await readFile(kitFile);
  await writeFile(join(f.root, 'same-kit.svg'), kit);
  await rm(kitFile);
  await symlink(join(f.root, 'same-kit.svg'), kitFile);
  const data = await loadProject(f.root);
  assert.equal(data.ok, false);
  assert.match(data.diagnostics[0].message, /symbolic links/);
  await assert.rejects(adoptProjectStyle(f.root, { revision: 'r2' }), /symbolic links/);
  assert.deepEqual(await readFile(join(f.root, 'same-kit.svg')), kit);
});
