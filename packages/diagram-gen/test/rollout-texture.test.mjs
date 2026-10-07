import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
// Frozen from shared seed fbdda1641fe9cde7128ba2970ab606d85597f1d4; no Git history is needed in a packed or shallow checkout.
const originalAssetHashes = {
  'contour-wash/source.svg': '187a5e891799da77f535fff043fc6a287063de2a4a18e70f8876c92854f14407',
  'contour-wash/light.svg': '23812c8aa16c97c77fca1ca91973ea50162dd829ad08f1cc6ada83b7cd5ecba5',
  'contour-wash/dark.svg': 'b142c3eb1adc2dc3091fabc747f43785538cb6042b68d9a5c3dfbe8bf46e104e',
  'luminous-glass/source.svg': '808bd77c9a5d107a50b6f9b7780899e5019f329dc9f4799228ca01ccf319e499',
  'luminous-glass/light.svg': '8be407aa7deca88ff2e3693bc0282f039f0226b9d37a635c9650bc9185290fad',
  'luminous-glass/dark.svg': '87502f64dbd04370b894f6095dbb23763db8014472380e3444e83fea8d2fd990',
  'editorial-serif/source.svg': '719de4d76ced49bbc43c1041c969626751ffd33a1312a4a3fbab7ae44aee36b4',
  'editorial-serif/light.svg': 'b8bad0aa9b6868751813671613a0b5be9e42371e19643f40c385bf2e53654a01',
  'editorial-serif/dark.svg': '555209ac783b3d074f026f2dc92311f9843766c95cd2ad1c09af21a57dbd35ab',
  'isometric-solid/source.svg': '266d7d1ebc67afda7b8e9efd61f2be96dd156e35641f0ac0d7c4c340ac9c552f',
  'isometric-solid/light.svg': '6796d2721eab23e6a8edec56425408e79369d1d6d26e818777b99d4e63915fb8',
  'isometric-solid/dark.svg': 'ff32483632b40e99e049be74cc3e4a23b0652e36b3aff013e9f58d9422dd0514',
  'isometric-wire/source.svg': '220bd2a063912d1fb75badbff447f10358ca7d13a34be2f0d049c477f7c2358d',
  'isometric-wire/light.svg': '35aa6434483e07865e7866a79395274b7c7bba8bc36d270d25f1b8eebdf8761e',
  'isometric-wire/dark.svg': 'ba0d0066f1b5dbbd484d0e52ece13cfa94e2ba852796cb1309194a7da2d202e2',
  'risograph-duo/source.svg': '8ac99874b68a90a0729d3712c3739cb23cda030e1a26207c41d2c4c6f435667f',
  'risograph-duo/light.svg': '4102fae24fa239536c54c8712915dc64d2b156f2a2b9b73128260548861e4830',
  'risograph-duo/dark.svg': '1f1bf00f5c3bfba3d2e462f3c15f30d79e52e6a06d1fcf2e88d7ea1f0d1dc362',
  'halftone-manual/source.svg': 'ea320160e87efb3e251b2f73656bec2e4e88967b714292dee43b3643136ebb60',
  'halftone-manual/light.svg': '73045f4d8328770e6a686b4cfcf0f1f0d6410f2ec140ea2c677f0162be987be5',
  'halftone-manual/dark.svg': 'ca1af3277e891780a6658ba289ca6e4d74f756179991e2c85753fc4a609f4dc9',
  'marker-workshop/source.svg': '1eaa6489f88c5c411d045872f6ccba406d37a183d4dabc9977770450f2a50938',
  'marker-workshop/light.svg': '79e40458bb5ef44e9d33d57c86bf7191934b308eaea0d50a519f1a7cf4b6e61d',
  'marker-workshop/dark.svg': '9c82add3309956e2d2d956ef306176c4dc018c944788e8e8508a43daabc4b562',
  'chalkboard/source.svg': '9df7600d9152ca753dbe1b329db46e347ff3b395b2e2ae637df309f5dc85b8af',
  'chalkboard/light.svg': 'c1dbbf605f80fdf881aa62a2a6f9acc779d8c16cf95e5ea9a1cc151f77838fa3',
  'chalkboard/dark.svg': '1dd0379f31e2b439a5a9d581cc0d98b7fe3e9f39a761d2f29b486141ff9e5f56',
  'cut-paper/source.svg': '40bc271f89d6de6bb7ca4d9e8b7b863416a30f58986b7b35070b3ee2f0b872fe',
  'cut-paper/light.svg': '32a0e49db432e2d09c6c00f4283114951950175cd97f1e22b233f4ad4ec5d1e1',
  'cut-paper/dark.svg': 'd26c6b8fde8e5441b8a471eb5b524a35c86f76201d88f64fffb8834341d56b58',
};
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
      assert.equal(
        createHash('sha256').update(local).digest('hex'),
        originalAssetHashes[`${id}/${file}`],
      );
    }
  await buildRolloutKits({ tones: ids, check: true });
});
