# @takazudo/zudo-diagram-gen

A package-owned local SVG review system. Agents author saved candidate files; people inspect, compare and choose them; refinement starts from the exact named saved baseline. Sessions/projects own ordinary JSON, Markdown and SVG content. zfb supplies dev/build/preview, and offline HTML is an additional snapshot.

## Availability and first task

Version 0.1.0 is available through local source archives; this package does not establish registry publication. Use Node 22–24 and pnpm 10.30.3. Pack from the source repository with `pnpm pack:local`, create a new caller destination with the source/locally installed initializer and the absolute engine archive, then install in that host. Keep the archive at the recorded path for reinstalls. No personal skill/Git installation occurs.

The archive includes `skills/diagram-gen/SKILL.md` and `references/commands.md`, `authoring.md`, `scenarios.md`. Resolve the installed SKILL.md with `require.resolve('@takazudo/zudo-diagram-gen/skills/diagram-gen/SKILL.md')`; explicitly ask the agent to read it and relative references. Optionally copy the complete directory into a new explicitly chosen project-local host skill directory and verify that host's discovery. Inclusion alone proves neither personal installation nor native automatic discovery. Manual commands remain available.

Ask for one diagram or a bounded exploration: explain a public review workflow at 360 × 200 CSS pixels, preserve its facts/labels, present saved IDs and inspect images at actual placement. The skill grounds an Intent/Must show/May drop/References/Lock/Target/Language and fonts brief. Authors create artwork outside the CLI; it never calls a model. Personal /my-diagram-gen path policy remains external.

## CLI

Use `pnpm exec zudo-diagram-gen` inside the installed host. Below is syntax with caller placeholders, not literal runnable commands:

```text
new --out <new-directory> --brief <file> [--project] [--install] [--engine-package <absolute.tgz>] [--json]
inspect|resume <session-or-project> [--review <file>] [--json]
check [directory] [--json] [--json-version 1]
tones list [--json] [--json-version 1]
tones show <id> [--json] [--json-version 1]
dev|build|preview [directory] [--host <host>] [--port <port>]
capture <id> --session <directory> --out <png> [--placement <file>] [--resource-root <project>] [--theme light|dark] [--dpr <n>] [--crop frame|slot] [--timeout-ms <ms>] [--browser-executable <path>] [--force] [--json]
project lock <project> --tone <id> --palette <file> --selection <file> --revision <id> [--json]
project adopt <project> --revision <id> [--json]
export <id> --session <directory> --theme light|dark --out <svg> [--resource-root <project>] [--json] [--json-version 1]
export-html [session-or-project] --out <html> [--force] [--json]
```

New creates empty host/content only, refuses nonempty/symlink destinations and keeps failed installation resumable. Run pnpm install there then resume; do not recreate over it. Inspect/resume read files and explicitly supplied downloaded review; browser storage is inaccessible. Project partial data can coexist with ok:false; strict check/build requires current registrations and exact comparisons. One host serves its registered session routes. Generated routes have exact hash ownership; preserve edits and resolve conflicts explicitly.

New JSON commands and check/tones --json-version 1 use `{schemaVersion:1,command,ok,data,errors,warnings}`; diagnostics are code/message/path?. Bare legacy check/tones JSON remains compatible. Unknown/duplicate flags reject. Exit 0 success, 1 validation/incomplete/stale, 2 arguments/version, 3 missing capture capability, 4 I/O/unsafe/output conflict, 130 cancellation; bare legacy failures remain 1. Long-lived zfb commands have normal logs, no JSON mode. Full command/error/review recovery is packaged in the skill references, available without a source checkout.

## Tone resources, authoring and immutable styles

All 24 bundled IDs include scheme, kit, local explanation/recipe and source/light/dark references. Required meaning is offline; optional HTTP(S) inspiration is not a dependency. Package-relative resources resolve from installed tones/, never cwd. Complete catalog gates coexist with custom/legacy session tones and explicit capability diagnostics. Declared malformed/missing resources fail.

Schemes are format version 1 with independent toneRevision/collectionVersion/content hashes. Geometry, typography, deterministic texture and descriptive composition rules guide authors. Palette roles are ink/surface/border/accent/deep/warning in both themes, literal #RRGGBB. Complete overrides change semantic color only. Materializers replace marked attributes, inline namespaced kit definitions and retain hand geometry. Final assets remain self-contained. Required descriptive rules, facts, shaping, glyph coverage and final readability need actual judgment.

Canonical JSON hashing sorts keys by Unicode code points and preserves arrays/strings; byte hashes preserve UTF-8 BOM/newlines. Candidate legacy fingerprints remain stable despite additive provenance. Saved scheme/kit/palette/style snapshots are immutable across catalog upgrades. Explicit project selection requires current session/candidate/fingerprint baselines and user/test purpose. First lock adopts; later revisions stay pending until explicit adopt. Tone switching, shortlist, choice for one drawing or capture never locks style. Read saved constituents with readStyleRevision rather than substituting the current catalog.

## Review, refinement and exact outputs

Shortlist retains alternatives; chosen direction identifies a drawing baseline. Copy/download feedback explicitly, then provide the actual JSON file to resume or prose to the agent. Importing browser review does not write source files. Preserve notes and independent current/stale/unknown artwork/style/placement/capture evidence; unknown is not approval. Project identity is session ID plus candidate ID, and parents remain inside their ordinary session. Exact comparison sets never infer another same-tone candidate.

createRefinement names saved baseline ID/fingerprint and later round/new ID, copying exact assets and matching feedback before bounded edits. Preserve earlier files; update copied asset hashes deliberately and recapture/reinspect changed images. ExportCandidate copies exact saved validated bytes, including BOM/newlines, never regenerating against upgraded resources. Nested project operations require explicit resourceRoot; no ancestor lookup. Ordinary SVG export supports safe repeated nonsource overwrite. Capture/HTML need force for existing outputs, which never allows source aliases. Use exports/ inside source roots or external destinations.

Offline HTML embeds content/assets/UI, not browser notes or future source edits. Transfer review JSON separately. Combined projects preserve explicit unavailable slots/diagnostics, not hidden replacements; strict acceptance remains separate. Clipboard/storage may vary for detached origins. No product integration or agent resume occurs automatically.

## Placement and optional capture

Session target is authoritative CSS pixels; contain preserves aspect ratio within exact frame/slot. Descriptors may include local static PNG/JPEG/WebP and declared fonts, contained in explicit resource roots. Capture is an optional lazy consumer dependency. Explicit setup is pnpm add -D playwright@1.59.1 then pnpm exec playwright install chromium; install OS dependencies separately if needed. An existing browser executable may be supplied explicitly and its actual version is recorded; no automatic fallback/download/config change.

Sidecars record actual SVG/PNG/fingerprint/style/placement hashes, theme/crop/DPR/dimensions/browser/OS/fonts and inspected:false. Readiness checks do not establish glyph coverage or artwork semantics. Open actual PNGs and write separate evaluator notes; successful check/capture is neither image inspection nor user approval. Preserve outputs and report missing prerequisites honestly.

## Public API and embedding

The typed root exports session/project loading/validation, context/hashing/materialization, style/refinement, placement/capture, scaffold/route ownership and rendering/source-aware exports. Public subpaths are ./model, ./render, ./client/mount, ./client/app.css, ./schemas/* and ./skills/diagram-gen/*. Read src/index.d.ts and packaged references for current signatures. JSON shapes plus runtime validation govern paths/hashes/resources, not facts or aesthetic acceptance.

Browser mountDiagramApp and mountProjectApp are exported through client/mount with disposal functions; import client/app.css and dispose on island cleanup. Embedded mode follows host UI theme while artwork theme remains separate. The root documentation site embeds through zudo-doc chrome bindings; consumers do not copy its implementation. Generated pages select zfb3 zudo-react or compatible zfb2 Preact. Use installed public imports in verification; a source shortcut hides packaging defects.
