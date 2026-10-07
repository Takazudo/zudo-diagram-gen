import { readFile } from 'node:fs/promises';
import {
  auditToneReferences,
  auditExternalReferences,
} from '../packages/diagram-gen/src/reference-audit.mjs';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--external') || args.length > 1) {
  console.error('Usage: node scripts/audit-tone-references.mjs [--external]');
  process.exitCode = 2;
} else {
  const result = await auditToneReferences();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
  if (args.includes('--external')) {
    const catalog = JSON.parse(
      await readFile(
        new URL('../packages/diagram-gen/tones/catalog.json', import.meta.url),
        'utf8',
      ),
    );
    console.log(
      JSON.stringify(
        { optionalExternalReferences: await auditExternalReferences(catalog) },
        null,
        2,
      ),
    );
  }
}
