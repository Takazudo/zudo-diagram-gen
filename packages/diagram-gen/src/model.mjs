import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SaxesParser } from 'saxes';
import { resolveToneResources } from './tone-context.mjs';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SLUG = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;
const PACKAGE_TONES = fileURLToPath(new URL('../tones/', import.meta.url));
const MAX_METADATA_BYTES = 1024 * 1024;
const MAX_SVG_BYTES = 16 * 1024 * 1024;

/** A validation failure includes all findings, so one correction pass can fix them. */
export class SessionValidationError extends Error {
  constructor(errors, warnings = []) {
    super(`Session validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    this.name = 'SessionValidationError';
    this.errors = errors;
    this.warnings = warnings;
  }
}

const slash = (value) => value.split(path.sep).join('/');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const contains = (root, file) => {
  const relative = path.relative(root, file);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
};

function relativeFile(value, label) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.includes('\0') ||
    value.includes('\\') ||
    /^[a-zA-Z]:/.test(value) ||
    path.isAbsolute(value)
  ) {
    throw new Error(`${label}: expected a relative file path using forward slashes.`);
  }
  if (value.split('/').some((part) => part === '..' || part === '.' || part === '')) {
    throw new Error(`${label}: empty, ".", and ".." path segments are not allowed.`);
  }
  return value;
}

export async function safeRead(
  root,
  relative,
  { limit = MAX_METADATA_BYTES, label = relative } = {},
) {
  relativeFile(relative, label);
  const requested = path.resolve(root, relative);
  const real = await fs.realpath(requested).catch(async (error) => {
    if (error.code === 'ENOENT') {
      // Even an optional absent leaf may sit below an escaping symlink. Check
      // the nearest existing ancestor before reporting a harmless missing file.
      let ancestor = path.dirname(requested);
      while (true) {
        try {
          const parent = await fs.realpath(ancestor);
          if (!contains(root, parent))
            throw new Error(
              `${label}: file resolves outside its permitted directory, possibly through a symlink.`,
            );
          break;
        } catch (parentError) {
          if (parentError.code !== 'ENOENT') throw parentError;
          const entry = await fs.lstat(ancestor).catch((missing) => {
            if (missing.code !== 'ENOENT') throw missing;
            return null;
          });
          if (entry?.isSymbolicLink())
            throw new Error(`${label}: unresolved symlink in resource path.`);
          const next = path.dirname(ancestor);
          if (next === ancestor) throw parentError;
          ancestor = next;
        }
      }
      throw new Error(`${label}: file does not exist.`);
    }
    throw new Error(`${label}: cannot resolve file (${error.code ?? error.message}).`);
  });
  if (!contains(root, real))
    throw new Error(
      `${label}: file resolves outside its permitted directory, possibly through a symlink.`,
    );
  // Open the resolved path without following a final symlink. Parent containment is
  // checked above; this also avoids accidentally reading a replaced final symlink.
  const handle = await fs.open(real, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error(`${label}: expected a regular file.`);
    if (stat.size > limit)
      throw new Error(`${label}: exceeds the ${Math.floor(limit / 1024 / 1024)} MiB file limit.`);
    const buffer = await handle.readFile();
    if (buffer.length > limit) throw new Error(`${label}: exceeds the file size limit.`);
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      throw new Error(`${label}: must be valid UTF-8.`);
    }
    // Buffer decoding preserves an optional BOM and original line endings, making
    // export an exact copy of the validated source text.
    return buffer.toString('utf8');
  } finally {
    await handle.close();
  }
}

async function readJson(root, relative, errors) {
  try {
    const text = await safeRead(root, relative);
    try {
      return JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch {
      errors.push(`${relative}: invalid JSON.`);
    }
  } catch (error) {
    errors.push(error.message);
  }
  return null;
}

function object(value, label, errors) {
  if (!record(value)) {
    errors.push(`${label}: expected an object.`);
    return false;
  }
  return true;
}

function string(value, label, errors, { optional = false, empty = false } = {}) {
  if (optional && value === undefined) return;
  if (typeof value !== 'string' || (!empty && !value.trim()))
    errors.push(`${label}: expected ${empty ? 'a string' : 'a nonempty string'}.`);
}

function id(value, label, errors, optional = false) {
  if (optional && (value === undefined || value === null)) return;
  if (typeof value !== 'string' || value.length > 128 || !SLUG.test(value))
    errors.push(
      `${label}: expected a URL-safe ID of 1–128 letters, numbers, dots, hyphens, or underscores, starting and ending with a letter or number.`,
    );
}

function version(value, label, errors) {
  if (value !== 1) errors.push(`${label}: expected schemaVersion 1.`);
}

function order(value, label, errors) {
  if (!Number.isSafeInteger(value) || value < 0)
    errors.push(`${label}: expected a nonnegative integer.`);
}

function commonMetadata(value, label, errors) {
  version(value.schemaVersion, label, errors);
  id(value.id, `${label} id`, errors);
  string(value.title, `${label} title`, errors);
  string(value.description, `${label} description`, errors, { optional: true, empty: true });
}

function validateSessionMetadata(value, errors) {
  if (!object(value, 'session.json', errors)) return;
  commonMetadata(value, 'session.json', errors);
  if (object(value.target, 'session.json target', errors)) {
    for (const dimension of ['width', 'height']) {
      if (
        !Number.isFinite(value.target[dimension]) ||
        value.target[dimension] <= 0 ||
        value.target[dimension] > 20000
      ) {
        errors.push(
          `session.json target.${dimension}: expected a positive number no greater than 20000 CSS pixels.`,
        );
      }
    }
    string(value.target.label, 'session.json target.label', errors, { optional: true });
  }
  if (value.project !== undefined && object(value.project, 'session.json project', errors)) {
    string(value.project.name, 'session.json project.name', errors);
    string(value.project.reference, 'session.json project.reference', errors, { optional: true });
  }
  if (value.context !== undefined && object(value.context, 'session.json context', errors)) {
    string(value.context.title, 'session.json context.title', errors);
    string(value.context.body, 'session.json context.body', errors, { empty: true });
  }
  string(value.toneCollectionVersion, 'session.json toneCollectionVersion', errors, {
    optional: true,
  });
}

/** Validate standalone SVG structure and in-file references; no rendering claims. */
export function validateSvg(svg, label, errors, warnings) {
  const localErrors = [];
  const ids = new Set();
  const references = new Set();
  let depth = 0;
  let roots = 0;
  let title = false;
  let accessibleLabel = false;
  let styleDepth = -1;
  let styleText = '';

  function fragmentReference(value, context) {
    const reference = value.trim();
    if (reference.startsWith('#') && reference.length > 1) {
      references.add(reference.slice(1));
    } else if (/^data:image\/(?:png|jpeg|gif|webp);base64,[a-zA-Z0-9+/=\s]+$/i.test(reference)) {
      // Embedded raster images are self-contained. Embedded SVG and arbitrary
      // data URLs are excluded because their own resources cannot be checked here.
    } else {
      localErrors.push(
        `${context}: external or unsupported resource reference ${JSON.stringify(reference.slice(0, 120))}; use a local #id or an embedded raster image.`,
      );
    }
  }

  function cssReferences(value, context) {
    if (/@import\b/i.test(value))
      localErrors.push(`${context}: CSS @import is not self-contained.`);
    for (const match of value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)) {
      fragmentReference(match[1] ?? match[2] ?? match[3], context);
    }
  }

  try {
    const parser = new SaxesParser({ xmlns: true });
    parser.on('error', (error) => localErrors.push(`invalid XML (${error.message}).`));
    parser.on('doctype', () => localErrors.push('DOCTYPE declarations are not supported.'));
    parser.on('processinginstruction', (instruction) => {
      if (instruction.target.toLowerCase() !== 'xml')
        localErrors.push('processing instructions are not supported.');
    });
    parser.on('opentag', (tag) => {
      depth += 1;
      const attributes = Object.values(tag.attributes);
      if (depth === 1) {
        roots += 1;
        if (tag.local !== 'svg' || tag.uri !== SVG_NAMESPACE)
          localErrors.push('root must be <svg xmlns="http://www.w3.org/2000/svg">.');
        const viewBox = attributes.find((attribute) => attribute.name === 'viewBox')?.value;
        const parts = viewBox
          ?.trim()
          .split(/[\s,]+/)
          .map(Number);
        if (
          !parts ||
          parts.length !== 4 ||
          parts.some((part) => !Number.isFinite(part)) ||
          parts[2] <= 0 ||
          parts[3] <= 0
        ) {
          localErrors.push('root needs a numeric viewBox with positive width and height.');
        }
        accessibleLabel = attributes.some(
          (attribute) =>
            ['aria-label', 'aria-labelledby'].includes(attribute.name) && attribute.value.trim(),
        );
      }
      if (tag.uri !== SVG_NAMESPACE)
        localErrors.push(`element ${tag.name}: only SVG elements are supported.`);
      if (
        ['script', 'foreignobject', 'iframe', 'object', 'embed'].includes(tag.local.toLowerCase())
      )
        localErrors.push(`element ${tag.name} is not supported in standalone diagrams.`);
      if (tag.local === 'title') title = true;
      if (tag.local === 'style') {
        styleDepth = depth;
        styleText = '';
      }
      for (const attribute of attributes) {
        if (/^on[a-z]/i.test(attribute.name))
          localErrors.push(`event handler ${attribute.name} is not supported.`);
        if (attribute.name === 'id') {
          if (!attribute.value.trim() || /\s/.test(attribute.value))
            localErrors.push('IDs must be nonempty and contain no whitespace.');
          if (ids.has(attribute.value))
            localErrors.push(`duplicate SVG id ${JSON.stringify(attribute.value)}.`);
          ids.add(attribute.value);
        }
        if (attribute.local === 'href') fragmentReference(attribute.value, attribute.name);
        if (attribute.name === 'xml:base')
          localErrors.push('xml:base is not supported in self-contained diagrams.');
        if (['aria-labelledby', 'aria-describedby'].includes(attribute.name)) {
          for (const reference of attribute.value.trim().split(/\s+/))
            if (reference) references.add(reference);
        }
        cssReferences(attribute.value, attribute.name);
      }
    });
    parser.on('text', (text) => {
      if (styleDepth !== -1) styleText += text;
    });
    parser.on('cdata', (text) => {
      if (styleDepth !== -1) styleText += text;
    });
    parser.on('closetag', () => {
      if (styleDepth === depth) {
        cssReferences(styleText, 'style');
        styleDepth = -1;
      }
      depth -= 1;
    });
    parser.write(svg).close();
  } catch (error) {
    localErrors.push(`invalid XML (${error.message}).`);
  }
  if (roots !== 1) localErrors.push('expected exactly one SVG root.');
  for (const reference of references)
    if (!ids.has(reference)) localErrors.push(`reference #${reference} has no matching SVG id.`);
  for (const message of new Set(localErrors)) errors.push(`${label}: ${message}`);
  if (!title && !accessibleLabel)
    warnings.push(`${label}: add a <title> or root aria-label for standalone accessibility.`);
}

async function directories(root, relative, errors, { optional = false } = {}) {
  const requested = path.join(root, relative);
  let entries;
  try {
    const real = await fs.realpath(requested);
    if (!contains(root, real)) throw new Error('directory resolves outside the session.');
    entries = await fs.readdir(real, { withFileTypes: true });
  } catch (error) {
    if (optional && error.code === 'ENOENT') return [];
    errors.push(
      `${relative}: ${error.code === 'ENOENT' ? 'directory does not exist.' : error.message}`,
    );
    return [];
  }
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isSymbolicLink()) {
      errors.push(
        `${slash(path.join(relative, entry.name))}: symlink entries are not supported in the rounds tree.`,
      );
    } else if (entry.isDirectory()) {
      result.push(slash(path.join(relative, entry.name)));
    }
  }
  return result;
}

async function readAssets(root, candidateDirectory, metadata, label, errors, warnings) {
  const result = {};
  if (!object(metadata, `${label} assets`, errors)) return result;
  if (typeof metadata.light !== 'string' || !metadata.light)
    errors.push(`${label} assets.light: a relative SVG path is required.`);
  if (metadata.dark !== undefined && (typeof metadata.dark !== 'string' || !metadata.dark))
    errors.push(`${label} assets.dark: expected a relative SVG path.`);
  for (const theme of ['light', 'dark']) {
    const relative = metadata[theme];
    if (typeof relative !== 'string' || !relative) continue;
    const assetLabel = `${label} assets.${theme}`;
    try {
      relativeFile(relative, assetLabel);
      if (path.extname(relative).toLowerCase() !== '.svg')
        throw new Error(`${assetLabel}: expected a .svg file.`);
      const directory = await fs.realpath(path.join(root, candidateDirectory));
      if (!contains(root, directory))
        throw new Error(`${assetLabel}: candidate directory resolves outside the session.`);
      const text = await safeRead(directory, relative, {
        limit: MAX_SVG_BYTES,
        label: `${slash(path.join(candidateDirectory, relative))}`,
      });
      validateSvg(text, slash(path.join(candidateDirectory, relative)), errors, warnings);
      result[theme] = text;
    } catch (error) {
      errors.push(error.message);
    }
  }
  return result;
}

function normalizeSession(raw) {
  // Explicit projection keeps internal filesystem paths and unrecognized metadata
  // out of portable gallery exports.
  return {
    schemaVersion: 1,
    id: raw.id,
    title: raw.title,
    ...(raw.description !== undefined ? { description: raw.description } : {}),
    ...(raw.project
      ? {
          project: {
            name: raw.project.name,
            ...(raw.project.reference ? { reference: raw.project.reference } : {}),
          },
        }
      : {}),
    target: {
      width: raw.target.width,
      height: raw.target.height,
      ...(raw.target.label ? { label: raw.target.label } : {}),
    },
    ...(raw.context ? { context: { title: raw.context.title, body: raw.context.body } } : {}),
    ...(raw.toneCollectionVersion ? { toneCollectionVersion: raw.toneCollectionVersion } : {}),
  };
}

async function inspectSession(root) {
  const errors = [];
  const warnings = [];
  const rounds = [];
  const candidates = [];
  let realRoot;
  try {
    realRoot = await fs.realpath(path.resolve(root));
    if (!(await fs.stat(realRoot)).isDirectory()) throw new Error('expected a directory.');
  } catch (error) {
    return {
      errors: [`Session directory: ${error.code === 'ENOENT' ? 'does not exist.' : error.message}`],
      warnings,
      data: null,
      summary: { rounds: 0, candidates: 0, lightAssets: 0, darkAssets: 0 },
    };
  }
  const rawSession = await readJson(realRoot, 'session.json', errors);
  validateSessionMetadata(rawSession, errors);
  let brief = '';
  try {
    await fs.lstat(path.join(realRoot, 'brief.md'));
    brief = await safeRead(realRoot, 'brief.md');
  } catch (error) {
    if (error.code !== 'ENOENT') errors.push(error.message);
  }
  if (!brief.trim())
    warnings.push(
      'brief.md: no shared brief; record the diagram’s facts, labels, sources, and intended use before generating candidates.',
    );
  const roundDirectories = await directories(realRoot, 'rounds', errors, { optional: true });
  const roundIds = new Set();
  const roundOrders = new Set();
  const candidateIds = new Set();
  for (const roundDirectory of roundDirectories) {
    const roundPath = `${roundDirectory}/round.json`;
    const round = await readJson(realRoot, roundPath, errors);
    if (!object(round, roundPath, errors)) continue;
    commonMetadata(round, roundPath, errors);
    order(round.order, `${roundPath} order`, errors);
    id(round.baselineCandidateId, `${roundPath} baselineCandidateId`, errors, true);
    if (roundIds.has(round.id))
      errors.push(`${roundPath}: duplicate round id ${JSON.stringify(round.id)}.`);
    if (roundOrders.has(round.order))
      errors.push(
        `${roundPath}: round order ${round.order} is already used; each round needs a distinct order for lineage.`,
      );
    roundIds.add(round.id);
    roundOrders.add(round.order);
    rounds.push({
      id: round.id,
      title: round.title,
      description: round.description ?? '',
      order: round.order,
      baselineCandidateId: round.baselineCandidateId ?? null,
    });
    const candidateDirectories = await directories(realRoot, roundDirectory, errors);
    for (const candidateDirectory of candidateDirectories) {
      const sourcePath = `${candidateDirectory}/candidate.json`;
      const candidate = await readJson(realRoot, sourcePath, errors);
      if (!object(candidate, sourcePath, errors)) continue;
      commonMetadata(candidate, sourcePath, errors);
      id(candidate.toneId, `${sourcePath} toneId`, errors);
      order(candidate.order, `${sourcePath} order`, errors);
      id(candidate.parentCandidateId, `${sourcePath} parentCandidateId`, errors, true);
      if (candidateIds.has(candidate.id))
        errors.push(`${sourcePath}: duplicate candidate id ${JSON.stringify(candidate.id)}.`);
      candidateIds.add(candidate.id);
      const assets = await readAssets(
        realRoot,
        candidateDirectory,
        candidate.assets,
        sourcePath,
        errors,
        warnings,
      );
      const normalized = {
        id: candidate.id,
        roundId: round.id,
        title: candidate.title,
        toneId: candidate.toneId,
        description: candidate.description ?? '',
        order: candidate.order,
        parentCandidateId: candidate.parentCandidateId ?? null,
        sourcePath,
        assets,
      };
      candidates.push({ ...normalized, fingerprint: hash(JSON.stringify(normalized)) });
    }
  }
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const byRound = new Map(rounds.map((round) => [round.id, round]));
  for (const candidate of candidates) {
    if (candidate.parentCandidateId === null) continue;
    const parent = byId.get(candidate.parentCandidateId);
    if (!parent)
      errors.push(
        `${candidate.sourcePath}: parent candidate ${JSON.stringify(candidate.parentCandidateId)} does not exist.`,
      );
    else if (byRound.get(parent.roundId)?.order >= byRound.get(candidate.roundId)?.order)
      errors.push(
        `${candidate.sourcePath}: parent ${JSON.stringify(parent.id)} must belong to an earlier round.`,
      );
  }
  for (const round of rounds) {
    if (round.baselineCandidateId === null) continue;
    const baseline = byId.get(round.baselineCandidateId);
    if (!baseline)
      errors.push(
        `Round ${round.id}: baseline candidate ${JSON.stringify(round.baselineCandidateId)} does not exist.`,
      );
    else if (byRound.get(baseline.roundId)?.order >= round.order)
      errors.push(
        `Round ${round.id}: baseline ${JSON.stringify(baseline.id)} must belong to an earlier round.`,
      );
  }
  // An explicit cycle finding is more useful than only two "earlier round" errors.
  const completed = new Set();
  for (const candidate of candidates) {
    const chain = new Set();
    let current = candidate;
    while (current && !completed.has(current.id)) {
      if (chain.has(current.id)) {
        errors.push(`Candidate lineage contains a cycle at ${JSON.stringify(current.id)}.`);
        break;
      }
      chain.add(current.id);
      current = byId.get(current.parentCandidateId);
    }
    for (const candidateId of chain) completed.add(candidateId);
  }
  rounds.sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id), 'en'));
  candidates.sort(
    (a, b) =>
      (byRound.get(a.roundId)?.order ?? 0) - (byRound.get(b.roundId)?.order ?? 0) ||
      a.order - b.order ||
      String(a.id).localeCompare(String(b.id), 'en'),
  );
  if (rounds.length === 0)
    warnings.push('No rounds found. Add rounds/<round-id>/round.json to start a review.');
  if (candidates.length === 0)
    warnings.push('No candidates found. Add a candidate directory with candidate.json and an SVG.');
  for (const round of rounds)
    if (!candidates.some((candidate) => candidate.roundId === round.id))
      warnings.push(`Round ${round.id}: no candidates yet.`);
  const summary = {
    rounds: rounds.length,
    candidates: candidates.length,
    lightAssets: candidates.filter((candidate) => candidate.assets.light).length,
    darkAssets: candidates.filter((candidate) => candidate.assets.dark).length,
  };
  if (errors.length > 0)
    return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], summary, data: null };
  const data = {
    schemaVersion: 1,
    kind: 'session',
    session: normalizeSession(rawSession),
    brief,
    rounds,
    candidates,
  };
  return {
    errors,
    warnings: [...new Set(warnings)],
    summary,
    data: { ...data, contentHash: hash(JSON.stringify(data)) },
  };
}

export async function loadSession(root) {
  const result = await inspectSession(root);
  if (result.errors.length > 0) throw new SessionValidationError(result.errors, result.warnings);
  return result.data;
}

export async function validateSession(root) {
  const result = await inspectSession(root);
  return {
    ok: result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings,
    summary: result.summary,
  };
}

export async function exportCandidate(root, candidateId, { theme = 'light', output } = {}) {
  if (!['light', 'dark'].includes(theme))
    throw new Error(`Unsupported theme ${JSON.stringify(theme)}; choose light or dark.`);
  if (typeof output !== 'string' || !output.trim())
    throw new Error('An output file path is required.');
  const data = await loadSession(root);
  const candidate = data.candidates.find((item) => item.id === candidateId);
  if (!candidate)
    throw new Error(
      `Candidate ${JSON.stringify(candidateId)} was not found in session ${data.session.id}.`,
    );
  if (!candidate.assets[theme])
    throw new Error(
      `Candidate ${candidate.id} has no ${theme} SVG; provide that theme explicitly before exporting it.`,
    );
  const destination = path.resolve(output);
  // A typo in --out must never destroy session metadata or original artwork.
  const realRoot = await fs.realpath(path.resolve(root));
  let resolvedDestination;
  try {
    resolvedDestination = await fs.realpath(destination);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    let parent = path.dirname(destination);
    const segments = [path.basename(destination)];
    while (true) {
      try {
        resolvedDestination = path.join(await fs.realpath(parent), ...segments);
        break;
      } catch (parentError) {
        if (parentError.code !== 'ENOENT') throw parentError;
        const next = path.dirname(parent);
        if (next === parent) throw parentError;
        segments.unshift(path.basename(parent));
        parent = next;
      }
    }
  }
  if (
    contains(path.join(realRoot, 'rounds'), resolvedDestination) ||
    ['session.json', 'brief.md'].some((file) => resolvedDestination === path.join(realRoot, file))
  ) {
    throw new Error(
      'Export destination overlaps session source files; choose an exports directory or a file outside the session.',
    );
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, candidate.assets[theme], 'utf8');
  return {
    candidateId: candidate.id,
    theme,
    output: destination,
    bytes: Buffer.byteLength(candidate.assets[theme], 'utf8'),
    fingerprint: candidate.fingerprint,
  };
}

function stringList(value, label, errors) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim()))
    errors.push(`${label}: expected an array of nonempty strings.`);
}

export async function loadToneCatalog({ toneRoot = PACKAGE_TONES, requireComplete = false } = {}) {
  const root = await fs.realpath(toneRoot);
  const errors = [];
  const warnings = [];
  const catalog = await readJson(root, 'catalog.json', errors);
  if (!object(catalog, 'tones/catalog.json', errors))
    throw new SessionValidationError(errors, warnings);
  version(catalog.schemaVersion, 'tones/catalog.json', errors);
  string(catalog.version, 'tones/catalog.json version', errors);
  if (!Array.isArray(catalog.tones))
    throw new SessionValidationError([...errors, 'tones/catalog.json tones: expected an array.']);
  const ids = new Set();
  const numbers = new Set();
  const tones = [];
  const candidates = [];
  for (const [index, raw] of catalog.tones.entries()) {
    const label = `tones/catalog.json tones[${index}]`;
    if (!object(raw, label, errors)) continue;
    id(raw.id, `${label} id`, errors);
    string(raw.name, `${label} name`, errors);
    string(raw.family, `${label} family`, errors);
    string(raw.summary, `${label} summary`, errors);
    string(raw.smallSizeNotes, `${label} smallSizeNotes`, errors);
    stringList(raw.recipe, `${label} recipe`, errors);
    stringList(raw.goodFor, `${label} goodFor`, errors);
    order(raw.number, `${label} number`, errors);
    if (ids.has(raw.id)) errors.push(`${label}: duplicate tone id ${JSON.stringify(raw.id)}.`);
    if (numbers.has(raw.number)) errors.push(`${label}: duplicate tone number ${raw.number}.`);
    ids.add(raw.id);
    numbers.add(raw.number);
    const references = [];
    if (raw.sourceReferences !== undefined) {
      if (!Array.isArray(raw.sourceReferences))
        errors.push(`${label} sourceReferences: expected an array.`);
      else
        for (const [referenceIndex, reference] of raw.sourceReferences.entries()) {
          const referenceLabel = `${label} sourceReferences[${referenceIndex}]`;
          if (!object(reference, referenceLabel, errors)) continue;
          string(reference.title, `${referenceLabel} title`, errors);
          let url;
          try {
            url = new URL(reference.url);
          } catch {
            /* reported below */
          }
          if (!url || !['http:', 'https:'].includes(url.protocol))
            errors.push(`${referenceLabel} url: expected an http(s) URL.`);
          references.push({ title: reference.title, url: reference.url });
        }
    }
    const assets = await readAssets(root, '', raw.referenceFiles, label, errors, warnings);
    if (!raw.referenceFiles?.dark)
      errors.push(`${label} referenceFiles.dark: the bundled catalog needs a dark reference SVG.`);
    const tone = {
      id: raw.id,
      number: raw.number,
      name: raw.name,
      family: raw.family,
      summary: raw.summary,
      recipe: raw.recipe,
      goodFor: raw.goodFor,
      smallSizeNotes: raw.smallSizeNotes,
      referenceFiles: raw.referenceFiles,
      ...(references.length ? { sourceReferences: references } : {}),
    };
    for (const key of [
      'scheme',
      'kit',
      'toneRevision',
      'bundledReferences',
      'recipeNumericReferences',
    ])
      if (raw[key] !== undefined) tone[key] = raw[key];
    try {
      tone.context = await resolveToneResources(root, tone, catalog.version, { requireComplete });
      // Both browser catalog consumers read this public field. Resolve only after
      // the authored resources and numeric bindings have passed context validation.
      tone.recipe = tone.context.recipe;
    } catch (error) {
      errors.push(error.message);
    }
    tones.push(tone);
    const candidate = {
      id: raw.id,
      roundId: 'catalog',
      title: raw.name,
      toneId: raw.id,
      description: raw.summary,
      order: raw.number,
      parentCandidateId: null,
      sourcePath: 'tones/catalog.json',
      assets,
    };
    candidates.push({ ...candidate, fingerprint: hash(JSON.stringify(candidate)) });
  }
  if (errors.length) throw new SessionValidationError([...new Set(errors)], warnings);
  tones.sort((a, b) => a.number - b.number);
  candidates.sort((a, b) => a.order - b.order);
  const data = {
    schemaVersion: 1,
    kind: 'catalog',
    session: {
      schemaVersion: 1,
      id: 'tone-catalog',
      title: 'Tone collection',
      description: 'Illustration references for generating and comparing diagram candidates.',
      target: { width: 360, height: 200, label: 'Small help diagram' },
      toneCollectionVersion: catalog.version,
    },
    brief:
      'These tones are drawing references. Adapt a chosen reference to the project’s real feature, labels, palette, and intended size.',
    rounds: [
      {
        id: 'catalog',
        title: 'Tone collection',
        description: '',
        order: 1,
        baselineCandidateId: null,
      },
    ],
    candidates,
    tones,
  };
  return { ...data, contentHash: hash(JSON.stringify(data)) };
}
