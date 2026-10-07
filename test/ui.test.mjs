import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { loadSession, loadToneCatalog } from '../packages/diagram-gen/src/model.mjs';
import { mountDiagramApp } from '../packages/diagram-gen/client/mount.mjs';

// DOM contract tests execute only this repository's own viewer source. They do
// not assert real-browser layout, SVG paint, gesture behavior or OS clipboard access.
const css = await readFile(
  new URL('../packages/diagram-gen/client/app.css', import.meta.url),
  'utf8',
);
const script = await readFile(
  new URL('../packages/diagram-gen/client/app.js', import.meta.url),
  'utf8',
);
const mountSource = await readFile(
  new URL('../packages/diagram-gen/client/mount.mjs', import.meta.url),
  'utf8',
);
const source = await loadSession(
  fileURLToPath(new URL('../examples/tone-exploration/', import.meta.url)),
);
const tick = () => new Promise((resolve) => setImmediate(resolve));
function mount(input = source, saved = {}) {
  const data = structuredClone(input);
  const window = new Window({
    url: 'https://diagram.test/session/',
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
    },
  });
  const downloads = [];
  let clipboard = '';
  const blobs = new Map();
  window.URL.createObjectURL = (blob) => {
    const id = `blob:fixture-${blobs.size}`;
    blobs.set(id, blob);
    return id;
  };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {
    if (this.download) downloads.push({ name: this.download, blob: blobs.get(this.href) });
  };
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (text) => {
        clipboard = text;
      },
    },
  });
  for (const [key, value] of Object.entries(saved)) window.localStorage.setItem(key, value);
  window.document.body.innerHTML =
    '<div id="diagram-app"></div><script id="diagram-data" type="application/json"></script>';
  window.document.getElementById('diagram-data').textContent = JSON.stringify(data);
  window.eval(script);
  const query = (selector) => {
    const item = window.document.querySelector(selector);
    assert.ok(item, `Missing ${selector}`);
    return item;
  };
  const click = (selector) => query(selector).click();
  const value = (selector, text, event = 'input') => {
    const input = query(selector);
    input.value = text;
    input.dispatchEvent(new window.Event(event, { bubbles: true }));
  };
  const save = () => {
    window.dispatchEvent(new window.Event('pagehide'));
    return Object.fromEntries(
      Array.from({ length: window.localStorage.length }, (_, i) => {
        const key = window.localStorage.key(i);
        return [key, window.localStorage.getItem(key)];
      }),
    );
  };
  const importRecord = async (record) => {
    const input = query('[data-import-review]');
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [
        new window.File([JSON.stringify(record)], 'review.json', { type: 'application/json' }),
      ],
    });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
    await tick();
  };
  return {
    window,
    data,
    query,
    click,
    value,
    save,
    downloads,
    importRecord,
    clipboard: () => clipboard,
    close: () => window.happyDOM.close(),
  };
}

test('first round lists ten stable candidates and filters do not renumber them', async () => {
  const ui = mount();
  try {
    assert.equal(ui.window.document.querySelectorAll('.dg-card').length, 10);
    ui.value('[data-field="search"]', 'r01-c07');
    assert.equal(ui.window.document.querySelectorAll('.dg-card').length, 1);
    assert.equal(ui.query('.dg-candidate-id').textContent, 'r01-c07');
    ui.click('[data-action="clear-filters"]');
    assert.equal(ui.window.document.querySelectorAll('.dg-card').length, 10);
    ui.click('[data-action="round"][data-id="r02"]');
    assert.equal(ui.window.document.querySelectorAll('.dg-card').length, 1);
    assert.equal(ui.query('.dg-candidate-id').textContent, 'r02-c01');
  } finally {
    await ui.close();
  }
});

test('feedback survives candidate navigation and copying names the exact revision', async () => {
  const ui = mount();
  try {
    ui.click('[data-action="inspect"][data-id="r01-c01"]');
    ui.value('[data-note="keep"]', 'Keep composition and labels.');
    ui.value('[data-note="change"]', 'Use thinner arrows; keep 日本語 labels.');
    ui.click('[data-action="direction"]');
    ui.click('[data-action="next"]');
    ui.click('[data-action="previous"]');
    assert.equal(ui.query('[data-note="change"]').value, 'Use thinner arrows; keep 日本語 labels.');
    ui.click('[data-action="copy-feedback"]');
    await tick();
    assert.match(ui.clipboard(), /r01-c01/);
    assert.match(ui.clipboard(), /Keep composition and labels/);
    assert.match(ui.clipboard(), /日本語/);
    assert.match(ui.clipboard(), new RegExp(source.candidates[0].fingerprint));
    const textarea = ui.query('[data-note="change"]');
    textarea.dispatchEvent(
      new ui.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    assert.equal(ui.query('[data-note="change"]').dataset.candidate, 'r01-c01');
  } finally {
    await ui.close();
  }
});

test('compare maintains two different candidates and shared zoom survives switching', async () => {
  const ui = mount();
  try {
    ui.click('[data-action="compare-toggle"][data-id="r01-c01"]');
    ui.click('[data-action="compare-toggle"][data-id="r01-c02"]');
    ui.click('[data-action="view"][data-view="compare"]');
    assert.equal(ui.window.document.querySelectorAll('.dg-compare-cell').length, 2);
    ui.value('[data-field="compare-candidate"][data-index="0"]', 'r01-c02', 'change');
    assert.notEqual(ui.query('[data-index="0"]').value, ui.query('[data-index="1"]').value);
    ui.value('[data-field="zoom"]', '150');
    for (const stage of ui.window.document.querySelectorAll('.dg-stage'))
      assert.equal(stage.dataset.scale, '1.5');
    ui.click('[data-action="view"][data-view="inspect"]');
    assert.equal(ui.query('.dg-stage').dataset.scale, '1.5');
    assert.equal(
      ui.query('[data-placement-frame]').style.width,
      `${source.session.target.width}px`,
    );
    assert.equal(
      ui.query('[data-placement-frame]').style.height,
      `${source.session.target.height}px`,
    );
  } finally {
    await ui.close();
  }
});

test('missing dark artwork is explicit and cannot be downloaded as a dark asset', async () => {
  const data = structuredClone(source);
  delete data.candidates[0].assets.dark;
  const ui = mount(data);
  try {
    ui.click('[data-action="inspect"][data-id="r01-c01"]');
    ui.click('[data-action="theme"][data-value="dark"]');
    assert.match(ui.query('.dg-unavailable').textContent, /Dark asset unavailable/);
    assert.equal(ui.query('[data-action="download-svg"]').disabled, true);
    ui.click('[data-action="theme"][data-value="light"]');
    ui.click('[data-action="download-svg"]');
    assert.equal(ui.downloads.at(-1).name, 'r01-c01-light.svg');
    assert.equal(await ui.downloads.at(-1).blob.text(), source.candidates[0].assets.light);
  } finally {
    await ui.close();
  }
});

test('review JSON round trips and foreign-session imports preserve existing feedback', async () => {
  const ui = mount();
  let record;
  try {
    ui.click('[data-action="inspect"][data-id="r01-c03"]');
    ui.value('[data-note="keep"]', 'The three stages');
    ui.value('[data-note="change"]', 'Less decoration');
    ui.click('[data-action="direction"]');
    ui.click('[data-action="shortlist-toggle"][data-id="r01-c03"]');
    ui.click('[data-action="download-review"]');
    record = JSON.parse(await ui.downloads.at(-1).blob.text());
    assert.equal(record.chosenDirection.id, 'r01-c03');
    assert.equal(record.feedback.change, 'Less decoration');
  } finally {
    await ui.close();
  }
  const restored = mount();
  try {
    await restored.importRecord(record);
    assert.equal(restored.query('[data-note="keep"]').value, 'The three stages');
    assert.equal(restored.query('[data-note="change"]').dataset.candidate, 'r01-c03');
    await restored.importRecord({ ...record, sessionId: 'another-session' });
    assert.match(restored.query('.dg-toast').textContent, /Import failed/);
    assert.equal(restored.query('[data-note="change"]').value, 'Less decoration');
  } finally {
    await restored.close();
  }
});

test('import replaces earlier browser selections and notes with the transferred review', async () => {
  const sourceUi = mount();
  let record;
  try {
    sourceUi.click('[data-action="inspect"][data-id="r01-c02"]');
    sourceUi.value('[data-note="keep"]', 'Keep candidate two');
    sourceUi.click('[data-action="shortlist-toggle"][data-id="r01-c02"]');
    sourceUi.click('[data-action="download-review"]');
    record = JSON.parse(await sourceUi.downloads.at(-1).blob.text());
  } finally {
    await sourceUi.close();
  }
  const ui = mount();
  try {
    ui.click('[data-action="inspect"][data-id="r01-c01"]');
    ui.value('[data-note="keep"]', 'Old browser note');
    ui.click('[data-action="shortlist-toggle"][data-id="r01-c01"]');
    ui.click('[data-action="direction"]');
    await ui.importRecord(record);
    assert.equal(ui.query('[data-note="keep"]').value, 'Keep candidate two');
    assert.equal(ui.window.document.querySelector('.dg-direction-summary'), null);
    ui.click('[data-action="download-review"]');
    const restored = JSON.parse(await ui.downloads.at(-1).blob.text());
    assert.deepEqual(
      restored.shortlist.map((item) => item.id),
      ['r01-c02'],
    );
    assert.deepEqual(
      restored.records.map((item) => item.id),
      ['r01-c02'],
    );
    assert.equal(restored.chosenDirection, null);
  } finally {
    await ui.close();
  }
});

test('a changed candidate invalidates the earlier feedback fingerprint', async () => {
  const ui = mount();
  let saved;
  try {
    ui.click('[data-action="inspect"][data-id="r01-c01"]');
    ui.value('[data-note="keep"]', 'Keep this');
    ui.click('[data-action="direction"]');
    saved = ui.save();
  } finally {
    await ui.close();
  }
  const updated = structuredClone(source);
  updated.candidates[0].fingerprint = 'new-revision-fingerprint';
  const next = mount(updated, saved);
  try {
    assert.match(next.query('.dg-stale-notice').textContent, /artwork has changed/);
    next.click('[data-action="copy-feedback"]');
    await tick();
    assert.match(next.clipboard(), /ATTENTION/);
    next.click('[data-action="acknowledge"]');
    assert.equal(next.window.document.querySelector('.dg-stale-notice'), null);
  } finally {
    await next.close();
  }
});

test('catalog exposes all 24 tones with concrete recipes', async () => {
  const data = await loadToneCatalog();
  const ui = mount(data);
  try {
    assert.equal(ui.window.document.querySelectorAll('.dg-card').length, 24);
    ui.click(`[data-action="inspect"][data-id="${data.candidates[0].id}"]`);
    assert.ok(ui.window.document.body.textContent.includes(data.tones[0].recipe[0]));
    assert.ok(
      !ui.window.document.querySelector('.dg-tone-recipe').textContent.includes('{{scheme:'),
    );
    assert.equal(data.tones[0].recipe[0], data.tones[0].context.recipe[0]);
    assert.ok(
      data.tones[0].recipe[0].includes(
        String(data.tones[0].context.scheme.geometry.strokeWidths.outline),
      ),
    );
  } finally {
    await ui.close();
  }
});

test('empty sessions and unavailable clipboard have usable fallbacks', async () => {
  const empty = structuredClone(source);
  empty.candidates = [];
  empty.rounds = empty.rounds.slice(0, 1);
  const ui = mount(empty);
  try {
    assert.equal(ui.window.document.querySelector('.dg-fatal'), null);
    ui.click('[data-action="view"][data-view="inspect"]');
    assert.equal(ui.window.document.querySelector('.dg-fatal'), null);
  } finally {
    await ui.close();
  }
  const full = mount();
  try {
    Object.defineProperty(full.window.navigator, 'clipboard', { configurable: true, value: null });
    full.window.document.execCommand = () => false;
    full.click('[data-action="inspect"][data-id="r01-c01"]');
    full.click('[data-action="copy-feedback"]');
    await tick();
    assert.match(full.downloads.at(-1).name, /-feedback\.txt$/);
    assert.match(await full.downloads.at(-1).blob.text(), /r01-c01/);
  } finally {
    await full.close();
  }
});

function embeddedWindow() {
  const window = new Window({ url: 'https://diagram.test/docs/workbench/' });
  window.document.head.innerHTML = `<style>${css}</style>`;
  window.document.body.innerHTML =
    '<input id="host-search"><div id="island" class="host-class"></div>';
  return window;
}

test('embedded mount uses its container and follows host theme without changing artwork theme', async () => {
  const window = embeddedWindow();
  const root = window.document.getElementById('island');
  window.document.documentElement.setAttribute('data-theme', 'dark');
  const dispose = mountDiagramApp(root, structuredClone(source), { embedded: true });
  try {
    assert.equal(root.dataset.uiTheme, 'dark');
    assert.equal(root.dataset.embedded, 'true');
    assert.equal(window.getComputedStyle(root).minHeight, '0');
    assert.equal(window.getComputedStyle(root.querySelector('.dg-layout')).minHeight, '0');
    assert.equal(root.querySelectorAll('.dg-top-link, [data-action="ui-theme"]').length, 0);
    assert.ok(root.querySelector('[data-action="theme"][data-value="dark"]'));
    assert.equal(root.dataset.diagramTheme, 'light');
    window.document.documentElement.setAttribute('data-theme', 'light');
    await tick();
    assert.equal(root.dataset.uiTheme, 'light');
    window.document.documentElement.removeAttribute('data-theme');
    window.document.documentElement.classList.add('dark');
    await tick();
    assert.equal(root.dataset.uiTheme, 'dark');
  } finally {
    dispose();
    await window.happyDOM.close();
  }
});

test('embedded shortcuts ignore host focus and dispose supports a clean remount', async () => {
  const window = embeddedWindow();
  const root = window.document.getElementById('island');
  const hostSearch = window.document.getElementById('host-search');
  let added = 0;
  let removed = 0;
  const add = window.addEventListener.bind(window);
  const remove = window.removeEventListener.bind(window);
  window.addEventListener = (...args) => {
    added++;
    return add(...args);
  };
  window.removeEventListener = (...args) => {
    removed++;
    return remove(...args);
  };
  try {
    for (let cycle = 0; cycle < 2; cycle++) {
      const dispose = mountDiagramApp(root, structuredClone(source), { embedded: true });
      assert.equal(root.classList.contains('host-class'), true);
      assert.equal(root.querySelectorAll('.dg-card').length, 10);
      hostSearch.focus();
      root.dispatchEvent(new window.KeyboardEvent('keydown', { key: 's', bubbles: true }));
      assert.equal(
        root
          .querySelector('.dg-card [data-action="shortlist-toggle"]')
          .getAttribute('aria-pressed'),
        'false',
      );
      root.querySelector('[data-action="inspect"][data-id="r01-c01"]').click();
      assert.ok(root.querySelector('.dg-inspector'));
      dispose();
      dispose();
      assert.equal(root.innerHTML, '');
      assert.equal(root.classList.contains('host-class'), true);
      assert.equal(root.dataset.diagramReady, undefined);
      window.localStorage.clear();
    }
    assert.equal(added, removed);
  } finally {
    await window.happyDOM.close();
  }
});

test('classic standalone script contains the current mount and shared placement implementation', async () => {
  const placementSource = await readFile(
    new URL('../packages/diagram-gen/client/placement.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(script.includes(placementSource.replaceAll('export function ', 'function ')));
  const reviewSource = await readFile(
    new URL('../packages/diagram-gen/client/review.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(script.includes(reviewSource.replaceAll('export function ', 'function ')));
  assert.ok(script.includes('function mountProjectApp'));
  assert.ok(script.includes('function comparisonSlot'));
  assert.ok(
    script.includes(
      mountSource
        .replace(/^import .*;\n/gm, '')
        .replace(/^export \{.*\} from .*;\n/gm, '')
        .replace('export function mountDiagramApp', 'function mountDiagramApp')
        .trimEnd(),
    ),
  );
});

test('style and placement staleness keep legacy artwork feedback and provenance across storage and review transfer', async () => {
  const data = structuredClone(source);
  data.styleHash = 'a'.repeat(64);
  data.placementHash = 'b'.repeat(64);
  data.candidates[0].provenance = { styleHash: data.styleHash };
  const id = data.candidates[0].id;
  const first = mount(data);
  first.click(`[data-action="inspect"][data-id="${id}"]`);
  first.value('[data-note="keep"]', 'Keep accepted geometry and labels');
  first.click('[data-action="download-review"]');
  const review = JSON.parse(await first.downloads.at(-1).blob.text());
  assert.equal(review.records[0].styleHash, data.styleHash);
  assert.equal(review.records[0].placementHash, data.placementHash);
  const saved = first.save();
  first.window.happyDOM.close();
  data.styleHash = 'c'.repeat(64);
  data.placementHash = 'd'.repeat(64);
  const second = mount(data, saved);
  assert.match(
    second.query('[data-style-status]').textContent,
    /Saved style snapshot: stale.*Review style evidence: stale/,
  );
  assert.match(second.query('[data-placement-status]').textContent, /stale/);
  assert.equal(second.query('[data-note="keep"]').value, 'Keep accepted geometry and labels');
  assert.equal(second.window.document.querySelector('[data-action="acknowledge"]'), null);
  await second.importRecord(review);
  second.click('[data-action="download-review"]');
  const exported = JSON.parse(await second.downloads.at(-1).blob.text());
  assert.equal(exported.reviewedCandidate.compatibility.artwork, 'current');
  assert.equal(exported.reviewedCandidate.compatibility.style, 'stale');
  assert.equal(exported.reviewedCandidate.compatibility.placement, 'stale');
  assert.equal(exported.records[0].fingerprint, data.candidates[0].fingerprint);
  assert.equal(exported.records[0].styleHash, 'a'.repeat(64));
  second.window.happyDOM.close();
});

test('review import rejects malformed supplied provenance hashes while legacy absence remains valid', async () => {
  const { validateSessionReview } = await import('../packages/diagram-gen/client/review.mjs');
  const id = source.candidates[0].id,
    fingerprint = source.candidates[0].fingerprint;
  const legacy = {
    schemaVersion: 1,
    type: 'zudo-diagram-review',
    sessionId: source.session.id,
    records: [{ id, fingerprint, keep: 'Preserve', change: '', action: 'refine' }],
    shortlist: [],
  };
  assert.equal(validateSessionReview(legacy, source), legacy);
  for (const key of ['styleHash', 'placementHash', 'captureHash']) {
    for (const value of ['invalid', '', null, 123]) {
      const bad = structuredClone(legacy);
      bad.records[0][key] = value;
      assert.throws(() => validateSessionReview(bad, source), /invalid/);
    }
    const current = structuredClone(legacy);
    current.records[0][key] = 'a'.repeat(64);
    assert.equal(validateSessionReview(current, source), current);
  }
});

test('saved provenance without an effective project style remains unknown', () => {
  const data = structuredClone(source);
  data.candidates[0].provenance = { styleHash: 'a'.repeat(64) };
  const app = mount(data);
  app.click(`[data-action="inspect"][data-id="${data.candidates[0].id}"]`);
  assert.match(app.query('[data-style-status]').textContent, /Saved style snapshot: unknown/);
  app.window.happyDOM.close();
});
