# P11 integrated acceptance remains pending

P11's deterministic evidence checker is implemented. The new five-session public author trial,
browser checks, saved-review refinement, immutable-lock upgrade probe and current-head CI must
finish before this document can claim full acceptance. P09 and P10 evidence remains prerequisite
evidence; it does not replace the new trial. No required deferred check can coexist with a full
pass.

The trial begins from integration base `c1935b83d4722397c1260a8684d24d84f58ad858`. The manager
owns packing, installing, model-author dispatch, actual capture/image inspection, browser runs,
heavy validation and CI. The acceptance worker owns deterministic record validation and this
report. Package publication, production deployment, personal skill installation, native host
discovery and real-deck integration are outside this acceptance workflow.

## Missing or stale evidence prevents a pass

```bash
node scripts/assemble-integrated-trial.mjs /absolute/config.json /absolute/new-trial-manifest.json
node scripts/check-integrated-acceptance.mjs /absolute/trial-manifest.json /absolute/evidence-root
```

The assembler only reads actual saved installed-project content and caller-supplied records. It
does not author SVGs, create captures, inspect images, manufacture command results or substitute
synthetic test records. Existing output files are preserved. The checker exits zero only when all
required records and gates pass; failed or required deferred gates return a nonzero exit.

The manifest records the integrated SHA, archive hashes, installed engine module, explicit
installed skill-file loading, Node/pnpm/browser/OS/fonts, one author per tone and transcript
references. Original P00 brief, checklist, placement and palette bytes are checked against the
public source. Installed engine realpaths must stay inside this consumer's `node_modules` and
outside the checkout. Ordinary session target sizes remain authoritative.

Initial candidates are `r01-fine-outline`, `r01-soft-fill` and `r01-swiss-grid` in each of the five
P00 sessions. The second round contains `r02-<tone>` for all eight required tones in every session.
These 55 candidates are a floor. Preserve a complete five-session/eight-tone checkpoint before
adding the later ordinary diagram. The final six-session project uses an explicit valid comparison
in the adopted locked tone, covering all six registrations; the earlier eight-tone checkpoint
retains its exact five-session coverage. Later corrections remain in the same evidence manifest.
Reviewed corrections use later rounds and new IDs with earlier parent lineage.

Each image links hashed saved SVG, PNG, production sidecar and separate inspection JSON. Production
sidecars retain `inspected:false`. Inspection records bind session, candidate, fingerprint,
theme, SVG/PNG/placement/style hashes, actual tool-call reference, opened-image claim and rubric
observations. Accepted artwork requires no recorded factual violations and integer readability
and character scores of at least three. Failed original artwork can remain explicitly superseded
only with an accepted exact later child and a preserved correction reason. Earlier failed evidence
is not rewritten.

Hash validation verifies the supplied records' integrity. It cannot independently establish that
an evaluator opened an image, a model authored artwork or a browser executed a command. The manager
must supply actual tool-call and execution records. Test selections remain test decisions, never
user approval.

## Required workflow artifacts bind the commands to saved results

`workflow.review` links the actual downloaded review, installed `resume` JSON envelope and
explicit test selection. Resume must retain the exact transferred review; selected baselines
must match downloaded chosen directions and current session-qualified fingerprints.

`workflow.refinements` identifies saved parent/child candidates, both original baseline themes,
both newly created child themes and actual transferred feedback. Children begin from exact saved
bytes; parent bytes and saved child feedback remain unchanged. Final child art receives its own
capture and inspection. Named SVG exports are compared byte for byte; both ordinary and project
HTML must be self-contained and free of known private/absolute source paths.

`workflow.immutableFiles`, `workflow.catalogUpgrade` and `workflow.noBrowser` retain separate
before/after records. The upgraded catalog must load from a different installed consumer and
actually resolve a changed context. Its copied old snapshot and reviewed exports remain identical;
later materialization uses the saved kit/scheme/palette, independent of the changed catalog.

`workflow.sweep` links the preserved five-session source tree and its hashed project manifest.
Its eight exact mappings and original saved fingerprints remain unchanged in the final project.
`workflow.styleRevisions` binds the initial and new revision/hash, pending project metadata and
explicitly adopted final metadata. The original snapshot covers five targets; adding the sixth
requires a new explicit revision/adoption. `workflow.laterDiagram` identifies the new ordinary
session and its candidate's saved style provenance.

Run these probes through the manager with explicit new consumer destinations:

```bash
node scripts/probe-integrated-distribution.mjs no-browser /absolute/probe-config.json /absolute/new-consumer
node scripts/probe-integrated-distribution.mjs installed-catalog-upgrade /absolute/probe-config.json /absolute/new-upgrade-consumer
```

Both install the actual engine archive with pnpm 10.30.3 and disabled automatic peer installation,
retain commands and failures, and launch no browser. The no-browser probe checks actual copied
trial content, resolves complete tone context, exports exact light/dark SVG and ordinary HTML,
then requires actionable `CAPTURE_UNAVAILABLE`/exit three with unchanged dependency inventory.
Child resolver/CLI commands clear and record `NODE_PATH` so host-injected global Playwright cannot
silently become a consumer capability. The host configuration remains unchanged.
The upgrade probe changes only a separate installed scheme through atomic replacement, protecting
pnpm's potentially shared hardlink store and the original trial installation. This deliberate
future-context fixture is not a published package upgrade.

## All required gates still need current execution evidence

`scripts/integrated-acceptance.mjs` exports `GATE_ASSERTIONS`, the fixed required gate/assertion
matrix. Each pass links successful command JSON with the exact integrated SHA and named passing
assertions; a generic `status:pass` is insufficient. Missing, stale or duplicate records fail.
Failed/deferred gates require exact reproduction and a linked blocker issue. Browser helpers own
the actual assertions; the checker does not relabel HTTP transport as detached `file:` success.

Current required gates cover the trial, all-24 offline catalog, real project review and browser
matrix, watcher transitions, downloaded review/resume, saved refinement/later diagram, immutable
lock, separate installed catalog upgrade, exact exports, detached single/project HTML, no-browser
consumer, containment, root regressions, supported generated consumers and exact-head pinned CI.

Small authored SVG sources from the actual trial will be frozen under `trial/sources` for
deterministic CI. CI must never call models or paid generation services. Bulk PNG evidence remains
local and ignored; no Git LFS is used. Historical pilot/P09/P10 failures and local browser/file
restrictions remain separately identified. Full results and remaining blockers will be appended
here only as actual execution evidence arrives.
