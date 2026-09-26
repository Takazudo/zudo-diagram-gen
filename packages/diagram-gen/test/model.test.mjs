import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { exportCandidate, loadSession, SessionValidationError, validateSession } from '../src/model.mjs';
import { contentSignature, prepareProject } from '../src/runner.mjs';

const exec = promisify(execFile);
const COMMANDS_URL = new URL('../src/commands.mjs', import.meta.url).href;
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400" aria-labelledby="title description">
<title id="title">A precise example</title><desc id="description">One blue rectangle.</desc>
<defs><pattern id="pattern" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 0L10 10"/></pattern><path id="shape" d="M0 0H10V10Z"/></defs>
<style>.art { fill: url('#pattern'); }</style><rect class="art" width="100" height="100"/><use href="#shape" fill="blue"/>
</svg>\n`;

async function json(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}

async function fixture(t, { empty = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'diagram-model-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await json(path.join(root, 'session.json'), {
    schemaVersion: 1, id: 'session-one', title: 'A diagram session',
    target: { width: 360, height: 200, label: 'Help dialog' },
    project: { name: 'Example project', reference: 'https://example.com/project' },
    context: { title: 'Help text', body: 'Read this alongside the diagram.' },
  });
  await fs.writeFile(path.join(root, 'brief.md'), '# Brief\nPreserve the actual operation and labels.\n');
  if (!empty) {
    await round(root, 'r01', 1);
    await candidate(root, 'r01', 'c01', { dark: true });
  }
  return root;
}

async function round(root, id, order, extra = {}) {
  await json(path.join(root, 'rounds', id, 'round.json'), { schemaVersion: 1, id, title: id, order, ...extra });
}

async function candidate(root, roundId, id, { dark = false, svg = SVG, ...extra } = {}) {
  const directory = path.join(root, 'rounds', roundId, id);
  await json(path.join(directory, 'candidate.json'), {
    schemaVersion: 1, id, title: id, toneId: 'fine-outline', order: 1,
    assets: { light: 'light.svg', ...(dark ? { dark: 'dark.svg' } : {}) },
    ...extra,
  });
  await fs.writeFile(path.join(directory, 'light.svg'), svg);
  if (dark) await fs.writeFile(path.join(directory, 'dark.svg'), svg.replace('fill="blue"', 'fill="white"'));
  return directory;
}

async function patchJson(file, patch) {
  const current = JSON.parse(await fs.readFile(file, 'utf8'));
  await json(file, { ...current, ...patch });
}

function finding(result, pattern) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.ok(result.errors.some((error) => pattern.test(error)), `Expected ${pattern} among ${JSON.stringify(result.errors)}`);
}

async function command(args, cwd) {
  const code = `import {runDataCommand} from ${JSON.stringify(COMMANDS_URL)}; const handled = await runDataCommand(process.argv.slice(1)); if (!handled) process.stdout.write('unhandled');`;
  try {
    return { ...(await exec(process.execPath, ['--input-type=module', '-e', code, '--', ...args], { cwd })), code: 0 };
  } catch (error) {
    return { stdout: error.stdout, stderr: error.stderr, code: error.code };
  }
}

test('content scan detects same-size edits with unchanged timestamps and delete/re-add transitions', async (t) => {
  const root = await fixture(t);
  const artwork = path.join(root, 'rounds/r01/c01/light.svg');
  const before = await contentSignature(root);
  const original = await fs.readFile(artwork, 'utf8');
  const timestamp = (await fs.stat(artwork)).mtime;
  await fs.writeFile(artwork, original.replace('blue', 'cyan'));
  await fs.utimes(artwork, timestamp, timestamp);
  const edited = await contentSignature(root);
  assert.notEqual(edited, before);
  await fs.rm(artwork);
  const deleted = await contentSignature(root);
  assert.notEqual(deleted, edited);
  await fs.writeFile(artwork, original);
  await fs.utimes(artwork, timestamp, timestamp);
  assert.equal(await contentSignature(root), before);
});

test('content scan does not follow a symlinked rounds tree', async (t) => {
  const root = await fixture(t, { empty: true });
  const outside = await fixture(t);
  await fs.symlink(path.join(outside, 'rounds'), path.join(root, 'rounds'));
  const signature = await contentSignature(root);
  assert.match(signature, /rounds:symlink/);
  assert.doesNotMatch(signature, /candidate\.json/);
  await assert.rejects(prepareProject(root), /outside the session|symlink/);
});

test('normalization is portable, deterministic, and fingerprints changed artwork', async (t) => {
  const root = await fixture(t);
  await patchJson(path.join(root, 'session.json'), { internalAbsoluteDirectory: root });
  const first = await loadSession(root);
  assert.equal(first.kind, 'session');
  assert.equal(first.candidates[0].sourcePath, 'rounds/r01/c01/candidate.json');
  assert.equal(first.candidates[0].assets.light, SVG);
  assert.equal(JSON.stringify(first).includes(root), false);
  assert.equal(first.contentHash, (await loadSession(root)).contentHash);
  const result = await validateSession(root);
  assert.deepEqual(result.summary, { rounds: 1, candidates: 1, lightAssets: 1, darkAssets: 1 });
  assert.deepEqual(result.errors, []);
  await fs.writeFile(path.join(root, 'rounds/r01/c01/light.svg'), SVG.replace('fill="blue"', 'fill="green"'));
  const edited = await loadSession(root);
  assert.notEqual(edited.contentHash, first.contentHash);
  assert.notEqual(edited.candidates[0].fingerprint, first.candidates[0].fingerprint);
});

test('empty workspaces and empty rounds are valid with useful warnings', async (t) => {
  const root = await fixture(t, { empty: true });
  let result = await validateSession(root);
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((warning) => warning.includes('No candidates')));
  await round(root, 'r01', 1);
  result = await validateSession(root);
  assert.equal(result.ok, true);
  assert.equal((await loadSession(root)).candidates.length, 0);
  assert.ok(result.warnings.some((warning) => warning.includes('no candidates yet')));
});

test('invalid JSON, JSON null, and metadata schema errors fail without crashing', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'session.json');
  const original = await fs.readFile(file, 'utf8');
  await fs.writeFile(file, '{');
  finding(await validateSession(root), /invalid JSON/);
  await fs.writeFile(file, 'null');
  finding(await validateSession(root), /expected an object/);
  await fs.writeFile(file, original);
  await patchJson(file, { schemaVersion: 9, target: { width: -1, height: '200' } });
  const result = await validateSession(root);
  finding(result, /schemaVersion 1/);
  finding(result, /target.width/);
  finding(result, /target.height/);
  await assert.rejects(loadSession(root), SessionValidationError);
});

test('missing files and invalid UTF-8 produce actionable validation errors', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'rounds/r01/c01/light.svg');
  await fs.rm(file);
  finding(await validateSession(root), /light.svg: file does not exist/);
  await fs.writeFile(file, Buffer.from([0xc3, 0x28]));
  finding(await validateSession(root), /valid UTF-8/);
});

test('SAX parsing rejects malformed XML, a missing namespace, and invalid viewBox', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'rounds/r01/c01/light.svg');
  for (const [svg, pattern] of [
    [SVG.replace('</svg>', '</g>'), /invalid XML/],
    [SVG.replace(' xmlns="http://www.w3.org/2000/svg"', ''), /root must be/],
    [SVG.replace('viewBox="0 0 720 400"', 'viewBox="0 0 -720 400"'), /positive width and height/],
    [SVG.replace('viewBox="0 0 720 400"', ''), /numeric viewBox/],
  ]) {
    await fs.writeFile(file, svg);
    finding(await validateSession(root), pattern);
  }
});

test('internal pattern, use, CSS and accessibility references validate; duplicate and dangling IDs fail', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'rounds/r01/c01/light.svg');
  assert.equal((await validateSession(root)).ok, true);
  await fs.writeFile(file, SVG.replace('id="shape"', 'id="pattern"'));
  let result = await validateSession(root);
  finding(result, /duplicate SVG id/);
  finding(result, /reference #shape/);
  await fs.writeFile(file, SVG.replace("url('#pattern')", "url('#missing')").replace('aria-labelledby="title description"', 'aria-labelledby="missing-title description"'));
  result = await validateSession(root);
  finding(result, /reference #missing /);
  finding(result, /reference #missing-title /);
});

test('scripts, event handlers, external resources and doctypes are rejected', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'rounds/r01/c01/light.svg');
  for (const [svg, pattern] of [
    [SVG.replace('</svg>', '<script>alert(1)</script></svg>'), /element script/],
    [SVG.replace('<rect class=', '<rect onclick="alert(1)" class='), /event handler onclick/],
    [SVG.replace('href="#shape"', 'href="https://example.com/image.svg#shape"'), /external or unsupported resource/],
    [SVG.replace("url('#pattern')", "url('https://example.com/paint.svg#p')"), /external or unsupported resource/],
    [SVG.replace('<style>', '<style>@import "https://example.com/style.css";'), /CSS @import/],
    [`<!DOCTYPE svg [<!ENTITY word "x">]>${SVG}`, /DOCTYPE/],
    [SVG.replace('</svg>', '<foreignObject width="10" height="10"/></svg>'), /foreignObject/],
  ]) {
    await fs.writeFile(file, svg);
    finding(await validateSession(root), pattern);
  }
});

test('SVG assets cannot traverse candidate boundaries or use platform-specific absolute paths', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'rounds/r01/c01/candidate.json');
  await fs.writeFile(path.join(root, 'rounds/r01/shared.svg'), SVG);
  for (const asset of ['../shared.svg', '/etc/passwd.svg', 'C:\\outside.svg', 'nested/../../outside.svg', './light.svg']) {
    await patchJson(file, { assets: { light: asset } });
    finding(await validateSession(root), /relative file path|path segments/);
  }
});

test('SVG symlinks cannot escape their candidate even to another file inside the session', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'rounds/r01/c01/light.svg');
  await fs.writeFile(path.join(root, 'shared.svg'), SVG);
  await fs.rm(file);
  await fs.symlink(path.join(root, 'shared.svg'), file);
  finding(await validateSession(root), /outside its permitted directory/);
});

test('round and metadata symlinks cannot expose external files', async (t) => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await fs.symlink(path.join(outside, 'rounds/r01'), path.join(root, 'rounds/r02'));
  finding(await validateSession(root), /symlink entries/);
  await fs.rm(path.join(root, 'rounds/r02'));
  await fs.rm(path.join(root, 'session.json'));
  await fs.symlink(path.join(outside, 'session.json'), path.join(root, 'session.json'));
  finding(await validateSession(root), /outside its permitted directory/);
});

test('a caller may intentionally supply a symlink to the session root', async (t) => {
  const root = await fixture(t);
  const holder = await fs.mkdtemp(path.join(os.tmpdir(), 'diagram-link-'));
  t.after(() => fs.rm(holder, { recursive: true, force: true }));
  const link = path.join(holder, 'session');
  await fs.symlink(root, link);
  assert.equal((await validateSession(link)).ok, true);
});

test('globally duplicate candidate IDs and duplicate round orders are rejected', async (t) => {
  const root = await fixture(t);
  await round(root, 'r02', 1);
  await candidate(root, 'r02', 'c01');
  const result = await validateSession(root);
  finding(result, /duplicate candidate id/);
  finding(result, /round order 1 is already used/);
});

test('parent and baseline lineage must resolve to an earlier round', async (t) => {
  const root = await fixture(t);
  await round(root, 'r02', 2, { baselineCandidateId: 'c01' });
  await candidate(root, 'r02', 'c02', { parentCandidateId: 'c01' });
  assert.equal((await validateSession(root)).ok, true);
  await patchJson(path.join(root, 'rounds/r02/c02/candidate.json'), { parentCandidateId: 'missing' });
  finding(await validateSession(root), /parent candidate "missing" does not exist/);
  await patchJson(path.join(root, 'rounds/r02/c02/candidate.json'), { parentCandidateId: 'c02' });
  let result = await validateSession(root);
  finding(result, /must belong to an earlier round/);
  finding(result, /lineage contains a cycle/);
  await patchJson(path.join(root, 'rounds/r02/c02/candidate.json'), { parentCandidateId: 'c01' });
  await patchJson(path.join(root, 'rounds/r02/round.json'), { baselineCandidateId: 'c02' });
  result = await validateSession(root);
  finding(result, /baseline "c02" must belong to an earlier round/);
});

test('export preserves source bytes, BOM, line endings, and the explicitly chosen theme', async (t) => {
  const root = await fixture(t);
  const source = `\uFEFF${SVG.replaceAll('\n', '\r\n').replace('A precise example', '日本語の図')}`;
  await fs.writeFile(path.join(root, 'rounds/r01/c01/light.svg'), source);
  const output = path.join(root, 'exports', 'chosen.svg');
  const exported = await exportCandidate(root, 'c01', { theme: 'light', output });
  assert.deepEqual(await fs.readFile(output), Buffer.from(source));
  assert.equal(exported.bytes, Buffer.byteLength(source));
  await exportCandidate(root, 'c01', { theme: 'dark', output });
  assert.deepEqual(await fs.readFile(output), await fs.readFile(path.join(root, 'rounds/r01/c01/dark.svg')));
});

test('missing dark artwork, unknown candidates, and invalid themes never silently fall back', async (t) => {
  const root = await fixture(t);
  await patchJson(path.join(root, 'rounds/r01/c01/candidate.json'), { assets: { light: 'light.svg' } });
  const output = path.join(root, 'exports/chosen.svg');
  await assert.rejects(exportCandidate(root, 'c01', { theme: 'dark', output }), /has no dark SVG/);
  await assert.rejects(exportCandidate(root, 'missing', { theme: 'light', output }), /was not found/);
  await assert.rejects(exportCandidate(root, 'c01', { theme: 'system', output }), /Unsupported theme/);
  await assert.rejects(fs.stat(output), { code: 'ENOENT' });
});

test('export refuses to overwrite session source files, including through output symlinks', async (t) => {
  const root = await fixture(t);
  for (const output of [path.join(root, 'session.json'), path.join(root, 'brief.md'), path.join(root, 'rounds/r01/c01/light.svg')]) {
    await assert.rejects(exportCandidate(root, 'c01', { theme: 'light', output }), /overlaps session source files/);
  }
  await fs.symlink(path.join(root, 'rounds'), path.join(root, 'shortcut'));
  await assert.rejects(exportCandidate(root, 'c01', { theme: 'light', output: path.join(root, 'shortcut/new.svg') }), /overlaps session source files/);
  assert.equal((await validateSession(root)).ok, true);
});

test('CLI JSON check returns machine-readable findings and nonzero status for invalid sessions', async (t) => {
  const root = await fixture(t);
  let result = await command(['check', '--json'], root);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).ok, true);
  await fs.rm(path.join(root, 'rounds/r01/c01/light.svg'));
  result = await command(['check', '--json'], root);
  assert.equal(result.code, 1);
  assert.equal(JSON.parse(result.stdout).ok, false);
});

test('CLI rejects misspelled options and leaves server commands for the parent dispatcher', async (t) => {
  const root = await fixture(t);
  let result = await command(['check', '--jsno'], root);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Unknown option/);
  result = await command(['export', 'c01', '--theme=dark', '--out=exports/cli.svg'], root);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(await fs.readFile(path.join(root, 'exports/cli.svg'), 'utf8'), SVG.replace('fill="blue"', 'fill="white"'));
  result = await command(['dev'], root);
  assert.equal(result.stdout, 'unhandled');
});
