# Verification report

## Current source-handoff evidence — 2026-09-27

The repository declares Node.js `>=22 <25` and pnpm `10.30.3`. The import check used Node.js 24.13.0 and Corepack pnpm 10.30.3. CI uses those exact versions on Ubuntu, installs with `pnpm install --frozen-lockfile`, then runs `pnpm check`, `pnpm test`, `pnpm check:examples`, and `pnpm build`. A workflow file is not evidence of a successful remote run; check GitHub Actions after the branch is merged.

| Scope | Recorded result | Evidence limit |
| --- | --- | --- |
| Fresh source import | Frozen install, showcase preparation, check, 42 tests, and example/catalog validation passed. Showcase reported 24 tones, six sessions, and 16 candidates. | Source-import worker did not run build. See [SOURCE-IMPORT.md](./SOURCE-IMPORT.md) for file and manifest provenance. |
| Installed-consumer worker | Check, 44 tests, examples, and `pack:local` passed. Both archives had the expected inventory. A fresh host outside the monorepo resolved the engine under its own `node_modules`, checked an empty and then populated session, and exported light/dark SVGs and HTML. | This worker did not run a guarded consumer build or a held server. The content watcher now hashes file contents and does not traverse a symlinked `rounds` tree; regression tests cover same-size edits and delete/re-add. |
| Browser-workbench worker | Frozen install, check, 45 tests, and examples passed. A DOM regression verifies that review import replaces notes, shortlist, and direction together. | No real-browser, native file picker, clipboard, pointer, or layout check was run by this worker. |
| This integration worktree | Node.js 24.13.0, Corepack pnpm 10.30.3: frozen install, check, all 45 tests, and example/catalog validation passed on `topic/integration-ci`. | The worktree started at merged prerequisite `9aa28e4`; CI status, guarded build, live servers, and real-browser checks require separate evidence. |

The import, installed-consumer, and browser-worker results above come from their 2026-09-27 foreground review records. They are separate checkouts in the same source-handoff sequence; the increasing test counts reflect added regression tests. Do not combine them into a claim that a full end-to-end suite passed on the merged base.

## Earlier supplied handoff — historical evidence

The supplied `0.1.0` source handoff recorded Node.js 24.19.0, pnpm 10.30.3, zfb 2.21.1, and zudo-doc 5.27.0. Its recorded run had 42 automated tests, six validated sessions with 16 candidates and 32 declared theme SVGs, and 24 validated tone profiles with 48 reference theme SVGs. It reported a zfb build with 31 routes (30 HTML pages and `robots.txt`), inspection of 658 local `href`/`src` references with no missing targets, 19 MDX pages checked for frontmatter and local documentation links, local package archives, and standalone workbench and tone-catalog HTML exports. Those are results from the supplied handoff, not reruns against this imported repository.

The earlier packed-consumer run reported a fresh generated host outside the monorepo with empty and populated session checks, a build, standalone export, byte-matched dark SVG export, and two clean live-server runs. Each server run checked empty session, candidate add, SVG/fingerprint edit, incomplete metadata retaining the last valid gallery, repair, brief edit, deletion, and re-addition. The root development server also served home, tones, an example workbench, and a docs route. These results predate the current watcher and review-import fixes and must not stand in for a merged-base live-server run.

An earlier combined run once observed a deleted candidate directory reappear with incomplete metadata. Two subsequent isolated consumer runs did not reproduce it. No cause was established. Include rapid edit/delete/re-add in the next live-server check.

## Manager-pending integration gates

| Gate | Exact follow-up |
| --- | --- |
| Merged-base build and built routes | Run `pnpm build` through the machine-wide heavy guard. Inspect home, `/tones/`, `/examples/`, a workbench route, and a docs route; check built local links. |
| Installed consumer build | Repack local archives and install in a fresh directory outside this checkout. Confirm `import.meta.resolve` points into that host's `node_modules`, then run its check and guarded build. |
| Live development and preview | Start disposable root and consumer servers. Repeat the eight live-file transitions above, including rapid edit/delete/re-add, and verify the built preview routes. Stop both servers. |
| Real browser | Run the [browser acceptance matrix](./CODEX-HANDOFF.md#browser-acceptance-matrix) on the project and packed consumer: keyboard/focus, filters and stable identity, theme/backdrop, placement size, zoom/pan, narrow layout, persistence, copy/download/import, stale review, invalid import, and independent exports. Also reimport the same JSON file through the native picker after changing feedback. |
| Remote CI | After the workflow reaches GitHub, verify the pull-request run and main run rather than inferring success from local checks. |

Heavy local runs use `bash "$HOME/.codex/scripts/heavy-guard.sh" -- <command>`. An exit 75 means the suite never ran. Follow `AGENTS.md` for `ENV_SUSPECT`, `FAIL`, and environment-only deferral handling.

## Release and source provenance

Both package manifests are `0.1.0` with `MIT` license declarations and include their own LICENSE files; the repository root also has an MIT LICENSE file. The engine is named `@takazudo/zudo-diagram-gen`; the initializer is `create-zudo-diagram-gen`. The Git remote points to `Takazudo/zudo-diagram-gen`, but package manifests currently have no `repository`, `homepage`, or `bugs` fields. The initializer LICENSE uses `Takazudo`, while the root and engine notices use `Takeshi Takatsudo`; confirm intended holder text before a release. These facts establish source provenance only; they do not establish registry ownership or publication readiness.

Neither package has been published to npm through this handoff, and the website has not been deployed. Install from downloaded source and local archives as described in the [README](../README.md). The proposed `/diagram-gen` core skill, `/my-diagram-gen` wrapper, project-selection workflow, and a real-project diagram integration remain future work. Browser review state stays local until copied or downloaded; no source feedback-write or automatic agent-resume path exists.

SVG validation checks supported structure and references. It does not judge whether a diagram is factually correct, legible, or suitable for a target placement.
