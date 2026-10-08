import { test } from 'vitest';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as engine from '../packages/diagram-gen/src/index.mjs';
import { assembleTrial } from '../scripts/assemble-integrated-trial.mjs';
import {
  assertSelectedBaseline,
  reproduceUpgradeExport,
  validateWorkflowEvidence,
} from '../scripts/integrated-workflow-evidence.mjs';
import { dependencySnapshot } from '../scripts/probe-integrated-distribution.mjs';
import {
  GATE_ASSERTIONS,
  SESSION_IDS,
  TONE_IDS,
  INITIAL_TONES,
  evidenceReader,
  installedEngine,
  sha256,
  validateAcceptance,
  validateHeadIdentity,
  RUNTIME_PATHS,
} from '../scripts/integrated-acceptance.mjs';

const publicRoot = path.resolve('docs/agent-first/evaluation');
const integratedSha = 'a'.repeat(40);

// Synthetic evidence exercises validator failures only; it is never P11 execution or image inspection.
async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'diagram-acceptance-test-'));
  let index = 0;
  const ref = async (value, extension = 'json') => {
    const file = path.join(root, `${index++}.${extension}`);
    const bytes = Buffer.isBuffer(value)
      ? value
      : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    await writeFile(file, bytes);
    return { path: file, sha256: sha256(bytes) };
  };
  try {
    const manifest = {
      schemaVersion: 1,
      integratedSha,
      validatedHeadSha: integratedSha,
      purpose: 'test',
      userApproval: false,
      provenance: {
        consumerRoot: root,
        hostMechanism: 'explicit-installed-skill-files',
        node: 'v22.21.1',
        pnpm: '10.30.3',
        packageVersions: { engine: '0.1.0', initializer: '0.1.0' },
        os: 'synthetic-test',
        browser: 'synthetic-test',
        fonts: ['synthetic-test'],
        engineArchive: await ref('synthetic archive', 'txt'),
        initializerArchive: await ref('synthetic initializer', 'txt'),
        skillLoading: await ref('synthetic explicit file read', 'txt'),
        authors: await Promise.all(
          TONE_IDS.map(async (toneId) => ({
            toneId,
            model: 'synthetic-test',
            authorId: toneId,
            transcript: await ref('synthetic-test', 'txt'),
          })),
        ),
      },
      palette: await ref(await readFile(path.join(publicRoot, 'palette.json'))),
      inputs: [],
      candidates: [],
      comparisons: [],
      gates: [],
    };
    const project = { project: { sessions: [] }, sessions: [], comparisonSets: [] };
    for (const sessionId of [...SESSION_IDS, 'later-diagram']) {
      const original = SESSION_IDS.includes(sessionId) ? sessionId : SESSION_IDS[0];
      const originalRoot = path.join(publicRoot, 'briefs', original);
      const descriptor = JSON.parse(
        await readFile(path.join(originalRoot, 'placement.json'), 'utf8'),
      );
      const target = JSON.parse(
        await readFile(path.join(originalRoot, 'session.json'), 'utf8'),
      ).target;
      const brief = (await readFile(path.join(originalRoot, 'brief.md'))).toString('utf8');
      const placementFile = `${sessionId}-placement.json`;
      await writeFile(path.join(root, placementFile), JSON.stringify(descriptor));
      project.project.sessions.push({ id: sessionId, path: sessionId, placement: placementFile });
      const session = {
        id: sessionId,
        path: sessionId,
        status: 'valid',
        data: {
          session: { id: sessionId, target },
          brief,
          placement: descriptor,
          rounds: [
            { id: 'r01', order: 1 },
            { id: 'r02', order: 2 },
          ],
          candidates: [],
        },
      };
      project.sessions.push(session);
      const input = { sessionId };
      for (const field of ['brief', 'placement', 'checklist'])
        input[field] = await ref(
          await readFile(path.join(originalRoot, `${field}.${field === 'brief' ? 'md' : 'json'}`)),
        );
      manifest.inputs.push(input);
      const placement = await engine.loadPlacement(root, target, { placement: placementFile });
      for (const [roundId, tones] of sessionId === 'later-diagram'
        ? [['r02', TONE_IDS]]
        : [
            ['r01', INITIAL_TONES],
            ['r02', TONE_IDS],
          ])
        for (const toneId of tones) {
          const candidateId = `${roundId}-${toneId}`;
          const fingerprint = sha256(`${sessionId}/${candidateId}`);
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${target.width} ${target.height}"><title>Synthetic test only</title></svg>`;
          const sourcePath = `rounds/${roundId}/${candidateId}/candidate.json`;
          await mkdir(path.join(root, sessionId, path.dirname(sourcePath)), { recursive: true });
          await writeFile(
            path.join(root, sessionId, sourcePath),
            JSON.stringify({ assets: { light: 'light.svg', dark: 'dark.svg' } }),
          );
          await writeFile(path.join(root, sessionId, path.dirname(sourcePath), 'light.svg'), svg);
          await writeFile(path.join(root, sessionId, path.dirname(sourcePath), 'dark.svg'), svg);
          session.data.candidates.push({
            id: candidateId,
            roundId,
            toneId,
            fingerprint,
            parentCandidateId: null,
            sourcePath,
            assets: { light: svg, dark: svg },
          });
          const candidate = {
            sessionId,
            candidateId,
            roundId,
            toneId,
            fingerprint,
            parentId: null,
            themes: {},
          };
          for (const theme of ['light', 'dark']) {
            const png = Buffer.alloc(24);
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
            png.writeUInt32BE(descriptor.frame.width, 16);
            png.writeUInt32BE(descriptor.frame.height, 20);
            const svgRef = await ref(svg, 'svg'),
              captureRef = await ref(png, 'png');
            const capture = {
              schemaVersion: 1,
              sessionId,
              candidateId,
              fingerprint,
              theme,
              assetHash: svgRef.sha256,
              imageHash: captureRef.sha256,
              styleHash: null,
              placementHash: placement.placementHash,
              frame: descriptor.frame,
              slot: descriptor.slot,
              crop: 'frame',
              dpr: 1,
              viewport: { width: descriptor.frame.width, height: descriptor.frame.height },
              browser: { name: 'chromium', version: 'synthetic-test' },
              environment: {
                os: 'synthetic-test',
                fonts: descriptor.fonts.map((family) => ({ family, ready: true })),
              },
              pixelDimensions: { width: descriptor.frame.width, height: descriptor.frame.height },
              capturedAt: 'synthetic-test',
              inspected: false,
            };
            capture.captureHash = engine.canonicalHash({ ...capture, capturedAt: null });
            const inspection = {
              schemaVersion: 1,
              sessionId,
              candidateId,
              fingerprint,
              theme,
              svgHash: svgRef.sha256,
              pngHash: captureRef.sha256,
              styleHash: null,
              placementHash: placement.placementHash,
              toolCallReference: 'synthetic-test-only',
              actuallyOpened: true,
              factualViolations: [],
              readability: 3,
              character: 3,
              observations: ['Synthetic validator fixture, no actual image inspection.'],
            };
            candidate.themes[theme] = {
              svg: svgRef,
              capture: captureRef,
              sidecar: await ref(capture),
              inspection: await ref(inspection),
            };
          }
          manifest.candidates.push(candidate);
        }
    }
    for (const toneId of TONE_IDS) {
      const entries = project.sessions.map((session) => ({
        sessionId: session.id,
        candidateId: `r02-${toneId}`,
        fingerprint: session.data.candidates.find((item) => item.id === `r02-${toneId}`)
          .fingerprint,
      }));
      project.comparisonSets.push({ id: toneId, toneId, ok: true, entries });
      manifest.comparisons.push({ id: toneId, toneId, candidates: entries });
    }
    for (const [id, assertions] of Object.entries(GATE_ASSERTIONS))
      manifest.gates.push({
        id,
        integratedSha,
        status: 'pass',
        evidence: [
          await ref({
            schemaVersion: 1,
            integratedSha,
            executionSha: integratedSha,
            headSha: integratedSha,
            syntheticMergeSha: integratedSha,
            gateId: id,
            command: 'synthetic-validator-test',
            exitCode: 0,
            assertions: assertions.map((id) => ({ id, passed: true })),
          }),
        ],
      });
    const reader = await evidenceReader(root, [root]);
    const validate = () =>
      validateAcceptance({
        manifest,
        project,
        engine,
        readEvidence: reader,
        publicRoot,
        checkoutSha: integratedSha,
      });
    await run({ root, ref, manifest, project, validate });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('complete synthetic image records cannot substitute for real installed workflow', () =>
  fixture(async ({ validate }) => {
    const result = await validate();
    assert.equal(result.ok, false);
    assert.deepEqual(
      result.diagnostics.map((item) => item.id),
      ['workflow'],
    );
    assert.equal(result.counts.candidates, 63);
    assert.equal(result.counts.inspectedViews, 126);
    assert.match(result.limitations[0], /do not independently establish/);
  }));

test('missing original round, duplicate identity, missing dark and stale fingerprint fail', () =>
  fixture(async ({ manifest, validate }) => {
    manifest.candidates.shift();
    manifest.candidates.push(manifest.candidates[0]);
    delete manifest.candidates[1].themes.dark;
    manifest.candidates[2].fingerprint = 'b'.repeat(64);
    const result = await validate();
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((item) => /Duplicate/.test(item.message)));
    assert.ok(result.diagnostics.some((item) => /Missing dark/.test(item.message)));
    assert.ok(result.diagnostics.some((item) => /Stale fingerprint/.test(item.message)));
  }));

test('capture hash and separate inspection bind exact PNG, artwork and placement', () =>
  fixture(async ({ manifest, ref, validate }) => {
    const assets = manifest.candidates[0].themes.light;
    const inspection = JSON.parse(await readFile(assets.inspection.path, 'utf8'));
    inspection.pngHash = 'c'.repeat(64);
    assets.inspection = await ref(inspection);
    const sidecar = JSON.parse(
      await readFile(manifest.candidates[1].themes.dark.sidecar.path, 'utf8'),
    );

    sidecar.inspected = true;
    manifest.candidates[1].themes.dark.sidecar = await ref(sidecar);
    const result = await validate();
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((item) => /Inspection pngHash/.test(item.message)));
    assert.ok(result.diagnostics.some((item) => /Capture inspected/.test(item.message)));
  }));

test('changed bytes, reused inspection and failed factual/visual review fail', () =>
  fixture(async ({ manifest, ref, validate }) => {
    const first = manifest.candidates[0].themes.light;
    await writeFile(first.svg.path, '<svg>changed</svg>');
    const second = manifest.candidates[1].themes.light;
    second.inspection = manifest.candidates[1].themes.dark.inspection;
    const third = manifest.candidates[2].themes.light;
    const inspection = JSON.parse(await readFile(third.inspection.path, 'utf8'));
    inspection.factualViolations = ['invented approval'];
    inspection.readability = 2;
    third.inspection = await ref(inspection);
    const result = await validate();
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((item) => /hash mismatch/.test(item.message)));
    assert.ok(result.diagnostics.some((item) => /Inspection theme/.test(item.message)));
    assert.ok(result.diagnostics.some((item) => /threshold/.test(item.message)));
  }));

test('exact comparisons cannot omit later sessions or silently choose variants', () =>
  fixture(async ({ manifest, validate }) => {
    manifest.comparisons[0].candidates = manifest.comparisons[0].candidates.slice(0, 5);
    const result = await validate();
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((item) => item.id === 'comparisons'));
  }));

test('required deferred and missing gates never produce full pass', () =>
  fixture(async ({ manifest, ref, validate }) => {
    const gate = manifest.gates.find((item) => item.id === 'detached-project');
    gate.status = 'deferred';
    gate.reproduction = 'Run detached file in pinned CI';
    gate.blockerIssue = 'https://github.com/Takazudo/zudo-diagram-gen/issues/78';
    gate.evidence = [
      await ref({
        schemaVersion: 1,
        integratedSha,
        gateId: gate.id,
        command: 'synthetic-blocked-file-test',
        exitCode: 1,
        assertions: [],
      }),
    ];
    let result = await validate();
    assert.equal(result.ok, false);
    assert.equal(result.gates.find((item) => item.id === 'detached-project').status, 'deferred');
    manifest.gates.pop();
    result = await validate();
    assert.equal(result.status, 'fail');
    assert.ok(result.diagnostics.some((item) => /Missing required gate/.test(item.message)));
  }));

test('generic pass, stale SHA, nonzero command and duplicate assertions fail', () =>
  fixture(async ({ manifest, ref, validate }) => {
    manifest.gates[0].evidence = [
      await ref({
        schemaVersion: 1,
        gateId: 'trial',
        integratedSha,
        command: 'synthetic',
        exitCode: 0,
        assertions: [],
      }),
    ];
    manifest.gates[1].integratedSha = 'b'.repeat(40);
    const gate = manifest.gates[2];
    gate.evidence = [
      await ref({
        schemaVersion: 1,
        gateId: gate.id,
        integratedSha,
        command: 'synthetic',
        exitCode: 1,
        assertions: [],
      }),
    ];
    const result = await validate();
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((item) => /Missing required assertion/.test(item.message)));
    assert.ok(result.diagnostics.some((item) => /SHA is stale/.test(item.message)));
    assert.ok(result.diagnostics.some((item) => /successful command/.test(item.message)));
  }));

test('malformed manifests yield structured failure', async () => {
  const result = await validateAcceptance({ manifest: {}, project: {}, engine, publicRoot });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'fail');
});

test('assembler reads saved source paths and supplied records, never creates evidence', () =>
  fixture(async ({ root, manifest, project }) => {
    const config = structuredClone(manifest);
    for (const name of ['engineArchive', 'initializerArchive', 'skillLoading'])
      config.provenance[name] = config.provenance[name].path;
    config.provenance.authors = config.provenance.authors.map((item) => ({
      ...item,
      transcript: item.transcript.path,
    }));
    config.palette = config.palette.path;
    config.inputs = config.inputs.map((input) => ({
      sessionId: input.sessionId,
      brief: input.brief.path,
      placement: input.placement.path,
      checklist: input.checklist.path,
    }));
    config.captures = config.candidates.flatMap((candidate) =>
      Object.entries(candidate.themes).map(([theme, assets]) => ({
        sessionId: candidate.sessionId,
        candidateId: candidate.candidateId,
        theme,
        capture: assets.capture.path,
        sidecar: assets.sidecar.path,
        inspection: assets.inspection.path,
      })),
    );
    config.gates = [];
    const result = await assembleTrial(config, {
      engine: { loadProject: async () => project },
      base: root,
    });
    assert.equal(result.candidates.length, 63);
    assert.ok(result.gates.every((gate) => gate.status === 'deferred' && !gate.evidence.length));
    config.captures.pop();
    await assert.rejects(
      assembleTrial(config, { engine: { loadProject: async () => project }, base: root }),
      /exactly one capture/,
    );
  }));

test('realpath containment rejects outside evidence and node_modules links into checkout', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'diagram-acceptance-path-'));
  try {
    const consumer = path.join(root, 'consumer');
    await mkdir(consumer);
    const external = path.join(root, 'external.json');
    await writeFile(external, '{}');
    const reader = await evidenceReader(consumer, [consumer]);
    await assert.rejects(reader({ path: external, sha256: sha256('{}') }), /escapes/);
    await symlink(path.resolve('packages/diagram-gen'), path.join(consumer, 'node_modules'), 'dir');
    await assert.rejects(
      installedEngine(
        consumer,
        path.join(consumer, 'node_modules/src/index.mjs'),
        path.resolve('.'),
      ),
      /inside this consumer/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow transfer rejects mismatched downloaded feedback and stale chosen identities', () =>
  fixture(async ({ root, ref, manifest, project }) => {
    project.project.id = 'synthetic-test';
    const sessions = project.sessions.slice(0, 5).map((session) => {
      const saved = session.data.candidates.find(
        (candidate) => candidate.id === 'r02-fine-outline',
      );
      return {
        schemaVersion: 1,
        type: 'zudo-diagram-review',
        sessionId: session.id,
        records: [
          {
            id: saved.id,
            fingerprint: saved.fingerprint,
            keep: 'Synthetic',
            change: 'Synthetic',
            action: 'refine',
          },
        ],
        shortlist: [],
        chosenDirection: { id: saved.id, fingerprint: saved.fingerprint },
      };
    });
    const review = {
      schemaVersion: 1,
      type: 'zudo-diagram-project-review',
      projectId: project.project.id,
      sessions,
    };
    const selection = {
      schemaVersion: 1,
      kind: 'explicit-selection',
      purpose: 'test',
      baselines: sessions.map((session) => ({
        sessionId: session.sessionId,
        candidateId: session.chosenDirection.id,
        fingerprint: session.chosenDirection.fingerprint,
      })),
    };
    const workflow = {
      review: {
        download: await ref(review),
        resume: await ref({
          schemaVersion: 1,
          command: 'resume',
          ok: true,
          errors: [],
          data: { review: { ...review, sessions: [] } },
        }),
        selection: await ref(selection),
      },
    };
    const readEvidence = await evidenceReader(root, [root]);
    const validate = () =>
      validateWorkflowEvidence({
        workflow,
        project,
        engine,
        readEvidence,
        consumerRoot: manifest.provenance.consumerRoot,
        checkoutRoot: path.resolve('.'),
      });
    await assert.rejects(validate(), /exact downloaded feedback/);
    workflow.review.resume = await ref({
      schemaVersion: 1,
      command: 'resume',
      ok: true,
      errors: [],
      data: { review },
    });
    selection.baselines[0].fingerprint = 'd'.repeat(64);
    workflow.review.selection = await ref(selection);
    await assert.rejects(validate(), /Expected values to be strictly equal/);
    selection.baselines[0].fingerprint = sessions[0].chosenDirection.fingerprint;
    workflow.review.selection = await ref(selection);
    await assert.rejects(validate(), /Refine a subset/);
  }));

test('no-browser dependency inventory detects same-length mutation without following links', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'diagram-dependency-snapshot-'));
  try {
    await mkdir(path.join(root, 'node_modules/package'), { recursive: true });
    await writeFile(path.join(root, 'package.json'), '{}');
    await writeFile(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9');
    await writeFile(path.join(root, 'node_modules/package/index.mjs'), 'export const x=1;');
    const before = await dependencySnapshot(
      root,
      path.join(root, 'node_modules/package/index.mjs'),
    );
    assert.equal(before.playwright, null);
    await writeFile(path.join(root, 'node_modules/package/index.mjs'), 'export const x=2;');
    const after = await dependencySnapshot(root, path.join(root, 'node_modules/package/index.mjs'));
    assert.notDeepEqual(after, before);
    assert.equal(after.files.length, before.files.length);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('failed originals remain auditable only with an accepted exact later child', () =>
  fixture(async ({ manifest, project, ref, validate }) => {
    const original = manifest.candidates[0];
    const session = project.sessions.find((item) => item.id === original.sessionId);
    const saved = session.data.candidates.find((item) => item.id === original.candidateId);
    const child = structuredClone(original);
    child.candidateId = 'r03-fine-outline';
    child.roundId = 'r03';
    child.fingerprint = sha256('synthetic later correction');
    child.parentId = original.candidateId;
    session.data.rounds.push({ id: 'r03', order: 3 });
    session.data.candidates.push({
      ...saved,
      id: child.candidateId,
      roundId: child.roundId,
      fingerprint: child.fingerprint,
      parentCandidateId: saved.id,
    });
    for (const theme of ['light', 'dark']) {
      const capture = JSON.parse(await readFile(original.themes[theme].sidecar.path, 'utf8'));
      capture.candidateId = child.candidateId;
      capture.fingerprint = child.fingerprint;
      const fields = { ...capture };
      delete fields.captureHash;
      capture.captureHash = engine.canonicalHash({ ...fields, capturedAt: null });
      child.themes[theme].sidecar = await ref(capture);
      const originalInspection = JSON.parse(
        await readFile(original.themes[theme].inspection.path, 'utf8'),
      );
      child.themes[theme].inspection = await ref({
        ...originalInspection,
        candidateId: child.candidateId,
        fingerprint: child.fingerprint,
      });
      original.themes[theme].inspection = await ref({
        ...originalInspection,
        readability: 2,
        factualViolations: ['Synthetic original failure preserved'],
      });
    }
    original.disposition = {
      status: 'superseded',
      replacement: { candidateId: child.candidateId, fingerprint: child.fingerprint },
      reason: 'Synthetic correction preserves original failed inspection.',
    };
    manifest.candidates.push(child);
    let result = await validate();
    assert.deepEqual(
      result.diagnostics.map((item) => item.id),
      ['workflow'],
    );
    delete original.disposition;
    result = await validate();
    assert.ok(
      result.diagnostics.some(
        (item) => item.id === `candidate:${original.sessionId}/${original.candidateId}`,
      ),
    );
  }));

test('validated head and root/CI execution cannot silently use old runtime SHA', () =>
  fixture(async ({ manifest, ref, validate }) => {
    manifest.validatedHeadSha = 'b'.repeat(40);
    const result = await validate();
    assert.ok(result.diagnostics.some((item) => item.id === 'head-identity'));
    assert.ok(result.diagnostics.some((item) => item.id === 'gate:root-regressions'));
    assert.ok(result.diagnostics.some((item) => item.id === 'gate:ci'));
    manifest.validatedHeadSha = integratedSha;
    manifest.gates.find((item) => item.id === 'ci').evidence = [
      await ref({
        schemaVersion: 1,
        integratedSha,
        executionSha: integratedSha,
        headSha: 'b'.repeat(40),
        syntheticMergeSha: integratedSha,
        gateId: 'ci',
        command: 'synthetic',
        exitCode: 0,
        assertions: GATE_ASSERTIONS.ci.map((id) => ({ id, passed: true })),
      }),
    ];
    assert.ok((await validate()).diagnostics.some((item) => item.id === 'gate:ci'));
  }));

test('a valid reviewed but unselected parent cannot become the refinement baseline', () => {
  const selected = { id: 'selected', fingerprint: 'a'.repeat(64) };
  const otherReviewed = { id: 'also-reviewed', fingerprint: 'b'.repeat(64) };
  const selection = {
    baselines: [
      { sessionId: 'session', candidateId: selected.id, fingerprint: selected.fingerprint },
    ],
  };
  assert.doesNotThrow(() => assertSelectedBaseline(selection, 'session', selected));
  assert.throws(
    () => assertSelectedBaseline(selection, 'session', otherReviewed),
    /explicitly selected/,
  );
  assert.throws(
    () => assertSelectedBaseline(selection, 'another-session', selected),
    /explicitly selected/,
  );
  assert.throws(
    () =>
      assertSelectedBaseline(selection, 'session', {
        ...selected,
        fingerprint: otherReviewed.fingerprint,
      }),
    /explicitly selected/,
  );
});

test('upgrade validator invokes export API and rejects copied evidence differing from regenerated output', async () => {
  const calls = [];
  const exportingEngine = {
    exportCandidate: async (root, candidateId, options) => {
      calls.push({ root, candidateId, ...options });
      await writeFile(options.output, '<svg>actual installed output</svg>');
    },
  };
  const pair = { name: 'light.svg', candidateId: 'saved', theme: 'light' };
  await reproduceUpgradeExport(
    exportingEngine,
    '/actual-consumer',
    'sessions/one',
    pair,
    Buffer.from('<svg>actual installed output</svg>'),
  );
  assert.equal(calls[0].root, '/actual-consumer/sessions/one');
  assert.equal(calls[0].resourceRoot, '/actual-consumer');
  await assert.rejects(
    reproduceUpgradeExport(
      exportingEngine,
      '/actual-consumer',
      'sessions/one',
      pair,
      Buffer.from('<svg>copied old output</svg>'),
    ),
    /must reproduce export/,
  );
  assert.equal(calls.length, 2);
});

test('runtime equivalence binds actual git diff and archived package hashes', () =>
  fixture(async ({ manifest, ref, root }) => {
    const checkoutRoot = path.resolve('.');
    const checkoutSha = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: checkoutRoot,
      encoding: 'utf8',
    }).stdout.trim();
    manifest.integratedSha = 'c1935b83d4722397c1260a8684d24d84f58ad858';
    manifest.validatedHeadSha = checkoutSha;
    const equivalence = {
      schemaVersion: 1,
      runtimeBaseSha: manifest.integratedSha,
      validatedHeadSha: checkoutSha,
      command: [
        'git',
        'diff',
        '--exit-code',
        manifest.integratedSha,
        checkoutSha,
        '--',
        ...RUNTIME_PATHS,
      ],
      exitCode: 0,
      engineArchive: manifest.provenance.engineArchive,
      initializerArchive: manifest.provenance.initializerArchive,
    };
    manifest.runtimeEquivalence = await ref(equivalence);
    const readEvidence = await evidenceReader(root, [root]);
    await validateHeadIdentity({ manifest, readEvidence, checkoutSha, checkoutRoot });
    equivalence.command.pop();
    manifest.runtimeEquivalence = await ref(equivalence);
    await assert.rejects(
      validateHeadIdentity({ manifest, readEvidence, checkoutSha, checkoutRoot }),
    );
    equivalence.command.push(RUNTIME_PATHS.at(-1));
    equivalence.engineArchive = await ref('different archive');
    manifest.runtimeEquivalence = await ref(equivalence);
    await assert.rejects(
      validateHeadIdentity({ manifest, readEvidence, checkoutSha, checkoutRoot }),
      /archive payload/,
    );
  }));

test('upgrade export rejects path traversal before invoking export or creating output', async () => {
  let invoked = false;
  const exportingEngine = {
    exportCandidate: async () => {
      invoked = true;
    },
  };
  for (const name of ['../escape.svg', '/escape.svg', '..', '.', 'directory/file.svg'])
    await assert.rejects(
      reproduceUpgradeExport(
        exportingEngine,
        '/consumer',
        'session',
        { name, candidateId: 'saved', theme: 'light' },
        Buffer.from('expected'),
      ),
      /portable basename/,
    );
  assert.equal(invoked, false);
});
