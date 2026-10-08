import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATE_ASSERTIONS, installedEngine, sha256 } from './integrated-acceptance.mjs';

export async function assembleTrial(config, { engine, base }) {
  const ref = async (file) => ({
    path: path.resolve(base, file),
    sha256: sha256(await readFile(path.resolve(base, file))),
  });
  const project = await engine.loadProject(config.provenance.consumerRoot, { strict: true });
  const captures =
    config.captures ??
    (config.captureDirectory && config.inspectionDirectory
      ? project.sessions.flatMap((session) =>
          session.data.candidates.flatMap((candidate) =>
            ['light', 'dark'].map((theme) => {
              const name = `${session.id}--${candidate.id}--${theme}`;
              return {
                sessionId: session.id,
                candidateId: candidate.id,
                theme,
                capture: path.resolve(base, config.captureDirectory, `${name}.png`),
                sidecar: path.resolve(base, config.captureDirectory, `${name}.png.json`),
                inspection: path.resolve(base, config.inspectionDirectory, `${name}.json`),
              };
            }),
          ),
        )
      : undefined);
  assert.ok(
    Array.isArray(captures),
    'Supply actual capture/inspection paths for each candidate/theme.',
  );
  const manifest = {
    schemaVersion: 1,
    integratedSha: config.integratedSha,
    purpose: 'test',
    userApproval: false,
    provenance: { ...config.provenance },
    palette: await ref(config.palette),
    inputs: [],
    candidates: [],
    comparisons: [],
    gates: [],
    workflow:
      typeof config.workflow === 'string'
        ? JSON.parse(await readFile(path.resolve(base, config.workflow), 'utf8'))
        : config.workflow,
  };
  for (const field of ['engineArchive', 'initializerArchive', 'skillLoading'])
    manifest.provenance[field] = await ref(config.provenance[field]);
  manifest.provenance.authors = await Promise.all(
    config.provenance.authors.map(async (author) => ({
      ...author,
      transcript: await ref(author.transcript),
    })),
  );
  for (const input of config.inputs) {
    manifest.inputs.push({
      sessionId: input.sessionId,
      ...Object.fromEntries(
        await Promise.all(
          ['brief', 'placement', 'checklist'].map(async (field) => [
            field,
            await ref(input[field]),
          ]),
        ),
      ),
    });
  }
  for (const session of project.sessions)
    for (const candidate of session.data.candidates) {
      const metadataPath = path.join(
        config.provenance.consumerRoot,
        session.path,
        candidate.sourcePath,
      );
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
      const record = {
        sessionId: session.id,
        candidateId: candidate.id,
        roundId: candidate.roundId,
        toneId: candidate.toneId,
        fingerprint: candidate.fingerprint,
        parentId: candidate.parentCandidateId,
        styleHash: metadata.provenance?.styleHash ?? null,
        disposition: config.dispositions?.find(
          (item) => item.sessionId === session.id && item.candidateId === candidate.id,
        )?.disposition ?? { status: 'accepted' },
        themes: {},
      };
      for (const theme of ['light', 'dark']) {
        const supplied = captures.filter(
          (item) =>
            item.sessionId === session.id &&
            item.candidateId === candidate.id &&
            item.theme === theme,
        );
        assert.equal(
          supplied.length,
          1,
          `Supply exactly one capture/inspection for ${session.id}/${candidate.id}/${theme}.`,
        );
        record.themes[theme] = {
          svg: await ref(path.join(path.dirname(metadataPath), metadata.assets[theme])),
          capture: await ref(supplied[0].capture),
          sidecar: await ref(supplied[0].sidecar),
          inspection: await ref(supplied[0].inspection),
        };
      }
      manifest.candidates.push(record);
    }
  manifest.comparisons = project.comparisonSets.map((set) => ({
    id: set.id,
    toneId: set.toneId,
    candidates: set.entries.map(({ sessionId, candidateId, fingerprint }) => ({
      sessionId,
      candidateId,
      fingerprint,
    })),
  }));
  for (const id of Object.keys(GATE_ASSERTIONS)) {
    const supplied = config.gates.find((gate) => gate.id === id);
    manifest.gates.push(
      supplied
        ? { ...supplied, evidence: await Promise.all(supplied.evidence.map(ref)) }
        : {
            id,
            status: 'deferred',
            integratedSha: config.integratedSha,
            evidence: [],
            reproduction: 'Required execution record has not been supplied.',
          },
    );
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [configFile, output] = process.argv.slice(2);
  try {
    assert.ok(
      configFile &&
        output &&
        process.argv.length === 4 &&
        path.isAbsolute(configFile) &&
        path.isAbsolute(output),
      'Usage: node scripts/assemble-integrated-trial.mjs /absolute/config.json /absolute/new-manifest.json',
    );
    const config = JSON.parse(await readFile(configFile, 'utf8'));
    const checkoutRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const { engine } = await installedEngine(
      config.provenance.consumerRoot,
      config.provenance.engineModule,
      checkoutRoot,
    );
    const manifest = await assembleTrial(config, { engine, base: path.dirname(configFile) });
    await writeFile(output, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    console.log(`Saved actual evidence manifest: ${output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
