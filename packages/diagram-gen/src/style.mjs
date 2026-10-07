import { readFile, writeFile, mkdir, rename, rm, lstat, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { projectPath, loadProject } from './project.mjs';
import { safeRead } from './model.mjs';
import {
  canonicalHash,
  hashBytes,
  validatePalette,
  validateToneScheme,
  resolveToneContext,
} from './tone-context.mjs';
import { validateMaterializationKit, resolvePalette } from './materialize.mjs';

export class StyleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StyleError';
    this.code = code;
  }
}
const fail = (code, message) => {
  throw new StyleError(code, message);
};
const slug = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,126}[a-zA-Z0-9])?$/;
const hashPattern = /^[a-f0-9]{64}$/;
const jsonText = (value) => JSON.stringify(value, null, 2) + '\n';
const documentHash = (value) => {
  const copy = { ...value };
  delete copy.hash;
  return canonicalHash(copy);
};
export function validateCandidateProvenance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('candidate.provenance must be an object.');
  const allowed = ['styleRevision', 'styleHash', 'schemeHash', 'kitHash', 'paletteHash'];
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error('Unknown candidate provenance property.');
  for (const [key, item] of Object.entries(value))
    if (!(key === 'styleRevision' ? slug.test(item) : hashPattern.test(item)))
      throw new Error(`Invalid candidate provenance ${key}.`);
  return structuredClone(value);
}
export function styleProvenance(snapshot) {
  const { revision: styleRevision, schemeHash, kitHash, paletteHash } = snapshot.style;
  return { styleRevision, styleHash: snapshot.hash, schemeHash, kitHash, paletteHash };
}
export function reviewCompatibility(
  candidate,
  previous = {},
  { styleHash, placementHash, captureHash } = {},
) {
  const status = (saved, current) =>
    saved == null || current == null ? 'unknown' : saved === current ? 'current' : 'stale';
  return {
    artwork: status(previous.fingerprint, candidate.fingerprint),
    style: status(previous.styleHash, styleHash ?? candidate.provenance?.styleHash),
    placement: status(previous.placementHash, placementHash),
    capture: status(previous.captureHash, captureHash),
  };
}
function selectionEntries(selection) {
  if (
    !selection ||
    selection.schemaVersion !== 1 ||
    selection.kind !== 'explicit-selection' ||
    !['test', 'user'].includes(selection.purpose) ||
    !Array.isArray(selection.baselines) ||
    !selection.baselines.length
  )
    fail(
      'VALIDATION_FAILED',
      'Supply schemaVersion 1 explicit-selection with purpose test or user and nonempty baselines; browser preferences are not selections.',
    );
  const seen = new Set();
  for (const entry of selection.baselines) {
    if (
      !entry ||
      !slug.test(entry.sessionId ?? '') ||
      !slug.test(entry.candidateId ?? '') ||
      !hashPattern.test(entry.fingerprint ?? '') ||
      Object.keys(entry).some(
        (key) => !['sessionId', 'candidateId', 'fingerprint'].includes(key),
      ) ||
      seen.has(entry.sessionId)
    )
      fail(
        'VALIDATION_FAILED',
        'Selection requires one exact session-qualified candidate/fingerprint per applicable session.',
      );
    seen.add(entry.sessionId);
  }
  return structuredClone(selection.baselines);
}
function validateBaselines(style, sessions) {
  for (const baseline of style.baselines) {
    const entry = sessions.find((item) => item.id === baseline.sessionId);
    const candidate = entry?.data?.candidates.find((item) => item.id === baseline.candidateId);
    if (!candidate || entry.status !== 'valid')
      fail(
        'VALIDATION_FAILED',
        `Baseline ${baseline.sessionId}/${baseline.candidateId} is not a current registered candidate.`,
      );
    if (candidate.fingerprint !== baseline.fingerprint)
      fail(
        'STALE_INPUT',
        `Baseline fingerprint changed: ${baseline.sessionId}/${baseline.candidateId}.`,
      );
    if (candidate.toneId !== style.toneId)
      fail('VALIDATION_FAILED', `Baseline tone differs from ${style.toneId}.`);
    const target = style.targets.find((item) => item.sessionId === baseline.sessionId);
    if (
      !target ||
      target.width !== entry.data.session.target.width ||
      target.height !== entry.data.session.target.height
    )
      fail('STALE_INPUT', `Style target conflicts with session ${baseline.sessionId}.`);
  }
}
/** Read only saved constituents: installed catalog upgrades never participate. */
export async function readStyleRevision(root, revision, { expectedHash, sessions } = {}) {
  if (!slug.test(revision ?? '')) fail('INVALID_ARGUMENT', 'Revision must be a URL-safe slug.');
  const directory = `styles/${revision}`;
  for (const file of ['style.json', 'scheme.json', 'palette.json', 'kit.svg'])
    await projectPath(root, `${directory}/${file}`);
  const readJson = async (name) =>
    JSON.parse(
      (await safeRead(await realpath(resolve(root)), `${directory}/${name}`)).replace(
        /^\uFEFF/,
        '',
      ),
    );
  const style = await readJson('style.json');
  if (style.schemaVersion !== 1 || style.revision !== revision)
    fail('VALIDATION_FAILED', 'Style snapshot version/revision mismatch.');
  const scheme = await readJson('scheme.json'),
    paletteDocument = await readJson('palette.json');
  const kit = await safeRead(await realpath(resolve(root)), `${directory}/kit.svg`, {
    limit: 16 * 1024 * 1024,
  });
  if (
    style.schemeHash !== documentHash(scheme) ||
    style.paletteHash !== documentHash(paletteDocument) ||
    style.kitHash !== hashBytes(kit)
  )
    fail('VALIDATION_FAILED', 'Style constituent hash mismatch.');
  const hash = documentHash(style);
  if (expectedHash !== undefined && expectedHash !== hash)
    fail('VALIDATION_FAILED', 'Style reference hash mismatch.');
  validateToneScheme(scheme, {
    toneId: style.toneId,
    toneRevision: style.toneRevision,
    collectionVersion: style.collectionVersion,
  });
  if (paletteDocument.schemaVersion !== 1)
    fail('VALIDATION_FAILED', 'Unsupported style palette version.');
  const palette = { light: paletteDocument.light, dark: paletteDocument.dark };
  if (Object.keys(paletteDocument).some((key) => !['schemaVersion', 'light', 'dark'].includes(key)))
    fail('VALIDATION_FAILED', 'Unknown palette snapshot property.');
  validatePalette(palette);
  validateMaterializationKit(kit, scheme);
  if (
    !slug.test(style.toneId ?? '') ||
    typeof style.toneRevision !== 'string' ||
    !style.toneRevision.trim() ||
    typeof style.collectionVersion !== 'string' ||
    !style.collectionVersion.trim()
  )
    fail('VALIDATION_FAILED', 'Style tone identities are required.');
  selectionEntries({
    schemaVersion: 1,
    kind: 'explicit-selection',
    purpose: style.selectionPurpose,
    baselines: style.baselines,
  });
  if (
    !Array.isArray(style.targets) ||
    style.targets.length !== style.baselines.length ||
    style.targets.some(
      (target) =>
        !slug.test(target.sessionId ?? '') ||
        !Number.isFinite(target.width) ||
        !Number.isFinite(target.height) ||
        target.width <= 0 ||
        target.height <= 0,
    ) ||
    new Set(style.targets.map((item) => item.sessionId)).size !== style.targets.length
  )
    fail(
      'VALIDATION_FAILED',
      'Style targets require unique session-qualified positive dimensions.',
    );
  if (canonicalHash(style.typography) !== canonicalHash(scheme.typography))
    fail('VALIDATION_FAILED', 'Style typography conflicts with saved scheme.');
  if (
    style.targets.some(
      (target) => !style.baselines.some((baseline) => baseline.sessionId === target.sessionId),
    )
  )
    fail('VALIDATION_FAILED', 'Style target has no explicit baseline.');
  if (sessions) validateBaselines(style, sessions);
  return { style, scheme, palette, kit, hash };
}
async function operation(root, action) {
  root = await realpath(resolve(root));
  const lock = await projectPath(root, '.style-operation');
  try {
    await mkdir(lock);
  } catch (error) {
    if (error.code === 'EEXIST')
      fail(
        'OUTPUT_CONFLICT',
        'A style operation is active or interrupted (.style-operation); preserve it for diagnosis before explicit recovery.',
      );
    throw error;
  }
  try {
    return await action(root);
  } finally {
    await rm(lock, { recursive: true });
  }
}
async function updateManifest(root, before, project) {
  if (!(await readFile(await projectPath(root, 'project.json'))).equals(before))
    fail('OUTPUT_CONFLICT', 'Project manifest changed during style operation.');
  const temporary = await projectPath(root, `.style-project-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, jsonText(project), { flag: 'wx' });
    if (!(await readFile(await projectPath(root, 'project.json'))).equals(before))
      fail('OUTPUT_CONFLICT', 'Project manifest changed during style operation.');
    await rename(temporary, join(root, 'project.json'));
  } finally {
    await rm(temporary, { force: true });
  }
}
/** Initial lock adopts once; subsequent revisions remain pending until explicit adoption. */
export async function lockProjectStyle(
  root,
  { toneId, palette, selection, revision, toneRoot } = {},
) {
  return operation(root, async (root) => {
    if (!slug.test(revision ?? '')) fail('INVALID_ARGUMENT', 'Revision must be a URL-safe slug.');
    const before = await readFile(await projectPath(root, 'project.json'));
    const data = await loadProject(root, { strict: true });
    const baselines = selectionEntries(selection);
    const context = await resolveToneContext(toneId, { toneRoot });
    if (!context.scheme || !context.kit)
      fail('VALIDATION_FAILED', 'Lock requires a complete tone scheme and kit.');
    const resolved = resolvePalette(context.scheme, palette);
    validateMaterializationKit(context.kit.text, context.scheme);
    const targets = baselines.map(({ sessionId }) => {
      const target = data.sessions.find((entry) => entry.id === sessionId)?.data?.session.target;
      if (!target) fail('VALIDATION_FAILED', `Unknown selected session ${sessionId}.`);
      return { sessionId, width: target.width, height: target.height };
    });
    const paletteDocument = { schemaVersion: 1, ...resolved };
    const style = {
      schemaVersion: 1,
      revision,
      toneId,
      toneRevision: context.scheme.toneRevision,
      collectionVersion: context.scheme.collectionVersion,
      schemeHash: documentHash(context.scheme),
      kitHash: hashBytes(context.kit.text),
      paletteHash: documentHash(paletteDocument),
      targets,
      typography: structuredClone(context.scheme.typography),
      baselines,
      selectionPurpose: selection.purpose,
    };
    validateBaselines(style, data.sessions);
    const final = await projectPath(root, `styles/${revision}`);
    try {
      await lstat(final);
      fail(
        'OUTPUT_CONFLICT',
        'Style revision already exists, including partial/interrupted revisions; never overwrite it.',
      );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await mkdir(await projectPath(root, 'styles'), { recursive: true });
    const staged = await projectPath(root, `styles/.stage-${revision}-${randomUUID()}`);
    await mkdir(staged);
    // Staging and partial revisions survive interruption for diagnosis.
    for (const [name, content] of Object.entries({
      'style.json': jsonText(style),
      'scheme.json': jsonText(context.scheme),
      'palette.json': jsonText(paletteDocument),
      'kit.svg': context.kit.text,
    }))
      await writeFile(join(staged, name), content, { flag: 'wx' });
    if (!(await readFile(await projectPath(root, 'project.json'))).equals(before))
      fail('OUTPUT_CONFLICT', 'Project manifest changed during style operation.');
    await rename(staged, final);
    const reference = {
      revision,
      path: `styles/${revision}/style.json`,
      hash: documentHash(style),
    };
    if (!data.project.style)
      await updateManifest(root, before, { ...data.project, style: reference });
    return { reference, adopted: !data.project.style, selectionPurpose: selection.purpose };
  });
}
export async function adoptProjectStyle(root, { revision } = {}) {
  return operation(root, async (root) => {
    const before = await readFile(await projectPath(root, 'project.json'));
    const data = await loadProject(root, { strict: true });
    const snapshot = await readStyleRevision(root, revision, { sessions: data.sessions });
    const reference = { revision, path: `styles/${revision}/style.json`, hash: snapshot.hash };
    await updateManifest(root, before, { ...data.project, style: reference });
    return { reference, adopted: true, selectionPurpose: snapshot.style.selectionPurpose };
  });
}
