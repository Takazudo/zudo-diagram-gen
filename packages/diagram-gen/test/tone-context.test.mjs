import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test, onTestFinished } from 'vitest';
import fixtureScheme from './fixtures/tone-scheme.json' with { type: 'json' };
import schemeSchema from '../schemas/tone-scheme.schema.json' with { type: 'json' };
import { loadToneCatalog } from '../src/model.mjs';
import {
  canonicalHash,
  canonicalJson,
  hashBytes,
  validateToneScheme,
  validatePalette,
  resolveToneContext,
  schemaErrors,
  checkNominalTypography,
  renderSchemeRecipe,
  checkRecipeNumericReferences,
  checkMachineRecipe,
  toneContextStatus,
  KIT_PRIMITIVES,
} from '../src/tone-context.mjs';
const exec = promisify(execFile);
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400"><title>Fixture</title><rect width="100" height="100" fill="#111111"/></svg>\n';
const KIT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400"><title>Fixture kit</title>${KIT_PRIMITIVES.map((id) => `<symbol id="${id}" viewBox="0 0 20 20"><rect width="20" height="20" data-palette-fill="ink" fill="#111111"/></symbol>`).join('')}</svg>\n`;
const copy = () => structuredClone(fixtureScheme);
async function write(root, relative, value) {
  await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await fs.writeFile(
    path.join(root, relative),
    typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value),
  );
}
async function fixture({ scheme = true, kit = true } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tone-context-'));
  onTestFinished(() => fs.rm(root, { force: true, recursive: true }));
  const tone = {
    id: 'fixture-tone',
    number: 1,
    name: 'Fixture',
    family: 'test',
    summary: 'Test',
    recipe: ['Use {{scheme:geometry.strokeWidths.outline}} user units.'],
    goodFor: ['Tests'],
    smallSizeNotes: 'Inspect',
    referenceFiles: { light: 'fixture-tone/light.svg', dark: 'fixture-tone/dark.svg' },
    bundledReferences: [
      { id: 'meaning', title: 'Meaning', path: 'shared/meaning.md', required: true },
    ],
    ...(scheme ? { scheme: 'fixture-tone/scheme.json' } : {}),
    ...(kit ? { kit: 'fixture-tone/kit.svg' } : {}),
  };
  if (!scheme) tone.recipe = ['Legacy recipe.'];
  const catalog = { schemaVersion: 1, version: 'test-1', tones: [tone] };
  for (const [relative, value] of Object.entries({
    'catalog.json': catalog,
    'fixture-tone/light.svg': SVG,
    'fixture-tone/dark.svg': SVG,
    'fixture-tone/source.svg': SVG,
    'fixture-tone/recipe.md': scheme
      ? 'Outline: {{scheme:geometry.strokeWidths.outline}} units.\n'
      : 'Legacy recipe.\n',
    'shared/meaning.md': '# Meaning\nKeep the facts.\n',
    ...(scheme ? { 'fixture-tone/scheme.json': copy() } : {}),
    ...(kit ? { 'fixture-tone/kit.svg': KIT } : {}),
  }))
    await write(root, relative, value);
  return { root, tone, catalog, options: { toneRoot: root } };
}

test('canonical hashing preserves exact strings/array order, Unicode code point order and JSON negative zero', () => {
  assert.equal(
    canonicalHash({ z: [1, 2], a: '日本語' }),
    canonicalHash({ a: '日本語', z: [1, 2] }),
  );
  assert.notEqual(canonicalHash([1, 2]), canonicalHash([2, 1]));
  assert.notEqual(canonicalHash('a\r\n'), canonicalHash('a\n'));
  assert.equal(canonicalJson({ '\u{10000}': 1, '\ue000': 2 }), '{"":2,"𐀀":1}');
  assert.equal(canonicalHash(-0), canonicalHash(0));
  assert.equal(
    hashBytes('\uFEFFx\n'),
    createHash('sha256').update(Buffer.from('\uFEFFx\n')).digest('hex'),
  );
  for (const bad of [
    NaN,
    Infinity,
    undefined,
    new Date(),
    () => {},
    { value: undefined },
    Array(2),
    Object.assign([1], { extra: 2 }),
    Object.assign(Array(1), { extra: 1 }),
  ])
    assert.throws(() => canonicalHash(bad));
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalHash(cyclic), /cyclic/);
});

test('published scheme schema and runtime reject versions, units, ranges, role resolution and unknown fields', () => {
  assert.equal(schemaErrors(copy(), schemeSchema).length, 0);
  assert.throws(
    () => schemaErrors(copy(), { ...schemeSchema, not: {} }),
    /Unsupported runtime schema keyword not/,
  );
  for (const mutate of [
    (s) => (s.schemaVersion = 2),
    (s) => (s.coordinateSystem.units = 'px'),
    (s) => (s.coordinateSystem.viewBox[2] = 0),
    (s) => (s.geometry.strokeWidths.outline = -1),
    (s) => (s.geometry.opacities.wash = 1.1),
    (s) => (s.geometry.fills.card = 'missing'),
    (s) => delete s.palette.dark.warning,
    (s) => (s.palette.light.extra = '#000000'),
    (s) => (s.palette.dark.ink = 'var(--ink)'),
    (s) => (s.typography.label.fontWeight = 499.5),
    (s) => (s.typography.label.minCssPx = 0),
    (s) => (s.texture.seed = 9007199254740992),
    (s) => (s.texture.amplitude = 1),
    (s) => (s.extra = true),
  ]) {
    const scheme = copy();
    mutate(scheme);
    assert.ok(schemaErrors(scheme, schemeSchema).length > 0);
    assert.throws(() => validateToneScheme(scheme));
  }
  assert.throws(() => validateToneScheme(copy(), { toneId: 'other' }), /identity/);
  assert.throws(
    () => validateToneScheme(copy(), { collectionVersion: 'other' }),
    /catalog version/,
  );
  const duplicate = copy();
  duplicate.rules.flexible[0].id = duplicate.rules.required[0].id;
  assert.throws(() => validateToneScheme(duplicate), /duplicate rule/);
  const none = copy();
  none.texture.amplitude = 1;
  assert.throws(() => validateToneScheme(none), /kind none/);
  assert.deepEqual(validatePalette(copy().palette), copy().palette);
  assert.throws(() => validatePalette({ light: copy().palette.light }), /dark/);
});

test('numeric recipes render from scheme, detect explicit drift and reject unresolved/malformed roles', () => {
  const scheme = copy();
  assert.throws(
    () => checkMachineRecipe('Stroke width: 99px.', scheme),
    /Unbound recipe machine value/,
  );
  assert.throws(
    () =>
      checkMachineRecipe(
        'Stroke: 3 units. <!-- scheme:geometry.strokeWidths.outline=3 -->',
        scheme,
      ),
    /drift/,
  );
  assert.equal(
    checkMachineRecipe('Stroke: 2 units. <!-- scheme:geometry.strokeWidths.outline=2 -->', scheme),
    'Stroke: 2 units. <!-- scheme:geometry.strokeWidths.outline=2 -->',
  );
  assert.equal(
    checkMachineRecipe('1. Draw 3 people for version 2; preserve label A1.', scheme),
    '1. Draw 3 people for version 2; preserve label A1.',
  );
  assert.equal(
    renderSchemeRecipe('stroke {{scheme:geometry.strokeWidths.outline}}', scheme),
    'stroke 2',
  );
  assert.throws(() => renderSchemeRecipe('{{scheme:geometry.missing}}', scheme), /numeric role/);
  assert.throws(
    () => renderSchemeRecipe('{{scheme:geometry.strokeWidths.outline}', scheme),
    /Malformed/,
  );
  assert.equal(
    checkRecipeNumericReferences(['Stroke is 2 user units.'], scheme, [
      { recipeIndex: 0, path: 'geometry.strokeWidths.outline', value: 2 },
    ]),
    true,
  );
  assert.throws(
    () =>
      checkRecipeNumericReferences(['Stroke 3'], scheme, [
        { recipeIndex: 0, path: 'geometry.strokeWidths.outline', value: 3 },
      ]),
    /drift/,
  );
  assert.throws(
    () =>
      checkRecipeNumericReferences(['Stroke 20'], scheme, [
        { recipeIndex: 0, path: 'geometry.strokeWidths.outline', value: 2 },
      ]),
    /does not contain/,
  );
});

test('resolved recipes reject unbound or drifted dimensional summaries in catalog and local Markdown', async () => {
  const { root, options, tone, catalog } = await fixture();
  tone.recipe = ['Stroke width: 2 user units.'];
  await write(root, 'catalog.json', catalog);
  await assert.rejects(resolveToneContext('fixture-tone', options), /Unbound recipe machine value/);
  tone.recipeNumericReferences = [
    { recipeIndex: 0, path: 'geometry.strokeWidths.outline', value: 2 },
  ];
  await write(root, 'catalog.json', catalog);
  await resolveToneContext('fixture-tone', options);
  await write(root, 'fixture-tone/recipe.md', 'Stroke: 2 units.');
  await assert.rejects(resolveToneContext('fixture-tone', options), /Unbound recipe machine value/);
  await write(
    root,
    'fixture-tone/recipe.md',
    'Stroke: 2 units. <!-- scheme:geometry.strokeWidths.outline=2 -->',
  );
  await resolveToneContext('fixture-tone', options);
  const changed = copy();
  changed.geometry.strokeWidths.outline = 3;
  await write(root, 'fixture-tone/scheme.json', changed);
  await assert.rejects(resolveToneContext('fixture-tone', options), /drift/);
});

test('nominal contain scaling reports final CSS minima and limited structural evidence', () => {
  const result = checkNominalTypography(copy(), { width: 360, height: 100 });
  assert.equal(result.scale, 0.25);
  assert.equal(result.roles[0].cssPx, 6);
  assert.equal(result.roles[0].meetsMinimum, false);
  assert.ok(result.limitations[0].includes('visual inspection'));
  assert.throws(() => checkNominalTypography(copy(), { width: 0, height: 100 }));
});

test('resolved fixture context is complete, portable and preserves exact examples and source', async () => {
  const { root, options } = await fixture();
  const result = await resolveToneContext('fixture-tone', { ...options, requireComplete: true });
  assert.deepEqual(result.capabilities, { scheme: true, kit: true });
  assert.equal(result.examples.light, SVG);
  assert.equal(result.source.text, SVG);
  assert.equal(result.recipeDocument.text, 'Outline: 2 units.\n');
  assert.equal(result.recipe[0], 'Use 2 user units.');
  assert.equal(result.kit.primitives.length, 7);
  assert.equal(result.bundledReferences[0].content, '# Meaning\nKeep the facts.\n');
  assert.ok(
    result.numericSummary.some(
      (entry) => entry.path === 'typography.label.minCssPx' && entry.value === 12,
    ),
  );
  assert.equal(JSON.stringify(result).includes(root), false);
  const changedOrder = copy();
  const ordered = Object.fromEntries(Object.entries(changedOrder).reverse());
  await write(root, 'fixture-tone/scheme.json', ordered);
  assert.equal(
    (await resolveToneContext('fixture-tone', options)).hashes.contextHash,
    result.hashes.contextHash,
  );
});

test('relevant scheme/kit/meaning changes stale context while legacy fingerprints and artwork review remain stable', async () => {
  const { root, options } = await fixture();
  const before = await loadToneCatalog(options);
  const original = before.tones[0].context;
  const scheme = copy();
  scheme.geometry.strokeWidths.outline = 3;
  await write(root, 'fixture-tone/scheme.json', scheme);
  const after = await loadToneCatalog(options);
  assert.notEqual(after.contentHash, before.contentHash);
  assert.equal(after.candidates[0].fingerprint, before.candidates[0].fingerprint);
  assert.equal(toneContextStatus(original.hashes.contextHash, after.tones[0].context), 'stale');
  assert.equal(toneContextStatus(null, original), 'unknown');
  assert.equal(toneContextStatus(original.hashes.contextHash, original), 'current');
  const next = after.tones[0].context.hashes.contextHash;
  await write(root, 'shared/meaning.md', '# Changed facts\n');
  const meaning = await resolveToneContext('fixture-tone', options);
  assert.notEqual(meaning.hashes.contextHash, next);
  await write(root, 'fixture-tone/kit.svg', KIT.replace('width="20"', 'width="19"'));
  assert.notEqual(
    (await resolveToneContext('fixture-tone', options)).hashes.contextHash,
    meaning.hashes.contextHash,
  );
});

test('legacy transition is explicit and cannot pass completeness gate', async () => {
  const { options } = await fixture({ scheme: false, kit: false });
  const result = await resolveToneContext('fixture-tone', options);
  assert.deepEqual(result.capabilities, { scheme: false, kit: false });
  assert.equal(result.scheme, null);
  assert.equal(result.kit, null);
  assert.equal(result.diagnostics.length, 2);
  await assert.rejects(
    resolveToneContext('fixture-tone', { ...options, requireComplete: true }),
    /incomplete/,
  );
  const production = await resolveToneContext('fine-outline');
  assert.equal(production.contextVersion, 1);
});

test('required missing and malformed resources fail; optional missing returns explicit diagnostic', async () => {
  const { root, options, tone, catalog } = await fixture();
  tone.bundledReferences.push({
    id: 'optional',
    title: 'Optional',
    path: 'shared/missing.md',
    required: false,
  });
  await write(root, 'catalog.json', catalog);
  let result = await resolveToneContext('fixture-tone', options);
  assert.equal(result.bundledReferences[1].status, 'missing');
  assert.equal(result.bundledReferences[1].hash, null);
  assert.equal(result.diagnostics[0].code, 'OPTIONAL_REFERENCE_MISSING');
  await write(root, 'shared/missing.md', Buffer.from([0xff]));
  await assert.rejects(resolveToneContext('fixture-tone', options), /UTF-8/);
  await fs.rm(path.join(root, 'shared/missing.md'));
  await write(root, 'fixture-tone/scheme.json', '{bad');
  await assert.rejects(resolveToneContext('fixture-tone', options), /invalid JSON/);
  await fs.rm(path.join(root, 'fixture-tone/scheme.json'));
  await assert.rejects(resolveToneContext('fixture-tone', options), /does not exist/);
  await write(root, 'fixture-tone/scheme.json', { ...copy(), toneId: 'other' });
  await assert.rejects(resolveToneContext('fixture-tone', options), /identity/);
});

test('traversal, escaping and broken symlinks, non-files, malformed optional JSON and oversize resources fail', async () => {
  const { root, options, tone, catalog } = await fixture();
  const original = tone.bundledReferences[0].path;
  for (const unsafe of [
    '/tmp/meaning.md',
    '../meaning.md',
    'shared/../meaning.md',
    'shared//meaning.md',
    'shared/./meaning.md',
    'shared\\meaning.md',
    'C:/meaning.md',
    'shared/meaning\0.md',
  ]) {
    tone.bundledReferences[0].path = unsafe;
    await write(root, 'catalog.json', catalog);
    await assert.rejects(resolveToneContext('fixture-tone', options));
  }
  tone.bundledReferences[0].path = original;
  await write(root, 'catalog.json', catalog);
  await fs.rm(path.join(root, original));
  await fs.symlink('/etc/passwd', path.join(root, original));
  await assert.rejects(resolveToneContext('fixture-tone', options), /outside/);
  tone.bundledReferences[0].required = false;
  await write(root, 'catalog.json', catalog);
  await fs.rm(path.join(root, original));
  await fs.symlink('/missing/outside', path.join(root, original));
  await assert.rejects(resolveToneContext('fixture-tone', options), /does not exist/);
  await fs.rm(path.join(root, original));
  await fs.symlink('/tmp', path.join(root, 'escape'));
  tone.bundledReferences[0].path = 'escape/missing-tone-reference.md';
  await write(root, 'catalog.json', catalog);
  await assert.rejects(resolveToneContext('fixture-tone', options), /outside/);
  tone.bundledReferences[0].path = original;
  await write(root, 'catalog.json', catalog);
  await fs.mkdir(path.join(root, original));
  await assert.rejects(resolveToneContext('fixture-tone', options), /regular file/);
  await fs.rm(path.join(root, original), { recursive: true });
  await write(root, original, 'x'.repeat(1024 * 1024 + 1));
  await assert.rejects(resolveToneContext('fixture-tone', options), /MiB/);
  tone.bundledReferences[0].path = 'shared/bad.json';
  await write(root, 'catalog.json', catalog);
  await write(root, 'shared/bad.json', '{broken');
  await assert.rejects(resolveToneContext('fixture-tone', options), /invalid JSON/);
  tone.bundledReferences[0].path = original;
  await write(root, original, '# Meaning');
  await write(root, 'catalog.json', catalog);
  await write(root, 'fixture-tone/kit.svg', 'x'.repeat(16 * 1024 * 1024 + 1));
  await assert.rejects(resolveToneContext('fixture-tone', options), /MiB/);
});

test('kits reject missing symbols, malformed viewBox, external resources, animations and unresolved palette roles', async () => {
  const { root, options } = await fixture();
  for (const bad of [
    KIT.replace('id="clock"', 'id="other"'),
    KIT.replace('viewBox="0 0 20 20"', 'viewBox="0 0 -1 20"'),
    KIT.replace('data-palette-fill="ink"', 'data-palette-fill="missing"'),
    KIT.replace('fill="#111111"', 'fill="var(--ink)"'),
    KIT.replace('</svg>', '<image href="https://example.com/image.png"/></svg>'),
    KIT.replace('</svg>', '<animate attributeName="x"/></svg>'),
  ]) {
    await write(root, 'fixture-tone/kit.svg', bad);
    await assert.rejects(resolveToneContext('fixture-tone', options));
  }
  const scheme = copy();
  scheme.primitiveAlternatives = { clock: 'Draw a native pending indicator by hand.' };
  await write(root, 'fixture-tone/scheme.json', scheme);
  await write(root, 'fixture-tone/kit.svg', KIT.replace('id="clock"', 'id="other"'));
  assert.equal((await resolveToneContext('fixture-tone', options)).capabilities.kit, true);
});

test('tone CLI retains legacy show fields/examples, adds context, keeps list free of bulk resolved data', async () => {
  const cli = path.resolve('packages/diagram-gen/src/cli.mjs');
  const show = JSON.parse(
    (await exec(process.execPath, [cli, 'tones', 'show', 'fine-outline', '--json'])).stdout,
  );
  assert.equal(show.id, 'fine-outline');
  assert.ok(show.recipe.length);
  assert.ok(show.examples.dark.includes('<svg'));
  assert.equal(show.contextVersion, 1);
  const list = JSON.parse((await exec(process.execPath, [cli, 'tones', 'list', '--json'])).stdout);
  assert.equal(list.tones.length, 24);
  assert.ok(list.tones[0].referenceFiles);
  assert.equal(list.tones[0].context, undefined);
  assert.equal(list.tones[0].examples, undefined);
});
