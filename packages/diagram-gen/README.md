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
Node I/O APIs run outside zfb's SSR graph. `createPageSource()` prepares a Preact
route containing the package-owned UI and validated data.

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
