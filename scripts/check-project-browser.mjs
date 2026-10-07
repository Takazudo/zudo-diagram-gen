#!/usr/bin/env node
// Run this under heavy-guard + playwright-guard with an installed packed host.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] || '');
if (!process.argv[2])
  throw new Error('Usage: node scripts/check-project-browser.mjs <installed-host>');
const require = createRequire(join(root, 'package.json'));
const cli = require.resolve('@takazudo/zudo-diagram-gen');
const engineRoot = resolve(cli, '../..');
const playwright = await import(
  process.env.PROJECT_PLAYWRIGHT_MODULE || pathToFileURL(require.resolve('playwright')).href
);
const port = process.env.PROJECT_CHECK_PORT || '4797';
let logs = '';
const child = spawn(
  process.execPath,
  [join(engineRoot, 'src/cli.mjs'), 'dev', root, '--host', '127.0.0.1', '--port', port],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
);
child.stdout.on('data', (value) => {
  logs += value;
});
child.stderr.on('data', (value) => {
  logs += value;
});
const base = `http://127.0.0.1:${port}`;
const wait = async (predicate) => {
  for (let i = 0; i < 120; i++) {
    try {
      if (await predicate()) return;
    } catch {
      /* Host may still be compiling the route. */
    }
    await new Promise((accept) => setTimeout(accept, 250));
  }
  throw new Error('Browser convergence timeout\n' + logs);
};
let browser;
let sessionFile, sessionBackup, candidateDirectory;
const manifestFile = join(root, 'project.json');
const original = await readFile(manifestFile, 'utf8');
try {
  await wait(async () => (await fetch(base, { signal: AbortSignal.timeout(1500) })).ok);
  browser = await playwright.chromium.launch(
    process.env.PROJECT_BROWSER_EXECUTABLE
      ? { executablePath: process.env.PROJECT_BROWSER_EXECUTABLE }
      : {},
  );
  const page = await browser.newPage();
  await page.goto(base);
  const project = JSON.parse(original);
  assert.equal(project.sessions.length, 5);
  for (const session of project.sessions) {
    await page.goto(`${base}/sessions/${session.id}/`);
    await page.locator('#diagram-app').waitFor();
    assert.match(
      await page.locator('body').innerText(),
      new RegExp(
        JSON.parse(await readFile(join(root, session.path, 'session.json'), 'utf8')).title.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        ),
      ),
    );
  }
  const first = project.sessions[0],
    filename = join(root, first.path, 'session.json');
  const sessionOriginal = await readFile(filename, 'utf8');
  sessionFile = filename;
  sessionBackup = sessionOriginal;
  await writeFile(filename, '{');
  await wait(async () => {
    await page.goto(`${base}/sessions/${first.id}/`);
    return (await page.locator('body').innerText()).includes('STALE');
  });
  await page.goto(`${base}/sessions/${project.sessions[1].id}/`);
  await page.locator('#diagram-app').waitFor();
  await writeFile(filename, sessionOriginal);
  await wait(async () => {
    await page.goto(`${base}/sessions/${first.id}/`);
    return !(await page.locator('body').innerText()).includes('STALE');
  });
  const candidateRoot = join(root, first.path, `rounds/r01/browser-test-${randomUUID()}`);
  await mkdir(candidateRoot);
  candidateDirectory = candidateRoot;
  await writeFile(
    join(candidateRoot, 'diagram.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320"><title>Watcher probe</title><desc>Original test fixture</desc><rect width="100" height="100" fill="#334455"/></svg>',
  );
  await writeFile(
    join(candidateRoot, 'candidate.json'),
    JSON.stringify({
      schemaVersion: 1,
      id: 'browser-probe',
      title: 'Browser watcher probe',
      toneId: 'fine-outline',
      order: 1,
      assets: { light: 'diagram.svg' },
    }),
  );
  await wait(async () => {
    await page.goto(`${base}/sessions/${first.id}/`);
    return (await page.locator('body').innerText()).includes('Browser watcher probe');
  });
  const shorter = { ...project, sessions: project.sessions.slice(1) };
  await writeFile(manifestFile, JSON.stringify(shorter));
  await wait(async () => {
    await page.goto(base);
    return !(await page.locator('main').innerText()).includes(first.id);
  });
  await writeFile(manifestFile, original);
  await wait(async () => {
    await page.goto(base);
    return (await page.locator('main').innerText()).includes(first.id);
  });
  console.log(
    JSON.stringify({
      ok: true,
      sessions: 5,
      singleProcess: child.pid,
      browserVersion: browser.version(),
      executable: process.env.PROJECT_BROWSER_EXECUTABLE ?? 'pinned Playwright browser',
      assertions: [
        'individual routes',
        'invalid-to-valid recovery',
        'valid sibling',
        'candidate addition',
        'remove/re-add',
      ],
    }),
  );
} finally {
  await writeFile(manifestFile, original);
  if (sessionFile) await writeFile(sessionFile, sessionBackup);
  if (candidateDirectory) await rm(candidateDirectory, { recursive: true });
  await browser?.close();
  child.kill('SIGTERM');
  await new Promise((accept) => {
    if (child.exitCode !== null) accept();
    else child.once('exit', accept);
  });
}
