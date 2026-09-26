import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const args = process.argv.slice(2);
const legacyMode = args[0] === '--legacy';
const baseInput = legacyMode ? args[1] : args[0];
const usage =
  'Usage: pnpm smoke:cloudflare [http://localhost:8787/ | https://hostname/]\n' +
  '       pnpm smoke:cloudflare --legacy https://legacy-hostname/';

if ((legacyMode && args.length !== 2) || (!legacyMode && args.length > 1)) {
  console.error(usage);
  process.exit(2);
}

const defaultBase = 'https://zudo-diagram-gen-doc.zudolab.dev/';
const base = new URL(baseInput ?? defaultBase);
if (!['http:', 'https:'].includes(base.protocol) || base.pathname !== '/') {
  console.error(usage);
  process.exit(2);
}

async function findAsset(extension) {
  const pending = ['dist'];
  while (pending.length) {
    const directory = pending.shift();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && entry.name.endsWith(extension)) {
        return `/${relative('dist', path).split(sep).join('/')}`;
      }
    }
  }
  throw new Error(`No ${extension} asset in dist; run pnpm build first.`);
}

async function request(path, expectedStatus, expectedType, redirect = 'follow') {
  const response = await fetch(new URL(path, base), { redirect });
  const type = response.headers.get('content-type') ?? '';
  if (response.status !== expectedStatus || (expectedType && !type.includes(expectedType))) {
    throw new Error(
      `${path}: expected ${expectedStatus} ${expectedType}, got ${response.status} ${type}`,
    );
  }
  const body = await response.text();
  if (path === '/does-not-exist-cloudflare-smoke' && !body.includes('Page not found.')) {
    throw new Error('Unknown URL did not render the generated zudo-doc 404 page.');
  }
  if (expectedType === 'application/json') {
    try {
      JSON.parse(body);
    } catch {
      throw new Error(`${path}: expected a valid JSON response.`);
    }
  }
  console.log(`${response.status} ${path} ${type}`);
  return response;
}

async function requestAsset(path, expectedType) {
  const deadline = Date.now() + 60_000;
  let waiting = false;
  while (true) {
    try {
      return await request(path, 200, expectedType);
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      if (!waiting) console.log(`Waiting for deployed asset ${path} to become available...`);
      waiting = true;
      await delay(2_000);
    }
  }
}

if (legacyMode) {
  const expectedOrigin = 'https://zudo-diagram-gen-doc.zudolab.dev';
  const redirects = [
    ['/', `${expectedOrigin}/`],
    ['/tones/', `${expectedOrigin}/docs/tones/`],
    ['/examples/project-text/', `${expectedOrigin}/docs/examples/project-text/`],
    ['/docs/getting-started/?q=1', `${expectedOrigin}/docs/getting-started/?q=1`],
  ];

  for (const [path, expectedLocation] of redirects) {
    const response = await fetch(new URL(path, base), { redirect: 'manual' });
    const actualLocation = response.headers.get('location');
    if (
      response.status !== 301 ||
      !actualLocation ||
      new URL(actualLocation, base).href !== expectedLocation
    ) {
      throw new Error(
        `${path}: expected 301 Location ${expectedLocation}, got ${response.status} ${actualLocation}`,
      );
    }
    console.log(`${response.status} ${path} → ${actualLocation}`);
  }
} else {
  for (const path of [
    '/',
    '/docs/getting-started/',
    '/docs/tones/',
    '/docs/examples/',
    '/docs/examples/project-text/',
    '/docs/workbench/',
    '/docs/changelog/',
  ]) {
    await request(path, 200, 'text/html');
  }
  await request('/workbench-data/tone-exploration.json', 200, 'application/json');

  await request('/does-not-exist-cloudflare-smoke', 404, 'text/html');
  for (const [extension, type] of [
    ['.css', 'text/css'],
    ['.svg', 'image/svg+xml'],
    ['.js', 'javascript'],
  ]) {
    await requestAsset(await findAsset(extension), type);
  }
}
