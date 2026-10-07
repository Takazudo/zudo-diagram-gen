#!/usr/bin/env node
// Caller-supplied fixture host; no drawings, installation or Git side effects.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { createProject } = await import(
  process.env.DIAGRAM_ENGINE_MODULE || '../packages/diagram-gen/src/scaffold.mjs'
);
const destination = process.argv[2];
if (!destination)
  throw new Error(
    'Usage: node scripts/create-public-project.mjs <empty-destination> [absolute-engine-tgz]',
  );
const evidence = fileURLToPath(new URL('../docs/agent-first/evaluation/', import.meta.url));
const inputs = JSON.parse(await readFile(join(evidence, 'inputs.json'), 'utf8'));
const sessions = await Promise.all(
  inputs.briefs.map(async (item) => ({
    ...JSON.parse(await readFile(join(evidence, item.session), 'utf8')),
    slug: item.id,
  })),
);
const result = await createProject({
  destination,
  project: true,
  name: 'Five public Japanese teaching diagrams',
  enginePackage: process.argv[3],
  sessions: sessions.map(({ id, slug, title, target }) => ({ id, slug, title, target })),
});
const root = resolve(result.directory);
const manifest = JSON.parse(await readFile(join(root, 'project.json'), 'utf8'));
for (const item of inputs.briefs) {
  await writeFile(
    join(root, `sessions/${item.id}/brief.md`),
    await readFile(join(evidence, item.brief)),
  );
  await writeFile(
    join(root, `sessions/${item.id}/placement.json`),
    await readFile(join(evidence, item.placement)),
  );
  manifest.sessions.find((entry) => entry.id === item.id).placement =
    `sessions/${item.id}/placement.json`;
}
await writeFile(join(root, 'project.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(result));
