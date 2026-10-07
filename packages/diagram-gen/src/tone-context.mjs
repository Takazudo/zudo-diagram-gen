import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { SaxesParser } from 'saxes';
import schemeSchema from '../schemas/tone-scheme.schema.json' with { type: 'json' };
import paletteSchema from '../schemas/palette.schema.json' with { type: 'json' };

export const PALETTE_ROLES = Object.freeze([
  'ink',
  'surface',
  'border',
  'accent',
  'deep',
  'warning',
]);
export const KIT_PRIMITIVES = Object.freeze([
  'person',
  'pin',
  'slot-card',
  'empty-seat',
  'arrow',
  'check',
  'clock',
]);
const compare = (a, b) => {
  const aa = Array.from(a, (c) => c.codePointAt(0));
  const bb = Array.from(b, (c) => c.codePointAt(0));
  for (let i = 0; i < Math.min(aa.length, bb.length); i += 1)
    if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return aa.length - bb.length;
};
export const hashBytes = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Canonical JSON: Unicode code-point key order, exact strings and ordered arrays. */
export function canonicalJson(value) {
  const active = new Set();
  function encode(item) {
    if (item === null || typeof item === 'string' || typeof item === 'boolean')
      return JSON.stringify(item);
    if (typeof item === 'number' && Number.isFinite(item)) return JSON.stringify(item);
    if (
      typeof item !== 'object' ||
      item === null ||
      (!Array.isArray(item) &&
        Object.getPrototypeOf(item) !== Object.prototype &&
        Object.getPrototypeOf(item) !== null)
    )
      throw new Error('Canonical JSON requires finite JSON data.');
    if (active.has(item)) throw new Error('Canonical JSON rejects cyclic data.');
    if (Object.getOwnPropertySymbols(item).length)
      throw new Error('Canonical JSON rejects symbol properties.');
    active.add(item);
    let result;
    if (Array.isArray(item)) {
      if (
        Object.keys(item).length !== item.length ||
        Object.keys(item).some((key, index) => key !== String(index))
      )
        throw new Error('Canonical JSON rejects sparse arrays and extra array properties.');
      result = `[${item.map(encode).join(',')}]`;
    } else
      result = `{${Object.keys(item)
        .sort(compare)
        .map((key) => `${JSON.stringify(key)}:${encode(item[key])}`)
        .join(',')}}`;
    active.delete(item);
    return result;
  }
  return encode(value);
}
export const canonicalHash = (value) => hashBytes(canonicalJson(value));

/** The shipped schema is the structural authority; semantic checks follow below. */
export function schemaErrors(value, schema, label = 'value') {
  const errors = [];
  const supported = new Set([
    '$schema',
    '$id',
    '$comment',
    'title',
    'description',
    'type',
    'const',
    'enum',
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'pattern',
    'maxLength',
    'minItems',
    'maxItems',
    'prefixItems',
    'items',
    'minProperties',
    'required',
    'properties',
    'propertyNames',
    'additionalProperties',
    'allOf',
    'if',
    'then',
  ]);
  function inspect(rule) {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule))
      throw new Error('Runtime schema must be an object.');
    for (const key of Object.keys(rule))
      if (!supported.has(key))
        throw new Error(
          `Unsupported runtime schema keyword ${key}; implement it before publishing this schema.`,
        );
    for (const child of Object.values(rule.properties ?? {})) inspect(child);
    for (const child of rule.prefixItems ?? []) inspect(child);
    for (const child of rule.allOf ?? []) inspect(child);
    for (const key of ['if', 'then']) if (rule[key]) inspect(rule[key]);
    for (const key of ['items', 'propertyNames', 'additionalProperties'])
      if (rule[key] && typeof rule[key] === 'object') inspect(rule[key]);
  }
  inspect(schema);
  function visit(item, rule, at) {
    for (const child of rule.allOf ?? []) visit(item, child, at);
    if (rule.if) {
      const start = errors.length;
      visit(item, rule.if, at);
      const matches = errors.length === start;
      errors.splice(start);
      if (matches && rule.then) visit(item, rule.then, at);
    }
    if (rule.const !== undefined && item !== rule.const)
      errors.push(`${at}: expected ${JSON.stringify(rule.const)}.`);
    if (rule.enum && !rule.enum.includes(item))
      errors.push(`${at}: expected one of ${rule.enum.join(', ')}.`);
    const type = rule.type;
    const matches =
      !type ||
      (type === 'object'
        ? item !== null && typeof item === 'object' && !Array.isArray(item)
        : type === 'array'
          ? Array.isArray(item)
          : type === 'integer'
            ? Number.isInteger(item)
            : type === 'number'
              ? typeof item === 'number' && Number.isFinite(item)
              : typeof item === type);
    if (!matches) {
      errors.push(`${at}: expected ${type}.`);
      return;
    }
    if (typeof item === 'number') {
      if (
        !Number.isFinite(item) ||
        (rule.minimum !== undefined && item < rule.minimum) ||
        (rule.maximum !== undefined && item > rule.maximum) ||
        (rule.exclusiveMinimum !== undefined && item <= rule.exclusiveMinimum)
      )
        errors.push(`${at}: outside the permitted numeric range.`);
    }
    if (typeof item === 'string') {
      if (
        (rule.pattern && !new RegExp(rule.pattern, 'u').test(item)) ||
        (rule.maxLength !== undefined && Array.from(item).length > rule.maxLength)
      )
        errors.push(`${at}: invalid string value.`);
    }
    if (Array.isArray(item)) {
      if (
        (rule.minItems !== undefined && item.length < rule.minItems) ||
        (rule.maxItems !== undefined && item.length > rule.maxItems)
      )
        errors.push(`${at}: invalid array length.`);
      item.forEach((entry, index) => {
        const child = rule.prefixItems?.[index] ?? rule.items;
        if (child) visit(entry, child, `${at}[${index}]`);
      });
    } else if (item !== null && typeof item === 'object') {
      if (rule.minProperties !== undefined && Object.keys(item).length < rule.minProperties)
        errors.push(`${at}: needs at least ${rule.minProperties} role(s).`);
      for (const key of rule.required ?? [])
        if (!Object.hasOwn(item, key)) errors.push(`${at}.${key}: required.`);
      for (const [key, child] of Object.entries(item)) {
        if (rule.propertyNames) visit(key, rule.propertyNames, `${at} role ${key}`);
        if (Object.hasOwn(rule.properties ?? {}, key))
          visit(child, rule.properties[key], `${at}.${key}`);
        else if (rule.additionalProperties === false)
          errors.push(`${at}.${key}: unknown property.`);
        else if (rule.additionalProperties && typeof rule.additionalProperties === 'object')
          visit(child, rule.additionalProperties, `${at}.${key}`);
      }
    }
  }
  visit(value, schema, label);
  return errors;
}
export function validatePalette(palette) {
  const errors = schemaErrors(palette, paletteSchema, 'palette');
  if (errors.length) throw new Error(errors.join('\n'));
  canonicalJson(palette);
  return palette;
}
export function validateToneScheme(scheme, { toneId, toneRevision, collectionVersion } = {}) {
  const errors = schemaErrors(scheme, schemeSchema, 'scheme');
  if (toneId !== undefined && scheme?.toneId !== toneId)
    errors.push(`scheme.toneId: must match catalog identity ${toneId}.`);
  if (collectionVersion !== undefined && scheme?.collectionVersion !== collectionVersion)
    errors.push(`scheme.collectionVersion: must match catalog version ${collectionVersion}.`);
  if (toneRevision !== undefined && scheme?.toneRevision !== toneRevision)
    errors.push(`scheme.toneRevision: must match catalog revision ${toneRevision}.`);
  const ids = new Set();
  for (const group of ['required', 'preferred', 'flexible'])
    for (const rule of Array.isArray(scheme?.rules?.[group]) ? scheme.rules[group] : []) {
      if (ids.has(rule?.id)) errors.push(`scheme.rules: duplicate rule ID ${rule?.id}.`);
      ids.add(rule?.id);
    }
  if (
    scheme?.texture?.kind === 'none' &&
    ['seed', 'amplitude', 'frequency'].some((key) => scheme.texture[key] !== 0)
  )
    errors.push('scheme.texture: kind none requires zero seed, amplitude and frequency.');
  if (errors.length) throw new Error(errors.join('\n'));
  canonicalJson(scheme);
  return scheme;
}

/** Only explicit machine references are interpreted; prose still needs inspection. */
export function renderSchemeRecipe(template, scheme) {
  validateToneScheme(scheme);
  if (typeof template !== 'string') throw new Error('Recipe template must be a string.');
  const rendered = template.replace(/\{\{scheme:([^{}]+)\}\}/g, (_, reference) => {
    const value = reference
      .split('.')
      .reduce(
        (current, key) => (current && Object.hasOwn(current, key) ? current[key] : undefined),
        scheme,
      );
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new Error(`Recipe scheme reference ${reference} must resolve to a numeric role.`);
    return String(value);
  });
  if (/\{\{scheme:/.test(rendered)) throw new Error('Malformed recipe scheme reference.');
  return rendered;
}
export function schemeNumericSummary(scheme) {
  validateToneScheme(scheme);
  const result = [];
  function walk(value, prefix) {
    if (typeof value === 'number') result.push({ path: prefix, value });
    else if (value !== null && typeof value === 'object')
      for (const key of Object.keys(value).sort(compare))
        walk(value[key], prefix ? `${prefix}.${key}` : key);
  }
  for (const key of ['coordinateSystem', 'geometry', 'typography', 'texture'])
    walk(scheme[key], key);
  return result;
}
export function checkRecipeNumericReferences(recipe, scheme, references = []) {
  if (!Array.isArray(references)) throw new Error('recipeNumericReferences: expected an array.');
  const summary = new Map(schemeNumericSummary(scheme).map((item) => [item.path, item.value]));
  const used = new Set();
  for (const entry of references) {
    if (
      !entry ||
      Object.keys(entry).some((key) => !['recipeIndex', 'path', 'value'].includes(key)) ||
      !Number.isSafeInteger(entry.recipeIndex) ||
      entry.recipeIndex < 0 ||
      entry.recipeIndex >= recipe.length ||
      typeof entry.path !== 'string' ||
      !Number.isFinite(entry.value)
    )
      throw new Error(
        'recipeNumericReferences: expected {recipeIndex,path,value} referencing a recipe entry.',
      );
    const identity = `${entry.recipeIndex}:${entry.path}`;
    if (used.has(identity)) throw new Error(`recipeNumericReferences: duplicate ${identity}.`);
    used.add(identity);
    if (summary.get(entry.path) !== entry.value)
      throw new Error(
        `Recipe numeric drift at ${entry.path}: expected scheme value ${summary.get(entry.path)}, received ${entry.value}.`,
      );
    const numericTokens =
      recipe[entry.recipeIndex].match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? [];
    if (!numericTokens.some((token) => Number(token) === entry.value))
      throw new Error(
        `Recipe entry ${entry.recipeIndex} does not contain its declared numeric value ${entry.value}.`,
      );
  }
  return true;
}

/** Declared numeric summaries must bind to scheme values; factual numbers are prose. */
export function checkMachineRecipe(text, scheme, bindings = []) {
  validateToneScheme(scheme);
  const values = new Map(schemeNumericSummary(scheme).map(({ path, value }) => [path, value]));
  const number = '[-+]?(?:\\d*\\.)?\\d+(?:e[-+]?\\d+)?';
  const authority = new RegExp(
    `\\b(?:stroke(?:[- ]width)?|radius|radii|opacity|font[- ]?size|amplitude|frequency|shadow[- ]?offset|minCssPx|fontSize)\\s*(?::|=|is|of|at|around|about)?\\s*(${number})(?:\\s*[–—-]\\s*(${number}))?`,
    'gi',
  );
  const units = new RegExp(
    `(${number})\\s*(?:px\\b|pt\\b|%|(?:svg[- ]user[- ]|user[- ]|user\\s+)?units\\b)`,
    'gi',
  );
  const numeric = new RegExp(number, 'gi');
  for (const [index, source] of text.split(/\r?\n/).entries()) {
    const checked = [...bindings];
    let line = source.replace(/<!--\s*scheme:([^=\s]+)=([^\s]+)\s*-->/g, (_, rolePath, literal) => {
      const value = Number(literal);
      if (!values.has(rolePath) || !Number.isFinite(value) || values.get(rolePath) !== value)
        throw new Error(
          `Recipe numeric drift at ${rolePath} on line ${index + 1}: bind to current scheme value ${values.get(rolePath)}.`,
        );
      checked.push({ path: rolePath, value });
      return '';
    });
    if (/<!--\s*scheme:/.test(line))
      throw new Error(
        `Malformed recipe numeric binding on line ${index + 1}; use <!-- scheme:path=value -->.`,
      );
    // Resolve and validate every template, then remove it from literal authority checks.
    renderSchemeRecipe(line, scheme);
    line = line
      .replace(/\{\{scheme:[^{}]+\}\}/g, 'SCHEME_VALUE')
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '');
    const literals = [...line.matchAll(authority)].flatMap((match) =>
      (match[0].match(numeric) ?? []).map(Number),
    );
    for (const match of line.matchAll(units)) literals.push(Number(match[1]));
    for (const value of literals)
      if (
        !checked.some(
          (entry) =>
            values.has(entry.path) &&
            values.get(entry.path) === entry.value &&
            entry.value === value,
        )
      )
        throw new Error(
          `Unbound recipe machine value ${value} on line ${index + 1}; use {{scheme:numeric.path}} or a checked <!-- scheme:path=value --> binding. Catalog recipe entries may use recipeNumericReferences.`,
        );
  }
  return renderSchemeRecipe(text, scheme);
}

export function checkNominalTypography(scheme, slot) {
  validateToneScheme(scheme);
  if (
    !slot ||
    !Number.isFinite(slot.width) ||
    !Number.isFinite(slot.height) ||
    slot.width <= 0 ||
    slot.height <= 0
  )
    throw new Error('Typography slot needs positive finite CSS pixel dimensions.');
  const scale = Math.min(
    slot.width / scheme.coordinateSystem.viewBox[2],
    slot.height / scheme.coordinateSystem.viewBox[3],
  );
  return {
    scale,
    roles: Object.entries(scheme.typography).map(([role, value]) => ({
      role,
      cssPx: value.fontSize * scale,
      minCssPx: value.minCssPx,
      meetsMinimum: value.fontSize * scale >= value.minCssPx,
    })),
    validation: 'nominal-contain-scale',
    limitations: [
      'Nested transforms, shaping, overlap and arbitrary SVG geometry require visual inspection.',
    ],
  };
}

function kitInventory(text, scheme, label, validateSvg) {
  const errors = [];
  validateSvg(text, label, errors, []);
  const primitives = [];
  const parser = new SaxesParser({ xmlns: true });
  parser.on('error', () => {}); // validateSvg already reports malformed XML.
  parser.on('opentag', (tag) => {
    if (
      ['animate', 'animatetransform', 'animatemotion', 'set', 'discard'].includes(
        tag.local.toLowerCase(),
      )
    )
      errors.push(`${label}: animation is not supported in kits.`);
    const attrs = Object.fromEntries(Object.values(tag.attributes).map((a) => [a.name, a.value]));
    if (tag.local === 'symbol') {
      const box = attrs.viewBox
        ?.trim()
        .split(/[\s,]+/)
        .map(Number);
      if (
        !attrs.id ||
        !box ||
        box.length !== 4 ||
        box.some((x) => !Number.isFinite(x)) ||
        box[2] <= 0 ||
        box[3] <= 0
      )
        errors.push(`${label}: symbols need an ID and positive viewBox.`);
      else primitives.push({ id: attrs.id, viewBox: box });
    }
    for (const kind of ['fill', 'stroke'])
      if (attrs[`data-palette-${kind}`] !== undefined) {
        if (!PALETTE_ROLES.includes(attrs[`data-palette-${kind}`]))
          errors.push(`${label}: unresolved palette role ${attrs[`data-palette-${kind}`]}.`);
        if (!/^#[a-f\d]{6}$/i.test(attrs[kind] ?? ''))
          errors.push(`${label}: data-palette-${kind} needs a literal #RRGGBB default.`);
      }
  });
  try {
    parser.write(text).close();
  } catch {
    /* validateSvg reports XML */
  }
  for (const primitive of KIT_PRIMITIVES)
    if (
      !primitives.some((item) => item.id === primitive) &&
      !scheme?.primitiveAlternatives?.[primitive]
    )
      errors.push(
        `${label}: missing primitive ${primitive}; declare a scheme primitiveAlternatives description or provide its symbol.`,
      );
  if (errors.length) throw new Error(errors.join('\n'));
  return primitives;
}

/** Resource paths are package-relative; only a genuinely missing optional file is tolerated. */
export async function resolveToneResources(
  root,
  tone,
  collectionVersion,
  { requireComplete = false } = {},
) {
  const { safeRead, validateSvg } = await import('./model.mjs');
  if (
    tone.toneRevision !== undefined &&
    (typeof tone.toneRevision !== 'string' || !tone.toneRevision.trim())
  )
    throw new Error(`${tone.id}: toneRevision must be a nonempty authored revision.`);
  const diagnostics = [];
  const bundledReferences = [];
  const descriptorIds = new Set();
  if (tone.bundledReferences !== undefined && !Array.isArray(tone.bundledReferences))
    throw new Error(`${tone.id}: bundledReferences must be an array.`);
  for (const descriptor of tone.bundledReferences ?? []) {
    if (
      !descriptor ||
      typeof descriptor.id !== 'string' ||
      !/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(descriptor.id) ||
      descriptor.id.length > 128 ||
      typeof descriptor.title !== 'string' ||
      !descriptor.title.trim() ||
      typeof descriptor.required !== 'boolean' ||
      Object.keys(descriptor).some((key) => !['id', 'title', 'path', 'required'].includes(key))
    )
      throw new Error(`${tone.id}: malformed bundled reference descriptor.`);
    if (descriptorIds.has(descriptor.id))
      throw new Error(`${tone.id}: duplicate bundled reference ${descriptor.id}.`);
    descriptorIds.add(descriptor.id);
    if (typeof descriptor.path !== 'string' || !/\.(?:md|json|svg)$/i.test(descriptor.path))
      throw new Error(`${tone.id}: bundled references must be Markdown, JSON or SVG paths.`);
    // safeRead validates the path even if optional; distinguish ENOENT with a
    // separate lstat only after a policy-safe read attempt has failed.
    try {
      const isSvg = /\.svg$/i.test(descriptor.path);
      const content = await safeRead(root, descriptor.path, {
        limit: (isSvg ? 16 : 1) * 1024 * 1024,
      });
      if (!content.trim())
        throw new Error(`${descriptor.path}: bundled explanation must be nonempty.`);
      if (/\.json$/i.test(descriptor.path)) parseJson(content, descriptor.path);
      if (isSvg) {
        const errors = [];
        validateSvg(content, descriptor.path, errors, []);
        if (errors.length) throw new Error(errors.join('\n'));
      }
      bundledReferences.push({
        ...descriptor,
        status: 'resolved',
        content,
        hash: hashBytes(content),
      });
    } catch (error) {
      if (!descriptor.required && error.message === `${descriptor.path}: file does not exist.`) {
        // A broken escaping symlink must never be hidden as an optional miss.
        try {
          await fs.lstat(path.join(root, descriptor.path));
        } catch (missing) {
          if (missing.code !== 'ENOENT') throw error;
          bundledReferences.push({ ...descriptor, status: 'missing', content: null, hash: null });
          diagnostics.push({
            code: 'OPTIONAL_REFERENCE_MISSING',
            path: descriptor.path,
            message: 'Optional bundled reference is unavailable.',
          });
          continue;
        }
      }
      throw error;
    }
  }
  let scheme = null;
  if (tone.scheme !== undefined) {
    if (tone.scheme !== `${tone.id}/scheme.json`)
      throw new Error(`${tone.id}: scheme must be ${tone.id}/scheme.json.`);
    scheme = validateToneScheme(parseJson(await safeRead(root, tone.scheme), tone.scheme), {
      toneId: tone.id,
      toneRevision: tone.toneRevision,
      collectionVersion,
    });
  } else
    diagnostics.push({
      code: 'SCHEME_UNAVAILABLE',
      message: 'Legacy tone has no authored scheme.',
    });
  let kit = null;
  if (tone.kit !== undefined) {
    if (tone.kit !== `${tone.id}/kit.svg`)
      throw new Error(`${tone.id}: kit must be ${tone.id}/kit.svg.`);
    const text = await safeRead(root, tone.kit, { limit: 16 * 1024 * 1024 });
    kit = { path: tone.kit, text, primitives: kitInventory(text, scheme, tone.kit, validateSvg) };
  } else diagnostics.push({ code: 'KIT_UNAVAILABLE', message: 'Legacy tone has no authored kit.' });
  if (
    requireComplete &&
    (!scheme ||
      !kit ||
      !bundledReferences.some((entry) => entry.required && entry.status === 'resolved'))
  )
    throw new Error(
      `${tone.id}: incomplete tone context; scheme, kit and a required bundled explanation are mandatory.`,
    );
  const recipePath = `${tone.id}/recipe.md`;
  const sourcePath = `${tone.id}/source.svg`;
  const recipeText = await safeRead(root, recipePath);
  if (!recipeText.trim()) throw new Error(`${recipePath}: recipe document must be nonempty.`);
  const sourceText = await safeRead(root, sourcePath, { limit: 16 * 1024 * 1024 });
  const errors = [];
  validateSvg(sourceText, sourcePath, errors, []);
  if (errors.length) throw new Error(errors.join('\n'));
  if (!scheme && tone.recipeNumericReferences !== undefined)
    throw new Error(`${tone.id}: recipeNumericReferences require an authored scheme.`);
  if (scheme) {
    checkRecipeNumericReferences(tone.recipe, scheme, tone.recipeNumericReferences);
    tone.recipe.forEach((text, recipeIndex) =>
      checkMachineRecipe(
        text,
        scheme,
        (tone.recipeNumericReferences ?? []).filter((entry) => entry.recipeIndex === recipeIndex),
      ),
    );
    checkMachineRecipe(recipeText, scheme);
  }
  const recipe = scheme ? tone.recipe.map((text) => renderSchemeRecipe(text, scheme)) : tone.recipe;
  const renderedRecipe = scheme ? renderSchemeRecipe(recipeText, scheme) : recipeText;
  const schemeHash = scheme ? canonicalHash(scheme) : null;
  const kitHash = kit ? hashBytes(kit.text) : null;
  const bundledReferenceHashes = bundledReferences
    .map(({ id, hash }) => ({ id, hash }))
    .sort((a, b) => compare(a.id, b.id));
  const contextHash = canonicalHash({
    toneId: tone.id,
    toneRevision: scheme?.toneRevision ?? tone.toneRevision ?? null,
    collectionVersion,
    schemeHash,
    kitHash,
    bundledReferenceHashes,
  });
  return {
    contextVersion: 1,
    capabilities: { scheme: !!scheme, kit: !!kit },
    bundledReferences,
    scheme,
    kit,
    recipe,
    recipeDocument: {
      path: recipePath,
      text: renderedRecipe,
      template: recipeText,
      hash: hashBytes(recipeText),
    },
    source: { path: sourcePath, text: sourceText, hash: hashBytes(sourceText) },
    numericSummary: scheme ? schemeNumericSummary(scheme) : [],
    hashes: { schemeHash, kitHash, bundledReferenceHashes, contextHash },
    diagnostics,
    validation: {
      structure: true,
      descriptiveRules: 'not-evaluated',
      readability: 'not-evaluated',
    },
  };
}
function parseJson(text, label) {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error(`${label}: invalid JSON.`);
  }
}
export async function resolveToneContext(toneId, options = {}) {
  const { loadToneCatalog } = await import('./model.mjs');
  const catalog = await loadToneCatalog(options);
  const tone = catalog.tones.find((entry) => entry.id === toneId);
  if (!tone)
    throw new Error(
      `Unknown tone ${JSON.stringify(toneId)}. Run "zudo-diagram-gen tones list" to see available IDs.`,
    );
  const { context, ...fields } = tone;
  return {
    ...fields,
    ...context,
    examples: catalog.candidates.find((entry) => entry.toneId === toneId).assets,
  };
}
export function toneContextStatus(previousHash, context) {
  return previousHash == null
    ? 'unknown'
    : previousHash === context.hashes.contextHash
      ? 'current'
      : 'stale';
}
