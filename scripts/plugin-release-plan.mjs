import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextVersion, parseVersion } from './plugin-release.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const repo = 'Takazudo/zudo-diagram-gen';
const manifestPath = 'plugins/zudo-diagram-gen/plugin.json';

function run(command, args, directory = root) {
  const result = spawnSync(command, args, {
    cwd: directory,
    encoding: 'utf8',
    timeout: 15000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  if (result.error) throw new Error(`${command} ${args[0]} query failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} query failed: ${result.stderr}`);
  return result.stdout.trim();
}

export function selectRelease({ current, tags, releases, prs }, requested) {
  parseVersion(current);
  if (requested && !['patch', 'minor', 'major'].includes(requested)) parseVersion(requested);
  const explicit = requested && !['patch', 'minor', 'major'].includes(requested);
  const candidates = prs.filter((pr) => pr.head.ref.startsWith('release/plugin-v'));
  if (candidates.length > 1) throw new Error('Multiple release PRs require reconciliation');
  const pr = candidates[0];
  if (pr && (pr.head.repo?.full_name !== repo || pr.base?.ref !== 'main'))
    throw new Error('Release PR must originate in this repository and target main');
  const prVersion = pr?.head.ref.slice('release/plugin-v'.length);
  if (prVersion) parseVersion(prVersion);
  const tagged = Object.keys(tags).map((tag) => {
    if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`Unrelated tag: ${tag}`);
    parseVersion(tag.slice(1));
    return tag.slice(1);
  });
  const compare = (a, b) => {
    const aa = parseVersion(a),
      bb = parseVersion(b);
    const index = aa.findIndex((part, i) => part !== bb[i]);
    return index < 0 ? 0 : aa[index] > bb[index] ? 1 : -1;
  };
  tagged.sort(compare);
  const latest = tagged.at(-1);
  if (latest && compare(current, latest) < 0 && !explicit)
    throw new Error('Manifest is behind remote release history');
  const version = explicit
    ? requested
    : requested
      ? nextVersion(current, requested)
      : (prVersion ?? (!latest || compare(current, latest) > 0 ? current : nextVersion(current)));
  const tag = `v${version}`;
  const release = releases.find((item) => item.tag_name === tag);
  if (prVersion && prVersion !== version) throw new Error('Another release PR is in progress');
  if (tags[tag] && !explicit)
    throw new Error('Existing tag requires an explicit same-version retry');
  if (release && !tags[tag]) throw new Error('Release exists without its remote tag');
  if (latest && !tags[tag] && compare(version, latest) <= 0)
    throw new Error('Release would downgrade history');
  if (!tags[tag] && compare(version, current) < 0)
    throw new Error('Release would downgrade manifest');
  const newerPublished = releases.some((item) => {
    if (item.draft) return false;
    if (!/^v\d+\.\d+\.\d+$/.test(item.tag_name))
      throw new Error('Published release has an unsupported version tag');
    return compare(item.tag_name.slice(1), version) > 0;
  });
  return {
    version,
    tag,
    makeLatest: !newerPublished,
    mode: tags[tag] ? 'resume-tag' : pr ? 'resume-pr' : 'new',
    commit: tags[tag]?.commit ?? pr?.head.sha ?? null,
    state: release ? (release.draft ? 'draft' : 'published') : 'absent',
    assets: release?.assets?.map((asset) => asset.name) ?? [],
    pr: pr?.number ?? null,
  };
}

export function releaseAssetPlan(expected, actual, published = false) {
  for (const [name, bytes] of Object.entries(actual)) {
    if (!expected[name] || !Buffer.from(bytes).equals(Buffer.from(expected[name])))
      throw new Error(`Conflicting release asset: ${name}`);
  }
  const missing = Object.keys(expected).filter((name) => !Object.hasOwn(actual, name));
  if (published && missing.length) throw new Error('Published release has missing assets');
  return { missing, complete: missing.length === 0 };
}

export function planRelease(requested, options = {}) {
  const read = options.query ?? ((command, args) => run(command, args, options.cwd ?? root));
  const origin = read('git', ['remote', 'get-url', 'origin']);
  if (
    !/^https:\/\/github\.com\/Takazudo\/zudo-diagram-gen(?:\.git)?$|^git@github\.com:Takazudo\/zudo-diagram-gen(?:\.git)?$/.test(
      origin,
    )
  )
    throw new Error('Unexpected origin');
  if (read('git', ['status', '--porcelain']))
    throw new Error('Release planning requires a clean tree');
  const lines = read('git', ['ls-remote', 'origin', 'refs/heads/main', 'refs/tags/*']).split('\n');
  const refs = Object.fromEntries(lines.filter(Boolean).map((line) => line.split(/\s+/).reverse()));
  const main = refs['refs/heads/main'];
  if (!main) throw new Error('Remote main is missing');
  const tags = {};
  for (const [ref, object] of Object.entries(refs)) {
    if (!ref.startsWith('refs/tags/') || ref.endsWith('^{}')) continue;
    const tag = ref.slice('refs/tags/'.length);
    const commit = refs[`${ref}^{}`];
    if (!commit) throw new Error(`Remote tag must be annotated: ${tag}`);
    tags[tag] = { object, commit };
  }
  // Successful paginated lists distinguish absence from authentication/network failure.
  const query = (endpoint) =>
    JSON.parse(read('gh', ['api', '--paginate', '--slurp', `repos/${repo}/${endpoint}`])).flat();
  const releases = query('releases?per_page=100');
  const prs = query('pulls?state=open&per_page=100');
  const manifestAt = (sha) => {
    try {
      return JSON.parse(read('git', ['show', `${sha}:${manifestPath}`])).version;
    } catch {
      throw new Error(`Insufficient local history for ${sha}; fetch explicitly outside dry-run`);
    }
  };
  const plan = selectRelease({ current: manifestAt(main), tags, releases, prs }, requested);
  const commit = plan.commit ?? main;
  if (plan.mode !== 'new' && manifestAt(commit) !== plan.version)
    throw new Error('Original release commit manifest does not match version');
  if (plan.mode === 'resume-tag') {
    const local = read('git', ['rev-parse', `refs/tags/${plan.tag}`]);
    if (local !== tags[plan.tag].object) throw new Error('Local and remote tag objects differ');
    if (read('git', ['cat-file', '-t', local]) !== 'tag') throw new Error('Expected annotated tag');
  }
  return {
    ...plan,
    commit,
    main,
    sourceVersion: manifestAt(commit),
    note: 'Plan only: assets and original commit CI still require verification; main merge may deploy.',
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  try {
    if (args.length > 1)
      throw new Error('Usage: node scripts/plugin-release-plan.mjs [patch|minor|major|X.Y.Z]');
    console.log(JSON.stringify(planRelease(args[0]), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
