import { test, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertBuiltFile } from '../scripts/check-deployed-build.mjs';

test('accepts exact deployed HTML and CSS but rejects stale successful responses', async () => {
  const root = await mkdtemp(join(tmpdir(), 'diagram-deployed-build-'));
  try {
    await mkdir(join(root, 'docs/examples'), { recursive: true });
    await mkdir(join(root, 'assets'));
    for (const [path, file, current, stale] of [
      ['/', 'index.html', '<main>Native homepage</main>', '<main>Old homepage</main>'],
      ['/docs/examples/', 'docs/examples/index.html', 'Current arrows', 'Old arrows'],
      ['/assets/site.css', 'assets/site.css', 'a{color:inherit}', 'a{color:red}'],
    ]) {
      await writeFile(join(root, file), current);
      await expect(assertBuiltFile(path, Buffer.from(current), root)).resolves.toMatch(
        /^[a-f0-9]{64}$/,
      );
      await expect(assertBuiltFile(path, Buffer.from(stale), root)).rejects.toThrow(
        'deployed bytes do not match this build',
      );
    }
    await expect(assertBuiltFile('/missing/', Buffer.from('200 OK'), root)).rejects.toThrow();
    await expect(assertBuiltFile('/../../outside', Buffer.from(''), root)).rejects.toThrow(
      'Build path must stay inside its directory',
    );
    await expect(assertBuiltFile('//other-host/', Buffer.from(''), root)).rejects.toThrow(
      'Expected a local path',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
