# Product documentation acceptance — issues 112–116

Implementation PR: [#117](https://github.com/Takazudo/zudo-diagram-gen/pull/117), targeting main `996c3c0c32a14f0870ab0670fb429c53282ff27c`. The PR's final verification comment binds the exact head, test-merge SHA and Actions runs; this record describes the checks rather than treating historical P10/P11 evidence as current.

## Scope and preservation

[Documentation ownership](documentation-structure.md) inventories all 59 pre-change documentation routes and the frozen fixture retains 106 actual heading IDs. Every canonical URL remains useful. Plugin assembly/host acceptance and saved-style tasks have new authoritative pages; old headings retain specific links. The primary navigation is Start here, Guides, Tones, Examples, Reference. Contributors and Changelog remain secondary; the sample workbench remains an explicit action.

Home uses published layout/chrome APIs, existing tone/session previews and a short product/workflow explanation. Generated content changes originate in `scripts/build-showcase.mjs`. No package, engine/client implementation, plugin skill, schema, example artwork, dependency or deployment workflow changes belong to this PR. Documentation-host CSS reflows embedded controls only at extremely narrow widths; normal workbench behavior stays covered by its existing suite.

The owner logo remains Git blob `49da7aeff2551154e8c2b83a417be92556bc85e7`. It is an unchanged image on a light background in both themes. Generator tests cover clean generation, repeated identical manifests, all 24 tones and ownership/hash-aware cleanup. Historical P10/P11 and handoff records remain unchanged.

## Reproduction and evidence

Local runtime: Node 24.19.0, pnpm 10.30.3. Heavy builds/consumer/browser suites use the installed heavy guard; browser runs also use the installed Playwright guard. Logs/evidence remain outside tracked source or in ignored `test-output/`; no Git LFS.

The baseline build and original browser suite passed before restructuring. The original checker verified 3,210 links across 61 HTML files but ignored fragments. The new checker verifies actual rendered IDs, same-page/encoded fragments, workbench candidate identities and the complete baseline fixture; deliberate missing/invalid/escaping links fail its test. Revised output has 68 HTML files (69 build outputs including the framework's non-HTML route), 66 search entries, and 509 checked fragment references. All 59 legacy documentation routes and 106 original heading targets remain valid.

Commands used for acceptance:

```bash
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm format:check
pnpm lint
pnpm check
pnpm exec zfb check
pnpm exec zfb wind audit --fail-on error
pnpm test
pnpm check:examples
pnpm build
node scripts/check-built-links.mjs
pnpm exec playwright install chromium
pnpm check:site-browser
pnpm pack:local
EVIDENCE_ROOT="$(mktemp -d /tmp/zdg-docs-ia.XXXXXX)"
node scripts/check-docs-consumer.mjs "$EVIDENCE_ROOT/reader"
```

The local pinned Chromium download failed with HTTP 403 `Domain forbidden` from the browser CDN. Local browser checks therefore explicitly use `SITE_BROWSER_EXECUTABLE=/usr/bin/chromium` (Chromium 151.0.7922.173). Default CI continues to install and run Playwright's pinned Chromium, with no fallback or weakened checks. This distinction matters: local system-browser evidence is not pinned-browser evidence.

The fresh reader run at `/tmp/zdg-docs-ia.G5dePo/reader` completed 61 operations against `/tmp/tmp.3tZpjn3VVG/diagram-session`, resolving the installed engine within that consumer's `node_modules`. It executed actual marked public fences: initialize, skill copy and safe repeat refusal, materialization, project setup, manual SVG/metadata, review/refinement and exact saved-byte export, plus all 24 contexts, lock/adopt, error paths and schema/package exports. Fence locations stay unchanged because those command-bearing pages retain their paths. An initial attempt before packing correctly failed for missing archives; it was rerun in a new evidence directory after `pnpm pack:local`.

The contributor page's actual displayed assembly fence also passed, including strict frozen install, `pnpm plugin-pack`, fresh unzip and `--verify-dir`: 24 tones, 217 files, inventory SHA-256 `281a59d97d1869a2d74aa93e78244568beb07e2318b997d887bb51c47d0b760b`. This proves assembly/extraction, not host installation or publication.

CI adds the same reader runner and retains all existing consumer/P07/P11, watcher, offline, ZFB 2/3/4 and security controls. The screenshot artifact includes `docs-ia-*.png`, viewport measurements and the reader result. An early draft run exposed an untracked new browser helper; final verification must use the subsequent complete head, never that failed or an older successful run.

Local full unit testing initially passed all 269 tests. Later runs, including the unit step of `b4push`, showed varying 10-second timeouts in unchanged materialization/style tests and a watcher settling assertion. Those runs are failures, not green aggregate acceptance. No test or timeout was weakened. The final-head CI run is the authoritative full-suite result, recorded in the PR completion comment alongside these local limitations.

## Browser and separate review

The extended browser suite preserves hydration, filters, inspect/compare, 360 × 200 placement, zoom, downloaded/imported/copied review, persistence, missing dark assets, host-theme synchronization and search/shortcut isolation. It additionally exercises both Home → Start here → quickstart paths within two activations, manual and task/reference/contributor journeys, editorial active navigation/sidebar/breadcrumbs, pager presence, slashless direct load, anchors/reload/Back, canonical searches for plugin/export/style lock/capture, keyboard focus and mobile menu access/dismissal.

Screenshot matrix: Home, Start here, a guide, CLI Reference, Tones, Examples and Workbench; light/dark; 1280/390 physical pixels; 100%/200%. The 200% run emulates browser zoom's CSS viewport and device-pixel ratio (640/195 CSS pixels at DPR 2), not a screenshot-only scale or CSS `zoom`. It establishes responsive reflow, not operation of the browser's own zoom UI. Full-page Home images wait for the existing lazy previews to decode before capture. Screenshots are actual browser output and are inspected separately from automated assertions.

The read-only reviewer identified the legacy-prefix double-active header, Changelog pager ordering, missing contributor active-state coverage, premature lazy-image screenshots, optional skill-copy wording and excessive heading sizes at 195 CSS pixels. The implementation addresses these through public header composition, preserving framework pagination outside curated sections, broader behavioral assertions, decoded images, explicit installed-path guidance and a narrow-screen heading cap. Additional scrolled Tones/Workbench screenshots expose the controls at 390px/200%. Final review/visual observations and exact check outcomes are bound in the PR completion record.

## Integration hold

PR #109 remains separate, open/draft at `49a64e2a96cd2c7c414e872a5cbd9790ad983363`; no release-tooling work is adopted. Issues #62/#95/#100/#105 are outside this delivery. Actual ChatGPT installation, native Mac/Safari/IME acceptance and registry/release publication are not claimed.

Keep #117 and #112–#116 open until authorized integration. Merging main can trigger production deployment through the existing successful-push-CI gate. No deployment authority was supplied, and no non-deploying integration path was authorized/verified. Do not change gates, skip checks or cancel a deployment to work around this hold.
