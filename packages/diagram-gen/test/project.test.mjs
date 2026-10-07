import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPageSource } from '../src/render.mjs';
import { loadSession } from '../src/model.mjs';
import { adoptGeneratedRoutes } from '../src/runner.mjs';
import { mkdtemp, readFile, writeFile, mkdir, rm, symlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { test, onTestFinished } from 'vitest';
import { createProject } from '../src/scaffold.mjs';
import {
  loadProject,
  loadContent,
  validateProject,
  ProjectValidationError,
} from '../src/project.mjs';
import {
  prepareProject,
  contentSignature,
  createRunnerState,
  watchContent,
} from '../src/runner.mjs';
const exec = promisify(execFile);
const json = async (path, value) => writeFile(path, JSON.stringify(value));
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><title>Example</title><desc>Original invented fixture.</desc><rect width="100" height="100" fill="#334455"/></svg>';
async function fixture(count = 2) {
  const directory = await mkdtemp(join(tmpdir(), 'diagram-project-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await createProject({
    destination: directory,
    project: true,
    sessions: Array.from({ length: count }, (_, index) => ({ slug: `s${index}`, id: `s${index}` })),
  });
  for (let index = 0; index < count; index++) await addCandidate(directory, `s${index}`);
  return directory;
}
async function addCandidate(root, id) {
  const directory = join(root, 'sessions', id, 'rounds/r01/c01');
  await mkdir(directory, { recursive: true });
  await json(join(directory, 'candidate.json'), {
    schemaVersion: 1,
    id: 'same-id',
    title: 'Example',
    toneId: 'fine-outline',
    order: 1,
    assets: { light: 'diagram.svg' },
  });
  await writeFile(join(directory, 'diagram.svg'), svg);
}
async function patch(root, change) {
  const path = join(root, 'project.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  change(manifest);
  await json(path, manifest);
}
test('five sessions share one host, duplicate candidate IDs remain session-qualified and API/CLI agree', async () => {
  const root = await fixture(5);
  const data = await loadContent(root);
  assert.equal(data.ok, true);
  assert.equal(data.sessions.length, 5);
  assert.equal(
    data.sessions.every((entry) => entry.data.candidates[0].id === 'same-id'),
    true,
  );
  await prepareProject(root, 3);
  for (const entry of data.sessions)
    assert.match(
      await readFile(join(root, `pages/sessions/${entry.id}/index.tsx`), 'utf8'),
      /rawHtml/,
    );
  const result = await exec(process.execPath, [
    new URL('../src/cli.mjs', import.meta.url).pathname,
    'check',
    root,
    '--json',
  ]);
  assert.equal(JSON.parse(result.stdout).summary.sessions, 5);
});
test('manifest rejects duplicates, versions, escapes and symlinks before session traversal', async () => {
  for (const change of [
    (p) => {
      p.sessions[1].id = p.sessions[0].id;
    },
    (p) => {
      p.sessions[1].order = p.sessions[0].order;
    },
    (p) => {
      p.schemaVersion = 9;
    },
    (p) => {
      p.sessions[0].path = '../secret';
    },
    (p) => {
      p.sessions[0].placement = '../secret';
    },
  ]) {
    const root = await fixture();
    await patch(root, change);
    await assert.rejects(loadProject(root), ProjectValidationError);
  }
  const root = await fixture();
  await rm(join(root, 'sessions/s0'), { recursive: true });
  await symlink(join(root, 'sessions/s1'), join(root, 'sessions/s0'));
  await assert.rejects(loadProject(root), /symbolic links/);
});
test('missing and invalid sessions retain valid siblings and explicitly stale prior data', async () => {
  const root = await fixture(),
    lastValid = new Map();
  await loadProject(root, { lastValid });
  await writeFile(join(root, 'sessions/s0/session.json'), '{');
  const data = await loadProject(root, { lastValid });
  assert.equal(data.ok, false);
  assert.equal(data.sessions[0].status, 'stale');
  assert.equal(data.sessions[1].status, 'valid');
  assert.ok(data.sessions[0].observedHash);
  assert.equal((await loadProject(root)).sessions[0].data, null);
  await assert.rejects(loadProject(root, { strict: true }), ProjectValidationError);
  await rm(join(root, 'sessions/s0'), { recursive: true });
  assert.equal((await loadProject(root)).sessions[0].status, 'missing');
});
test('comparison sets select exact candidates, validate coverage, tone, fingerprints and absent themes', async () => {
  const root = await fixture();
  const data = await loadProject(root);
  await patch(root, (p) => {
    p.comparisonSets = [
      {
        id: 'set',
        title: 'Set',
        toneId: 'fine-outline',
        entries: data.sessions.map((entry) => ({
          sessionId: entry.id,
          candidateId: 'same-id',
          fingerprint: entry.data.candidates[0].fingerprint,
        })),
      },
    ];
  });
  assert.equal((await loadProject(root)).ok, true);
  assert.deepEqual((await loadProject(root)).comparisonSets[0].entries[0].availableThemes, [
    'light',
  ]);
  for (const change of [
    (p) => p.comparisonSets[0].entries.pop(),
    (p) => {
      p.comparisonSets[0].entries[0].fingerprint = 'bad';
    },
    (p) => {
      p.comparisonSets[0].toneId = 'other';
    },
    (p) => p.comparisonSets[0].entries.push(p.comparisonSets[0].entries[0]),
    (p) => {
      p.comparisonSets[0].entries[0].candidateId = 'missing';
    },
  ]) {
    const before = await readFile(join(root, 'project.json'), 'utf8');
    await patch(root, change);
    assert.equal((await validateProject(root)).ok, false);
    await writeFile(join(root, 'project.json'), before);
  }
});
test('invalid session lineage and mismatched session ID do not become current', async () => {
  const root = await fixture();
  const file = join(root, 'sessions/s0/rounds/r01/c01/candidate.json');
  const candidate = JSON.parse(await readFile(file, 'utf8'));
  candidate.parentCandidateId = 'unknown';
  await json(file, candidate);
  assert.equal((await loadProject(root)).sessions[0].status, 'invalid');
  const sessionFile = join(root, 'sessions/s1/session.json');
  const session = JSON.parse(await readFile(sessionFile, 'utf8'));
  session.id = 'different';
  await json(sessionFile, session);
  assert.equal((await loadProject(root)).sessions[1].status, 'invalid');
});
test('hash ownership protects user pages and modified generated routes; safely prunes only unchanged owned routes', async () => {
  const root = await fixture();
  await mkdir(join(root, 'pages'));
  await writeFile(join(root, 'pages/index.tsx'), '// Generated by zudo-diagram-gen. hand-written');
  await assert.rejects(prepareProject(root), /user-owned or modified/);
  await rm(join(root, 'pages/index.tsx'));
  await prepareProject(root);
  const modified = join(root, 'pages/sessions/s0/index.tsx');
  await writeFile(modified, (await readFile(modified, 'utf8')) + '// user edit');
  await patch(root, (p) => {
    p.title = 'Changed';
  });
  await assert.rejects(prepareProject(root), /user-owned or modified/);
  await patch(root, (p) => {
    p.sessions = [];
  });
  await prepareProject(root);
  assert.match(await readFile(modified, 'utf8'), /user edit/);
  await assert.rejects(stat(join(root, 'pages/sessions/s1/index.tsx')), /ENOENT/);
});
test('registered-only signature ignores unrelated sessions and generated output and tracks placement/styles', async () => {
  const root = await fixture();
  const before = await contentSignature(root);
  await mkdir(join(root, 'sessions/unregistered'), { recursive: true });
  await writeFile(join(root, 'sessions/unregistered/file.json'), '{}');
  await prepareProject(root);
  assert.equal(await contentSignature(root), before);
  await writeFile(join(root, 'sessions/s0/brief.md'), 'Changed');
  assert.notEqual(await contentSignature(root), before);
});
test('real polling recovers partial metadata, invalid→valid edits, remove and re-add without regeneration loops', async () => {
  const root = await fixture(),
    state = createRunnerState();
  await prepareProject(root, 3, { state });
  const original = await readFile(join(root, 'project.json'), 'utf8');
  const session = await readFile(join(root, 'sessions/s0/session.json'), 'utf8');
  let updates = 0;
  const errors = [];
  const stop = await watchContent(
    root,
    async () => {
      await prepareProject(root, 3, { state });
      updates++;
    },
    { intervalMs: 15, onError: (error) => errors.push(error) },
  );
  onTestFinished(stop);
  const until = async (predicate) => {
    for (let i = 0; i < 100; i++) {
      if (await predicate()) return;
      await new Promise((accept) => setTimeout(accept, 15));
    }
    throw new Error('Watcher did not converge');
  };
  await writeFile(join(root, 'project.json'), '{');
  await until(() => state.project?.ok === false);
  assert.match(await readFile(join(root, 'pages/sessions/s0/index.tsx'), 'utf8'), /STALE/);
  await writeFile(join(root, 'project.json'), original);
  await until(() => state.project?.ok);
  await writeFile(join(root, 'sessions/s0/session.json'), '{');
  await until(() => state.project.sessions[0].status === 'stale');
  await writeFile(join(root, 'sessions/s0/session.json'), session);
  await until(() => state.project.sessions[0].status === 'valid');
  await patch(root, (p) => {
    p.sessions.pop();
  });
  await until(() => state.project.sessions.length === 1);
  await writeFile(join(root, 'project.json'), original);
  await until(() => state.project.sessions.length === 2);
  const settled = updates;
  await new Promise((accept) => setTimeout(accept, 70));
  assert.equal(updates, settled);
  assert.deepEqual(errors, []);
  await stop();
});
test('scaffold keeps caller destinations safe, preserves repeated creation and refuses ancestor symlinks', async () => {
  const root = await fixture();
  const original = await readFile(join(root, 'project.json'), 'utf8');
  await assert.rejects(createProject({ destination: root, project: true }), /not empty/);
  assert.equal(await readFile(join(root, 'project.json'), 'utf8'), original);
  const outside = await mkdtemp(join(tmpdir(), 'diagram-link-'));
  onTestFinished(() => rm(outside, { recursive: true, force: true }));
  const link = join(outside, 'link');
  await symlink(root, link);
  await assert.rejects(createProject({ destination: join(link, 'new') }), /symbolic link/);
  assert.equal((await loadProject(root)).ok, true);
});

test('malformed manifest values, invalid UTF8 and oversized metadata fail as diagnostics', async () => {
  const root = await fixture();
  for (const value of [null, [], 123, { schemaVersion: 1, sessions: [null] }]) {
    await json(join(root, 'project.json'), value);
    await assert.rejects(loadProject(root), ProjectValidationError);
  }
  await writeFile(join(root, 'project.json'), Buffer.from([0xff, 0xfe]));
  assert.equal((await validateProject(root)).ok, false);
  await writeFile(join(root, 'project.json'), ' '.repeat(1024 * 1024 + 1));
  await assert.rejects(loadProject(root), /1 MiB/);
});
test('style reference corrupt hashes and unsupported versions are explicit and watched', async () => {
  const root = await fixture();
  await mkdir(join(root, 'styles/r1'), { recursive: true });
  await json(join(root, 'styles/r1/style.json'), { schemaVersion: 99, revision: 'r1' });
  await patch(root, (p) => {
    p.style = { revision: 'r1', path: 'styles/r1/style.json', hash: 'a'.repeat(64) };
  });
  let data = await loadProject(root);
  assert.equal(data.ok, false);
  assert.match(data.diagnostics[0].message, /version/);
  const before = await contentSignature(root);
  await json(join(root, 'styles/r1/style.json'), {
    schemaVersion: 1,
    revision: 'r1',
    schemeHash: 'bad',
    kitHash: 'bad',
    paletteHash: 'bad',
  });
  await json(join(root, 'styles/r1/scheme.json'), { schemaVersion: 1 });
  await json(join(root, 'styles/r1/palette.json'), { schemaVersion: 1 });
  await writeFile(join(root, 'styles/r1/kit.svg'), svg);
  data = await loadProject(root);
  assert.equal(data.ok, false);
  assert.match(data.diagnostics[0].message, /hash mismatch/);
  assert.notEqual(await contentSignature(root), before);
  const current = await contentSignature(root);
  await writeFile(join(root, 'styles/r1/unregistered.md'), 'ignored');
  assert.equal(await contentSignature(root), current);
});
test('placement metadata and explicitly declared image edits participate in registered watching', async () => {
  const root = await fixture();
  await json(join(root, 'sessions/s0/placement.json'), {
    schemaVersion: 1,
    slot: { width: 360, height: 200 },
    images: [{ path: 'context.png' }],
  });
  await writeFile(join(root, 'sessions/s0/context.png'), Buffer.from([1, 2, 3]));
  await patch(root, (p) => {
    p.sessions[0].placement = 'sessions/s0/placement.json';
  });
  const signature = await contentSignature(root);
  await writeFile(join(root, 'sessions/s0/context.png'), Buffer.from([4, 5, 6]));
  assert.notEqual(await contentSignature(root), signature);
});
test('route symlink and ownership-ledger symlink are refused without modifying their targets', async () => {
  const root = await fixture();
  await mkdir(join(root, 'pages'));
  await symlink(join(root, 'brief.md'), join(root, 'pages/index.tsx'));
  await assert.rejects(prepareProject(root), /symbolic links/);
  await rm(join(root, 'pages/index.tsx'));
  await mkdir(join(root, '.generated'));
  await symlink(join(root, 'project.json'), join(root, '.generated/diagram-routes.json'));
  await assert.rejects(prepareProject(root), /symbolic links/);
  assert.equal((await loadProject(root)).ok, true);
});

test('legacy pre-ledger hosts migrate using explicit reviewed hashes while default preparation preserves changed routes', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'diagram-legacy-'));
  onTestFinished(() => rm(parent, { recursive: true, force: true }));
  const root = join(parent, 'host');
  await createProject({ destination: root });
  await mkdir(join(root, 'pages'));
  const filename = join(root, 'pages/index.tsx');
  const original = await createPageSource(await loadSession(root), {}, 3);
  await writeFile(filename, original);
  await writeFile(join(root, 'brief.md'), 'Changed before first upgraded dev/build');
  await assert.rejects(prepareProject(root, 3), /adoptGeneratedRoutes/);
  assert.equal(await readFile(filename, 'utf8'), original);
  await assert.rejects(
    adoptGeneratedRoutes(root, { expectedHashes: { 'pages/index.tsx': 'a'.repeat(64) } }),
    /Adoption conflict/,
  );
  const expected = createHash('sha256').update(original).digest('hex');
  await adoptGeneratedRoutes(root, { expectedHashes: { 'pages/index.tsx': expected } });
  await prepareProject(root, 3);
  assert.match(await readFile(filename, 'utf8'), /Changed before first/);
  await writeFile(filename, (await readFile(filename, 'utf8')) + '// user edit');
  await assert.rejects(prepareProject(root, 3), /user-owned or modified/);
});
test('removed project metadata retains registered watcher scope and notices recovery', async () => {
  const root = await fixture(),
    watcherState = {};
  const original = await readFile(join(root, 'project.json'), 'utf8');
  const initial = await contentSignature(root, watcherState);
  await rm(join(root, 'project.json'));
  const missing = await contentSignature(root, watcherState);
  assert.notEqual(missing, initial);
  await writeFile(join(root, 'sessions/s0/brief.md'), 'Changed while manifest missing');
  const edited = await contentSignature(root, watcherState);
  assert.notEqual(edited, missing);
  await writeFile(join(root, 'project.json'), original);
  assert.notEqual(await contentSignature(root, watcherState), edited);
});
