# Documentation ownership and compatibility

Baseline: main `996c3c0c32a14f0870ab0670fb429c53282ff27c`, before issues #113–#116. The baseline build passed and contained 59 authored/generated documentation routes, plus Home and framework pages. `test/fixtures/documentation-legacy-routes.json` freezes their actual built heading IDs, not an assumed Markdown slug algorithm. The link checker verifies these routes and every old heading against the built site.

## Placement rules

- **Start here** owns product orientation, route selection and first success. Plugin users bring a capable host and an assembled package; local users bring Node/pnpm, locally packed archives and a coding agent. Manual operation is a linked alternative. Repository development is not beginner setup.
- **Guides** owns tasks: create, review, refine, export, projects, tone application, explicit saved-style adoption, SVG authoring and agent coordination. Link to specifications rather than copying them.
- **Tones / Examples** own browsable reference artwork and sample sessions. Their durable source is `scripts/build-showcase.mjs`; never edit ignored generated MDX or previews. Keep source facts, IDs, saved artwork, hash-aware cleanup and the Wind manifest.
- **Reference** owns exact CLI/API/schema, session-file, tone/scheme/kit and placement/capture contracts plus focused troubleshooting. A task belongs in Guides even if its commands call an API.
- **Contributors** owns repository setup, architecture, quality, provenance, plugin assembly and maintainer boundaries. Historical P10/P11 records remain under `docs/`; link them contextually. Changelog preserves dated history separately.

New content must have one primary owner, a useful description, and a relevant next action. Do not restore a recursive catch-all on Home or place maintainer acceptance procedures in quickstarts. Skill behavior and offline references remain owned by their packages.

## Public framework seams

The pinned zudo-doc 6.0.0 exports `createRouteContext`, `createChrome`, `DocLayoutWithDefaults`, typed `DocPageBaseProps` and `defineChromeBindings.sidebarsConfig`. The project maps canonical slugs to editorial sections through the public route-context function and supplies explicit sidebar, breadcrumb and pager data to the public renderer. Home composes the published layout/chrome. The pinned header marks URL prefixes active even when the editorial owner differs. A public `Header` replacement composes the default header with a named `headerRightComponents` primary-navigation slot; that slot uses only editorial ownership. Scoped CSS removes the native desktop navigation from rendering and keyboard/accessibility exposure. The native sidebar, mobile primary/secondary menu, theme, search and GitHub controls remain framework-owned. This avoids patching the framework or moving public URLs to satisfy its prefix matcher. Sections without a curated reading order keep framework pagination, including descending Changelog order. No framework internals, dependency edits or route redirects are needed. The single ZFB host, default esbuild, semantic tokens, chrome workbench lifecycle and `dynamicPageTransition:false` remain.

## Route inventory

All destinations retain the URL in the first column. Existing file locations are not the reader hierarchy. Legacy category landings become concise task-oriented signposts, not duplicate full trees. A split retains the former heading and a specific destination link; those links work in a static preview and the existing asset worker. There are no new Cloudflare-only redirects or duplicate canonical search pages.

| Baseline canonical URL | Baseline title | Primary owner | Source | Decision |
| --- | --- | --- | --- | --- |
| `/docs/agent-workflow/core-and-wrapper/` | Core skill and personal wrapper | Guides | Authored MDX | Keep / reclassify |
| `/docs/agent-workflow/` | Agent workflow | Guides | Authored MDX | Keep / reclassify |
| `/docs/agent-workflow/iteration/` | Generation and refinement workflow | Guides | Authored MDX | Keep / reclassify |
| `/docs/authoring/` | Authoring diagrams | Guides | Authored MDX | Keep / reclassify |
| `/docs/authoring/projects/` | Multiple sessions in one project | Guides | Authored MDX | Keep / reclassify |
| `/docs/authoring/session-files/` | Session files | Reference | Authored MDX | Keep / reclassify |
| `/docs/authoring/svg-authoring/` | SVG authoring | Guides | Authored MDX | Keep / reclassify |
| `/docs/authoring/tone-collection/` | Tone collection | Guides | Authored MDX | Keep / reclassify |
| `/docs/authoring/tone-context/` | Tone context, kits and saved styles | Reference | Authored MDX | Split style task to guides/saved-styles; keep lock anchor as link |
| `/docs/changelog/0.1.0/` | 0.1.0 | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/0.1.1/` | 0.1.1 | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-05-zfb3-sessions/` | New sessions use zfb 3 | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-agent-cli-skill/` | Agent CLI and distributable diagram skill | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-catalog-recipe-resolution/` | Resolve numeric catalog recipes | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-multi-session-projects/` | Multi-session project hosts | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-native-tone-rollout/` | Native packs for all 24 tones | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-offline-tone-references/` | Offline tone reference material | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-paper-pencil-field-revision/` | Paper and pencil construction fields | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-paper-pencil-pilot-revision/` | Revised paper and pencil construction for a fresh pilot | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-pencil-object-guidance/` | Pencil object construction guidance | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-pilot-tone-packs/` | Four pilot tone packs with native semantic kits | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-placement-capture/` | Candidate placement and capture | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-project-review/` | Project comparison and portable review | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-style-materialization/` | Semantic SVG materialization and immutable project styles | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-07-tone-context/` | Versioned tone context and scheme validation | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-08-integrated-acceptance/` | Integrated acceptance evidence checks | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-08-integration-safety/` | Registered capture inputs and project diagnostics stay protected | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-08-task-first-documentation/` | Task-first onboarding and current agent references | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-09-skills-only-plugin-workflow/` | Skills-only diagram workflow | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-10-zfb-4-consumers/` | ZFB 4.3 consumer support | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-11-dependency-maintenance/` | Documentation framework and dependency maintenance | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/2026-10-14-zdg-wordmark/` | ZDG homepage logo | Changelog | Authored MDX | Keep / reclassify |
| `/docs/changelog/` | Changelog | Changelog | Authored MDX | Keep / reclassify |
| `/docs/development/` | Development | Contributors | Authored MDX | Keep / reclassify |
| `/docs/development/quality-and-handoff/` | Quality and release checks | Contributors | Authored MDX | Keep / reclassify |
| `/docs/development/sources/` | Sources and provenance | Contributors | Authored MDX | Keep / reclassify |
| `/docs/examples/` | Worked examples | Examples | Generator | Keep / reclassify |
| `/docs/examples/project-doc-cloud/` | zudo-doc-cloud collect changes help | Examples | Generator | Keep / reclassify |
| `/docs/examples/project-ez-host/` | zudo-ez-host save and publish help | Examples | Generator | Keep / reclassify |
| `/docs/examples/project-pattern-gen/` | zudo-pattern-gen Composer help | Examples | Generator | Keep / reclassify |
| `/docs/examples/project-text/` | zudo-text frame help | Examples | Generator | Keep / reclassify |
| `/docs/examples/project-zzmod/` | zzmod signal-path documentation | Examples | Generator | Keep / reclassify |
| `/docs/examples/tone-exploration/` | One explanation, ten directions | Examples | Generator | Keep / reclassify |
| `/docs/gallery/` | Using the gallery | Guides | Authored MDX | Keep / reclassify |
| `/docs/gallery/reviewing/` | Reviewing candidates | Guides | Authored MDX | Keep / reclassify |
| `/docs/getting-started/chatgpt-plugin/` | ChatGPT plugin workflow | Start here | Authored MDX | Split assembly and acceptance to development/plugin-maintenance; keep old anchors as links |
| `/docs/getting-started/first-session/` | Ask for your first diagram | Start here | Authored MDX | Keep / reclassify |
| `/docs/getting-started/` | Getting started | Start here | Authored MDX | Keep / reclassify |
| `/docs/getting-started/introduction/` | Introduction | Start here | Authored MDX | Keep / reclassify |
| `/docs/getting-started/local-archives/` | Local archive setup | Start here | Authored MDX | Keep / reclassify |
| `/docs/getting-started/local-development/` | Run the project site | Contributors | Authored MDX | Keep / reclassify |
| `/docs/getting-started/manual-session/` | Manual session tutorial | Guides | Authored MDX | Keep / reclassify |
| `/docs/reference/api/` | Public API and schemas | Reference | Authored MDX | Keep / reclassify |
| `/docs/reference/architecture/` | Architecture | Contributors | Authored MDX | Keep / reclassify |
| `/docs/reference/cli/` | CLI reference | Reference | Authored MDX | Keep / reclassify |
| `/docs/reference/` | Reference | Reference | Authored MDX | Keep / reclassify |
| `/docs/reference/placement-capture/` | Placement and capture | Reference | Authored MDX | Keep / reclassify |
| `/docs/tones/` | Tone collection | Tones | Generator | Keep / reclassify |
| `/docs/workbench/` | Diagram workbench | Try workbench | Authored MDX | Keep / reclassify |

## Anchor and incoming-link policy

The frozen baseline fixture covers every rendered heading, including CLI initializer, API materialization/refinement, manual candidate/refinement steps and placement setup. Keep heading text when changing only audience/navigation. For the two split pages, retain `build-and-verify-from-the-repository`, `host-acceptance-scenarios`, and `lock-a-project-style-explicitly` as concise contextual bridges. Reader-fence IDs and locations remain stable because no command-bearing page moves.

README and new editorial links point at the authoritative destinations. Packaged core/plugin backlinks and historical `docs/` records keep working without changing skill behavior or rewriting evidence. The generated Tones/Examples families retain their routes, data URLs and identities. `/` is intentionally recomposed; the logo remains Git blob `49da7aeff2551154e8c2b83a417be92556bc85e7`. Existing short-path worker redirects retain their current behavior.
