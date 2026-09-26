import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const base = new URL(process.argv[2] ?? 'https://zudo-diagram-gen.zudolab.dev/');
if (!['http:', 'https:'].includes(base.protocol) || base.pathname !== '/') {
  console.error('Usage: pnpm smoke:cloudflare [http://localhost:8787/ | https://hostname/]');
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
  if (path === '/does-not-exist-cloudflare-smoke' && !body.includes('Page not found')) {
    throw new Error('Unknown URL did not render the generated 404 page.');
  }
  console.log(`${response.status} ${path} ${type}`);
  return response;
}

for (const path of ['/', '/docs/getting-started/', '/tones/', '/examples/', '/workbench/']) {
  await request(path, 200, 'text/html');
}
const clean = await request('/docs/getting-started', 307, null, 'manual');
if (new URL(clean.headers.get('location'), base).pathname !== '/docs/getting-started/') {
  throw new Error('Clean docs URL did not redirect to its canonical trailing-slash path.');
}
await request('/does-not-exist-cloudflare-smoke', 404, 'text/html');
for (const [extension, type] of [
  ['.css', 'text/css'],
  ['.svg', 'image/svg+xml'],
  ['.js', 'javascript'],
]) {
  await request(await findAsset(extension), 200, type);
}
