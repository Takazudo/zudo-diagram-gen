# Candidate placement and capture

P05 provides a reusable `captureCandidate` API and `capture` CLI. The workbench and capture use the same image-element placement renderer; saved light and dark SVGs remain complete and isolated. Capture never changes a review or asserts that a person inspected the image.

Install the optional capability explicitly in the consumer:

```bash
pnpm add -D playwright@1.59.1
pnpm exec playwright install chromium
```

Install browser OS dependencies separately when required. Ordinary checking, tone reading and exact SVG export never download or import a browser. Missing library/browser prerequisites return `CAPTURE_UNAVAILABLE` (exit 3). An existing local executable can be supplied explicitly with `--browser-executable /absolute/path/to/chromium`; there is no automatic system-browser fallback or global configuration change. Evidence records the actual Chromium version and system-browser substitution.

```bash
zudo-diagram-gen capture candidate-id --session ./session \
  --placement placement.json --out ./session/exports/frame.png --dpr 2 --json
zudo-diagram-gen capture candidate-id --session ./session \
  --out ./captures/slot.png --crop slot --theme dark --json
```

`--force` permits replacing output files, but never source or input files. Both the PNG and `<output>.json` sidecar are protected. Inside a session/resource root, use `exports/`; other internal directories are conservatively reserved for source. External output directories are supported. Existing symlink destinations and source aliases are rejected.

The descriptor uses CSS pixels. Slot dimensions must equal `session.target` exactly. Artwork is centered with `contain`, preserving its actual aspect ratio. With no descriptor the frame equals the target and receives the theme-appropriate background.

```json
{
  "schemaVersion": 1,
  "frame": {"width": 800, "height": 360, "background": "transparent"},
  "slot": {"x": 40, "y": 60, "width": 640, "height": 180},
  "fit": "contain",
  "fonts": ["Noto Sans CJK JP", "sans-serif"],
  "context": {"title": "操作の確認", "body": "図の表示サイズを確認してください。"}
}
```

Optional `images` entries are `{path,x,y,width,height}`. Paths resolve from the descriptor directory within the explicit resource root. Only local static PNG/JPEG/WebP are accepted; GIF and detectable animated PNG/WebP are rejected because CSS cannot freeze their frames. References are embedded in the capture/viewer data, and their original byte hashes enter placement provenance. Do not share private embedded imagery without authorization. `loadPlacement` contains filesystem metadata for internal use; `portablePlacement` removes absolute paths when preparing viewer data.

For a project, pass the explicit project root with `--resource-root ./project` and the session with `--session ./project/sessions/session-id`. Resolve `--placement placements/example.json` relative to that resource root. The session's real path must remain inside it. The engine never discovers a project by traversing ancestors.

```js
import { captureCandidate, loadPlacement, portablePlacement } from '@takazudo/zudo-diagram-gen';
const result = await captureCandidate('./session', 'candidate-id', {
  output: './captures/frame.png',
  dpr: 2,
  crop: 'frame',
  timeoutMs: 30000,
  signal: abortController.signal,
});
const portable = portablePlacement(await loadPlacement('./session', {width:640,height:180}, {
  placement: 'placement.json',
}));
```

DPR is 0.5–4; timeout is 1000–60000ms (CLI `--timeout-ms`). Dimensions are positive and at most 20000 CSS pixels. The full rendered frame is limited to 40 million physical pixels even for a slot crop. Individual reference files are limited to 16 MiB, descriptor JSON to 1 MiB and combined inputs to 64 MiB. Unexpected network requests, path/symlink escapes, conflicting target dimensions, missing themes and invalid descriptors fail before publication. SVG animation is rejected; turbulence requires an explicit seed. The capture closes its server, context and browser and removes temporary files after failure or cancellation.

Readiness waits for declared local font availability, `document.fonts.ready` and every image decode. Generic font families are recorded as generics; this does not identify their OS-selected face. Named missing fonts, decoded image pixel budgets and context overflow/slot overlap fail explicitly. The SVG remains an isolated image: readiness does not certify Japanese glyph coverage, shaping, label readability or arbitrary internal SVG clipping. Inspect representative captures separately.

Provenance records session/candidate identity, legacy fingerprint, exact SVG byte hash, optional explicit style hash, placement/reference-image hashes, theme, crop, frame/slot, DPR, physical dimensions, viewport, actual browser/OS/declared-font environment, PNG byte hash, timestamp and `inspected:false`. Changed relevant inputs invalidate applicable evidence; `captureHash` excludes the timestamp. Neither font readiness nor a successful screenshot is user approval. Use controlled environments for pixel baselines and visual judgment for artwork quality.

Validation reproduction (under the repository's heavy/browser guards):

```bash
CAPTURE_BROWSER_EXECUTABLE=/usr/bin/chromium \
CAPTURE_EVIDENCE_DIR=/tmp/diagram-capture-evidence node scripts/check-capture.mjs
node scripts/check-capture-consumer.mjs /absolute/path/to/engine.tgz
```

The second command installs into a disposable consumer, verifies check/exact export without Playwright, verifies actionable capture failure, explicitly adds the optional peer, and captures with the installed package. Without an explicit executable it requires the documented installed pinned browser. Both scripts clean up disposable fixture state. The browser script retains only invented representative outputs and a provenance report in the chosen evidence directory.
