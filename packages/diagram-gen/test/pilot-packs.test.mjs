import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { SaxesParser } from 'saxes';
import { test, onTestFinished } from 'vitest';
import references from './fixtures/pilot-original-reference-hashes.json' with { type: 'json' };
import {
  KIT_PRIMITIVES,
  hashBytes,
  resolveToneContext,
  resolveToneResources,
  checkNominalTypography,
  checkMachineRecipe,
} from '../src/tone-context.mjs';
import {
  authorPilotKit,
  buildPilotKits,
  pencilHatch,
  pencilField,
  paperCutMotif,
  PILOT_TONES,
} from '../../../scripts/build-pilot-kits.mjs';
import { preparePilotSupports } from '../../../scripts/prepare-pilot-supports.mjs';
const exec = promisify(execFile);
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const tones = path.join(repo, 'packages/diagram-gen/tones');
const read = (file) => fs.readFile(file, 'utf8');
const json = async (file) => JSON.parse(await read(file));
async function temporary() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-packs-'));
  onTestFinished(() => fs.rm(directory, { force: true, recursive: true }));
  return directory;
}

// Structural completion is deliberately separate from visual tone character.
test('four complete contexts expose native primitive inventories and resolve numeric recipe authority', async () => {
  for (const tone of PILOT_TONES) {
    const catalog = await json(path.join(tones, 'catalog.json'));
    await resolveToneResources(
      tones,
      catalog.tones.find(({ id }) => id === tone),
      catalog.version,
      { requireComplete: true },
    );
    const context = await resolveToneContext(tone);
    assert.deepEqual(context.capabilities, { scheme: true, kit: true });
    assert.equal(context.toneRevision, context.scheme.toneRevision);
    assert.deepEqual(
      context.kit.primitives.filter(({ id }) => KIT_PRIMITIVES.includes(id)).map(({ id }) => id),
      KIT_PRIMITIVES,
    );
    assert.ok(
      context.bundledReferences.some(
        (reference) => reference.required && reference.status === 'resolved',
      ),
    );
    assert.equal(context.validation.readability, 'not-evaluated');
    assert.equal(context.validation.descriptiveRules, 'not-evaluated');
    assert.ok(!context.recipeDocument.text.includes('{{scheme:'));
    const template = await read(path.join(tones, tone, 'recipe.md'));
    assert.equal(checkMachineRecipe(template, context.scheme), context.recipeDocument.text);
    for (const group of ['required', 'preferred', 'flexible'])
      assert.ok(context.scheme.rules[group].length > 0);
    for (const brief of [
      'reservation-flow',
      'empty-seats',
      'long-labels',
      'pending-queue',
      'return-items',
    ]) {
      const session = await json(
        path.join(repo, 'docs/agent-first/evaluation/briefs', brief, 'session.json'),
      );
      const nominal = checkNominalTypography(context.scheme, session.target);
      assert.ok(
        nominal.roles.every(({ meetsMinimum }) => meetsMinimum),
        `${tone}/${brief}: nominal text minimum`,
      );
    }
  }
});

test('all 72 original SVG bytes and ordered stable tone identities remain unchanged', async () => {
  const catalog = await json(path.join(tones, 'catalog.json'));
  assert.deepEqual(
    catalog.tones.map(({ id }) => id),
    references.toneIds,
  );
  for (const [file, hash] of Object.entries({
    ...references.resources,
    ...references.unrevisedPacks,
  }))
    assert.equal(hashBytes(await fs.readFile(path.join(tones, file))), hash, file);
});

test('kits reproduce exactly, declare every literal palette mark and retain local-only references', async () => {
  await buildPilotKits({ check: true });
  for (const tone of PILOT_TONES) {
    const kit = await read(path.join(tones, tone, 'kit.svg'));
    const scheme = await json(path.join(tones, tone, 'scheme.json'));
    const parser = new SaxesParser({ xmlns: true });
    const ids = new Set();
    const targets = [];
    parser.on('opentag', (tag) => {
      const attrs = Object.fromEntries(
        Object.values(tag.attributes).map(({ name, value }) => [name, value]),
      );
      if (attrs.id) {
        assert.ok(!ids.has(attrs.id), `${tone}: duplicate ID`);
        ids.add(attrs.id);
      }
      if (attrs.href) {
        assert.ok(attrs.href.startsWith('#'));
        targets.push(attrs.href.slice(1));
      }
      if (attrs['clip-path']) {
        const target = attrs['clip-path'].match(/^url\(#([\w-]+)\)$/)?.[1];
        assert.ok(target, `${tone}: clip must be a local ID`);
        targets.push(target);
      }
      for (const kind of ['fill', 'stroke']) {
        if (/^#/.test(attrs[kind] ?? '')) {
          const role = attrs[`data-palette-${kind}`];
          assert.ok(Object.hasOwn(scheme.palette.light, role), `${tone}: unmarked ${kind}`);
          assert.equal(attrs[kind], scheme.palette.light[role]);
        }
      }
    });
    parser.write(kit).close();
    for (const id of targets) assert.ok(ids.has(id), `${tone}: dangling ${id}`);
  }
});

test('palette edits change defaults without geometry; scheme edits require regenerated kits', async () => {
  const directory = await temporary();
  for (const tone of PILOT_TONES) {
    await fs.mkdir(path.join(directory, tone));
    for (const file of ['scheme.json', 'kit.svg', 'kit.template.svg'])
      await fs.copyFile(path.join(tones, tone, file), path.join(directory, tone, file));
    const scheme = await json(path.join(tones, tone, 'scheme.json'));
    const template = await read(path.join(tones, tone, 'kit.template.svg'));
    const before = authorPilotKit(template, scheme);
    const changed = structuredClone(scheme);
    for (const role of Object.keys(changed.palette.light)) changed.palette.light[role] = '#123456';
    const normalize = (svg) => svg.replace(/#[0-9a-f]{6}/gi, '#COLOR');
    assert.equal(normalize(authorPilotKit(template, changed)), normalize(before));
  }
  const schemeFile = path.join(directory, 'fine-outline/scheme.json');
  const scheme = await json(schemeFile);
  scheme.geometry.strokeWidths.outline += 0.25;
  await fs.writeFile(schemeFile, JSON.stringify(scheme));
  await assert.rejects(
    buildPilotKits({ toneRoot: directory, check: true }),
    /differs from its scheme/,
  );
});

test('pencil hatch seed and amplitude deterministically control texture without random output', async () => {
  const current = await json(path.join(tones, 'pencil-notebook/scheme.json'));
  const scheme = { ...current, texture: { ...current.texture, kind: 'seeded-pencil-crosshatch' } };
  const first = pencilHatch(scheme);
  assert.equal(pencilHatch(scheme), first);
  assert.equal(hashBytes(first), references.frozenPilot2PencilHatchHash);
  assert.notEqual(
    pencilHatch({ ...scheme, texture: { ...scheme.texture, seed: scheme.texture.seed + 1 } }),
    first,
  );
  assert.notEqual(pencilHatch({ ...scheme, texture: { ...scheme.texture, amplitude: 0 } }), first);
  assert.equal((first.match(/<path /g) ?? []).length, scheme.texture.frequency * 2);
  const legacy = pencilHatch({
    ...scheme,
    texture: { ...scheme.texture, kind: 'seeded-pencil-hatch' },
  });
  assert.equal((legacy.match(/<path /g) ?? []).length, scheme.texture.frequency);
  assert.equal(hashBytes(legacy), references.frozenPilot1PencilHatchHash);
  const segments = [...first.matchAll(/d="M[^ ]+ ([^L]+)L[^ ]+ ([^"]+)"/g)];
  assert.ok(segments.some((m) => Number(m[1]) > Number(m[2])));
  assert.ok(segments.some((m) => Number(m[1]) < Number(m[2])));
  assert.throws(
    () => pencilHatch({ ...scheme, texture: { ...scheme.texture, frequency: 100000 } }),
    /at most 64/,
  );
  const template = await read(path.join(tones, 'pencil-notebook/kit.template.svg'));
  assert.throws(() => authorPilotKit(`${template}{{unknown:role}}`, current), /Unresolved/);
});

test('authoritative importer preserves scheme bindings, recipe placeholders and complete pack resources', async () => {
  const directory = await temporary();
  const args = [path.join(repo, 'scripts/import-tones.py'), '--tones-only', '--out', directory];
  await exec('python3', args);
  const imported = path.join(directory, 'packages/diagram-gen/tones');
  const catalogPath = path.join(imported, 'catalog.json');
  const catalog = await json(catalogPath);
  const fine = catalog.tones.find(({ id }) => id === 'fine-outline');
  fine.recipe.push('Use stroke 1.6 units for the open object contour.');
  fine.recipeNumericReferences = [
    { recipeIndex: fine.recipe.length - 1, path: 'geometry.strokeWidths.outline', value: 1.6 },
  ];
  await fs.writeFile(catalogPath, JSON.stringify(catalog));
  await exec('python3', args);
  const result = await json(catalogPath);
  assert.deepEqual(
    result.tones.find(({ id }) => id === 'fine-outline').recipeNumericReferences,
    fine.recipeNumericReferences,
  );
  assert.deepEqual(result.tones.find(({ id }) => id === 'fine-outline').recipe, fine.recipe);
  for (const tone of PILOT_TONES) {
    await resolveToneResources(
      imported,
      result.tones.find(({ id }) => id === tone),
      result.version,
      { requireComplete: true },
    );
    const context = await resolveToneContext(tone, { toneRoot: imported });
    assert.deepEqual(context.capabilities, { scheme: true, kit: true });
    for (const file of ['scheme.json', 'kit.svg', 'kit.template.svg'])
      assert.equal(
        await read(path.join(imported, tone, file)),
        await read(path.join(tones, tone, file)),
      );
  }
  await buildPilotKits({ toneRoot: imported, check: true });
  const previous = await read(catalogPath);
  await exec('python3', args);
  assert.equal(await read(catalogPath), previous);
  // The importer preserves declared opaque future bytes; context validation,
  // rather than regeneration, determines whether that format is usable.
  const futureScheme = path.join(imported, 'fine-outline/scheme.json');
  for (const opaque of ['[]', '{"schemaVersion":2}', '{not-yet-json']) {
    await fs.writeFile(futureScheme, opaque);
    await exec('python3', args);
    assert.equal(await read(futureScheme), opaque);
  }
});

test('paper repeat construction varies motif count deterministically and rejects unsupported noise', async () => {
  const scheme = await json(path.join(tones, 'paper-layers/scheme.json'));
  const first = paperCutMotif(scheme);
  assert.equal(first, paperCutMotif(scheme));
  assert.equal(hashBytes(first), references.frozenPilot2PaperCutMotifHash);
  assert.equal((first.match(/<g transform=/g) ?? []).length, scheme.texture.frequency * 2);
  const fewer = { ...scheme, texture: { ...scheme.texture, frequency: 2 } };
  assert.notEqual(paperCutMotif(fewer), first);
  assert.equal((paperCutMotif(fewer).match(/<g transform=/g) ?? []).length, 4);
  for (const changed of [{ frequency: 0 }, { frequency: 17 }, { seed: 1 }, { amplitude: 1 }])
    assert.throws(
      () => paperCutMotif({ ...scheme, texture: { ...scheme.texture, ...changed } }),
      /motifs per row/,
    );
  const paper = await resolveToneContext('paper-layers');
  for (const id of ['paper-cut-motif', 'paper-assembly', 'paper-cut-field', 'paper-assembly-wide'])
    assert.ok(paper.kit.primitives.some((p) => p.id === id));
  const pencil = await resolveToneContext('pencil-notebook');
  for (const id of [
    'pencil-crosshatch',
    'pencil-panel',
    'pencil-crosshatch-wide',
    'pencil-panel-wide',
    'notebook-ground',
  ])
    assert.ok(pencil.kit.primitives.some((p) => p.id === id));
});

// Protect actual authored crossing geometry, not an aesthetic character threshold.
test('pilot-3 pencil fields retain neighboring interior crossings in a label-free lateral region', async () => {
  const scheme = await json(path.join(tones, 'pencil-notebook/scheme.json'));
  const field = pencilField(scheme, 300, 100);
  assert.equal(field, pencilField(scheme, 300, 100));
  assert.notEqual(
    field,
    pencilField({ ...scheme, texture: { ...scheme.texture, seed: 1308 } }, 300, 100),
  );
  const points = [
    ...field.matchAll(/d="M([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)"/g),
  ].map((m) => [
    [Number(m[1]), Number(m[2])],
    [Number(m[3]), Number(m[4])],
    [Number(m[5]), Number(m[6])],
  ]);
  const segments = points.flatMap(([a, b, c]) => [
    [a, b],
    [b, c],
  ]);
  const cross = ([x, y], [u, v]) => x * v - y * u;
  const sub = ([x, y], [u, v]) => [x - u, y - v];
  const intersections = [];
  for (let i = 0; i < segments.length; i++)
    for (let j = i + 1; j < segments.length; j++) {
      const [a, b] = segments[i];
      const [c, d] = segments[j];
      const ab = sub(b, a),
        cd = sub(d, c),
        ac = sub(c, a);
      const det = cross(ab, cd);
      if (Math.abs(det) < 0.01) continue;
      const t = cross(ac, cd) / det,
        u = cross(ac, ab) / det;
      if (t <= 0 || t >= 1 || u <= 0 || u >= 1) continue;
      const x = a[0] + t * ab[0],
        y = a[1] + t * ab[1];
      if (x > 10 && x < 65 && y > 10 && y < 80) intersections.push([x, y]);
    }
  assert.ok(
    intersections.length > 12,
    'repeated families must cross within the exposed lateral field',
  );
  assert.ok(
    Math.max(...intersections.map(([x]) => x)) - Math.min(...intersections.map(([x]) => x)) > 30,
  );
  assert.ok(
    Math.max(...intersections.map(([, y]) => y)) - Math.min(...intersections.map(([, y]) => y)) >
      40,
  );
  for (const dimensions of [
    [0, 100],
    [300, 1001],
  ])
    assert.throws(() => pencilField(scheme, ...dimensions), /dimensions/);
  assert.throws(
    () => pencilField({ ...scheme, texture: { ...scheme.texture, frequency: 1 } }, 300, 100),
    /intervals/,
  );
});

test('preparation uses all five authoritative slots and both palette themes without claiming inspection', async () => {
  const directory = await temporary();
  const records = await preparePilotSupports(directory);
  const palette = await json(path.join(repo, 'docs/agent-first/evaluation/palette.json'));
  assert.equal(records.length, 40);
  const manifest = await read(path.join(directory, 'manifest.json'));
  for (const record of records) {
    assert.equal(record.actuallyInspected, false);
    const placement = await json(
      path.join(repo, 'docs/agent-first/evaluation/briefs', record.brief, 'placement.json'),
    );
    assert.deepEqual([record.width, record.height], [placement.slot.width, placement.slot.height]);
    const svg = await read(path.join(directory, record.svg));
    assert.equal(hashBytes(svg), record.svgSha256);
    const parser = new SaxesParser({ xmlns: true });
    parser.on('opentag', (tag) => {
      const attrs = Object.fromEntries(
        Object.values(tag.attributes).map(({ name, value }) => [name, value]),
      );
      for (const kind of ['fill', 'stroke'])
        if (/^#/.test(attrs[kind] ?? ''))
          assert.ok(
            Object.values(palette[record.theme]).includes(attrs[kind]),
            'all marks use common theme roles',
          );
    });
    parser.write(svg).close();
    assert.ok(
      svg.includes('確認待ち') ||
        (svg.includes('参加申込内容の') && svg.includes('確認・連絡担当')),
    );
  }
  await preparePilotSupports(directory);
  assert.equal(await read(path.join(directory, 'manifest.json')), manifest);
});
