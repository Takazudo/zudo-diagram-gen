import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4335';
const routes = [
  '/',
  '/docs/tones/',
  '/docs/examples/',
  '/docs/examples/project-text/',
  '/docs/workbench/',
  '/docs/changelog/',
];
await mkdir('test-output', { recursive: true });
const require = createRequire(import.meta.url);
const zfb = require.resolve('@takazudo/zfb/package.json').replace(/package\.json$/, 'bin/zfb.mjs');
const server = spawn(process.execPath, [zfb, 'preview', '--host', '127.0.0.1', '--port', '4335'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
for (const stream of [server.stdout, server.stderr])
  stream.on('data', (chunk) => {
    serverOutput += chunk;
  });
let browser;
try {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`Preview exited: ${serverOutput}`);
    try {
      if ((await fetch(origin)).ok) break;
    } catch {
      // The preview server is still starting.
    }
    if (i === 59) throw new Error(`Preview did not start: ${serverOutput}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
    colorScheme: 'light',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [];
  async function expectHostTheme(expected) {
    try {
      await page.waitForFunction(
        (mode) =>
          document.documentElement.dataset.theme === mode &&
          document.querySelector('.dg-app')?.dataset.uiTheme === mode,
        expected,
        { timeout: 10_000 },
      );
    } catch (error) {
      const state = await page.evaluate(() => ({
        document: document.documentElement.dataset.theme,
        workbench: document.querySelector('.dg-app')?.dataset.uiTheme,
        appearance: [
          ...document.querySelectorAll('[data-zd-theme-menu] button[aria-haspopup="menu"]'),
        ].map((element) => element.getAttribute('aria-label')),
      }));
      throw new Error(`Expected ${expected} host theme: ${JSON.stringify(state)}`, {
        cause: error,
      });
    }
  }
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  for (const route of routes) {
    const response = await page.goto(origin + route);
    assert.equal(response.status(), 200, route);
    await page.screenshot({
      path: `test-output/doc-combine-${route === '/' ? 'home' : route.split('/').filter(Boolean).at(-1)}.png`,
      fullPage: route === '/',
    });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        scroll: document.documentElement.scrollWidth,
        protruding: [...document.querySelectorAll('body *')]
          .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 12)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: String(element.className).slice(0, 100),
            right: Math.round(element.getBoundingClientRect().right),
            width: Math.round(element.getBoundingClientRect().width),
          })),
      }));
      if (dimensions.scroll > dimensions.viewport + 1)
        await page.screenshot({
          path: `test-output/doc-combine-overflow-${width}.png`,
          fullPage: true,
        });
      if (width === 390)
        await page.screenshot({
          path: `test-output/doc-combine-mobile-${route === '/' ? 'home' : route.split('/').filter(Boolean).at(-1)}.png`,
          fullPage: true,
        });
      assert.ok(
        dimensions.scroll <= dimensions.viewport + 1,
        `${route} at ${width}: ${JSON.stringify(dimensions)}`,
      );
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log(`PASS route and widths ${route}`);
  }
  await page.goto(origin + '/docs/workbench/');
  await page.locator('.dg-card').first().waitFor();
  assert.equal(await page.locator('.dg-card').count(), 10);
  assert.match(
    await page.locator('footer').innerText(),
    /Copyright © 2026 Takazudo\. Built with zudo-doc\./,
  );
  console.log('PASS island hydrated with candidates');
  await page.locator('[data-field="search"]').fill('r01-c07');
  assert.equal(await page.locator('.dg-card').count(), 1);
  await page.locator('[data-action="clear-filters"]').click();
  await page.locator('[data-action="inspect"][data-id="r01-c01"]').first().click();
  await page.locator('.dg-stage').waitFor();
  assert.equal(await page.locator('.dg-stage').getAttribute('data-candidate'), 'r01-c01');
  await page.locator('[data-open-search]').click();
  await page.locator('[data-search-input]').fill('s');
  await page.locator('[data-search-input]').press('ArrowRight');
  assert.equal(await page.locator('.dg-stage').getAttribute('data-candidate'), 'r01-c01');
  await page.locator('[data-close-search]').click();
  console.log('PASS site search does not trigger app shortcuts');
  await page.locator('[data-note="keep"]').fill('Doc combine browser note');
  await page.locator('[data-action="shortlist-toggle"][data-id="r01-c01"]').click();
  await page.locator('[data-action="zoom-actual"]').click();
  assert.equal(await page.locator('.dg-stage').getAttribute('data-scale'), '1');
  const placement = await page.locator('.dg-context-art').evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  assert.deepEqual(placement, { width: 360, height: 200 });
  await page.locator('[data-field="zoom"]').evaluate((element) => {
    element.value = '150';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(await page.locator('.dg-stage').getAttribute('data-scale'), '1.5');
  await page.locator('[data-action="zoom-reset"]').click();
  await page.locator('[data-action="view"][data-view="compare"]').click();
  assert.equal(await page.locator('.dg-compare-cell').count(), 2);
  await page.locator('[data-action="view"][data-view="inspect"]').click();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('[data-action="download-review"]').first().click();
  const download = await downloadEvent;
  const reviewPath = await download.path();
  assert.ok(reviewPath);
  await page.reload();
  await page.locator('.dg-stage').waitFor();
  assert.equal(await page.locator('[data-note="keep"]').inputValue(), 'Doc combine browser note');
  await page.locator('[data-import-review]').setInputFiles(reviewPath);
  await page.getByText('Review imported').waitFor();
  const review = JSON.parse(await readFile(reviewPath, 'utf8'));
  assert.equal(review.sessionId, 'composer-tone-exploration');
  await page.locator('[data-action="copy-feedback"]').click();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /Doc combine browser note/,
  );
  console.log('PASS embedded review and persistence');
  const appearanceToggle = page
    .locator('[data-zd-theme-menu] button[aria-haspopup="menu"]:visible')
    .first();
  await appearanceToggle.click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expectHostTheme('dark');
  await appearanceToggle.click();
  await page.getByRole('menuitemradio', { name: 'Light' }).click();
  await expectHostTheme('light');
  await appearanceToggle.click();
  await page.getByRole('menuitemradio', { name: 'System' }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectHostTheme('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expectHostTheme('light');
  console.log('PASS light, dark, system and host app theme sync');
  const variantContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await variantContext.route('**/workbench-data/tone-exploration.json', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    delete data.candidates[0].assets.dark;
    await route.fulfill({ response, json: data });
  });
  const variantPage = await variantContext.newPage();
  variantPage.on('pageerror', (error) => errors.push(error.message));
  await variantPage.goto(origin + '/docs/workbench/#candidate=r01-c01&view=inspect');
  await variantPage.locator('.dg-stage').waitFor();
  await variantPage.locator('[data-action="theme"][data-value="dark"]').click();
  await variantPage.locator('.dg-unavailable').first().waitFor();
  assert.equal(await variantPage.locator('[data-action="download-svg"]').isDisabled(), true);
  await variantContext.close();
  console.log('PASS missing dark asset state');
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS embedded documentation browser checks');
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    server.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        server.kill('SIGKILL');
        resolve();
      }, 5_000);
      server.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}
