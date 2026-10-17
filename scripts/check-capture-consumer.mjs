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
  const full = {
    schemaVersion: 1,
    frame: { width: 480, height: 140, background: '#FFFFFF' },
    slot: { x: 0, y: 0, width: 480, height: 140 },
    fit: 'contain',
  };
  const context = { title: 'Context', body: 'Saved placement' };
  const placementFile = path.join(session, 'placement.json');
  await json(placementFile, { ...full, context });
  await assert.rejects(
    run([
      ...cli,
      'capture',
      'c01',
      '--session',
      session,
      '--placement',
      placementFile,
      '--out',
      png,
      '--json',
    ]),
    (error) => {
      assert.equal(error.code, 1);
      const diagnostic = JSON.parse(error.stdout).errors[0];
      assert.equal(diagnostic.code, 'VALIDATION_FAILED');
      assert.match(diagnostic.message, /full-frame.*Remove context.*enlarge the frame/);
      return true;
    },
  );
  // Explicit capability setup: the installed consumer supplies the optional peer.
  await run(['add', '-D', 'playwright@1.63.0', '--config.auto-install-peers=false']);
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
  const capturePlacement = async (placement, name, force = false) => {
    await json(placementFile, placement);
    const output = path.join(session, 'exports', `${name}.png`);
    const result = await run([
      ...cli,
      'capture',
      'c01',
      '--session',
      session,
      '--placement',
      placementFile,
      '--out',
      output,
      '--json',
      ...(force ? ['--force'] : []),
      ...(browserExecutablePath ? ['--browser-executable', browserExecutablePath] : []),
    ]);
    const provenance = JSON.parse(result.stdout).data.provenance;
    assert.deepEqual(JSON.parse(await readFile(`${output}.json`, 'utf8')), provenance);
    return provenance;
  };
  const empty = await capturePlacement({ ...full, context: { title: '', body: '' } }, 'empty');
  assert.deepEqual(empty.pixelDimensions, { width: 480, height: 140 });
  const beside = await capturePlacement(
    {
      ...full,
      frame: { ...full.frame, width: 680 },
      slot: { ...full.slot, x: 200 },
      context,
    },
    'beside',
  );
  assert.deepEqual(beside.pixelDimensions, { width: 680, height: 140 });
  const below = { ...full, frame: { ...full.frame, height: 220 }, context };
  const withContext = await capturePlacement(below, 'context');
  const changedContext = await capturePlacement(
    { ...below, context: { ...context, body: 'Changed' } },
    'context',
    true,
  );
  const withoutContext = await capturePlacement({ ...below, context: undefined }, 'context', true);
  assert.notEqual(withContext.placementHash, changedContext.placementHash);
  assert.notEqual(withContext.placementHash, withoutContext.placementHash);
  assert.notEqual(changedContext.placementHash, withoutContext.placementHash);
  await assert.rejects(
    capturePlacement({ ...full, frame: { ...full.frame, height: 141 }, context }, 'overlap'),
    (error) => {
      assert.equal(error.code, 1);
      const diagnostic = JSON.parse(error.stdout).errors[0];
      assert.equal(diagnostic.code, 'VALIDATION_FAILED');
      assert.match(diagnostic.message, /context overlaps diagram slot.*Remove context/);
      return true;
    },
  );
  console.log(
    JSON.stringify({
      ok: true,
      freshPackedConsumer: true,
      ordinaryCommandsWithoutBrowser: true,
      explicitPlaywrightSetup: '1.63.0',
      contextRegression: {
        preflightWithoutBrowser: true,
        empty: empty.placementHash,
        beside: beside.placementHash,
        withContext: withContext.placementHash,
        changedContext: changedContext.placementHash,
        withoutContext: withoutContext.placementHash,
        measuredOverlapRejected: true,
      },
      provenance: envelope.data.provenance,
    }),
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
