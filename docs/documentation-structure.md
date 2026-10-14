# Documentation structure and framework ownership

## Current rule

The October 15, 2026 correction supersedes the custom homepage, header-right primary navigation and editorial route/sidebar ownership introduced by PR #117. Use the standard zudo-doc rendering, not another project-designed approximation.

Read the upstream [Writing and Navigation Guide](https://github.com/zudolab/zudo-doc/blob/main/packages/create-zudo-doc/templates/features/claudeSkillsWriting/files/.claude/skills/zudo-doc-writing/SKILL.md) and [navigation design rules](https://github.com/zudolab/zudo-doc/blob/main/.claude/skills/zudo-doc-navigation-design/SKILL.md) before changing this tree.

## Navigation tree

The source directories under `src/content/docs/` are the navigation. Existing URLs are retained rather than reclassified by a second map.

```text
Start here -> getting-started/
  index.mdx: short introduction + CategoryNav
  choosing-workflow.mdx: workflow choice and review loop
  introduction.mdx, first-session.mdx, chatgpt-plugin.mdx
  local-archives.mdx, manual-session.mdx, local-development.mdx
Guides (native dropdown)
  Practical guides -> guides/
    index.mdx: short introduction + CategoryNav
    workflow-overview.mdx, refine-export.mdx, saved-styles.mdx
  Authoring -> authoring/
    index.mdx + the existing SVG, project, session and tone pages
  Review -> gallery/
    index.mdx + reviewing.mdx
  Agent workflow -> agent-workflow/
    index.mdx + core-and-wrapper.mdx, iteration.mdx
Tones -> tones/ (generated workbench content)
Examples -> examples/ (generated cards and session pages)
Reference -> reference/
  index.mdx: short introduction + CategoryNav
  existing CLI, API, architecture, capture, glossary and troubleshooting pages
Develop (native dropdown)
  Contributors -> development/
    index.mdx + contributing, quality, provenance and plugin-maintenance pages
  Changelog -> changelog/
Workbench -> workbench/ (linked from the footer and relevant content)
```

There are six top-level header items. Dropdown children group related sections and each `categoryMatch` is an actual single-segment directory name. The existing manual-session/local-development/architecture URLs keep their real filesystem ownership. A contextual cross-link does not change a page's category.

Before a future restructuring, draw the intended tree and move the actual files with a verified compatibility strategy. Do not introduce another slug-to-editorial-section map, explicit flat sidebar list, or breadcrumb/pager remapping to simulate a filesystem that does not exist.

## Allowed integration points

`pages/index.tsx` re-exports `@takazudo/zudo-doc/routes/index`. Configure the site name, description and existing ZDG logo through `zudoDoc({...})`; do not add a custom hero, product sections, curated homepage previews or replacement layout.

The docs route uses `createRouteContext`, `createChrome` and `buildDocRouteEntries` unchanged. Its static chrome-bindings import keeps the workbench island discoverable. `src/chrome-bindings.tsx` only registers the embedded workbench as an MDX extra. Leave the header, sidebar, breadcrumbs and pager to the framework. Keep search, theme and GitHub utilities in the standard header-right area; primary navigation stays in the native left area.

Tree category indexes contain a brief introduction and `<CategoryNav category="directory-name" />`. The longer workflow-choice and guide-overview material lives in sibling pages. Set `sidebar_position` on authored pages and use relative `.mdx` links in prose.

Tones, Examples and the embedded workbench are existing interactive content exceptions. Their durable source is `scripts/build-showcase.mjs`; never hand-edit ignored outputs. Keep source facts, saved artwork, stable IDs, hash-aware cleanup and the Wind manifest. The examples arrow is centered in a first-line-height wrapper with an explicit square SVG size, including wrapped titles. Its CSS must not select framework chrome or general headings.

## Compatibility and verification

`test/fixtures/documentation-legacy-routes.json` retains the 59 pre-PR-117 routes and their actual built heading IDs. Keep this fixture and the built-link checker intact. No command-bearing page or package resource is moved by this correction. The logo asset, engine, plugin, browser review state and deployment configuration are unchanged.

Run format, lint, type, unit, example, build and built-link checks. Browser verification must exercise the native header/menu, filesystem category and leaf navigation, search, breadcrumbs, pager, examples arrows with wrapped titles, and existing workbench hydration. Capture Home, the reported category landings and Examples at desktop/mobile widths and in both themes. A build is not visual acceptance; report unavailable verification and pending CI explicitly.

Do not merge or deploy merely to validate a documentation change. Production deployment remains separately authorized.
