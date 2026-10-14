import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function edit(file, transform) {
  const before = readFileSync(file, 'utf8');
  const after = transform(before);
  assert.notEqual(after, before, `Expected a reviewed change in ${file}`);
  writeFileSync(file, after);
}
// Apply the reviewed stable targets; the private channel resolver already produced this plan.
edit('package.json', (text) => {
  const pkg = JSON.parse(text);
  for (const name of ['@takazudo/zfb', '@takazudo/zfb-runtime', '@takazudo/zfb-md-wasm']) {
    assert.equal(pkg.dependencies[name], '4.3.1');
    pkg.dependencies[name] = '4.5.0';
  }
  assert.equal(pkg.dependencies['@takazudo/zudo-doc'], '6.0.0');
  pkg.dependencies['@takazudo/zudo-doc'] = '6.2.0';
  assert.equal(pkg.dependencies['@takazudo/zudo-diagram-gen'], 'workspace:*');
  return JSON.stringify(pkg, null, 2) + '\n';
});
for (const file of [
  'packages/diagram-gen/src/scaffold.mjs',
  'packages/create-zudo-diagram-gen/test/initializer.test.mjs',
  'scripts/check-project-review-packed.sh',
  'scripts/check-zfb-consumers.mjs',
  'AGENTS.md', 'README.md', 'IMPLEMENTATION-CONTRACT.md', 'docs/CODEX-HANDOFF.md',
  'packages/create-zudo-diagram-gen/README.md', 'packages/diagram-gen/README.md',
  'src/content/docs/reference/architecture.mdx',
]) edit(file, (text) => text.replaceAll('4.3.1', '4.5.0').replaceAll('zudo-doc 6.0.0', 'zudo-doc 6.2.0'));
edit('tsconfig.json', (text) => text.replace('"types": ["node"],\n    "baseUrl": null', '"types": ["node"]'));
edit('docs/CODEX-HANDOFF.md', (text) => text.replace('The root extends the published zudo-doc tsconfig and clears its inherited baseUrl for TypeScript 6.', 'The root extends the published zudo-doc tsconfig; its baseUrl override is no longer needed.'));
edit('src/chrome-bindings.tsx', (text) => text.replace("import DiagramWorkbench from './components/diagram-workbench';", "import DiagramWorkbench from './components/diagram-workbench';\nimport sidebars from './sidebars';").replace('defineChromeBindings({\n', 'defineChromeBindings({\n  sidebarsConfig: sidebars,\n').replace('DiagramWorkbench: ({ dataUrl }) => {', 'DiagramWorkbench: ({ dataUrl }: { dataUrl: unknown }) => {'));
edit('docs/documentation-structure.md', (text) => text.replace('`src/chrome-bindings.tsx` only registers the embedded workbench as an MDX extra.', '`src/chrome-bindings.tsx` registers the embedded workbench as an MDX extra and binds `src/sidebars.ts`. Each sidebar entry uses `{ items: [], scopeRoot: "configured" }`: pages and ordering are still filesystem-generated, but the scope stops at the current section, matching the original zudo-doc showcase. Do not replace empty items with curated page lists or hide scope controls with CSS.'));
edit('AGENTS.md', (text) => text.replace('The filesystem is the navigation.', 'The native `scopeRoot: "configured"` sidebar setting caps each section without replacing its automatic tree. Keep `items: []`; do not restore cross-section Broaden controls.\n\nThe filesystem is the navigation.'));
edit('scripts/check-site-browser.mjs', (text) => text.replace("import { checkDocumentationBrowser } from './check-documentation-browser.mjs';", "import { checkDocumentationBrowser } from './check-documentation-browser.mjs';\nimport { checkSectionSidebars } from './check-section-sidebars.mjs';").replace('  await checkDocumentationBrowser(browser, origin);', '  await checkDocumentationBrowser(browser, origin);\n  await checkSectionSidebars(browser, origin);'));
execFileSync(process.execPath, ['scripts/sync-scaffold.mjs'], { stdio: 'inherit' });
