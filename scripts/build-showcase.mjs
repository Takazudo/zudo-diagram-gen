import { readdir, mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve, join, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadSession, loadToneCatalog } from '../packages/diagram-gen/src/model.mjs';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const links = {
  homeUrl: '/',
  docsUrl: '/docs/getting-started/',
  catalogUrl: '/docs/tones/',
};
const digest = (content) => createHash('sha256').update(content).digest('hex');
const frontmatterValue = (value) => JSON.stringify(String(value));
const mdxText = (value) => `{${JSON.stringify(String(value))}}`;
const generatedPath =
  /^(?:pages\/(?:examples\/[^/]+|tones|workbench)\.tsx|public\/previews\/[^/]+\.svg|public\/workbench-data\/[^/]+\.json|src\/generated\/site-data\.ts|src\/content\/docs\/(?:tones\/index|examples\/(?:index|[^/]+))\.mdx)$/;

function workbenchPage(data, dataUrl, intro) {
  return `---
title: ${frontmatterValue(data.session.title)}
description: ${frontmatterValue(data.session.description || '')}
wide: true
hide_sidebar: true
hide_toc: true
---

${intro}

<DiagramWorkbench dataUrl=${JSON.stringify(dataUrl)} />
`;
}

function examplesIndex(sessions) {
  const cards = sessions
    .map(
      (session) => `  <article class="min-w-0">
    ${session.hasPreview ? `<a href=${JSON.stringify(session.href)} class="block" aria-label=${JSON.stringify(`Open ${session.title}`)}><img src=${JSON.stringify(session.preview)} alt=${JSON.stringify(`Preview of ${session.title}`)} loading="lazy" class="block h-auto w-full max-w-full" /></a>` : ''}
    <div class="mt-vsp-sm">
      <a href=${JSON.stringify(session.href)} data-example-title-link class="inline-flex items-start gap-x-hsp-xs font-medium text-fg hover:text-accent hover:underline focus-visible:text-accent focus-visible:underline">
        <span data-example-title-icon aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" focusable="false"><path d="m13.2 3.6-1.4 1.4 6 6H2v2h15.8l-6 6 1.4 1.4L21.6 12l-8.4-8.4Z" /></svg></span>
        <span class="min-w-0">${mdxText(session.title)}</span>
      </a>
      <p class="mt-vsp-2xs text-small text-muted">${mdxText(session.description)}</p>
      <p class="mt-vsp-2xs text-caption text-muted">${session.candidates} ${session.candidates === 1 ? 'candidate' : 'candidates'} · ${session.rounds} ${session.rounds === 1 ? 'round' : 'rounds'}</p>
    </div>
  </article>`,
    )
    .join('\n');
  return `---
title: Worked examples
description: Complete sessions showing tone exploration and project-specific diagrams.
sidebar_position: 0
wide: true
---

Each session has its own brief and target size. Open one to inspect its drawings and try the review controls. These are authored studies, not deployed integrations or user-approved results.

[Learn how to review candidates](../gallery/reviewing.mdx) and [refine a saved drawing](../guides/refine-export.mdx), or read the [example facts and provenance](../getting-started/introduction.mdx#explore-a-session-before-creating-one).

<div class="mt-vsp-lg grid grid-cols-1 gap-x-hsp-lg gap-y-vsp-lg sm:grid-cols-2 lg:grid-cols-3">
${cards}
</div>
`;
}

export async function buildShowcase(root = projectRoot) {
  const generated = {};
  const manifestPath = join(root, '.generated/showcase-files.json');
  let previous = {};
  try {
    previous = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  async function writeIfChanged(file, content) {
    generated[relative(root, file)] = digest(content);
    try {
      if ((await readFile(file, 'utf8')) === content) return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  }

  const catalog = await loadToneCatalog();
  await writeIfChanged(
    join(root, 'public/workbench-data/tone-catalog.json'),
    JSON.stringify({ ...catalog, links }, null, 2) + '\n',
  );
  await writeIfChanged(
    join(root, 'src/content/docs/tones/index.mdx'),
    workbenchPage(
      catalog,
      '/workbench-data/tone-catalog.json',
      'Browse 24 authored SVG references. Each tone has complete light and dark artwork and a recipe for adapting the treatment to a new brief.\n\n[Choose and apply a tone](/docs/authoring/tone-collection/) · [Save an explicitly adopted style](/docs/guides/saved-styles/) · [Tone format reference](/docs/authoring/tone-context/)',
    ),
  );

  const entries = (await readdir(join(root, 'examples'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  const sessions = [];
  for (const entry of entries) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) ||
      ['index', 'tone-catalog'].includes(entry.name)
    )
      throw new Error(`Invalid example directory name: ${entry.name}`);
    const data = await loadSession(join(root, 'examples', entry.name));
    const dataUrl = `/workbench-data/${entry.name}.json`;
    await writeIfChanged(
      join(root, 'public', dataUrl),
      JSON.stringify({ ...data, links }, null, 2) + '\n',
    );
    await writeIfChanged(
      join(root, 'src/content/docs/examples', `${entry.name}.mdx`),
      workbenchPage(
        data,
        dataUrl,
        'Inspect the drawings at their intended size, compare directions, and try the review controls. Browser feedback stays in this browser until you copy, download, or import a review record.\n\n[Review guide](/docs/gallery/reviewing/) · [Refine and export](/docs/guides/refine-export/) · [Create your own local session](/docs/getting-started/first-session/)',
      ),
    );
    const first = data.candidates[0];
    const preview = `/previews/${entry.name}.svg`;
    if (first) await writeIfChanged(join(root, 'public', preview), first.assets.light);
    sessions.push({
      slug: entry.name,
      title: data.session.title,
      description: data.session.description || '',
      candidates: data.candidates.length,
      rounds: data.rounds.length,
      preview,
      hasPreview: Boolean(first),
      href: `/docs/examples/${entry.name}/`,
    });
  }
  sessions.sort((a, b) =>
    a.slug === 'tone-exploration'
      ? -1
      : b.slug === 'tone-exploration'
        ? 1
        : a.title.localeCompare(b.title),
  );
  const index = examplesIndex(sessions);
  await writeIfChanged(join(root, 'src/content/docs/examples/index.mdx'), index);
  // Wind's normal source scan excludes these gitignored generated MDX files.
  await writeIfChanged(
    join(root, '.generated/showcase-wind.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        specVersion: 1,
        producer: 'showcase',
        candidates: [
          ...new Set(
            [...index.matchAll(/class="([^"]+)"/g)].flatMap((match) => match[1].split(/\s+/)),
          ),
        ].sort(),
      },
      null,
      2,
    ) + '\n',
  );

  for (const [file, hash] of Object.entries(previous)) {
    if (file in generated || !generatedPath.test(file)) continue;
    try {
      const absolute = join(root, file);
      if (digest(await readFile(absolute)) === hash) await unlink(absolute);
      else console.warn(`Preserved modified generated file: ${file}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(generated, null, 2) + '\n');
  return {
    tones: catalog.candidates.length,
    sessions: sessions.length,
    candidates: sessions.reduce((sum, session) => sum + session.candidates, 0),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log('Prepared showcase:', await buildShowcase());
