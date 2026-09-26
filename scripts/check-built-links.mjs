import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';

const root = resolve(process.argv[2] || 'dist');
const pages = [];
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await visit(path);
    else if (entry.isFile() && entry.name.endsWith('.html')) pages.push(path);
  }
}
await visit(root);
const missing = [];
let checked = 0;
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const markup = html.replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  for (const match of markup.matchAll(/\b(?:href|src)=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g)) {
    const value = (match[1] || match[2] || match[3]).replace(/&amp;/g, '&');
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) continue;
    const pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]);
    if (!pathname) continue;
    const target = pathname.startsWith('/') ? resolve(root, `.${pathname}`) : resolve(dirname(page), pathname);
    if (!target.startsWith(`${root}/`) && target !== root) {
      missing.push(`${page}: ${value} escapes dist`);
      continue;
    }
    checked++;
    const info = await stat(target).catch(() => null);
    if (info?.isFile()) continue;
    if (info?.isDirectory() && (await stat(join(target, 'index.html')).catch(() => null))?.isFile()) continue;
    missing.push(`${page}: ${value}`);
  }
}
if (missing.length) {
  console.error(`Missing ${missing.length} of ${checked} local links across ${pages.length} HTML pages:`);
  for (const item of missing.slice(0, 30)) console.error(item);
  process.exitCode = 1;
} else console.log(`Checked ${checked} local links across ${pages.length} HTML pages: all targets exist.`);
