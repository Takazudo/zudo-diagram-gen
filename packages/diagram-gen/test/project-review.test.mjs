import { test, onTestFinished } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, symlink, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createReviewProject } from '../../../scripts/create-review-project.mjs';
import { loadProject } from '../src/project.mjs';
import { renderGallery, createPageSource } from '../src/render.mjs';
import { exportHtml } from '../src/html-export.mjs';
import { preparePortableProject } from '../src/portable-project.mjs';
import { mountProjectApp, comparisonSlot } from '../client/project.mjs';
import { validateProjectReview } from '../client/review.mjs';
const exec = promisify(execFile);
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'diagram-project-review-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  await createReviewProject(root);
  return { root, data: await loadProject(root) };
}
function mount(data, options) {
  const window = new Window({ url: 'https://diagram.test/project/' });
  window.document.body.innerHTML = '<button id="outside">Outside</button><div id="app"></div>';
  const root = window.document.getElementById('app');
  let clipboard;
  Object.defineProperty(window.navigator, 'clipboard', {
    value: {
      writeText: async (value) => {
        clipboard = value;
      },
    },
    configurable: true,
  });
  let dispose = mountProjectApp(root, data, options);
  const query = (selector) => {
    const element = root.querySelector(selector);
    assert.ok(element, selector);
    return element;
  };
  const change = (control, value) => {
    const element = query(`[data-project-control="${control}"]`);
    element.value = value;
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const click = (selector) => query(selector).click();
  const readReview = async () => {
    click('[data-project-back]');
    click('[data-project-action="copy"]');
    await new Promise(setImmediate);
    return JSON.parse(clipboard);
  };
  onTestFinished(async () => {
    dispose();
    await window.happyDOM.close();
  });
  return {
    window,
    root,
    query,
    change,
    click,
    readReview,
    remount: () => {
      dispose();
      dispose = mountProjectApp(root, data, options);
    },
  };
}

test('five sessions and eight sets use exact identities and shared placement geometry; no implicit comparison', async () => {
  const { data } = await fixture();
  const ui = mount(data);
  assert.equal(ui.root.querySelectorAll('[data-project-slot]').length, 5);
  assert.equal(ui.root.querySelectorAll('[data-placement-diagram]').length, 0);
  for (const [index, set] of data.comparisonSets.entries()) {
    ui.change('set', set.id);
    for (const session of data.sessions) {
      const card = ui.query(`[data-project-slot="${session.id}"]`);
      assert.equal(card.dataset.status, 'valid');
      assert.equal(
        card.querySelector('[data-project-identity]').textContent,
        `${session.id}/c${index + 1}`,
      );
      const frame = card.querySelector('[data-placement-frame]');
      assert.equal(frame.style.width, `${session.data.placement.frame.width}px`);
      const img = card.querySelector('[data-placement-diagram]');
      assert.equal(img.style.width, `${session.data.session.target.width}px`);
      assert.equal(img.style.left, `${session.data.placement.slot.x}px`);
    }
  }
  ui.change('theme', 'dark');
  assert.equal(ui.query('[data-project-slot="return-items"]').dataset.status, 'unavailable');
  assert.equal(
    ui.query('[data-project-slot="return-items"]').querySelector('[data-placement-diagram]'),
    null,
  );
});

test('missing, unknown, stale, duplicate and tone-inconsistent mappings stay explicit without substitution', async () => {
  const { data } = await fixture(),
    session = data.sessions[0],
    set = data.comparisonSets[0];
  assert.equal(comparisonSlot(data, { ...set, entries: [] }, session).status, 'missing');
  for (const patch of [{ candidateId: 'unknown' }, { fingerprint: '0'.repeat(64) }]) {
    const modified = { ...set, entries: [{ ...set.entries[0], ...patch }] };
    const slot = comparisonSlot(data, modified, session);
    assert.ok(['missing', 'stale'].includes(slot.status));
    assert.equal(slot.candidate, undefined);
  }
  assert.equal(
    comparisonSlot(data, { ...set, entries: [set.entries[0], set.entries[0]] }, session).status,
    'invalid',
  );
  assert.equal(comparisonSlot(data, { ...set, toneId: 'different' }, session).status, 'invalid');
  assert.equal(comparisonSlot(data, set, { ...session, status: 'stale' }).status, 'stale');
  const input = structuredClone(data);
  input.sessions[0].data = null;
  input.sessions[0].status = 'invalid';
  const ui = mount(input);
  ui.change('set', set.id);
  assert.equal(ui.query(`[data-project-slot="${session.id}"]`).dataset.status, 'invalid');
  assert.equal(ui.root.querySelectorAll('[data-status="valid"]').length, 4);
});

test('navigation preserves text, shortlist and chosen direction with duplicate candidate IDs isolated; remount disposes listeners', async () => {
  const { data } = await fixture(),
    ui = mount(data);
  ui.change('set', 'set-1');
  ui.click('[data-project-open="reservation-flow"]');
  const note = ui.query('[data-project-workbench="reservation-flow"] [data-note="keep"]');
  note.value = 'Keep this exact saved drawing';
  note.dispatchEvent(new ui.window.Event('input', { bubbles: true }));
  ui.click(
    '[data-project-workbench="reservation-flow"] [data-action="shortlist-toggle"][data-id="c1"]',
  );
  ui.click('[data-project-workbench="reservation-flow"] [data-action="direction"][data-id="c1"]');
  const before = await ui.readReview();
  ui.change('set', 'set-2');
  ui.change('theme', 'dark');
  ui.change('backdrop', 'checker');
  ui.change('uiTheme', 'dark');
  ui.click('[data-project-open="empty-seats"]');
  assert.equal(ui.query('[data-project-workbench="empty-seats"] [data-note="keep"]').value, '');
  const after = await ui.readReview();
  const first = (review) => review.sessions.find((s) => s.sessionId === 'reservation-flow');
  assert.deepEqual(first(before).records, first(after).records);
  assert.deepEqual(first(before).chosenDirection, first(after).chosenDirection);
  assert.equal(first(after).shortlist[0].id, 'c1');
  assert.equal(data.project.style, undefined);
  ui.change('set', 'set-1');
  ui.click('[data-project-open="reservation-flow"]');
  assert.equal(
    ui.query('[data-project-workbench="reservation-flow"] [data-note="keep"]').value,
    'Keep this exact saved drawing',
  );
  const textarea = ui.query('[data-project-workbench="reservation-flow"] [data-note="keep"]');
  textarea.focus();
  const key = new ui.window.KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true });
  textarea.dispatchEvent(key);
  assert.equal(key.defaultPrevented, false);
  ui.window.dispatchEvent(new ui.window.Event('pagehide'));
  const saved = JSON.parse(
    ui.window.localStorage.getItem('zudo-diagram-gen:v1:session:reservation-flow'),
  );
  ui.remount();
  assert.ok(saved.state.direction);
  assert.equal(ui.root.querySelectorAll('[data-project-workbench]').length, 5);
  ui.change('set', 'set-1');
  ui.click('[data-project-open="reservation-flow"]');
  assert.equal(
    ui.query('[data-project-workbench="reservation-flow"] [data-note="keep"]').value,
    'Keep this exact saved drawing',
  );
});

test('project imports validate all sessions atomically and preserve stale legacy fingerprints', async () => {
  const { data } = await fixture();
  const record = {
    schemaVersion: 1,
    type: 'zudo-diagram-project-review',
    projectId: data.project.id,
    sessions: [
      {
        schemaVersion: 1,
        type: 'zudo-diagram-review',
        sessionId: data.sessions[0].id,
        records: [
          { id: 'c1', fingerprint: 'old', keep: 'Legacy note', change: '', action: 'refine' },
        ],
        shortlist: [{ id: 'c1', fingerprint: 'old' }],
        chosenDirection: { id: 'c1', fingerprint: 'old' },
      },
    ],
  };
  assert.equal(validateProjectReview(record, data), record);
  for (const invalid of [
    { ...record, projectId: 'foreign' },
    { ...record, sessions: [record.sessions[0], record.sessions[0]] },
    { ...record, sessions: [{ ...record.sessions[0], sessionId: 'foreign' }] },
  ])
    assert.throws(() => validateProjectReview(invalid, data));
  const ui = mount(data),
    input = ui.query('[data-project-import]');
  Object.defineProperty(input, 'files', {
    value: [new ui.window.File([JSON.stringify(record)], 'review.json')],
    configurable: true,
  });
  input.dispatchEvent(new ui.window.Event('change', { bubbles: true }));
  await new Promise(setImmediate);
  await new Promise(setImmediate);
  ui.change('set', 'set-1');
  ui.click('[data-project-open="reservation-flow"]');
  assert.equal(ui.query('[data-note="keep"]').value, 'Legacy note');
  assert.match(
    ui.query('[data-project-workbench="reservation-flow"]').textContent,
    /changed|stale/i,
  );
  const review = await ui.readReview();
  assert.equal(review.sessions[0].records[0].fingerprint, 'old');
});

test('portable data is bounded, rejects external resources and escapes hostile text in both host dialects', async () => {
  const { data } = await fixture();
  data.diagnostics.push({
    code: 'INCOMPLETE_PROJECT',
    path: 'sessions/missing',
    message: "ENOENT: open '/private/source/sessions/missing/session.json'",
  });
  data.project.title = '</script><script>window.injected=true</script> data-zfb-island zr:1:';
  data.sessions[0].data.brief = data.project.title;
  const html = await renderGallery(data);
  assert.doesNotMatch(html, /<script>window.injected=true<\/script>/);
  assert.doesNotMatch(html, /\/private\/source/);
  const payload = JSON.parse(
    html.match(/id="diagram-data" type="application\/json">(.*?)<\/script>/s)[1],
  );
  assert.equal(payload.project.title, data.project.title);
  assert.equal(payload.links.sessionRoutes, false);
  assert.throws(() => preparePortableProject(data, { maxBytes: 1024 }), /budget/);
  const bad = structuredClone(data);
  bad.sessions[0].data.candidates[0].assets.light =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><image href="https://evil.test/asset.png"/></svg>';
  assert.throws(() => preparePortableProject(bad), /external/);
  for (const major of [2, 3]) {
    const route = await createPageSource(data, {}, major);
    assert.match(route, /diagram-app/);
    if (major === 3) {
      const body = JSON.parse(route.match(/const body = (.*);\n/)[1]);
      assert.doesNotMatch(body, /data-zfb-island|zr:1:/i);
    }
  }
  const window = new Window({
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
    },
  });
  onTestFinished(() => window.happyDOM.close());
  window.document.body.innerHTML =
    '<div id="diagram-app"></div><script id="diagram-data" type="application/json"></script>';
  window.document.getElementById('diagram-data').textContent = JSON.stringify(payload);
  window.eval(await readFile(new URL('../client/app.js', import.meta.url), 'utf8'));
  assert.equal(window.document.querySelectorAll('[data-project-slot]').length, 5);
  assert.equal(window.injected, undefined);
});

test('HTML export refuses source, symlink/hardlink aliases and existing files; CLI remains compatible and emits versioned JSON', async () => {
  const { root } = await fixture(),
    output = join(root, 'exports/review.html');
  const result = await exportHtml(root, { output });
  assert.equal(result.candidates, 45);
  assert.doesNotMatch(await readFile(output, 'utf8'), new RegExp(root));
  await assert.rejects(exportHtml(root, { output }), /already exists/);
  await exportHtml(root, { output, force: true });
  const metadata = join(root, 'project.json');
  const before = await readFile(metadata, 'utf8');
  await assert.rejects(
    exportHtml(root, {
      output: join(root, 'sessions/reservation-flow/rounds/r01/c1/source.html'),
      force: true,
    }),
    /protected source/,
  );
  const alias = join(root, 'exports/alias.html');
  await symlink(metadata, alias);
  await assert.rejects(exportHtml(root, { output: alias, force: true }), /symlink/);
  const hard = join(root, 'exports/hard.html');
  await link(metadata, hard);
  await assert.rejects(exportHtml(root, { output: hard, force: true }), /hard-link/);
  assert.equal(await readFile(metadata, 'utf8'), before);
  const cli = new URL('../src/cli.mjs', import.meta.url).pathname;
  const legacy = await exec(process.execPath, [
    cli,
    'export-html',
    join(root, 'sessions/reservation-flow'),
    '--out',
    join(root, 'exports/session.html'),
  ]);
  assert.match(legacy.stdout, /Exported 9 candidates/);
  const json = await exec(process.execPath, [
    cli,
    'export-html',
    root,
    '--out',
    join(root, 'exports/machine.html'),
    '--json',
  ]);
  assert.equal(JSON.parse(json.stdout).command, 'export-html');
  assert.equal(json.stderr, '');
  await assert.rejects(
    exec(process.execPath, [cli, 'export-html', root, '--out', output, '--out', output, '--json']),
    (error) => error.code === 2 && JSON.parse(error.stdout).errors[0].code === 'INVALID_ARGUMENT',
  );
  await writeFile(join(root, 'sessions/reservation-flow/session.json'), '{');
  const partial = await exec(process.execPath, [
    cli,
    'export-html',
    root,
    '--out',
    join(root, 'exports/partial.html'),
    '--json',
  ]).catch((error) => error);
  assert.equal(partial.code, 1);
  assert.equal(JSON.parse(partial.stdout).ok, false);
  assert.match(await readFile(join(root, 'exports/partial.html'), 'utf8'), /invalid/);
});

test('storage failure retains edits in memory and rejects a multi-session import before any state is applied', async () => {
  const { data } = await fixture();
  const window = new Window({ url: 'https://diagram.test/' });
  Object.defineProperty(window, 'localStorage', {
    get: () => {
      throw new Error('Storage blocked');
    },
  });
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const dispose = mountProjectApp(root, data);
  onTestFinished(async () => {
    dispose();
    await window.happyDOM.close();
  });
  const choose = () => {
    const select = root.querySelector('[data-project-control="set"]');
    select.value = 'set-1';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  choose();
  root.querySelector('[data-project-open="reservation-flow"]').click();
  const note = root.querySelector('[data-project-workbench="reservation-flow"] [data-note="keep"]');
  note.value = 'Retain without storage';
  note.dispatchEvent(new window.Event('input', { bubbles: true }));
  root.querySelector('[data-project-back]').click();
  const record = {
    schemaVersion: 1,
    type: 'zudo-diagram-project-review',
    projectId: data.project.id,
    sessions: data.sessions.slice(0, 2).map((s, index) => ({
      schemaVersion: 1,
      type: 'zudo-diagram-review',
      sessionId: s.id,
      records: [
        {
          id: 'c1',
          fingerprint: s.data.candidates.find((c) => c.id === 'c1').fingerprint,
          keep: 'Should not import',
          change: '',
          action: index === 0 ? 'refine' : 'invalid-action',
        },
      ],
      shortlist: [],
    })),
  };
  const input = root.querySelector('[data-project-import]');
  Object.defineProperty(input, 'files', {
    value: [new window.File([JSON.stringify(record)], 'review.json')],
  });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(setImmediate);
  await new Promise(setImmediate);
  assert.match(root.querySelector('[data-project-status]').textContent, /Import failed/);
  root.querySelector('[data-project-open="reservation-flow"]').click();
  assert.equal(
    root.querySelector('[data-project-workbench="reservation-flow"] [data-note="keep"]').value,
    'Retain without storage',
  );
  assert.match(
    root.querySelector('[data-project-workbench="reservation-flow"] [data-storage-status]')
      .textContent,
    /unavailable/i,
  );
});
