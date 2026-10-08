#!/usr/bin/env node
// Deterministic authored fixture, not generated-quality or user-approval evidence.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const tones = [
  'fine-outline',
  'soft-3d',
  'isometric',
  'line-shadow',
  'pastel-sticker',
  'paper-cut',
  'duotone',
  'bold-marker',
];
export async function createReviewProject(destination, enginePackage, { engineModule } = {}) {
  const { createProject } = await import(
    engineModule || '../packages/diagram-gen/src/scaffold.mjs'
  );
  const { loadProject } = await import(engineModule || '../packages/diagram-gen/src/index.mjs');
  const evidence = fileURLToPath(new URL('../docs/agent-first/evaluation/', import.meta.url));
  const inputs = JSON.parse(await readFile(join(evidence, 'inputs.json'), 'utf8'));
  const specs = await Promise.all(
    inputs.briefs.map(async (brief) => ({
      ...JSON.parse(await readFile(join(evidence, brief.session), 'utf8')),
      slug: brief.id,
    })),
  );
  const result = await createProject({
    destination,
    enginePackage,
    project: true,
    name: 'Deterministic five-session review',
    sessions: specs.map(({ id, slug, title, target }) => ({ id, slug, title, target })),
  });
  const root = resolve(result.directory),
    manifestFile = join(root, 'project.json');
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  manifest.id = 'five-session-review';
  for (const [index, spec] of specs.entries()) {
    const registration = manifest.sessions[index],
      brief = inputs.briefs[index];
    registration.placement = `${registration.path}/placement.json`;
    await writeFile(
      join(root, registration.path, 'placement.json'),
      await readFile(join(evidence, brief.placement)),
    );
    await writeFile(
      join(root, registration.path, 'brief.md'),
      await readFile(join(evidence, brief.brief)),
    );
    for (const [toneIndex, toneId] of [...tones, 'fine-outline'].entries()) {
      const id = toneIndex === tones.length ? 'fine-outline-alt' : `c${toneIndex + 1}`;
      const directory = join(root, registration.path, 'rounds/r01', id);
      await mkdir(directory, { recursive: true });
      const hasDark = !(index === 4 && toneIndex === 7);
      await writeFile(
        join(directory, 'candidate.json'),
        JSON.stringify(
          {
            schemaVersion: 1,
            id,
            title: `${spec.title} · ${toneId}${toneIndex === tones.length ? ' alternate' : ''}`,
            toneId,
            order: toneIndex,
            description:
              'Original deterministic fixture geometry; does not demonstrate tone quality or approval.',
            assets: { light: 'light.svg', ...(hasDark ? { dark: 'dark.svg' } : {}) },
          },
          null,
          2,
        ),
      );
      for (const theme of hasDark ? ['light', 'dark'] : ['light']) {
        const ink = theme === 'dark' ? '#FFFFFF' : '#111827',
          surface = theme === 'dark' ? '#182030' : '#FFFFFF';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.target.width} ${spec.target.height}"><title>${spec.title}</title><desc>Original invented deterministic project comparison fixture.</desc><rect width="${spec.target.width}" height="${spec.target.height}" fill="${surface}"/><rect x="24" y="32" width="${spec.target.width - 48}" height="${spec.target.height - 64}" rx="${4 + toneIndex * 2}" fill="none" stroke="${ink}" stroke-width="${1 + toneIndex}"/><text x="40" y="80" font-family="sans-serif" font-size="22" fill="${ink}">${spec.title}</text><text x="40" y="120" font-family="sans-serif" font-size="16" fill="${ink}">${spec.id}/${id} · ${toneId}</text></svg>\n`;
        await writeFile(join(directory, `${theme}.svg`), svg);
      }
    }
  }
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  const data = await loadProject(root);
  manifest.comparisonSets = tones.map((toneId, index) => ({
    id: `set-${index + 1}`,
    title: `Comparison ${index + 1}`,
    toneId,
    entries: data.sessions.map((session) => ({
      sessionId: session.id,
      candidateId: `c${index + 1}`,
      fingerprint: session.data.candidates.find((candidate) => candidate.id === `c${index + 1}`)
        .fingerprint,
    })),
  }));
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  return root;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2])
    throw new Error('Usage: create-review-project.mjs <empty-destination> [absolute-engine-tgz]');
  console.log(
    await createReviewProject(process.argv[2], process.argv[3], {
      engineModule: process.env.DIAGRAM_ENGINE_MODULE,
    }),
  );
}
