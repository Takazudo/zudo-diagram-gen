# Current Codex handoff

## Read first

Read AGENTS.md, CLAUDE.md, IMPLEMENTATION-CONTRACT.md, README.md and the public getting-started/reference pages. The original handoff is preserved verbatim in [CODEX-HANDOFF-BASELINE.md](CODEX-HANDOFF-BASELINE.md); VERIFICATION.md remains original execution evidence. Neither historical record proves current publication, installation or acceptance.

## Current product and package seams

The local SVG system includes single/project review, all 24 offline tone packs, semantic kit/palette materialization, immutable project style snapshots, shared CSS placement and optional capture, explicit new/inspect/resume, downloaded review transfer, exact saved refinement and export. The CLI calls no model. The core skill is in the engine archive with focused references; users explicitly load it or verify their host's project-local discovery. Personal /my-diagram-gen, MCP, remote model services, browser-source endpoints, automatic conversation resume and product integration remain outside delivery.

Root zudo-doc 6.2.0 runs on ZFB SDK/runtime/md-wasm 4.5.0 with zudo-react and zudo-wind, embedding the workbench through chrome bindings. Initialized hosts pin ZFB SDK/runtime 4.5.0 and TypeScript 6.0.3; the engine retains ZFB 2/3 and the ZFB 4.3.0 minimum. Keep the single site, semantic tokens, default esbuild backend and dynamicPageTransition:false. Packages stay 0.1.0/local archives until registry publication is independently verified.

The root extends the published zudo-doc tsconfig; its baseUrl override is no longer needed. CSS imports use the published doc styles and typed engine stylesheet export; no Tailwind directives or removed safelist import remain. Showcase preparation generates .generated/showcase-wind.json for the intrinsic classes it emits. The wrapper loads data on zudo-react activation and aborts pending fetches/disposes the workbench on cleanup. Keep stale-response protection and one live mount; embedded theme synchronization belongs to the package workbench.

## Repository map

- packages/diagram-gen/src: model, tone-context, materialize/style/refinement, project, placement/capture, command modules, scaffold/runner, rendering/HTML export and public types.
- packages/diagram-gen/client: mounted ordinary/project workbench, review transfer and placement views.
- packages/diagram-gen/tones and schemas: all packaged local resources and version-one schema shapes.
- packages/diagram-gen/skills/diagram-gen: thin core plus commands/authoring/scenarios.
- packages/create-zudo-diagram-gen: independent initializer adapter/generated shared scaffold bundle.
- src/content/docs: public task-first onboarding, manual tutorial, authoring/reference and historical changelog.
- docs/agent-first: milestone contracts, contributor reproduction, evaluation and current rollout evidence.
- examples: six established public review fixtures; scripts: preparation, acceptance, packaging and checks.

## Decisions to preserve

Coordinator owns shared brief/project/session/round/mappings; one tone author works consistently across sessions and one writer owns each candidate directory. Ordinary candidate IDs remain session-local; project identity is session ID plus candidate ID. Reviewed drawings and feedback remain available, refinements use new IDs/parents from exact saved baseline. New provenance does not change legacy fingerprint projection. Browser storage is never described as source-file writes or accessible conversation state. Tone switching/shortlist/capture is not selection or style adoption; explicit lock/adopt scope is separate. Current saved snapshots survive catalog upgrades and exports never regenerate drawings.

Partial inspect/dev/export identifies missing/invalid/stale/theme-unavailable slots and preserves healthy siblings; strict validation/build requires current exact mappings. Explicit resource roots contain project capture/export and never infer ancestor projects. Generated route ownership is hash-bound; preserve edited routes and diagnose conflicts.

## Current evidence and remaining work

P08 supplies actual commands/core files; its historical acceptance document identifies original gate ownership. P09 accepted all 192 primary and 104 required independent images after correcting failures, preserving the revision trail and original 72 reference assets. Read [rollout/P09-ACCEPTANCE.md](agent-first/rollout/P09-ACCEPTANCE.md) for browser/font/hash provenance and bounded conclusions. Test selections are not user approval; new captures still say inspected:false until separately evaluated.

P10 consolidates public docs and tests exact displayed commands in fresh archive consumers outside source; [P10-ACCEPTANCE.md](agent-first/P10-ACCEPTANCE.md) separates executable reader evidence, actual downloaded review and image inspection from final integration gates. Its reader evidence must distinguish explicit skill-file invocation from native discovery, synthetic decisions from actual downloaded review, capture from opened image and local archive from registry publication. P11 preserves the actual 64-candidate/128-view integrated trial, explicit test review transfer, saved refinements, later locked-kit diagram and deterministic browser/distribution evidence. [Integrated acceptance](agent-first/ACCEPTANCE.md) and its PR completion record bind the final exact-head result and remaining limits. No package publishing, deployment or personal installation is incidental to that work.

## Verification and reporting

Use pnpm 10.30.3 and Node 22–24. Run relevant unit/format/lint/type/example checks, then required guarded aggregate/build/browser/package gates under active host resource policy. Fresh consumers must resolve their own installed node_modules and public exports rather than checkout modules. Browser verification covers actual review transfer, keyboard/theme/zoom/placement/persistence, strict/partial recovery and detached single/project exports. Open proposed captures and record PNG hash, candidate fingerprint, placement/theme/browser/fonts and factual/readability/contrast findings independently. Build or schema checks cannot substitute for image inspection.

Record exact command logs, archive hashes, installed roots, test/actual selection purpose, baselines/new child IDs, actual transferred files, visual observations and unresolved blockers. Preserve historical docs and changelog entries; append current evidence. User-visible changes need a new changelog entry. Report publication/personal install/deployment only with separate actual evidence and authorization.

Native Mac/Safari/IME verification in [issue #105](https://github.com/Takazudo/zudo-diagram-gen/issues/105) remains unrun. Use the current root tuple above and Playwright 1.63.0 for optional capture reproduction; browser installation is explicit. Record current-head verification separately from historical acceptance.

## Skills-only plugin confirmation

The separate ChatGPT-facing diagram-gen skill is assembled with pnpm plugin-pack; maintainer reproduction and the fresh-extraction evidence are in [PLUGIN-ACCEPTANCE.md](agent-first/PLUGIN-ACCEPTANCE.md). The ignored ZIP is a local build artifact, not a durable public download. The ChatGPT account installation, discovery, actual attachments/previews, and host refinement flow remain unverified; [issue #100](https://github.com/Takazudo/zudo-diagram-gen/issues/100) tracks that scoped host acceptance. Do not claim universal host support.

## Release finalization and integration hold

[PR #109](https://github.com/Takazudo/zudo-diagram-gen/pull/109) has its release finalization implemented under [issue #110](https://github.com/Takazudo/zudo-diagram-gen/issues/110). Read-only release planning now precedes fetch/setup; explicit retries preserve the original annotated tag commit, matching release PRs are adopted, and conflicting tags/assets fail closed. Complete temporary fixtures cover tagged packaging, 24-tone inventory, both ZIPs/checksums, fresh extraction, repeated builds and the whole planner's read-only behavior. See [the appended maintenance evidence](maintenance/2026-10-14.md) and the PR's exact final-head checks/artifact record.

All requested local nonbrowser gates passed; local installed-consumer/P07 builds and preview routes passed. Local Chromium setup is unavailable (root authentication and download-domain restriction), so current-revision CI supplies browser/P07/P11 evidence. Linux/ZIP checks do not satisfy native Mac #105, ChatGPT #100 or placement/capture #95.

Keep PR #109 draft and issue #110 open while the integration gate remains: a main merge may automatically deploy production, which this task does not authorize. Re-read repository policy and obtain any required approval before conditional merge; do not alter deployment settings or invent skip markers.
