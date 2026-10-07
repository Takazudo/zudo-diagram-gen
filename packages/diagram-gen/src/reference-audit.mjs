import { lstat, readFile, readlink, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SaxesParser } from 'saxes';

const DEFAULT_ROOT = fileURLToPath(new URL('../tones/', import.meta.url));
const TEXT_LIMIT = 1024 * 1024;
const SVG_LIMIT = 16 * TEXT_LIMIT;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function contained(root, file) {
  const relative = path.relative(root, file);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

function safePath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !/[\\\0]/.test(value) &&
    !path.posix.isAbsolute(value) &&
    !/^[a-z]:/i.test(value) &&
    value.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
  );
}

function forbidden(value) {
  let decoded = value;
  // Catch percent-encoded copies as well as the original URL spelling.
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return /(?:github\.com|raw\.githubusercontent\.com|api\.github\.com\/repos)\/zudolab\/zudo-pattern-gen(?:\.git)?(?:[\s/#?"')]|$)/i.test(
    decoded,
  );
}

function strings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

function externalCss(text) {
  return (
    /@import\b/i.test(text) ||
    [...text.matchAll(/url\(\s*([^)]*)\)/gi)].some((match) => {
      const target = match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
      return !target.startsWith('#');
    })
  );
}

function validateSvg(text) {
  const parser = new SaxesParser({ xmlns: true });
  let root;
  parser.on('doctype', () => {
    throw new Error('SVG doctype is not allowed');
  });
  parser.on('opentag', (tag) => {
    root ??= tag;
    if (tag.uri !== 'http://www.w3.org/2000/svg')
      throw new Error('Only SVG namespace elements are allowed');
    if (
      ['script', 'foreignObject', 'animate', 'animateTransform', 'animateMotion', 'set'].includes(
        tag.local,
      )
    )
      throw new Error('SVG contains active content');
    for (const attribute of Object.values(tag.attributes)) {
      if (attribute.name === 'xml:base') throw new Error('SVG xml:base is not allowed');
      if (/^on/i.test(attribute.local)) throw new Error('SVG contains an event handler');
      if (
        attribute.local === 'href' &&
        !attribute.value.trim().startsWith('#') &&
        !/^data:image\/(?:png|jpeg|gif|webp);base64,[a-zA-Z0-9+/=\s]+$/i.test(
          attribute.value.trim(),
        )
      )
        throw new Error('SVG requires an external resource');
      if (externalCss(attribute.value)) throw new Error('SVG requires an external resource');
    }
  });
  parser.on('processinginstruction', () => {
    throw new Error('SVG processing instructions are not allowed');
  });
  parser.on('cdata', (value) => {
    if (externalCss(value)) throw new Error('SVG requires an external resource');
  });
  parser.on('text', (value) => {
    if (externalCss(value)) throw new Error('SVG requires an external resource');
  });
  parser.write(text).close();
  if (!root || root.local !== 'svg' || root.uri !== 'http://www.w3.org/2000/svg')
    throw new Error('Expected an SVG document');
}

async function resource(root, relative, expectedType) {
  if (!safePath(relative)) throw new Error('Unsafe package-relative resource path');
  const extension = path.posix.extname(relative).toLowerCase();
  if (expectedType && extension !== expectedType)
    throw new Error(`Expected ${expectedType} resource type`);
  if (!['.md', '.json', '.svg'].includes(extension))
    throw new Error('Unsupported reference resource type (use Markdown, JSON or SVG)');
  // Check lexical symlink destinations before realpath so dangling escapes cannot
  // masquerade as merely absent optional material.
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    const info = await lstat(current);
    if (info.isSymbolicLink()) {
      const destination = path.resolve(path.dirname(current), await readlink(current));
      if (!contained(root, destination)) throw new Error('Reference symlink escapes tones root');
    }
  }
  const filename = await realpath(path.resolve(root, relative));
  if (!contained(root, filename)) throw new Error('Reference symlink escapes tones root');
  const info = await stat(filename);
  if (!info.isFile()) throw new Error('Reference must be a regular file');
  const limit = extension === '.svg' ? SVG_LIMIT : TEXT_LIMIT;
  if (info.size > limit) throw new Error(`Reference exceeds ${limit} byte limit`);
  const bytes = await readFile(filename);
  if (bytes.length > limit) throw new Error(`Reference exceeds ${limit} byte limit`);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!text.trim() || text.includes('\0'))
    throw new Error('Reference must contain nonempty UTF-8 text without NUL');
  if (extension === '.json') JSON.parse(text);
  if (extension === '.svg') validateSvg(text);
  return text;
}

// Keep the gate compatible with the package's full Node 22 range; path.matchesGlob
// is not present in early Node 22 releases. npm files use directory prefixes/globs.
function matchesFilesPattern(relative, pattern) {
  const segments = relative.split('/');
  const parts = pattern.replace(/\/$/, '').split('/');
  function match(index, part) {
    if (part === parts.length) return true; // a directory includes its descendants
    if (parts[part] === '**')
      return match(index, part + 1) || (index < segments.length && match(index + 1, part));
    if (index === segments.length) return false;
    const expression = parts[part]
      .split(/([*?])/)
      .map((token) =>
        token === '*' ? '.*' : token === '?' ? '.' : token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      )
      .join('');
    return new RegExp(`^${expression}$`).test(segments[index]) && match(index + 1, part + 1);
  }
  return match(0, 0);
}

function included(files, relative) {
  if (!Array.isArray(files)) return false;
  return (
    files.some(
      (entry) =>
        typeof entry === 'string' && !entry.startsWith('!') && matchesFilesPattern(relative, entry),
    ) &&
    !files.some(
      (entry) =>
        typeof entry === 'string' &&
        entry.startsWith('!') &&
        matchesFilesPattern(relative, entry.slice(1)),
    )
  );
}

/** Internal package/repository gate. No network calls; all paths resolve from the installed package. */
export async function auditToneReferences({
  tonesRoot = DEFAULT_ROOT,
  checkPackageFiles = true,
} = {}) {
  const errors = [],
    warnings = [],
    resources = new Set();
  const error = (label, message) => errors.push(`${label}: ${message}`);
  let root, catalog, packageFiles;
  try {
    root = await realpath(tonesRoot);
    catalog = JSON.parse(await resource(root, 'catalog.json'));
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.tones))
      throw new Error('Expected catalog schemaVersion 1 and tones array');
    if (checkPackageFiles)
      packageFiles = JSON.parse(
        await readFile(path.join(root, '..', 'package.json'), 'utf8'),
      ).files;
  } catch (cause) {
    return {
      ok: false,
      errors: [`catalog: ${cause.message}`],
      warnings,
      toneCount: 0,
      resources: [],
    };
  }
  if (strings(catalog).some(forbidden))
    error('catalog', 'Forbidden private reference in current tone metadata');
  const ids = new Set();
  for (const tone of catalog.tones) {
    if (!tone || typeof tone.id !== 'string' || !slug.test(tone.id) || ids.has(tone.id)) {
      error('catalog', 'Missing, malformed or duplicate tone ID');
      continue;
    }
    ids.add(tone.id);
    const label = tone.id;
    const descriptors = tone.bundledReferences;
    const descriptorIds = new Set();
    const reads = [
      { path: `${tone.id}/recipe.md`, required: true, type: '.md' },
      { path: `${tone.id}/source.svg`, required: true, type: '.svg' },
      { path: tone.referenceFiles?.light, required: true, type: '.svg' },
      { path: tone.referenceFiles?.dark, required: true, type: '.svg' },
    ];
    let explanation = false;
    if (!Array.isArray(descriptors))
      error(label, 'bundledReferences must be an array with a required local explanation');
    else
      for (const descriptor of descriptors) {
        if (
          !descriptor ||
          typeof descriptor.id !== 'string' ||
          !slug.test(descriptor.id) ||
          descriptorIds.has(descriptor.id) ||
          typeof descriptor.title !== 'string' ||
          !descriptor.title.trim() ||
          typeof descriptor.required !== 'boolean' ||
          !safePath(descriptor.path) ||
          Object.keys(descriptor).some((key) => !['id', 'title', 'path', 'required'].includes(key))
        ) {
          error(label, 'Malformed or duplicate bundled reference descriptor');
          continue;
        }
        descriptorIds.add(descriptor.id);
        if (descriptor.required && path.posix.extname(descriptor.path).toLowerCase() === '.md')
          explanation = true;
        reads.push(descriptor);
      }
    if (!explanation) error(label, 'At least one required local Markdown explanation is needed');
    if (tone.sourceReferences !== undefined && !Array.isArray(tone.sourceReferences))
      error(label, 'sourceReferences must be an array');
    else
      for (const reference of tone.sourceReferences ?? []) {
        try {
          const url = new URL(reference.url);
          if (
            !['http:', 'https:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            typeof reference.title !== 'string' ||
            !reference.title.trim()
          )
            throw new Error();
        } catch {
          error(label, 'Optional inspiration must have a title and credential-free HTTP(S) URL');
        }
      }
    for (const reference of reads) {
      const resourceLabel = `${label}/${reference.path ?? '(missing path)'}`;
      try {
        const text = await resource(root, reference.path, reference.type);
        if (reference.required && forbidden(text))
          throw new Error('Forbidden private reference in required tone resource');
        if (checkPackageFiles && !included(packageFiles, `tones/${reference.path}`))
          throw new Error('Resource excluded from package files');
        resources.add(reference.path);
      } catch (cause) {
        // Malformed paths/types and unsafe escapes always fail, even if marked optional.
        if (reference.required || cause.code !== 'ENOENT') error(resourceLabel, cause.message);
        else warnings.push(`${resourceLabel}: Optional reference missing`);
      }
    }
  }
  if (!catalog.tones.length) error('catalog', 'Tone collection must not be empty');
  if (checkPackageFiles && !included(packageFiles, 'tones/catalog.json'))
    error('catalog', 'Catalog excluded from package files');
  return {
    ok: !errors.length,
    errors,
    warnings,
    toneCount: ids.size,
    resources: [...resources].sort(),
  };
}

/** Explicit optional live audit. A 404 never establishes a repository's visibility. */
export async function auditExternalReferences(
  catalog,
  { fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {},
) {
  const urls = [
    ...new Set(
      catalog.tones.flatMap((tone) =>
        (tone.sourceReferences ?? []).map((reference) => reference.url),
      ),
    ),
  ].sort();
  const results = [];
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
        throw new Error('Only credential-free HTTP(S) inspiration is allowed');
      const response = await fetchImpl(url, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const status = response.status;
      const state =
        status >= 200 && status < 300
          ? 'reachable'
          : status >= 300 && status < 400
            ? 'redirect'
            : status === 429
              ? 'rate-limited'
              : status === 401 || status === 403
                ? 'access-denied-visibility-unknown'
                : status === 404 || status === 410
                  ? 'missing-or-unavailable'
                  : status === 405 || status === 501
                    ? 'head-not-supported'
                    : status >= 500
                      ? 'transient-server-error'
                      : 'unreachable';
      results.push({
        url,
        state,
        status,
        ...(state === 'redirect' ? { location: response.headers.get('location') } : {}),
      });
    } catch (cause) {
      results.push({
        url,
        state:
          cause.name === 'TimeoutError' || cause.name === 'AbortError'
            ? 'timeout'
            : 'network-or-request-error',
        message: cause.message,
      });
    }
  }
  return results;
}
