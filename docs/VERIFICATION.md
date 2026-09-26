# Verification report

## Repository import baseline — 2026-09-27

The source inventory and exclusions are recorded in [SOURCE-IMPORT.md](./SOURCE-IMPORT.md). This fresh-checkout baseline used Node.js 24.13.0 and Corepack pnpm 10.30.3. `corepack pnpm install --frozen-lockfile` passed, followed by `node scripts/build-showcase.mjs`, which reported 24 tones, six sessions, and 16 candidates. `corepack pnpm check` passed; `corepack pnpm test` passed all 42 tests; `corepack pnpm check:examples` passed all six sessions and the 24-tone catalog. A review finding led to making `pnpm check` prepare the ignored showcase files itself, so a fresh checkout does not require a manual preparation command.

The source-import worker did not run `pnpm build`; the project manager will run that heavy check against the merged base through the machine-wide heavy guard. Browser interaction checks and packed-consumer checks are also owned by later tasks. The results below describe the earlier supplied handoff, not checks performed on this repository import.

Recorded on **2026-09-26 UTC** for the first `0.1.0` source handoff.

## Environment

| Tool | Version |
| --- | --- |
| Node.js | 24.19.0 |
| pnpm | 10.30.3 |
| zfb | 2.21.1 |
| zudo-doc | 5.27.0 |

## Completed checks

| Check | Result |
| --- | --- |
| Automated tests | **42 passed:** 13 initializer, 18 engine, 3 root rendering/watcher, and 8 Happy DOM tests. |
| `pnpm check` | Passed TypeScript checking. |
| Example validation | All **6 sessions**, **16 candidates**, and **32 declared theme SVG assets** validated with zero errors and zero warnings. |
| Tone collection validation | All **24 profiles** and **48 reference theme SVG assets** validated with zero errors and zero warnings. |
| `pnpm build` | Passed with zfb 2.21.1 and zudo-doc 5.27.0; produced **31 routes**, comprising 30 HTML pages and `robots.txt`. |
| Built-site link inspection | Inspected **658 local `href`/`src` references** with zero missing targets. |
| Local package archives | Engine and initializer archives generated. Engine prepack validation checked JavaScript syntax, the tone catalog, and rendering. |
| Standalone HTML output | Workbench and tone-catalog HTML snapshots exported. |
| Documentation structure | Inspected 19 MDX pages for required frontmatter and internal documentation links; zero findings. |

These checks cover the source contracts, generated output, DOM behavior exercised by the test suite, and package preparation. They do not establish that every viewer interaction or layout is correct in a real browser.

## Independent packed consumer

The initializer archive was invoked through `npm exec --package <initializer.tgz>` to create a fresh workspace outside the monorepo. That workspace installed the engine from its local archive using pnpm 10.30.3. Initial empty-session validation and a zfb build passed.

These checks caught missing direct host dependencies needed by zfb's generated entry and development renderer. The initializer now declares `@takazudo/zfb-runtime` 2.21.1, `preact-render-to-string` 6.6.6, and `hono` 4.13.9 alongside zfb and Preact. The dependency assertions in the initializer test cover those declarations.

A fresh consumer using the packed engine subsequently completed the following checks:

| Check | Result |
| --- | --- |
| `check --json` with an example candidate | `ok: true`; one round, one candidate, light and dark assets, zero errors and warnings. |
| `build` | zfb successfully built one page. |
| `export-html` | Produced a standalone review HTML file. |
| Dark SVG export | Exported 4,452 bytes; a byte comparison matched the source exactly. |
| Development server | **Two complete runs passed all eight HTTP checks** listed below; both servers exited cleanly. |

The eight development checks were: serve an empty session; discover an added candidate; update an edited SVG and its fingerprint; preserve the last valid gallery during incomplete metadata; resume after metadata repair; update the brief; remove a deleted candidate; and restore a re-added candidate. They exercised the installed package and the actual zfb server without restarting it between content changes.

The root project development server also served the home page, the 24-entry tone catalog, the 11-candidate workbench, and a documentation route successfully. Its renderer ran without missing-dependency errors.

### An observation to recheck locally

During an earlier combined check, a deleted candidate directory unexpectedly reappeared with earlier incomplete metadata. That observation did not recur in either of the two subsequent isolated consumer runs. The cause was not established, and no change based on an assumed cause was made. Neither the model nor the runner writes candidate source content. Recheck rapid edit/delete sequences locally; there is insufficient evidence to attribute the observation to zfb or to declare a reproducible application defect.

## Real-browser verification remains local

A supported real browser was unavailable in this session. The eight Happy DOM tests exercise DOM-level behavior; they do not verify browser layout, painting, pointer gestures, or the appearance of actual-size previews.

Continue with the browser acceptance matrix in [CODEX-HANDOFF.md](./CODEX-HANDOFF.md). In particular, check zoom/pan, clipping and contrast, responsive controls, keyboard focus, clipboard/download/import behavior, review persistence, live candidate changes, and exports opened independently.

SVG validation confirms the supported file structure and references. It does not judge whether an explanation is factually correct or visually clear in a target application's help dialog.

## Scope of this handoff

The packages have not been published to npm. The project website has not been hosted. The proposed core `/diagram-gen` skill and personal `/my-diagram-gen` wrapper have not been created or installed as part of this app build.

Review state remains browser-local until copied or downloaded. There is no source-directory feedback-write endpoint or automatic agent-resume channel in this version.
