#!/usr/bin/env node
// Manager/CI only; heavy-guard and playwright-guard required.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const playwright = await import(process.env.PROJECT_PLAYWRIGHT_MODULE || 'playwright');
if (!process.argv[2]) throw new Error('Supply detached ordinary-session HTML.');
const evidence = resolve(process.argv[3] || 'test-output/single-offline');
await mkdir(evidence, { recursive: true });
const browser = await playwright.chromium.launch(
  process.env.PROJECT_BROWSER_EXECUTABLE
    ? { executablePath: process.env.PROJECT_BROWSER_EXECUTABLE }
    : {},
);
const requests = [],
  errors = [];
try {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route(/^https?:/, (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(pathToFileURL(resolve(process.argv[2])).href);
  const app = page.locator('#diagram-app');
  await app.locator('.dg-card').first().waitFor();
  await app.locator('[data-action="inspect"]').first().click();
  await app.locator('[data-note="keep"]').fill('Detached ordinary session feedback');
  await app.locator('[data-action="theme"][data-value="dark"]').click();
  const pending = page.waitForEvent('download');
  await app.locator('[data-action="download-review"]').click();
  const file = await pending,
    filename = join(evidence, file.suggestedFilename());
  await file.saveAs(filename);
  await app.locator('[data-import-review]').setInputFiles(filename);
  await app
    .locator('.dg-toast')
    .filter({ hasText: /imported/i })
    .waitFor();
  assert.equal(
    await app.locator('[data-note="keep"]').inputValue(),
    'Detached ordinary session feedback',
  );
  const svgPending = page.waitForEvent('download');
  await app.locator('[data-action="download-svg"]').click();
  const svg = await svgPending;
  await svg.saveAs(join(evidence, svg.suggestedFilename()));
  await page.screenshot({ path: join(evidence, 'single-offline.png'), fullPage: true });
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      ok: true,
      offline: true,
      kind: 'session',
      browserVersion: browser.version(),
      evidence,
      assertions: [
        'detached file',
        'blocked network',
        'inspect',
        'explicit dark',
        'review editing',
        'download/import',
        'SVG download',
      ],
    }),
  );
} finally {
  await browser.close();
}
