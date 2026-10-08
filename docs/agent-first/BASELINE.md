# P00 baseline — 2026-10-07

Unmodified default branch `main` and integration starting point: `5153aa8c9097137cb968f620141e5e3d2d46c1c5`, rechecked at development start. The historical planning SHA happens to match. Baseline commands were run by the coordinator in the unchanged root checkout; this topic changes only documentation/public inputs. Node 24.19.0, Corepack pnpm 10.30.3, Debian 13, package versions 0.1.0. Root zfb/zfb-runtime/zfb-md-wasm 2.21.1, zudo-doc 5.27.0, Preact 10.29.2; generated consumer zfb/zfb-runtime 3.2.0 and zudo-react. TypeScript 5.9.3, Vitest 5.0.2, Playwright 1.59.1. Preserve both host dialects; root migration issue 63 remains separate.

## Unmodified gates

| Gate | Result | Evidence / limits |
| --- | --- | --- |
| `CI=true corepack pnpm install --frozen-lockfile` | pass | Existing ignored lefthook/workerd build-script policy unchanged. An initial default-pnpm-11 config mutation was fully reverted before baseline; all recorded runs use Corepack 10.30.3. |
| `corepack pnpm format:check` | pass | baseline-format-check.log |
| `corepack pnpm lint` | pass | baseline-lint.log |
| `corepack pnpm check` | pass | baseline-check.log; showcase + TypeScript |
| `corepack pnpm test` | pass | 55 tests in six files; baseline-test.log |
| `corepack pnpm check:examples` | pass | six sessions, 16 candidates, 24 tones; baseline-check-examples.log |
| guarded `corepack pnpm build` | pass | guard verdict PASS; 35 pages; baseline-build.log |
| `node scripts/check-built-links.mjs` | pass | 1,182 links across 34 HTML pages |
| `corepack pnpm exec zfb check` | pass | Existing root host remains supported |
| `corepack pnpm pack:local` | pass | Engine 118 files / 129,304 archive bytes; initializer five files / 8,763 bytes. Initial npm-cache sandbox denial resolved by scoped escalation; baseline-pack.log. |
| Fresh packed consumer | pass | `/tmp/diagram-baseline-consumer` created through npm exec from initializer archive, strict-peer install, own node_modules engine resolution, empty/populated checks, exact dark SVG `cmp`, HTML export, guarded one-page build, zfb check and wind audit. baseline-consumer-build.log. |
| Standalone browser | pass locally with environment substitution | Nine unchanged script groups passed on system Chromium 151.0.7922.173 via an external launch-executable harness; no repo assertions changed. Guard PASS; baseline-browser.log. |
| Embedded site browser | pass locally with environment substitution | Six routes at 1280/390 CSS px plus workbench/theme/missing-dark interactions; baseline-site-browser.log. |
| Exact pinned Chromium / offline file | pass in baseline CI; local capability unavailable | Pinned Chromium 1217 CDN download locally returned HTTP 403 `Domain forbidden` even with escalation. System-browser local `file://` returned `ERR_BLOCKED_BY_ADMINISTRATOR`; not bypassed. These are local restrictions, not code failures. Exact-SHA CI below passed browser install, both suites and check-offline-file. |

Coordinator logs are local evidence at `/workspace/diagram-evidence/baseline-*.log`; these machine paths are evidence locations, never application defaults or packaged data. Coordinator actually inspected desktop artwork/controls/placement and narrow one-column workbench screenshots in ignored test-output. Browser interaction and image inspection are separate from build success and do not establish factual/user approval of drawings. Noto CJK fonts were available locally; font/build/browser differences remain relevant for later pixel comparisons.

[Baseline CI run 37633593815](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/37633593815) passed on the exact unmodified SHA above, including format/lint/types/tests/examples, root and installed-consumer builds, links/preview routes, pinned Chromium interaction suites and offline-file check (job 112833892400). [Security run 37633593744](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/37633593744) also passed. [Browser artifact 11487498010](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/37633593815/artifacts/11487498010) retains CI screenshots. This settles the baseline pinned/offline gates without claiming that the locally blocked operations ran. No newly introduced failures or unresolved baseline acceptance checks are recorded. Optional live third-party link reachability was not audited; it is separate from required deterministic local-link checks.

## Current inventory and executable boundaries

There are 24 catalog entries/directories, 24 recipes and 72 SVG references: 24 editable source.svg, 24 light.svg and 24 dark.svg. Catalog version 0.1.0. IDs in order: fine-outline, soft-fill, ink-silhouette, offset-blocks, editorial-serif, swiss-grid, ui-miniature, contour-wash, technical-blueprint, isometric-wire, isometric-solid, paper-layers, pencil-notebook, marker-workshop, chalkboard, risograph-duo, cut-paper, halftone-manual, pixel-schematic, terminal, circuit-route, transit-wayfinding, modular-geometric, luminous-glass. No scheme.json, kit.svg or bundledReferences descriptors exist at baseline.

Catalog recipe text is duplicated in each recipe.md; numeric prose currently exists in both surfaces (for example fine-outline's 1.6-unit strokes and 720 by 400 canvas). Recipes also repeat example viewBox/label-size guidance. P02/P03 must establish scheme authority and checked/generated summaries, preserving explanatory intent. Historical counts are observations, not forever acceptance constants.

The known private-manual URL is `https://github.com/zudolab/zudo-pattern-gen/blob/develop/manual/src/content/docs/composer/index.mdx`: **48 current occurrences**, 24 catalog sourceReferences plus one in each of 24 recipe.md files. This re-count is scoped to current tones Markdown/JSON and does not classify a remote 404 as proof of privacy. Public IBM and other inspiration URLs coexist in HTTP(S) sourceReferences; P01 supplies local meaning and keeps optional live auditing separate.

Published baseline schemas: common, session, round, candidate and tone-catalog (JSON Schema draft 2020-12). Actual runtime is handwritten validation in model.mjs, not automatic schema execution; normalization explicitly projects known fields and discards unknown metadata. Runtime/schema/types agreement for new contracts therefore needs deliberate tests.

Six ordinary examples: project-zzmod, project-pattern-gen, tone-exploration, project-text, project-doc-cloud, project-ez-host. There are 16 candidates / 32 declared theme SVGs. Single-session candidate IDs must be unique; no separate project manifest/loader exists. Earlier-round parent/baseline lineage and contained UTF-8 SVG assets are enforced. Fingerprint hashes existing normalized metadata + SVG text; contentHash hashes normalized GalleryData. Browser version-one review import/storage compares these fingerprints and retains stale snapshots rather than source writes.

Current exports: root `.` (types/index.mjs), `./model`, `./render`, `./client/mount` with types, `./client/app.css`, `./schemas/*`. Engine package files: src, client, tones, schemas, README.md, LICENSE; initializer: bin, src, README.md, LICENSE. Engine source ships directly, standalone client bootstrap is regenerated at prepack, capture browser is only a root devDependency. `createProject` scaffolding currently lives in initializer src/index.mjs. It refuses nonempty/symlink destinations, uses exclusive writes and installs only with --install. Runner `prepareProject` currently prepares an ordinary session route despite its name; it is not a multi-session API.

Existing CLI: check/dev/build/preview/export/export-html/tones list/tones show only. check --json emits `{ok,errors,warnings,summary}`; tones list --json emits `{version,tones}`; tones show --json emits tone metadata plus complete SVG examples. Errors are stderr text and exit 1; no stable code envelope. SVG export copies validated original UTF-8 bytes and rejects source overlap; export-html currently lacks that protection. No create/inspect/resume/capture/lock/project command, scheme/kit or installed core skill is claimed. See [CONTRACTS.md](./CONTRACTS.md) for proposed corrections and additions, not implemented behavior.
