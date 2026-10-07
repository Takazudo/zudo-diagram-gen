/** Run under the shared heavy/playwright guards. Explicit browser only; no fallback. */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { captureCandidate } from '../packages/diagram-gen/src/capture.mjs';
import { loadSession } from '../packages/diagram-gen/src/model.mjs';
import { renderGallery } from '../packages/diagram-gen/src/render.mjs';
import { loadPlacement, portablePlacement } from '../packages/diagram-gen/src/placement.mjs';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
const exec = promisify(execFile);
const outputRoot = path.resolve(
  process.env.CAPTURE_EVIDENCE_DIR || '/tmp/diagram-capture-evidence',
);
const browserExecutablePath = process.env.CAPTURE_BROWSER_EXECUTABLE;
const root = await mkdtemp(path.join(os.tmpdir(), 'capture-acceptance-'));
const session = path.join(root, 'sessions', 'wide');
const cdir = path.join(session, 'rounds', 'r01', 'wide');
const fixtureSvg = (fill, dark = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 240" aria-label="Japanese placement test"><rect width="800" height="240" rx="20" fill="${fill}"/><text x="32" y="55" fill="${dark ? '#ffedd5' : '#9a3412'}" font-size="28" font-family="Noto Sans CJK JP,sans-serif"><tspan x="32">予約が完了したら、担当者と日時を</tspan><tspan x="32" dy="38">もう一度確認してください</tspan></text><path d="M40 130H740" stroke="${dark ? '#fdba74' : '#c2410c'}" stroke-width="4"/><text x="32" y="200" fill="${dark ? '#ffedd5' : '#9a3412'}" font-size="26" font-family="Noto Sans CJK JP,sans-serif">申込 → 確認 → 完了</text></svg>`;
const json = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
};
let browser, server;
const failures = [];
async function rejects(name, operation, code) {
  await assert.rejects(operation, (error) => {
    assert.equal(error.code, code, `${name}: ${error.message}`);
    return true;
  });
  failures.push(name);
}
try {
  await mkdir(outputRoot, { recursive: true });
  await mkdir(cdir, { recursive: true });
  await json(path.join(session, 'session.json'), {
    schemaVersion: 1,
    id: 'capture-wide',
    title: 'Representative wide Japanese label',
    target: { width: 640, height: 180 },
  });
  await json(path.join(session, 'rounds', 'r01', 'round.json'), {
    schemaVersion: 1,
    id: 'r01',
    title: 'Placement',
    order: 1,
  });
  const candidate = {
    schemaVersion: 1,
    id: 'wide',
    title: 'Long Japanese label',
    toneId: 'swiss-grid',
    order: 1,
    assets: { light: 'light.svg', dark: 'dark.svg' },
  };
  await json(path.join(cdir, 'candidate.json'), candidate);
  await writeFile(path.join(cdir, 'light.svg'), fixtureSvg('#ffedd5'));
  await writeFile(path.join(cdir, 'dark.svg'), fixtureSvg('#1f2937', true));
  const placement = {
    schemaVersion: 1,
    frame: { width: 800, height: 360, background: '#FFFFFF' },
    slot: { x: 40, y: 60, width: 640, height: 180 },
    fit: 'contain',
    fonts: ['Noto Sans CJK JP'],
    context: { title: '操作の確認', body: '図の表示サイズと背景を確認してください。' },
  };
  const opts = { placement, resourceRoot: root, browserExecutablePath, timeoutMs: 10000 };
  const result = await captureCandidate(session, 'wide', {
    ...opts,
    output: path.join(outputRoot, 'wide-frame.png'),
    force: true,
    dpr: 2,
  });
  assert.deepEqual(result.provenance.pixelDimensions, { width: 1600, height: 720 });
  assert.equal(result.provenance.inspected, false);
  assert.equal(result.provenance.environment.fonts[0].ready, true);
  const slot = await captureCandidate(session, 'wide', {
    ...opts,
    output: path.join(outputRoot, 'wide-slot.png'),
    force: true,
    dpr: 1,
    crop: 'slot',
    theme: 'dark',
    placement: { ...placement, frame: { ...placement.frame, background: '#111827' } },
  });
  assert.deepEqual(slot.provenance.pixelDimensions, { width: 640, height: 180 });
  assert.notEqual(slot.provenance.assetHash, result.provenance.assetHash);
  const transparent = await captureCandidate(session, 'wide', {
    ...opts,
    placement: {
      ...placement,
      frame: { ...placement.frame, background: 'transparent' },
      context: undefined,
    },
    output: path.join(outputRoot, 'transparent.png'),
    force: true,
  });
  assert.equal(transparent.provenance.frame.background, 'transparent');
  const half = await captureCandidate(session, 'wide', {
    ...opts,
    output: path.join(outputRoot, 'wide-half.png'),
    force: true,
    dpr: 0.5,
  });
  assert.deepEqual(half.provenance.pixelDimensions, { width: 400, height: 180 });
  await rejects(
    'existing PNG/sidecar',
    () => captureCandidate(session, 'wide', { ...opts, output: result.output }),
    'OUTPUT_CONFLICT',
  );
  await rejects(
    'source output',
    () =>
      captureCandidate(session, 'wide', {
        ...opts,
        output: path.join(cdir, 'source.png'),
        force: true,
      }),
    'RESOURCE_UNSAFE',
  );
  await symlink(cdir, path.join(root, 'exports'));
  await rejects(
    'symlink source alias',
    () =>
      captureCandidate(session, 'wide', {
        ...opts,
        output: path.join(root, 'exports', 'source.png'),
        force: true,
      }),
    'RESOURCE_UNSAFE',
  );
  await rejects(
    'pixel budget',
    () =>
      captureCandidate(session, 'wide', {
        ...opts,
        placement: { ...placement, frame: { ...placement.frame, width: 20000, height: 20000 } },
        output: path.join(outputRoot, 'budget.png'),
      }),
    'RESOURCE_UNSAFE',
  );
  await rejects(
    'target conflict',
    () =>
      captureCandidate(session, 'wide', {
        ...opts,
        placement: { ...placement, slot: { ...placement.slot, width: 360 } },
        output: path.join(outputRoot, 'conflict.png'),
      }),
    'VALIDATION_FAILED',
  );
  await rejects(
    'external reference',
    () =>
      captureCandidate(session, 'wide', {
        ...opts,
        placement: {
          ...placement,
          images: [{ path: 'https://example.com/x.png', x: 0, y: 0, width: 10, height: 10 }],
        },
        output: path.join(outputRoot, 'external.png'),
      }),
    'VALIDATION_FAILED',
  );
  await writeFile(path.join(root, 'broken.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await rejects(
    'image decode',
    () =>
      captureCandidate(session, 'wide', {
        ...opts,
        placement: {
          ...placement,
          images: [{ path: 'broken.png', x: 0, y: 0, width: 10, height: 10 }],
        },
        output: path.join(outputRoot, 'decode.png'),
      }),
    'VALIDATION_FAILED',
  );
  await rejects(
    'font readiness',
    () =>
      captureCandidate(session, 'wide', {
        ...opts,
        placement: { ...placement, fonts: ['Certainly Missing Font 70'] },
        output: path.join(outputRoot, 'font.png'),
      }),
    'VALIDATION_FAILED',
  );
  await rejects(
    'context overflow',
    () =>
      captureCandidate(session, 'wide', {
        ...opts,
        placement: { ...placement, context: { title: 'Overflow', body: 'a'.repeat(10000) } },
        output: path.join(outputRoot, 'overflow.png'),
      }),
    'VALIDATION_FAILED',
  );
  const controller = new AbortController();
  const pending = captureCandidate(session, 'wide', {
    ...opts,
    signal: controller.signal,
    output: path.join(outputRoot, 'cancelled.png'),
  });
  setTimeout(() => controller.abort(), 100);
  await rejects('active cancellation', () => pending, 'CANCELLED');
  candidate.assets = { light: 'light.svg' };
  await json(path.join(cdir, 'candidate.json'), candidate);
  await rejects(
    'missing dark',
    () =>
      captureCandidate(session, 'wide', {
        ...opts,
        theme: 'dark',
        output: path.join(outputRoot, 'missing.png'),
      }),
    'VALIDATION_FAILED',
  );
  candidate.assets.dark = 'dark.svg';
  await json(path.join(cdir, 'candidate.json'), candidate);
  await writeFile(path.join(cdir, 'light.svg'), fixtureSvg('#fff7ed'));
  const changed = await captureCandidate(session, 'wide', {
    ...opts,
    output: path.join(outputRoot, 'changed.png'),
    force: true,
  });
  assert.notEqual(changed.provenance.assetHash, result.provenance.assetHash);
  assert.notEqual(changed.provenance.fingerprint, result.provenance.fingerprint);
  const loaded = await loadPlacement(root, { width: 640, height: 180 }, { placement });
  const portable = portablePlacement(loaded);
  assert(!JSON.stringify(portable).includes(root));
  const data = { ...(await loadSession(session)), ...portable };
  const html = await renderGallery(data);
  server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({
    headless: true,
    ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator('[data-action="inspect"][data-id="wide"]').first().click();
  if ((await page.locator('[data-placement-frame]').count()) === 0)
    await page.locator('[data-action="context-toggle"]').first().click();
  const geometry = await page
    .locator('[data-placement-frame]')
    .first()
    .evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
      slot: (() => {
        const f = el.getBoundingClientRect(),
          r = el.querySelector('[data-placement-diagram]').getBoundingClientRect();
        return { x: r.x - f.x, y: r.y - f.y, width: r.width, height: r.height };
      })(),
    }));
  assert.deepEqual(geometry, { width: 800, height: 360, slot: placement.slot });
  await page.screenshot({ path: path.join(outputRoot, 'viewer.png'), fullPage: true });
  const cli = await exec(process.execPath, [
    'packages/diagram-gen/src/cli.mjs',
    'capture',
    'wide',
    '--session',
    session,
    '--resource-root',
    root,
    '--out',
    path.join(outputRoot, 'cli.png'),
    '--force',
    '--json',
    ...(browserExecutablePath ? ['--browser-executable', browserExecutablePath] : []),
  ]);
  const envelope = JSON.parse(cli.stdout);
  assert.equal(envelope.ok, true);
  assert.equal(envelope.data.provenance.inspected, false);
  for (const file of await readdir(outputRoot)) assert(!file.endsWith('.tmp'));
  const report = {
    ok: true,
    geometry,
    failures,
    provenance: result.provenance,
    systemBrowserSubstitution: Boolean(browserExecutablePath),
    representativeCaptures: [
      'wide-frame.png',
      'wide-slot.png',
      'wide-half.png',
      'transparent.png',
      'viewer.png',
    ],
    inspectionRequired: true,
  };
  await writeFile(path.join(outputRoot, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
