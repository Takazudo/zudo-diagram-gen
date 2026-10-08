import assert from 'node:assert/strict';
import {
  cp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  lstat,
  readlink,
  realpath,
  rename,
} from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATE_ASSERTIONS, installedEngine, sha256 } from './integrated-acceptance.mjs';

export async function dependencySnapshot(root, modulePath) {
  const files = [];
  async function walk(directory) {
    for (const name of (await readdir(directory)).sort()) {
      const file = path.join(directory, name),
        info = await lstat(file);
      const relative = path.relative(root, file);
      if (info.isSymbolicLink()) files.push({ path: relative, link: await readlink(file) });
      else if (info.isDirectory()) await walk(file);
      else files.push({ path: relative, sha256: sha256(await readFile(file)) });
    }
  }
  await walk(path.join(root, 'node_modules'));
  for (const name of ['package.json', 'pnpm-lock.yaml'])
    files.push({ path: name, sha256: sha256(await readFile(path.join(root, name))) });
  const resolution = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      'import {createRequire} from "node:module"; let resolved=null; try {resolved=createRequire(process.argv[1]).resolve("playwright");} catch {} console.log(JSON.stringify(resolved));',
      modulePath,
    ],
    { encoding: 'utf8', env: { ...process.env, NODE_PATH: '' } },
  );
  assert.equal(resolution.status, 0, resolution.stderr);
  return {
    schemaVersion: 1,
    playwright: JSON.parse(resolution.stdout),
    environmentOverrides: { NODE_PATH: '' },
    files,
  };
}

export async function runDistributionProbe(mode, config, output) {
  assert.ok(['no-browser', 'installed-catalog-upgrade'].includes(mode), 'Unknown probe mode.');
  assert.ok(
    path.isAbsolute(output) &&
      path.isAbsolute(config.engineArchive) &&
      path.isAbsolute(config.trialRoot),
    'Use explicit absolute paths.',
  );
  const checkoutRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  assert.ok(
    !output.startsWith(`${checkoutRoot}${path.sep}`),
    'Probe consumer must be outside checkout.',
  );
  const outputParent = await realpath(path.dirname(output));
  assert.ok(
    outputParent !== checkoutRoot && !outputParent.startsWith(`${checkoutRoot}${path.sep}`),
    'Probe parent cannot link into checkout.',
  );
  const original = await installedEngine(config.trialRoot, config.engineModule, checkoutRoot);
  const trial = await original.engine.loadProject(config.trialRoot, { strict: true });
  const session = trial.sessions.find((item) => item.id === config.sessionId);
  const candidate = session?.data.candidates.find((item) => item.id === config.candidateId);
  assert.ok(candidate, 'Name an actual saved trial candidate.');
  await mkdir(output); // Never replace an earlier probe or consumer.
  const records = [];
  const json = async (name, value) => {
    const file = path.join(output, name);
    await writeFile(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
    return { path: file, sha256: sha256(await readFile(file)) };
  };
  const run = (executable, args, expectedExit = 0) => {
    const result = spawnSync(executable, args, {
      cwd: output,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      timeout: 300000,
      env: { ...process.env, NODE_PATH: '' },
    });
    records.push({
      command: [executable, ...args],
      exitCode: result.status,
      expectedExitCode: expectedExit,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error?.message ?? null,
      environmentOverrides: { NODE_PATH: '' },
    });
    assert.equal(
      result.status,
      expectedExit,
      result.stderr || result.stdout || result.error?.message,
    );
    return result;
  };
  try {
    await json('package.json', {
      name: `p11-${mode}-probe`,
      private: true,
      type: 'module',
      packageManager: 'pnpm@10.30.3',
    });
    assert.equal(run('corepack', ['pnpm', '--version']).stdout.trim(), '10.30.3');
    run('corepack', ['pnpm', 'add', config.engineArchive, '--config.auto-install-peers=false']);
    const modulePath = path.join(output, 'node_modules/@takazudo/zudo-diagram-gen/src/index.mjs');
    const { engine, modulePath: actualModule } = await installedEngine(
      output,
      modulePath,
      checkoutRoot,
    );
    const beforeDependencies = await dependencySnapshot(output, actualModule);
    assert.equal(
      beforeDependencies.playwright,
      null,
      'Separate consumer must have no browser library.',
    );
    const before = await json('dependencies-before.json', beforeDependencies);
    const workflow = {};
    if (mode === 'no-browser') {
      const content = path.join(output, 'session');
      await cp(path.join(config.trialRoot, session.path), content, {
        recursive: true,
        errorOnExist: true,
      });
      const cli = path.join(path.dirname(actualModule), 'cli.mjs');
      const command = (args, status = 0) => run(process.execPath, [cli, ...args], status);
      command(['check', content, '--json-version', '1']);
      const context = await engine.resolveToneContext(candidate.toneId, { requireComplete: true });
      assert.ok(context.scheme && context.kit && context.hashes.contextHash);
      await json('tone-context.json', context);
      for (const theme of ['light', 'dark']) {
        const file = path.join(output, `${theme}.svg`);
        command([
          'export',
          candidate.id,
          '--session',
          content,
          '--theme',
          theme,
          '--out',
          file,
          '--json',
        ]);
        assert.equal((await readFile(file)).toString('utf8'), candidate.assets[theme]);
      }
      command(['export-html', content, '--out', path.join(output, 'single.html'), '--json']);
      const unavailable = command(
        [
          'capture',
          candidate.id,
          '--session',
          content,
          '--out',
          path.join(output, 'unavailable.png'),
          '--json',
        ],
        3,
      );
      const envelope = JSON.parse(unavailable.stdout);
      assert.equal(envelope.errors[0].code, 'CAPTURE_UNAVAILABLE');
      assert.match(envelope.errors[0].message, /playwright|browser|install/i);
      assert.equal(
        (await readdir(output)).some((name) => name.startsWith('unavailable.png')),
        false,
      );
      const capture = await json('capture-unavailable.json', envelope);
      const afterDependencies = await dependencySnapshot(output, actualModule);
      assert.deepEqual(
        afterDependencies,
        beforeDependencies,
        'No capture command may implicitly install or mutate dependencies.',
      );
      const after = await json('dependencies-after.json', afterDependencies);
      workflow.noBrowser = {
        consumerRoot: output,
        engineModule: actualModule,
        before,
        after,
        capture,
      };
    } else {
      assert.ok(
        config.revision && Array.isArray(config.exports) && config.exports.length >= 2,
        'Upgrade needs actual saved style revision and reviewed light/dark exports.',
      );
      // Copy only actual authored content; this consumer retains its own installed package.
      for (const name of ['project.json', 'sessions', 'styles', 'inputs'])
        await cp(path.join(config.trialRoot, name), path.join(output, name), {
          recursive: true,
          errorOnExist: true,
        });
      const copied = await engine.loadProject(output, { strict: true });
      const exportCommands = [];
      const exportPhase = async (item, phase) => {
        const savedSession = copied.sessions.find((entry) => entry.id === item.sessionId);
        const savedCandidate = savedSession?.data.candidates.find(
          (entry) => entry.id === item.candidateId,
        );
        assert.ok(
          savedCandidate && ['light', 'dark'].includes(item.theme),
          'Exact export requires actual session/candidate/theme identity.',
        );
        assert.equal(item.fingerprint, savedCandidate.fingerprint);
        const destination = path.join(output, 'exports', `${phase}-${item.name}`);
        await engine.exportCandidate(path.join(output, savedSession.path), item.candidateId, {
          theme: item.theme,
          output: destination,
          resourceRoot: output,
        });
        const bytes = await readFile(destination);
        assert.equal(bytes.toString('utf8'), savedCandidate.assets[item.theme]);
        exportCommands.push({
          operation: 'exportCandidate',
          phase,
          sessionId: item.sessionId,
          candidateId: item.candidateId,
          theme: item.theme,
          fingerprint: item.fingerprint,
          engineModule: actualModule,
          exitCode: 0,
          sha256: sha256(bytes),
        });
        return { path: destination, sha256: sha256(bytes) };
      };
      const htmlPhase = async (kind, phase) => {
        const source = kind === 'project' ? output : path.join(output, session.path);
        const destination = path.join(output, 'exports', `${phase}-${kind}.html`);
        await engine.exportHtml(source, { output: destination });
        const bytes = await readFile(destination);
        exportCommands.push({
          operation: 'exportHtml',
          phase,
          kind,
          sessionId: kind === 'single' ? session.id : null,
          engineModule: actualModule,
          exitCode: 0,
          sha256: sha256(bytes),
        });
        return { path: destination, sha256: sha256(bytes) };
      };
      const snapshot = await engine.readStyleRevision(output, config.revision);
      const beforeContext = await engine.resolveToneContext(snapshot.style.toneId, {
        requireComplete: true,
      });
      const contextBefore = await json('context-before.json', beforeContext);
      const immutableFiles = [];
      for (const name of ['style.json', 'scheme.json', 'palette.json', 'kit.svg']) {
        const file = path.join(output, 'styles', config.revision, name);
        const bytes = await readFile(file);
        const saved = path.join(output, `before-${name}`);
        await writeFile(saved, bytes, { flag: 'wx' });
        immutableFiles.push({
          name,
          before: { path: saved, sha256: sha256(bytes) },
          after: { path: file, sha256: sha256(bytes) },
        });
      }
      const exports = [];
      for (const item of config.exports) {
        assert.match(item.name, /^[a-zA-Z0-9._-]+$/);
        const originalBytes = await readFile(item.path);
        const before = await exportPhase(item, 'before');
        assert.equal(
          before.sha256,
          sha256(originalBytes),
          'Actual installed export differs from saved reviewed export.',
        );
        exports.push({
          name: item.name,
          sessionId: item.sessionId,
          candidateId: item.candidateId,
          theme: item.theme,
          fingerprint: item.fingerprint,
          original: { path: item.path, sha256: sha256(originalBytes) },
          before,
        });
      }
      const html = [];
      for (const kind of ['single', 'project']) {
        const originalHtml = config.html?.find((item) => item.kind === kind)?.file;
        assert.ok(originalHtml, 'Upgrade must name original exact single/project HTML.');
        const beforeHtml = await htmlPhase(kind, 'before');
        assert.equal(
          beforeHtml.sha256,
          sha256(await readFile(originalHtml.path)),
          'Installed HTML differs from original exact export.',
        );
        html.push({
          original: originalHtml,
          kind,
          sessionId: kind === 'single' ? session.id : null,
          before: beforeHtml,
        });
      }
      const options = {
        scheme: snapshot.scheme,
        palette: snapshot.palette,
        instances: [{ id: 'upgrade-probe', primitive: 'person', width: 100, height: 100 }],
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><title>Deterministic saved-kit upgrade probe</title></svg>',
      };
      const materializations = [];
      for (const theme of ['light', 'dark'])
        materializations.push({
          theme,
          expectedHash: sha256(engine.materializeKit(snapshot.kit, { ...options, theme })),
        });
      const installedPackage = path.dirname(path.dirname(await realpath(actualModule)));
      const schemeFile = path.join(installedPackage, 'tones', snapshot.style.toneId, 'scheme.json');
      const scheme = JSON.parse(await readFile(schemeFile, 'utf8'));
      scheme.palette.light.ink = scheme.palette.light.ink === '#010203' ? '#040506' : '#010203';
      // pnpm may hardlink package files to its store; replace only this consumer's directory entry.
      await writeFile(`${schemeFile}.p11-new`, JSON.stringify(scheme, null, 2) + '\n', {
        flag: 'wx',
      });
      await rename(`${schemeFile}.p11-new`, schemeFile);
      const afterContext = await engine.resolveToneContext(snapshot.style.toneId, {
        requireComplete: true,
      });
      assert.notEqual(
        afterContext.hashes.contextHash,
        beforeContext.hashes.contextHash,
        'Actual separately installed catalog must change.',
      );
      const contextAfter = await json('context-after.json', afterContext);
      const unchanged = await engine.readStyleRevision(output, config.revision);
      assert.equal(unchanged.hash, snapshot.hash);
      for (let index = 0; index < exports.length; index++)
        exports[index].after = await exportPhase(config.exports[index], 'after');
      for (const item of html) item.after = await htmlPhase(item.kind, 'after');
      for (const pair of [...immutableFiles, ...exports, ...html])
        assert.deepEqual(await readFile(pair.before.path), await readFile(pair.after.path));
      for (const item of materializations) {
        const text = engine.materializeKit(unchanged.kit, {
          ...options,
          scheme: unchanged.scheme,
          palette: unchanged.palette,
          theme: item.theme,
        });
        assert.equal(sha256(text), item.expectedHash);
        const file = path.join(output, `saved-kit-${item.theme}.svg`);
        await writeFile(file, text, { flag: 'wx' });
        item.file = { path: file, sha256: sha256(text) };
      }
      workflow.catalogUpgrade = {
        consumerRoot: output,
        engineModule: actualModule,
        revision: config.revision,
        toneId: snapshot.style.toneId,
        contextBefore,
        contextAfter,
        immutableFiles,
        exports,
        html,
        exportCommands: await json('export-commands.json', exportCommands),
        materializations,
      };
    }
    const executionSha = run('git', ['-C', checkoutRoot, 'rev-parse', 'HEAD']).stdout.trim();
    const commands = await json('commands.json', records);
    const gate = {
      schemaVersion: 1,
      gateId: mode,
      integratedSha: config.integratedSha,
      executionSha,
      command: [
        'node',
        'scripts/probe-integrated-distribution.mjs',
        mode,
        config.configFile ?? '<recorded-config>',
        output,
      ],
      exitCode: 0,
      assertions: GATE_ASSERTIONS[mode].map((id) => ({ id, passed: true })),
      commands,
      workflow,
      limits: [
        'Catalog modification is a deliberate local future-context fixture, not a released package upgrade.',
        'No browser is launched and no visual inspection is claimed.',
      ],
    };
    await json('gate.json', gate);
    return gate;
  } catch (error) {
    await json('commands-failure.json', records);
    await json('failure.json', {
      schemaVersion: 1,
      mode,
      message: error.message,
      integratedSha: config.integratedSha,
    });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, configFile, output] = process.argv.slice(2);
  try {
    assert.ok(
      configFile && output && process.argv.length === 5 && path.isAbsolute(configFile),
      'Usage: node scripts/probe-integrated-distribution.mjs no-browser|installed-catalog-upgrade /absolute/config.json /absolute/new-output',
    );
    console.log(
      JSON.stringify(
        await runDistributionProbe(
          mode,
          { ...JSON.parse(await readFile(configFile, 'utf8')), configFile },
          output,
        ),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
