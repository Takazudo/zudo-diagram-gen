#!/usr/bin/env node
// Manager/CI: run under heavy-guard and playwright-guard. No model generation.
// Usage: <installed-project-root> <preview-url|detached.html> <new-output> [--offline] [--purpose=test]
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  installed,
  sourceBytes,
  playwrightFor,
  runNode,
  saveJSON,
  diagnostics,
  sha256,
} from './integrated-trial-browser-support.mjs';
const [rootArg, input, outArg] = process.argv.slice(2);
if (!rootArg || !input || !outArg)
  throw new Error(
    'Usage: <projectRoot> <baseURL|detachedHTML> <new-output> [--offline] [--purpose=test]',
  );
for (const option of process.argv.slice(5))
  assert(['--offline', '--purpose=test'].includes(option), `Unknown option ${option}`);
const root = resolve(rootArg),
  out = resolve(outArg),
  offline = process.argv.includes('--offline');
assert(out !== root && !out.startsWith(`${root}/`), 'Evidence must be outside reviewed source');
await mkdir(out, { recursive: false });
const consumer = await installed(root);
const source = await consumer.engine.loadProject(root, { strict: true });
const tones = [
  'fine-outline',
  'soft-fill',
  'ui-miniature',
  'swiss-grid',
  'contour-wash',
  'paper-layers',
  'pencil-notebook',
  'isometric-solid',
];
assert(source.sessions.length >= 5, 'Actual public trial requires at least five sessions');
assert.deepEqual(
  [...new Set(source.comparisonSets.map((set) => set.toneId))].sort(),
  [...tones].sort(),
);
const setFor = (tone) => source.comparisonSets.find((set) => set.toneId === tone);
const browser = await (
  await playwrightFor(consumer)
).chromium.launch(
  process.env.PROJECT_BROWSER_EXECUTABLE
    ? { executablePath: process.env.PROJECT_BROWSER_EXECUTABLE }
    : {},
);
let record,
  counter = 0;
const assertions = [];
const passed = (id, evidence) =>
  assertions.push({ id, passed: true, ...(evidence ? { evidence } : {}) });
try {
  const context = await browser.newContext({
    acceptDownloads: true,
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  record = diagnostics(page);
  if (offline) {
    assert(!/^https?:/.test(input), 'Offline acceptance requires file transport');
    await context.route(/^https?:/, (route) => {
      record.blockedRequests.push(route.request().url());
      return route.abort();
    });
  }
  const url = /^https?:/.test(input) ? input : pathToFileURL(resolve(input)).href;
  await page.goto(url);
  const app = page.locator('#diagram-app');
  await app.locator('[data-project-slot]').first().waitFor();
  const embedded = JSON.parse(await page.locator('#diagram-data').textContent());
  assert.equal(embedded.project.id, source.project.id);
  assert.deepEqual(
    embedded.comparisonSets.map((s) => ({ id: s.id, entries: s.entries })),
    source.comparisonSets.map((s) => ({ id: s.id, entries: s.entries })),
  );
  passed('installed-project-exact-mappings');
  const download = async (locator, label) => {
    const [item] = await Promise.all([page.waitForEvent('download'), locator.click()]);
    const filename = join(
      out,
      `${String(++counter).padStart(3, '0')}-${label}-${item.suggestedFilename()}`,
    );
    await item.saveAs(filename);
    return { filename, bytes: await readFile(filename) };
  };
  const projectReview = async (label) => {
    const item = await download(app.locator('[data-project-action="download"]'), label);
    return { ...item, value: JSON.parse(item.bytes) };
  };
  for (const set of source.comparisonSets) {
    await app.locator('[data-project-control="set"]').selectOption(set.id);
    for (const theme of ['light', 'dark']) {
      await app.locator('[data-project-control="theme"]').selectOption(theme);
      for (const mapping of set.entries) {
        const session = source.sessions.find((s) => s.id === mapping.sessionId);
        const candidate = session.data.candidates.find((c) => c.id === mapping.candidateId);
        const card = app.locator(`[data-project-slot="${mapping.sessionId}"]`);
        assert.equal(
          await card.getAttribute('data-status'),
          candidate.assets[theme] ? 'valid' : 'unavailable',
        );
        assert.equal(
          await card.locator('[data-project-identity]').innerText(),
          `${mapping.sessionId}/${mapping.candidateId}`,
        );
        const image = card.locator('[data-placement-diagram]');
        if (!candidate.assets[theme]) {
          assert.equal(await image.count(), 0, 'Absent dark must never fall back to light');
          continue;
        }
        const placement = session.data.placement;
        assert.deepEqual(
          await image.evaluate((element) => [
            element.style.left,
            element.style.top,
            element.style.width,
            element.style.height,
          ]),
          [placement.slot.x, placement.slot.y, placement.slot.width, placement.slot.height].map(
            (n) => `${n}px`,
          ),
        );
        assert.deepEqual(
          await card
            .locator('[data-placement-frame]')
            .evaluate((element) => [element.style.width, element.style.height]),
          [placement.frame.width, placement.frame.height].map((n) => `${n}px`),
        );
        const bytes = await image.evaluate(async (element) =>
          Array.from(new Uint8Array(await (await fetch(element.src)).arrayBuffer())),
        );
        assert.deepEqual(Buffer.from(bytes), await sourceBytes(root, session, candidate, theme));
      }
      await page.screenshot({ path: join(out, `set-${set.id}-${theme}.png`), fullPage: true });
    }
  }
  passed('eight-tones-placement-and-exact-theme-bytes');
  const first = source.sessions[0],
    sibling = source.sessions[1];
  const baselineSet = setFor('fine-outline');
  const chosen = baselineSet.entries.find((entry) => entry.sessionId === first.id);
  const candidate = first.data.candidates.find((c) => c.id === chosen.candidateId);
  const secondRound = first.data.candidates.find(
    (c) => c.toneId === candidate.toneId && c.roundId === 'r02',
  );
  assert(secondRound, 'Trial must preserve actual r02 same-tone source');
  const alternate = first.data.candidates.find(
    (c) => c.toneId === candidate.toneId && c.roundId === 'r01',
  );
  assert(
    alternate && alternate.id !== candidate.id,
    'Trial must retain an actual r01/r02 same-tone pair',
  );
  await app.locator('[data-project-control="set"]').selectOption(baselineSet.id);
  await app.locator('[data-project-control="theme"]').selectOption('light');
  const baseline = await projectReview('baseline');
  assert(baseline.value.sessions.every((s) => !s.chosenDirection));
  const styleBefore = source.project.style;
  await app.locator(`[data-project-open="${first.id}"]`).click();
  const session = app.locator(`[data-project-workbench="${first.id}"]`);
  await session.locator('[data-action="view"][data-view="grid"]').click();
  await session.locator(`[data-action="inspect"][data-id="${candidate.id}"]`).first().click();
  const keep = '日本語の配置と申請 → 確認待ち → 確定を保つ';
  const change = '文字の間隔を調整し、意味と保存した形を維持する';
  await session.locator('[data-note="keep"]').fill(keep);
  await session.locator('[data-note="change"]').fill(change);
  await session.locator('[data-note="action"]').selectOption('refine');
  const keepField = session.locator('[data-note="keep"]');
  await keepField.evaluate((element) => {
    element.focus();
    element.setSelectionRange(2, 2);
  });
  await keepField.press('ArrowRight');
  assert.equal(await keepField.getAttribute('data-candidate'), candidate.id);
  assert.deepEqual(
    await keepField.evaluate((element) => [
      document.activeElement === element,
      element.selectionStart,
      element.selectionEnd,
    ]),
    [true, 3, 3],
  );
  await session
    .locator(`[data-action="shortlist-toggle"][data-id="${candidate.id}"]`)
    .first()
    .click();
  const shortOnly = await download(
    session.locator('.dg-topbar [data-action="download-review"]'),
    'shortlist-only',
  );
  assert.equal(JSON.parse(shortOnly.bytes).chosenDirection, null);
  await session.locator(`[data-action="direction"][data-id="${candidate.id}"]`).click();
  await session.locator('[data-action="next"]').press('ArrowRight');
  assert.notEqual(await keepField.getAttribute('data-candidate'), candidate.id);
  await session.locator('[data-action="previous"]').press('ArrowLeft');
  assert.equal(await keepField.getAttribute('data-candidate'), candidate.id);
  await session.locator('[data-action="zoom-actual"]').click();
  const layer = session.locator('.dg-pan-layer').first();
  const initialTransform = await layer.evaluate((element) => element.style.transform);
  await session.locator('[data-field="zoom"]').evaluate((element) => {
    element.value = '140';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const zoomTransform = await layer.evaluate((element) => element.style.transform);
  assert.notEqual(zoomTransform, initialTransform);
  const bounds = await session.locator('.dg-stage').first().boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 35, bounds.y + bounds.height / 2 + 20);
  await page.mouse.up();
  assert.notEqual(await layer.evaluate((element) => element.style.transform), zoomTransform);
  await session.locator('[data-action="zoom-reset"]').click();
  assert.match(await layer.evaluate((element) => element.style.transform), /translate\(0px, 0px\)/);
  for (const theme of ['light', 'dark']) {
    assert(candidate.assets[theme], `Chosen trial candidate requires ${theme}`);
    await session.locator(`[data-action="theme"][data-value="${theme}"]`).click();
    const svg = await download(
      session.locator('[data-action="download-svg"]').first(),
      `${theme}-exact`,
    );
    assert.deepEqual(svg.bytes, await sourceBytes(root, first, candidate, theme));
    passed(`exact-${theme}-svg-download`, { path: svg.filename, sha256: sha256(svg.bytes) });
  }
  await session.locator('[data-action="copy-feedback"]').click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  for (const text of [keep, change, candidate.id, 'Create refinements'])
    assert(clipboard.includes(text), `Actual clipboard omits ${text}`);
  await saveJSON(out, 'clipboard.json', { text: clipboard });
  const single = await download(
    session.locator('.dg-topbar [data-action="download-review"]'),
    'session',
  );
  const singleValue = JSON.parse(single.bytes);
  assert.equal(singleValue.chosenDirection.id, candidate.id);
  assert.equal(singleValue.feedback.keep, keep);
  assert.equal(singleValue.feedback.change, change);
  assert.equal(singleValue.feedback.action, 'refine');
  await session.locator('[data-import-review]').setInputFiles(single.filename);
  await session
    .locator('.dg-toast')
    .filter({ hasText: /import/i })
    .waitFor();
  await session.locator('[data-action="view"][data-view="grid"]').click();
  for (const id of [secondRound.id, alternate.id])
    await session.locator(`[data-action="compare-toggle"][data-id="${id}"]`).click();
  await session.locator('[data-action="view"][data-view="compare"]').click();
  assert.deepEqual(
    await session
      .locator('.dg-compare-cell [data-stage]')
      .evaluateAll((elements) => elements.map((e) => e.dataset.candidate).sort()),
    [secondRound.id, alternate.id].sort(),
  );
  await app.locator('[data-project-back]').click();
  const reviewed = await projectReview('project');
  const selected = reviewed.value.sessions.find((s) => s.sessionId === first.id);
  assert.equal(selected.chosenDirection.id, candidate.id);
  assert.equal(selected.chosenDirection.fingerprint, candidate.fingerprint);
  assert.equal(selected.shortlist[0].id, candidate.id);
  const resume = await runNode(
    [consumer.cli, 'resume', root, '--review', reviewed.filename, '--json'],
    root,
  );
  await saveJSON(out, 'installed-resume.json', resume);
  assert.equal(resume.exitCode, 0, resume.stderr || resume.stdout);
  assert.deepEqual(JSON.parse(resume.stdout).data.review, reviewed.value);
  const singleResume = await runNode(
    [consumer.cli, 'resume', join(root, first.path), '--review', single.filename, '--json'],
    root,
  );
  await saveJSON(out, 'installed-session-resume.json', singleResume);
  assert.equal(singleResume.exitCode, 0, singleResume.stderr || singleResume.stdout);
  assert.deepEqual(JSON.parse(singleResume.stdout).data.review, singleValue);
  passed('actual-review-download-clipboard-and-installed-resume', {
    path: reviewed.filename,
    sha256: sha256(reviewed.bytes),
  });
  await app.locator(`[data-project-open="${sibling.id}"]`).click();
  assert.equal(
    await app.locator(`[data-project-workbench="${sibling.id}"] [data-note="keep"]`).inputValue(),
    '',
  );
  await app.locator('[data-project-back]').click();
  const sessionFeedback = {
    'reservation-flow': { keep, change },
    'empty-seats': {
      keep: '席は A・B・C・D の四つ。A は予約済み、B と C は空席、D は確認待ちで選択できない状態を保つ。',
      change: '「空席」の文字間隔を少し広げる。席の状態と配置は変えない。',
    },
    'long-labels': {
      keep: '三つの日本語の役割名を省略せず、準備から確認へ進み、不備は準備へ戻り、完了は受付へ進む流れを保つ。',
      change: '完全な役割名と現在の配置を維持する。',
    },
    'pending-queue': {
      keep: '二つの確認を並行して行い、一方は完了、他方は結果待ち。両方の完了後だけ公開し、公開済み件数はゼロのまま保つ。',
      change: '並行した確認と公開条件が読み取れる現在の配置を維持する。',
    },
    'return-items': {
      keep: '入口から確認へ進み、破損なしは現在空の使用可能な返却箱へ、破損ありは相談へ進む。罰金や返却拒否を加えない。',
      change: '空の返却箱と相談への経路を維持する。',
    },
  };
  // Preserve the original first-session checkpoint; extend through actual UI actions.
  for (const entry of baselineSet.entries) {
    if (entry.sessionId === first.id) continue;
    const feedback = sessionFeedback[entry.sessionId];
    assert(feedback, `Complete trial feedback is required for ${entry.sessionId}`);
    await app.locator(`[data-project-open="${entry.sessionId}"]`).click();
    const workbench = app.locator(`[data-project-workbench="${entry.sessionId}"]`);
    await workbench.locator('[data-action="view"][data-view="grid"]').click();
    await workbench
      .locator(`[data-action="inspect"][data-id="${entry.candidateId}"]`)
      .first()
      .click();
    await workbench.locator('[data-note="keep"]').fill(feedback.keep);
    await workbench.locator('[data-note="change"]').fill(feedback.change);
    await workbench.locator('[data-note="action"]').selectOption('refine');
    await workbench
      .locator(`[data-action="shortlist-toggle"][data-id="${entry.candidateId}"]`)
      .first()
      .click();
    await workbench.locator(`[data-action="direction"][data-id="${entry.candidateId}"]`).click();
    await app.locator('[data-project-back]').click();
  }
  const completeReview = await projectReview('complete-project');
  assert.equal(completeReview.value.sessions.length, baselineSet.entries.length);
  for (const entry of baselineSet.entries) {
    const reviewedSession = completeReview.value.sessions.find(
      (item) => item.sessionId === entry.sessionId,
    );
    assert(reviewedSession, `Downloaded review omits ${entry.sessionId}`);
    assert.equal(reviewedSession.chosenDirection.id, entry.candidateId);
    assert.equal(reviewedSession.chosenDirection.fingerprint, entry.fingerprint);
    assert(
      reviewedSession.shortlist.some(
        (item) => item.id === entry.candidateId && item.fingerprint === entry.fingerprint,
      ),
    );
    const note = reviewedSession.records.find((item) => item.id === entry.candidateId);
    assert(note, `Downloaded review omits notes for ${entry.sessionId}/${entry.candidateId}`);
    assert.equal(note.keep, sessionFeedback[entry.sessionId].keep);
    assert.equal(note.change, sessionFeedback[entry.sessionId].change);
    assert.equal(note.action, 'refine');
  }
  const completeResume = await runNode(
    [consumer.cli, 'resume', root, '--review', completeReview.filename, '--json'],
    root,
  );
  await saveJSON(out, 'installed-complete-resume.json', completeResume);
  assert.equal(completeResume.exitCode, 0, completeResume.stderr || completeResume.stdout);
  assert.deepEqual(JSON.parse(completeResume.stdout).data.review, completeReview.value);
  const selection = {
    schemaVersion: 1,
    kind: 'explicit-selection',
    purpose: 'test',
    baselines: completeReview.value.sessions.map(({ sessionId, chosenDirection }) => ({
      sessionId,
      candidateId: chosenDirection.id,
      fingerprint: chosenDirection.fingerprint,
    })),
  };
  const selectionEvidence = await saveJSON(out, 'explicit-selection.json', selection);
  const completeReviewEvidence = {
    path: completeReview.filename,
    sha256: sha256(completeReview.bytes),
  };
  passed('complete-session-qualified-review-and-test-selection', completeReviewEvidence);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await app.locator('[data-project-control="uiTheme"]').selectOption(theme);
      await app.locator('[data-project-control="theme"]').selectOption(theme);
      await app.locator('[data-project-control="backdrop"]').selectOption('checker');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: join(out, `project-${width}-${theme}.png`), fullPage: true });
    }
  }
  await page.reload();
  await app.locator('[data-project-slot]').first().waitFor();
  const persisted = await projectReview('persisted');
  const persistedSession = persisted.value.sessions.find((s) => s.sessionId === first.id);
  assert.deepEqual(persistedSession.records, selected.records);
  assert.deepEqual(persistedSession.chosenDirection, selected.chosenDirection);
  assert.deepEqual(persistedSession.shortlist, selected.shortlist);
  for (const reviewedSession of completeReview.value.sessions) {
    const persistedRecord = persisted.value.sessions.find(
      (item) => item.sessionId === reviewedSession.sessionId,
    );
    assert.deepEqual(persistedRecord.records, reviewedSession.records);
    assert.deepEqual(persistedRecord.chosenDirection, reviewedSession.chosenDirection);
    assert.deepEqual(persistedRecord.shortlist, reviewedSession.shortlist);
  }
  await app.locator('[data-project-import]').setInputFiles(completeReview.filename);
  await app
    .locator('[data-project-status]')
    .filter({ hasText: /imported/i })
    .waitFor();
  assert.deepEqual(
    (await consumer.engine.loadProject(root, { strict: true })).project.style,
    styleBefore,
  );
  passed('keyboard-cursor-zoom-pan-reset-theme-isolation-persistence');
  assert.deepEqual(record.pageErrors, []);
  assert.deepEqual(record.consoleErrors, []);
  assert.deepEqual(record.failedResponses, []);
  assert.deepEqual(record.failedRequests, []);
  assert.deepEqual(record.blockedRequests, []);
  passed('browser-diagnostics-and-narrow-layout');
  if (offline) passed('detached-file-network-blocked');
  const result = {
    schemaVersion: 1,
    gateId: offline ? 'integrated-trial-offline-browser' : 'integrated-trial-browser',
    integratedSha: process.env.INTEGRATED_SHA || null,
    command: process.argv,
    exitCode: 0,
    assertions,
    limits: [],
    purpose: 'test',
    userApproval: false,
    installedModule: consumer.module,
    browserVersion: browser.version(),
    projectId: source.project.id,
    completeReview: completeReviewEvidence,
    explicitSelection: selectionEvidence,
  };
  const reviewGate = {
    ...result,
    gateId: 'review-resume',
    assertions: ['actual-download', 'exact-resume-records', 'test-selection'].map((id) => ({
      id,
      passed: true,
      evidence: id === 'test-selection' ? selectionEvidence : completeReviewEvidence,
    })),
  };
  await saveJSON(out, 'review-resume-result.json', reviewGate);
  await saveJSON(out, 'browser-project-evidence.json', {
    ...result,
    gateId: 'browser-project',
    assertions: ['eight-exact-comparisons', 'duplicate-tone-identity', 'no-implicit-adoption'].map(
      (id) => ({ id, passed: true }),
    ),
    limits: [
      'partial-recovery requires the separate real watcher result before this gate is complete.',
    ],
  });
  await saveJSON(out, 'browser-result.json', result);
  console.log(JSON.stringify(result));
} finally {
  await saveJSON(out, 'browser-diagnostics.json', record || { startupFailed: true });
  await browser.close();
}
