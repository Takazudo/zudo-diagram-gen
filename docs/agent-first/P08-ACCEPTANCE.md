# P08 CLI and distributable skill acceptance

The engine now supplies new/inspect/resume and versioned machine responses. It composes merged APIs; it never calls a model, installs a personal skill, reads browser storage, or writes browser review back to sources. Legacy check/tones bare JSON remains supported. Full command/error/review guidance ships in `packages/diagram-gen/skills/diagram-gen/references/commands.md`.

## Isolated package setup

Use Node 22–24 and pnpm 10. Pack local archives through `pnpm pack:local` (no publication), then create a bootstrap outside the checkout with private package.json dependencies on the absolute engine archive and `@takazudo/zfb:3.2.0`. Run `pnpm install`. Do not use workspace/link dependencies. Set these explicit paths:

```bash
export ENGINE_TGZ=/absolute/packed-engine.tgz
export DIAGRAM_ENGINE_MODULE=/absolute/bootstrap/node_modules/@takazudo/zudo-diagram-gen/src/index.mjs
export AGENT_WORKFLOW_OUT=/absolute/new-workflow-fixture
node scripts/check-agent-workflow-packed.mjs
```

The script reads only the installed engine, creates single/default-project/five-session hosts, authors public test SVGs, transfers explicit test review, copies a saved baseline into a later-round child, locks/adopts immutable test styles, verifies stale/partial states and exports exact SVG/combined HTML. It leaves all evidence and fixtures for the manager. Run `pnpm install`, `pnpm check`, and guarded `pnpm build` within the single, default-project and sweep hosts to establish installed zfb resolution without hand edits. Use the installed CLI for inspection and captures; no improvised screenshot server.

Skill discovery is explicit and isolated. In the bootstrap, resolve the packaged skill and copy its entire directory to a disposable agent workspace's `.claude/skills/diagram-gen`:

```javascript
import { createRequire } from 'node:module';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve('@takazudo/zudo-diagram-gen/skills/diagram-gen/SKILL.md'));
await mkdir('/absolute/disposable-agent-workspace/.claude/skills', { recursive: true });
await cp(source, '/absolute/disposable-agent-workspace/.claude/skills/diagram-gen', { recursive: true, errorOnExist: true, force: false });
```

Open that disposable workspace in a skill-capable agent and verify `/diagram-gen` discovery/frontmatter and relative reference reads. For another host, load the same packaged SKILL.md using its supported project-local skill mechanism. This setup is documentation, not an automatic personal install; `.claude/skills` under the user's home is never touched. Manual CLI remains usable without a skill. The core's `--out`/`--session` invocation arguments map to new/resume; they are mutually exclusive.

## Actual skill and visual smoke matrix

An automated fixture does not prove a model followed the skill. Record a manager agent transcript and actual image-tool calls for each scenario below. Supply the installed skill and reference files, real created host paths, explicit brief/review files and test purpose. All fixture choices are public tests, never user approval.

| Scenario | Evidence required |
| --- | --- |
| One diagram | Ground intent/must-show/may-drop/references/lock/target/fonts; one candidate; check then capture then actual image opening; exact saved export. |
| Five-session sweep | Five registered targets/briefs; one author per tone across sessions and one candidate writer; coordinator-only manifest/comparisons; failed worker remains resumable and siblings intact. |
| Review transfer | Actual viewer download/copy, saved caller review input, resume envelope preserves IDs/notes/fingerprint; no claim to read storage or write browser state. |
| Saved refinement | New later-round child with named saved parent/fingerprint, unchanged baseline geometry/facts/bytes and preserved feedback; actual changed-image evaluation if edited. |
| Style lock/adopt | Explicit selection purpose test, initial lock and pending later revision/adoption, separate drawing choice; prior snapshot stays immutable. |
| Missing browser | Run installed capture before adding playwright; CAPTURE_UNAVAILABLE/exit 3 with exact setup; no auto install or fake inspection; resume after explicit setup. |
| Stale evidence | Alter artwork/placement/style and retain notes/old selection; separate stale/unknown status; recapture and actually inspect affected PNG before renewed explicit test review. |

Use the `captureCommands` in workflow-evidence.json. After explicit consumer Playwright setup, capture light/dark single and all five project candidates at actual placement, passing --resource-root for registered project inputs. Open every proposed PNG with a real image viewer and record PNG SHA256 plus fingerprint/theme/placement/browser/fonts and observed facts/readability/contrast/geometry. Check capture sidecars still say `inspected:false`; write a separate evaluator report. Repeated captures require --force; protected source aliases remain forbidden. Capturing alone passes no visual gate.

Independent final review, full guarded b4push, fresh packed zfb builds, actual browser review transfer and skill transcripts/visual inspection are manager-owned gates. This document does not assert they have passed. P10 owns broader public-doc status consolidation.
