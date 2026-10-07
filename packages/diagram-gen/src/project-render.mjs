import { createDocumentPage, createPageSource, escapeHtml } from './render.mjs';

export function projectOverview(data, route = (id) => `/sessions/${encodeURIComponent(id)}/`) {
  return `<main style="font-family:system-ui;max-width:70rem;margin:2rem auto;padding:1rem"><h1>${escapeHtml(data.project.title)}</h1><p>Project ${escapeHtml(data.project.id)} · ${data.ok ? 'Current' : 'Incomplete or stale'}</p><ul>${data.sessions.map((entry) => `<li><a href="${escapeHtml(route(entry.id))}">${escapeHtml(entry.data?.session.title ?? entry.id)}</a> — <strong>${entry.status}</strong>${entry.status === 'stale' ? ' (retained last-valid content)' : ''}<ul>${entry.diagnostics.map((item) => `<li>${escapeHtml(item.message)}</li>`).join('')}</ul></li>`).join('')}</ul><h2>Diagnostics</h2><ul>${data.diagnostics.map((item) => `<li>${escapeHtml(item.sessionId ?? 'Project')}: ${escapeHtml(item.path)} — ${escapeHtml(item.message)}</li>`).join('')}</ul><p>Comparison sets: ${data.comparisonSets.length}. Individual session review preserves existing session storage and imports.</p></main>`;
}
export async function projectRoutes(data, zfbMajor) {
  const pages = new Map([['pages/index.tsx', await createPageSource(data, {}, zfbMajor)]]);
  for (const entry of data.sessions) {
    let source;
    if (entry.data) {
      source = await createPageSource(entry.data, {}, zfbMajor);
      // Visible stale status precedes the existing isolated session application.
      if (entry.status !== 'valid') {
        const banner = `<aside role="alert" style="background:#fff2c5;color:#3a2600;padding:1rem">STALE: retained last-valid content. ${escapeHtml(entry.diagnostics.map((item) => item.message).join(' '))}</aside>`;
        // Both dialects emit a JSON string containing the HTML body.
        source = source.replace(
          /const body = (.*);\n/,
          (_match, literal) => `const body = ${JSON.stringify(banner + JSON.parse(literal))};\n`,
        );
      }
    } else
      source = createDocumentPage(
        `<main><h1>${escapeHtml(entry.id)}</h1><p role="alert">${entry.status.toUpperCase()}: no valid session snapshot is available.</p><ul>${entry.diagnostics.map((item) => `<li>${escapeHtml(item.message)}</li>`).join('')}</ul><a href="/">Project overview</a></main>`,
        entry.id,
        zfbMajor,
      );
    pages.set(`pages/sessions/${entry.id}/index.tsx`, source);
  }
  return pages;
}
