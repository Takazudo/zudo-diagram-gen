/** Fresh installed-consumer acceptance. Run only under the shared browser/heavy guards. */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const archive = process.argv[2];
if (!archive || !path.isAbsolute(archive))
  throw new Error('Supply an absolute locally packed engine archive.');
const root = await mkdtemp(path.join(os.tmpdir(), 'capture-consumer-'));
const json = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
};
const run = (args) => exec('corepack', ['pnpm', ...args], { cwd: root, maxBuffer: 1024 * 1024 });
try {
  await json(path.join(root, 'package.json'), {
    name: 'capture-consumer',
    private: true,
    type: 'module',
    packageManager: 'pnpm@10.30.3',
  });
  await run(['add', archive, '--config.auto-install-peers=false']);
  const session = path.join(root, 'session');
  const c = path.join(session, 'rounds', 'r01', 'c01');
  await mkdir(c, { recursive: true });
  await json(path.join(session, 'session.json'), {
    schemaVersion: 1,
    id: 'consumer',
    title: 'Packed capture',
    target: { width: 480, height: 140 },
  });
  await json(path.join(session, 'rounds', 'r01', 'round.json'), {
    schemaVersion: 1,
    id: 'r01',
    title: 'Round',
    order: 1,
  });
  await json(path.join(c, 'candidate.json'), {
    schemaVersion: 1,
    id: 'c01',
    title: 'Packed candidate',
    toneId: 'swiss-grid',
    order: 1,
    assets: { light: 'light.svg' },
  });
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 140" aria-label="Packed candidate"><rect width="480" height="140" fill="#ffedd5"/><text x="20" y="80" font-size="28">Installed consumer capture</text></svg>\n';
  await writeFile(path.join(c, 'light.svg'), svg);
  const cli = ['exec', 'zudo-diagram-gen'];
  await run([...cli, 'check', session, '--json']);
  const exported = path.join(root, 'exact.svg');
  await run([...cli, 'export', 'c01', '--session', session, '--theme', 'light', '--out', exported]);
  assert.equal(await readFile(exported, 'utf8'), svg);
  const png = path.join(root, 'capture.png');
  await assert.rejects(
    run([...cli, 'capture', 'c01', '--session', session, '--out', png, '--json']),
    (error) => {
      assert.equal(JSON.parse(error.stdout).errors[0].code, 'CAPTURE_UNAVAILABLE');
      assert.equal(error.code, 3);
      return true;
    },
  );
  // Explicit capability setup: the installed consumer supplies the optional peer.
  await run(['add', '-D', 'playwright@1.59.1', '--config.auto-install-peers=false']);
  const browserExecutablePath = process.env.CAPTURE_BROWSER_EXECUTABLE;
  const captured = await run([
    ...cli,
    'capture',
    'c01',
    '--session',
    session,
    '--out',
    png,
    '--json',
    ...(browserExecutablePath ? ['--browser-executable', browserExecutablePath] : []),
  ]);
  const envelope = JSON.parse(captured.stdout);
  assert.equal(envelope.ok, true);
  assert.equal(envelope.data.provenance.inspected, false);
  assert.deepEqual(envelope.data.provenance.pixelDimensions, { width: 480, height: 140 });
  console.log(
    JSON.stringify({
      ok: true,
      freshPackedConsumer: true,
      ordinaryCommandsWithoutBrowser: true,
      explicitPlaywrightSetup: '1.59.1',
      provenance: envelope.data.provenance,
    }),
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
