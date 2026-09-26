# zudo-diagram-gen

A local workspace for comparing, choosing, and refining SVG diagrams with an agent. The agent writes candidate SVG files; a person reviews them at the intended placement size, selects a direction, and gives feedback for the next round. Earlier drawings remain available.

This repository contains the reusable review package, a destination-based initializer, 24 illustrated tone references, worked example sessions, and a zfb + zudo-doc project site. The site serves documentation under `/docs/`, the tone catalog at `/tones/`, examples at `/examples/`, and a workbench demonstration at `/workbench/`. Run it locally with `pnpm dev`; a public site URL will be added after deployment is verified.

## Status and requirements

Both packages are at `0.1.0` and are **not published to a registry**. The instructions below use source and local archives. The proposed `/diagram-gen` and `/my-diagram-gen` Claude Code skills are documented interfaces, not installed commands. Review state lives in the browser until copied or downloaded; it does not write session files or resume an agent automatically.

Use Node.js 22–24 and pnpm 10.30.3. The repository records the pnpm version in `package.json`.

## Explore the project site

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address printed by zfb. The home page links to the documentation, tone catalog, examples, and workbench. For the documented path through a first session, start at [the getting started content](./src/content/docs/getting-started/first-session.mdx).

The site and its generated showcase data are rebuilt from source. `dist/`, `artifacts/`, and prepared pages are not committed outputs.

## Create a separate review session

From the repository root, pack the local packages:

```bash
pnpm pack:local
```

Use the **absolute engine archive path printed by that command** when calling the source initializer:

```bash
node packages/create-zudo-diagram-gen/bin/create-zudo-diagram-gen.mjs \
  ../diagram-session \
  --name "Feature help diagram" \
  --engine-package /absolute/path/to/engine-package.tgz \
  --yes

cd ../diagram-session
pnpm install
pnpm dev
```

The initializer creates a private zfb host with an empty first round. The installed `@takazudo/zudo-diagram-gen` package owns its viewer and CLI; the session owns `session.json`, `brief.md`, round metadata, candidate metadata, and SVG files. It does not initialize Git, select a personal output location, or install agent skills. Keep a local archive at its recorded path when reinstalling the generated host.

## Review and export

Add a candidate under `rounds/r01/<candidate>/` and run `pnpm check` in the generated session. The [session file guide](./src/content/docs/authoring/session-files.mdx) gives the metadata and asset contract. Each candidate has a stable ID; a refinement gets a new ID and a parent pointer to the selected earlier drawing.

The workbench supports overview, inspection, comparison, zoom and pan, theme and backdrop controls, shortlisting, and structured feedback. Transfer feedback with **Copy feedback** or a downloaded review JSON file. Export the exact selected SVG with the engine CLI:

```bash
pnpm exec zudo-diagram-gen export r01-c01 \
  --session . --theme light --out selected-diagram.svg
```

`pnpm build` creates the normal zfb site for the session. `pnpm export:html` creates a separate single-file offline review snapshot. See the [CLI reference](./src/content/docs/reference/cli.mdx) for all implemented commands.

## Develop and verify

From the repository root:

```bash
pnpm check
pnpm test
pnpm check:examples
pnpm build
```

These checks cover types, contract behavior, example sessions, and the site build. Packaging changes also need a fresh consumer installed from local archives outside this checkout. Viewer changes need real-browser interaction checks; a build alone cannot establish review behavior. See [quality and release checks](./src/content/docs/development/quality-and-handoff.mdx) and [AGENTS.md](./AGENTS.md) for contributor guidance. The historical [source handoff](./docs/CODEX-HANDOFF.md) records implementation context; it is not the current installation guide.

The root documentation host uses [zudo-doc](https://github.com/zudolab/zudo-doc) on zfb. Generated sessions use zfb and the diagram package without copying the documentation site.
