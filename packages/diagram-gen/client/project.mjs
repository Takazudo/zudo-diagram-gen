import { mountDiagramApp } from './mount.mjs';
import { validatePlacement, renderPlacement } from './placement.mjs';
import { validateProjectReview } from './review.mjs';

const projectEscape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/** Resolve only declared, exact session-qualified identities. No tone inference. */
export function comparisonSlot(data, set, session, theme = 'light') {
  const entries = set?.entries.filter((entry) => entry.sessionId === session.id) ?? [];
  if (!set) return { status: 'missing', message: 'Choose an explicit comparison set.' };
  if (!entries.length) return { status: 'missing', message: 'Missing comparison coverage.' };
  if (entries.length !== 1) return { status: 'invalid', message: 'Duplicate comparison mapping.' };
  const entry = entries[0];
  const candidate = session.data?.candidates.find((item) => item.id === entry.candidateId);
  const identity = `${session.id}/${entry.candidateId}`;
  if (!candidate)
    return {
      status: session.status === 'valid' ? 'missing' : session.status,
      message: 'Exact candidate unavailable.',
      identity,
      entry,
    };
  if (candidate.toneId !== set.toneId)
    return {
      status: 'invalid',
      message: 'Declared tone does not match the exact candidate.',
      identity,
      entry,
    };
  if (entry.status === 'invalid')
    return { status: 'invalid', message: 'Invalid comparison mapping.', identity, entry };
  if (
    candidate.fingerprint !== entry.fingerprint ||
    session.status !== 'valid' ||
    entry.status === 'stale'
  )
    return {
      status: 'stale',
      message: 'Stale mapping or retained session. Current artwork is not substituted.',
      identity,
      entry,
    };
  if (!candidate.assets[theme])
    return {
      status: 'unavailable',
      message: `${theme} artwork unavailable.`,
      identity,
      entry,
      candidate,
    };
  return { status: 'valid', message: 'Exact mapping', identity, entry, candidate };
}

/** One project context, with ordinary session workbenches retained until disposal. */
export function mountProjectApp(root, data, options = {}) {
  if (!root || root.dataset.diagramReady === 'true') return () => {};
  const document = root.ownerDocument,
    window = document.defaultView;
  root.dataset.diagramReady = 'true';
  root.classList.add('dg-app', 'dg-project');
  if (options.embedded) root.dataset.embedded = 'true';
  const sessions = [...data.sessions].sort(
    (a, b) =>
      (data.project.sessions.find((s) => s.id === a.id)?.order ?? 0) -
      (data.project.sessions.find((s) => s.id === b.id)?.order ?? 0),
  );
  const state = { setId: '', theme: 'light', backdrop: 'auto', uiTheme: 'light' };
  const hostTheme = () =>
    document.documentElement.dataset.theme === 'dark' ||
    (document.documentElement.dataset.theme !== 'light' &&
      document.documentElement.classList.contains('dark'))
      ? 'dark'
      : 'light';
  const controllers = new Map(),
    disposers = [],
    urls = new Set(),
    timers = new Set();
  let disposed = false;
  root.innerHTML =
    '<div data-project-overview></div><section data-project-session hidden><button type="button" data-project-back>Project overview</button><p data-project-session-status></p><div data-project-workbenches></div></section><p role="status" aria-live="polite" data-project-status></p><input type="file" accept="application/json,.json" data-project-import hidden>';
  const overview = root.querySelector('[data-project-overview]'),
    detail = root.querySelector('[data-project-session]'),
    status = root.querySelector('[data-project-status]');
  const workbenches = root.querySelector('[data-project-workbenches]');
  for (const session of sessions) {
    if (!session.data) continue;
    const element = document.createElement('div');
    element.hidden = true;
    element.dataset.projectWorkbench = session.id;
    workbenches.append(element);
    const dispose = mountDiagramApp(element, session.data, {
      embedded: options.embedded,
      history: false,
      onReady: (api) => controllers.set(session.id, { api, element }),
    });
    disposers.push(dispose);
  }
  const display = () => {
    root.dataset.uiTheme = options.embedded ? hostTheme() : state.uiTheme;
    root.dataset.diagramTheme = state.theme;
    root.dataset.backdrop = state.backdrop;
  };
  const render = () => {
    const focus = document.activeElement?.dataset.projectControl;
    display();
    const set = data.comparisonSets.find((item) => item.id === state.setId);
    overview.innerHTML = `<main class="dg-project-main"><h1>${projectEscape(data.project.title)}</h1><p>Project ${projectEscape(data.project.id)} · ${data.ok ? 'Current' : 'Incomplete or stale'}</p><p>Comparison browsing preserves chosen drawings and feedback. Style reference: ${projectEscape(data.project.style?.revision ?? 'none')}</p><div class="dg-project-controls"><label>Comparison set <select data-project-control="set"><option value="">Choose an explicit comparison set</option>${data.comparisonSets.map((item) => `<option value="${projectEscape(item.id)}"${state.setId === item.id ? ' selected' : ''}>${projectEscape(item.title)} · ${projectEscape(item.toneId)}</option>`).join('')}</select></label><label>Artwork theme <select data-project-control="theme">${['light', 'dark'].map((v) => `<option${state.theme === v ? ' selected' : ''}>${v}</option>`).join('')}</select></label><label>Backdrop <select data-project-control="backdrop">${['auto', 'paper', 'ink', 'checker'].map((v) => `<option${state.backdrop === v ? ' selected' : ''}>${v}</option>`).join('')}</select></label>${options.embedded ? '' : `<label>Host UI theme <select data-project-control="uiTheme">${['light', 'dark'].map((v) => `<option${state.uiTheme === v ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`}<button type="button" data-project-action="copy">Copy project review</button><button type="button" data-project-action="download">Download project review</button><button type="button" data-project-action="import">Import project review</button></div><div class="dg-project-grid">${sessions
      .map((session) => {
        const slot = comparisonSlot(data, set, session, state.theme);
        let artwork = '';
        if (session.data) {
          const placement = validatePlacement(
            session.data.placement,
            session.data.session.target,
            state.theme,
          );
          const frame = renderPlacement(placement, {
            svgUrl:
              slot.status === 'valid'
                ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(slot.candidate.assets[state.theme])}`
                : undefined,
            title: slot.identity,
            images: session.data.placementImages ?? [],
          }).replace(
            '<span data-placement-unavailable>Theme unavailable</span>',
            `<span data-placement-unavailable>${projectEscape(slot.message)}</span>`,
          );
          artwork = `<div class="dg-project-frame-scroll">${frame}</div><p>Frame ${placement.frame.width} × ${placement.frame.height}; slot ${placement.slot.x}, ${placement.slot.y}, ${placement.slot.width} × ${placement.slot.height}</p>`;
        }
        return `<article class="dg-project-card" data-project-slot="${projectEscape(session.id)}" data-status="${projectEscape(slot.status)}"><h2>${projectEscape(session.data?.session.title ?? session.id)}</h2><p>Session <code>${projectEscape(session.id)}</code> · ${projectEscape(session.status)}</p><p data-project-identity>${projectEscape(slot.identity ?? 'No candidate mapping')}</p>${slot.entry ? `<p class="dg-project-fingerprint">Expected fingerprint <code>${projectEscape(slot.entry.fingerprint)}</code></p>` : ''}<p role="status">${projectEscape(slot.status)}: ${projectEscape(slot.message)}</p>${artwork}${session.data ? `<button type="button" data-project-open="${projectEscape(session.id)}"${slot.status === 'valid' || slot.status === 'unavailable' ? ` data-project-candidate="${projectEscape(slot.candidate.id)}"` : ''}>${slot.status === 'valid' || slot.status === 'unavailable' ? 'Inspect exact candidate' : 'Open session workbench'}</button>` : ''}${data.links?.sessionRoutes === false ? '' : `<a href="/sessions/${encodeURIComponent(session.id)}/">Session route</a>`}<ul>${session.diagnostics.map((item) => `<li>${projectEscape(item.message)}</li>`).join('')}</ul></article>`;
      })
      .join(
        '',
      )}</div><details${data.diagnostics.length ? ' open' : ''}><summary>Project diagnostics (${data.diagnostics.length})</summary><ul>${data.diagnostics.map((item) => `<li>${projectEscape(item.sessionId ?? 'Project')}: ${projectEscape(item.path)} — ${projectEscape(item.message)}</li>`).join('')}</ul></details></main>`;
    if (focus) overview.querySelector(`[data-project-control="${focus}"]`)?.focus();
  };
  const review = () => ({
    schemaVersion: 1,
    type: 'zudo-diagram-project-review',
    projectId: data.project.id,
    sessions: sessions
      .filter((s) => controllers.has(s.id))
      .map((s) => controllers.get(s.id).api.getReview()),
  });
  const download = (text, type, name) => {
    const url = window.URL.createObjectURL(new window.Blob([text], { type }));
    urls.add(url);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      urls.delete(url);
      window.URL.revokeObjectURL(url);
    }, 1000);
    timers.add(timer);
  };
  const click = async (event) => {
    const button = event.target.closest(
      '[data-project-open], [data-project-back], [data-project-action]',
    );
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-project-open')) {
      const session = sessions.find((s) => s.id === button.dataset.projectOpen);
      const controller = controllers.get(session.id);
      for (const { element } of controllers.values()) element.hidden = true;
      controller.element.hidden = false;
      controller.api.setDisplay(state);
      if (button.dataset.projectCandidate) controller.api.inspect(button.dataset.projectCandidate);
      root.querySelector('[data-project-session-status]').textContent =
        `Session ${session.id}: ${session.status}${session.status === 'stale' ? ' — retained last-valid content' : ''}`;
      overview.hidden = true;
      detail.hidden = false;
      root.querySelector('[data-project-back]').focus();
    } else if (button.hasAttribute('data-project-back')) {
      detail.hidden = true;
      overview.hidden = false;
      render();
      overview.querySelector('[data-project-control="set"]').focus();
    } else if (button.dataset.projectAction === 'import')
      root.querySelector('[data-project-import]').click();
    else {
      const text = JSON.stringify(review(), null, 2) + '\n';
      try {
        if (button.dataset.projectAction === 'copy' && window.navigator.clipboard?.writeText) {
          await window.navigator.clipboard.writeText(text);
          if (!disposed) status.textContent = 'Project review copied.';
        } else {
          download(text, 'application/json', `${data.project.id}-review.json`);
          status.textContent = 'Project review downloaded.';
        }
      } catch {
        if (!disposed) {
          download(text, 'application/json', `${data.project.id}-review.json`);
          status.textContent = 'Clipboard unavailable. Project review downloaded.';
        }
      }
    }
  };
  const change = async (event) => {
    const control = event.target.dataset.projectControl;
    if (control && Object.hasOwn(state, control === 'set' ? 'setId' : control)) {
      state[control === 'set' ? 'setId' : control] = event.target.value;
      render();
    }
    if (event.target.hasAttribute('data-project-import')) {
      const file = event.target.files?.[0];
      event.target.value = '';
      try {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) throw new Error('Review files must be smaller than 2 MB.');
        const record = validateProjectReview(JSON.parse(await file.text()), data);
        if (disposed) return;
        for (const session of record.sessions)
          controllers.get(session.sessionId).api.importReview(session);
        status.textContent = 'Project review imported. Stale fingerprints remain visible.';
      } catch (error) {
        if (!disposed) status.textContent = `Import failed: ${error.message}`;
      }
    }
  };
  root.addEventListener('click', click);
  root.addEventListener('change', change);
  const observer = options.embedded ? new window.MutationObserver(display) : null;
  observer?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
  render();
  return () => {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', click);
    root.removeEventListener('change', change);
    observer?.disconnect();
    disposers.forEach((dispose) => dispose());
    timers.forEach((timer) => window.clearTimeout(timer));
    urls.forEach((url) => window.URL.revokeObjectURL(url));
    root.replaceChildren();
    root.classList.remove('dg-app', 'dg-project');
    for (const key of ['diagramReady', 'embedded', 'uiTheme', 'diagramTheme', 'backdrop'])
      delete root.dataset[key];
  };
}
