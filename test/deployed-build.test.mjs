import { test, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertBuiltFile, deploymentPaths } from '../scripts/check-deployed-build.mjs';

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

test('discovers real stylesheets in minified and quoted HTML without reading script text', async () => {
  const root = await mkdtemp(join(tmpdir(), 'diagram-deployed-html-'));
  try {
    await writeFile(
      join(root, 'index.html'),
      [
        '<!doctype html><html><head>',
        '<link href=/assets/minified.css rel=stylesheet>',
        '<link rel="stylesheet" href="/assets/double.css">',
        "<link rel='stylesheet' href='/assets/single.css'>",
        '<link rel=stylesheet href=/assets/minified.css>',
        '<link rel=stylesheet href=https://other.example/assets/external.css>',
        '<link rel=preload href=/assets/preload.css>',
        '<!-- <link rel=stylesheet href=/assets/comment.css> -->',
        "<script>const example = '<link rel=stylesheet href=/assets/script.css>';</script>",
        '</head><body><a href=/assets/not-a-stylesheet.css>Example</a></body></html>',
      ].join(''),
    );
    const paths = await deploymentPaths(root);
    expect(paths.slice(0, 5)).toEqual([
      '/',
      '/docs/getting-started/',
      '/docs/guides/',
      '/docs/reference/',
      '/docs/examples/',
    ]);
    expect(paths.slice(5)).toEqual([
      '/assets/minified.css',
      '/assets/double.css',
      '/assets/single.css',
    ]);
    await writeFile(join(root, 'index.html'), '<a href=/assets/not-a-stylesheet.css>Link</a>');
    await expect(deploymentPaths(root)).rejects.toThrow(
      'The built homepage must reference a stylesheet',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
