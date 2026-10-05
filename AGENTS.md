# Agent instructions

## Product intent

`zudo-diagram-gen` is a local SVG candidate review system. Keep generation, review, refinement, and export practical for a human working with an agent. The root site is a single zudo-doc documentation site with the tone catalog, worked examples, and an embedded review workbench. The package owns the review application; generated sessions supply content.

Read `docs/CODEX-HANDOFF.md` before continuing this source handoff. Read `IMPLEMENTATION-CONTRACT.md` when changing package boundaries or schemas. Current executable behavior and tests take precedence over a proposed interface in the planning documentation; update the documentation when that behavior changes.

## Repository boundaries

- Root: one zudo-doc site hosted by zfb; the workbench is embedded in documentation pages through chrome bindings.
- `packages/diagram-gen`: engine, browser workbench, tone collection, session CLI.
- `packages/create-zudo-diagram-gen`: destination-based initializer.
- `examples`: complete session fixtures used to exercise and demonstrate the engine.
- `src/content/docs`: public documentation in MDX.
- `docs`: contributor decisions and local development handoff.

Do not copy the workbench implementation into generated sessions. Do not add a personal logs path, a home-directory convention, or automatic Git initialization to the engine or initializer.

## Implementation conventions

- Use pnpm. Keep exact project dependency versions and the lockfile in sync.
- Keep zfb as the development/build/preview path. The root documentation site uses zudo-doc chrome bindings to embed the workbench. The offline HTML export is an additional output.
- Runtime Node modules use ESM `.mjs`; browser code uses ordinary JavaScript/CSS; generated session pages use zudo-react TSX on zfb 3 and retain Preact TSX support on zfb 2. The root zudo-doc host remains on Preact and zfb 2.
- Prefer direct SVG authoring and an ordinary JSON metadata contract. Keep explanatory content independent of viewer code.
- Preserve stable session, round, tone, and candidate IDs. Asset paths remain relative to their candidate directory.
- Each parallel generation worker owns one candidate directory. The coordinator owns the brief and round/session metadata.
- Reviewed versions remain available. A refinement creates a new candidate with a parent pointer to the earlier-round baseline.
- SVG artwork is loaded as an image to isolate document IDs and styles. Explicit light/dark assets must remain complete outside the viewer.
- Feedback stored in browser storage is browser state. Do not describe it as a source-file write.

## Verification

Use the checks appropriate to the change:

```bash
pnpm check
pnpm test
pnpm check:examples
pnpm build
```

For initializer or packaging changes, also pack and consume the local archives in a fresh directory outside this workspace. Verify that the generated host resolves the installed package rather than source files from this repository.

For viewer changes, use a real browser to verify keyboard operation, filtering, theme handling, placement size, zoom/pan, review persistence, and copy/download/import actions. A successful static render or build does not establish that these interactions work. Record unavailable verification accurately and provide exact reproduction steps.

Do not add tests that simply duplicate a constant or a reversible copy edit. Test contract behavior, error handling, lineage, path containment, exports, and the installer boundary when those areas change.

## Documentation and scope

Distinguish implemented app functionality from the documented future `/diagram-gen` and `/my-diagram-gen` skill contract. There are no installable Claude Code skills in this first app handoff.

Record every user-visible change as a changelog entry under `src/content/docs/changelog/`.

Do not publish packages, deploy the site, modify a remote repository, or install a personal skill as an incidental part of local validation. Carry out such actions when the user requests them. The current GitHub source-handoff workflow is authorized to push branches, open and merge pull requests, and update its project issues; this exception does not authorize package publication, deployment, or skill installation.

When handing off work, describe what changed, how it was checked, and the material remaining limitations. Preserve the user's selected drawing and feedback when refining diagrams.
