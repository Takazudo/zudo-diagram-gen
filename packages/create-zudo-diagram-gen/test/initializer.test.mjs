import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { test, onTestFinished } from 'vitest';
import { createProject, parseArguments } from '../src/index.mjs';

const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/create-zudo-diagram-gen.mjs', import.meta.url));
const packagePath = fileURLToPath(new URL('../package.json', import.meta.url));
async function temporary(_t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'diagram-initializer-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('creates an empty session with predictable defaults and package-owned page configuration', async (t) => {
  const cwd = await temporary(t);
  const result = await createProject({
    cwd,
    destination: 'nested/diagram review',
    name: 'Note History Help',
  });
  const pkg = JSON.parse(await readFile(path.join(result.directory, 'package.json'), 'utf8'));
  const session = JSON.parse(await readFile(path.join(result.directory, 'session.json'), 'utf8'));
  const round = JSON.parse(
    await readFile(path.join(result.directory, 'rounds/r01/round.json'), 'utf8'),
  );
  assert.equal(result.installed, false);
  assert.equal(result.directory, path.join(cwd, 'nested/diagram review'));
  assert.equal(pkg.name, 'note-history-help');
  assert.equal(pkg.private, true);
  assert.equal(pkg.dependencies['@takazudo/zudo-diagram-gen'], '0.1.0');
  assert.equal(pkg.dependencies['@takazudo/zfb'], '3.2.0');
  assert.equal(pkg.dependencies['@takazudo/zfb-runtime'], '3.2.0');
  assert.equal(pkg.dependencies.hono, undefined);
  assert.equal(pkg.dependencies.preact, undefined);
  assert.equal(pkg.dependencies['preact-render-to-string'], undefined);
  assert.deepEqual(pkg.scripts, {
    dev: 'zudo-diagram-gen dev .',
    build: 'zudo-diagram-gen build .',
    preview: 'zudo-diagram-gen preview .',
    check: 'zudo-diagram-gen check .',
    'export:html': 'zudo-diagram-gen export-html . --out exports/diagram-review.html',
  });
  assert.equal(session.schemaVersion, 1);
  assert.equal(session.title, 'Note History Help');
  assert.match(session.id, /^note-history-help-[a-f0-9-]{36}$/);
  assert.equal(result.sessionId, session.id);
  assert.deepEqual(session.target, { width: 360, height: 200, label: 'Help diagram' });
  assert.equal(round.id, 'r01');
  assert.equal(round.baselineCandidateId, null);
  assert.deepEqual(await readdir(path.join(result.directory, 'rounds/r01')), ['round.json']);
  assert.match(
    await readFile(path.join(result.directory, 'zfb.config.ts'), 'utf8'),
    /defineConfig\(\{\}\)/,
  );
  assert.match(
    await readFile(path.join(result.directory, 'AGENTS.md'), 'utf8'),
    /pages\/index\.tsx and \.generated\/ are engine-generated/,
  );
  assert.match(
    await readFile(path.join(result.directory, 'AGENTS.md'), 'utf8'),
    /or a clear custom tone ID/,
  );
  assert.ok(!(await readdir(result.directory)).includes('pages'));
  assert.ok(!(await readdir(result.directory)).includes('.git'));
  assert.match(
    await readFile(path.join(result.directory, '.gitignore'), 'utf8'),
    /^\.generated\/$/m,
  );
});

test('never alters a nonempty target, including one containing only a hidden file', async (t) => {
  const cwd = await temporary(t);
  const destination = path.join(cwd, 'occupied');
  await mkdir(destination);
  await writeFile(path.join(destination, '.keep'), 'existing content');
  await assert.rejects(createProject({ destination }), /not empty/);
  assert.deepEqual(await readdir(destination), ['.keep']);
  assert.equal(await readFile(path.join(destination, '.keep'), 'utf8'), 'existing content');
});

test('supports an existing empty directory and the explicit current-directory destination', async (t) => {
  const cwd = await temporary(t);
  const result = await createProject({ cwd, destination: '.', name: 'Current directory' });
  assert.equal(result.directory, cwd);
  assert.equal(result.name, 'current-directory');
  assert.ok((await readdir(cwd)).includes('session.json'));
});

test('rejects files and symbolic-link destinations without following them', async (t) => {
  const cwd = await temporary(t);
  const file = path.join(cwd, 'file');
  await writeFile(file, 'preserved');
  await assert.rejects(createProject({ destination: file }), /not a directory/);
  assert.equal(await readFile(file, 'utf8'), 'preserved');
  const target = path.join(cwd, 'target');
  await mkdir(target);
  const link = path.join(cwd, 'link');
  await symlink(target, link, 'dir');
  await assert.rejects(createProject({ destination: link }), /symbolic link/);
  assert.deepEqual(await readdir(target), []);
});

test('absolute tarball paths preserve spaces and generate a file dependency', async (t) => {
  const cwd = await temporary(t);
  const tarball = path.join(cwd, "engine's local package.tgz");
  await writeFile(tarball, 'tarball fixture; initializer checks the path, pnpm checks the archive');
  const result = await createProject({ cwd, destination: 'review', enginePackage: tarball });
  const pkg = JSON.parse(await readFile(path.join(result.directory, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@takazudo/zudo-diagram-gen'], `file:${tarball}`);
});

test('accepts version, full engine package spec, and npm alias without a network request', async (t) => {
  const cwd = await temporary(t);
  const cases = [
    ['^0.2.0', '^0.2.0'],
    ['@takazudo/zudo-diagram-gen@0.2.1', '0.2.1'],
    ['npm:@example/diagram-engine@0.1.0', 'npm:@example/diagram-engine@0.1.0'],
  ];
  for (let i = 0; i < cases.length; i++) {
    const [input, expected] = cases[i];
    const result = await createProject({ cwd, destination: `case-${i}`, enginePackage: input });
    const pkg = JSON.parse(await readFile(path.join(result.directory, 'package.json'), 'utf8'));
    assert.equal(pkg.dependencies['@takazudo/zudo-diagram-gen'], expected);
  }
});

test('invalid or missing local tarballs are rejected before the destination is created', async (t) => {
  const cwd = await temporary(t);
  const invalid = ['./engine.tgz', 'file:engine.tgz', 'workspace:*', path.join(cwd, 'missing.tgz')];
  for (let i = 0; i < invalid.length; i++) {
    await assert.rejects(
      createProject({ cwd, destination: `review-${i}`, enginePackage: invalid[i] }),
      /absolute path|does not exist/,
    );
  }
  assert.deepEqual(await readdir(cwd), []);
});

test('same-named Unicode sessions have stable package slugs and distinct persisted identities', async (t) => {
  const cwd = await temporary(t);
  const title = '図の候補';
  const first = await createProject({ cwd, destination: 'first', name: title });
  const second = await createProject({ cwd, destination: 'second', name: title });
  const data = JSON.parse(await readFile(path.join(first.directory, 'session.json'), 'utf8'));
  const secondData = JSON.parse(
    await readFile(path.join(second.directory, 'session.json'), 'utf8'),
  );
  assert.equal(data.title, title);
  assert.match(first.name, /^diagram-[a-f0-9]{10}$/);
  assert.equal(first.name, second.name);
  assert.match(data.id, /^diagram-[a-f0-9]{10}-[a-f0-9-]{36}$/);
  assert.notEqual(data.id, secondData.id);
  assert.equal(first.sessionId, data.id);
  assert.equal(second.sessionId, secondData.id);
  assert.equal(
    await readFile(path.join(first.directory, 'package.json'), 'utf8'),
    await readFile(path.join(second.directory, 'package.json'), 'utf8'),
  );
});

test('rejects empty names and paths before writing files', async (t) => {
  const cwd = await temporary(t);
  await assert.rejects(createProject({ cwd, destination: '' }), /nonempty directory path/);
  await assert.rejects(
    createProject({ cwd, destination: 'review', name: ' ' }),
    /single-line title/,
  );
  await assert.rejects(
    createProject({ cwd, destination: 'review', name: 'Two\nlines' }),
    /single-line title/,
  );
  assert.deepEqual(await readdir(cwd), []);
});

test('CLI accepts paths and titles literally and never installs by default', async (t) => {
  const cwd = await temporary(t);
  const destination = "folder with spaces and 'quotes'";
  const title = 'Literal $(text) `name`';
  const result = await execute(process.execPath, [cli, destination, '--name', title, '--yes'], {
    cwd,
    env: { ...process.env, PATH: '' },
  });
  assert.match(result.stdout, /Created diagram workspace/);
  assert.match(result.stdout, /pnpm install/);
  const pkg = JSON.parse(await readFile(path.join(cwd, destination, 'package.json'), 'utf8'));
  const data = JSON.parse(await readFile(path.join(cwd, destination, 'session.json'), 'utf8'));
  assert.equal(data.title, title);
  assert.equal(pkg.name, 'literal-text-name');
  assert.ok(!(await readdir(path.join(cwd, destination))).includes('node_modules'));
});

test('explicit install failures leave a usable generated workspace and explain retry', async (t) => {
  const cwd = await temporary(t);
  const destination = path.join(cwd, 'review');
  await assert.rejects(
    execute(process.execPath, [cli, destination, '--install'], {
      cwd,
      env: { ...process.env, PATH: '' },
    }),
    (error) => {
      assert.match(error.stderr, /Workspace created, but pnpm install/);
      assert.match(error.stderr, /pnpm install/);
      return true;
    },
  );
  assert.ok((await readdir(destination)).includes('session.json'));
});

test('flags have explicit parsing errors and support a literal destination after --', () => {
  assert.throws(() => parseArguments(['--unknown']), /Unknown option/);
  assert.throws(() => parseArguments(['--name']), /requires a value/);
  assert.throws(() => parseArguments(['--engine-package=']), /requires a value/);
  assert.throws(() => parseArguments(['one', 'two']), /exactly one destination/);
  assert.equal(parseArguments(['--', '-review']).destination, '-review');
  assert.equal(parseArguments(['--name=My Diagram']).name, 'My Diagram');
  assert.equal(parseArguments([]).install, false);
  assert.equal(parseArguments(['--install']).install, true);
});

test('help and version work without creating a destination', async (t) => {
  const cwd = await temporary(t);
  const help = await execute(process.execPath, [cli, '--help'], { cwd });
  assert.match(help.stdout, /--engine-package/);
  const version = await execute(process.execPath, [cli, '--version'], { cwd });
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  assert.equal(version.stdout.trim(), pkg.version);
  assert.deepEqual(await readdir(cwd), []);
});
