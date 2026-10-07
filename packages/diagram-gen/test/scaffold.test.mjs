import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, vi, onTestFinished } from 'vitest';
const faults = vi.hoisted(() => ({ active: false, writes: 0, root: '' }));
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    writeFile: async (...args) => {
      if (faults.active && ++faults.writes === 3) {
        await original.writeFile(
          join(faults.root, 'package.json'),
          'User changed a file during creation.',
        );
        await original.writeFile(
          join(faults.root, 'user.txt'),
          'Competing process owns this file.',
        );
        throw new Error('Injected filesystem write failure');
      }
      return original.writeFile(...args);
    },
  };
});
import { createProject } from '../src/scaffold.mjs';
test('interrupted scaffold rollback removes only unchanged owned files and preserves concurrent user edits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'scaffold-interruption-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  faults.active = true;
  faults.writes = 0;
  faults.root = root;
  try {
    await assert.rejects(
      createProject({ destination: root, project: true }),
      /Injected filesystem write failure/,
    );
  } finally {
    faults.active = false;
  }
  assert.equal(
    await readFile(join(root, 'package.json'), 'utf8'),
    'User changed a file during creation.',
  );
  assert.equal(await readFile(join(root, 'user.txt'), 'utf8'), 'Competing process owns this file.');
  await assert.rejects(stat(join(root, 'pnpm-workspace.yaml')), /ENOENT/);
  await assert.rejects(createProject({ destination: root }), /not empty/);
});
