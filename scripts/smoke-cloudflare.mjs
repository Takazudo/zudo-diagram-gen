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

function referencedAsset(html, extension, prefix) {
  for (const match of html.matchAll(/\b(?:href|src)=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g)) {
    const value = (match[1] || match[2] || match[3]).replace(/&amp;/g, '&');
    const url = new URL(value, base);
    if (
      url.origin === base.origin &&
      url.pathname.startsWith(prefix) &&
      url.pathname.endsWith(extension)
    )
      return `${url.pathname}${url.search}`;
  }
  throw new Error(`No referenced ${extension} asset under ${prefix} on the deployed page.`);
}

async function fetchWithDnsRetry(url, options) {
  const deadline = Date.now() + 120_000;
  let waiting = false;
  while (true) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (!['ENOTFOUND', 'EAI_AGAIN'].includes(error.cause?.code) || Date.now() >= deadline)
        throw error;
      if (!waiting) console.log(`Waiting for ${url.hostname} DNS to become available...`);
      waiting = true;
      await delay(2_000);
    }
  }
}

async function request(path, expectedStatus, expectedType, redirect = 'follow') {
  const response = await fetchWithDnsRetry(new URL(path, base), { redirect });
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
  return body;
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
    const response = await fetchWithDnsRetry(new URL(path, base), { redirect: 'manual' });
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
  let homeHtml = '';
  let examplesHtml = '';
  let workbenchHtml = '';
  for (const path of [
    '/',
    '/docs/getting-started/',
    '/docs/tones/',
    '/docs/examples/',
    '/docs/examples/project-text/',
    '/docs/workbench/',
    '/docs/changelog/',
  ]) {
    const html = await request(path, 200, 'text/html');
    if (path === '/') homeHtml = html;
    if (path === '/docs/examples/') examplesHtml = html;
    if (path === '/docs/workbench/') workbenchHtml = html;
  }
  await request('/workbench-data/tone-exploration.json', 200, 'application/json');

  await request('/does-not-exist-cloudflare-smoke', 404, 'text/html');
  for (const [html, extension, prefix, type] of [
    [homeHtml, '.css', '/assets/', 'text/css'],
    [examplesHtml, '.svg', '/previews/', 'image/svg+xml'],
    [workbenchHtml, '.js', '/assets/', 'javascript'],
  ]) {
    await requestAsset(referencedAsset(html, extension, prefix), type);
  }
}
