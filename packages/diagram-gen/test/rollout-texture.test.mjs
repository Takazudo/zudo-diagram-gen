import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { test } from 'vitest';
import { compileRolloutKit, buildRolloutKits } from '../../../scripts/build-rollout-kits.mjs';
import {
  validateToneScheme,
  checkMachineRecipe,
  resolveToneResources,
} from '../src/tone-context.mjs';
import { materializeKit, validateMaterializationKit } from '../src/materialize.mjs';

const ids =
  'contour-wash luminous-glass editorial-serif isometric-solid isometric-wire risograph-duo halftone-manual marker-workshop chalkboard cut-paper'.split(
    ' ',
  );
const root = new URL('../tones/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.json', root), 'utf8'));
const primitiveIds = ['person', 'pin', 'slot-card', 'empty-seat', 'arrow', 'check', 'clock'];
const palette = {
  light: {
    ink: '#193549',
    surface: '#FFF6E4',
    border: '#B5B5A8',
    accent: '#BB5F35',
    deep: '#397F78',
    warning: '#99344D',
  },
  dark: {
    ink: '#F4EEDB',
    surface: '#182A36',
    border: '#667E86',
    accent: '#EBA670',
    deep: '#8AC4AC',
    warning: '#F3A3AC',
  },
};
for (const id of ids) {
  test(`${id}: native scheme, deterministic kit and synchronized recipes resolve offline`, async () => {
    const scheme = JSON.parse(await readFile(new URL(`${id}/scheme.json`, root), 'utf8'));
    const template = await readFile(new URL(`${id}/kit.template.svg`, root), 'utf8');
    const kit = await readFile(new URL(`${id}/kit.svg`, root), 'utf8');
    validateToneScheme(scheme, { toneId: id, collectionVersion: catalog.version });
    const { symbols } = validateMaterializationKit(kit, scheme);
    assert.deepEqual([...symbols.keys()].sort(), [...primitiveIds].sort());
    assert.equal(kit, compileRolloutKit(template, scheme));
    assert.equal(kit, compileRolloutKit(template, scheme));
    const recipe = await readFile(new URL(`${id}/recipe.md`, root), 'utf8');
    checkMachineRecipe(recipe, scheme);
    assert.throws(() => checkMachineRecipe(recipe + '\nstroke: 987 units', scheme), /Unbound/);
    const changed = structuredClone(scheme);
    changed.geometry.strokeWidths.outline += 0.75;
    if (template.includes('{{scheme:geometry.strokeWidths.outline}}'))
      assert.notEqual(kit, compileRolloutKit(template, changed));
    const descriptor = {
      ...catalog.tones.find((tone) => tone.id === id),
      toneRevision: scheme.toneRevision,
      scheme: `${id}/scheme.json`,
      kit: `${id}/kit.svg`,
    };
    const resolved = await resolveToneResources(root.pathname, descriptor, catalog.version, {
      requireComplete: true,
    });
    assert.equal(resolved.capabilities.scheme, true);
    assert.equal(resolved.capabilities.kit, true);
  });
  test(`${id}: production materialization isolates repeated IDs and resolves both palette themes`, async () => {
    const scheme = JSON.parse(await readFile(new URL(`${id}/scheme.json`, root), 'utf8'));
    const kit = await readFile(new URL(`${id}/kit.svg`, root), 'utf8');
    const instances = primitiveIds.flatMap((primitive, index) =>
      [0, 1].map((copy) => ({
        id: `${primitive}-${copy}`,
        primitive,
        x: index * 90,
        y: copy * 140,
        width: 80,
        height: 110,
      })),
    );
    const outputs = [];
    for (const theme of ['light', 'dark']) {
      const svg = materializeKit(kit, {
        scheme,
        palette,
        theme,
        instances,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><title id="title">Repeated native primitives</title></svg>',
      });
      outputs.push(svg);
      assert.equal(/data-palette-|\{\{|var\(/.test(svg), false);
      const declared = [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      assert.equal(new Set(declared).size, declared.length);
      for (const instance of instances)
        assert.ok(declared.includes(`kit-${instance.id}-${instance.primitive}`));
      for (const match of svg.matchAll(/(?:href="#|url\(#)([^"\s)]+)/g))
        assert.ok(declared.includes(match[1]), `unresolved ${match[1]}`);
      assert.ok(svg.includes(palette[theme].ink));
      assert.equal(
        svg,
        materializeKit(kit, {
          scheme,
          palette,
          theme,
          instances,
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><title id="title">Repeated native primitives</title></svg>',
        }),
      );
    }
    assert.equal(
      outputs[0].replace(/#[a-f0-9]{6}/gi, '#COLOR'),
      outputs[1].replace(/#[a-f0-9]{6}/gi, '#COLOR'),
    );
    const composition = await readFile(new URL(`${id}/composition.template.svg`, root), 'utf8');
    const layout = JSON.parse(
      await readFile(new URL(`${id}/composition.instances.json`, root), 'utf8'),
    );
    // Compile placeholders without inventing primitive references or assuming a catalog declaration.
    const compiled = composition
      .replace(/\{\{palette:([A-Za-z]+)\}\}/g, (_, role) => scheme.palette.light[role])
      .replace(/\{\{font:([A-Za-z]+)\}\}/g, (_, role) => scheme.typography[role].fontFamily);
    const literal = checkMachineRecipe(compiled, scheme);
    for (const theme of ['light', 'dark'])
      materializeKit(kit, { scheme, palette, theme, instances: layout.instances, svg: literal });
    assert.equal(layout.width, 640);
    assert.equal(layout.height, 360);
    assert.ok(composition.includes('共有スペースの予約状況を'));
  });
}
test('texture rollout preserves original source and literal references byte-for-byte', async () => {
  for (const id of ids)
    for (const file of ['source.svg', 'light.svg', 'dark.svg']) {
      const local = await readFile(new URL(`${id}/${file}`, root));
      const original = execFileSync('git', [
        'show',
        `fbdda1641fe9cde7128ba2970ab606d85597f1d4:packages/diagram-gen/tones/${id}/${file}`,
      ]);
      assert.deepEqual(local, original);
    }
  await buildRolloutKits({ tones: ids, check: true });
});
