# Local Codex handoff

## Intended outcome

Continue a working first version of `zudo-diagram-gen`: a reusable local app in which agents place SVG candidates, the user compares and chooses them, and subsequent rounds refine the actual selected drawing. The root project site documents the app and exposes a catalog of 24 tone references and worked examples.

The user explicitly wants **zfb** as the core development/build CLI and a setup similar to **zudo-doc**. Keep those choices. The generated review app should stay small, and its behavior should come from an installed package.

Personal output policy belongs in a future wrapper such as `/my-diagram-gen`. The future core `/diagram-gen` interface accepts an explicit destination. Do not add a concrete logs path to the engine, initializer, or reusable core.

## Read first

1. `AGENTS.md`: repository conventions and scope.
2. `IMPLEMENTATION-CONTRACT.md`: version-one package, data, and command boundaries.
3. `README.md`: local startup and source-based initialization.
4. [VERIFICATION.md](./VERIFICATION.md): exact completed checks and remaining limits.
5. `src/content/docs/agent-workflow/`: the future skill integration contract.

This document describes the implementation and the next useful work. It does not assert that a browser check, package publication, deployment, or skill installation has occurred. Use [VERIFICATION.md](./VERIFICATION.md) for actual execution evidence.

## Repository map

| Location | Responsibility |
| --- | --- |
| Root `package.json`, zfb config, `pages/`, `src/` | Project documentation site and live catalog/example presentation. |
| `packages/diagram-gen/src/model.mjs` | Session and catalog loading, validation, asset rules, lineage, exports. |
| `packages/diagram-gen/src/commands.mjs` | Data-oriented CLI commands. |
| `packages/diagram-gen/src/cli.mjs` and renderer modules | CLI dispatch, zfb lifecycle, prepared workbench output, standalone export. |
| `packages/diagram-gen/client/` | Package-owned browser application and stylesheet. |
| `packages/diagram-gen/tones/` | Catalog metadata, 24 recipes, editable source SVGs, explicit light/dark assets. |
| `packages/create-zudo-diagram-gen/` | Initializer, template, local dependency handling, and contract tests. |
| `examples/tone-exploration/` | Ten first-round directions plus an illustrative second-round refinement. |
| `examples/project-*/` | Five application/documentation examples with their source briefs. |
| `src/content/docs/` | Public MDX documentation for usage, authoring, architecture, commands, and agent workflow. |
| `scripts/` | Showcase preparation, example checking, local packaging, and related project tasks. |

Runtime Node code is ESM `.mjs`; the browser app uses ordinary JavaScript and CSS; zfb entrypoints use Preact TSX. The engine is shipped from source, so its package `files` list and relative runtime resource paths are part of the distributable contract.

## Run and assess the current checkout

Use Node.js 22–24 and pnpm 10. From the project root:

```bash
pnpm install
pnpm check
pnpm test
pnpm check:examples
pnpm build
pnpm dev
```

Open the address printed by zfb. Check the home page, `/tones/`, `/examples/`, and a documentation page. The root project prepares showcase data before starting zfb and watches examples, tone resources, and viewer assets for updates.

Then verify a packaged consumer outside this checkout:

```bash
pnpm pack:local

node packages/create-zudo-diagram-gen/bin/create-zudo-diagram-gen.mjs \
  ../diagram-consumer-check \
  --name "Consumer check" \
  --engine-package /absolute/path/printed/by/pack-local.tgz \
  --yes

cd ../diagram-consumer-check
pnpm install
pnpm check
pnpm build
pnpm dev
```

Replace the archive placeholder with the absolute engine archive path printed by `pack:local`. Do not point the consumer back into the engine's source directory. The initializer accepts an existing absolute archive or package dependency specification; relative local archives are intentionally rejected because the consumer uses a different working directory.

The initial consumer has a valid empty `r01` round. Add a candidate through the documented content schema, then verify that it appears while the server is running.

## Implemented app boundaries

### Session content

The coordinator owns `session.json`, `brief.md`, and `round.json`. Each drawing author owns a candidate directory containing `candidate.json` and SVGs. Candidate discovery avoids a shared generated gallery index that parallel agents would all need to edit.

Candidate IDs are globally unique and stable. A new refinement belongs in a later round with a parent pointer to an earlier candidate. The provided refinement fixture demonstrates this model and does not represent user approval.

### Viewer

The workbench has overview, inspection and comparison, stable IDs, filters, zoom/pan, placement context, artwork theme and backdrop choices, shortlist and chosen direction, feedback fields, and review copy/download/import. Verify exact interaction behavior in a real browser as described below.

SVGs display through image elements so their internal CSS and IDs are isolated. Explicit theme files carry their own colors. A missing dark asset is unavailable; it must not silently export the light file under a dark label.

### Feedback

The first version stores review state in the browser and transfers it through copied text or a downloaded JSON record. Fingerprints identify when the underlying candidate has changed. A saved browser selection does not write into the workspace or resume an agent conversation.

### Outputs

The engine CLI checks sessions, lists/shows tone references, exports the exact SVG for a selected candidate/theme, produces one offline HTML snapshot, and delegates normal session dev/build/preview to zfb.

The initializer creates a private host, accepts a caller destination, and leaves dependency installation optional. It does not initialize Git or install a personal skill.

## Decisions to preserve

| Decision | Reason |
| --- | --- |
| Package owns the viewer; session owns content. | Agents can create drawings within a predictable file contract. |
| zfb remains the host/build path. | It matches the user's core tooling and keeps configuration flexible. |
| SVG remains the artwork source. | Different illustration approaches can express different geometry without one mandatory graph language. |
| Tone recipes have actual SVG examples. | Agents and users can inspect concrete visual references. |
| The chosen SVG is the refinement baseline. | Later rounds preserve actual visual decisions rather than reconstructing them from prose. |
| Reviewed versions receive new IDs when refined. | Feedback and comparison retain their original meaning. |
| Browser feedback transfer is explicit. | Source files and browser state have a clear boundary. |
| Core skill receives paths; wrapper resolves personal paths. | The reusable system works outside one user's machine conventions. |

## Browser acceptance matrix

Run these checks in a real browser locally. The supplied verification report indicates whether any were completed during the original session.

| Area | Acceptance criterion |
| --- | --- |
| Empty session | Opens with useful guidance and no broken stage or unexplained failure. |
| Overview | Every expected candidate appears once; filters and ordering preserve its stable identity. |
| Inspect | Previous/next navigation works, and diagram labels remain clear at the selected scale. |
| Compare | Two candidates are visible with the intended theme/backdrop and understandable identity. |
| Zoom/pan | Fit, 100%, slider, modifier-scroll, drag, and reset behave consistently. |
| Placement | The diagram uses the exact session target dimensions; context text does not disguise overflow. |
| Theme | Available assets render correctly; missing dark files are explicit. |
| Feedback | Typing survives filtering/navigation; shortlist and direction have distinct meanings. |
| Persistence | State returns for the same session; storage failure does not break review. |
| Review transfer | Copy, download, and same-session import preserve selected IDs and feedback. |
| Stale review | Changing an SVG marks prior feedback as stale rather than quietly reapproving it. |
| Invalid import | Another session or unknown candidate IDs produce a useful error. |
| Keyboard | Controls can be reached and operated without trapping focus or intercepting text input. |
| Narrow viewport | Controls remain usable and the intended placement can be inspected without clipped UI. |
| Live files | Adding, editing, and removing a candidate updates the running session with understandable errors during invalid intermediate states. |
| Exported assets | The chosen SVG and offline HTML open independently of the source directory. |

If an area fails, reproduce the specific failure before changing code. Add a regression test where it covers a meaningful boundary. Do not replace real interaction verification with a build result.

## Next useful development work

### 1. Finish any environment-limited validation

Start with the verification report. Resolve actual failed or unverified browser/package checks. Confirm the generated consumer from local archives so the source handoff does not depend on this monorepo's layout.

### 2. Exercise one real project request

Choose a feature with an existing help placement. Read its real behavior and tokens, create the brief, initialize a session, and generate a manageable set of candidates. Ask the user to choose from those concrete drawings. Refine the actual selected SVG, then integrate the named result when requested.

This should reveal missing app capabilities and unnecessary workflow friction more reliably than adding speculative features.

### 3. Implement the core Claude Code skill

Use the user's selected skill repository and its current skill-creator guidance. The proposed public interface is:

```text
/diagram-gen --project <reference> --out <new-directory> --count <n> --tones <ids>
/diagram-gen --session <existing-directory>
```

`--out` creates and `--session` resumes; treat them as mutually exclusive. The core has no concrete personal logs path. Its responsibilities are project grounding, brief preparation, reference selection, candidate generation, validation, review, bounded refinement, and requested integration.

Keep the core skill concise and use references for the schema and authoring guidance. A natural-language request can override the default number of candidates or request one finished diagram directly. A user's selection for one diagram does not automatically become a project-wide style rule.

### 4. Add the user's wrapper

Implement `/my-diagram-gen` in the user's personal skill collection. Resolve their preferred output location through their existing helper, then pass the resolved destination to the core. Apply personal networking or naming conventions there.

Do not bake the wrapper's directories into the app or copy core generation logic into the wrapper.

### 5. Prepare publication and the project site

After package boundary and browser checks, confirm package names, repository metadata, license/provenance, and release versioning. Publish packages and host the site when the user requests those actions. Update installation documentation from local archives to the verified published commands at that point.

## Useful later additions

Consider a bounded local-server feedback-write endpoint if copy/download transfer proves cumbersome. Saving a review and automatically resuming an agent are separate features and should remain explicit.

Project context presets and contact-sheet export may also be useful. Keep the current metadata and SVG files portable when introducing them. Avoid requiring a remote service for the basic local review loop.

## Reporting back

For each development pass, describe the changed behavior, the checks actually performed, and the remaining material limitations. Link the chosen baseline and revised candidates by ID. Preserve review rounds and user feedback; do not treat an example fixture as an accepted user decision.
