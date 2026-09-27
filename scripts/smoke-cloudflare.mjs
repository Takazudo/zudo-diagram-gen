import { setTimeout as delay } from 'node:timers/promises';

const args = process.argv.slice(2);
const redirectsMode = args[0] === '--redirects';
const baseInput = redirectsMode ? args[1] : args[0];
const usage =
  'Usage: pnpm smoke:cloudflare [http://localhost:8787/ | https://hostname/]\n' +
  '       pnpm smoke:cloudflare --redirects [https://zudo-diagram-gen.zudolab.dev/]';

if ((redirectsMode && args.length > 2) || (!redirectsMode && args.length > 1)) {
  console.error(usage);
  process.exit(2);
}

const defaultBase = 'https://zudo-diagram-gen.zudolab.dev/';
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

if (redirectsMode) {
  const redirects = [
    ['/tones', '/docs/tones/'],
    ['/tones/', '/docs/tones/'],
    ['/examples', '/docs/examples/'],
    ['/examples/', '/docs/examples/'],
    ['/examples/project-text', '/docs/examples/project-text/'],
    ['/examples/project-text/', '/docs/examples/project-text/'],
    ['/workbench', '/docs/workbench/'],
    ['/workbench/', '/docs/workbench/'],
    ['/examples/project-text?view=full', '/docs/examples/project-text/?view=full'],
  ];

  for (const [path, targetPath] of redirects) {
    const requestedUrl = new URL(path, base);
    const expectedUrl = new URL(requestedUrl);
    expectedUrl.pathname = targetPath.split('?')[0];
    expectedUrl.search = new URL(targetPath, base).search;
    expectedUrl.hash = '';
    const response = await fetchWithDnsRetry(requestedUrl, { redirect: 'manual' });
    const actualLocation = response.headers.get('location');
    if (
      response.status !== 301 ||
      !actualLocation ||
      new URL(actualLocation, base).href !== expectedUrl.href
    ) {
      throw new Error(
        `${path}: expected 301 Location ${expectedUrl.href}, got ${response.status} ${actualLocation}`,
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
