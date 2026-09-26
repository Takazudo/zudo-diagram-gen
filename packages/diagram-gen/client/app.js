/* Package-owned viewer. Session authors edit metadata and SVGs, not this file. */
(() => {
  "use strict";

  function boot() {
    const root = document.getElementById("diagram-app");
    const source = document.getElementById("diagram-data");
    if (!root || !source || root.dataset.diagramReady === "true") return;
    root.dataset.diagramReady = "true";
    const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
    let data;
    try {
      data = JSON.parse(source.textContent);
      if (data.schemaVersion !== 1 || !data.session || !Array.isArray(data.candidates) || !Array.isArray(data.rounds)) throw new Error("Unsupported gallery data.");
    } catch (error) {
      root.innerHTML = `<div class="dg-fatal"><h1>The gallery could not open</h1><p>${escape(error.message)}</p><p>Run the session check command and regenerate the gallery.</p></div>`;
      return;
    }

    const candidates = [...data.candidates].sort((a, b) => {
      const roundA = data.rounds.find((round) => round.id === a.roundId)?.order ?? 0;
      const roundB = data.rounds.find((round) => round.id === b.roundId)?.order ?? 0;
      return roundA - roundB || a.order - b.order || a.id.localeCompare(b.id);
    });
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const rounds = [...data.rounds].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const tones = data.tones || [];
    const byTone = new Map(tones.map((tone) => [tone.id, tone]));
    const catalog = data.kind === "catalog";
    const storageKey = `zudo-diagram-gen:v1:${data.kind}:${data.session.id}`;
    const validActions = new Set(["refine", "integrate", "explore"]);
    const validViews = new Set(["grid", "inspect", "compare"]);
    const target = { width: Number(data.session.target?.width) || 360, height: Number(data.session.target?.height) || 200 };
    const assetUrls = new Map();
    const sizeCache = new Map();
    let storageAvailable = true;
    let saveTimer;
    let toastTimer;
    let justImported = false;
    let previousStorage;
    try { previousStorage = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { storageAvailable = false; }

    const state = {
      view: "grid",
      roundId: catalog ? "all" : (rounds[0]?.id || "all"),
      activeId: "",
      compareIds: [],
      search: "",
      toneId: "all",
      family: "all",
      onlyShortlist: false,
      theme: "light",
      backdrop: "auto",
      uiTheme: "light",
      zoom: 1,
      zoomMode: "fit",
      pan: { x: 0, y: 0 },
      shortlist: Object.create(null),
      direction: null,
      notes: Object.create(null),
      showContext: true,
    };
    if (previousStorage?.schemaVersion === 1 && previousStorage.sessionId === data.session.id) {
      const saved = previousStorage.state || {};
      if (validViews.has(saved.view)) state.view = saved.view;
      if (saved.roundId === "all" || rounds.some((round) => round.id === saved.roundId)) state.roundId = saved.roundId;
      if (byId.has(saved.activeId)) state.activeId = saved.activeId;
      state.compareIds = Array.isArray(saved.compareIds) ? saved.compareIds.filter((id, index, all) => byId.has(id) && all.indexOf(id) === index).slice(0, 2) : [];
      if (["light", "dark"].includes(saved.theme)) state.theme = saved.theme;
      if (["auto", "paper", "ink", "checker"].includes(saved.backdrop)) state.backdrop = saved.backdrop;
      if (["light", "dark"].includes(saved.uiTheme)) state.uiTheme = saved.uiTheme;
      state.showContext = saved.showContext !== false;
      if (typeof saved.search === "string") state.search = saved.search.slice(0, 200);
      if (typeof saved.toneId === "string") state.toneId = saved.toneId;
      if (typeof saved.family === "string") state.family = saved.family;
      state.onlyShortlist = !!saved.onlyShortlist;
      if (saved.shortlist && typeof saved.shortlist === "object") {
        for (const [id, record] of Object.entries(saved.shortlist)) {
          if (byId.has(id) && typeof record?.fingerprint === "string") state.shortlist[id] = record;
        }
      }
      if (byId.has(saved.direction?.id) && typeof saved.direction.fingerprint === "string") state.direction = saved.direction;
      if (saved.notes && typeof saved.notes === "object") {
        for (const [id, note] of Object.entries(saved.notes)) {
          if (byId.has(id) && typeof note?.fingerprint === "string") state.notes[id] = {
            fingerprint: note.fingerprint,
            keep: String(note.keep || "").slice(0, 20000),
            change: String(note.change || "").slice(0, 20000),
            action: validActions.has(note.action) ? note.action : "refine",
            updatedAt: note.updatedAt || null,
          };
        }
      }
    }
    try {
      const parameters = new URLSearchParams(location.hash.slice(1));
      const linkedId = parameters.get("candidate");
      if (byId.has(linkedId)) {
        state.activeId = linkedId;
        state.roundId = byId.get(linkedId).roundId;
        state.view = validViews.has(parameters.get("view")) ? parameters.get("view") : "inspect";
      }
    } catch { /* A local file can still be used without shareable fragment state. */ }
    if (!state.activeId) state.activeId = candidates.find((candidate) => state.roundId === "all" || candidate.roundId === state.roundId)?.id || candidates[0]?.id || "";

    const icons = {
      grid: '<rect x="3" y="3" width="5" height="5"/><rect x="12" y="3" width="5" height="5"/><rect x="3" y="12" width="5" height="5"/><rect x="12" y="12" width="5" height="5"/>',
      inspect: '<rect x="3" y="3" width="14" height="14"/><path d="M7 3v14"/>',
      compare: '<rect x="2" y="4" width="6" height="12"/><rect x="12" y="4" width="6" height="12"/>',
      star: '<path d="m10 2 2.45 5 5.55.8-4 3.9.95 5.5L10 14.6 5.05 17.2 6 11.7 2 7.8l5.55-.8Z"/>',
      check: '<path d="m4 10 4 4 8-8"/>',
      left: '<path d="m12 4-6 6 6 6"/>',
      right: '<path d="m8 4 6 6-6 6"/>',
      down: '<path d="M10 3v10m-4-4 4 4 4-4M3 14v3h14v-3"/>',
      copy: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M13 7V3H3v10h4"/>',
      sun: '<circle cx="10" cy="10" r="3"/><path d="M10 1v2m0 14v2M1 10h2m14 0h2M3.6 3.6 5 5m10 10 1.4 1.4M3.6 16.4 5 15M15 5l1.4-1.4"/>',
      moon: '<path d="M16.8 12A7 7 0 0 1 8 3.2 7 7 0 1 0 16.8 12Z"/>',
      search: '<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>',
      close: '<path d="m5 5 10 10M15 5 5 15"/>',
      reset: '<path d="M4 7a7 7 0 1 1-.4 6M4 2v5h5"/>',
      external: '<path d="M11 3h6v6m0-6-9 9M8 4H3v13h13v-5"/>',
      upload: '<path d="M10 14V3m-4 4 4-4 4 4M3 13v4h14v-4"/>',
      fit: '<path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"/>',
      folder: '<path d="M2 5h6l2 2h8v10H2Z"/>',
    };
    const icon = (name) => `<svg class="dg-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.inspect}</svg>`;
    const selected = (condition) => condition ? " selected" : "";
    const checked = (condition) => condition ? "true" : "false";
    const activeCandidate = () => byId.get(state.activeId);
    const toneFor = (candidate) => byTone.get(candidate?.toneId);
    const labelForTone = (candidate) => toneFor(candidate)?.name || candidate.toneId.replace(/[-_]/g, " ");
    const familyFor = (candidate) => toneFor(candidate)?.family || "Other";
    const shortIds = () => Object.keys(state.shortlist);
    const safeLink = (value) => {
      if (typeof value !== "string" || !value.trim()) return "";
      try {
        const resolved = new URL(value, location.href);
        if (["https:", "http:"].includes(resolved.protocol)) return value;
        if (resolved.protocol === "file:" && !/^[a-z][a-z\d+.-]*:/i.test(value) && !value.startsWith("//")) return value;
      } catch { /* Unusable metadata link is omitted. */ }
      return "";
    };
    const isStale = (candidate) => !!candidate && (
      (state.notes[candidate.id] && state.notes[candidate.id].fingerprint !== candidate.fingerprint) ||
      (state.shortlist[candidate.id] && state.shortlist[candidate.id].fingerprint !== candidate.fingerprint) ||
      (state.direction?.id === candidate.id && state.direction.fingerprint !== candidate.fingerprint)
    );
    const snapshot = (candidate) => ({ id: candidate.id, fingerprint: candidate.fingerprint });

    function persist(immediate = false) {
      clearTimeout(saveTimer);
      const save = () => {
        try {
          localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 1, sessionId: data.session.id, contentHash: data.contentHash, state }));
          storageAvailable = true;
        } catch {
          storageAvailable = false;
          const status = root.querySelector("[data-storage-status]");
          if (status) status.textContent = "Browser storage is unavailable. Download your review before closing this page.";
        }
      };
      if (immediate) save(); else saveTimer = setTimeout(save, 180);
    }

    function notify(message) {
      const toast = root.querySelector(".dg-toast");
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("is-visible");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4000);
    }

    function filteredCandidates() {
      const term = state.search.trim().toLowerCase();
      return candidates.filter((candidate) => (
        (state.roundId === "all" || candidate.roundId === state.roundId) &&
        (state.toneId === "all" || candidate.toneId === state.toneId) &&
        (state.family === "all" || familyFor(candidate) === state.family) &&
        (!state.onlyShortlist || state.shortlist[candidate.id]) &&
        (!term || [candidate.id, candidate.title, candidate.description, candidate.toneId, labelForTone(candidate), familyFor(candidate)].join(" ").toLowerCase().includes(term))
      ));
    }

    function imageUrl(candidate, theme = state.theme) {
      const svg = candidate?.assets?.[theme];
      if (!svg) return "";
      const key = `${candidate.id}:${theme}:${candidate.fingerprint}`;
      if (!assetUrls.has(key)) assetUrls.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      return assetUrls.get(key);
    }

    function dimensions(candidate) {
      if (!candidate) return target;
      const key = `${candidate.id}:${state.theme}`;
      if (sizeCache.has(key)) return sizeCache.get(key);
      const sourceSvg = candidate.assets?.[state.theme] || candidate.assets?.light || "";
      const viewBox = sourceSvg.match(/\bviewBox\s*=\s*["']\s*([-+.\deE]+)[,\s]+([-+.\deE]+)[,\s]+([-+.\deE]+)[,\s]+([-+.\deE]+)\s*["']/);
      const result = viewBox && Number(viewBox[3]) > 0 && Number(viewBox[4]) > 0 ? { width: Number(viewBox[3]), height: Number(viewBox[4]) } : target;
      sizeCache.set(key, result);
      return result;
    }

    function assetUnavailable(candidate, compact = false) {
      return `<div class="dg-unavailable${compact ? " dg-unavailable--compact" : ""}">${icon("moon")}<strong>${state.theme === "dark" ? "Dark" : "Light"} asset unavailable</strong>${compact ? "" : `<span>This candidate has no ${escape(state.theme)} SVG. Select another diagram theme or ask the agent to add it.</span>`}</div>`;
    }

    function topLinks() {
      const links = data.links || window.__DIAGRAM_LINKS__ || {};
      return [["homeUrl", "Project"], ["catalogUrl", "Tone collection"], ["docsUrl", "Docs"]]
        .filter(([key]) => safeLink(links[key]))
        .map(([key, label]) => `<a class="dg-top-link" href="${escape(safeLink(links[key]))}" target="_blank" rel="noopener noreferrer">${label}${icon("external")}</a>`).join("");
    }

    function sidebar() {
      const currentRound = rounds.find((round) => round.id === state.roundId);
      const projectLink = safeLink(data.session.project?.reference);
      return `<aside class="dg-sidebar" aria-label="Session navigation">
        <div class="dg-sidebar-section"><p class="dg-overline">${catalog ? "Collection" : "Review workspace"}</p>
          <h1 class="dg-session-title">${escape(data.session.title)}</h1>
          ${data.session.description ? `<p class="dg-session-description">${escape(data.session.description)}</p>` : ""}
          ${data.session.project?.name ? `<p class="dg-project-name">${icon("folder")}${projectLink ? `<a href="${escape(projectLink)}" target="_blank" rel="noopener noreferrer">${escape(data.session.project.name)}</a>` : escape(data.session.project.name)}</p>` : ""}
        </div>
        <nav class="dg-sidebar-section" aria-label="Rounds"><div class="dg-section-heading"><h2>${catalog ? "Browse" : "Rounds"}</h2><span class="dg-count">${catalog ? candidates.length : rounds.length}</span></div>
          <button class="dg-nav-row${state.roundId === "all" ? " is-active" : ""}" data-action="round" data-id="all" data-focus-key="round-all" aria-pressed="${checked(state.roundId === "all")}"><span>${catalog ? "All tones" : "All rounds"}</span><span>${candidates.length}</span></button>
          ${catalog ? "" : rounds.map((round, index) => `<button class="dg-nav-row${state.roundId === round.id ? " is-active" : ""}" data-action="round" data-id="${escape(round.id)}" data-focus-key="round-${escape(round.id)}" aria-pressed="${checked(state.roundId === round.id)}"><span><small>${String(index + 1).padStart(2, "0")}</small>${escape(round.title)}</span><span>${candidates.filter((candidate) => candidate.roundId === round.id).length}</span></button>`).join("")}
          ${currentRound?.description ? `<p class="dg-round-description">${escape(currentRound.description)}</p>` : ""}
        </nav>
        <div class="dg-sidebar-section"><div class="dg-section-heading"><h2>Selections</h2></div>
          <button class="dg-nav-row${state.onlyShortlist ? " is-active" : ""}" data-action="shortlist-filter" data-focus-key="shortlist-filter" aria-pressed="${checked(state.onlyShortlist)}"><span>${icon("star")}Shortlist</span><span>${shortIds().length}</span></button>
          ${state.direction ? `<div class="dg-direction-summary"><span class="dg-overline">Chosen direction</span><button data-action="inspect" data-id="${escape(state.direction.id)}">${icon("check")}<span>${escape(byId.get(state.direction.id)?.title)}<code>${escape(state.direction.id)}</code></span></button>${isStale(byId.get(state.direction.id)) ? '<span class="dg-stale-label">Changed since review</span>' : ""}</div>` : '<p class="dg-sidebar-note">Shortlist a few ideas, then choose a direction to refine.</p>'}
        </div>
        <div class="dg-sidebar-section dg-sidebar-reference"><div class="dg-section-heading"><h2>Reference</h2></div>
          <dl class="dg-session-facts"><div><dt>Placement</dt><dd>${escape(data.session.target?.label || "Diagram")}</dd></div><div><dt>Target size</dt><dd>${target.width} × ${target.height} px</dd></div>${data.session.toneCollectionVersion ? `<div><dt>Tone collection</dt><dd>v${escape(data.session.toneCollectionVersion)}</dd></div>` : ""}</dl>
          ${data.brief ? `<details class="dg-brief"><summary>Read the shared brief</summary><div class="dg-brief-text">${escape(data.brief)}</div></details>` : ""}
          <details class="dg-keyboard"><summary>Keyboard shortcuts</summary><dl><div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Switch candidate</dd></div><div><dt><kbd>S</kbd></dt><dd>Toggle shortlist</dd></div><div><dt><kbd>+</kbd> <kbd>−</kbd></dt><dd>Zoom drawing</dd></div><div><dt><kbd>0</kbd></dt><dd>Fit drawing</dd></div><div><dt><kbd>Esc</kbd></dt><dd>Return to gallery</dd></div></dl></details>
        </div>
        <div class="dg-sidebar-footer"><span class="dg-status-dot"></span>${catalog ? "Reference artwork · SVG" : "Local session · SVG"}<code>${escape(data.session.id)}</code></div>
      </aside>`;
    }

    function viewSwitcher() {
      return `<div class="dg-segmented dg-view-switch" role="group" aria-label="View">${[["grid", "Gallery"], ["inspect", "Inspect"], ["compare", "Compare"]].map(([view, label]) => `<button class="${state.view === view ? "is-active" : ""}" data-action="view" data-view="${view}" data-focus-key="view-${view}" aria-label="${label} view" aria-pressed="${checked(state.view === view)}">${icon(view)}<span>${label}</span>${view === "compare" && state.compareIds.length ? `<small>${state.compareIds.length}</small>` : ""}</button>`).join("")}</div>`;
    }

    function displayControls() {
      return `<div class="dg-display-controls"><div class="dg-segmented dg-theme-switch" role="group" aria-label="Diagram theme"><button data-action="theme" data-value="light" data-focus-key="theme-light" class="${state.theme === "light" ? "is-active" : ""}" aria-pressed="${checked(state.theme === "light")}" title="Light diagram asset">${icon("sun")}<span>Light</span></button><button data-action="theme" data-value="dark" data-focus-key="theme-dark" class="${state.theme === "dark" ? "is-active" : ""}" aria-pressed="${checked(state.theme === "dark")}" title="Dark diagram asset">${icon("moon")}<span>Dark</span></button></div><label class="dg-backdrop-select"><span>Surface</span><select data-field="backdrop" data-focus-key="backdrop" aria-label="Preview background"><option value="auto"${selected(state.backdrop === "auto")}>Match theme</option><option value="paper"${selected(state.backdrop === "paper")}>Paper</option><option value="ink"${selected(state.backdrop === "ink")}>Ink</option><option value="checker"${selected(state.backdrop === "checker")}>Transparency</option></select></label></div>`;
    }

    function filterBar() {
      const toneIds = [...new Set(candidates.map((candidate) => candidate.toneId))];
      const families = [...new Set(candidates.map(familyFor))].sort();
      return `<div class="dg-filter-bar"><label class="dg-search">${icon("search")}<input type="search" data-field="search" data-focus-key="search" placeholder="Find a tone, candidate, or idea…" value="${escape(state.search)}" aria-label="Search candidates" autocomplete="off"></label>
        ${families.length > 1 ? `<label class="dg-filter-select"><span class="dg-sr-only">Illustration family</span><select data-field="family" data-focus-key="family"><option value="all">All families</option>${families.map((family) => `<option value="${escape(family)}"${selected(state.family === family)}>${escape(family)}</option>`).join("")}</select></label>` : ""}
        ${!catalog && toneIds.length > 1 ? `<label class="dg-filter-select"><span class="dg-sr-only">Illustration tone</span><select data-field="toneId" data-focus-key="tone-filter"><option value="all">All tones</option>${toneIds.map((id) => `<option value="${escape(id)}"${selected(state.toneId === id)}>${escape(byTone.get(id)?.name || id.replace(/[-_]/g, " "))}</option>`).join("")}</select></label>` : ""}
        ${(state.search || state.toneId !== "all" || state.family !== "all" || state.onlyShortlist) ? '<button class="dg-text-button" data-action="clear-filters">Clear filters</button>' : ""}
      </div>`;
    }

    function candidateCard(candidate, index) {
      const url = imageUrl(candidate);
      const chosen = state.direction?.id === candidate.id;
      const shortlisted = !!state.shortlist[candidate.id];
      const comparing = state.compareIds.includes(candidate.id);
      return `<article class="dg-card${chosen ? " is-chosen" : ""}" aria-labelledby="title-${escape(candidate.id)}">
        <div class="dg-card-top"><span class="dg-candidate-id" title="Stable candidate ID">${escape(candidate.id)}</span><div class="dg-card-actions"><button class="dg-icon-button${comparing ? " is-active" : ""}" data-action="compare-toggle" data-id="${escape(candidate.id)}" data-focus-key="compare-${escape(candidate.id)}" aria-label="${comparing ? "Remove" : "Add"} ${escape(candidate.title)} ${comparing ? "from" : "to"} comparison" aria-pressed="${checked(comparing)}" title="${comparing ? "Remove from comparison" : "Add to comparison"}">${icon("compare")}</button><button class="dg-icon-button${shortlisted ? " is-active dg-starred" : ""}" data-action="shortlist-toggle" data-id="${escape(candidate.id)}" data-focus-key="star-${escape(candidate.id)}" aria-label="${shortlisted ? "Remove" : "Add"} ${escape(candidate.title)} ${shortlisted ? "from" : "to"} shortlist" aria-pressed="${checked(shortlisted)}" title="${shortlisted ? "Remove from shortlist" : "Add to shortlist"}">${icon("star")}</button></div></div>
        <button class="dg-thumbnail dg-surface" data-action="inspect" data-id="${escape(candidate.id)}" data-focus-key="thumb-${escape(candidate.id)}" aria-label="Inspect ${escape(candidate.title)}">${url ? `<img src="${url}" alt="${escape(candidate.title)} diagram" loading="${index < 6 ? "eager" : "lazy"}" draggable="false">` : assetUnavailable(candidate, true)}</button>
        <div class="dg-card-caption"><div class="dg-card-title-row"><h3 id="title-${escape(candidate.id)}"><button data-action="inspect" data-id="${escape(candidate.id)}">${escape(candidate.title)}</button></h3>${chosen ? `<span class="dg-chosen-badge">${icon("check")}Direction</span>` : ""}</div><p class="dg-card-meta">${escape(catalog ? familyFor(candidate) : labelForTone(candidate))}${!catalog && state.roundId === "all" ? ` · ${escape(candidate.roundId)}` : ""}</p>${candidate.description ? `<p class="dg-card-description">${escape(candidate.description)}</p>` : ""}${isStale(candidate) ? '<span class="dg-stale-label">Changed since review</span>' : ""}</div>
      </article>`;
    }

    function gallery() {
      const visible = filteredCandidates();
      const round = rounds.find((item) => item.id === state.roundId);
      return `<section class="dg-gallery" aria-label="Candidate gallery"><div class="dg-content-heading"><div><p class="dg-overline">${catalog ? "Illustration reference" : state.onlyShortlist ? "Your shortlist" : "Explore the directions"}</p><h2>${catalog ? "Find a visual language" : round?.title || "Every round, together"}</h2></div><span class="dg-result-count">${visible.length} ${catalog ? "tone" : "candidate"}${visible.length === 1 ? "" : "s"}</span></div>
        ${catalog ? '<p class="dg-gallery-intro">Inspect the artwork and its recipe. Choose useful references in the context of a real diagram.</p>' : ""}
        ${filterBar()}
        ${visible.length ? `<div class="dg-card-grid">${visible.map(candidateCard).join("")}</div>` : candidates.length ? `<div class="dg-empty">${icon("search")}<h3>No candidates match</h3><p>Adjust the round or filters to see more drawings.</p><button class="dg-button" data-action="show-all">Show every candidate</button></div>` : `<div class="dg-empty">${icon("grid")}<h3>Ready for your first diagrams</h3><p>This session is ready. Ask your agent to add candidates using the shared brief, then return here to compare them.</p></div>`}
      </section>`;
    }

    function zoomToolbar() {
      return `<div class="dg-zoom-toolbar"><div class="dg-zoom-actions"><button class="dg-button dg-button--small${state.zoomMode === "fit" ? " is-active" : ""}" data-action="zoom-fit" data-focus-key="zoom-fit" title="Fit drawing in the stage">${icon("fit")}Fit</button><button class="dg-button dg-button--small${state.zoomMode === "actual" ? " is-active" : ""}" data-action="zoom-actual" data-focus-key="zoom-actual" title="One SVG viewBox unit per CSS pixel">100%</button><label class="dg-zoom-range"><span class="dg-sr-only">Zoom percentage</span><input type="range" min="10" max="400" step="5" value="${Math.round(state.zoom * 100)}" data-field="zoom" data-focus-key="zoom" aria-label="Zoom percentage"><output data-zoom-label>${state.zoomMode === "fit" ? "Fit" : `${Math.round(state.zoom * 100)}%`}</output></label><button class="dg-icon-button" data-action="zoom-reset" data-focus-key="zoom-reset" title="Reset zoom and pan" aria-label="Reset zoom and pan">${icon("reset")}</button></div><span class="dg-pan-hint">Drag to pan · Ctrl/⌘ + scroll to zoom</span></div>`;
    }

    function stage(candidate, compareIndex) {
      const url = imageUrl(candidate);
      const size = dimensions(candidate);
      const identifier = compareIndex === undefined ? "inspect" : `compare-${compareIndex}`;
      return `<div class="dg-stage dg-surface${url ? " dg-stage--pannable" : ""}" data-stage="${identifier}" data-candidate="${escape(candidate.id)}" tabindex="0" role="region" aria-label="${escape(candidate.title)} enlarged diagram. Drag to pan; use zoom controls above.">${url ? `<div class="dg-pan-layer" style="width:${size.width}px;height:${size.height}px" data-width="${size.width}" data-height="${size.height}"><img src="${url}" width="${size.width}" height="${size.height}" alt="${escape(candidate.description || candidate.title)}" draggable="false"></div>` : assetUnavailable(candidate)}<span class="dg-stage-label">${escape(candidate.id)}</span><span class="dg-stage-dimensions">${Math.round(size.width)} × ${Math.round(size.height)}</span></div>`;
    }

    function placement(candidate) {
      const url = imageUrl(candidate);
      const title = data.session.context?.title || "Help diagram";
      const body = data.session.context?.body || "Check the visual hierarchy and label readability at the intended display size.";
      return `<section class="dg-placement"><div class="dg-placement-heading"><h3>Placement preview</h3><span>${target.width} × ${target.height} px · actual size</span></div><div class="dg-placement-scroll"><div class="dg-context dg-surface" style="width:${target.width}px"><div class="dg-context-art" style="width:${target.width}px;height:${target.height}px">${url ? `<img src="${url}" width="${target.width}" height="${target.height}" alt="${escape(candidate.title)} at target size" draggable="false">` : assetUnavailable(candidate, true)}</div><h4>${escape(title)}</h4><p>${escape(body)}</p></div></div><p class="dg-placement-caption">${escape(data.session.target?.label || "Intended diagram placement")}. The artwork stays at its target dimensions; scroll sideways on smaller screens.</p></section>`;
    }

    function toneRecipe(candidate) {
      const tone = toneFor(candidate);
      if (!tone) return "";
      return `<details class="dg-tone-recipe"${catalog ? " open" : ""}><summary><span>Illustration recipe</span><span>${escape(tone.name)}</span></summary><div class="dg-recipe-body"><p>${escape(tone.summary)}</p>${Array.isArray(tone.recipe) && tone.recipe.length ? `<ol>${tone.recipe.map((line) => `<li>${escape(line)}</li>`).join("")}</ol>` : ""}${tone.goodFor?.length ? `<h4>Useful for</h4><p>${escape(tone.goodFor.join(" · "))}</p>` : ""}${tone.smallSizeNotes ? `<h4>At small sizes</h4><p>${escape(tone.smallSizeNotes)}</p>` : ""}${tone.sourceReferences?.length ? `<h4>References</h4><ul class="dg-reference-links">${tone.sourceReferences.filter((reference) => safeLink(reference.url)).map((reference) => `<li><a href="${escape(safeLink(reference.url))}" target="_blank" rel="noopener noreferrer">${escape(reference.title)}${icon("external")}</a></li>`).join("")}</ul>` : ""}<code class="dg-tone-id">${escape(tone.id)}</code></div></details>`;
    }

    function reviewPanel(candidate) {
      const note = state.notes[candidate.id] || { keep: "", change: "", action: "refine" };
      const chosen = state.direction?.id === candidate.id;
      const stale = isStale(candidate);
      return `<aside class="dg-review-panel" aria-label="Review ${escape(candidate.title)}"><div class="dg-review-title"><div><p class="dg-overline">${catalog ? "Reference notes" : "Your review"}</p><h2>${escape(candidate.title)}</h2></div><span class="dg-candidate-id">${escape(candidate.id)}</span></div>
        <div class="dg-review-selection"><button class="dg-button${state.shortlist[candidate.id] ? " is-active dg-starred" : ""}" data-action="shortlist-toggle" data-id="${escape(candidate.id)}" data-focus-key="review-shortlist" aria-pressed="${checked(!!state.shortlist[candidate.id])}">${icon("star")}${state.shortlist[candidate.id] ? "Shortlisted" : "Shortlist"}</button><button class="dg-button${chosen ? " dg-button--chosen" : " dg-button--primary"}" data-action="direction" data-id="${escape(candidate.id)}" data-focus-key="direction" aria-pressed="${checked(chosen)}">${icon("check")}${chosen ? "Chosen direction" : "Choose direction"}</button></div>
        ${stale ? `<div class="dg-stale-notice" role="status"><strong>The artwork has changed</strong><p>Your earlier choice or feedback refers to a different file version. Review this artwork before carrying that feedback forward.</p><button class="dg-button dg-button--small" data-action="acknowledge" data-id="${escape(candidate.id)}">I’ve reviewed this version</button></div>` : ""}
        ${candidate.parentCandidateId ? `<p class="dg-lineage">Refined from <button data-action="inspect" data-id="${escape(candidate.parentCandidateId)}">${escape(candidate.parentCandidateId)}${icon("right")}</button></p>` : ""}
        <div class="dg-note-fields"><label><span>Keep</span><textarea rows="3" maxlength="20000" data-note="keep" data-candidate="${escape(candidate.id)}" data-focus-key="note-keep" placeholder="Layout, labels, palette, visual treatment…">${escape(note.keep)}</textarea></label><label><span>Change</span><textarea rows="4" maxlength="20000" data-note="change" data-candidate="${escape(candidate.id)}" data-focus-key="note-change" placeholder="Describe what to adjust. You can refer to another candidate by ID.">${escape(note.change)}</textarea></label><label><span>Next action</span><select data-note="action" data-candidate="${escape(candidate.id)}" data-focus-key="note-action"><option value="refine"${selected(note.action === "refine")}>Refine this direction</option><option value="explore"${selected(note.action === "explore")}>Explore more alternatives</option><option value="integrate"${selected(note.action === "integrate")}>Integrate this candidate</option></select></label></div>
        <div class="dg-feedback-actions"><button class="dg-button dg-button--primary" data-action="copy-feedback" data-focus-key="copy-feedback">${icon("copy")}Copy feedback</button><button class="dg-button" data-action="download-review" data-focus-key="download-review">${icon("down")}Review JSON</button></div><p class="dg-review-storage" data-storage-status>${storageAvailable ? "Saved in this browser. Copy or download to share with your agent." : "Browser storage is unavailable. Download your review before closing this page."}</p>
        <div class="dg-asset-actions"><button class="dg-button dg-button--wide" data-action="download-svg" data-id="${escape(candidate.id)}"${candidate.assets?.[state.theme] ? "" : " disabled"}>${icon("down")}Download ${escape(state.theme)} SVG</button><div class="dg-asset-path"><span>Source</span><code>${escape(candidate.sourcePath || candidate.id)}</code></div></div>
        ${toneRecipe(candidate)}
      </aside>`;
    }

    function inspector() {
      const candidate = activeCandidate();
      if (!candidate) return '<div class="dg-empty"><h2>No diagram is available yet</h2><p>Add a candidate directory to this session.</p></div>';
      const sequence = filteredCandidates();
      const index = sequence.findIndex((item) => item.id === candidate.id);
      return `<section class="dg-inspector" aria-label="Diagram inspector"><div class="dg-inspector-top"><div><p class="dg-overline">${escape(candidate.roundId)}<span> / </span>${escape(labelForTone(candidate))}</p><h2>${escape(candidate.title)}</h2></div><div class="dg-candidate-navigation"><span>${index >= 0 ? `${index + 1} / ${sequence.length}` : candidate.id}</span><button class="dg-icon-button" data-action="previous" aria-label="Previous candidate" title="Previous candidate"${sequence.length < 2 ? " disabled" : ""}>${icon("left")}</button><button class="dg-icon-button" data-action="next" aria-label="Next candidate" title="Next candidate"${sequence.length < 2 ? " disabled" : ""}>${icon("right")}</button></div></div>${candidate.description ? `<p class="dg-inspect-description">${escape(candidate.description)}</p>` : ""}<div class="dg-workbench-columns"><div class="dg-drawing-column">${zoomToolbar()}${stage(candidate)}<div class="dg-stage-footer"><span>100% uses the SVG viewBox size.</span><button class="dg-text-button" data-action="context-toggle" aria-pressed="${checked(state.showContext)}">${state.showContext ? "Hide" : "Show"} placement preview</button></div>${state.showContext ? placement(candidate) : ""}</div>${reviewPanel(candidate)}</div></section>`;
    }

    function ensureCompare() {
      const visible = filteredCandidates();
      const pool = visible.length > 1 ? visible : candidates;
      if (!state.compareIds.length && activeCandidate()) state.compareIds.push(state.activeId);
      for (const candidate of pool) {
        if (state.compareIds.length >= 2) break;
        if (!state.compareIds.includes(candidate.id)) state.compareIds.push(candidate.id);
      }
      if (!state.compareIds.includes(state.activeId)) state.activeId = state.compareIds[0] || state.activeId;
    }

    function comparison() {
      ensureCompare();
      const selectedCandidates = state.compareIds.map((id) => byId.get(id)).filter(Boolean);
      if (!selectedCandidates.length) return '<div class="dg-empty"><h2>No candidates to compare</h2></div>';
      return `<section class="dg-comparison" aria-label="Compare diagrams"><div class="dg-content-heading"><div><p class="dg-overline">Compare with the same settings</p><h2>See the differences</h2></div><button class="dg-text-button" data-action="context-toggle" aria-pressed="${checked(state.showContext)}">${state.showContext ? "Hide" : "Show"} placement previews</button></div><div class="dg-workbench-columns"><div class="dg-drawing-column">${zoomToolbar()}<div class="dg-compare-grid">${selectedCandidates.map((candidate, index) => `<div class="dg-compare-cell${candidate.id === state.activeId ? " is-reviewing" : ""}"><div class="dg-compare-heading"><span class="dg-compare-letter">${index === 0 ? "A" : "B"}</span><label><span class="dg-sr-only">Candidate ${index === 0 ? "A" : "B"}</span><select data-field="compare-candidate" data-index="${index}" data-focus-key="compare-select-${index}">${candidates.map((option) => `<option value="${escape(option.id)}"${selected(option.id === candidate.id)}>${escape(option.id)} · ${escape(option.title)}</option>`).join("")}</select></label></div>${stage(candidate, index)}<div class="dg-compare-cell-footer"><span>${escape(labelForTone(candidate))}</span><button class="dg-text-button" data-action="review-candidate" data-id="${escape(candidate.id)}" aria-pressed="${checked(candidate.id === state.activeId)}">${candidate.id === state.activeId ? "Reviewing" : "Review this"}${candidate.id === state.activeId ? icon("check") : icon("right")}</button></div>${state.showContext ? placement(candidate) : ""}</div>`).join("")}${selectedCandidates.length === 1 ? '<div class="dg-empty dg-compare-placeholder"><h3>Add another candidate</h3><p>Comparison needs at least two diagrams in the session.</p></div>' : ""}</div></div>${reviewPanel(activeCandidate())}</div></section>`;
    }

    function updateHash() {
      try {
        const parameters = new URLSearchParams();
        if (state.view !== "grid" && state.activeId) { parameters.set("candidate", state.activeId); parameters.set("view", state.view); }
        history.replaceState(null, "", `${location.pathname}${location.search}${parameters.size ? `#${parameters}` : ""}`);
      } catch { /* Some file viewers do not expose History API. */ }
    }

    function render() {
      const focused = document.activeElement;
      const focusKey = root.contains(focused) ? focused.dataset?.focusKey : null;
      const selectionRange = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement ? [focused.selectionStart, focused.selectionEnd] : null;
      root.dataset.uiTheme = state.uiTheme;
      root.dataset.diagramTheme = state.theme;
      root.dataset.backdrop = state.backdrop;
      root.className = "dg-app";
      root.innerHTML = `<header class="dg-topbar"><a class="dg-brand" href="#" data-action="brand" aria-label="Diagram generation gallery"><span class="dg-brand-symbol"><i></i><i></i><i></i><i></i></span><span>zudo<span class="dg-brand-divider">/</span><strong>diagram-gen</strong></span></a><div class="dg-topbar-actions">${topLinks()}<span class="dg-topbar-separator"></span><button class="dg-icon-button" data-action="import-review" title="Import a review JSON file" aria-label="Import review JSON">${icon("upload")}</button><button class="dg-icon-button" data-action="download-review" title="Download review JSON" aria-label="Download review JSON">${icon("down")}</button><button class="dg-icon-button" data-action="ui-theme" title="${state.uiTheme === "light" ? "Dark" : "Light"} viewer interface" aria-label="Switch viewer interface to ${state.uiTheme === "light" ? "dark" : "light"}">${icon(state.uiTheme === "light" ? "moon" : "sun")}</button></div></header><div class="dg-layout">${sidebar()}<main class="dg-main"><div class="dg-workspace-toolbar">${viewSwitcher()}${displayControls()}</div>${state.view === "grid" ? gallery() : state.view === "inspect" ? inspector() : comparison()}</main></div><div class="dg-toast" role="status" aria-live="polite"></div><input class="dg-sr-only" type="file" accept="application/json,.json" data-import-review tabindex="-1" aria-label="Choose review JSON file">`;
      if (focusKey) {
        const next = [...root.querySelectorAll("[data-focus-key]")].find((element) => element.dataset.focusKey === focusKey);
        if (next) {
          next.focus({ preventScroll: true });
          if (selectionRange && typeof next.setSelectionRange === "function" && selectionRange[0] !== null) {
            try { next.setSelectionRange(...selectionRange); } catch { /* Range inputs have no text selection. */ }
          }
        }
      }
      wireStages();
      updateStageTransforms();
      updateHash();
      persist();
      if (justImported) { notify("Review imported. Changed artwork is marked for another look."); justImported = false; }
    }

    function updateStageTransforms() {
      let firstScale;
      root.querySelectorAll(".dg-stage").forEach((element) => {
        const layer = element.querySelector(".dg-pan-layer");
        if (!layer) return;
        const nativeWidth = Number(layer.dataset.width);
        const nativeHeight = Number(layer.dataset.height);
        const fitted = Math.min(Math.max(1, element.clientWidth - 48) / nativeWidth, Math.max(1, element.clientHeight - 56) / nativeHeight);
        const scale = state.zoomMode === "fit" ? Math.max(0.02, fitted) : state.zoom;
        if (firstScale === undefined) firstScale = scale;
        layer.style.transform = `translate(-50%, -50%) translate(${state.pan.x}px, ${state.pan.y}px) scale(${scale})`;
        element.dataset.scale = String(scale);
      });
      const output = root.querySelector("[data-zoom-label]");
      if (output) output.textContent = state.zoomMode === "fit" ? `Fit · ${Math.round((firstScale ?? 1) * 100)}%` : `${Math.round(state.zoom * 100)}%`;
      const range = root.querySelector('[data-field="zoom"]');
      if (range && document.activeElement !== range) range.value = String(Math.max(10, Math.min(400, Math.round((state.zoomMode === "fit" ? (firstScale ?? 1) : state.zoom) * 100))));
    }

    function setZoom(next, stageElement, anchor) {
      const currentScale = state.zoomMode === "fit" ? Number(stageElement?.dataset.scale || root.querySelector(".dg-stage")?.dataset.scale || 1) : state.zoom;
      const clamped = Math.min(4, Math.max(0.1, next));
      if (anchor && stageElement) {
        const rect = stageElement.getBoundingClientRect();
        const x = anchor.x - rect.left - rect.width / 2;
        const y = anchor.y - rect.top - rect.height / 2;
        const ratio = clamped / currentScale;
        state.pan.x = x - (x - state.pan.x) * ratio;
        state.pan.y = y - (y - state.pan.y) * ratio;
      }
      state.zoom = clamped;
      state.zoomMode = "custom";
      root.querySelector('[data-action="zoom-fit"]')?.classList.remove("is-active");
      root.querySelector('[data-action="zoom-actual"]')?.classList.remove("is-active");
      updateStageTransforms();
    }

    function wireStages() {
      root.querySelectorAll(".dg-stage--pannable").forEach((element) => {
        const pointers = new Map();
        let lastPinch;
        element.addEventListener("pointerdown", (event) => {
          if (event.button !== 0 && event.pointerType === "mouse") return;
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          element.setPointerCapture(event.pointerId);
          element.classList.add("is-dragging");
          element.focus({ preventScroll: true });
          lastPinch = null;
        });
        element.addEventListener("pointermove", (event) => {
          if (!pointers.has(event.pointerId)) return;
          const previous = pointers.get(event.pointerId);
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.size === 1) {
            state.pan.x += event.clientX - previous.x;
            state.pan.y += event.clientY - previous.y;
            updateStageTransforms();
          } else {
            const [first, second] = [...pointers.values()];
            const distance = Math.hypot(first.x - second.x, first.y - second.y);
            if (lastPinch && distance > 0) {
              const scale = state.zoomMode === "fit" ? Number(element.dataset.scale) : state.zoom;
              setZoom(scale * distance / lastPinch, element, { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
            }
            lastPinch = distance;
          }
        });
        const end = (event) => { pointers.delete(event.pointerId); lastPinch = null; if (!pointers.size) element.classList.remove("is-dragging"); };
        element.addEventListener("pointerup", end);
        element.addEventListener("pointercancel", end);
        element.addEventListener("lostpointercapture", end);
        element.addEventListener("wheel", (event) => {
          if (!event.ctrlKey && !event.metaKey) return;
          event.preventDefault();
          const scale = state.zoomMode === "fit" ? Number(element.dataset.scale) : state.zoom;
          setZoom(scale * Math.exp(-event.deltaY * 0.008), element, { x: event.clientX, y: event.clientY });
        }, { passive: false });
      });
    }

    function navigate(offset) {
      const visible = state.view === "compare" ? candidates : filteredCandidates();
      if (!visible.length) return;
      const index = visible.findIndex((candidate) => candidate.id === state.activeId);
      const previousId = state.activeId;
      const startingIndex = index >= 0 ? index : offset > 0 ? -1 : 0;
      state.activeId = visible[(startingIndex + offset + visible.length) % visible.length].id;
      if (state.view === "grid") state.view = "inspect";
      if (state.view === "compare") {
        const pane = Math.max(0, state.compareIds.indexOf(previousId));
        const otherPane = pane === 0 ? 1 : 0;
        if (state.compareIds[otherPane] === state.activeId) state.compareIds[otherPane] = previousId;
        state.compareIds[pane] = state.activeId;
      }
      render();
    }

    function toggleShortlist(id) {
      const candidate = byId.get(id);
      if (!candidate) return;
      if (state.shortlist[id]) delete state.shortlist[id]; else state.shortlist[id] = snapshot(candidate);
      render();
    }

    function noteFor(candidate) {
      if (!state.notes[candidate.id]) state.notes[candidate.id] = { fingerprint: candidate.fingerprint, keep: "", change: "", action: "refine", updatedAt: new Date().toISOString() };
      return state.notes[candidate.id];
    }

    function reviewRecord() {
      const candidate = activeCandidate();
      const note = candidate ? state.notes[candidate.id] || { fingerprint: candidate.fingerprint, keep: "", change: "", action: "refine" } : null;
      return {
        schemaVersion: 1,
        type: "zudo-diagram-review",
        sessionId: data.session.id,
        sessionTitle: data.session.title,
        sessionContentHash: data.contentHash,
        exportedAt: new Date().toISOString(),
        reviewedCandidate: candidate ? { id: candidate.id, roundId: candidate.roundId, title: candidate.title, toneId: candidate.toneId, fingerprint: note.fingerprint, currentFingerprint: candidate.fingerprint, sourcePath: candidate.sourcePath, stale: isStale(candidate) } : null,
        chosenDirection: state.direction ? { ...state.direction, stale: state.direction.fingerprint !== byId.get(state.direction.id)?.fingerprint } : null,
        shortlist: Object.values(state.shortlist).map((record) => ({ ...record, stale: record.fingerprint !== byId.get(record.id)?.fingerprint })),
        feedback: note ? { keep: note.keep, change: note.change, action: note.action } : null,
        records: Object.entries(state.notes).map(([id, record]) => ({ id, ...record })),
      };
    }

    function feedbackText() {
      const candidate = activeCandidate();
      if (!candidate) return `Session: ${data.session.id}\nNo candidate is selected.`;
      const note = state.notes[candidate.id] || { keep: "", change: "", action: "refine" };
      const action = { refine: `Create refinements from ${candidate.id}. Preserve the stated keep items.`, explore: `Explore more alternatives, using ${candidate.id} and this feedback as reference.`, integrate: `Integrate ${candidate.id} into the target project placement.` }[note.action];
      const shortlist = shortIds();
      return [
        `Diagram review: ${data.session.title}`,
        `Session: ${data.session.id}`,
        `Round: ${candidate.roundId}`,
        `Reviewed candidate: ${candidate.id} — ${candidate.title}`,
        `Current artwork fingerprint: ${candidate.fingerprint}`,
        state.notes[candidate.id]?.fingerprint && state.notes[candidate.id].fingerprint !== candidate.fingerprint ? `Earlier reviewed fingerprint: ${state.notes[candidate.id].fingerprint}` : "",
        state.direction ? `Chosen direction: ${state.direction.id}${state.direction.fingerprint !== byId.get(state.direction.id)?.fingerprint ? " [CHANGED SINCE SELECTION]" : ""}` : "Chosen direction: not set",
        shortlist.length ? `Shortlist: ${shortlist.map((id) => `${id}${isStale(byId.get(id)) ? " [changed]" : ""}`).join(", ")}` : "",
        isStale(candidate) ? "ATTENTION: This feedback or selection refers to an earlier artwork version. Reconcile it with the current SVG before acting." : "",
        "", "Keep:", note.keep.trim() || "No specific keep items recorded.",
        "", "Change:", note.change.trim() || "No specific changes recorded.",
        "", "Next action:", action,
        "", `Target: ${data.session.target?.label || "Diagram"}, ${target.width} × ${target.height} px.`,
        "Selecting a candidate establishes a direction for this request; it does not create a project-wide visual rule.",
      ].filter((line, index, all) => line !== "" || (index > 0 && all[index - 1] !== "")).join("\n");
    }

    function download(content, type, filename) {
      const url = URL.createObjectURL(new Blob([content], { type }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function copyFeedback() {
      const content = feedbackText();
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(content);
        notify("Feedback copied. Paste it into your agent conversation.");
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.className = "dg-copy-fallback";
        root.append(textarea);
        textarea.select();
        let copied = false;
        try { copied = document.execCommand("copy"); } catch { /* Download is the explicit fallback. */ }
        textarea.remove();
        if (copied) notify("Feedback copied. Paste it into your agent conversation.");
        else { download(content, "text/plain;charset=utf-8", `${data.session.id}-feedback.txt`); notify("Clipboard is unavailable here. Feedback downloaded as text."); }
      }
    }

    async function importReview(file) {
      try {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) throw new Error("Review files must be smaller than 2 MB.");
        const review = JSON.parse(await file.text());
        if (review.schemaVersion !== 1 || review.type !== "zudo-diagram-review") throw new Error("This is not a supported diagram review JSON file.");
        if (review.sessionId !== data.session.id) throw new Error(`This review belongs to “${review.sessionId}”, not this session.`);
        if (!Array.isArray(review.records) || !Array.isArray(review.shortlist)) throw new Error("The review is missing its candidate records or shortlist.");
        const referenced = [...review.records, ...review.shortlist, ...(review.chosenDirection ? [review.chosenDirection] : []), ...(review.reviewedCandidate ? [review.reviewedCandidate] : [])];
        for (const record of referenced) {
          if (!record || !byId.has(record.id)) throw new Error(`Candidate “${record?.id || "unknown"}” is missing from this session. Import the matching session content first.`);
          if (typeof record.fingerprint !== "string" || !record.fingerprint) throw new Error(`Candidate “${record.id}” has no artwork fingerprint.`);
        }
        const importedNotes = Object.create(null);
        for (const record of review.records) {
          if (typeof record.keep !== "string" || typeof record.change !== "string" || !validActions.has(record.action)) throw new Error(`Feedback for “${record.id}” is invalid.`);
          importedNotes[record.id] = { fingerprint: record.fingerprint, keep: record.keep.slice(0, 20000), change: record.change.slice(0, 20000), action: record.action, updatedAt: record.updatedAt || review.exportedAt || null };
        }
        if (review.reviewedCandidate && review.feedback && !importedNotes[review.reviewedCandidate.id]) {
          const feedback = review.feedback;
          if (typeof feedback.keep !== "string" || typeof feedback.change !== "string" || !validActions.has(feedback.action)) throw new Error("The selected candidate’s feedback is invalid.");
          importedNotes[review.reviewedCandidate.id] = { fingerprint: review.reviewedCandidate.fingerprint, keep: feedback.keep.slice(0, 20000), change: feedback.change.slice(0, 20000), action: feedback.action, updatedAt: review.exportedAt || null };
        }
        Object.assign(state.notes, importedNotes);
        for (const record of review.shortlist) state.shortlist[record.id] = { id: record.id, fingerprint: record.fingerprint };
        if (review.chosenDirection) state.direction = { id: review.chosenDirection.id, fingerprint: review.chosenDirection.fingerprint };
        if (review.reviewedCandidate) { state.activeId = review.reviewedCandidate.id; state.roundId = byId.get(state.activeId).roundId; state.view = "inspect"; }
        justImported = true;
        render();
      } catch (error) { notify(`Import failed: ${error.message}`); }
    }

    root.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (!button || !root.contains(button) || button.disabled) return;
      const action = button.dataset.action;
      const id = button.dataset.id;
      if (action === "brand") event.preventDefault();
      if (action === "shortlist-toggle") { toggleShortlist(id); return; }
      if (action === "copy-feedback") { await copyFeedback(); return; }
      if (action === "download-review") { persist(true); download(`${JSON.stringify(reviewRecord(), null, 2)}\n`, "application/json", `${data.session.id}-review.json`); notify("Review JSON downloaded."); return; }
      if (action === "import-review") { root.querySelector("[data-import-review]").click(); return; }
      if (action === "download-svg") {
        const candidate = byId.get(id);
        if (!candidate?.assets?.[state.theme]) { notify(`No ${state.theme} SVG exists for this candidate.`); return; }
        download(candidate.assets[state.theme], "image/svg+xml;charset=utf-8", `${candidate.id}-${state.theme}.svg`);
        return;
      }
      if (action === "next" || action === "previous") { navigate(action === "next" ? 1 : -1); return; }
      switch (action) {
        case "brand": state.view = "grid"; break;
        case "view":
          if (validViews.has(button.dataset.view)) {
            if (state.view === "grid" && button.dataset.view === "inspect" && !filteredCandidates().some((candidate) => candidate.id === state.activeId)) state.activeId = filteredCandidates()[0]?.id || state.activeId;
            state.view = button.dataset.view;
          }
          break;
        case "round": state.roundId = id; state.view = "grid"; if (id !== "all" && activeCandidate()?.roundId !== id) state.activeId = candidates.find((candidate) => candidate.roundId === id)?.id || state.activeId; break;
        case "shortlist-filter": state.onlyShortlist = !state.onlyShortlist; state.roundId = "all"; state.view = "grid"; break;
        case "clear-filters": state.search = ""; state.family = "all"; state.toneId = "all"; state.onlyShortlist = false; break;
        case "show-all": state.search = ""; state.family = "all"; state.toneId = "all"; state.onlyShortlist = false; state.roundId = "all"; break;
        case "inspect": if (byId.has(id)) { state.activeId = id; state.view = "inspect"; if (state.roundId !== "all" && state.roundId !== byId.get(id).roundId) state.roundId = byId.get(id).roundId; } break;
        case "review-candidate": if (byId.has(id)) state.activeId = id; break;
        case "theme": state.theme = button.dataset.value === "dark" ? "dark" : "light"; break;
        case "ui-theme": state.uiTheme = state.uiTheme === "light" ? "dark" : "light"; break;
        case "context-toggle": state.showContext = !state.showContext; break;
        case "compare-toggle":
          if (!byId.has(id)) return;
          if (state.compareIds.includes(id)) state.compareIds = state.compareIds.filter((item) => item !== id);
          else if (state.compareIds.length < 2) state.compareIds.push(id);
          else state.compareIds[1] = id;
          break;
        case "direction":
          if (!byId.has(id)) return;
          state.direction = state.direction?.id === id ? null : snapshot(byId.get(id));
          break;
        case "acknowledge": {
          const candidate = byId.get(id);
          if (!candidate) return;
          if (state.notes[id]) state.notes[id].fingerprint = candidate.fingerprint;
          if (state.shortlist[id]) state.shortlist[id].fingerprint = candidate.fingerprint;
          if (state.direction?.id === id) state.direction.fingerprint = candidate.fingerprint;
          break;
        }
        case "zoom-fit": case "zoom-reset": state.zoomMode = "fit"; state.pan = { x: 0, y: 0 }; break;
        case "zoom-actual": state.zoom = 1; state.zoomMode = "actual"; state.pan = { x: 0, y: 0 }; break;
        default: return;
      }
      render();
    });

    root.addEventListener("input", (event) => {
      const element = event.target;
      if (element.dataset.note) {
        const candidate = byId.get(element.dataset.candidate);
        if (!candidate) return;
        const note = noteFor(candidate);
        const field = element.dataset.note;
        if (["keep", "change"].includes(field)) note[field] = element.value;
        if (field === "action" && validActions.has(element.value)) note.action = element.value;
        note.updatedAt = new Date().toISOString();
        persist();
      } else if (element.dataset.field === "search") { state.search = element.value; if (!event.isComposing) render(); }
      else if (element.dataset.field === "zoom") { setZoom(Number(element.value) / 100); persist(); }
    });

    root.addEventListener("compositionend", (event) => {
      if (event.target.dataset.field === "search") { state.search = event.target.value; render(); }
    });

    root.addEventListener("change", (event) => {
      const element = event.target;
      if (element.matches("[data-import-review]")) { void importReview(element.files[0]); return; }
      const field = element.dataset.field;
      if (["family", "toneId", "backdrop"].includes(field)) { state[field] = element.value; render(); }
      if (field === "compare-candidate" && byId.has(element.value)) {
        const index = Number(element.dataset.index);
        const otherIndex = index === 0 ? 1 : 0;
        const old = state.compareIds[index];
        if (state.compareIds[otherIndex] === element.value) state.compareIds[otherIndex] = old;
        state.compareIds[index] = element.value;
        if (state.activeId === old) state.activeId = element.value;
        render();
      }
      if (element.dataset.note === "action") {
        const candidate = byId.get(element.dataset.candidate);
        if (candidate && validActions.has(element.value)) { noteFor(candidate).action = element.value; persist(); }
      }
    });

    root.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey || event.target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); navigate(event.key === "ArrowRight" ? 1 : -1); }
      if (event.key === "Escape" && state.view !== "grid") { state.view = "grid"; render(); }
      if (event.key.toLowerCase() === "s" && activeCandidate()) { event.preventDefault(); toggleShortlist(state.activeId); }
      if (["+", "=", "-", "_"].includes(event.key) && state.view !== "grid") {
        event.preventDefault();
        const scale = state.zoomMode === "fit" ? Number(root.querySelector(".dg-stage")?.dataset.scale || 1) : state.zoom;
        setZoom(scale * (["+", "="].includes(event.key) ? 1.2 : 1 / 1.2));
      }
      if (event.key === "0" && state.view !== "grid") { state.zoomMode = "fit"; state.pan = { x: 0, y: 0 }; render(); }
    });

    window.addEventListener("resize", updateStageTransforms);
    window.addEventListener("pagehide", () => persist(true));
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(updateStageTransforms).observe(root);
    render();
  }

  if (document.readyState === "loading" && !document.getElementById("diagram-app")) document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
