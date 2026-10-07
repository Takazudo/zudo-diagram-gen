#!/usr/bin/env node
// Manager/CI only: managed sessions require heavy-guard and playwright-guard.
// Usage: <http-preview-url|detached.html> <evidence-directory> [--offline]
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const playwright = await import(process.env.PROJECT_PLAYWRIGHT_MODULE || 'playwright');
const input = process.argv[2],
  evidence = resolve(process.argv[3] || 'test-output/project-review');
if (!input) throw new Error('Supply the packed preview URL or detached HTML.');
const offline = process.argv.includes('--offline');
const url = /^https?:/.test(input) ? input : pathToFileURL(resolve(input)).href;
await mkdir(evidence, { recursive: true });
const browser = await playwright.chromium.launch(
  process.env.PROJECT_BROWSER_EXECUTABLE
    ? { executablePath: process.env.PROJECT_BROWSER_EXECUTABLE }
    : {},
);
const errors = [],
  requests = [],
  failedResponses = [];
try {
  const context = await browser.newContext({
    acceptDownloads: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error')
      errors.push({ message: message.text(), location: message.location() });
  });
  page.on('response', (response) => {
    if (response.status() >= 400)
      failedResponses.push({ url: response.url(), status: response.status() });
  });
  if (offline)
    await context.route(/^https?:/, (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
  await page.goto(url);
  await page.locator('[data-project-slot]').first().waitFor();
  const data = await page.locator('#diagram-data').textContent().then(JSON.parse);
  assert.equal(data.sessions.length, 5);
  assert.equal(data.comparisonSets.length, 8);
  const app = page.locator('#diagram-app');
  const reviewDownloads = async () => {
    const [downloaded] = await Promise.all([
      page.waitForEvent('download'),
      app.locator('[data-project-action="download"]').click(),
    ]);
    const filename = join(evidence, downloaded.suggestedFilename());
    await downloaded.saveAs(filename);
    return JSON.parse(await readFile(filename, 'utf8'));
  };
  for (const set of data.comparisonSets) {
    await app.locator('[data-project-control="set"]').selectOption(set.id);
    for (const mapping of set.entries) {
      const card = app.locator(`[data-project-slot="${mapping.sessionId}"]`);
      assert.equal(await card.getAttribute('data-status'), 'valid');
      assert.equal(
        await card.locator('[data-project-identity]').innerText(),
        `${mapping.sessionId}/${mapping.candidateId}`,
      );
      const placement = data.sessions.find((s) => s.id === mapping.sessionId).data.placement;
      assert.deepEqual(
        await card
          .locator('[data-placement-diagram]')
          .evaluate((image) => [
            image.style.left,
            image.style.top,
            image.style.width,
            image.style.height,
          ]),
        [placement.slot.x, placement.slot.y, placement.slot.width, placement.slot.height].map(
          (n) => `${n}px`,
        ),
      );
      assert.deepEqual(
        await card
          .locator('[data-placement-frame]')
          .evaluate((frame) => [frame.style.width, frame.style.height]),
        [placement.frame.width, placement.frame.height].map((n) => `${n}px`),
      );
    }
  }
  await app.locator('[data-project-control="theme"]').selectOption('dark');
  assert.equal(
    await app.locator('[data-project-slot="return-items"]').getAttribute('data-status'),
    'unavailable',
  );
  assert.equal(
    await app.locator('[data-project-slot="return-items"] [data-placement-diagram]').count(),
    0,
  );
  await app.locator('[data-project-control="set"]').selectOption('set-1');
  await app.locator('[data-project-control="theme"]').selectOption('light');
  const baseline = await reviewDownloads();
  await app.locator('[data-project-open="reservation-flow"]').click();
  const session = app.locator('[data-project-workbench="reservation-flow"]');
  await session.locator('[data-note="keep"]').fill('Keep the exact saved geometry 日本語');
  await session.locator('[data-note="change"]').fill('Clarify this label');
  await session.locator('[data-action="shortlist-toggle"][data-id="c1"]').first().click();
  await session.locator('[data-action="direction"][data-id="c1"]').click();
  // Inputs retain editing keys. App shortcuts operate only inside active context.
  await session.locator('[data-note="keep"]').press('ArrowRight');
  assert.equal(await session.locator('[data-note="keep"]').getAttribute('data-candidate'), 'c1');
  await session.locator('[data-action="next"]').press('ArrowRight');
  assert.equal(await session.locator('[data-note="keep"]').getAttribute('data-candidate'), 'c2');
  await session.locator('[data-action="previous"]').press('ArrowLeft');
  assert.equal(await session.locator('[data-note="keep"]').getAttribute('data-candidate'), 'c1');
  await session.locator('[data-action="zoom-actual"]').click();
  await session.locator('[data-field="zoom"]').evaluate((input) => {
    input.value = '140';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const stage = session.locator('.dg-stage').first();
  const bounds = await stage.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 35, bounds.y + bounds.height / 2 + 20);
  await page.mouse.up();
  await session.locator('[data-action="zoom-fit"]').click();
  await session.locator('[data-action="view"][data-view="grid"]').click();
  await session.locator('[data-field="search"]').fill('alternate');
  assert.equal(await session.locator('.dg-card').count(), 1);
  await session.locator('[data-field="search"]').fill('');
  await session.locator('[data-action="compare-toggle"][data-id="c1"]').click();
  await session.locator('[data-action="compare-toggle"][data-id="fine-outline-alt"]').click();
  await session.locator('[data-action="view"][data-view="compare"]').click();
  assert.equal(await session.locator('.dg-compare-cell').count(), 2);
  await session.locator('[data-action="copy-feedback"]').click();
  const [svg] = await Promise.all([
    page.waitForEvent('download'),
    session.locator('[data-action="download-svg"]').first().click(),
  ]);
  await svg.saveAs(join(evidence, svg.suggestedFilename()));
  // Both the topbar and feedback panel offer review downloads.
  const [single] = await Promise.all([
    page.waitForEvent('download'),
    session.locator('.dg-topbar [data-action="download-review"]').click(),
  ]);
  const singleFile = join(evidence, single.suggestedFilename());
  await single.saveAs(singleFile);
  await session.locator('[data-import-review]').setInputFiles(singleFile);
  await session
    .locator('.dg-toast')
    .filter({ hasText: /import/i })
    .waitFor();
  await app.locator('[data-project-back]').click();
  const before = await reviewDownloads();
  const selected = (record) => record.sessions.find((s) => s.sessionId === 'reservation-flow');
  assert.equal(selected(before).chosenDirection.id, 'c1');
  assert.equal(selected(before).shortlist[0].id, 'c1');
  for (const [width, height] of [
    [1280, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const theme of ['light', 'dark']) {
      await app.locator('[data-project-control="uiTheme"]').selectOption(theme);
      await app.locator('[data-project-control="theme"]').selectOption(theme);
      await app.locator('[data-project-control="backdrop"]').selectOption('checker');
      await app.locator('[data-project-control="set"]').selectOption('set-2');
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        true,
        'No horizontal page overflow',
      );
      await page.screenshot({
        path: join(evidence, `project-${width}-${theme}.png`),
        fullPage: true,
      });
    }
  }
  await app.locator('[data-project-open="empty-seats"]').click();
  assert.equal(
    await app.locator('[data-project-workbench="empty-seats"] [data-note="keep"]').inputValue(),
    '',
  );
  await app.locator('[data-project-back]').click();
  const after = await reviewDownloads();
  assert.deepEqual(selected(after).records, selected(before).records);
  assert.deepEqual(selected(after).chosenDirection, selected(before).chosenDirection);
  assert.deepEqual(selected(after).shortlist, selected(before).shortlist);
  assert.equal(data.project.style, undefined);
  assert.equal(
    baseline.sessions.every((s) => !s.chosenDirection),
    true,
  );
  await page.reload();
  await app.locator('[data-project-control="set"]').selectOption('set-1');
  await app.locator('[data-project-open="reservation-flow"]').click();
  assert.equal(
    await session.locator('[data-note="keep"]').inputValue(),
    'Keep the exact saved geometry 日本語',
  );
  await app.locator('[data-project-back]').click();
  await app
    .locator('[data-project-import]')
    .setInputFiles(join(evidence, `${data.project.id}-review.json`));
  await app
    .locator('[data-project-status]')
    .filter({ hasText: /imported/i })
    .waitFor();
  // Explicit partial states in a second context; dispose and remount in place.
  const lifecycle = await page.evaluate(() => {
    const source = JSON.parse(document.getElementById('diagram-data').textContent);
    const fixture = structuredClone(source);
    fixture.comparisonSets[0].entries = fixture.comparisonSets[0].entries.slice(1);
    fixture.comparisonSets[0].entries[0].fingerprint = '0'.repeat(64);
    fixture.sessions[2].status = 'invalid';
    fixture.sessions[2].data = null;
    fixture.comparisonSets[0].entries[2].candidateId = 'unknown';
    const root = document.createElement('div');
    document.body.append(root);
    let dispose = window.mountProjectApp(root, fixture, { embedded: true });
    const choose = () => {
      const select = root.querySelector('[data-project-control="set"]');
      select.value = 'set-1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };
    choose();
    const states = [...root.querySelectorAll('[data-project-slot]')].map((s) => s.dataset.status);
    document.documentElement.dataset.theme = 'dark';
    dispose();
    dispose = window.mountProjectApp(root, fixture, { embedded: true });
    choose();
    const count = root.querySelectorAll('[data-project-slot]').length;
    const theme = root.dataset.uiTheme;
    dispose();
    const empty = root.children.length;
    root.remove();
    return { states, count, empty, theme };
  });
  assert.deepEqual(lifecycle.states, ['missing', 'stale', 'invalid', 'missing', 'valid']);
  assert.equal(lifecycle.count, 5);
  assert.equal(lifecycle.empty, 0);
  assert.equal(lifecycle.theme, 'dark');
  assert.deepEqual(errors, []);
  assert.deepEqual(failedResponses, []);
  assert.deepEqual(requests, []);
  console.log(
    JSON.stringify({
      ok: true,
      offline,
      browserVersion: browser.version(),
      executable: process.env.PROJECT_BROWSER_EXECUTABLE ?? 'pinned Playwright',
      sessions: 5,
      sets: 8,
      evidence,
      assertions: [
        'exact mapping',
        'placement',
        'unavailable dark',
        'feedback',
        'shortlist/direction',
        'search',
        'compare',
        'zoom/pan',
        'copy/download/import',
        'persistence',
        'keyboard editing',
        'theme isolation',
        'narrow overflow',
        'partial states',
        'disposal/remount',
        ...(offline ? ['blocked network', 'detached file'] : []),
      ],
    }),
  );
} finally {
  await writeFile(
    join(evidence, 'browser-diagnostics.json'),
    `${JSON.stringify({ errors, failedResponses, blockedRequests: requests }, null, 2)}\n`,
  );
  await browser.close();
}
