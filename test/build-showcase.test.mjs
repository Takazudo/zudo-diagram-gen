import { test, expect } from 'vitest';
import { mkdtemp, cp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildShowcase, projectRoot } from '../scripts/build-showcase.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');

async function exists(path) {
  return access(path).then(
    () => true,
    () => false,
  );
}

test('generates escaped MDX and JSON, then prunes only untouched output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'diagram-showcase-'));
  try {
    const example = join(root, 'examples/project-text');
    await mkdir(join(root, 'examples'), { recursive: true });
    await cp(join(projectRoot, 'examples/project-text'), example, { recursive: true });
    const sessionFile = join(example, 'session.json');
    const session = JSON.parse(await readFile(sessionFile, 'utf8'));
    session.title = 'A {brace} <tag> "quote" `tick`';
    session.description = 'Description with {x}, <script>, "quotes", and `ticks`.';
    await writeFile(sessionFile, JSON.stringify(session));
    await mkdir(join(root, 'pages/examples'), { recursive: true });
    await mkdir(join(root, '.generated'), { recursive: true });
    await mkdir(join(root, 'src/generated'), { recursive: true });
    await mkdir(join(root, 'public/previews'), { recursive: true });
    const stale = 'pages/examples/removed.tsx';
    const edited = 'pages/tones.tsx';
    const retiredData = 'src/generated/site-data.ts';
    const retiredPreview = 'public/previews/tone-fine-outline.svg';
    const editedPreview = 'public/previews/tone-cut-paper.svg';
    await writeFile(join(root, stale), 'old route');
    await writeFile(join(root, edited), 'user edit');
    await writeFile(join(root, retiredData), 'old homepage data');
    await writeFile(join(root, retiredPreview), 'old homepage preview');
    await writeFile(join(root, editedPreview), 'user-edited preview');
    await writeFile(
      join(root, '.generated/showcase-files.json'),
      JSON.stringify({
        [stale]: hash('old route'),
        [edited]: hash('original route'),
        [retiredData]: hash('old homepage data'),
        [retiredPreview]: hash('old homepage preview'),
        [editedPreview]: hash('original preview'),
      }),
    );

    await buildShowcase(root);
    const page = await readFile(join(root, 'src/content/docs/examples/project-text.mdx'), 'utf8');
    const index = await readFile(join(root, 'src/content/docs/examples/index.mdx'), 'utf8');
    expect(page).toContain(`title: ${JSON.stringify(session.title)}`);
    expect(page).toContain(`description: ${JSON.stringify(session.description)}`);
    expect(index).toContain(`{${JSON.stringify(session.title)}}`);
    expect(index).toContain(`{${JSON.stringify(session.description)}}`);
    expect(index).toContain(
      'description: Complete sessions showing tone exploration and project-specific diagrams.',
    );
    expect(index).toContain('/docs/examples/project-text/');
    expect(
      JSON.parse(await readFile(join(root, 'public/workbench-data/project-text.json'), 'utf8'))
        .session.title,
    ).toBe(session.title);
    expect(await exists(join(root, 'public/workbench-data/tone-catalog.json'))).toBe(true);
    expect(await exists(join(root, stale))).toBe(false);
    expect(await readFile(join(root, edited), 'utf8')).toBe('user edit');
    expect(await exists(join(root, retiredData))).toBe(false);
    expect(await exists(join(root, retiredPreview))).toBe(false);
    expect(await readFile(join(root, editedPreview), 'utf8')).toBe('user-edited preview');

    const manifestBefore = await readFile(join(root, '.generated/showcase-files.json'), 'utf8');
    await buildShowcase(root);
    expect(await readFile(join(root, '.generated/showcase-files.json'), 'utf8')).toBe(
      manifestBefore,
    );
    const catalog = JSON.parse(
      await readFile(join(root, 'public/workbench-data/tone-catalog.json'), 'utf8'),
    );
    expect(catalog.tones).toHaveLength(24);
    expect(catalog.candidates).toHaveLength(24);

    await rm(example, { recursive: true });
    await buildShowcase(root);
    expect(await exists(join(root, 'src/content/docs/examples/project-text.mdx'))).toBe(false);
    expect(await exists(join(root, 'public/workbench-data/project-text.json'))).toBe(false);
    expect(await exists(join(root, 'public/previews/project-text.svg'))).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
