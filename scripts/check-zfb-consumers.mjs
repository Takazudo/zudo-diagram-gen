// Run after pack:local, under the host's heavy-test guard.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, cp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { checkConsumerDev } from './check-zfb-consumer-dev.mjs';

const checkout = resolve('.');
const output = await mkdtemp(join(tmpdir(), 'diagram-zfb-consumers-'));
const initializer = join(output, 'initializer');
await mkdir(initializer);
function run(command, args, cwd) {
  console.log(JSON.stringify({ command, args, cwd }));
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed`);
}
run(
  'tar',
  ['-xzf', resolve('artifacts/create-zudo-diagram-gen-0.1.0.tgz'), '-C', initializer],
  checkout,
);
const { createProject } = await import(pathToFileURL(join(initializer, 'package/src/index.mjs')));
const enginePackage = resolve('artifacts/takazudo-zudo-diagram-gen-0.1.0.tgz');
const versions = ['2.21.1', '3.2.0', '4.3.0'];
const results = [];
const literal = 'Literal marker text: data-zfb-island="Demo" and zr:1:example';
const fixture = JSON.parse(await readFile('examples/tone-exploration/session.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
try {
  for (const version of versions) {
    for (const kind of ['session', 'project']) {
      const root = join(output, `${version}-${kind}`);
      await createProject({
        destination: root,
        name: `ZFB ${version} ${kind}`,
        enginePackage,
        project: kind === 'project',
        sessions: [{ slug: 'diagram', id: fixture.id, title: fixture.title }, { slug: 'empty' }],
      });
      const manifestFile = join(root, 'package.json');
      const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
      // Verify the initializer's actual default before preparing older controls.
      assert.equal(manifest.dependencies['@takazudo/zfb'], '4.3.0');
      assert.equal(manifest.dependencies['@takazudo/zfb-runtime'], '4.3.0');
      manifest.dependencies['@takazudo/zfb'] = version;
      manifest.dependencies['@takazudo/zfb-runtime'] = version;
      if (version.startsWith('2.')) {
        Object.assign(manifest.dependencies, {
          preact: '10.29.2',
          'preact-render-to-string': '6.6.6',
          hono: '4.13.9',
        });
        const tsFile = join(root, 'tsconfig.json');
        const ts = JSON.parse(await readFile(tsFile, 'utf8'));
        ts.compilerOptions.jsxImportSource = 'preact';
        await writeFile(tsFile, JSON.stringify(ts, null, 2) + '\n');
      }
      await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
      const content = kind === 'project' ? join(root, 'sessions/diagram') : root;
      for (const name of ['session.json', 'brief.md', 'rounds'])
        await cp(join(checkout, 'examples/tone-exploration', name), join(content, name), {
          recursive: true,
        });
      await writeFile(
        join(content, 'brief.md'),
        (await readFile(join(content, 'brief.md'), 'utf8')) + '\n' + literal + '\n',
      );
      run('pnpm', ['install', '--strict-peer-dependencies'], root);
      const require = createRequire(join(root, 'package.json'));
      const installed = {};
      for (const name of ['@takazudo/zudo-diagram-gen', '@takazudo/zfb', '@takazudo/zfb-runtime']) {
        const filename = require.resolve(name);
        const location = await realpath(filename);
        assert.ok(
          location.startsWith(root + '/'),
          `${name} resolved outside consumer: ${location}`,
        );
        installed[name] = location;
      }
      for (const name of ['@takazudo/zfb', '@takazudo/zfb-runtime'])
        assert.equal(
          JSON.parse(await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8'))
            .version,
          version,
        );
      for (const args of [
        ['check'],
        ['build'],
        ['exec', 'tsc', '--noEmit'],
        ['exec', 'zfb', 'check'],
      ])
        run('pnpm', args, root);
      if (!version.startsWith('2.'))
        run('pnpm', ['exec', 'zfb', 'wind', 'audit', '--fail-on', 'error'], root);
      const html = join(output, `${version}-${kind}.html`);
      run('pnpm', ['exec', 'zudo-diagram-gen', 'export-html', '.', '--out', html], root);
      const port = 4810 + results.length;
      const cli = require.resolve('@takazudo/zudo-diagram-gen').replace(/index\.mjs$/, 'cli.mjs');
      const preview = spawn(
        process.execPath,
        [cli, 'preview', root, '--host', '127.0.0.1', '--port', String(port)],
        { cwd: root, stdio: 'inherit' },
      );
      try {
        const url = `http://127.0.0.1:${port}`;
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          if (preview.exitCode !== null) throw new Error('Preview exited before readiness');
          try {
            if ((await fetch(url)).ok) {
              ready = true;
              break;
            }
          } catch {
            /* Wait for the local server. */
          }
          await new Promise((accept) => setTimeout(accept, 100));
        }
        assert.ok(ready, 'Preview did not become ready');
        const context = await browser.newContext({ acceptDownloads: true });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.goto(url);
        if (kind === 'project') {
          await page.locator('#diagram-app').waitFor();
          await page.goto(`${url}/sessions/${fixture.id}/`);
          assert.ok(
            (
              await fetch(
                `${url}/sessions/${JSON.parse(await readFile(join(root, 'project.json'), 'utf8')).sessions[1].id}/`,
              )
            ).ok,
          );
        }
        await page.locator('.dg-card').first().waitFor();
        assert.equal(await page.locator('.dg-card').count(), 10);
        const payload = await page.locator('#diagram-data').textContent();
        assert.ok(JSON.parse(payload).brief.includes(literal));
        await page.locator('[data-field="search"]').fill('r01-c07');
        assert.equal(await page.locator('.dg-card').count(), 1);
        await page.locator('[data-action="clear-filters"]').click();
        await page.locator('[data-action="inspect"]').first().focus();
        await page.keyboard.press('Enter');
        await page.locator('[data-note="keep"]').fill('Compatibility feedback');
        await page.locator('[data-action="theme"][data-value="dark"]').click();
        const [svg] = await Promise.all([
          page.waitForEvent('download'),
          page.locator('[data-action="download-svg"]').first().click(),
        ]);
        const svgFile = join(output, `${version}-${kind}.svg`);
        await svg.saveAs(svgFile);
        assert.equal(
          await readFile(svgFile, 'utf8'),
          JSON.parse(payload).candidates[0].assets.dark,
        );
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.locator('.dg-topbar [data-action="download-review"]').click(),
        ]);
        const review = join(output, `${version}-${kind}-review.json`);
        await download.saveAs(review);
        await page.locator('[data-import-review]').setInputFiles(review);
        await page
          .locator('.dg-toast')
          .filter({ hasText: /imported/i })
          .waitFor();
        await page.reload();
        assert.equal(
          await page.locator('[data-note="keep"]').inputValue(),
          'Compatibility feedback',
        );
        assert.deepEqual(errors, []);
        await context.close();
        const offline = await browser.newContext();
        await offline.route(/^https?:/, (route) => route.abort());
        const detached = await offline.newPage();
        detached.on('pageerror', (error) => errors.push(error.message));
        await detached.goto(pathToFileURL(html).href);
        if (kind === 'project')
          await detached.locator(`[data-project-open="${fixture.id}"]`).click();
        await detached.locator('.dg-card:visible').first().waitFor();
        assert.deepEqual(errors, []);
        await offline.close();
        const dev =
          version === '4.3.0' && kind === 'session' ? await checkConsumerDev(root) : undefined;
        results.push({ version, kind, installed, browser: browser.version(), dev, ok: true });
      } finally {
        const exited = new Promise((accept) => preview.once('exit', accept));
        if (preview.exitCode === null) {
          preview.kill('SIGTERM');
          await exited;
        }
      }
    }
  }
} finally {
  await browser.close();
}
await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
await mkdir('test-output', { recursive: true });
await writeFile(
  'test-output/zfb-consumers.json',
  JSON.stringify({ output, results }, null, 2) + '\n',
);
console.log(JSON.stringify({ output, results }, null, 2));
