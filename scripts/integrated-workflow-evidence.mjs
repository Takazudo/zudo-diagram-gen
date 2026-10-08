import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { sha256, installedEngine, SESSION_IDS, TONE_IDS } from './integrated-acceptance.mjs';

export function assertSelectedBaseline(selection, sessionId, parent) {
  assert.ok(
    selection.baselines.some(
      (item) =>
        item.sessionId === sessionId &&
        item.candidateId === parent.id &&
        item.fingerprint === parent.fingerprint,
    ),
    'Refinement parent must be an explicitly selected baseline.',
  );
}

export async function reproduceUpgradeExport(engine, consumerRoot, sessionPath, pair, expected) {
  const temporary = await mkdtemp(path.join(tmpdir(), 'p11-upgrade-reexport-'));
  try {
    const generated = path.join(temporary, pair.name);
    await engine.exportCandidate(path.join(consumerRoot, sessionPath), pair.candidateId, {
      theme: pair.theme,
      output: generated,
      resourceRoot: consumerRoot,
    });
    assert.deepEqual(
      await readFile(generated),
      expected,
      'Changed installed engine must reproduce export.',
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function validateWorkflowEvidence({
  workflow,
  project,
  engine,
  readEvidence,
  consumerRoot,
  checkoutRoot,
}) {
  assert.ok(
    workflow && typeof workflow === 'object',
    'Actual workflow artifact relations are required.',
  );
  const json = async (ref) => JSON.parse((await readEvidence(ref)).toString('utf8'));
  const candidate = (sessionId, candidateId) => {
    const session = project.sessions.find((item) => item.id === sessionId);
    const saved = session?.data.candidates.find((item) => item.id === candidateId);
    assert.ok(saved, `Unknown workflow candidate ${sessionId}/${candidateId}.`);
    return { session, saved };
  };
  const pairs = async (items, minimum, label) => {
    assert.ok(
      Array.isArray(items) && items.length >= minimum,
      `Missing ${label} immutable file pairs.`,
    );
    assert.equal(
      new Set(items.map((item) => item.name)).size,
      items.length,
      `Duplicate ${label} file pair.`,
    );
    for (const item of items) {
      assert.ok(
        item.before.path !== item.after.path,
        `Preserve separate before/after ${label} records.`,
      );
      assert.deepEqual(
        await readEvidence(item.before),
        await readEvidence(item.after),
        `${label} changed: ${item.name}`,
      );
    }
  };
  const review = await json(workflow.review?.download);
  const resume = await json(workflow.review?.resume);
  const selection = await json(workflow.review?.selection);
  assert.equal(resume.schemaVersion, 1);
  assert.equal(resume.command, 'resume');
  assert.equal(resume.ok, true);
  assert.deepEqual(
    resume.data.review,
    review,
    'Actual resume must retain exact downloaded feedback.',
  );
  assert.deepEqual(resume.errors, []);
  assert.equal(selection.schemaVersion, 1);
  assert.equal(selection.kind, 'explicit-selection');
  assert.equal(selection.purpose, 'test');
  assert.ok(Array.isArray(selection.baselines) && selection.baselines.length >= 5);
  assert.equal(
    new Set(selection.baselines.map((item) => item.sessionId)).size,
    selection.baselines.length,
  );
  const sessions = review.type === 'zudo-diagram-project-review' ? review.sessions : [review];
  if (review.type === 'zudo-diagram-project-review')
    assert.equal(review.projectId, project.project.id);
  for (const baseline of selection.baselines) {
    const { saved } = candidate(baseline.sessionId, baseline.candidateId);
    assert.equal(baseline.fingerprint, saved.fingerprint);
    const transferred = sessions.find((item) => item.sessionId === baseline.sessionId);
    assert.ok(transferred, 'Selection must originate in transferred browser review.');
    assert.equal(transferred.chosenDirection?.id, saved.id);
    assert.equal(transferred.chosenDirection?.fingerprint, saved.fingerprint);
  }
  for (const session of sessions) {
    for (const record of [
      ...session.records,
      ...session.shortlist,
      ...(session.chosenDirection ? [session.chosenDirection] : []),
    ]) {
      const { saved } = candidate(session.sessionId, record.id);
      assert.equal(
        record.fingerprint,
        saved.fingerprint,
        'Transferred review cannot silently accept stale artwork.',
      );
    }
  }
  assert.ok(
    Array.isArray(workflow.refinements) && workflow.refinements.length >= 2,
    'Refine a subset from actual saved baselines.',
  );
  const children = new Set();
  for (const refinement of workflow.refinements) {
    const { session, saved: child } = candidate(refinement.sessionId, refinement.childCandidateId);
    const { saved: parent } = candidate(refinement.sessionId, refinement.parentCandidateId);
    assert.ok(!children.has(`${session.id}/${child.id}`), 'Duplicate refinement evidence.');
    children.add(`${session.id}/${child.id}`);
    assertSelectedBaseline(selection, session.id, parent);
    assert.equal(child.parentCandidateId, parent.id);
    assert.ok(
      session.data.rounds.find((item) => item.id === child.roundId).order >
        session.data.rounds.find((item) => item.id === parent.roundId).order,
    );
    for (const theme of ['light', 'dark']) {
      const before = await readEvidence(refinement.baselineBefore[theme]);
      assert.equal(
        before.toString('utf8'),
        parent.assets[theme],
        'Refinement must preserve original baseline bytes.',
      );
      assert.deepEqual(
        await readEvidence(refinement.createdChild[theme]),
        before,
        'Child must begin from actual saved SVG bytes.',
      );
    }
    const feedback = await json(refinement.feedback);
    assert.deepEqual(
      feedback,
      sessions
        .find((item) => item.sessionId === session.id)
        ?.records.find((item) => item.id === parent.id),
      'Refinement feedback must be actual transferred review.',
    );
    const metadata = JSON.parse(
      await readFile(path.join(consumerRoot, session.path, child.sourcePath), 'utf8'),
    );
    assert.deepEqual(metadata.baselineFeedback, feedback, 'Saved refinement lost feedback.');
  }
  await pairs(workflow.immutableFiles, 4, 'old style');
  const revisions = workflow.styleRevisions;
  assert.ok(
    revisions?.initial && revisions.pending,
    'Preserve explicit initial/new style revision identities.',
  );
  assert.notEqual(revisions.initial.revision, revisions.pending.revision);
  const initialStyle = await engine.readStyleRevision(consumerRoot, revisions.initial.revision, {
    expectedHash: revisions.initial.hash,
  });
  const pendingStyle = await engine.readStyleRevision(consumerRoot, revisions.pending.revision, {
    expectedHash: revisions.pending.hash,
  });
  for (const name of ['style.json', 'scheme.json', 'palette.json', 'kit.svg']) {
    const pair = workflow.immutableFiles.find((item) => item.name === name);
    assert.ok(pair, `Old revision must preserve ${name}.`);
    assert.deepEqual(
      await readEvidence(pair.after),
      await readFile(path.join(consumerRoot, 'styles', revisions.initial.revision, name)),
      'Old revision pair must bind actual saved snapshot.',
    );
  }
  assert.equal(initialStyle.style.selectionPurpose, 'test');
  assert.deepEqual(initialStyle.style.baselines, selection.baselines);
  const beforeAdoption = await json(revisions.beforeAdoption),
    afterAdoption = await json(revisions.afterAdoption);
  assert.equal(
    beforeAdoption.style.revision,
    revisions.initial.revision,
    'New style must remain pending until explicit adoption.',
  );
  assert.equal(beforeAdoption.style.hash, initialStyle.hash);
  assert.equal(afterAdoption.style.revision, revisions.pending.revision);
  assert.equal(afterAdoption.style.hash, pendingStyle.hash);
  assert.deepEqual(
    afterAdoption,
    project.project,
    'Final project must retain the explicitly adopted revision.',
  );
  const later = workflow.laterDiagram;
  assert.ok(
    later && !SESSION_IDS.includes(later.sessionId),
    'Later diagram needs an explicit new ordinary session.',
  );
  const laterCandidate = candidate(later.sessionId, later.candidateId).saved;
  const laterStyle = await engine.readStyleRevision(consumerRoot, later.revision);
  assert.equal(
    laterCandidate.provenance?.styleHash,
    laterStyle.hash,
    'Later diagram must identify the immutable saved kit style.',
  );
  for (const field of ['schemeHash', 'kitHash', 'paletteHash'])
    assert.equal(laterCandidate.provenance[field], laterStyle.style[field]);
  assert.ok(
    pendingStyle.style.targets.some((target) => target.sessionId === later.sessionId),
    'New explicit revision must cover later diagram target.',
  );
  assert.ok(workflow.sweep?.root, 'Preserve the original five-session/eight-tone checkpoint.');
  const sweep = await engine.loadProject(workflow.sweep.root, { strict: true });
  assert.deepEqual(
    await json(workflow.sweep.project),
    sweep.project,
    'Sweep checkpoint project bytes differ from loaded metadata.',
  );
  assert.deepEqual(sweep.sessions.map((item) => item.id).sort(), [...SESSION_IDS].sort());
  for (const toneId of TONE_IDS) {
    const set = sweep.comparisonSets.find((item) => item.toneId === toneId);
    assert.ok(
      set?.ok && set.entries.length === 5,
      `Original sweep needs exact complete ${toneId} set.`,
    );
  }
  for (const session of sweep.sessions)
    for (const saved of session.data.candidates) {
      const current = candidate(session.id, saved.id).saved;
      assert.equal(
        current.fingerprint,
        saved.fingerprint,
        'Later project changed reviewed sweep artwork.',
      );
      assert.deepEqual(current.assets, saved.assets);
    }
  assert.ok(Array.isArray(workflow.exports) && workflow.exports.length >= 2);
  const exported = new Set();
  for (const item of workflow.exports) {
    assert.ok(['light', 'dark'].includes(item.theme));
    const { saved } = candidate(item.sessionId, item.candidateId);
    const id = `${item.sessionId}/${item.candidateId}/${item.theme}`;
    assert.ok(!exported.has(id), 'Duplicate exact export evidence.');
    exported.add(id);
    assert.equal(
      (await readEvidence(item.file)).toString('utf8'),
      saved.assets[item.theme],
      'Exact export changed saved source bytes.',
    );
  }
  assert.ok(
    [...exported].some((id) => id.endsWith('/light')) &&
      [...exported].some((id) => id.endsWith('/dark')),
  );
  for (const kind of ['single', 'project']) {
    const html = workflow.html?.find((item) => item.kind === kind);
    const text = (await readEvidence(html?.file)).toString('utf8');
    assert.match(text, /^<!doctype html>/i);
    assert.ok(
      !/<script[^>]*\bsrc\s*=/i.test(text),
      'Detached HTML cannot require external scripts.',
    );
    for (const privatePath of [
      checkoutRoot,
      consumerRoot,
      '/home/',
      '/workspace/',
      'zudolab/zudo-pattern-gen',
    ])
      assert.ok(!text.includes(privatePath), `Portable HTML leaks private source ${privatePath}.`);
  }
  const upgrade = workflow.catalogUpgrade;
  assert.ok(
    upgrade && upgrade.consumerRoot !== consumerRoot,
    'Upgrade must use a separate installed consumer.',
  );
  const installed = await installedEngine(upgrade.consumerRoot, upgrade.engineModule, checkoutRoot);
  const oldContext = await json(upgrade.contextBefore),
    newContext = await json(upgrade.contextAfter);
  const current = await installed.engine.resolveToneContext(upgrade.toneId, {
    requireComplete: true,
  });
  assert.notEqual(
    oldContext.hashes.contextHash,
    newContext.hashes.contextHash,
    'Installed catalog did not change.',
  );
  assert.equal(
    current.hashes.contextHash,
    newContext.hashes.contextHash,
    'New context record differs from actual upgraded installed package.',
  );
  await pairs(upgrade.immutableFiles, 4, 'upgrade lock');
  await pairs(upgrade.exports, 2, 'upgrade export');
  for (const name of ['style.json', 'scheme.json', 'palette.json', 'kit.svg']) {
    const pair = upgrade.immutableFiles.find((item) => item.name === name);
    assert.ok(pair, `Upgrade must preserve ${name}.`);
    assert.deepEqual(
      await readEvidence(pair.after),
      await readFile(path.join(upgrade.consumerRoot, 'styles', upgrade.revision, name)),
      'Upgrade pair must bind actual separately saved snapshot.',
    );
  }
  const upgradedProject = await installed.engine.loadProject(upgrade.consumerRoot, {
    strict: true,
  });
  const upgradeExports = new Set();
  for (const pair of upgrade.exports) {
    const identity = `${pair.sessionId}/${pair.candidateId}/${pair.theme}`;
    assert.ok(!upgradeExports.has(identity), 'Duplicate upgrade export identity.');
    upgradeExports.add(identity);
    const upgradedSession = upgradedProject.sessions.find((item) => item.id === pair.sessionId);
    const upgradedCandidate = upgradedSession?.data.candidates.find(
      (item) => item.id === pair.candidateId,
    );
    assert.equal(
      pair.fingerprint,
      upgradedCandidate?.fingerprint,
      'Upgrade export fingerprint differs from actual copied candidate.',
    );
    assert.ok(['light', 'dark'].includes(pair.theme));
    assert.equal(
      (await readEvidence(pair.after)).toString('utf8'),
      upgradedCandidate.assets[pair.theme],
    );
    assert.deepEqual(await readEvidence(pair.original), await readEvidence(pair.before));
    assert.ok(
      workflow.exports.some(
        (item) =>
          item.sessionId === pair.sessionId &&
          item.candidateId === pair.candidateId &&
          item.theme === pair.theme &&
          item.file.sha256 === pair.original.sha256,
      ),
      'Upgrade export must originate in an actual exact reviewed export.',
    );
    await reproduceUpgradeExport(
      installed.engine,
      upgrade.consumerRoot,
      upgradedSession.path,
      pair,
      await readEvidence(pair.after),
    );
  }
  for (const pair of upgrade.html ?? []) {
    assert.ok(['single', 'project'].includes(pair.kind));
    assert.ok(
      workflow.html.some(
        (item) => item.kind === pair.kind && item.file.sha256 === pair.original?.sha256,
      ),
      'Upgrade HTML must bind original exact export.',
    );
    assert.deepEqual(await readEvidence(pair.original), await readEvidence(pair.before));
    assert.deepEqual(await readEvidence(pair.before), await readEvidence(pair.after));
    const root =
      pair.kind === 'project'
        ? upgrade.consumerRoot
        : path.join(
            upgrade.consumerRoot,
            upgradedProject.sessions.find((item) => item.id === pair.sessionId)?.path ??
              'missing-session',
          );
    const temporary = await mkdtemp(path.join(tmpdir(), 'p11-upgrade-html-'));
    try {
      const generated = path.join(temporary, `${pair.kind}.html`);
      await installed.engine.exportHtml(root, { output: generated });
      assert.deepEqual(
        await readFile(generated),
        await readEvidence(pair.after),
        'Changed installed engine must reproduce HTML.',
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
  assert.deepEqual((upgrade.html ?? []).map((item) => item.kind).sort(), ['project', 'single']);
  const upgradeCommands = await json(upgrade.exportCommands);
  assert.ok(upgradeCommands.length >= upgrade.exports.length * 2 + 4);
  for (const pair of upgrade.exports)
    for (const phase of ['before', 'after'])
      assert.ok(
        upgradeCommands.some(
          (record) =>
            record.engineModule === installed.modulePath &&
            record.operation === 'exportCandidate' &&
            record.phase === phase &&
            record.sessionId === pair.sessionId &&
            record.candidateId === pair.candidateId &&
            record.theme === pair.theme &&
            record.fingerprint === pair.fingerprint &&
            record.sha256 === pair[phase].sha256 &&
            record.exitCode === 0,
        ),
        'Actual installed export command record missing.',
      );
  assert.ok(
    upgrade.exports.some((item) => item.theme === 'light') &&
      upgrade.exports.some((item) => item.theme === 'dark'),
    'Upgrade needs both actual SVG themes.',
  );
  for (const pair of upgrade.html)
    for (const phase of ['before', 'after'])
      assert.ok(
        upgradeCommands.some(
          (record) =>
            record.engineModule === installed.modulePath &&
            record.operation === 'exportHtml' &&
            record.phase === phase &&
            record.kind === pair.kind &&
            record.sessionId === pair.sessionId &&
            record.sha256 === pair[phase].sha256 &&
            record.exitCode === 0,
        ),
        'Actual installed HTML export command record missing.',
      );
  const snapshot = await installed.engine.readStyleRevision(upgrade.consumerRoot, upgrade.revision);
  const locked = await engine.readStyleRevision(consumerRoot, upgrade.revision);
  assert.equal(snapshot.hash, locked.hash, 'Separate upgrade must retain actual trial lock.');
  assert.deepEqual(snapshot.scheme, locked.scheme);
  assert.deepEqual(snapshot.palette, locked.palette);
  assert.equal(snapshot.kit, locked.kit);
  for (const theme of ['light', 'dark']) {
    const materialization = upgrade.materializations.find((item) => item.theme === theme);
    const rendered = installed.engine.materializeKit(snapshot.kit, {
      scheme: snapshot.scheme,
      palette: snapshot.palette,
      theme,
      instances: [{ id: 'upgrade-probe', primitive: 'person', width: 100, height: 100 }],
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><title>Deterministic saved-kit upgrade probe</title></svg>',
    });
    assert.equal(sha256(rendered), materialization.expectedHash);
    assert.equal((await readEvidence(materialization.file)).toString('utf8'), rendered);
  }
  const noBrowser = workflow.noBrowser;
  assert.ok(
    noBrowser &&
      noBrowser.consumerRoot !== consumerRoot &&
      noBrowser.consumerRoot !== upgrade.consumerRoot,
    'No-browser probe requires its own consumer.',
  );
  await installedEngine(noBrowser.consumerRoot, noBrowser.engineModule, checkoutRoot);
  const before = await json(noBrowser.before),
    after = await json(noBrowser.after),
    capture = await json(noBrowser.capture);
  assert.equal(before.playwright, null);
  assert.equal(after.playwright, null);
  assert.deepEqual(after, before, 'Missing capture cannot mutate dependency/browser inventory.');
  const { dependencySnapshot } = await import('./probe-integrated-distribution.mjs');
  assert.deepEqual(
    after,
    await dependencySnapshot(noBrowser.consumerRoot, noBrowser.engineModule),
    'No-browser inventory must match current actual isolated consumer.',
  );
  assert.ok(before.files.length && before.files.some((item) => item.path === 'pnpm-lock.yaml'));
  assert.equal(capture.schemaVersion, 1);
  assert.equal(capture.command, 'capture');
  assert.equal(capture.ok, false);
  assert.equal(capture.errors[0].code, 'CAPTURE_UNAVAILABLE');
  assert.match(capture.errors[0].message, /playwright|browser|install/i);
  return {
    review: true,
    refinements: children.size,
    exactExports: exported.size,
    immutableFiles: workflow.immutableFiles.length,
    installedCatalogUpgrade: true,
    noBrowser: true,
  };
}
