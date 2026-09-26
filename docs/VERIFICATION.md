# Verification report

## Doc Combine route map

The root site is a single zudo-doc site, with the review workbench embedded in a documentation page through zudo-doc chrome bindings. The route map places the tone catalog at `/docs/tones/`, examples at `/docs/examples/` (including `/docs/examples/<slug>/`), the workbench at `/docs/workbench/`, and the changelog at `/docs/changelog/`; the rest of `/docs/**` keeps its path. Built-site link validity for these routes is checked in sub-issue #39. Top-level `/tones/`, `/examples/`, and `/workbench/` paths mentioned in the deployment and source-handoff records below describe builds tested before this migration.

## Automated deployment — 2026-09-27

The repository now has `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets and `CF_PRODUCTION_ENABLED=true`. Secret values were not inspected. The [first credentialed run](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36271943334) built and deployed successfully, but its immediate smoke saw a newly generated JavaScript asset return a transient 404. The asset was available shortly afterward. The smoke command now waits up to 60 seconds for deployed assets and still fails if one remains unavailable.

For `main` commit `4779861727f550aab437a6b89dfb9beba0c8b485`, [push CI](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36273772254) and the [credentialed deploy workflow](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36273841196) both passed. That workflow built the passing commit, deployed Worker version `801db106-1459-4a50-81e9-5527f3910586`, and passed the production smoke after the new JavaScript asset became available. The live home and first-session docs returned HTTP 200, and a missing route returned HTTP 404. The deploy workflow is active for future successful `main` push CI runs.

## First live deployment — 2026-09-27

The reviewed root PR [#23](https://github.com/Takazudo/zudo-diagram-gen/pull/23) merged as `2006d8a3642c54a9417dccb574c03db4d4dae16a`. Its [main push CI](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36271396203), actionlint, and security audit passed. The configured deploy workflow [skipped](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36271471046) because `CF_PRODUCTION_ENABLED` and scoped Cloudflare secrets were not provisioned. The first rollout used the local authenticated Wrangler session and the `site-dist` artifact from that exact passing main CI run; the local heavy-guarded build remained unrun.

Immediately before deployment, Cloudflare's authoritative nameserver returned NXDOMAIN for the requested hostname's A, AAAA, and CNAME queries. Wrangler dry-run passed, and `versions list` showed no previous version. Manual `pnpm deploy:cloudflare` attached `zudo-diagram-gen.zudolab.dev` and returned version `50272b74-9658-4dda-b2b1-1f9294b828dd`. There was no prior version to use as a rollback target for this first deployment.

The [live site](https://zudo-diagram-gen.zudolab.dev/) resolved to Cloudflare addresses over IPv4 and IPv6 and passed HTTPS. Before the Doc Combine migration, HTTP 200 was observed on home, introduction, first session, CLI reference, tones, examples, and workbench; a missing route returned HTTP 404 with the configured page. The live smoke also passed the canonical 307 redirect and CSS, SVG, and JavaScript assets. In a real browser, docs search, mobile sidebar and table of contents, workbench filtering, shortlist persistence, and inspection passed with no page errors. Desktop and narrow screenshots were inspected. These are live checks, separate from the nine Chromium groups in CI.

The packages remain unpublished, and the proposed `/diagram-gen` and `/my-diagram-gen` skills remain uninstalled. At the first live deployment, the CI deployment workflow was inactive; its later successful activation is recorded above.

## Pre-merge release candidate — 2026-09-27

The pre-merge release candidate is `base/docs-cloudflare`; the CI-built site artifact came from commit `3713cd9ff1fb169ab843f5532721b50a9f2768e8`. Later commits corrected the Wrangler compatibility date and added a dedicated preview Worker configuration without changing site content. The repository and both packages report version `0.1.0`. CI uses Node.js 24.13.0 and pnpm 10.30.3.

Integrated `pnpm format:check`, `pnpm lint`, `pnpm check`, all 45 Vitest cases, and `pnpm check:examples` (six sessions and 24 tones) passed locally. The guarded local build was queued behind another repository's long heavy run and was cancelled without executing. The root PR's [push CI](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36270779479) and [pull-request CI](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36270781242) passed the production build, built links, packed consumer, preview routes, and Chromium checks at the artifact commit. Actionlint and production dependency audit also passed after the actionlint loop fix.

The downloaded CI site artifact contained 397 assets, including `404.html`. Local built-link validation found all 567 links across 30 HTML pages. Wrangler 4.141.0 dry-run passed. Wrangler's local asset server returned HTTP 200 on home, clean nested docs, tones, examples, and workbench; HTTP 307 for a canonical trailing slash; HTTP 404 with the generated page for a missing route; and HTTP 200 for CSS, SVG, and JavaScript. A first local serve attempt exposed a future compatibility date under UTC; the config was corrected to `2026-09-26` and the smoke passed.

A Cloudflare Preview created before the production Worker existed served content and assets, but its beta missing-route response used a generic 404 body. An isolated `workers.dev` Worker deployed from `wrangler.preview.jsonc` then passed the **full remote smoke**, including the generated 404 body. Desktop and 390 px browser screenshots were inspected for home, first-session docs, and workbench; no horizontal overflow appeared. Remote browser interaction checks passed docs search, mobile sidebar and table of contents, workbench candidate filtering, shortlist persistence after reload, and inspection navigation. The existing CI Chromium suite passed its nine workbench groups. The isolated preview is temporary and should be removed after the production rollout.

At this pre-merge checkpoint, the following results remained pending. The first live deployment above resolves the production items for the initial `main` merge:

- CI for the final documentation/configuration commit and the resulting merged `main` SHA.
- Production deployment, live DNS/HTTPS/routes/assets/browser checks, and deployed version capture.

Cloudflare account and hostname review before attachment: zone `zudolab.dev` was active under account `367c7f51801e1f537030f93d5a5e6008` (zone `ddb163ab74e7cd438bb2d77d462bd724`); the Workers routes and custom domains APIs showed no entry for `zudo-diagram-gen.zudolab.dev`. Its authoritative Cloudflare nameserver returned NXDOMAIN for the exact A, AAAA, and CNAME queries. The DNS-records API request was denied with error 10000, so a dashboard inventory was unavailable. The public hostname was not live at that checkpoint. The repository had no configured Cloudflare Actions secrets or variables, so automatic production deployment was not active.

The pre-merge source audit found the README's then-current site URL notice accurately deferred the public URL until deployment. Public README and MDX instructions described package version `0.1.0` as unpublished and used source/local archives; no registry install command or host-specific machine path was found. The README now links to the verified live site.

### Checklist used for the first rollout

This checklist records the first deployment of the former top-level-route site. For that rollout only, the route checks below used the then-current `/tones/`, `/examples/`, and `/workbench/` paths; use the Doc Combine route map above for site verification.

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

At this pre-Doc Combine checkpoint, the root development server returned HTTP 200 for `/`, `/tones/`, `/examples/`, `/workbench/`, `/examples/tone-exploration/`, and `/docs/getting-started/introduction/`. The packed consumer's development server passed the eight live transitions over HTTP: empty session, candidate addition, SVG edit with fingerprint change, malformed metadata retaining the previous gallery, metadata repair, brief edit, candidate deletion, and re-addition. A rapid edit/delete/re-add also ended with one candidate and no phantom entry. Malformed metadata was held through a watcher poll; the server logged the validation error and recovered after repair.

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

Neither package has been published to npm through this handoff. At the time of the earlier source handoff, the website had not been deployed; the first live deployment is recorded above. Install from downloaded source and local archives as described in the [README](../README.md). The proposed `/diagram-gen` core skill, `/my-diagram-gen` wrapper, project-selection workflow, and a real-project diagram integration remain future work. Browser review state stays local until copied or downloaded; no source feedback-write or automatic agent-resume path exists.

SVG validation checks supported structure and references. It does not judge whether a diagram is factually correct, legible, or suitable for a target placement.
