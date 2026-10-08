import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'vitest';
import { compileRolloutKit, buildRolloutKits } from '../../../scripts/build-rollout-kits.mjs';

test('rollout compiler uses authoritative numeric/palette values without altering source templates', async () => {
  const directory = new URL('../tones/fine-outline/', import.meta.url);
  const scheme = JSON.parse(await readFile(new URL('scheme.json', directory), 'utf8'));
  const template = await readFile(new URL('kit.template.svg', directory), 'utf8');
  const first = compileRolloutKit(template, scheme);
  const changed = structuredClone(scheme);
  for (const role of Object.keys(changed.palette.light)) changed.palette.light[role] = '#123456';
  const second = compileRolloutKit(template, changed);
  assert.equal(
    first.replace(/#[a-f0-9]{6}/gi, '#COLOR'),
    second.replace(/#[a-f0-9]{6}/gi, '#COLOR'),
  );
  assert.equal(await readFile(new URL('kit.template.svg', directory), 'utf8'), template);
  assert.throws(() => compileRolloutKit(template + '{{unknown:geometry}}', scheme), /Unresolved/);
  await assert.rejects(buildRolloutKits({ tones: ['fine-outline'], check: true }), /frozen/);
});
