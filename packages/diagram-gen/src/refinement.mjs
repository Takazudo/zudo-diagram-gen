import { writeFile, mkdir, rename, rm, realpath } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadSession, safeRead } from './model.mjs';
import { projectPath } from './project.mjs';
import { hashBytes } from './tone-context.mjs';

/** Start from saved bytes; geometry/facts are preserved until an author explicitly edits the child. */
export async function createRefinement(
  root,
  { baselineCandidateId, fingerprint, roundId, candidateId, title, order = 0, feedback } = {},
) {
  root = await realpath(resolve(root));
  const data = await loadSession(root);
  const baseline = data.candidates.find((item) => item.id === baselineCandidateId);
  const round = data.rounds.find((item) => item.id === roundId);
  if (!baseline || baseline.fingerprint !== fingerprint)
    throw new Error('Name the current saved baseline ID and exact fingerprint.');
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(candidateId ?? '') ||
    data.candidates.some((item) => item.id === candidateId)
  )
    throw new Error('Refinement requires a new unique candidate ID.');
  if (
    !round ||
    round.order <= data.rounds.find((item) => item.id === baseline.roundId).order ||
    (round.baselineCandidateId && round.baselineCandidateId !== baseline.id)
  )
    throw new Error('Refinement requires a later round with compatible baseline.');
  if (typeof title !== 'string' || !title.trim() || !Number.isSafeInteger(order) || order < 0)
    throw new Error('Supply title and nonnegative integer order.');
  if (
    feedback !== undefined &&
    (!feedback || feedback.id !== baseline.id || feedback.fingerprint !== fingerprint)
  )
    throw new Error('Feedback must identify the actual saved baseline fingerprint.');
  const roundPath =
    data.candidates
      .find((item) => item.roundId === roundId)
      ?.sourcePath.split('/')
      .slice(0, 2)
      .join('/') ?? `rounds/${roundId}`;
  // Round IDs and folder names need not be identical; discover the actual round metadata path.
  const { readdir } = await import('node:fs/promises');
  let actualRound;
  for (const entry of await readdir(join(root, 'rounds'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = `rounds/${entry.name}/round.json`;
    await projectPath(root, path);
    if (JSON.parse(await safeRead(root, path)).id === roundId) actualRound = `rounds/${entry.name}`;
  }
  if (!actualRound) throw new Error(`Round ${roundPath} was removed.`);
  const final = await projectPath(root, `${actualRound}/${candidateId}`);
  const staged = await projectPath(root, `${actualRound}/.refinement-${randomUUID()}`);
  await mkdir(staged);
  try {
    const assets = {};
    for (const [theme, bytes] of Object.entries(baseline.assets)) {
      assets[theme] = `${theme}.svg`;
      await writeFile(join(staged, assets[theme]), bytes, { flag: 'wx' });
    }
    const candidate = {
      schemaVersion: 1,
      id: candidateId,
      title,
      toneId: baseline.toneId,
      description: baseline.description,
      order,
      parentCandidateId: baseline.id,
      assets,
      assetHashes: Object.fromEntries(
        Object.entries(baseline.assets).map(([theme, bytes]) => [theme, hashBytes(bytes)]),
      ),
      ...(baseline.provenance ? { provenance: baseline.provenance } : {}),
      ...(feedback ? { baselineFeedback: structuredClone(feedback) } : {}),
    };
    await writeFile(join(staged, 'candidate.json'), JSON.stringify(candidate, null, 2) + '\n', {
      flag: 'wx',
    });
    // Refuse existing or interrupted destination; concurrent cooperating writers reserve it exclusively.
    await mkdir(final);
    try {
      await rename(staged, final);
    } catch (error) {
      await rm(final);
      throw error;
    }
    return {
      candidateId,
      parentCandidateId: baseline.id,
      roundId,
      assetHashes: candidate.assetHashes,
    };
  } catch (error) {
    await rm(staged, { recursive: true, force: true });
    throw error;
  }
}
