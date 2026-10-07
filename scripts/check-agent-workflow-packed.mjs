/** Installed-only P08 fixture. Run after packing/installing an engine in an isolated bootstrap. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { DIAGRAM_ENGINE_MODULE, ENGINE_TGZ, AGENT_WORKFLOW_OUT } = process.env;
for (const [name, value] of Object.entries({
  DIAGRAM_ENGINE_MODULE,
  ENGINE_TGZ,
  AGENT_WORKFLOW_OUT,
}))
  assert.ok(value && path.isAbsolute(value), `${name} must be an explicit absolute path`);
const installedModule = await realpath(DIAGRAM_ENGINE_MODULE);
assert.ok(
  installedModule.includes('/node_modules/'),
  'Use an installed archive, never a checkout module',
);
const engine = await import(pathToFileURL(installedModule));
const cli = path.join(path.dirname(installedModule), 'cli.mjs');
const output = AGENT_WORKFLOW_OUT;
await mkdir(output); // Exclusive new validation destination; preserve all outputs for manager inspection.
const json = async (file, value) =>
  writeFile(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function command(args, status = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  const envelope = JSON.parse(result.stdout);
  assert.equal(result.status, status, result.stderr || result.stdout);
  assert.equal(envelope.schemaVersion, 1);
  return envelope;
}
const brief =
  '# Diagram brief\n\n## Intent\nExplain a reservation moving from pending to confirmed.\n\n## Must show\nPending reservation, explicit confirmation, confirmed seat; keep these facts.\n\n## May drop\nDecorative people.\n\n## References\nInvented public test scenario; SVG authored here, no third-party assets.\n\n## Lock\nTest choices only, no user approval.\n\n## Target\n360 × 200 CSS pixels; session.json is authoritative.\n\n## Language and fonts\nEnglish, sans-serif.\n';
const briefPath = path.join(output, 'brief.md');
await writeFile(briefPath, brief, { flag: 'wx' });
const single = path.join(output, 'single');
command(['new', '--out', single, '--brief', briefPath, '--engine-package', ENGINE_TGZ, '--json']);
const defaultProject = path.join(output, 'default-project');
command([
  'new',
  '--out',
  defaultProject,
  '--brief',
  briefPath,
  '--engine-package',
  ENGINE_TGZ,
  '--project',
  '--json',
]);
command(['resume', defaultProject, '--json']);
const project = path.join(output, 'sweep');
await engine.createProject({
  destination: project,
  project: true,
  enginePackage: ENGINE_TGZ,
  brief,
  sessions: Array.from({ length: 5 }, (_, i) => ({
    slug: `feature-${i + 1}`,
    id: `feature-${i + 1}`,
    title: `Reservation feature ${i + 1}`,
  })),
});
const tone = await engine.resolveToneContext('fine-outline');
async function author(root) {
  const candidateRoot = path.join(root, 'rounds/r01/r01-c01');
  await mkdir(candidateRoot);
  await json(path.join(candidateRoot, 'candidate.json'), {
    schemaVersion: 1,
    id: 'r01-c01',
    title: 'Reservation confirmation',
    toneId: tone.id,
    order: 1,
    parentCandidateId: null,
    assets: { light: 'light.svg', dark: 'dark.svg' },
  });
  for (const theme of ['light', 'dark']) {
    const palette = tone.scheme.palette[theme];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><title>Reservation confirmation</title><desc>Pending reservation becomes a confirmed seat after explicit confirmation.</desc><rect width="360" height="200" fill="${palette.surface}"/><g fill="${palette.surface}" stroke="${palette.ink}" stroke-width="2"><rect x="15" y="55" width="135" height="90" rx="8"/><rect x="210" y="55" width="135" height="90" rx="8"/><path d="M160 100 H200 m-8 -8 8 8 -8 8" fill="none"/></g><g fill="${palette.ink}" font-family="sans-serif" font-size="15" text-anchor="middle"><text x="82" y="90">Pending</text><text x="82" y="115">reservation</text><text x="278" y="90">Confirmed</text><text x="278" y="115">seat</text><text x="180" y="175">Explicit confirmation</text></g></svg>`;
    await writeFile(path.join(candidateRoot, `${theme}.svg`), svg, { flag: 'wx' });
  }
}
await author(single);
let projectData = await engine.loadProject(project);
// One test tone author writes every assigned candidate; coordinator alone writes manifest/mappings.
for (const entry of projectData.sessions) await author(path.join(project, entry.path));
projectData = await engine.loadProject(project);
const manifest = projectData.project;
manifest.comparisonSets = [
  {
    id: 'fine-outline-comparison',
    title: 'Five reservation features',
    toneId: tone.id,
    entries: projectData.sessions.map((entry) => ({
      sessionId: entry.id,
      candidateId: 'r01-c01',
      fingerprint: entry.data.candidates[0].fingerprint,
    })),
  },
];
await writeFile(path.join(project, 'project.json.tmp'), JSON.stringify(manifest, null, 2));
const { rename } = await import('node:fs/promises');
await rename(path.join(project, 'project.json.tmp'), path.join(project, 'project.json'));
command(['check', single, '--json-version', '1']);
command(['check', project, '--json-version', '1']);
const baseline = (await engine.loadSession(single)).candidates[0];
const review = {
  schemaVersion: 1,
  type: 'zudo-diagram-review',
  sessionId: (await engine.loadSession(single)).session.id,
  records: [
    {
      id: baseline.id,
      fingerprint: baseline.fingerprint,
      keep: 'Facts and geometry',
      change: 'Later requested adjustment',
      action: 'refine',
    },
  ],
  shortlist: [],
  chosenDirection: { id: baseline.id, fingerprint: baseline.fingerprint },
};
const reviewPath = path.join(output, 'test-review.json');
await json(reviewPath, review);
command(['resume', single, '--review', reviewPath, '--json']);
await mkdir(path.join(single, 'rounds/r02'));
await json(path.join(single, 'rounds/r02/round.json'), {
  schemaVersion: 1,
  id: 'r02',
  title: 'Saved refinement',
  order: 2,
  baselineCandidateId: baseline.id,
});
await engine.createRefinement(single, {
  baselineCandidateId: baseline.id,
  fingerprint: baseline.fingerprint,
  roundId: 'r02',
  candidateId: 'r02-c01',
  title: 'Saved baseline child',
  feedback: review.records[0],
});
const child = (await engine.loadSession(single)).candidates.find(
  (candidate) => candidate.id === 'r02-c01',
);
assert.equal(child.parentCandidateId, baseline.id);
assert.equal(child.assets.light, baseline.assets.light);
const selection = {
  schemaVersion: 1,
  kind: 'explicit-selection',
  purpose: 'test',
  baselines: manifest.comparisonSets[0].entries,
};
const selectionPath = path.join(output, 'test-selection.json'),
  palettePath = path.join(output, 'palette.json');
await json(selectionPath, selection);
await json(palettePath, tone.scheme.palette);
command([
  'project',
  'lock',
  project,
  '--tone',
  tone.id,
  '--palette',
  palettePath,
  '--selection',
  selectionPath,
  '--revision',
  'style-01',
  '--json',
]);
command([
  'project',
  'lock',
  project,
  '--tone',
  tone.id,
  '--palette',
  palettePath,
  '--selection',
  selectionPath,
  '--revision',
  'style-02',
  '--json',
]);
command(['project', 'adopt', project, '--revision', 'style-02', '--json']);
command([
  'export',
  baseline.id,
  '--session',
  single,
  '--theme',
  'light',
  '--out',
  path.join(output, 'saved.svg'),
  '--json',
]);
assert.equal(await readFile(path.join(output, 'saved.svg'), 'utf8'), baseline.assets.light);
command(['export-html', single, '--out', path.join(output, 'single.html'), '--json']);
command(['export-html', project, '--out', path.join(output, 'project.html'), '--json']);
const missing = await engine.createProject({
  destination: path.join(output, 'partial'),
  project: true,
  enginePackage: ENGINE_TGZ,
  brief,
});
const partialManifest = JSON.parse(await readFile(path.join(missing.directory, 'project.json')));
partialManifest.sessions.push({ id: 'missing', path: 'sessions/missing', order: 1 });
await writeFile(path.join(missing.directory, 'project.json'), JSON.stringify(partialManifest));
assert.equal(
  command(['inspect', missing.directory, '--json'], 1).data.content.sessions[0].status,
  'valid',
);
const candidateMetadata = path.join(single, baseline.sourcePath);
const candidate = JSON.parse(await readFile(candidateMetadata));
candidate.title += ' stale test';
await writeFile(candidateMetadata, JSON.stringify(candidate));
assert.equal(
  command(['resume', single, '--review', reviewPath, '--json'], 1).errors[0].code,
  'STALE_INPUT',
);
// Restore fixture metadata for the manager's real capture/inspection; previous stale envelope remains in assertions.
candidate.title = baseline.title;
await writeFile(candidateMetadata, JSON.stringify(candidate));
const packageRoot = path.dirname(path.dirname(installedModule));
const skill = path.join(packageRoot, 'skills/diagram-gen/SKILL.md');
assert.match(await readFile(skill, 'utf8'), /name: diagram-gen/);
for (const name of ['commands', 'authoring', 'scenarios'])
  await readFile(path.join(packageRoot, `skills/diagram-gen/references/${name}.md`));
await json(path.join(output, 'workflow-evidence.json'), {
  schemaVersion: 1,
  installedModule,
  single,
  project,
  testSelection: true,
  userApproval: false,
  automated:
    'create/resume/review/lineage/lock/adopt/partial/stale/exact-export/skill-resources passed',
  visualInspection:
    'pending manager: capture and actually open each proposed image; do not mark capture as inspection',
  captureCommands: ['light', 'dark'].map((theme) => [
    'capture',
    baseline.id,
    '--session',
    single,
    '--theme',
    theme,
    '--out',
    path.join(output, `${theme}.png`),
    '--json',
  ]),
  missingBrowser:
    'Run capture before installing optional playwright in bootstrap: expect CAPTURE_UNAVAILABLE/exit3; then explicit consumer setup and repeat. Browser-ready library-only contexts remain unknown.',
});
console.log(`Installed workflow fixtures/evidence ready: ${output}`);
