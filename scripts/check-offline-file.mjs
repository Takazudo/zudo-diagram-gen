import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Exercise the exported file's actual transport, independently of any preview server.
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  const network = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) network.push(request.url());
  });
  for (const name of ['browser-consumer-empty.html', 'browser-consumer.html']) {
    await page.goto(new URL(`../test-output/${name}`, import.meta.url).href);
    await page.locator('.dg-app').waitFor();
    const data = JSON.parse(await page.locator('#diagram-data').textContent());
    if (data.candidates.length === 0) {
      await page.getByText('Ready for your first diagrams').waitFor();
    } else {
      await page.locator('[data-action="inspect"]').first().click();
      await page.locator('[data-note="keep"]').fill('Offline file review');
      await page.reload();
      await page.locator('[data-note="keep"]').waitFor();
      assert.equal(await page.locator('[data-note="keep"]').inputValue(), 'Offline file review');
      await page.locator('[data-action="zoom-actual"]').click();
      assert.equal(await page.locator('.dg-stage').getAttribute('data-scale'), '1');
    }
    console.log(`PASS file transport ${name}`);
  }
  assert.deepEqual(errors, [], 'Offline file browser errors');
  assert.deepEqual(network, [], 'Offline files must not request HTTP resources');
} finally {
  await browser.close();
}
