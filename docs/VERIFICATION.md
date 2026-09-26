# Verification report

## Release candidate status — 2026-09-27

The pre-merge release candidate is `base/docs-cloudflare`; the CI-built site artifact came from commit `3713cd9ff1fb169ab843f5532721b50a9f2768e8`. Later commits corrected the Wrangler compatibility date and added a dedicated preview Worker configuration without changing site content. The repository and both packages report version `0.1.0`. CI uses Node.js 24.13.0 and pnpm 10.30.3.

Integrated `pnpm format:check`, `pnpm lint`, `pnpm check`, all 45 Vitest cases, and `pnpm check:examples` (six sessions and 24 tones) passed locally. The guarded local build was queued behind another repository's long heavy run and was cancelled without executing. The root PR's [push CI](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36270779479) and [pull-request CI](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36270781242) passed the production build, built links, packed consumer, preview routes, and Chromium checks at the artifact commit. Actionlint and production dependency audit also passed after the actionlint loop fix.

The downloaded CI site artifact contained 397 assets, including `404.html`. Local built-link validation found all 567 links across 30 HTML pages. Wrangler 4.141.0 dry-run passed. Wrangler's local asset server returned HTTP 200 on home, clean nested docs, tones, examples, and workbench; HTTP 307 for a canonical trailing slash; HTTP 404 with the generated page for a missing route; and HTTP 200 for CSS, SVG, and JavaScript. A first local serve attempt exposed a future compatibility date under UTC; the config was corrected to `2026-09-26` and the smoke passed.

A Cloudflare Preview created before the production Worker existed served content and assets, but its beta missing-route response used a generic 404 body. An isolated `workers.dev` Worker deployed from `wrangler.preview.jsonc` then passed the **full remote smoke**, including the generated 404 body. Desktop and 390 px browser screenshots were inspected for home, first-session docs, and workbench; no horizontal overflow appeared. Remote browser interaction checks passed docs search, mobile sidebar and table of contents, workbench candidate filtering, shortlist persistence after reload, and inspection navigation. The existing CI Chromium suite passed its nine workbench groups. The isolated preview is temporary and should be removed after the production rollout.

The following results remain pending:

- CI for the final documentation/configuration commit and the resulting merged `main` SHA.
- Production deployment, live DNS/HTTPS/routes/assets/browser checks, and deployed version capture.

Cloudflare account and hostname review: zone `zudolab.dev` is active under account `367c7f51801e1f537030f93d5a5e6008` (zone `ddb163ab74e7cd438bb2d77d462bd724`); the Workers routes and custom domains APIs show no entry for `zudo-diagram-gen.zudolab.dev`. Its authoritative Cloudflare nameserver returned NXDOMAIN for the exact A, AAAA, and CNAME queries. The DNS-records API request was denied with error 10000, so a dashboard inventory was unavailable. Recheck before attachment and stop if the hostname becomes occupied. The public hostname is not live. The repository has no configured Cloudflare Actions secrets or variables, so automatic production deployment is not active.

The source audit found the README's site URL notice accurately says a public URL will be added after deployment is verified. Public README and MDX instructions continue to describe package version `0.1.0` as unpublished and use source/local archives; no registry install command or host-specific machine path was found. Those statements remain accurate for this release candidate.

### Post-merge live checklist

After the reviewed commit is merged, check CI on the resulting `main` SHA and confirm whether the deploy workflow ran or was skipped. Its deploy job requires successful push CI on `main`, the production repository, and `CF_PRODUCTION_ENABLED=true`; if the job starts but skips deploy steps, check whether the API token and account ID secrets are absent. Report a manual deploy as manual, and do not describe CI as active unless it deployed.

Before deployment, requery the exact hostname on Cloudflare's authoritative nameservers and recheck Worker routes and custom domains; stop if it is occupied. From the clean merged `main` checkout, record the commit, use its passing CI-built site artifact if the heavy local build remains queued, run Wrangler dry-run, capture the existing version ID, deploy, and save the resulting version ID and URL. Run `pnpm smoke:cloudflare https://zudo-diagram-gen.zudolab.dev/` and verify HTTPS, DNS, and HTTP 200 for `/`, `/docs/getting-started/introduction/`, `/docs/getting-started/first-session/`, `/docs/reference/cli/`, `/tones/`, `/examples/`, and `/workbench/`; confirm an unknown path returns HTTP 404. Inspect desktop and narrow viewports for navigation, search, table of contents, interactive workbench review, and CSS, JavaScript, and SVG assets. Record the deploy mode, source SHA, version IDs, route results, browser evidence, and any gaps here. If live smoke checks fail, roll back to the recorded previous version using [the Cloudflare rollback procedure](./cloudflare-setup.md#rollback).

## Earlier source-handoff evidence — 2026-09-27

The repository declares Node.js `>=22 <25` and pnpm `10.30.3`. The import check used Node.js 24.13.0 and Corepack pnpm 10.30.3. CI uses those exact versions on Ubuntu, installs with `pnpm install --frozen-lockfile`, then runs `pnpm check`, `pnpm test`, `pnpm check:examples`, a root and packed-consumer build, built-link and preview checks, and a Chromium workbench check.

| Scope | Recorded result | Evidence limit |
| --- | --- | --- |
| Fresh source import | Frozen install, showcase preparation, check, 42 tests, and example/catalog validation passed. Showcase reported 24 tones, six sessions, and 16 candidates. | Source-import worker did not run build. See [SOURCE-IMPORT.md](./SOURCE-IMPORT.md) for file and manifest provenance. |
| Installed-consumer worker | Check, 44 tests, examples, and `pack:local` passed. Both archives had the expected inventory. A fresh host outside the monorepo resolved the engine under its own `node_modules`, checked an empty and then populated session, and exported light/dark SVGs and HTML. | This worker did not run a guarded consumer build or a held server. The content watcher now hashes file contents and does not traverse a symlinked `rounds` tree; regression tests cover same-size edits and delete/re-add. |
| Browser-workbench worker | Frozen install, check, 45 tests, and examples passed. A DOM regression verifies that review import replaces notes, shortlist, and direction together. | No real-browser, native file picker, clipboard, pointer, or layout check was run by this worker. |
| This integration worktree | Node.js 24.13.0, Corepack pnpm 10.30.3: frozen install, check, all 45 tests, and example/catalog validation passed on `topic/integration-ci`. | The worktree started at merged prerequisite `9aa28e4`; CI status, guarded build, live servers, and real-browser checks require separate evidence. |

The import, installed-consumer, and browser-worker results above come from their 2026-09-27 foreground review records. They are separate checkouts in the same source-handoff sequence; the increasing test counts reflect added regression tests. Do not combine them into a claim that a full end-to-end suite passed on the merged base.

## Merged-base and packed-consumer checks

On merged base `14fe2ab`, Node.js 24.13.0 and Corepack pnpm 10.30.3 passed `pnpm check`, all 45 tests, and `pnpm check:examples` (six sessions, 16 candidates, and 24 tone profiles). `pnpm pack:local` produced a 115-file engine archive and a five-file initializer archive. A new host in `/tmp` was created with `npm exec --package <initializer archive>`, installed the engine archive with pnpm, and resolved the engine from that host's `node_modules/.pnpm` directory. Its empty and one-candidate session checks passed. Both light and dark exported SVGs matched the source files byte for byte, and exported HTML contained no absolute source or host path. The temporary host path is evidence location only, not a project setting.

The root development server returned HTTP 200 for `/`, `/tones/`, `/examples/`, `/workbench/`, `/examples/tone-exploration/`, and `/docs/getting-started/introduction/`. The packed consumer's development server passed the eight live transitions over HTTP: empty session, candidate addition, SVG edit with fingerprint change, malformed metadata retaining the previous gallery, metadata repair, brief edit, candidate deletion, and re-addition. A rapid edit/delete/re-add also ended with one candidate and no phantom entry. Malformed metadata was held through a watcher poll; the server logged the validation error and recovered after repair.

The root pull request's `verify` job passed on the integrated branch at `c8d8242` ([run 36266871054](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36266871054)): root and packed-consumer builds passed; 658 local links across 30 HTML pages resolved; root and consumer built preview routes returned HTTP 200. Chromium passed nine browser check groups against exported project and packed-consumer HTML. The desktop and 390 px screenshots were inspected: controls, SVG drawing, target-size placement, and horizontal access on the narrow viewport were visible. The browser run covered filtering, stable IDs, keyboard focus, navigation, compare, fit/100%/slider/modifier-scroll/drag/reset, theme/backdrop, notes, shortlist/direction, persistence, clipboard, JSON download and repeat import, invalid import, stale feedback, missing dark artwork, storage denial, and a downloaded SVG opened independently. Main branch CI remains to be checked after merge.

The local merged-base `pnpm build` was queued through the required heavy guard and timed out with exit 75 before executing. CI passed that exact build and the packed-consumer build, settling [deferred-verification issue 11](https://github.com/Takazudo/zudo-diagram-gen/issues/11). The local build is recorded as deferred, not passed. Browser automation ran on GitHub's Ubuntu Chromium runner because the same machine-wide guard slot remained occupied locally. Playwright supplied a review file to the browser input twice; the operating-system file picker dialog itself was not opened.

## Earlier supplied handoff — historical evidence

The supplied `0.1.0` source handoff recorded Node.js 24.19.0, pnpm 10.30.3, zfb 2.21.1, and zudo-doc 5.27.0. Its recorded run had 42 automated tests, six validated sessions with 16 candidates and 32 declared theme SVGs, and 24 validated tone profiles with 48 reference theme SVGs. It reported a zfb build with 31 routes (30 HTML pages and `robots.txt`), inspection of 658 local `href`/`src` references with no missing targets, 19 MDX pages checked for frontmatter and local documentation links, local package archives, and standalone workbench and tone-catalog HTML exports. Those are results from the supplied handoff, not reruns against this imported repository.

The earlier packed-consumer run reported a fresh generated host outside the monorepo with empty and populated session checks, a build, standalone export, byte-matched dark SVG export, and two clean live-server runs. Each server run checked empty session, candidate add, SVG/fingerprint edit, incomplete metadata retaining the last valid gallery, repair, brief edit, deletion, and re-addition. The root development server also served home, tones, an example workbench, and a docs route. These results predate the current watcher and review-import fixes and must not stand in for a merged-base live-server run.

An earlier combined run once observed a deleted candidate directory reappear with incomplete metadata. Two subsequent isolated consumer runs did not reproduce it. No cause was established. Include rapid edit/delete/re-add in the next live-server check.

## Remaining verification

After merge, verify the main branch CI run at its merge SHA. The operating-system file picker dialog has not been exercised; repeat import through the browser file input passed. No diagram's factual suitability for a specific product help placement has been approved by a user.

Heavy local runs use `bash "$HOME/.codex/scripts/heavy-guard.sh" -- <command>`. An exit 75 means the suite never ran. Follow `AGENTS.md` for `ENV_SUSPECT`, `FAIL`, and environment-only deferral handling.

## Release and source provenance

Both package manifests are `0.1.0` with `MIT` license declarations and include their own LICENSE files; the repository root also has an MIT LICENSE file. The engine is named `@takazudo/zudo-diagram-gen`; the initializer is `create-zudo-diagram-gen`. The Git remote points to `Takazudo/zudo-diagram-gen`, but package manifests currently have no `repository`, `homepage`, or `bugs` fields. The initializer LICENSE uses `Takazudo`, while the root and engine notices use `Takeshi Takatsudo`; confirm intended holder text before a release. These facts establish source provenance only; they do not establish registry ownership or publication readiness.

Neither package has been published to npm through this handoff, and the website has not been deployed. Install from downloaded source and local archives as described in the [README](../README.md). The proposed `/diagram-gen` core skill, `/my-diagram-gen` wrapper, project-selection workflow, and a real-project diagram integration remain future work. Browser review state stays local until copied or downloaded; no source feedback-write or automatic agent-resume path exists.

SVG validation checks supported structure and references. It does not judge whether a diagram is factually correct, legible, or suitable for a target placement.
