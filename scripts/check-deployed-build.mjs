import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function assertBuiltFile(pathname, actual, directory = 'dist') {
  const root = resolve(directory);
  assert.ok(pathname.startsWith('/') && !pathname.startsWith('//'), 'Expected a local path');
  const file = resolve(root, `.${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`);
  assert.ok(file.startsWith(root + sep), 'Build path must stay inside its directory');
  const expected = await readFile(file);
  assert.equal(hash(actual), hash(expected), `${pathname}: deployed bytes do not match this build`);
  return hash(expected);
}

async function verifyDeployment() {
  const base = new URL('https://zudo-diagram-gen.zudolab.dev/');
  const home = await readFile('dist/index.html', 'utf8');
  const styles = [...home.matchAll(/href="(\/assets\/[^"?#]+\.css)"/g)].map((match) => match[1]);
  assert.ok(styles.length > 0, 'The built homepage must reference a stylesheet');
  const paths = [
    '/',
    '/docs/getting-started/',
    '/docs/guides/',
    '/docs/reference/',
    '/docs/examples/',
    ...new Set(styles),
  ];
  for (const path of paths) {
    const deadline = Date.now() + 60_000;
    let waiting = false;
    while (true) {
      try {
        const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15_000) });
        assert.equal(response.status, 200, path);
        const digest = await assertBuiltFile(path, Buffer.from(await response.arrayBuffer()));
        console.log(`Verified deployed build: ${path} sha256:${digest}`);
        break;
      } catch (error) {
        if (Date.now() >= deadline) throw error;
        if (!waiting) console.log(`Waiting for the current build at ${path}...`);
        waiting = true;
        await delay(2_000);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await verifyDeployment();
}
