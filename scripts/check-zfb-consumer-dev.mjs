// Disposable installed consumer only; run under the host's heavy-test guard.
import assert from 'node:assert/strict';
import { readFile, writeFile, cp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

export async function checkConsumerDev(directory) {
  const root = resolve(directory);
  const require = createRequire(join(root, 'package.json'));
  const cli = require.resolve('@takazudo/zudo-diagram-gen').replace(/index\.mjs$/, 'cli.mjs');
  const child = spawn(
    process.execPath,
    [cli, 'dev', root, '--host', '127.0.0.1', '--port', '4818'],
    { cwd: root },
  );
  let logs = '';
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      logs += chunk;
    });
  async function poll(predicate) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`Dev exited: ${logs}`);
      if (await predicate()) return;
      await new Promise((accept) => setTimeout(accept, 200));
    }
    throw new Error(`Dev condition timed out: ${logs}`);
  }
  async function servedData() {
    try {
      const response = await fetch('http://127.0.0.1:4818/');
      const text = await response.text();
      const json = text.match(
        /<script id="diagram-data" type="application\/json">(.*?)<\/script>/s,
      );
      return json ? JSON.parse(json[1]) : null;
    } catch {
      return null;
    }
  }
  let browser;
  try {
    await poll(async () => (await servedData())?.candidates.length === 11);
    const brief = join(root, 'brief.md');
    await writeFile(brief, (await readFile(brief, 'utf8')) + '\nLive ZFB compatibility edit\n');
    await poll(async () => (await servedData())?.brief.includes('Live ZFB compatibility edit'));
    const added = join(root, 'rounds/r01/r01-live');
    await cp(join(root, 'rounds/r01/r01-c01'), added, { recursive: true });
    const metadata = JSON.parse(await readFile(join(added, 'candidate.json'), 'utf8'));
    metadata.id = 'r01-live';
    await writeFile(join(added, 'candidate.json'), JSON.stringify(metadata));
    await poll(async () => (await servedData())?.candidates.length === 12);
    const generated = await readFile(join(root, 'pages/index.tsx'), 'utf8');
    const saved = await readFile(join(added, 'candidate.json'), 'utf8');
    logs = '';
    await writeFile(join(added, 'candidate.json'), '{ invalid');
    await poll(async () => logs.includes('Content is not ready'));
    assert.equal(await readFile(join(root, 'pages/index.tsx'), 'utf8'), generated);
    assert.equal((await servedData()).candidates.length, 12);
    await writeFile(join(added, 'candidate.json'), saved);
    await rm(added, { recursive: true });
    await poll(async () => (await servedData())?.candidates.length === 11);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:4818/');
    await page.locator('.dg-card').first().waitFor();
    assert.equal(await page.locator('.dg-card').count(), 10);
    assert.deepEqual(errors, []);
    return {
      ok: true,
      assertions: [
        'live brief edit',
        'candidate addition',
        'invalid content preserves last valid route',
        'recovery and removal',
        'browser mount',
      ],
    };
  } finally {
    await browser?.close();
    const exited = new Promise((accept) => child.once('exit', accept));
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await exited;
    }
  }
}
