import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const output = new URL('../test-output/', import.meta.url);
await mkdir(output, { recursive: true });
const project = await readFile(new URL('browser-project.html', output));
const consumerEmpty = await readFile(new URL('browser-consumer-empty.html', output));
const consumer = await readFile(new URL('browser-consumer.html', output));
function projectVariant(change) {
  return project.toString().replace(/(<script id="diagram-data" type="application\/json">)(.*?)(<\/script>)/s, (_, before, source, after) => {
    const data = JSON.parse(source);
    change(data);
    return `${before}${JSON.stringify(data)}${after}`;
  });
}
const files = new Map([
  ['/project', project], ['/consumer-empty', consumerEmpty], ['/consumer', consumer],
  ['/project-changed', projectVariant((data) => { data.candidates[0].fingerprint = 'changed-browser-fingerprint'; })],
  ['/missing-dark', projectVariant((data) => { delete data.candidates[0].assets.dark; })],
]);
const server = createServer((request, response) => {
  const content = files.get(request.url);
  response.writeHead(content ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(content || 'Not found');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const passed = [];
async function verify(name, action) {
  await action();
  passed.push(name);
  console.log(`PASS ${name}`);
}
try {
  await page.goto(`${url}/consumer-empty`);
  await verify('empty installed session', async () => {
    await page.getByText('Ready for your first diagrams').waitFor();
    assert.equal(await page.locator('.dg-card').count(), 0);
  });
  await page.goto(`${url}/project`);
  await page.locator('.dg-card').first().waitFor();
  await verify('overview IDs, search, and round filtering', async () => {
    assert.equal(await page.locator('.dg-card').count(), 10);
    assert.equal(await page.locator('.dg-candidate-id').first().textContent(), 'r01-c01');
    await page.locator('[data-action="round"][data-id="all"]').click();
    assert.equal(await page.locator('.dg-card').count(), 11);
    await page.locator('[data-field="search"]').fill('r01-c07');
    assert.equal(await page.locator('.dg-card').count(), 1);
    assert.equal(await page.locator('.dg-candidate-id').first().textContent(), 'r01-c07');
    await page.locator('[data-action="clear-filters"]').click();
    await page.locator('[data-action="round"][data-id="r02"]').click();
    assert.equal(await page.locator('.dg-card').count(), 1);
    assert.equal(await page.locator('.dg-candidate-id').first().textContent(), 'r02-c01');
    await page.locator('[data-action="round"][data-id="all"]').click();
  });
  await verify('inspect, notes, navigation, and keyboard focus', async () => {
    await page.locator('[data-action="inspect"][data-id="r01-c01"]').first().click();
    await page.locator('[data-note="keep"]').fill('Keep browser note');
    await page.locator('[data-action="next"]').click();
    await page.locator('[data-action="previous"]').click();
    assert.equal(await page.locator('[data-note="keep"]').inputValue(), 'Keep browser note');
    await page.locator('[data-note="keep"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.dg-stage').getAttribute('data-candidate'), 'r01-c01');
    await page.locator('.dg-stage').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.dg-stage').getAttribute('data-candidate'), 'r01-c02');
  });
  await verify('zoom, pan, reset, and exact placement', async () => {
    await page.locator('[data-action="zoom-actual"]').click();
    assert.equal(await page.locator('.dg-stage').getAttribute('data-scale'), '1');
    await page.locator('[data-field="zoom"]').evaluate((element) => {
      element.value = '150';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal(await page.locator('.dg-stage').getAttribute('data-scale'), '1.5');
    const box = await page.locator('.dg-stage').boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20);
    await page.mouse.up();
    assert.match(await page.locator('.dg-pan-layer').evaluate((element) => element.style.transform), /translate/);
    await page.locator('[data-action="zoom-reset"]').click();
    assert.match(await page.locator('[data-zoom-label]').textContent(), /^Fit/);
    const beforeWheel = Number(await page.locator('.dg-stage').getAttribute('data-scale'));
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    assert.notEqual(Number(await page.locator('.dg-stage').getAttribute('data-scale')), beforeWheel);
    await page.locator('[data-action="zoom-reset"]').click();
    const data = JSON.parse(await page.locator('#diagram-data').textContent());
    const size = await page.locator('.dg-context-art').evaluate((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
    assert.deepEqual(size, { width: data.session.target.width, height: data.session.target.height });
  });
  await verify('theme, backdrop, and comparison', async () => {
    await page.locator('[data-action="theme"][data-value="dark"]').click();
    assert.equal(await page.locator('[data-action="theme"][data-value="dark"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-field="backdrop"]').selectOption('paper');
    assert.equal(await page.locator('[data-field="backdrop"]').inputValue(), 'paper');
    await page.locator('[data-action="view"][data-view="compare"]').click();
    assert.equal(await page.locator('.dg-compare-cell').count(), 2);
    const ids = await page.locator('.dg-compare-cell .dg-stage').evaluateAll((elements) => elements.map((element) => element.dataset.candidate));
    assert.notEqual(ids[0], ids[1]);
  });
  await verify('review download, import, and persistence', async () => {
    await page.locator('[data-action="view"][data-view="grid"]').click();
    await page.locator('[data-action="inspect"][data-id="r01-c01"]').first().click();
    await page.locator('[data-note="keep"]').fill('Browser transfer note');
    await page.locator('[data-action="shortlist-toggle"][data-id="r01-c01"]').click();
    await page.locator('[data-action="direction"]').click();
    const transfer = page.waitForEvent('download');
    await page.locator('[data-action="download-review"]').first().click();
    const download = await transfer;
    const transferPath = await download.path();
    assert.ok(transferPath);
    const review = JSON.parse(await readFile(transferPath, 'utf8'));
    await page.reload();
    assert.equal(await page.locator('[data-note="keep"]').inputValue(), 'Browser transfer note');
    assert.equal(await page.locator('.dg-direction-summary').count(), 1);
    await page.locator('[data-import-review]').setInputFiles(transferPath);
    await page.getByText('Review imported').waitFor();
    await page.locator('[data-note="keep"]').fill('Edited after import');
    await page.locator('[data-import-review]').setInputFiles(transferPath);
    await page.getByText('Review imported').waitFor();
    assert.equal(await page.locator('[data-note="keep"]').inputValue(), 'Browser transfer note');
    await page.locator('[data-import-review]').setInputFiles({ name: 'foreign.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...review, sessionId: 'foreign-session' })) });
    await page.locator('.dg-toast').filter({ hasText: 'foreign-session' }).waitFor();
    assert.equal(await page.locator('[data-note="keep"]').inputValue(), 'Browser transfer note');
    await page.locator('[data-import-review]').setInputFiles({ name: 'unknown.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...review, shortlist: [{ id: 'unknown-id', fingerprint: 'x' }] })) });
    await page.locator('.dg-toast').filter({ hasText: 'unknown-id' }).waitFor();
    assert.equal(await page.locator('[data-note="keep"]').inputValue(), 'Browser transfer note');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url });
    await page.locator('[data-action="copy-feedback"]').click();
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /Browser transfer note/);
  });
  await verify('stale review, missing dark asset, and storage denial', async () => {
    await page.goto(`${url}/project-changed#candidate=r01-c01&view=inspect`);
    await page.locator('.dg-stale-notice').waitFor();
    await page.goto(`${url}/missing-dark#candidate=r01-c01&view=inspect`);
    await page.locator('[data-action="theme"][data-value="dark"]').click();
    await page.locator('.dg-unavailable').first().waitFor();
    assert.equal(await page.locator('[data-action="download-svg"]').isDisabled(), true);
    const denied = await context.newPage();
    try {
      await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Denied', 'SecurityError'); } }));
      await denied.goto(`${url}/project`);
      await denied.locator('[data-action="inspect"][data-id="r01-c01"]').first().click();
      assert.match(await denied.locator('[data-storage-status]').textContent(), /storage is unavailable/i);
      await denied.locator('[data-note="keep"]').fill('Unsaved but usable');
      assert.equal(await denied.locator('[data-note="keep"]').inputValue(), 'Unsaved but usable');
    } finally { await denied.close(); }
    await page.goto(`${url}/project#candidate=r01-c01&view=inspect`);
  });
  await verify('mobile layout and independent SVG', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.dg-stage').waitFor();
    const dims = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, placement: document.querySelector('.dg-placement-scroll')?.scrollWidth }));
    assert.ok(dims.page < 700, JSON.stringify(dims));
    await page.screenshot({ path: new URL('browser-mobile.png', output).pathname, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: new URL('browser-desktop.png', output).pathname, fullPage: true });
    const svgDownload = page.waitForEvent('download');
    await page.locator('[data-action="download-svg"]').click();
    const svg = await svgDownload;
    assert.match(svg.suggestedFilename(), /\.svg$/);
  });
  await page.goto(`${url}/consumer`);
  await verify('packed consumer standalone workbench', async () => {
    await page.locator('.dg-card').first().waitFor();
    assert.equal(await page.locator('.dg-card').count(), 1);
    await page.locator('[data-action="inspect"]').first().click();
    assert.equal(await page.locator('.dg-stage').getAttribute('data-candidate'), 'r01-c01');
  });
  assert.deepEqual(errors, []);
  console.log(`Browser checks passed: ${passed.length}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
