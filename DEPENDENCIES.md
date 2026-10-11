# Dependency maintenance evidence

Issue [#107](https://github.com/Takazudo/zudo-diagram-gen/issues/107), 2026-10-11.
Baseline: integrated consumer-support PR #106, main
`ce7cf677a3d002518a3b9b988a61cdc8fa7bedd5`. Historical verification records remain unchanged.

## Selected stack and provenance

The root uses zudo-doc **6.0.0** and ZFB/runtime/md-wasm **4.3.1**.
Registry dist-tags, tarball exports, peers, engines and integrity were inspected before
selection; zudo-doc 6 requires ZFB `^4.3.1`, so 4.3.0 is only a consumer control.
Published tarballs, rather than upstream private build tooling, define this migration.
The upstream release tags resolve to zudo-doc
`b4f974598b27064a092eeadb5b2e5559078a8bb9` and ZFB
`c14ea1fcebee4fed892aeaef6559c9446496ea58`; npm supplied no gitHead.
The lockfile records actual tarball integrity. The first-party resolver was run in
separate dry-run and write invocations. No historical source pin file existed.

Node remains `>=22 <25`, pnpm **10.30.3**, mdx-formatter **1.3.0** and
Node types **22.19.7**. Project declarations retain exact pins; workspace specs and
the engine's compound ZFB 2/3/4 peer range are preserved. Generated defaults use
ZFB 4.3.1 and TypeScript 6.0.3. Fresh consumer controls cover 2.21.1, 3.2.0,
4.3.0 and 4.3.1 independently.

## Reduction decisions

Three independent skeptical reviews considered hidden consumption, fidelity and
value/churn. These are root declaration removals, not claims that all six packages
vanished from the resolved graph. No dependency was replaced with bespoke code.

| Candidate | Decision and evidence |
| --- | --- |
| preact | Remove root declaration: migrated wrapper uses published zudo-react activation, signals and cleanup. Retain engine optional peer and intentional ZFB 2 fixtures. Still resolved through peers. |
| preact-render-to-string | Remove: no migrated root import or ZFB 4 native consumption; legacy ZFB 2 fixtures explicitly install their required renderer. Absent from root lock graph. |
| tailwindcss | Remove: published zudo-doc 6 uses Wind; obsolete directives and safelist import removed. Generated showcase classes have an explicit Wind manifest and browser geometry checks. Absent from graph. |
| hono | Remove root declaration: native ZFB runtime consumption is supplied by runtime's own dependency. Remains transitive. |
| diff | Remove root declaration: published doc-history import belongs to optional history support, disabled here. Remains auto-resolved as zudo-doc optional peer. |
| katex | Remove root declaration: math is disabled and no site math content uses it. Remains auto-resolved as zudo-doc optional peer; audit hold below. |
| zod | Keep: required zudo-doc 6 peer. |
| zfb-md-wasm | Keep: home introMarkdown invokes parse/render exports. |
| engine saxes | Keep: real XML/SVG parser, including validation and byte-preserving export contracts. |
| optional Playwright | Keep: explicit capture capability; root, engine exact optional peer, diagnostics, docs and installed-consumer test agree on 1.63.0. Missing capability retains CAPTURE_UNAVAILABLE / exit 3. |
| development/hook/CLI tools | Keep: current scripts, formatting, checking, tests, packaging and production automation consume them. |

## Counts and deduplication

Counts below enumerate lockfile `packages` records, including platform optional
packages, not installed disk usage. Declaration counts exclude peer declarations.
No installed-size saving is claimed.

| Measurement | Integrated baseline | Post-upgrade, before reduction/dedupe | Final |
| --- | ---: | ---: | ---: |
| Root runtime declarations | 12 | 12 | 6 |
| Root development declarations | 13 | 13 | 13 |
| Engine runtime declarations | 4 | 4 | 4 |
| Initializer runtime declarations | 0 | 0 | 0 |
| Resolved package records | 416 | 395 | 387 |
| Audit total dependency count (includes workspace roots) | 419 | 398 | 390 |

Baseline `pnpm dedupe --check` found no change. After upgrades it proposed moving
the engine's local optional ZFB peer from 2.21.1 to the already installed 4.3.1,
removing six old SDK/platform records. This was deliberately applied separately;
legacy compatibility is checked with isolated packed installs rather than relying
on the workspace peer selection. Reduction removes two further records (renderer
and Tailwind). Final `pnpm dedupe --check` reports no changes.

The security refresh also updates source-map-js 1.2.1→1.2.2, PostCSS
8.5.28→8.5.29, nanoid 3.3.19→3.3.20, Rolldown 1.2.11→1.2.13 and its platform
bindings/types. These are reviewed dependency deltas, not reduction savings.
The default ZFB backend remains esbuild. Wrangler's esbuild alignment eliminates
the earlier duplicate esbuild/platform family.

Eight version-duplicate groups remain: trace-mapping, unist types, commander,
entities, eslint-visitor-keys, hookified, ignore and ws. Their callers retain
separate compatible ranges or pinned versions; forcing a single version would
cross contracts. Peer-specific snapshots likewise are not redundant copies that
can safely be hand-merged. All lockfile changes were generated with pnpm.

## Security and bot dispositions

Baseline audit: **13 findings (4 high, 5 moderate, 4 low)**. Final audit:
**1 low, zero high/moderate/critical**. Wrangler 4.149.0 supplies patched
undici 7.29.1 and sharp 0.35.5; source-map-js 1.2.2 resolves
GHSA-68fv-2mgg-jv7q. No audit ignore was added.

Remaining low finding: KaTeX 0.16.38, GHSA-238p-pmpm-9mq7, inherited-options
behavior after pre-existing prototype pollution. It is an optional zudo-doc peer;
math is disabled. Patched 0.18.2 is outside zudo-doc's `^0.16.0` range. Retain a
visible hold rather than force an unverified upstream peer override.

| Bot PR | Replacement/hold |
| --- | --- |
| #24–27 | SHA-pinned upload-artifact 7.0.1, setup-node 7.0.0, checkout 7.0.1 and pnpm/action-setup 4.1.0. Inputs, artifact names/retention, credential behavior and production gates retained. pnpm's old annotated-tag SHA peels to the selected commit. |
| #58 | Full group reconciled: happy-dom 20.14.5, Playwright 1.63.0, typescript-eslint 8.71.0, Wrangler 4.149.0. Newer Wrangler fixes findings still present in the bot's earlier proposal. |
| #59 | TypeScript 6.0.3. Correct package-owned CSS export declaration fixes TS2882; no typechecking suppression. TS7 is outside the selected eslint integration's supported range. |
| #60/#61 | Root Preact declarations superseded by verified framework migration; legacy fixtures remain intentional. |
| #62 | Hold open: Node 26 types do not match the promised Node 22–24 API surface. |

Bot closures require confirmed merge of the replacement PR; this file does not
claim an unmerged replacement has already closed them.

## Verification and limitations

The integrated baseline passed the guarded eight-component b4push suite,
including 265 tests. The migration adds three lifecycle tests for one live mount,
abort/disposal, late responses and fetch failure (268 tests total). Root browser
checks exercise desktop/mobile layout, generated Wind sizing, theme, keyboard,
filters, zoom/placement, review transfer/persistence, actual search navigation,
TOC and console errors. Scaffold sync and strict installed CSS export checks
cover generated/distributable boundaries.

Reduction-only fingerprints preserve SVG and CSS bytes. Generated island chunk
names/build identities can vary; compare normalized output separately from the
intentional framework/documentation upgrade. Independent same-source scratch builds (six declarations re-added, then removed)
confirmed 277 non-HTML files byte-identical and all 59 HTML files equivalent after
normalizing only emitted JavaScript filenames and build identities. Main JavaScript
remains 289,012 bytes; its changes are two identities and one chunk reference. The
renamed 308-byte disabled design-token-panel stub is itself byte-identical.

This cloud's Playwright CDN returns HTTP 403, and system Chromium 154 prohibits
file navigation. Local live-browser evidence uses that explicitly selected
system browser. Matching Playwright Chromium and detached-file acceptance must
pass current-head CI before merge; unavailable local checks are not passes.
Native macOS/Safari/IME acceptance remains separately unrun in #105. No manual
deployment, package publication or release is part of this change.
