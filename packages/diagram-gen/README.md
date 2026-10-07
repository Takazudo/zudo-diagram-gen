# @takazudo/zudo-diagram-gen

A package-owned SVG workbench for local diagram exploration. zfb runs development,
build, and preview. Session content stays in ordinary JSON, Markdown and SVG files.

## Commands

- `zudo-diagram-gen dev [directory]` — validate and prepare the route, watch content additions/edits/removals, run zfb.
- `zudo-diagram-gen build [directory]` — validate and prepare the route, run zfb build.
- `zudo-diagram-gen preview [directory]` — serve an existing zfb build.
- `zudo-diagram-gen check [directory] --json` — validate content.
- `zudo-diagram-gen export <id> --session <directory> --theme light --out <svg>` — export exact artwork.
- `zudo-diagram-gen export-html [directory] --out <html>` — portable, self-contained review page.
- `zudo-diagram-gen tones list --json` and `tones show <id> --json` — inspect the bundled tone collection.

Paths are caller supplied. Personal output policies belong in a wrapper.

## API

Import `loadSession`, `validateSession`, `loadToneCatalog`, `exportCandidate`,
`renderGallery`, `renderZfbGallery`, or `createPageSource` from the package root.
Node I/O APIs run outside zfb's SSR graph. `createPageSource()` prepares a zfb
route containing the package-owned UI and validated data, using the selected
v2 Preact or v3 zudo-react dialect.

## First release

Feedback can be copied as text or downloaded as JSON. Browser storage is a local
convenience; it does not write to the workspace or resume an agent. The source
project includes full zudo-doc documentation, examples, and a Codex handoff.

## Embed the workbench

Import the package-owned module and stylesheet in a browser island. Mount after the host element exists and dispose when the island unmounts:

```js
import { mountDiagramApp } from '@takazudo/zudo-diagram-gen/client/mount';
import '@takazudo/zudo-diagram-gen/client/app.css';

const dispose = mountDiagramApp(element, galleryData, { embedded: true });
// Call dispose() during island cleanup.
```

Embedded mode uses the host `<html data-theme="light|dark">` appearance (or its `dark` class), observes later theme changes, and keeps the diagram asset theme switch available. The host supplies project navigation. Standalone HTML exports continue to include their own classic script and CSS.

The engine supports zfb `^2.21.1 || ^3.2.0`. Existing v2 hosts keep their Preact dependencies; the optional Preact peer avoids adding Preact to new v3 hosts. `createPageSource(data, options, zfbMajor)` keeps its v2 default for existing programmatic callers; the CLI selects the major from the destination’s installed zfb.

## Optional candidate capture

Install `playwright@1.59.1` explicitly and run `pnpm exec playwright install chromium`, then use `zudo-diagram-gen capture <candidate-id> --session <dir> --out <png> --json`. `--placement`, `--dpr`, `--crop`, `--theme`, `--timeout-ms`, `--browser-executable`, `--resource-root` and `--force` are supported. Capture and ordinary preview share one renderer. The PNG sidecar records input hashes and `inspected:false`; visual inspection remains a separate step. Source files are protected even with force. Inside a source/resource root, write captures to `exports/`. Ordinary checks, tone reading and exact SVG export do not need browser setup. See contributor `docs/agent-first/CAPTURE.md` for descriptor, API and acceptance details.

## Resolved tone context

`resolveToneContext(id)` and `tones show <id> --json` include the existing tone
fields and complete light/dark `examples`, plus `contextVersion: 1`, bundled
explanation content, source SVG, recipe document, scheme, kit inventory, hashes
and diagnostics. `tones list --json` retains its collection shape and tone fields;
it omits resolved bulk content. Resources resolve from the installed package,
without network access or a dependency on the caller's working directory.
Bundled explanation descriptors accept Markdown, JSON (1 MiB maximum) and SVG
(16 MiB maximum). Explanatory SVGs follow the same standalone validation and
resource containment policy as example SVGs. A declared catalog `toneRevision`
must be nonempty and match the authored scheme revision when a scheme exists.

Legacy entries report `capabilities: { scheme: false, kit: false }` and null
resources. They still load. A declared missing or malformed resource fails.
`resolveToneContext(id, { requireComplete: true })` requires a scheme, kit and a
required bundled explanation; the eventual all-tone acceptance gate must opt in.
`loadToneCatalog()` validates every declared resource and adds each resolved
`tone.context`. Fixture/custom catalogs can use `{ toneRoot: '/absolute/root' }`;
this input root is never included in portable output.

Authored schemes use `schemaVersion: 1`, an independent `toneRevision`, catalog
`collectionVersion`, tone identity, SVG user units, geometry and typography
roles, seeded texture, two complete six-role semantic palettes, composition
intent, and required/preferred/flexible rules. Published schemas are available
under `@takazudo/zudo-diagram-gen/schemas/tone-scheme.schema.json` and
`schemas/palette.schema.json`. Catalog palette values are examples; project
colors can replace all semantic slots in both themes through `validatePalette`.
Structural validation does not certify descriptive rule adherence or readability.

`schemeNumericSummary(scheme)` generates every machine numeric value from the
authoritative scheme. Recipe templates use `{{scheme:geometry.strokeWidths.outline}}`
(or another numeric path) and render through `renderSchemeRecipe`. Authored
catalog numeric summaries can declare `recipeNumericReferences`, each
`{ recipeIndex, path, value }`; resolution checks the value against the scheme
and the exact numeric token in that recipe entry. Unresolved references,
malformed templates and numeric drift fail. Keep intent and exceptions in prose;
use templates or checked references for machine values. Local Markdown can bind
a literal inline with `<!-- scheme:geometry.strokeWidths.outline=2 -->`.
Recognizable dimensional summaries (such as stroke widths, radii, opacity, font
size and px/pt/user-unit values) require a template or checked binding when a
scheme exists. Unbound machine values fail with the offending line and recovery
syntax. Factual counts, numbered steps, versions and labels remain explanatory
prose. This check recognizes declared machine summaries; it does not certify
that arbitrary natural language expresses every intended visual rule.

`checkNominalTypography(scheme, { width, height })` uses contain/meet scaling:
`min(slot.width / viewBox.width, slot.height / viewBox.height)`. It compares
`fontSize * scale` with `minCssPx`. Geometry uses SVG user units; placement and
label minima use CSS pixels. Nested transforms, shaping and overlaps still need
visual inspection at final size.

Canonical hashes sort object keys by Unicode code-point order, preserve array
order and exact strings, reject non-JSON/nonfinite data and normalize negative
zero. SVG, kit and explanation hashes preserve original validated UTF-8 bytes,
including BOMs and newlines. `context.hashes.contextHash` covers the contracted
tone/revision/collection identity, scheme/kit hashes and bundled hashes sorted
by descriptor ID. `toneContextStatus(previousHash, context)` reports unknown,
current or stale. Context changes do not regenerate artwork or alter the existing
candidate fingerprint projection, browser storage identity or review snapshots.

## Offline tone explanations

Every installed tone has `bundledReferences` descriptors with stable IDs, a title,
a required flag and a path relative to the package's `tones/` directory. Each tone's
`recipe.md` explains its drawing, while `shared/composition-meaning.md` supplies
common terminology and `shared/provenance.md` records reuse limits. Resolve these
paths from the installed engine, never from the caller's working directory.
`sourceReferences` contains only optional public HTTP(S) inspiration, and local
paths are never placed in its URL field. No website or private repository is
needed to understand the references. The original editable and light/dark SVGs
remain unchanged.

Contributor checks are `pnpm check:examples` and
`node scripts/audit-tone-references.mjs`; both are offline. Package prepack checks
resource inclusion. `node scripts/check-tone-archive.mjs [engine.tgz]` packs or
accepts an engine archive, installs it into a fresh temporary consumer using
pinned pnpm 10.30.3 in offline mode, and reads every required descriptor. Its
default material-only pack skips lifecycle scripts; aggregate release checks
must also exercise ordinary prepack, build and browser behavior. It requires an
existing pnpm dependency cache. Temporary files are removed after verification.

Live inspiration auditing is opt-in:
`node scripts/audit-tone-references.mjs --external`. It uses credential-free HEAD
requests and reports redirects, rate limits, access denial with unknown visibility,
missing-or-unavailable results, timeouts and transient errors separately. A 404
is not proof that a repository is private; these diagnostics never gate ordinary
generation or PR checks.

## Semantic authoring and saved project styles

The package exports `resolvePalette`, `materializeSvg`, `materializeKit`, `lockProjectStyle`, `adoptProjectStyle`, `readStyleRevision`, `styleProvenance`, `reviewCompatibility` and `createRefinement`. `project lock` requires an explicit selection file and complete palette; later revisions require `project adopt`. Browser choices alone never lock project style. Locked schemes/kits stay local and immutable across catalog upgrades. Export copies the saved reviewed SVG; it does not regenerate artwork. See the repository's `docs/agent-first/STYLE.md` for full examples and failure/recovery behavior. The complete CLI/skill workflow is a later work package.
