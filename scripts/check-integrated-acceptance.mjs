import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { evidenceReader, installedEngine, validateAcceptance } from './integrated-acceptance.mjs';

const [manifestFile, evidenceRoot] = process.argv.slice(2);
if (!manifestFile || !evidenceRoot || process.argv.length !== 4) {
  console.error(
    'Usage: node scripts/check-integrated-acceptance.mjs /absolute/trial-manifest.json /absolute/evidence-root',
  );
  process.exitCode = 2;
} else {
  try {
    if (![manifestFile, evidenceRoot].every(path.isAbsolute))
      throw new Error('Use explicit absolute manifest and evidence paths.');
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    const checkoutRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const { engine, packageVersion } = await installedEngine(
      manifest.provenance.consumerRoot,
      manifest.provenance.engineModule,
      checkoutRoot,
    );
    assert.equal(
      manifest.provenance.packageVersions?.engine,
      packageVersion,
      'Recorded engine version differs from installed package.',
    );
    const project = await engine.loadProject(manifest.provenance.consumerRoot, { strict: true });
    const readEvidence = await evidenceReader(path.dirname(manifestFile), [
      evidenceRoot,
      manifest.provenance.consumerRoot,
      ...[
        manifest.workflow?.catalogUpgrade?.consumerRoot,
        manifest.workflow?.noBrowser?.consumerRoot,
        manifest.workflow?.sweep?.root,
      ].filter(Boolean),
    ]);
    const result = await validateAcceptance({
      manifest,
      project,
      engine,
      readEvidence,
      publicRoot: path.join(checkoutRoot, 'docs/agent-first/evaluation'),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          status: 'fail',
          ok: false,
          diagnostics: [{ id: 'setup', message: error.message }],
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}
