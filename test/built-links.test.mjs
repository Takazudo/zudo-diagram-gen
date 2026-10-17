import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from 'vitest';
import { checkBuiltLinks } from '../scripts/check-built-links.mjs';

test('checks real fragment targets, encoded bookmarks, legacy routes and workbench candidate identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zdg-links-'));
  try {
    await mkdir(join(root, 'guide'));
    await writeFile(
      join(root, 'index.html'),
      `<a href="/guide/?q=1#saved%20drawing">good</a><a href="#local">same page</a><a href="/guide/#candidate=c01&amp;view=inspect">drawing</a><h2 id="local">Local</h2>`,
    );
    await writeFile(
      join(root, 'guide/index.html'),
      `<h2 id="saved drawing">Saved</h2><div data-zfb-island="DiagramWorkbench" data-props='{"dataUrl":"/session.json"}'></div>`,
    );
    await writeFile(join(root, 'session.json'), JSON.stringify({ candidates: [{ id: 'c01' }] }));
    const legacy = [{ route: '/guide/', headings: ['saved drawing'] }];
    expect((await checkBuiltLinks(root, { legacy })).missing).toEqual([]);
    await writeFile(
      join(root, 'index.html'),
      `<a href="/guide/#absent">broken heading</a><a href="/guide/#candidate=absent&amp;view=inspect">broken candidate</a><a href="/missing/">broken route</a><a href="/%zz">bad encoding</a><a href="../../escape">escape</a>`,
    );
    const result = await checkBuiltLinks(root, {
      legacy: [{ route: '/guide/', headings: ['removed'] }],
    });
    expect(result.missing).toHaveLength(6);
    expect(result.missing.join('\n')).toMatch(/missing fragment target/);
    expect(result.missing.join('\n')).toMatch(/invalid URL encoding/);
    expect(result.missing.join('\n')).toMatch(/escapes dist/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
