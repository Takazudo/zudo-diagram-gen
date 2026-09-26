# zudo-diagram-gen

A local workspace for comparing, choosing, and refining SVG diagram candidates. The project includes a **zfb + zudo-doc documentation site**, a package-owned review app, an initializer, and a collection of 24 illustration tones with example SVGs.

The working loop is simple: establish a shared brief, generate candidates, review them at their intended size, choose a direction, and refine the saved drawing. A future Claude Code `/diagram-gen` skill can drive that loop using the file and command interfaces documented here.

## What is included

- `@takazudo/zudo-diagram-gen`: session loading and validation, the SVG workbench, tone references, exports, and commands that run sessions through zfb.
- `create-zudo-diagram-gen`: a destination-based initializer that creates a small private session project.
- A project documentation website with a live tone catalog at `/tones/` and worked examples at `/examples/`.
- SVG source files and explicit light/dark reference assets for all 24 tones.
- A local Codex handoff and a documented core/wrapper skill interface.

The packages are versioned `0.1.0` for this source handoff. No registry publication or website deployment is part of this handoff. Installation instructions below use this checkout and local package archives; a package name alone is not yet a verified installation command. The proposed personal Claude Code skills are separate future work.

## Build local previews

This repository ships the authored source, tone SVGs, and example sessions. It does not ship the generated `dist/` site, `artifacts/` archives or standalone HTML, showcase pages, preview SVGs, or zudo-doc routes. `pnpm build` regenerates the showcase pages and previews and builds the site. `pnpm export:preview` creates standalone HTML snapshots in `artifacts/`; `pnpm pack:local` creates local package archives there. These outputs can be rebuilt from this checkout. Review state uses browser storage when available; copy/download provides the transfer back to an agent.

## Run the project website

Use Node.js 22–24 and pnpm 10.30.3. The workspace records the exact pnpm version in `package.json`; `corepack pnpm` selects it without changing the global pnpm installation. CI pins Node.js 24.13.0 and pnpm 10.30.3 and runs a frozen install, check, test, example validation, and build on pull requests and main.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open the address printed by zfb. The site provides documentation, the 24-tone collection, and diagram example galleries.

```bash
pnpm check
pnpm test
pnpm check:examples
pnpm build
pnpm preview
```

`pnpm build` builds the project documentation website with zfb. Standalone session HTML is also available through the engine CLI; see the command reference on the site.

## Create a session from the downloaded source

First build local package archives:

```bash
pnpm pack:local
```

Use the engine archive path printed by that command with the source initializer:

```bash
node packages/create-zudo-diagram-gen/bin/create-zudo-diagram-gen.mjs \
  ../diagram-session \
  --yes \
  --engine-package /absolute/path/to/the/engine-package.tgz

cd ../diagram-session
pnpm install
pnpm dev
```

The initializer creates an empty candidate gallery and accepts an ordinary destination. It does not choose a personal logs directory, initialize Git, or install skills. See `node packages/create-zudo-diagram-gen/bin/create-zudo-diagram-gen.mjs --help` for the supported options.

In a session, agents normally edit `session.json`, `brief.md`, and the files below `rounds/`. The dependency owns the viewer.

## Session content

| Path | Purpose |
| --- | --- |
| `session.json` | Stable session identity, target size, project reference, and placement context. |
| `brief.md` | Shared facts, exact labels, source references, and what the current exploration should resolve. |
| `rounds/r01/round.json` | Round identity, ordering, purpose, and optional selected baseline. |
| `rounds/r01/c01/candidate.json` | Stable candidate identity, tone, relative asset paths, and lineage. |
| `rounds/r01/c01/diagram.light.svg` | The actual drawing for the light theme. |
| `rounds/r01/c01/diagram.dark.svg` | An optional explicit dark-theme drawing. |

Candidates are discovered from metadata. IDs remain stable even when the gallery is filtered or sorted. Refinements get a new ID and refer to the earlier candidate that they build on.

## Review and feedback

The workbench provides an overview, inspection and comparison, zoom and pan, actual placement previews, independent artwork-theme and backdrop controls, a shortlist, and structured feedback.

Review state is stored in the browser when storage is available. **Copy feedback** and **download review JSON** are the supported transfer mechanisms. Those actions do not write into the session source directory or resume a Claude Code conversation automatically.

## Core skill and personal wrapper

The proposed core interface accepts a destination through `--out`, plus project/session context and exploration options. A personal wrapper such as `/my-diagram-gen` can resolve a logs directory and call the core with that destination. The package and core contract do not contain a personal filesystem policy.

These interfaces are documented in the website under **Agent workflow**. This handoff does not create or install a Claude Code `SKILL.md`.

## Continue development locally

Read [AGENTS.md](./AGENTS.md) for repository conventions and [docs/CODEX-HANDOFF.md](./docs/CODEX-HANDOFF.md) for the implementation map, acceptance criteria, and next development work. [docs/VERIFICATION.md](./docs/VERIFICATION.md) records completed checks and remaining validation limits.

This architecture follows the small-host/shared-package approach used by [zudo-doc](https://github.com/zudolab/zudo-doc) and [zudo-sg](https://github.com/Takazudo/zudo-sg). The session app uses zfb for development, build, and preview; the project documentation site also uses zudo-doc.
