# ZFB 4.3 consumer rollout

## Bounded plan and scope

Starting default `main`: `805e0304d051a9ac03d2a404d2268b2ee82fbe79`, refreshed 2026-10-10. No matching open migration PR or remote ZFB topic/base branch existed; unrelated Dependabot work was left alone. Issue #63 and merged PR #64 establish the existing ZFB 2/3 split; upstream umbrella Takazudo/zudo-front-builder#3879 was checked before testing.

1. Verify the exact published packages and CLI/SDK contract.
2. Extend destination-installed binary/renderer selection to major 4, retaining major 2's Preact route and major 3's zudo-react route. Pin new hosts to SDK/runtime 4.3.0 and support `^2.21.1 || ^3.2.0 || ^4.3.0` only after representative packed tests.
3. Verify installed ordinary/project consumers on all three version floors, reserved JSON text, build/preview/export/browser behavior and 4.3 dev changes/recovery. Keep esbuild as the default; generated `defineConfig({})` has no backend override.
4. Verify the retained root, push a draft PR, and follow its final-head CI. Native Mac acceptance is separate; no merge, deployment or publication.

Only the engine peer specifier changes in `pnpm-lock.yaml`. Root SDK/runtime/md-wasm remain 2.21.1, zudo-doc remains 5.27.0, and their complete resolution tree is unchanged. No overrides, deduplication, root migration, viewer CSS change or package publication. The generated host needs SDK/runtime, not md-wasm; no unnecessary md-wasm dependency was added.

## Published-package verification

`npm view <package>@4.3.0 version dependencies optionalDependencies dist.integrity --json` verified the exact npm registry packages. The packed SDK manifest exports `./package.json`, `./zudo-react`, `./config`, and `bin/zfb.mjs`, matching the existing consumer seams.

| Package | Version | Registry integrity |
| --- | --- | --- |
| `@takazudo/zfb` | 4.3.0 | `sha512-kMGZThSgvDMPrRyed+0BkERrYrUe63E+J5XuWMq5+i0gNVIxVsckzkx6Os9htyps5fKB3X1r/sttQe65Kkd3bA==` |
| `@takazudo/zfb-runtime` | 4.3.0 | `sha512-YNTxnG8h6YCfnlF5nWYSrEMQuHO/gz2GpOecbbSCOeASYB04cKeIG4IYfDXPq/t4lDkfhU/qjaOoytqFMcNr7g==` |
| `@takazudo/zfb-md-wasm` | 4.3.0 | `sha512-V1eNS80gcarjXTQVkTdWU0lpesdbdY9c6hDYDKumRTG9Yt1PixaDbSEAAaHrmXed7xTCvsOig51LAx+DCxOY5w==` |

SDK's slugify and Linux x64/glibc optional binary packages are 4.3.0. Runtime declares its own Hono dependency. md-wasm 4.3.0 was verified as published; it is not consumed by the generated diagram host and was not exercised as a direct API. The documentation host still consumes md-wasm 2.21.1.

## Local implementation evidence

Linux x64/glibc, Node 24.19.0, pnpm 10.30.3, Playwright 1.59.1 / Chromium 147.0.7727.15. Cache/store/browser locations were placed under `/tmp` because managed home caches are read-only. Heavy build/browser commands ran through the host's machine-wide `heavy-guard.sh`.

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile --strict-peer-dependencies` | Pass; root tree unchanged |
| `pnpm check` and `pnpm exec zfb check` | Pass; retained root collection/typecheck |
| `pnpm exec eslint .` | Pass |
| `pnpm format:check` | Pass |
| `pnpm test` | 24 files / 265 tests pass |
| `pnpm check:examples` | All six fixtures, 24 tones / 98 offline resources pass |
| `pnpm pack:local` | Both local archives built; no publication |
| guarded `node scripts/check-zfb-consumers.mjs` | Six packed consumers pass; final guard verdict PASS, 48 seconds |
| guarded `pnpm build` | Retained root: 60 pages, PASS |
| `node scripts/check-built-links.mjs` | 2,973 local links across 59 HTML pages pass |
| guarded `pnpm check:site-browser` | Routes/widths, hydration, review persistence, search/keyboard isolation, theme synchronization and missing-dark state pass |

Both archives were extracted/installed outside the source checkout. The matrix asserts installed public exports resolve under each consumer's own root and exact SDK/runtime versions match 2.21.1, 3.2.0 or 4.3.0. Each version has an ordinary session and a two-session project, with populated and empty routes. Commands per consumer: strict-peer install, check, build, `tsc --noEmit`, `zfb check`, Wind audit on 3/4, HTML export, local preview. Browser assertions cover card counts, search, keyboard inspect, literal reserved-marker recovery, dark-theme exact SVG download, review download/import and reload persistence, and offline HTML mount.

The 4.3 ordinary consumer also runs native Linux dev mode: edit brief, add candidate, observe invalid-content diagnosis while generated route/last-valid data remain intact, restore/remove candidate and remount in Chromium. CI runs the same matrix and preserves `test-output/zfb-consumers.json`; existing P07/P11 browser and watcher gates remain intact.

Local tested archive SHA-256 values:

- Engine: `3180cf95c6b460eb8fb0c52f3c6d9bed10eae2db23a3faafe14c588b485936aa`
- Initializer: `c5a9246c345cc86f7c8380ca3af5ec320091058799a6ae1598219ef058fcb4f0`

The first harness attempts failed on a non-exported runtime manifest lookup and an ambiguous project selector. Both were corrected, with all assertions retained, before the successful final matrix. No reproducible new upstream ZFB bug was found. Existing reserved-marker transport remains in use and is verified on both zudo-react majors.

## Remaining platform acceptance

[Issue #105](https://github.com/Takazudo/zudo-diagram-gen/issues/105) owns the unrun native Mac binary/FSEvents and browser/IME acceptance. Linux/Chromium does not cover those platforms. Root migration remains independently deferred under [issue #63](https://github.com/Takazudo/zudo-diagram-gen/issues/63). No preview deployment is triggered by this repository's PR workflows; the deployment workflow only admits successful push CI on main.
