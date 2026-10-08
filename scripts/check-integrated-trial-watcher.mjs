#!/usr/bin/env node
// Manager/CI: heavy-guard + playwright-guard. Mutations affect ONLY a disposable copy.
// Usage: <installed-project-root> <new-output> [--port=4798]
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile, rm, rename } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import {
  installed,
  playwrightFor,
  runNode,
  poll,
  saveJSON,
  diagnostics,
  sha256,
} from './integrated-trial-browser-support.mjs';
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: <projectRoot> <new-output> [--port=4798]');
const root = resolve(input),
  out = resolve(output),
  copy = join(out, 'disposable-project');
assert(
  out !== root && !out.startsWith(`${root}/`),
  'Disposable output must be outside reviewed source',
);
const options = process.argv.slice(4);
assert(
  options.every((s) => /^--port=\d+$/.test(s)),
  'Only --port is supported',
);
const port =
  options.find((s) => s.startsWith('--port='))?.split('=')[1] ||
  process.env.PROJECT_CHECK_PORT ||
  '4798';
await mkdir(out, { recursive: false });
await cp(root, copy, {
  recursive: true,
  filter: (path) =>
    !['node_modules', '.git', 'dist', 'exports'].includes(
      path.slice(root.length + 1).split('/')[0],
    ),
});
// Copy the actual installed pnpm dependency graph, preserving internal relative links.
// A root node_modules symlink does not give zfb's bundler a self-contained dev host.
await cp(join(root, 'node_modules'), join(copy, 'node_modules'), {
  recursive: true,
  verbatimSymlinks: true,
});
const consumer = await installed(copy);
const initial = await consumer.engine.loadProject(copy, { strict: true });
assert(initial.sessions.length >= 5);
assert(
  initial.comparisonSets.length >= 8,
  'Run watcher only after actual trial mappings are complete',
);
const first = initial.sessions[0],
  sibling = initial.sessions[1];
const set = initial.comparisonSets.find((s) => s.toneId === 'fine-outline');
assert(set);
const mapped = set.entries.find((s) => s.sessionId === first.id);
const candidate = first.data.candidates.find((s) => s.id === mapped.candidateId);
assert(candidate.assets.dark, 'Absent-dark transition requires an initially complete candidate');
const base = `http://127.0.0.1:${port}`;
const child = spawn(
  process.execPath,
  [consumer.cli, 'dev', copy, '--host', '127.0.0.1', '--port', port],
  { cwd: copy, stdio: ['ignore', 'pipe', 'pipe'] },
);
let logs = '',
  browser,
  record;
child.stdout.on('data', (data) => {
  logs += data;
});
child.stderr.on('data', (data) => {
  logs += data;
});
const assertions = [],
  transitions = [];
try {
  await poll(async () => {
    assert.equal(child.exitCode, null, logs);
    return (await fetch(base, { signal: AbortSignal.timeout(1500) })).ok;
  }, 'Disposable dev host readiness');
  browser = await (
    await playwrightFor(consumer)
  ).chromium.launch(
    process.env.PROJECT_BROWSER_EXECUTABLE
      ? { executablePath: process.env.PROJECT_BROWSER_EXECUTABLE }
      : {},
  );
  const page = await browser.newPage();
  record = diagnostics(page);
  const app = page.locator('#diagram-app');
  await page.goto(base);
  // Observe zfb's actual live reload; repeated navigation can abort its requests.
  // A host that does not update the DOM must time out rather than pass via reload.
  const current = async () => {
    await app.locator('[data-project-slot]').first().waitFor();
    return JSON.parse(await page.locator('#diagram-data').textContent());
  };
  const converge = async (label, predicate, strictValid) => {
    await poll(async () => predicate(await current()), label);
    await app.locator('[data-project-control="set"]').selectOption(set.id);
    const siblingStatus = await app
      .locator(`[data-project-slot="${sibling.id}"]`)
      .getAttribute('data-status');
    assert.equal(
      siblingStatus,
      label === 'project-invalid' ? 'stale' : 'valid',
      `${label}: healthy sibling retained`,
    );
    const check = await runNode([consumer.cli, 'check', copy, '--json-version', '1'], copy);
    assert.equal(
      check.exitCode === 0,
      strictValid,
      `${label}: strict CLI must ${strictValid ? 'recover' : 'fail'}\n${check.stdout}\n${check.stderr}`,
    );
    await saveJSON(out, `check-${transitions.length}-${label}.json`, check);
    await page.screenshot({
      path: join(out, `transition-${transitions.length}-${label}.png`),
      fullPage: true,
    });
    transitions.push({ label, strictValid, stdoutSha256: sha256(check.stdout) });
  };
  const valid = (data) => data.ok && data.sessions.every((s) => s.status === 'valid');
  const session = (data) => data.sessions.find((s) => s.id === first.id);
  const sessionFile = join(copy, first.path, 'session.json');
  const candidateFile = join(copy, first.path, candidate.sourcePath);
  const candidateOriginal = await readFile(candidateFile, 'utf8');
  const candidateMetadata = JSON.parse(candidateOriginal);
  const briefFile = join(copy, first.path, 'brief.md');
  const roundFile = join(dirname(dirname(candidateFile)), 'round.json');
  const placementFile = join(
    copy,
    initial.project.sessions.find((s) => s.id === first.id).placement,
  );
  const projectFile = join(copy, 'project.json');
  await converge('baseline', valid, true);
  for (const [label, filename] of [
    ['session', sessionFile],
    ['round', roundFile],
    ['placement', placementFile],
  ]) {
    const original = await readFile(filename);
    await writeFile(filename, '{');
    await converge(`${label}-invalid`, (data) => session(data).status !== 'valid', false);
    await writeFile(filename, original);
    await converge(`${label}-recovered`, valid, true);
  }
  const originalBrief = await readFile(briefFile);
  const probe = '\n\nP11 watcher 日本語 brief probe\n';
  await writeFile(briefFile, Buffer.concat([originalBrief, Buffer.from(probe)]));
  await converge(
    'brief-edited',
    (data) => session(data).data?.brief.includes('P11 watcher 日本語'),
    true,
  );
  await writeFile(briefFile, originalBrief);
  await converge('brief-recovered', valid, true);
  const edited = { ...candidateMetadata, title: `${candidateMetadata.title} P11 edited` };
  await writeFile(candidateFile, JSON.stringify(edited));
  await converge(
    'candidate-edited',
    (data) => session(data).data?.candidates.some((s) => s.title.endsWith('P11 edited')),
    false,
  );
  await writeFile(candidateFile, candidateOriginal);
  await converge('candidate-edit-recovered', valid, true);
  const candidateDirectory = dirname(candidateFile);
  // Park outside session traversal so the deleted candidate is actually absent.
  const parkedOutside = join(out, 'parked-candidate');
  await rename(candidateDirectory, parkedOutside);
  await converge(
    'candidate-deleted',
    (data) =>
      session(data).status !== 'valid' ||
      !session(data).data?.candidates.some((s) => s.id === candidate.id),
    false,
  );
  await rename(parkedOutside, candidateDirectory);
  await converge('candidate-readded', valid, true);
  const addedDirectory = join(dirname(candidateDirectory), 'p11-watcher-added');
  await cp(candidateDirectory, addedDirectory, { recursive: true });
  await writeFile(
    join(addedDirectory, 'candidate.json'),
    JSON.stringify({
      ...candidateMetadata,
      id: 'p11-watcher-added',
      title: 'P11 actual disk added candidate',
      order: 999,
      parentCandidateId: null,
    }),
  );
  await converge(
    'candidate-added',
    (data) => session(data).data?.candidates.some((s) => s.id === 'p11-watcher-added'),
    true,
  );
  await rm(addedDirectory, { recursive: true });
  await converge(
    'candidate-add-removed',
    (data) =>
      valid(data) && !session(data).data.candidates.some((s) => s.id === 'p11-watcher-added'),
    true,
  );
  // Omit the dark declaration, rather than creating an invalid broken resource.
  const absentDark = structuredClone(candidateMetadata);
  delete absentDark.assets.dark;
  if (absentDark.assetHashes) delete absentDark.assetHashes.dark;
  await writeFile(candidateFile, JSON.stringify(absentDark));
  await converge(
    'dark-absent',
    (data) => !session(data).data?.candidates.find((s) => s.id === candidate.id)?.assets.dark,
    false,
  );
  await app.locator('[data-project-control="theme"]').selectOption('dark');
  assert.equal(
    await app.locator(`[data-project-slot="${first.id}"] [data-placement-diagram]`).count(),
    0,
  );
  await writeFile(candidateFile, candidateOriginal);
  await converge('dark-recovered', valid, true);
  const manifestOriginal = await readFile(projectFile, 'utf8');
  const manifest = JSON.parse(manifestOriginal);
  for (const variant of ['missing', 'stale']) {
    const changed = structuredClone(manifest);
    const mapping = changed.comparisonSets.find((s) => s.id === set.id);
    if (variant === 'missing')
      mapping.entries = mapping.entries.filter((s) => s.sessionId !== first.id);
    else mapping.entries.find((s) => s.sessionId === first.id).fingerprint = '0'.repeat(64);
    await writeFile(projectFile, JSON.stringify(changed));
    await converge(
      `mapping-${variant}`,
      (data) =>
        !data.ok &&
        data.comparisonSets
          .find((s) => s.id === set.id)
          .entries.some((s) => s.sessionId === first.id) ===
          (variant !== 'missing'),
      false,
    );
    assert.equal(
      await app.locator(`[data-project-slot="${first.id}"]`).getAttribute('data-status'),
      variant,
    );
    await writeFile(projectFile, manifestOriginal);
    await converge(`mapping-${variant}-recovered`, valid, true);
  }
  // Fatal metadata must preserve the last-valid hosted siblings while strict check fails.
  await writeFile(projectFile, '{');
  await converge('project-invalid', (data) => !data.ok && data.diagnostics.length > 0, false);
  await writeFile(projectFile, manifestOriginal);
  await converge('project-recovered', valid, true);
  const badStyle = {
    ...manifest,
    style: { revision: 'p11-missing', path: 'styles/p11-missing/style.json', hash: '0'.repeat(64) },
  };
  await writeFile(projectFile, JSON.stringify(badStyle));
  await converge(
    'style-invalid',
    (data) => !data.ok && data.diagnostics.some((s) => s.path === badStyle.style.path),
    false,
  );
  await writeFile(projectFile, manifestOriginal);
  await converge('style-recovered', valid, true);
  const roundOriginal = await readFile(roundFile, 'utf8');
  await writeFile(
    roundFile,
    JSON.stringify({ ...JSON.parse(roundOriginal), title: 'P11 round metadata edit' }),
  );
  await converge(
    'round-edited',
    (data) => session(data).data?.rounds.some((r) => r.title === 'P11 round metadata edit'),
    true,
  );
  await writeFile(roundFile, roundOriginal);
  await converge('round-edit-recovered', valid, true);
  const selection = {
    schemaVersion: 1,
    kind: 'explicit-selection',
    purpose: 'test',
    baselines: set.entries.map(({ sessionId, candidateId, fingerprint }) => ({
      sessionId,
      candidateId,
      fingerprint,
    })),
  };
  const context = await consumer.engine.resolveToneContext('fine-outline', {
    requireComplete: true,
  });
  const lock = await consumer.engine.lockProjectStyle(copy, {
    toneId: 'fine-outline',
    palette: context.scheme.palette,
    selection,
    revision: 'p11-watcher-test',
  });
  if (!lock.adopted)
    await consumer.engine.adoptProjectStyle(copy, { revision: 'p11-watcher-test' });
  await converge(
    'style-valid-adopted',
    (data) => valid(data) && data.project.style?.revision === 'p11-watcher-test',
    true,
  );
  const styleFile = join(copy, 'styles/p11-watcher-test/style.json');
  const styleOriginal = await readFile(styleFile);
  await writeFile(styleFile, '{');
  await converge(
    'style-file-invalid',
    (data) =>
      !data.ok && data.diagnostics.some((d) => d.path === 'styles/p11-watcher-test/style.json'),
    false,
  );
  await writeFile(styleFile, styleOriginal);
  await converge('style-file-recovered', valid, true);
  await writeFile(projectFile, manifestOriginal);
  await converge('style-original-restored', valid, true);
  // Registered local placement images, when present, are watched as actual files.
  const placementOriginal = await readFile(placementFile, 'utf8');
  const placement = JSON.parse(placementOriginal);
  const imageProbe = join(dirname(placementFile), 'p11-watcher-image.png');
  await writeFile(
    imageProbe,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aemkAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  placement.images = [
    ...(placement.images || []),
    { path: 'p11-watcher-image.png', x: 0, y: 0, width: 1, height: 1 },
  ];
  await writeFile(placementFile, JSON.stringify(placement));
  await converge(
    'placement-image-added',
    (data) => session(data).data?.placementImages?.some((s) => s.path === 'p11-watcher-image.png'),
    true,
  );
  for (const [index, image] of (placement.images || []).entries()) {
    const imageFile = join(dirname(placementFile), image.path),
      imageOriginal = await readFile(imageFile);
    await rm(imageFile);
    await converge(
      `placement-image-${index}-missing`,
      (data) => session(data).status !== 'valid',
      false,
    );
    await writeFile(imageFile, imageOriginal);
    await converge(`placement-image-${index}-recovered`, valid, true);
  }
  await writeFile(placementFile, placementOriginal);
  await rm(imageProbe);
  await converge('placement-image-removed', valid, true);
  const removed = structuredClone(manifest);
  removed.sessions = removed.sessions.filter((s) => s.id !== first.id);
  delete removed.style;
  for (const comparison of removed.comparisonSets)
    comparison.entries = comparison.entries.filter((s) => s.sessionId !== first.id);
  await writeFile(projectFile, JSON.stringify(removed));
  await converge(
    'registration-removed',
    (data) => valid(data) && !data.sessions.some((s) => s.id === first.id),
    true,
  );
  await writeFile(projectFile, manifestOriginal);
  await converge('registration-readded', valid, true);
  assert.deepEqual(record.pageErrors, []);
  // Diagnostics from deliberately broken resources remain recorded; unrelated browser errors fail.
  assert.deepEqual(record.failedResponses, []);
  assert.deepEqual(record.failedRequests, []);
  assert.deepEqual(record.consoleErrors, []);
  for (const id of [
    'candidate-add-edit-remove-readd',
    'brief-edit',
    'placement-image-edit',
    'round-style-edit',
    'project-registration',
    'invalid-valid-siblings',
  ])
    assertions.push({ id, passed: true });
  const result = {
    schemaVersion: 1,
    gateId: 'watcher',
    integratedSha: process.env.INTEGRATED_SHA || null,
    command: process.argv,
    exitCode: 0,
    assertions,
    limits: [],
    transitions,
    originalProject: root,
    disposableProject: copy,
    installedModule: consumer.module,
    hostPid: child.pid,
    browserVersion: browser.version(),
    userApproval: false,
  };
  await saveJSON(out, 'watcher-result.json', result);
  console.log(JSON.stringify(result));
} finally {
  await saveJSON(out, 'watcher-diagnostics.json', record || { startupFailed: true });
  await writeFile(join(out, 'dev-host.log'), logs);
  await browser?.close();
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
    await new Promise((accept) => child.once('close', accept));
    clearTimeout(timeout);
  }
}
