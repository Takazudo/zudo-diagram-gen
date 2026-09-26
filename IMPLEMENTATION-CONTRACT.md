# Implementation contract — 0.1.0 development

This file coordinates the first implementation. Public guidance is in the project docs.

## Architecture

- pnpm workspace; root is a zfb + zudo-doc project documentation website.
- `packages/diagram-gen` is `@takazudo/zudo-diagram-gen`, version `0.1.0`.
- `packages/create-zudo-diagram-gen` is a small initializer. No personal directories or automatic git initialization.
- Runtime Node code uses ESM `.mjs`; browser code is dependency-free `.js` and CSS; zfb page entrypoints use Preact TSX.
- Node >=22 <25. Package source is directly shipped; no compile step for engine or CLI.
- Browser app is package-owned. Agents normally edit session content only.
- First-version feedback transport: copy text and download review JSON. Browser state is never described as a workspace write.
- Local session CLI delegates dev/build/preview to **zfb**, and regenerates a static workbench page/data on additions, edits, and removals. Root docs also use zfb/zudo-doc.
- Standalone `export-html` bundles data, CSS, and JS into one offline HTML file. This supplements zfb; it does not replace it.

## Source files in a session

- `session.json`: `{schemaVersion:1,id,title,description?,project?:{name,reference?},target:{width,height,label?},context?:{title,body},toneCollectionVersion?:"0.1.0"}`.
- `brief.md`: optional plain Markdown; shared facts, source references, fixed labels and meaning.
- `rounds/<round-id>/round.json`: `{schemaVersion:1,id,title,description?,order:number,baselineCandidateId?:string|null}`.
- `rounds/<round-id>/<candidate-dir>/candidate.json`: `{schemaVersion:1,id,title,toneId,description?,order:number,assets:{light:string,dark?:string},parentCandidateId?:string|null}`. Asset paths are relative to candidate directory. IDs are globally unique, stable URL-safe slugs. Parent must exist in an earlier round; no cycles.
- Root metadata and brief owned by coordinator; candidate directory owned by one generation worker.
- Reviewed versions are preserved; refinements receive a new ID and parent pointer.

## Engine model and API (`src/model.mjs`)

- `loadSession(root)` async -> normalized `GalleryData` (throws actionable errors).
- `validateSession(root)` async -> `{ok,errors,warnings,summary}`; semantic correctness remains an agent/user check.
- `loadToneCatalog()` async -> catalog data from package-owned tones.
- `exportCandidate(root, candidateId, {theme:"light"|"dark",output})` async -> writes exact validated SVG; no silent dark fallback.
- `GalleryData`: `{schemaVersion:1,kind:"session"|"catalog",session,brief:string,rounds:[...],candidates:[...],tones?:[...],contentHash:string}`.
- Normalized candidate: `{id,roundId,title,toneId,description,order,parentCandidateId,sourcePath,assets:{light:SVG_STRING,dark?:SVG_STRING},fingerprint}`.
- `sourcePath` is relative to session root, pointing at candidate.json. Metadata must not leak absolute paths into exported HTML.
- Tone catalog `tones/catalog.json`: `{schemaVersion:1,version:"0.1.0",tones:[{id,number,name,family,summary,recipe:string[],goodFor:string[],smallSizeNotes:string,referenceFiles:{light:string,dark:string},sourceReferences?:[{title,url}]}]}`.
- `loadToneCatalog` yields a GalleryData with kind catalog, synthetic round `catalog`, candidates from tones; session id `tone-catalog`, target 360x200, title `Tone collection`.

## Rendering (`src/render.mjs`, owned by root)

- `renderGallery(data, options?)` -> full standalone HTML string. Embeds CSS, app.js, JSON safely. Options `{homeUrl?,docsUrl?,catalogUrl?,title?}`.
- HTML contains `<div id="diagram-app"></div>` and `<script id="diagram-data" type="application/json">...</script>`.
- `window.__DIAGRAM_LINKS__` is optional; links also embedded in data as `links` before serialization.
- `renderZfbGallery(data, options?)` -> HTML body fragment, stylesheet and application bootstrap embedded; used by generated Preact page.
- Browser uses `<img>` with data SVG URLs, keeping SVG CSS and IDs isolated. Existing light/dark files are flattened literal colors.

## Browser UI (`client/app.js`, `client/app.css`)

- Parse #diagram-data; render into #diagram-app. No bundler requirement.
- Grid, inspect, compare; stable IDs; round and tone/family filters; previous/next; fit, 100%, slider zoom, pan; reset.
- Target-size/context preview; diagram light/dark and backdrop controls; unavailable themes explicitly indicated.
- Shortlist, selected direction, keep/change feedback, action refine/integrate/explore; copy structured feedback and download JSON; import JSON if feasible with session/id/fingerprint checks.
- localStorage scoped by session.id; catch storage failures; content fingerprints mark stale feedback.
- Re-render must retain text edits; buttons accessible, responsive, keyboard navigation must not intercept inputs.
- Export actual SVG and standalone downloadable session if feasible (engine CLI guarantees latter).

## CLI

`zudo-diagram-gen check [directory] [--json]`
`zudo-diagram-gen export <candidate-id> --session <directory> --theme light|dark --out <file>`
`zudo-diagram-gen tones list [--json]`
`zudo-diagram-gen tones show <id> [--json]`
`zudo-diagram-gen export-html [directory] --out <file>`
`zudo-diagram-gen dev|build|preview [directory] [--host <host>] [--port <port>]`

Root handles zfb runner/rendering; engine agent handles model and check/export/tones CLI logic as `src/commands.mjs` exposing `runDataCommand(args)` -> boolean handled. Root CLI dispatch calls this first.

## Testing

- Node test runner for session validation, path containment, parent lineage, exports and initializer contracts.
- Actual pnpm install, zfb build/check and packed consumer scaffold checks where environment permits.
- Browser interaction verification only through supported browser capability. Record limits explicitly if unavailable.
- No publication, remote repository mutation, hosting or personal skill installation during this handoff.
