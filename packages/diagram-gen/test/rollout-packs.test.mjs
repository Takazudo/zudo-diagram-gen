import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { test, onTestFinished } from 'vitest';
import { loadToneCatalog, validateSession } from '../src/model.mjs';
import { hashBytes, KIT_PRIMITIVES } from '../src/tone-context.mjs';
import {
  buildRolloutKits,
  compileAuthoringTemplate,
} from '../../../scripts/build-rollout-kits.mjs';
import { buildP09Evidence } from '../../../scripts/build-p09-evidence.mjs';
const root = fileURLToPath(new URL('../tones/', import.meta.url));
const ids = [
  'technical-blueprint',
  'swiss-grid',
  'transit-wayfinding',
  'ui-miniature',
  'modular-geometric',
  'terminal',
  'pixel-schematic',
  'circuit-route',
  'offset-blocks',
  'ink-silhouette',
];

test('authored rollout packs are reproducible, numerically bound and geometrically distinct', async () => {
  const catalog = await loadToneCatalog();
  await buildRolloutKits({ tones: ids, check: true });
  const geometries = new Set();
  for (const id of ids) {
    const { context } = catalog.tones.find((t) => t.id === id);
    assert.deepEqual(context.capabilities, { scheme: true, kit: true });
    assert.deepEqual(
      context.kit.primitives.map(({ id }) => id),
      KIT_PRIMITIVES,
    );
    assert.ok(!context.recipeDocument.text.includes('{{'));
    const template = await fs.readFile(path.join(root, id, 'kit.template.svg'), 'utf8');
    geometries.add(hashBytes(template.replaceAll(id, '').replace(/#[a-f0-9]{6}/gi, '#COLOR')));
    const changed = structuredClone(context.scheme);
    changed.geometry.strokeWidths.outline += 0.5;
    assert.notEqual(
      compileAuthoringTemplate(template, changed),
      compileAuthoringTemplate(template, context.scheme),
    );
  }
  assert.equal(geometries.size, ids.length);
});

test('evidence preparation uses repeated production instances and exact explicit themes without claiming inspection', async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'p09-evidence-'));
  onTestFinished(() => fs.rm(output, { recursive: true, force: true }));
  const records = await buildP09Evidence({
    output,
    tones: ['technical-blueprint', 'offset-blocks'],
  });
  assert.equal(records.length, 16);
  for (const record of records) {
    assert.equal(record.inspected, false);
    assert.equal(record.capture, 'pending');
    assert.ok(record.instances.length >= 7);
    if (record.kind === 'kit') assert.equal(record.instances.length, 14);
    const directory = path.join(output, record.name);
    const checked = await validateSession(directory);
    assert.equal(checked.ok, true, checked.errors.join('\n'));
    const svg = await fs.readFile(
      path.join(directory, `rounds/r01/c01/${record.theme}.svg`),
      'utf8',
    );
    assert.equal(hashBytes(svg), record.assetHash);
    assert.ok(svg.includes('基本形') || svg.includes('予約状況'));
    assert.ok(!svg.includes('data-palette-'));
    assert.ok(!svg.includes('{{'));
    const candidate = JSON.parse(
      await fs.readFile(path.join(directory, 'rounds/r01/c01/candidate.json'), 'utf8'),
    );
    assert.deepEqual(Object.keys(candidate.assets), ['light', 'dark']);
    assert.notEqual(
      await fs.readFile(path.join(directory, 'rounds/r01/c01/light.svg'), 'utf8'),
      await fs.readFile(path.join(directory, 'rounds/r01/c01/dark.svg'), 'utf8'),
    );
  }
  const first = await fs.readFile(path.join(output, 'manifest.json'), 'utf8');
  await buildP09Evidence({ output, tones: ['technical-blueprint', 'offset-blocks'] });
  assert.equal(await fs.readFile(path.join(output, 'manifest.json'), 'utf8'), first);
});
