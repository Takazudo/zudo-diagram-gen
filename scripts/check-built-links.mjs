import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';
import { deploymentPaths } from './check-deployed-build.mjs';

/** Check rendered links and IDs, including old public bookmarks and workbench state links. */
export async function checkBuiltLinks(directory, { legacy = [] } = {}) {
  const root = resolve(directory);
  const pages = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith('.html')) pages.push(path);
    }
  }
  await visit(root);
  const window = new Window();
  const documents = new Map();
  for (const page of pages) {
    const doc = new window.DOMParser().parseFromString(await readFile(page, 'utf8'), 'text/html');
    const dataUrl = JSON.parse(
      doc.querySelector('[data-zfb-island="DiagramWorkbench"]')?.getAttribute('data-props') || '{}',
    ).dataUrl;
    documents.set(page, {
      ids: new Set(
        [...doc.querySelectorAll('[id], a[name]')]
          .flatMap((el) => [el.id, el.getAttribute('name')])
          .filter(Boolean),
      ),
      links: [...doc.querySelectorAll('[href], [src]')].flatMap((el) =>
        ['href', 'src'].map((attr) => el.getAttribute(attr)).filter((value) => value !== null),
      ),
      dataUrl,
    });
  }
  await window.happyDOM.close();
  const missing = [];
  let checked = 0;
  let fragments = 0;
  async function check(page, value) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return;
    checked++;
    const report = (reason) => missing.push(`${relative(root, page)}: ${value} (${reason})`);
    let pathname, fragment;
    try {
      const hash = value.indexOf('#');
      pathname = decodeURIComponent((hash < 0 ? value : value.slice(0, hash)).split('?')[0]);
      fragment = hash < 0 ? '' : decodeURIComponent(value.slice(hash + 1));
    } catch {
      report('invalid URL encoding');
      return;
    }
    let target = !pathname
      ? page
      : pathname.startsWith('/')
        ? resolve(root, `.${pathname}`)
        : resolve(dirname(page), pathname);
    if (!target.startsWith(`${root}/`) && target !== root) return report('escapes dist');
    let info = await stat(target).catch(() => null);
    if (info?.isDirectory()) {
      target = join(target, 'index.html');
      info = await stat(target).catch(() => null);
    }
    if (!info?.isFile()) return report('missing file');
    if (!fragment) return;
    fragments++;
    const document = documents.get(target);
    // SVG symbols and non-HTML media fragments belong to their respective formats.
    if (!document || document.ids.has(fragment)) return;
    if (document.dataUrl && fragment.startsWith('candidate=')) {
      const params = new URLSearchParams(fragment);
      const data = JSON.parse(await readFile(join(root, document.dataUrl), 'utf8'));
      if (
        [...params.keys()].every((key) => ['candidate', 'view'].includes(key)) &&
        data.candidates.some((candidate) => candidate.id === params.get('candidate')) &&
        ['inspect', 'compare', 'grid'].includes(params.get('view'))
      )
        return;
    }
    report('missing fragment target');
  }
  for (const [page, document] of documents) {
    for (const value of document.links) await check(page, value);
  }
  for (const { route, headings } of legacy) {
    await check(join(root, 'index.html'), route);
    for (const heading of headings) await check(join(root, 'index.html'), `${route}#${heading}`);
  }
  return { pages: pages.length, checked, fragments, legacy: legacy.length, missing };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = process.argv[2] || 'dist';
  // Exercise the production verifier's parser against the actual minified build in CI.
  const paths = await deploymentPaths(directory);
  for (const path of paths) {
    await readFile(resolve(directory, `.${path}${path.endsWith('/') ? 'index.html' : ''}`));
  }
  console.log(`Validated deployment verifier inputs: ${paths.join(', ')}`);
  const legacy = JSON.parse(
    await readFile(
      new URL('../test/fixtures/documentation-legacy-routes.json', import.meta.url),
      'utf8',
    ),
  );
  const result = await checkBuiltLinks(directory, { legacy });
  if (result.missing.length) {
    console.error(`Broken ${result.missing.length} of ${result.checked} links:`);
    for (const item of result.missing) console.error(item);
    process.exitCode = 1;
  } else
    console.log(
      `Checked ${result.checked} local links, ${result.fragments} fragments, ${result.legacy} legacy routes across ${result.pages} HTML pages: all targets exist.`,
    );
}
