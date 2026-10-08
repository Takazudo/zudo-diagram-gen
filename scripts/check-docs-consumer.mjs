/** Execute public reader fences against a fresh local-archive consumer; no browser/model calls. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const checkout = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2];
assert.ok(
  output && path.isAbsolute(output),
  'Supply a new absolute evidence directory outside source.',
);
assert.ok(
  path.relative(checkout, output).startsWith(`..${path.sep}`),
  'Evidence must be outside checkout.',
);
await mkdir(output); // Exclusive: preserve prior evidence rather than replacing it.
const logs = [];
function run(label, command, { cwd, env = {}, expected = 0 } = {}) {
  const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', command], {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  logs.push({
    label,
    command,
    cwd,
    exit: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  });
  writeFileSync(path.join(output, 'commands.json'), JSON.stringify(logs, null, 2) + '\n');
  assert.equal(result.status, expected, `${label}: ${result.stderr || result.stdout}`);
  return result.stdout;
}
async function fence(file, id, packageDocument = false) {
  const text = await readFile(
    path.join(checkout, ...(packageDocument ? [] : ['src/content/docs']), file),
    'utf8',
  );
  const index = text.indexOf(`<!-- reader:${id} -->`);
  assert.ok(index >= 0, `Missing public reader fence ${id}`);
  const match = text.slice(index).match(/```bash\n([\s\S]*?)```/);
  assert.ok(match, `Missing executable fence ${id}`);
  return match[1];
}
assert.equal(run('fail-fast-shell-proof', 'false\nprintf "masked failure"', { expected: 1 }), '');
const setup = await fence('getting-started/local-archives.mdx', 'initialize');
const initialized = run(
  'exact-public-initialize',
  setup + '\nprintf "P10_CONSUMER=%s\\n" "$PWD"\n',
  {
    cwd: checkout,
  },
);
const consumer = initialized.match(/^P10_CONSUMER=(.+)$/m)?.[1];
assert.ok(
  consumer && !consumer.startsWith('/workspace/'),
  'Use a consumer outside the source workspace.',
);
const require = createRequire(path.join(consumer, 'reader.mjs'));
const modulePath = await realpath(require.resolve('@takazudo/zudo-diagram-gen'));
const relativeModule = path.relative(await realpath(consumer), modulePath);
assert.ok(
  relativeModule.startsWith('node_modules/'),
  'Installed module must stay inside consumer node_modules.',
);
const engine = await import(pathToFileURL(modulePath));
const archive = path.join(checkout, 'artifacts/takazudo-zudo-diagram-gen-0.1.0.tgz');
const initializerArchive = path.join(checkout, 'artifacts/create-zudo-diagram-gen-0.1.0.tgz');
const cli = path.join(path.dirname(modulePath), 'cli.mjs');
function command(args, expected = 0, env = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: consumer,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  logs.push({
    label: args.join(' '),
    exit: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  });
  writeFileSync(path.join(output, 'commands.json'), JSON.stringify(logs, null, 2) + '\n');
  assert.equal(result.status, expected, result.stderr || result.stdout);
  if (args.includes('--json') || args.includes('--json-version')) return JSON.parse(result.stdout);
  return result.stdout;
}
const json = (filename, value) => writeFile(filename, JSON.stringify(value, null, 2) + '\n');
run('exact-public-skill-copy', await fence('getting-started/local-archives.mdx', 'skill-copy'), {
  cwd: consumer,
});
const duplicateCopy = run(
  'safe-existing-skill-refusal',
  await fence('getting-started/local-archives.mdx', 'skill-copy'),
  {
    cwd: consumer,
    expected: 1,
  },
);
assert.equal(duplicateCopy, '');
for (const name of [
  'SKILL.md',
  'references/commands.md',
  'references/authoring.md',
  'references/scenarios.md',
]) {
  assert.ok(
    (await readFile(path.join(consumer, '.claude/skills/diagram-gen', name), 'utf8')).length,
  );
}
run('exact-public-materialize', await fence('reference/api.mdx', 'materialize'), { cwd: consumer });
const project = path.join(output, 'public-project');
run('exact-public-project-api', await fence('reference/api.mdx', 'project-api'), {
  cwd: consumer,
  env: { PROJECT_OUT: project, ENGINE_TGZ: archive },
});
run('install-public-project', 'pnpm install\npnpm check', { cwd: project });

const manual = await readFile(
  path.join(checkout, 'src/content/docs/getting-started/manual-session.mdx'),
  'utf8',
);
const metadata = JSON.parse(manual.match(/```json\n([\s\S]*?)```/)[1]);
const svg = manual.match(/```xml\n([\s\S]*?)```/)[1];
async function author(root) {
  const folder = path.join(root, 'rounds/r01/c01');
  run(
    'manual-create-candidate-folder',
    await fence('getting-started/manual-session.mdx', 'manual-candidate'),
    { cwd: root },
  );
  await json(path.join(folder, 'candidate.json'), metadata);
  await writeFile(path.join(folder, 'diagram.light.svg'), svg, { flag: 'wx' });
}
await author(consumer);
run(
  'exact-manual-populated-check',
  await fence('getting-started/manual-session.mdx', 'manual-check'),
  { cwd: consumer },
);
run('exact-manual-svg-export', await fence('getting-started/manual-session.mdx', 'manual-export'), {
  cwd: consumer,
});
assert.equal(await readFile(path.join(consumer, 'exports/selected-diagram.svg'), 'utf8'), svg);
const baseline = (await engine.loadSession(consumer)).candidates[0];
const review = {
  schemaVersion: 1,
  type: 'zudo-diagram-review',
  sessionId: (await engine.loadSession(consumer)).session.id,
  records: [
    {
      id: baseline.id,
      fingerprint: baseline.fingerprint,
      keep: 'Positions, labels, palette',
      change: 'Connector only',
      action: 'refine',
    },
  ],
  shortlist: [],
  chosenDirection: { id: baseline.id, fingerprint: baseline.fingerprint },
};
await json(path.join(consumer, 'review.json'), review);
command(['resume', consumer, '--review', path.join(consumer, 'review.json'), '--json']);
run('exact-public-refinement-api-test-record', await fence('reference/api.mdx', 'refine'), {
  cwd: consumer,
});
run(
  'exact-authoring-svg-export',
  await fence('authoring/svg-authoring.mdx', 'authoring-svg-export'),
  { cwd: consumer },
);
assert.equal(
  (await engine.loadSession(consumer)).candidates.find((candidate) => candidate.id === 'r02-c01')
    .assets.light,
  baseline.assets.light,
);
command(['check', consumer, '--json-version', '1']);
const legacyCheck = command(['check', consumer, '--json']);
assert.equal(legacyCheck.schemaVersion, undefined);
assert.equal(legacyCheck.ok, true);
const legacyTones = command(['tones', 'list', '--json']);
assert.equal(legacyTones.schemaVersion, undefined);
assert.equal(legacyTones.tones.length, 24);
assert.equal(command(['tones', 'list', '--json-version', '1']).data.tones.length, 24);
for (const tone of legacyTones.tones) {
  const context = await engine.resolveToneContext(tone.id, { requireComplete: true });
  assert.ok(context.scheme && context.kit);
}
command(['tones', 'show', 'fine-outline', '--json-version', '1']);
command(['tones', 'show', 'fine-outline', '--json']);
command(['--help']);
command(['--version']);
command([
  'export',
  'r02-c01',
  '--session',
  consumer,
  '--theme',
  'light',
  '--out',
  path.join(consumer, 'exports/selected.svg'),
  '--json',
]);
assert.equal(await readFile(path.join(consumer, 'exports/selected.svg'), 'utf8'), svg);
run('exact-manual-html-export', await fence('getting-started/manual-session.mdx', 'manual-html'), {
  cwd: consumer,
});
command(
  ['export-html', consumer, '--out', path.join(consumer, 'exports/review.html'), '--json'],
  4,
);
command([
  'export-html',
  consumer,
  '--out',
  path.join(consumer, 'exports/review.html'),
  '--force',
  '--json',
]);
const missingCapability = command(
  [
    'capture',
    baseline.id,
    '--session',
    consumer,
    '--out',
    path.join(consumer, 'exports/missing-browser.png'),
    '--json',
  ],
  3,
);
assert.equal(missingCapability.errors[0].code, 'CAPTURE_UNAVAILABLE');
assert.equal(
  command(['inspect', consumer, '--invalid', '--json'], 2).errors[0].code,
  'INVALID_ARGUMENT',
);
assert.equal(
  command(['inspect', consumer, '--json', '--json'], 2).errors[0].code,
  'INVALID_ARGUMENT',
);
assert.equal(
  command(['check', consumer, '--json-version', '2'], 2).errors[0].code,
  'UNSUPPORTED_VERSION',
);
command(
  [
    'export',
    baseline.id,
    '--session',
    consumer,
    '--theme',
    'dark',
    '--out',
    path.join(consumer, 'exports/dark.svg'),
    '--json',
  ],
  1,
);
command(
  [
    'export',
    baseline.id,
    '--session',
    consumer,
    '--theme',
    'light',
    '--out',
    path.join(consumer, 'session.json'),
    '--json',
  ],
  4,
);
command(
  [
    'new',
    '--out',
    consumer,
    '--brief',
    path.join(consumer, 'brief.md'),
    '--engine-package',
    archive,
    '--json',
  ],
  4,
);
const newSession = path.join(output, 'new-command-session');
command([
  'new',
  '--out',
  newSession,
  '--brief',
  path.join(consumer, 'brief.md'),
  '--engine-package',
  archive,
  '--json',
]);
const newProject = path.join(output, 'new-command-project');
command([
  'new',
  '--out',
  newProject,
  '--brief',
  path.join(consumer, 'brief.md'),
  '--engine-package',
  archive,
  '--project',
  '--json',
]);
command(['inspect', newProject, '--json']);
const interrupted = path.join(output, 'interrupted-install');
const failedInstall = command(
  [
    'new',
    '--out',
    interrupted,
    '--brief',
    path.join(consumer, 'brief.md'),
    '--engine-package',
    archive,
    '--install',
    '--json',
  ],
  4,
  { PATH: '/nonexistent-p10-test-path' },
);
assert.equal(failedInstall.errors[0].code, 'IO_ERROR');
assert.match(failedInstall.data.recovery, /pnpm install/);
run('retained-install-recovery', 'pnpm install\npnpm check', { cwd: interrupted });
command(['resume', interrupted, '--json']);

let data = await engine.loadProject(project);
for (const entry of data.sessions) await author(path.join(project, entry.path));
data = await engine.loadProject(project);
const manifest = data.project;
manifest.comparisonSets = [
  {
    id: 'outline',
    title: 'Exact public mapping',
    toneId: 'fine-outline',
    entries: data.sessions.map((entry) => ({
      sessionId: entry.id,
      candidateId: baseline.id,
      fingerprint: entry.data.candidates[0].fingerprint,
    })),
  },
];
await json(path.join(project, 'project.json'), manifest);
const selection = {
  schemaVersion: 1,
  kind: 'explicit-selection',
  purpose: 'test',
  baselines: manifest.comparisonSets[0].entries,
};
await json(path.join(output, 'selection.json'), selection);
await json(
  path.join(output, 'palette.json'),
  (await engine.resolveToneContext('fine-outline')).scheme.palette,
);
for (const revision of ['style-01', 'style-02'])
  command([
    'project',
    'lock',
    project,
    '--tone',
    'fine-outline',
    '--palette',
    path.join(output, 'palette.json'),
    '--selection',
    path.join(output, 'selection.json'),
    '--revision',
    revision,
    '--json',
  ]);
assert.equal((await engine.loadProject(project)).project.style.revision, 'style-01');
command(['project', 'adopt', project, '--revision', 'style-02', '--json']);
assert.equal((await engine.readStyleRevision(project, 'style-02')).style.selectionPurpose, 'test');
command(['check', project, '--json-version', '1']);
command(['export-html', project, '--out', path.join(output, 'project.html'), '--json']);
const adoptedManifest = JSON.parse(await readFile(path.join(project, 'project.json')));
const partialManifest = structuredClone(adoptedManifest);
partialManifest.sessions.push({ id: 'missing', path: 'sessions/missing', order: 2 });
await json(path.join(project, 'project.json'), partialManifest);
assert.equal(command(['inspect', project, '--json'], 1).ok, false);
command(['resume', project, '--json'], 1);
command(['check', project, '--json-version', '1'], 1);
command(['export-html', project, '--out', path.join(output, 'partial.html'), '--json'], 1);
await json(path.join(project, 'project.json'), adoptedManifest);
const changed = { ...metadata, title: 'Changed artwork test' };
await json(path.join(consumer, 'rounds/r01/c01/candidate.json'), changed);
assert.equal(
  command(['resume', consumer, '--review', path.join(consumer, 'review.json'), '--json'], 1)
    .errors[0].code,
  'STALE_INPUT',
);
await json(path.join(consumer, 'rounds/r01/c01/candidate.json'), metadata);

// The initializer archive must run without fetching the unpublished engine by registry name.
const bootstrap = path.join(output, 'initializer-bootstrap');
await mkdir(bootstrap);
await json(path.join(bootstrap, 'package.json'), {
  private: true,
  type: 'module',
  dependencies: { 'create-zudo-diagram-gen': `file:${initializerArchive}` },
});
run('packed-initializer-install', 'pnpm install', { cwd: bootstrap });
run(
  'packed-initializer-consume',
  'pnpm exec create-zudo-diagram-gen "$INITIALIZER_OUT" --name "Packed initializer" --engine-package "$ENGINE_TGZ" --yes',
  {
    cwd: bootstrap,
    env: { INITIALIZER_OUT: path.join(output, 'initializer-consumer'), ENGINE_TGZ: archive },
  },
);
run('packed-initializer-generated-install', 'pnpm install\npnpm check', {
  cwd: path.join(output, 'initializer-consumer'),
});
const manualConsumer = path.join(output, 'initializer-consumer');
await author(manualConsumer);
run(
  'exact-manual-refinement-copy',
  await fence('authoring/session-files.mdx', 'manual-refinement-copy'),
  { cwd: manualConsumer },
);
const sessionGuide = await readFile(
  path.join(checkout, 'src/content/docs/authoring/session-files.mdx'),
  'utf8',
);
const guideRecords = [...sessionGuide.matchAll(/```json\n([\s\S]*?)```/g)].map((match) =>
  JSON.parse(match[1]),
);
await json(
  path.join(manualConsumer, 'rounds/r02/round.json'),
  guideRecords.find((record) => record.id === 'r02'),
);
const manualChild = guideRecords.find((record) => record.id === 'r02-c01');
delete manualChild.assets.dark; // The guide explicitly says to omit dark when the baseline is light-only.
await json(path.join(manualConsumer, 'rounds/r02/c01/candidate.json'), manualChild);
assert.equal((await engine.loadSession(manualConsumer)).candidates.length, 2);
assert.equal(
  await readFile(path.join(manualConsumer, 'rounds/r02/c01/diagram.light.svg'), 'utf8'),
  svg,
);
run('manual-lineage-check', 'pnpm check', { cwd: manualConsumer });
run(
  'exact-packed-initializer-api',
  await fence('packages/create-zudo-diagram-gen/README.md', 'initializer-api', true),
  {
    cwd: bootstrap,
    env: {
      INITIALIZER_API_OUT: path.join(output, 'initializer-api-consumer'),
      ENGINE_TGZ: archive,
    },
  },
);
run('packed-initializer-api-install', 'pnpm install\npnpm check', {
  cwd: path.join(output, 'initializer-api-consumer'),
});
const exportScript = JSON.parse(await readFile(path.join(consumer, 'package.json'))).scripts[
  'export:html'
];
const legacyExportRequiresMigration = !exportScript.includes('--out exports/');
if (legacyExportRequiresMigration) assert.match(exportScript, /--out diagram-review\.html(?:\s|$)/);
run('generated-session-html-script', 'pnpm export:html', {
  cwd: consumer,
  expected: legacyExportRequiresMigration ? 1 : 0,
});
for (const filename of [
  'session',
  'round',
  'candidate',
  'project',
  'placement',
  'tone-scheme',
  'palette',
  'tone-catalog',
  'style',
  'common',
]) {
  await readFile(require.resolve(`@takazudo/zudo-diagram-gen/schemas/${filename}.schema.json`));
}
for (const entry of [
  'model',
  'render',
  'client/mount',
  'client/app.css',
  'skills/diagram-gen/SKILL.md',
])
  require.resolve(`@takazudo/zudo-diagram-gen/${entry}`);
await json(path.join(output, 'commands.json'), logs);
await json(path.join(output, 'reader-evidence.json'), {
  consumer,
  installedModule: modulePath,
  engineArchiveHash: engine.hashBytes(await readFile(archive)),
  initializerArchiveHash: engine.hashBytes(await readFile(initializerArchive)),
  operations: logs.length,
  legacyExportRequiresMigration,
  exportScript,
  authoredFixture:
    'Exact public manual SVG and metadata; synthetic review purpose test, never user approval.',
  passed:
    'Public initialize/skill-copy/materialize/project/refinement fences; installed CLI, legacy/versioned JSON, all24 contexts, lock/adopt, partial/stale/errors/outputs/initializer/schema exports.',
  pending:
    'Manager guarded dev/build/preview/capture/actual image opening/browser downloaded review/detached HTML and explicit agent prompt transcript.',
});
console.log(`Public installed reader commands passed: ${output}; consumer ${consumer}`);
