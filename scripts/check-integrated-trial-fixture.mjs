import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as engine from '../packages/diagram-gen/src/index.mjs';
import { INITIAL_TONES, SESSION_IDS, TONE_IDS, sha256 } from './integrated-acceptance.mjs';

export async function checkTrialFixture(root, publicRoot) {
  const project = await engine.loadProject(root, { strict: true });
  assert.deepEqual(
    project.sessions.map((session) => session.id).sort(),
    [...SESSION_IDS].sort(),
    'Frozen sweep must preserve the five P00 registrations.',
  );
  const inputs = JSON.parse(await readFile(path.join(publicRoot, 'inputs.json'), 'utf8'));
  for (const source of inputs.briefs) {
    const session = project.sessions.find((item) => item.id === source.id);
    const descriptor = JSON.parse(await readFile(path.join(publicRoot, source.placement), 'utf8'));
    assert.deepEqual(session.data.placement, descriptor, 'Frozen source placement changed.');
    assert.equal(
      session.data.brief,
      (await readFile(path.join(publicRoot, source.brief))).toString('utf8'),
    );
    const expectedTarget = JSON.parse(
      await readFile(path.join(publicRoot, source.session), 'utf8'),
    ).target;
    assert.deepEqual(session.data.session.target, expectedTarget);
    for (const [roundId, tones] of [
      ['r01', INITIAL_TONES],
      ['r02', TONE_IDS],
    ])
      for (const toneId of tones) {
        const candidate = session.data.candidates.find(
          (item) => item.id === `${roundId}-${toneId}`,
        );
        assert.ok(candidate && candidate.roundId === roundId && candidate.toneId === toneId);
        assert.ok(
          candidate.assets.light && candidate.assets.dark,
          'Frozen original must preserve both actual themes.',
        );
      }
  }
  for (const toneId of TONE_IDS) {
    const set = project.comparisonSets.find((item) => item.toneId === toneId);
    assert.ok(
      set?.ok && set.entries.length === 5,
      'Frozen comparison must remain exact and complete.',
    );
  }
  const candidates = project.sessions.flatMap((session) =>
    session.data.candidates.map((candidate) => ({
      sessionId: session.id,
      candidateId: candidate.id,
      fingerprint: candidate.fingerprint,
      assets: Object.fromEntries(
        Object.entries(candidate.assets).map(([theme, text]) => [theme, sha256(text)]),
      ),
    })),
  );
  return {
    schemaVersion: 1,
    ok: true,
    status: 'pass',
    purpose: 'deterministic-saved-source-regression',
    modelCalls: 0,
    visualInspection: false,
    userApproval: false,
    candidates,
    comparisons: project.comparisonSets.map((set) => ({
      id: set.id,
      toneId: set.toneId,
      entries: set.entries.map(({ sessionId, candidateId, fingerprint }) => ({
        sessionId,
        candidateId,
        fingerprint,
      })),
    })),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const checkoutRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    assert.ok(
      process.argv.length <= 3,
      'Usage: node scripts/check-integrated-trial-fixture.mjs [frozen-sweep-root]',
    );
    const root = process.argv[2]
      ? path.resolve(process.argv[2])
      : path.join(checkoutRoot, 'docs/agent-first/trial/sources');
    console.log(
      JSON.stringify(
        await checkTrialFixture(root, path.join(checkoutRoot, 'docs/agent-first/evaluation')),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
