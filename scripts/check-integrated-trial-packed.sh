#!/usr/bin/env bash
# Manager/CI runs this build through heavy-guard; browser checks are separate.
set -euo pipefail
: "${ENGINE_TGZ:?Absolute packed engine archive required}"
: "${INITIALIZER_TGZ:?Absolute packed initializer archive required}"
: "${INTEGRATED_TRIAL_OUT:?New absolute external evidence directory required}"

SCRIPT_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
export INTEGRATED_TRIAL_CHECKOUT="$(cd -- "$SCRIPT_DIRECTORY/.." && pwd -P)"
export INTEGRATED_TRIAL_CHECKOUT_SHA="$(git -C "$INTEGRATED_TRIAL_CHECKOUT" rev-parse HEAD)"

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile, realpath, stat, lstat, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const {ENGINE_TGZ, INITIALIZER_TGZ, INTEGRATED_TRIAL_OUT: output, INTEGRATED_TRIAL_CHECKOUT: checkout} = process.env;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const contained = (root, file) => {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
for (const [name, value] of Object.entries({ENGINE_TGZ, INITIALIZER_TGZ, INTEGRATED_TRIAL_OUT: output})) assert.ok(path.isAbsolute(value), `${name} must be absolute.`);
for (const archive of [ENGINE_TGZ, INITIALIZER_TGZ]) assert.ok((await stat(archive)).isFile(), 'Archive must be a regular file.');
assert.ok(!contained(checkout, path.resolve(output)) && !contained(checkout, await realpath(path.dirname(output))), 'Evidence consumer must be outside the checkout.');
const source = path.join(checkout, 'docs/agent-first/trial/sources');
const provenancePath = path.join(checkout, 'docs/agent-first/trial/source-provenance.json');
const provenanceBytes = await readFile(provenancePath);
const provenance = JSON.parse(provenanceBytes);
assert.equal(provenance.schemaVersion, 1);
assert.equal(provenance.modelCallsInCI, 0);
assert.equal(provenance.userApproval, false);
assert.ok(Array.isArray(provenance.files) && provenance.files.length);
const actualFiles = [];
async function scan(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), 'Frozen source must not contain symlinks.');
    if (entry.isDirectory()) await scan(file);
    else {assert.ok(entry.isFile(), 'Frozen sources must be regular files.'); actualFiles.push(path.relative(source, file).split(path.sep).join('/'));}
  }
}
await scan(source);
assert.equal(new Set(provenance.files.map((entry) => entry.path)).size, provenance.files.length, 'Duplicate frozen source provenance.');
assert.deepEqual(actualFiles.sort(), provenance.files.map((entry) => entry.path).sort(), 'Frozen source inventory differs from provenance.');
for (const entry of provenance.files) {
  assert.ok(typeof entry.path === 'string' && !path.isAbsolute(entry.path) && !entry.path.split('/').some((part) => !part || part === '.' || part === '..'), 'Unsafe frozen source path.');
  assert.ok(entry.path === 'project.json' || /^(sessions|inputs)\/.+\.(json|md|svg)$/.test(entry.path), 'Only frozen project/session/input sources may be copied.');
  const file = await realpath(path.join(source, entry.path));
  assert.ok(contained(source, file) && (await lstat(file)).isFile());
  assert.equal(hash(await readFile(file)), entry.sha256, `Frozen source changed: ${entry.path}`);
}
await mkdir(output); // Exclusive destination; partial failures remain available for diagnosis.
await mkdir(path.join(output, 'initializer'));
await mkdir(path.join(output, 'logs'));
await writeFile(path.join(output, 'initializer/package.json'), JSON.stringify({name: 'integrated-trial-initializer', private: true, type: 'module', packageManager: 'pnpm@10.30.3', dependencies: {'create-zudo-diagram-gen': `file:${INITIALIZER_TGZ}`}}, null, 2) + '\n', {flag: 'wx'});
await writeFile(path.join(output, 'source-provenance.json'), provenanceBytes, {flag: 'wx'});
await writeFile(path.join(output, 'archive-provenance.json'), JSON.stringify({schemaVersion: 1, checkoutSha: process.env.INTEGRATED_TRIAL_CHECKOUT_SHA, sourceIntegratedSha: provenance.integratedSha, sourceProvenanceHash: hash(provenanceBytes), archives: {engine: {path: ENGINE_TGZ, sha256: hash(await readFile(ENGINE_TGZ))}, initializer: {path: INITIALIZER_TGZ, sha256: hash(await readFile(INITIALIZER_TGZ))}}, modelCalls: 0, userApproval: false}, null, 2) + '\n', {flag: 'wx'});
NODE

run_logged() {
  local log_name="$1"
  shift
  "$@" 2>&1 | tee "$INTEGRATED_TRIAL_OUT/logs/$log_name.log"
}

PNPM_ACTUAL_VERSION="$(corepack pnpm --dir "$INTEGRATED_TRIAL_OUT/initializer" --version)"
printf '%s\n' "$PNPM_ACTUAL_VERSION" > "$INTEGRATED_TRIAL_OUT/logs/pnpm-version.log"
test "$PNPM_ACTUAL_VERSION" = '10.30.3'
run_logged initializer-install corepack pnpm --dir "$INTEGRATED_TRIAL_OUT/initializer" install --config.auto-install-peers=false

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {readFile, writeFile, realpath, mkdir, copyFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {ENGINE_TGZ, INTEGRATED_TRIAL_OUT: output, INTEGRATED_TRIAL_CHECKOUT: checkout} = process.env;
const bootstrap = await realpath(path.join(output, 'initializer'));
const modulePath = await realpath(path.join(bootstrap, 'node_modules/create-zudo-diagram-gen/src/index.mjs'));
const relative = path.relative(path.join(bootstrap, 'node_modules'), modulePath);
assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Initializer must resolve within its own installed node_modules.');
assert.ok(!modulePath.startsWith(`${checkout}${path.sep}`));
const {createProject, VERSION} = await import(pathToFileURL(modulePath));
const source = path.join(checkout, 'docs/agent-first/trial/sources');
const manifest = JSON.parse(await readFile(path.join(source, 'project.json'), 'utf8'));
const sessions = await Promise.all(manifest.sessions.map(async (entry) => {
  const session = JSON.parse(await readFile(path.join(source, entry.path, 'session.json'), 'utf8'));
  assert.equal(entry.path, `sessions/${entry.id}`, 'Frozen session slug must match its registration.');
  return {id: session.id, slug: entry.id, title: session.title, target: session.target};
}));
await createProject({destination: path.join(output, 'project'), project: true, name: manifest.title, enginePackage: ENGINE_TGZ, sessions});
const provenance = JSON.parse(await readFile(path.join(output, 'source-provenance.json'), 'utf8'));
for (const entry of provenance.files) {
  const destination = path.join(output, 'project', entry.path);
  await mkdir(path.dirname(destination), {recursive: true});
  await copyFile(path.join(source, entry.path), destination);
}
await writeFile(path.join(output, 'initializer-provenance.json'), JSON.stringify({schemaVersion: 1, modulePath, version: VERSION, project: path.join(output, 'project'), copiedFiles: provenance.files.length, modelCalls: 0}, null, 2) + '\n', {flag: 'wx'});
NODE

run_logged project-install corepack pnpm --dir "$INTEGRATED_TRIAL_OUT/project" install --config.auto-install-peers=false

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {readFile, writeFile, realpath, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {INTEGRATED_TRIAL_OUT: output, INTEGRATED_TRIAL_CHECKOUT: checkout} = process.env;
const root = await realpath(path.join(output, 'project'));
const modulePath = await realpath(path.join(root, 'node_modules/@takazudo/zudo-diagram-gen/src/index.mjs'));
const relative = path.relative(path.join(root, 'node_modules'), modulePath);
assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Engine must resolve within its own installed node_modules.');
assert.ok(!modulePath.startsWith(`${checkout}${path.sep}`));
const engine = await import(pathToFileURL(modulePath));
const project = await engine.loadProject(root, {strict: true});
assert.equal(project.sessions.length, 5);
assert.equal(project.comparisonSets.length, 8);
assert.ok(project.comparisonSets.every((set) => set.ok && set.entries.length === 5));
const provenance = JSON.parse(await readFile(path.join(output, 'source-provenance.json'), 'utf8'));
for (const entry of provenance.files) assert.equal(createHash('sha256').update(await readFile(path.join(root, entry.path))).digest('hex'), entry.sha256, `Installed content differs: ${entry.path}`);
const metadata = JSON.parse(await readFile(path.join(path.dirname(path.dirname(modulePath)), 'package.json'), 'utf8'));
assert.equal(metadata.name, '@takazudo/zudo-diagram-gen');
await writeFile(path.join(output, 'installed-provenance.json'), JSON.stringify({schemaVersion: 1, modulePath, version: metadata.version, node: process.version, project: root, sessions: project.sessions.length, candidates: project.sessions.reduce((sum, entry) => sum + entry.data.candidates.length, 0), comparisons: project.comparisonSets.length, copiedFiles: provenance.files.length, modelCalls: 0, visualInspection: false, userApproval: false}, null, 2) + '\n', {flag: 'wx'});
await mkdir(path.join(output, 'detached'));
NODE

run_logged project-check corepack pnpm --dir "$INTEGRATED_TRIAL_OUT/project" check
run_logged project-build corepack pnpm --dir "$INTEGRATED_TRIAL_OUT/project" build
run_logged combined-export node "$INTEGRATED_TRIAL_OUT/project/node_modules/@takazudo/zudo-diagram-gen/src/cli.mjs" export-html "$INTEGRATED_TRIAL_OUT/project" --out "$INTEGRATED_TRIAL_OUT/detached/combined.html" --json
run_logged single-export node "$INTEGRATED_TRIAL_OUT/project/node_modules/@takazudo/zudo-diagram-gen/src/cli.mjs" export-html "$INTEGRATED_TRIAL_OUT/project/sessions/reservation-flow" --out "$INTEGRATED_TRIAL_OUT/detached/single.html" --json

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const {INTEGRATED_TRIAL_OUT: output, INTEGRATED_TRIAL_CHECKOUT: checkout} = process.env;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const provenance = JSON.parse(await readFile(path.join(output, 'source-provenance.json'), 'utf8'));
for (const entry of provenance.files) assert.equal(hash(await readFile(path.join(output, 'project', entry.path))), entry.sha256, 'Build/export changed frozen source.');
const exports = [];
for (const name of ['combined', 'single']) {
  const file = path.join(output, 'detached', `${name}.html`);
  const bytes = await readFile(file), text = bytes.toString('utf8');
  assert.match(text, /^<!doctype html>/i);
  for (const sourcePath of [checkout, output, '/workspace/', '/home/', 'zudolab/zudo-pattern-gen']) assert.ok(!text.includes(sourcePath), `Portable HTML leaks private source: ${sourcePath}`);
  exports.push({name, path: file, sha256: hash(bytes)});
}
await writeFile(path.join(output, 'packed-trial-evidence.json'), JSON.stringify({schemaVersion: 1, ok: true, sourceIntegratedSha: provenance.integratedSha, preservedSourceFiles: provenance.files.length, modelCalls: 0, visualInspection: false, userApproval: false, exports, detachedBrowserStatus: 'pending separate source-away/server-stopped/network-blocked file-transport verification'}, null, 2) + '\n', {flag: 'wx'});
NODE
printf '%s\n' "Installed trial: $INTEGRATED_TRIAL_OUT/project" "Detached review artifacts: $INTEGRATED_TRIAL_OUT/detached"
