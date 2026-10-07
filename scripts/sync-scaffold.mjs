import { readFile, writeFile } from 'node:fs/promises';
const source = new URL('../packages/diagram-gen/src/scaffold.mjs', import.meta.url);
const output = new URL(
  '../packages/create-zudo-diagram-gen/src/scaffold.generated.mjs',
  import.meta.url,
);
const expected =
  '// Generated from packages/diagram-gen/src/scaffold.mjs by scripts/sync-scaffold.mjs.\n' +
  (await readFile(source, 'utf8'));
if (process.argv.includes('--check')) {
  if ((await readFile(output, 'utf8')) !== expected)
    throw new Error('Initializer scaffold bundle is stale. Run node scripts/sync-scaffold.mjs.');
} else await writeFile(output, expected);
