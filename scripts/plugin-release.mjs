import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  utimes,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifestPath = path.join(root, 'plugins/zudo-diagram-gen/plugin.json');
const name = 'zudo-diagram-gen';
const epoch = new Date('2000-01-01T00:00:00Z');

// The portable plugin contract currently accepts stable versions only.
export function parseVersion(version) {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Expected a stable X.Y.Z version, received: ${version}`);
  }
  return version.split('.').map(BigInt);
}

export function nextVersion(current, mode = 'patch') {
  const parts = parseVersion(current);
  const index = ['major', 'minor', 'patch'].indexOf(mode);
  const target =
    index < 0
      ? parseVersion(mode)
      : parts.map((value, i) => (i < index ? value : i === index ? value + 1n : 0n));
  const firstDifference = target.findIndex((value, i) => value !== parts[i]);
  if (firstDifference < 0 || target[firstDifference] < parts[firstDifference]) {
    throw new Error('The new plugin version must be greater than the current version');
  }
  return target.join('.');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

async function version() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.name !== name) throw new Error('Unexpected plugin identity');
  parseVersion(manifest.version);
  return manifest.version;
}

async function walk(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (/[\r\n]/.test(relative) || entry.isSymbolicLink())
      throw new Error(`Unsafe ZIP entry: ${relative}`);
    if (entry.isDirectory())
      result.push(...(await walk(path.join(directory, entry.name), relative)));
    else if (entry.isFile()) result.push(relative);
    else throw new Error(`Not a regular file: ${relative}`);
  }
  return result.sort();
}

export async function packRelease(tag) {
  const current = await version();
  // Reject mismatches before creating or replacing any release output.
  if (tag !== undefined && tag !== `v${current}`)
    throw new Error('Tag and plugin manifest version differ');
  const commit = run('git', ['rev-parse', 'HEAD']);
  if (tag !== undefined && run('git', ['cat-file', '-t', `refs/tags/${tag}`]) !== 'tag')
    throw new Error('Release packaging requires an annotated tag');
  if (tag !== undefined && run('git', ['rev-parse', `refs/tags/${tag}^{commit}`]) !== commit) {
    throw new Error('Release tag does not point at the checked-out commit');
  }
  if (tag !== undefined && run('git', ['status', '--porcelain'])) {
    throw new Error('Tagged release packaging requires a clean working tree');
  }
  const { assemblePlugin, validatePlugin } = await import('./plugin-pack.mjs');
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'zudo-plugin-release-'));
  const output = path.join(root, 'artifacts/release');
  try {
    const directory = path.join(temporary, name);
    const result = await assemblePlugin(directory, { quiet: true });
    const entries = await walk(directory);
    // Stable entry order, permissions and UTC timestamps avoid local rebuild drift.
    for (const relative of entries) {
      const absolute = path.join(directory, relative);
      await chmod(absolute, 0o644);
      await utimes(absolute, epoch, epoch);
    }
    const basename = `${name}-v${current}.zip`;
    const archive = path.join(temporary, basename);
    run('zip', ['-q', '-X', archive, '-@'], {
      cwd: temporary,
      input: `${entries.map((relative) => `${name}/${relative}`).join('\n')}\n`,
      env: { ...process.env, TZ: 'UTC' },
    });
    run('unzip', ['-tq', archive]);
    const extracted = path.join(temporary, 'extracted');
    run('unzip', ['-q', archive, '-d', extracted]);
    const verified = await validatePlugin(path.join(extracted, name));
    const extractedManifest = JSON.parse(
      await readFile(path.join(extracted, name, 'plugin.json'), 'utf8'),
    );
    if (extractedManifest.version !== current || verified.inventoryHash !== result.inventoryHash) {
      throw new Error('Fresh ZIP extraction does not match the assembled plugin');
    }
    // Publish output only after the actual ZIP has passed extraction and validation.
    await mkdir(output, { recursive: true });
    await copyFile(archive, path.join(output, basename));
    await copyFile(archive, path.join(output, `${name}.zip`));
    const hash = createHash('sha256')
      .update(await readFile(archive))
      .digest('hex');
    await writeFile(
      path.join(output, 'SHA256SUMS'),
      `${hash}  ${basename}\n${hash}  ${name}.zip\n`,
    );
    return {
      version: current,
      tag: tag ?? null,
      commit,
      archive: path.join(output, basename),
      sha256: hash,
      ...verified,
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function main(args) {
  const [command, ...rest] = args;
  if (command === 'version' && rest.length === 0) return console.log(await version());
  if (command === 'bump') {
    const dryRun = rest.includes('--dry-run');
    const modes = rest.filter((arg) => arg !== '--dry-run');
    if (modes.length > 1 || rest.filter((arg) => arg === '--dry-run').length > 1)
      throw new Error('Invalid bump arguments');
    const current = await version();
    const next = nextVersion(current, modes[0]);
    if (!dryRun) {
      const content = await readFile(manifestPath, 'utf8');
      const updated = content.replace(
        /("version"\s*:\s*")[^"]+("\s*[,}])/,
        (_match, prefix, suffix) => `${prefix}${next}${suffix}`,
      );
      if (JSON.parse(updated).version !== next) throw new Error('Could not update plugin version');
      await writeFile(manifestPath, updated);
    }
    return console.log(`${current} -> ${next}${dryRun ? ' (dry run)' : ''}`);
  }
  if (command === 'pack' && (rest.length === 0 || (rest.length === 2 && rest[0] === '--tag'))) {
    return console.log(JSON.stringify(await packRelease(rest[1]), null, 2));
  }
  throw new Error(
    'Usage: node scripts/plugin-release.mjs version | bump [patch|minor|major|X.Y.Z] [--dry-run] | pack [--tag vX.Y.Z]',
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
