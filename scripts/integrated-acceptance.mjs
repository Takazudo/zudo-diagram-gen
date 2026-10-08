import assert from 'node:assert/strict';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const SESSION_IDS = [
  'reservation-flow',
  'empty-seats',
  'long-labels',
  'pending-queue',
  'return-items',
];
export const TONE_IDS = [
  'fine-outline',
  'soft-fill',
  'ui-miniature',
  'swiss-grid',
  'contour-wash',
  'paper-layers',
  'pencil-notebook',
  'isometric-solid',
];
export const INITIAL_TONES = ['fine-outline', 'soft-fill', 'swiss-grid'];
export const GATE_ASSERTIONS = {
  trial: ['initial-15', 'second-round-40', 'actual-inspections', 'preserved-corrections'],
  'catalog-offline': [
    '24-complete-contexts',
    '98-local-references',
    '72-descriptor-reads',
    '48-materializations',
  ],
  'browser-project': [
    'eight-exact-comparisons',
    'duplicate-tone-identity',
    'no-implicit-adoption',
    'partial-recovery',
  ],
  'browser-matrix': [
    'single-project',
    'standalone-embedded',
    'keyboard-focus',
    'filter-search-inspect',
    'placement-zoom-pan-reset',
    'theme-isolation',
    'notes-cursor',
    'persistence-storage-failure',
    'copy-download-import',
    'foreign-stale-duplicate',
    'dispose-remount',
    'desktop-narrow-diagnostics',
  ],
  watcher: [
    'candidate-add-edit-remove-readd',
    'brief-edit',
    'placement-image-edit',
    'round-style-edit',
    'project-registration',
    'invalid-valid-siblings',
  ],
  'review-resume': ['actual-download', 'exact-resume-records', 'test-selection'],
  refinement: [
    'saved-baseline-bytes',
    'earlier-round-lineage',
    'feedback-retained',
    'later-locked-kit-diagram',
  ],
  'immutable-lock': [
    'explicit-test-lock',
    'old-revision-unchanged',
    'new-revision-pending',
    'explicit-adoption',
  ],
  'installed-catalog-upgrade': [
    'separate-installed-catalog',
    'changed-context',
    'old-lock-unchanged',
    'old-exports-unchanged',
    'saved-kit-materialization',
  ],
  'exact-exports': ['light-dark-bytes', 'single-project-html', 'no-private-absolute-paths'],
  'detached-single': [
    'source-away',
    'server-stopped',
    'network-blocked',
    'file-transport',
    'review-interactions',
    'exact-svg-download',
  ],
  'detached-project': [
    'source-away',
    'server-stopped',
    'network-blocked',
    'file-transport',
    'eight-comparisons',
    'review-interactions',
    'exact-svg-download',
  ],
  'no-browser': [
    'separate-consumer',
    'check',
    'tone-context',
    'svg-html-export',
    'capture-exit-3',
    'actionable-capability-error',
    'no-implicit-install',
  ],
  containment: [
    'installed-realpath',
    'resource-output-safety',
    'private-path-scan',
    'interrupted-no-overwrite',
  ],
  'root-regressions': [
    'format',
    'lint',
    'types',
    'unit',
    'examples',
    'build',
    'links',
    'legacy-fingerprints',
  ],
  'consumer-regressions': [
    'fresh-engine-initializer',
    'zfb3-host',
    'zfb2-host',
    'dev-build-preview',
    'single-project',
  ],
  ci: ['exact-head', 'pinned-browser', 'deterministic-trial', 'detached-single-project'],
};

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const contained = (root, file) => {
  const relative = path.relative(root, file);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
};
const key = (item) => `${item.sessionId}/${item.candidateId}`;
const json = (bytes) => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));

export async function installedEngine(consumerRoot, modulePath, checkoutRoot) {
  const root = await realpath(consumerRoot);
  const modules = await realpath(path.join(root, 'node_modules'));
  const file = await realpath(modulePath);
  assert.ok(
    contained(root, modules) && contained(modules, file),
    'Installed engine must resolve inside this consumer node_modules.',
  );
  assert.ok(
    !contained(await realpath(checkoutRoot), file),
    'Installed engine cannot resolve into the checkout.',
  );
  const engine = await import(pathToFileURL(file));
  const packageMetadata = json(
    await readFile(path.join(path.dirname(path.dirname(file)), 'package.json')),
  );
  assert.equal(packageMetadata.name, '@takazudo/zudo-diagram-gen');
  return { engine, modulePath: file, consumerRoot: root, packageVersion: packageMetadata.version };
}

export async function evidenceReader(base, roots) {
  const allowed = await Promise.all(roots.map((root) => realpath(root)));
  return async (ref, limit = 64 * 1024 * 1024) => {
    assert.ok(
      ref && typeof ref.path === 'string' && sha(ref.sha256),
      'Evidence requires path and SHA-256.',
    );
    const file = await realpath(path.resolve(base, ref.path));
    assert.ok(
      allowed.some((root) => contained(root, file)),
      `Evidence escapes allowed roots: ${ref.path}`,
    );
    const info = await stat(file);
    assert.ok(
      info.isFile() && info.size <= limit,
      `Evidence must be a bounded regular file: ${ref.path}`,
    );
    const bytes = await readFile(file);
    assert.ok(
      bytes.length <= limit && sha256(bytes) === ref.sha256,
      `Evidence hash mismatch: ${ref.path}`,
    );
    return bytes;
  };
}

export async function validateAcceptance({ manifest, project, engine, readEvidence, publicRoot }) {
  const diagnostics = [];
  const inspectionRefs = new Set();
  const check = async (id, run) => {
    try {
      await run();
    } catch (error) {
      diagnostics.push({ id, message: error.message });
    }
  };
  await check('manifest', () => {
    assert.equal(manifest.schemaVersion, 1);
    assert.match(manifest.integratedSha, /^[a-f0-9]{40}$/);
    assert.equal(manifest.purpose, 'test');
    assert.equal(manifest.userApproval, false);
    for (const field of ['inputs', 'candidates', 'comparisons', 'gates'])
      assert.ok(Array.isArray(manifest[field]), `${field} must be an array.`);
  });
  if (diagnostics.length) return result();
  await check('provenance', async () => {
    const p = manifest.provenance;
    assert.equal(p.hostMechanism, 'explicit-installed-skill-files');
    assert.match(p.node, /^v?(22|23|24)\./);
    assert.equal(p.pnpm, '10.30.3');
    for (const name of ['engine', 'initializer'])
      assert.match(
        p.packageVersions?.[name],
        /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/,
        `Record actual ${name} package version.`,
      );
    assert.ok(p.os && p.browser && Array.isArray(p.fonts) && p.fonts.length);
    for (const name of ['engineArchive', 'initializerArchive', 'skillLoading'])
      await readEvidence(p[name]);
    assert.equal(new Set(p.authors.map((author) => author.toneId)).size, 8);
    assert.equal(p.authors.length, 8);
    assert.equal(
      new Set(p.authors.map((author) => author.authorId)).size,
      8,
      'Each tone must have its own recorded author.',
    );
    for (const toneId of TONE_IDS) {
      const author = p.authors.find((item) => item.toneId === toneId);
      assert.ok(author?.model && author.authorId, `Missing actual author for ${toneId}.`);
      await readEvidence(author.transcript);
    }
  });
  await check('inputs', async () => {
    assert.equal(
      new Set(manifest.inputs.map((input) => input.sessionId)).size,
      manifest.inputs.length,
    );
    const expected = json(await readFile(path.join(publicRoot, 'inputs.json')));
    for (const brief of expected.briefs) {
      const input = manifest.inputs.find((item) => item.sessionId === brief.id);
      const session = project.sessions.find((item) => item.id === brief.id);
      assert.ok(input && session?.status === 'valid', `Missing public input/session ${brief.id}.`);
      for (const name of ['brief', 'placement', 'checklist']) {
        const bytes = await readEvidence(input[name]);
        assert.equal(
          sha256(bytes),
          sha256(await readFile(path.join(publicRoot, brief[name]))),
          `Changed P00 ${brief.id}/${name}.`,
        );
      }
      const original = json(await readFile(path.join(publicRoot, brief.session)));
      assert.deepEqual(session.data.session.target, original.target);
      assert.equal(session.data.brief, (await readEvidence(input.brief)).toString('utf8'));
      assert.deepEqual(session.data.placement, json(await readEvidence(input.placement)));
    }
    assert.equal(
      sha256(await readEvidence(manifest.palette)),
      sha256(await readFile(path.join(publicRoot, expected.palette))),
    );
  });
  const byKey = new Map();
  await check('candidate-identities', () => {
    for (const candidate of manifest.candidates) {
      assert.ok(!byKey.has(key(candidate)), `Duplicate candidate evidence ${key(candidate)}.`);
      byKey.set(key(candidate), candidate);
    }
    const actual = project.sessions.flatMap((session) =>
      (session.data?.candidates ?? []).map((candidate) => `${session.id}/${candidate.id}`),
    );
    assert.deepEqual(
      [...byKey.keys()].sort(),
      actual.sort(),
      'Manifest must cover all saved candidates, including corrections and later diagrams.',
    );
    for (const sessionId of SESSION_IDS)
      for (const [roundId, tones] of [
        ['r01', INITIAL_TONES],
        ['r02', TONE_IDS],
      ]) {
        for (const toneId of tones) {
          const candidate = byKey.get(`${sessionId}/${roundId}-${toneId}`);
          assert.ok(
            candidate && candidate.roundId === roundId && candidate.toneId === toneId,
            `Missing original ${sessionId}/${roundId}-${toneId}.`,
          );
        }
      }
    assert.ok(project.sessions.length >= 6, 'A later ordinary diagram is required.');
  });
  for (const candidate of manifest.candidates)
    await check(`candidate:${key(candidate)}`, async () => {
      const session = project.sessions.find((item) => item.id === candidate.sessionId);
      const saved = session?.data?.candidates.find((item) => item.id === candidate.candidateId);
      assert.ok(saved, 'Candidate is absent from installed project.');
      for (const name of ['toneId', 'roundId', 'fingerprint'])
        assert.equal(candidate[name], saved[name], `Stale ${name}.`);
      assert.equal(
        candidate.styleHash ?? null,
        saved.provenance?.styleHash ?? null,
        'Stale candidate style provenance.',
      );
      assert.equal(candidate.parentId ?? null, saved.parentCandidateId);
      const disposition = candidate.disposition ?? { status: 'accepted' };
      assert.ok(
        ['accepted', 'superseded'].includes(disposition.status),
        'Candidate must be accepted or explicitly superseded.',
      );
      if (disposition.status === 'superseded') {
        const replacement = byKey.get(`${session.id}/${disposition.replacement?.candidateId}`);
        let ancestor = replacement;
        const visited = new Set();
        while (
          ancestor &&
          ancestor.candidateId !== saved.id &&
          !visited.has(ancestor.candidateId)
        ) {
          visited.add(ancestor.candidateId);
          ancestor = byKey.get(`${session.id}/${ancestor.parentId}`);
        }
        assert.ok(
          replacement &&
            replacement.fingerprint === disposition.replacement.fingerprint &&
            replacement.toneId === saved.toneId &&
            ancestor?.candidateId === saved.id &&
            (replacement.disposition?.status ?? 'accepted') === 'accepted',
          'Superseded candidate needs an accepted exact later descendant.',
        );
        assert.ok(
          typeof disposition.reason === 'string' && disposition.reason.trim(),
          'Supersession needs preserved failure/correction reason.',
        );
      }
      if (saved.parentCandidateId) {
        const parent = session.data.candidates.find((item) => item.id === saved.parentCandidateId);
        const rounds = session.data.rounds;
        assert.ok(
          rounds.find((r) => r.id === parent.roundId).order <
            rounds.find((r) => r.id === saved.roundId).order,
          'Parent must be in an earlier round.',
        );
      }
      const placement = await engine.loadPlacement(
        manifest.provenance.consumerRoot,
        session.data.session.target,
        {
          placement: project.project.sessions.find((item) => item.id === session.id).placement,
        },
      );
      for (const theme of ['light', 'dark']) {
        const assets = candidate.themes?.[theme];
        assert.ok(assets && saved.assets[theme], `Missing ${theme} evidence or SVG.`);
        assert.equal(
          (await readEvidence(assets.svg)).toString('utf8'),
          saved.assets[theme],
          'SVG evidence differs from installed saved source.',
        );
        const png = await readEvidence(assets.capture);
        assert.ok(
          png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
          'Capture must be a PNG.',
        );
        const capture = json(await readEvidence(assets.sidecar));
        assert.equal(capture.schemaVersion, 1);
        for (const [name, value] of Object.entries({
          sessionId: session.id,
          candidateId: saved.id,
          fingerprint: saved.fingerprint,
          theme,
          assetHash: assets.svg.sha256,
          imageHash: assets.capture.sha256,
          placementHash: placement.placementHash,
          styleHash: candidate.styleHash ?? null,
          inspected: false,
        }))
          assert.equal(capture[name], value, `Capture ${name} is stale or invalid.`);
        assert.deepEqual(capture.frame, placement.descriptor.frame);
        assert.deepEqual(capture.slot, placement.descriptor.slot);
        assert.equal(capture.crop, 'frame');
        assert.ok(Number.isFinite(capture.dpr) && capture.dpr >= 0.5 && capture.dpr <= 4);
        assert.deepEqual(capture.viewport, {
          width: Math.ceil(capture.frame.width),
          height: Math.ceil(capture.frame.height),
        });
        assert.equal(capture.browser?.name, 'chromium');
        assert.ok(typeof capture.browser.version === 'string' && capture.browser.version.trim());
        assert.ok(typeof capture.environment?.os === 'string' && capture.environment.os.trim());
        for (const family of placement.descriptor.fonts)
          assert.ok(
            capture.environment.fonts.some((font) => font.family === family && font.ready === true),
            `Missing declared font readiness ${family}.`,
          );
        assert.ok(
          Math.abs(capture.pixelDimensions.width - capture.frame.width * capture.dpr) <= 1 &&
            Math.abs(capture.pixelDimensions.height - capture.frame.height * capture.dpr) <= 1,
          'PNG dimensions must match actual full-frame DPR.',
        );
        assert.equal(capture.pixelDimensions.width, png.readUInt32BE(16));
        assert.equal(capture.pixelDimensions.height, png.readUInt32BE(20));
        const { captureHash, ...captureFields } = capture;
        assert.equal(captureHash, engine.canonicalHash({ ...captureFields, capturedAt: null }));
        assert.ok(!inspectionRefs.has(assets.inspection.path), 'Duplicate inspection file.');
        const inspection = json(await readEvidence(assets.inspection));
        for (const [name, value] of Object.entries({
          schemaVersion: 1,
          sessionId: session.id,
          candidateId: saved.id,
          fingerprint: saved.fingerprint,
          theme,
          svgHash: assets.svg.sha256,
          pngHash: assets.capture.sha256,
          placementHash: placement.placementHash,
          styleHash: capture.styleHash,
          actuallyOpened: true,
        }))
          assert.equal(inspection[name], value, `Inspection ${name} is stale or invalid.`);
        assert.ok(
          typeof inspection.toolCallReference === 'string' && inspection.toolCallReference.trim(),
        );
        assert.ok(
          [1, 2, 3, 4].includes(inspection.readability) &&
            [1, 2, 3, 4].includes(inspection.character),
          'Inspection requires integer rubric scores.',
        );
        assert.ok(Array.isArray(inspection.factualViolations));
        if (disposition.status === 'accepted') {
          assert.ok(
            inspection.readability >= 3 && inspection.character >= 3,
            'Inspection fails readability/character threshold.',
          );
          assert.deepEqual(
            inspection.factualViolations,
            [],
            'Accepted artwork has factual violations.',
          );
        }
        assert.ok(
          Array.isArray(inspection.observations) &&
            inspection.observations.some((text) => typeof text === 'string' && text.trim()),
        );
        inspectionRefs.add(assets.inspection.path);
      }
    });
  await check('comparisons', () => {
    assert.ok(manifest.comparisons.length, 'Final project requires explicit valid comparisons.');
    assert.equal(
      new Set(manifest.comparisons.map((set) => set.id)).size,
      manifest.comparisons.length,
    );
    for (const set of manifest.comparisons) {
      const toneId = set.toneId;
      const actual = project.comparisonSets.find((item) => item.id === set?.id);
      assert.ok(
        actual?.ok && actual.toneId === toneId,
        `Missing current exact comparison ${toneId}.`,
      );
      assert.deepEqual(
        set.candidates,
        actual.entries.map(({ sessionId, candidateId, fingerprint }) => ({
          sessionId,
          candidateId,
          fingerprint,
        })),
      );
      assert.equal(
        set.candidates.length,
        project.sessions.length,
        'Comparison must explicitly cover later sessions.',
      );
    }
  });
  await check('workflow', async () => {
    const { validateWorkflowEvidence } = await import('./integrated-workflow-evidence.mjs');
    await validateWorkflowEvidence({
      workflow: manifest.workflow,
      project,
      engine,
      readEvidence,
      consumerRoot: manifest.provenance.consumerRoot,
      checkoutRoot: path.resolve(publicRoot, '../../..'),
    });
  });
  const gateRows = [];
  await check('gate-identities', () => {
    assert.equal(
      new Set(manifest.gates.map((gate) => gate.id)).size,
      manifest.gates.length,
      'Duplicate gate.',
    );
    for (const gate of manifest.gates)
      assert.ok(Object.hasOwn(GATE_ASSERTIONS, gate.id), `Unknown gate ${gate.id}.`);
  });
  for (const [id, assertionIds] of Object.entries(GATE_ASSERTIONS)) {
    const gate = manifest.gates.find((item) => item.id === id);
    const before = diagnostics.length;
    await check(`gate:${id}`, async () => {
      assert.ok(gate, `Missing required gate ${id}.`);
      assert.ok(['pass', 'fail', 'deferred'].includes(gate.status));
      assert.equal(gate.integratedSha, manifest.integratedSha, 'Gate SHA is stale.');
      assert.ok(
        Array.isArray(gate.evidence) && gate.evidence.length,
        'Gate must link actual structured execution evidence.',
      );
      const assertions = new Set();
      for (const ref of gate.evidence) {
        const record = json(await readEvidence(ref));
        assert.equal(record.schemaVersion, 1);
        assert.equal(record.gateId, id);
        assert.equal(record.integratedSha, manifest.integratedSha);
        assert.ok(
          (typeof record.command === 'string' && record.command.trim()) ||
            (Array.isArray(record.command) && record.command.length),
        );
        if (gate.status === 'pass')
          assert.equal(record.exitCode, 0, 'Passing gate requires successful command.');
        assert.ok(Array.isArray(record.assertions));
        if (record.commands) {
          const commands = json(await readEvidence(record.commands));
          assert.ok(
            Array.isArray(commands) && commands.length,
            'Linked command log must contain actual command records.',
          );
          for (const command of commands) {
            assert.ok(Array.isArray(command.command) && command.command.length);
            if (gate.status === 'pass')
              assert.equal(
                command.exitCode,
                command.expectedExitCode ?? 0,
                'Linked command outcome differs from expected exit.',
              );
          }
        }
        for (const assertion of record.assertions) {
          assert.ok(!assertions.has(assertion.id), `Duplicate assertion ${assertion.id}.`);
          assertions.add(assertion.id);
          if (gate.status === 'pass')
            assert.equal(assertion.passed, true, `Failed assertion ${assertion.id}.`);
          if (assertion.evidence) await readEvidence(assertion.evidence);
        }
      }
      if (gate.status === 'pass')
        for (const assertion of assertionIds)
          assert.ok(assertions.has(assertion), `Missing required assertion ${assertion}.`);
      else {
        assert.ok(
          typeof gate.reproduction === 'string' && gate.reproduction.trim(),
          'Failed/deferred gate needs reproduction.',
        );
        assert.match(
          gate.blockerIssue,
          /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/,
          'Failed/deferred gate needs linked blocker issue.',
        );
      }
    });
    gateRows.push({ id, status: diagnostics.length > before ? 'fail' : gate.status });
  }
  return result(gateRows);
  function result(gates = []) {
    return {
      schemaVersion: 1,
      integratedSha: manifest.integratedSha ?? null,
      status:
        diagnostics.length || gates.some((gate) => gate.status === 'fail')
          ? 'fail'
          : gates.some((gate) => gate.status === 'deferred')
            ? 'deferred'
            : 'pass',
      ok:
        diagnostics.length === 0 &&
        gates.length === Object.keys(GATE_ASSERTIONS).length &&
        gates.every((gate) => gate.status === 'pass'),
      counts: {
        candidates: manifest.candidates?.length ?? 0,
        inspectedViews: inspectionRefs?.size ?? 0,
      },
      gates,
      diagnostics,
      limitations: [
        'Hash checks bind supplied execution and inspection records; they do not independently establish that a model authored artwork, a browser executed commands, or an evaluator opened an image.',
        'All selections in this trial are test decisions, not user approval.',
      ],
    };
  }
}
