import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createHash } from 'node:crypto';
import { canonicalHash } from '../src/tone-context.mjs';
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
  // State is published just before the asynchronous callback increments updates.
  // Allow the final pending callback to finish, then check a second quiet window.
  await new Promise((accept) => setTimeout(accept, 70));
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

const placementDescriptor = () => ({
  schemaVersion: 1,
  frame: { width: 400, height: 260, background: '#FFFFFF' },
  slot: { x: 20, y: 30, width: 360, height: 200 },
  fit: 'contain',
  fonts: ['Noto Sans CJK JP'],
  context: { title: 'Context', body: 'Original invented fixture' },
});
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=',
  'base64',
);
test('project placement uses shared loader, embeds safe refs, keeps fingerprints and avoids private filesystem paths', async () => {
  const root = await fixture();
  const before = await loadProject(root);
  const descriptor = {
    ...placementDescriptor(),
    images: [{ path: 'context.png', x: 0, y: 0, width: 10, height: 10 }],
  };
  await json(join(root, 'sessions/s0/placement.json'), descriptor);
  await writeFile(join(root, 'sessions/s0/context.png'), png);
  await patch(root, (p) => {
    p.sessions[0].placement = 'sessions/s0/placement.json';
  });
  const data = await loadProject(root);
  assert.equal(data.ok, true);
  assert.deepEqual(data.sessions[0].data.placement, descriptor);
  assert.match(data.sessions[0].data.placementImages[0].url, /^data:image\/png;base64,/);
  assert.equal(
    data.sessions[0].data.candidates[0].fingerprint,
    before.sessions[0].data.candidates[0].fingerprint,
  );
  assert.equal(data.sessions[0].data.contentHash, before.sessions[0].data.contentHash);
  assert.equal(JSON.stringify(data).includes(root), false);
  const oldHash = data.sessions[0].data.placementHash;
  await writeFile(
    join(root, 'sessions/s0/context.png'),
    Buffer.concat([png, Buffer.from('changed')]),
  );
  assert.notEqual((await loadProject(root)).sessions[0].data.placementHash, oldHash);
  await prepareProject(root, 3);
  assert.match(
    await readFile(join(root, 'pages/sessions/s0/index.tsx'), 'utf8'),
    /placementImages/,
  );
});
test('invalid and missing placement references preserve valid siblings and visibly stale prior placement', async () => {
  const root = await fixture(),
    state = createRunnerState();
  await json(join(root, 'sessions/s0/placement.json'), placementDescriptor());
  await patch(root, (p) => {
    p.sessions[0].placement = 'sessions/s0/placement.json';
  });
  await prepareProject(root, 3, { state });
  const descriptor = placementDescriptor();
  descriptor.slot.width = 361;
  await json(join(root, 'sessions/s0/placement.json'), descriptor);
  let data = await prepareProject(root, 3, { state });
  assert.equal(data.sessions[0].status, 'stale');
  assert.equal(data.sessions[1].status, 'valid');
  assert.equal(data.sessions[0].data.placement.slot.width, 360);
  assert.match(await readFile(join(root, 'pages/sessions/s0/index.tsx'), 'utf8'), /STALE/);
  await assert.rejects(prepareProject(root, 3, { strict: true }), /slot conflicts/);
  await rm(join(root, 'sessions/s0/placement.json'));
  assert.equal((await loadProject(root)).sessions[0].status, 'invalid');
  await json(join(root, 'sessions/s0/placement.json'), placementDescriptor());
  data = await prepareProject(root, 3, { state });
  assert.equal(data.ok, true);
  assert.equal(data.sessions[0].status, 'valid');
});
test('declared placement image symlink escapes and malformed raster bytes fail explicitly', async () => {
  const root = await fixture();
  const descriptor = {
    ...placementDescriptor(),
    images: [{ path: 'escape.png', x: 0, y: 0, width: 10, height: 10 }],
  };
  await json(join(root, 'sessions/s0/placement.json'), descriptor);
  await symlink('/etc/passwd', join(root, 'sessions/s0/escape.png'));
  await patch(root, (p) => {
    p.sessions[0].placement = 'sessions/s0/placement.json';
  });
  let data = await loadProject(root);
  assert.equal(data.ok, false);
  assert.equal(data.sessions[0].diagnostics[0].code, 'RESOURCE_UNSAFE');
  await rm(join(root, 'sessions/s0/escape.png'));
  await writeFile(join(root, 'sessions/s0/escape.png'), 'not an image');
  data = await loadProject(root);
  assert.equal(data.ok, false);
  assert.equal(data.sessions[1].status, 'valid');
});
test('project scaffold avoids advertising deferred project HTML and preserves single-session HTML workflow', async () => {
  const root = await fixture();
  assert.equal(
    JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).scripts['export:html'],
    undefined,
  );
  assert.equal(
    (await readFile(join(root, 'README.md'), 'utf8')).includes('- pnpm export:html creates'),
    false,
  );
});

test('initializer project CLI gives correct registered session path and stable project identity', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'diagram-initializer-project-'));
  onTestFinished(() => rm(parent, { recursive: true, force: true }));
  const root = join(parent, 'host');
  const result = await exec(process.execPath, [
    new URL('../../create-zudo-diagram-gen/bin/create-zudo-diagram-gen.mjs', import.meta.url)
      .pathname,
    root,
    '--project',
  ]);
  assert.match(result.stdout, /sessions\/diagram\/rounds\/r01/);
  const project = await loadProject(root);
  assert.equal(project.ok, true);
  assert.equal(project.sessions.length, 1);
  assert.equal(project.sessions[0].id, project.sessions[0].data.session.id);
  await assert.rejects(stat(join(root, 'session.json')), /ENOENT/);
});
test('style canonical constituent hashes are verified without claiming unavailable lock semantics', async () => {
  const root = await fixture();
  await mkdir(join(root, 'styles/r1'), { recursive: true });
  const scheme = { schemaVersion: 1, toneId: 'fine-outline', title: 'Style fixture' };
  const palette = { schemaVersion: 1, light: { ink: '#334455' } };
  const style = {
    schemaVersion: 1,
    revision: 'r1',
    toneId: 'fine-outline',
    schemeHash: canonicalHash(scheme),
    kitHash: createHash('sha256').update(svg).digest('hex'),
    paletteHash: canonicalHash(palette),
  };
  await json(join(root, 'styles/r1/style.json'), style);
  await json(join(root, 'styles/r1/scheme.json'), scheme);
  await json(join(root, 'styles/r1/palette.json'), palette);
  await writeFile(join(root, 'styles/r1/kit.svg'), svg);
  await patch(root, (p) => {
    p.style = { revision: 'r1', path: 'styles/r1/style.json', hash: canonicalHash(style) };
  });
  let data = await loadProject(root);
  assert.equal(data.ok, false);
  assert.equal(data.diagnostics[0].code, 'INCOMPLETE_PROJECT');
  assert.match(data.diagnostics[0].message, /Style hashes verified/);
  await patch(root, (p) => {
    p.style.hash = 'a'.repeat(64);
  });
  data = await loadProject(root);
  assert.equal(data.diagnostics[0].code, 'VALIDATION_FAILED');
  assert.match(data.diagnostics[0].message, /reference hash mismatch/);
});

test('translated project titles retain route identity through observed registration removal and re-add', async () => {
  const root = await fixture(),
    state = createRunnerState();
  const metadataPath = join(root, 'sessions/s0/session.json');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  metadata.title = '予約の確定と変更';
  await json(metadataPath, metadata);
  await prepareProject(root, 3, { state });
  const original = await readFile(join(root, 'project.json'), 'utf8');
  const window = new Window({ url: 'http://diagram.test/' });
  onTestFinished(() => window.happyDOM.close());
  const renderedDocument = async () => {
    const source = await readFile(join(root, 'pages/index.tsx'), 'utf8');
    const body = JSON.parse(source.match(/const body = (.*);\n/)[1]);
    window.document.body.innerHTML = body;
    return window.document;
  };
  const selector = 'main a[href="/sessions/s0/"]';
  let document = await renderedDocument();
  assert.equal(document.querySelectorAll(selector).length, 1);
  assert.equal(document.querySelector(selector).textContent, metadata.title);
  assert.equal(document.querySelector(selector).textContent.includes('s0'), false);
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
    for (let index = 0; index < 100; index++) {
      if (await predicate()) return;
      await new Promise((accept) => setTimeout(accept, 15));
    }
    throw new Error('Rendered registration did not converge.');
  };
  await patch(root, (project) => {
    project.sessions.shift();
  });
  await until(
    async () =>
      state.project.sessions.length === 1 &&
      updates >= 1 &&
      (await renderedDocument()).querySelectorAll(selector).length === 0,
  );
  assert.equal(state.project.sessions.length, 1);
  await assert.rejects(stat(join(root, 'pages/sessions/s0/index.tsx')), /ENOENT/);
  await writeFile(join(root, 'project.json'), original);
  await until(
    async () =>
      state.project.sessions.length === 2 &&
      updates >= 2 &&
      (await renderedDocument()).querySelectorAll(selector).length === 1,
  );
  assert.equal(state.project.sessions.length, 2);
  await stat(join(root, 'pages/sessions/s0/index.tsx'));
  assert.equal(updates, 2);
  assert.deepEqual(errors, []);
  await stop();
});
