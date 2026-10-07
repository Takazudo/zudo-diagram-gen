# P07 comparison and portable review acceptance

The implementation reuses `mountDiagramApp` and the shared placement renderer. `mountProjectApp` is exported through the same `client/mount` entrypoint. The renderer accepts ordinary `GalleryData` or normalized `ProjectData`; `exportHtml` provides source-aware HTML export. Project routes still use the one existing zfb runner.

No comparison set is initially inferred. Each named set refers to one exact `(sessionId, candidateId, fingerprint)` per intended session. Missing, invalid and stale slots retain their frame where available but contain no replacement drawing. A dark asset must exist explicitly. Inspecting a stale session shows retained-data status, and entering its ordinary workbench is a separate action from accepting its contents.

Session workbenches remain mounted while navigating the overview, retaining edits even when browser storage is unavailable. Disposal flushes ordinary session state, clears timers and object URLs, disconnects observers and removes listeners. Keyboard shortcuts remain scoped to the focused ordinary workbench; editing inputs, selects and dialogs keeps their key behavior. Project JSON imports validate every referenced session before applying any records. Existing ordinary imports and storage keys remain usable. Invalid sessions with no snapshot are omitted from project review export, remain visibly unavailable, and cannot accept imports.

## Deterministic fixture

```bash
node scripts/create-review-project.mjs /tmp/new-review-project
```

This creates five original public Japanese teaching sessions, their P00 placement frames, eight comparison sets and nine authored candidates per session. Candidate IDs deliberately recur across sessions. The extra `fine-outline-alt` candidate shares a tone with `c1` and is never inferred into a set. `return-items/c8` deliberately has no dark asset. This fixture measures app contracts, not tone quality, model generation or user approval.

## Local focused gates

```bash
corepack pnpm install --frozen-lockfile
node packages/diagram-gen/client/build-standalone.mjs
corepack pnpm exec vitest run packages/diagram-gen/test/project-review.test.mjs test/ui.test.mjs test/render.test.mjs packages/diagram-gen/test/project.test.mjs packages/diagram-gen/test/placement.test.mjs packages/diagram-gen/test/model.test.mjs
corepack pnpm check
corepack pnpm lint
corepack pnpm check:examples
```

The project HTML tests use the same loader and package renderer as production. They exercise malformed and hostile metadata, external SVG references, bounded serialization, stale fingerprints, foreign/duplicate review sessions, existing output conflicts and symlink/hard-link source aliases. A source-aware export allows only `exports/` inside the supplied source root; callers can also choose a destination outside that root. Single-session forms remain supported. Rendering normalized project data directly validates its embedded resources; the source-aware API additionally removes native source-root spellings from I/O diagnostics.

## Serialized packed and browser gates

Pack the engine through the normal repository pack command, then supply absolute paths and a new external directory. The manager runs heavy operations under the shared guard:

```bash
ENGINE_TGZ=/absolute/engine.tgz PROJECT_REVIEW_OUT=/tmp/new-packed-review \
  bash "$HOME/.codex/scripts/heavy-guard.sh" -- \
  bash scripts/check-project-review-packed.sh
```

The script installs the packed engine in an external loader, creates the deterministic project through that installed module, and installs/checks/builds its zfb 3 host. Both project and ordinary-session HTML exports are produced from the installed engine. It also copies both into a detached directory. The existing `check-project-packed.sh` gate still covers the initializer and zfb 2 host dialect.

Start **one** preview process for `/tmp/new-packed-review/project` using its installed CLI, then run the following with the actual URL. The manager owns the process lifecycle and serializes browser launches:

```bash
bash "$HOME/.codex/scripts/heavy-guard.sh" -- \
  bash "$HOME/.claude/scripts/playwright-guard.sh" --wait 300 -- \
  node scripts/check-project-review-browser.mjs \
  http://127.0.0.1:4797 /tmp/review-browser-evidence
```

`PROJECT_BROWSER_EXECUTABLE` may explicitly name an existing local Chromium. `PROJECT_PLAYWRIGHT_MODULE` may name an installed Playwright module. The script reports the actual browser version and executable choice. CI should use pinned Playwright 1.59.1 and its Chromium; a system browser is a separately reported substitution.

The executable check covers all eight mappings and frame/slot geometry, absent dark artwork, text editing, shortlist versus chosen direction, search, comparison, zoom/pan, session copy/download/import, project download/import, persistence, theme independence, missing/stale/invalid slots and disposal/remount. It saves actual desktop/narrow screenshots in light/dark UI modes and fails on console/page errors or horizontal page overflow. DOM test evidence cannot replace this check.

## Detached offline gate

Stop preview and temporarily move the source project away while retaining the installed browser capability outside it. Run the detached copies with HTTP requests blocked:

```bash
mv /tmp/new-packed-review/project /tmp/new-packed-review/project-away
bash "$HOME/.codex/scripts/heavy-guard.sh" -- \
  bash "$HOME/.claude/scripts/playwright-guard.sh" --wait 300 -- \
  node scripts/check-project-review-browser.mjs \
  /tmp/new-packed-review/detached/combined.html /tmp/review-offline-evidence --offline
mv /tmp/new-packed-review/project-away /tmp/new-packed-review/project
```

Run the companion `scripts/check-single-offline-browser.mjs` under the same guards with `detached/single.html` and a separate evidence directory. It checks ordinary inspect/theme/review transfer and SVG download with HTTP blocked, retaining its screenshot and error log with the combined evidence. When local policy blocks `file:` navigation, execute this gate in the browser CI environment and report it as pending until actual evidence exists. A static HTML assertion is not an offline browser pass.

The feature worker does not run a held-open server, heavy build or browser. The manager owns these gates and must attach their logs and screenshots before claiming full acceptance. No publication, deployment, personal installation or remote mutation is part of these scripts.
