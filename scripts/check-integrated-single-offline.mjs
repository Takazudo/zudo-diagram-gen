#!/usr/bin/env node
// Manager/CI only: heavy-guard + playwright-guard. No model generation or policy bypass.
// Usage: <installed-project-root> <detached-single.html> <new-output> <sessionId> <candidateId>
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  installed,
  sourceBytes,
  playwrightFor,
  saveJSON,
  diagnostics,
  sha256,
} from './integrated-trial-browser-support.mjs';

const [rootArg, htmlArg, outArg, sessionId, candidateId, ...extra] = process.argv.slice(2);
assert(
  rootArg && htmlArg && outArg && sessionId && candidateId && extra.length === 0,
  'Usage: <installed-project-root> <detached-single.html> <new-output> <sessionId> <candidateId>',
);
assert(!/^\w+:/.test(htmlArg), 'Supply an actual local detached HTML file');
const root = resolve(rootArg),
  html = resolve(htmlArg),
  out = resolve(outArg);
assert(out !== root && !out.startsWith(`${root}/`), 'Evidence must be outside reviewed source');
assert(
  html !== root && !html.startsWith(`${root}/`),
  'Detached HTML must be outside loaded source',
);
await mkdir(out, { recursive: false });
const consumer = await installed(root);
const source = await consumer.engine.loadProject(root, { strict: true });
const session = source.sessions.find((entry) => entry.id === sessionId);
assert(session?.status === 'valid', `Actual project session is not valid: ${sessionId}`);
const candidate = session.data.candidates.find((entry) => entry.id === candidateId);
assert(candidate, `Actual project candidate is missing: ${sessionId}/${candidateId}`);
for (const theme of ['light', 'dark'])
  assert(candidate.assets[theme], `Actual candidate requires ${theme} SVG`);
const assertions = [],
  downloads = [];
let browser, record, failure;
try {
  browser = await (
    await playwrightFor(consumer)
  ).chromium.launch(
    process.env.PROJECT_BROWSER_EXECUTABLE
      ? { executablePath: process.env.PROJECT_BROWSER_EXECUTABLE }
      : {},
  );
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  record = diagnostics(page);
  await context.route(/^https?:/, (route) => {
    record.blockedRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto(pathToFileURL(html).href);
  assert.equal(new URL(page.url()).protocol, 'file:');
  const app = page.locator('#diagram-app');
  await app.locator('.dg-card').first().waitFor();
  const embedded = JSON.parse(await page.locator('#diagram-data').textContent());
  assert.equal(embedded.kind, 'session');
  assert.equal(embedded.session.id, sessionId);
  const snapshot = embedded.candidates.find((entry) => entry.id === candidateId);
  assert(snapshot, 'Detached snapshot omits explicit candidate');
  assert.equal(snapshot.fingerprint, candidate.fingerprint);
  assert.deepEqual(snapshot.assets, candidate.assets);
  await app.locator('[data-action="round"][data-id="all"]').click();
  await app.locator(`[data-action="inspect"][data-id="${candidateId}"]`).first().click();
  assert.equal(await app.locator('[data-note="keep"]').getAttribute('data-candidate'), candidateId);
  const keep = '保存した形と日本語のラベル、現在の意味と配置を保つ。';
  const change = 'ラベルの文字間隔を調整し、保存した意味と経路は変えない。';
  await app.locator('[data-note="keep"]').fill(keep);
  await app.locator('[data-note="change"]').fill(change);
  await app.locator('[data-note="action"]').selectOption('refine');
  await app.locator(`[data-action="shortlist-toggle"][data-id="${candidateId}"]`).first().click();
  await app.locator(`[data-action="direction"][data-id="${candidateId}"]`).click();
  const download = async (locator, label) => {
    const [file] = await Promise.all([page.waitForEvent('download'), locator.click()]);
    const path = join(
      out,
      `${String(downloads.length + 1).padStart(3, '0')}-${label}-${file.suggestedFilename()}`,
    );
    await file.saveAs(path);
    const bytes = await readFile(path);
    downloads.push({ path, sha256: sha256(bytes), label });
    return { path, bytes };
  };
  for (const theme of ['light', 'dark']) {
    await app.locator(`[data-action="theme"][data-value="${theme}"]`).click();
    const svg = await download(
      app.locator('[data-action="download-svg"]').first(),
      `${theme}-exact`,
    );
    assert.deepEqual(svg.bytes, await sourceBytes(root, session, candidate, theme));
    await page.screenshot({
      path: join(out, `single-${sessionId}-${candidateId}-${theme}.png`),
      fullPage: true,
    });
  }
  const review = await download(
    app.locator('.dg-topbar [data-action="download-review"]'),
    'session-review',
  );
  const value = JSON.parse(review.bytes);
  assert.equal(value.sessionId, sessionId);
  assert.equal(value.reviewedCandidate.id, candidateId);
  assert.equal(value.reviewedCandidate.fingerprint, candidate.fingerprint);
  assert.deepEqual(value.feedback, { keep, change, action: 'refine' });
  assert.equal(value.chosenDirection.id, candidateId);
  assert.equal(value.chosenDirection.fingerprint, candidate.fingerprint);
  assert(
    value.shortlist.some(
      (entry) => entry.id === candidateId && entry.fingerprint === candidate.fingerprint,
    ),
  );
  // Make successful import observable, rather than importing identical visible state.
  await app.locator('[data-note="keep"]').fill('一時的な変更');
  await app.locator('[data-import-review]').setInputFiles(review.path);
  await app
    .locator('.dg-toast')
    .filter({ hasText: /imported/i })
    .waitFor();
  assert.equal(await app.locator('[data-note="keep"]').inputValue(), keep);
  assert.equal(await app.locator('[data-note="change"]').inputValue(), change);
  assert.equal(await app.locator('[data-note="action"]').inputValue(), 'refine');
  const imported = await download(
    app.locator('.dg-topbar [data-action="download-review"]'),
    'imported-review',
  );
  const importedValue = JSON.parse(imported.bytes);
  assert.deepEqual(importedValue.feedback, value.feedback);
  assert.deepEqual(importedValue.records, value.records);
  assert.deepEqual(importedValue.chosenDirection, value.chosenDirection);
  assert.deepEqual(importedValue.shortlist, value.shortlist);
  assert.deepEqual(record.blockedRequests, []);
  assert.deepEqual(record.pageErrors, []);
  assert.deepEqual(record.consoleErrors, []);
  assert.deepEqual(record.failedRequests, []);
  assert.deepEqual(record.failedResponses, []);
  for (const id of [
    'network-blocked',
    'file-transport',
    'review-interactions',
    'exact-svg-download',
  ])
    assertions.push({ id, passed: true });
  const result = {
    schemaVersion: 1,
    gateId: 'detached-single',
    integratedSha: process.env.INTEGRATED_SHA || null,
    command: process.argv,
    exitCode: 0,
    assertions,
    limits: ['source-away and server-stopped require separate manager orchestration evidence.'],
    purpose: 'test',
    userApproval: false,
    installedModule: consumer.module,
    browserVersion: browser.version(),
    projectId: source.project.id,
    sessionId,
    candidateId,
    fingerprint: candidate.fingerprint,
    snapshotFingerprint: snapshot.fingerprint,
    sessionContentHash: session.data.contentHash,
    snapshotSessionContentHash: embedded.contentHash,
    html: { path: html, sha256: sha256(await readFile(html)) },
    downloads,
  };
  await saveJSON(out, 'single-offline-result.json', result);
  console.log(JSON.stringify(result));
} catch (error) {
  failure = { name: error.name, message: error.message, stack: error.stack };
  throw error;
} finally {
  await saveJSON(out, 'single-offline-diagnostics.json', {
    ...(record || { startupFailed: true }),
    ...(failure ? { failure } : {}),
  });
  await browser?.close();
}
