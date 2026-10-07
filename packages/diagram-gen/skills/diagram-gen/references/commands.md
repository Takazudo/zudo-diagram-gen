# Commands and saved review inputs

Use `pnpm exec zudo-diagram-gen` in the installed host. Commands work manually without a skill. `--out` is explicit; `--engine-package <absolute.tgz>` supports an unpublished engine. Create empty content, then author candidates:

```bash
pnpm exec zudo-diagram-gen new --out /caller/new-session --brief /caller/brief.md --json
pnpm exec zudo-diagram-gen new --out /caller/new-project --brief /caller/brief.md --project --json
pnpm exec zudo-diagram-gen resume /caller/session --review /caller/review.json --json
pnpm exec zudo-diagram-gen inspect /caller/project --json
pnpm exec zudo-diagram-gen tones show fine-outline --json-version 1
pnpm exec zudo-diagram-gen check /caller/session --json-version 1
pnpm exec zudo-diagram-gen capture r01-c01 --session /caller/session --out /caller/capture.png --theme light --json
pnpm exec zudo-diagram-gen export r01-c01 --session /caller/session --theme light --out /caller/export.svg --json
pnpm exec zudo-diagram-gen export-html /caller/project --out /caller/review.html --json
```

Add `--placement <file> --resource-root <project>` when placement assets live in a registered project. Capture accepts `--dpr`, `--crop frame|slot`, `--timeout-ms`, and explicit `--browser-executable`. Capture and HTML export refuse existing outputs unless `--force`; force cannot overwrite sources. Legacy SVG export retains safe nonsource overwrite. `dev|build|preview <root>` delegates to zfb and retains normal logs; it has no JSON mode.

New commands' `--json` and check/tones' `--json-version 1` emit one `{schemaVersion:1,command,ok,data,errors,warnings}` object. Errors/warnings contain `code,message,path?`. Bare legacy `check/tones --json` retains its shape and failure exit 1. Versioned exit codes: 0 success; 1 validation/incomplete/stale; 2 invalid arguments/version; 3 missing capture capability; 4 I/O/unsafe resource/output conflict; 130 cancellation. Inspect/resume can return partial project data with `ok:false`. They read only files and supplied review, never browser storage. Capture capability reports library availability and unknown browser readiness; it does not download anything.

For missing capture support, run explicitly in the consumer:

```bash
pnpm add -D playwright@1.59.1
pnpm exec playwright install chromium
```

Install OS dependencies separately if required. A supplied executable must already exist; record actual substituted browser version. Preserve files after failed `--install`; run `pnpm install` in that host to retry, then `resume`. Do not rerun `new` over interrupted content.

Use public APIs from `@takazudo/zudo-diagram-gen` for materialization and lineage. For refinement, first create a later `round.json` (greater order, baselineCandidateId), then:

```javascript
import { createRefinement } from '@takazudo/zudo-diagram-gen';
await createRefinement(sessionRoot, {
  baselineCandidateId: saved.id, fingerprint: saved.fingerprint,
  roundId: 'r02', candidateId: 'r02-c01', title: 'Requested refinement',
  feedback: { id: saved.id, fingerprint: saved.fingerprint, keep, change, action: 'refine' },
});
```

The operation copies exact saved light/dark bytes and records the earlier parent. Update `assetHashes` deliberately after editing; do not advance review fingerprints automatically.

A downloaded session review has `schemaVersion:1,type:'zudo-diagram-review',sessionId,records,shortlist` and optional chosenDirection/reviewedCandidate/feedback. Preserve actual downloaded fields. A project review has `type:'zudo-diagram-project-review',projectId,sessions:[ordinary session reviews]`. Unknown/foreign/duplicate sessions and malformed records reject. Fingerprints can be stale; inspect reports independent compatibility and preserves the supplied record.

Style adoption requires explicit project-wide intent, independently of a drawing selection. Create a JSON selection `{schemaVersion:1,kind:'explicit-selection',purpose:'user'|'test',baselines:[{sessionId,candidateId,fingerprint}]}` and a complete light/dark palette with ink/surface/border/accent/deep/warning roles. Use:

```bash
pnpm exec zudo-diagram-gen project lock /caller/project --tone fine-outline --palette /caller/palette.json --selection /caller/selection.json --revision style-01 --json
pnpm exec zudo-diagram-gen project adopt /caller/project --revision style-02 --json
```

Initial lock adopts; later revisions remain pending until explicit adopt. Revisions are immutable. Purpose test describes a fixture decision only. Use readStyleRevision/styleProvenance for saved palette/kit provenance; never treat an upgraded catalog as the saved lock.
