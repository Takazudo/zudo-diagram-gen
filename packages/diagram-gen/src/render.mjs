import { preparePortableProject, PROJECT_HTML_LIMIT } from './portable-project.mjs';
import { readFile } from 'node:fs/promises';

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const scriptJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

// Self-contained documents must not trigger a server-only /favicon.ico request.
const favicon = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#23272e"/><path d="M8 8h7v7H8zm9 9h7v7h-7zM17 8h7v7h-7zM8 17h7v7H8z" fill="#ffffff"/></svg>')}`;

// zfb rawHtml reserves boundary marker spellings even inside script JSON.
// Encode only their JSON representation; parsing restores the exact user text.
const zfbScriptJson = (value) =>
  scriptJson(value).replace(
    /data-zfb-island|zr:1:/gi,
    (marker) => `\\u${marker.charCodeAt(0).toString(16).padStart(4, '0')}${marker.slice(1)}`,
  );

async function galleryBody(data, options, serialize = scriptJson) {
  const [css, js] = await Promise.all([
    readFile(new URL('../client/app.css', import.meta.url), 'utf8'),
    readFile(new URL('../client/app.js', import.meta.url), 'utf8'),
  ]);
  if (data.kind === 'project') data = preparePortableProject(data);
  const payload = { ...data, links: { ...(data.links || {}), ...options } };
  if (data.kind === 'project' && Buffer.byteLength(serialize(payload)) > PROJECT_HTML_LIMIT)
    throw new Error('Project HTML exceeds the 64 MiB output-data budget.');
  const fallbackText = (value) => {
    const text = escapeHtml(value);
    return serialize === zfbScriptJson
      ? text.replace(
          /data-zfb-island|zr:1:/gi,
          (marker) => `&#${marker.charCodeAt(0)};${marker.slice(1)}`,
        )
      : text;
  };
  const fallback =
    data.kind === 'project'
      ? `<main><h1>${fallbackText(data.project.title)}</h1><p>JavaScript is required for comparison and review.</p><ul>${data.sessions.map((session) => `<li>${payload.links.sessionRoutes === false ? fallbackText(session.data?.session.title ?? session.id) : `<a href="/sessions/${encodeURIComponent(session.id)}/">${fallbackText(session.data?.session.title ?? session.id)}</a>`} — ${escapeHtml(session.status)}</li>`).join('')}</ul></main>`
      : 'This diagram workbench requires JavaScript. The SVG source files remain available in the session directory.';
  return `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>\n<div id="diagram-app"></div>\n<noscript>${fallback}</noscript>\n<script id="diagram-data" type="application/json">${serialize(payload)}</script>\n<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`;
}

/** Embed package-owned assets so generated pages and exports have identical behavior. */
export async function renderZfbGallery(data, options = {}) {
  return galleryBody(data, options);
}

export async function renderGallery(data, options = {}) {
  const title =
    options.title || (data.kind === 'project' ? data.project.title : data.session.title);
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><link rel="icon" href="${favicon}"><title>${escapeHtml(title)} · zudo-diagram-gen</title></head><body style="margin:0">${await renderZfbGallery(data, data.kind === 'project' ? { sessionRoutes: false, ...options } : options)}</body></html>\n`;
}

/** Generates a route for the consumer renderer from validated data; Node I/O stays outside zfb's SSR graph. */
export async function createPageSource(data, options = {}, zfbMajor = 2) {
  if (![2, 3, 4].includes(zfbMajor))
    throw new Error(`Unsupported zfb major: ${zfbMajor}. Expected 2, 3 or 4.`);
  const html = await galleryBody(data, options, zfbMajor >= 3 ? zfbScriptJson : scriptJson);
  return createDocumentPage(
    html,
    data.kind === 'project' ? data.project.title : data.session.title,
    zfbMajor,
  );
}

export function createDocumentPage(html, title, zfbMajor = 2) {
  if (![2, 3, 4].includes(zfbMajor)) throw new Error('Expected zfb 2, 3 or 4.');
  const pragma =
    zfbMajor === 2 ? '/** @jsxRuntime automatic */\n/** @jsxImportSource preact */\n' : '';
  const charset = zfbMajor === 2 ? 'charSet' : 'charset';
  // v2 supplied this document typography through its default preflight.
  // Keep the no-JavaScript fallback unchanged without resetting the scoped UI.
  const bodyStyle =
    zfbMajor === 2
      ? '{margin:0}'
      : JSON.stringify({
          margin: 0,
          'font-family':
            'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          'line-height': '1.5',
        });
  const bodyAttribute =
    zfbMajor === 2 ? 'dangerouslySetInnerHTML={{__html: body}}' : 'rawHtml={body}';
  return `// Generated by zudo-diagram-gen. Edit session files, not this route.\n${pragma}const body = ${JSON.stringify(html)};\nexport const frontmatter = {title: ${JSON.stringify(title)}};\nexport default function DiagramGalleryPage() {\n  return <html lang="en"><head><meta ${charset}="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light dark"/><link rel="icon" href=${JSON.stringify(favicon)}/><title>{frontmatter.title} · zudo-diagram-gen</title></head><body style={${bodyStyle}} ${bodyAttribute}/></html>;\n}\n`;
}

export { escapeHtml, scriptJson };
