import { auditToneReferences } from './reference-audit.mjs';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { loadToneCatalog } from './model.mjs';
import { renderGallery } from './render.mjs';
const script = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
new Script(script, { filename: 'client/app.js' });
const catalog = await loadToneCatalog();
const html = await renderGallery(catalog);
if (!html.includes('diagram-app') || !html.includes('diagram-data'))
  throw new Error('Viewer markup is incomplete.');
console.error(`Verified packaged viewer and ${catalog.candidates.length} tone references.`);

const references = await auditToneReferences();
if (!references.ok) throw new Error(references.errors.join('\n'));
console.error(`Verified ${references.resources.length} offline tone resources.`);

const skillRoot = new URL('../skills/diagram-gen/', import.meta.url);
const skill = await readFile(new URL('SKILL.md', skillRoot), 'utf8');
if (!/^---\nname: diagram-gen\n/.test(skill))
  throw new Error('Packaged core skill frontmatter is missing.');
for (const link of skill.matchAll(/\]\((references\/[^)]+)\)/g)) {
  if (link[1].includes('..')) throw new Error('Skill reference escapes its package.');
  await readFile(new URL(link[1], skillRoot), 'utf8');
}
console.error('Verified packaged core diagram skill and focused references.');
