import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { join, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { test, onTestFinished } from 'vitest';
import { createProject } from '../src/scaffold.mjs';
import { createProject as createInitializer } from '../../create-zudo-diagram-gen/src/index.mjs';
const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));

for (const [name, create] of [
  ['engine', createProject],
  ['initializer', createInitializer],
]) {
  for (const project of [false, true]) {
    test(`${name} fresh ${project ? 'project' : 'session'} export script publishes safely and keeps root protection`, async () => {
      const root = await mkdtemp(join(tmpdir(), 'scaffold export '));
      onTestFinished(() => rm(root, { recursive: true, force: true }));
      const directory = join(root, 'consumer');
      await create({ destination: directory, project });
      const packageText = await readFile(join(directory, 'package.json'), 'utf8');
      const pkg = JSON.parse(packageText);
      const script = pkg.scripts['export:html'];
      assert.equal(typeof script, 'string');
      assert.match(
        await readFile(join(directory, 'AGENTS.md'), 'utf8'),
        /pnpm export:html.*exports\/diagram-review\.html/,
      );
      assert.match(
        await readFile(join(directory, 'README.md'), 'utf8'),
        /exports\/diagram-review\.html/,
      );
      const session = project ? join(directory, 'sessions/diagram') : directory;
      const candidate = join(session, 'rounds/r01/c01');
      await mkdir(candidate, { recursive: true });
      await writeFile(
        join(candidate, 'candidate.json'),
        JSON.stringify({
          schemaVersion: 1,
          id: 'c01',
          title: 'Fresh export',
          toneId: 'fine-outline',
          order: 0,
          assets: { light: 'light.svg' },
        }),
      );
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><title>Fresh export 日本語</title></svg>';
      await writeFile(join(candidate, 'light.svg'), svg);
      const bin = join(root, 'bin');
      await mkdir(bin);
      await symlink(cli, join(bin, 'zudo-diagram-gen'));
      // Execute the generated script unchanged against the real CLI, without dependency installation.
      const options = {
        cwd: directory,
        env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` },
      };
      const result = await execute('sh', ['-c', script], options);
      assert.equal(result.stderr, '');
      const html = await readFile(join(directory, 'exports/diagram-review.html'), 'utf8');
      assert.ok(html.includes('Fresh export 日本語'));
      assert.ok(html.includes(`"kind":"${project ? 'project' : 'session'}"`));
      const protectedFile = join(directory, 'diagram-review.html');
      await writeFile(protectedFile, 'Existing source stays intact.');
      await assert.rejects(
        execute(
          'sh',
          ['-c', script.replace('exports/diagram-review.html', 'diagram-review.html') + ' --force'],
          options,
        ),
        (error) => error.code === 1 && /protected source/.test(error.stderr),
      );
      assert.equal(await readFile(protectedFile, 'utf8'), 'Existing source stays intact.');
      assert.equal(await readFile(join(candidate, 'light.svg'), 'utf8'), svg);
      await assert.rejects(create({ destination: directory, project }), /not empty/);
      assert.equal(await readFile(join(directory, 'package.json'), 'utf8'), packageText);
    });
  }
}
