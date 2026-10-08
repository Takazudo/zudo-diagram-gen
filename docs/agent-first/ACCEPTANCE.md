# P11 integrated acceptance

The actual public trial and saved-review workflow are complete. The final manifest remains pending
final-head root checks, pinned CI and command-bound evidence aggregation. A full pass requires every
required gate; no required deferred check can coexist with acceptance. P09 and P10 remain
prerequisite evidence and do not replace this trial.

The trial preserves all 55 original candidates and their 110 actual themed inspections: 98 passed
and 12 failed readability. Six new correction children received 12 separately opened passing
inspections. Two selected-baseline refinements and one later saved-kit diagram received six more
passing inspections, bringing the preserved total to 64 candidates and 128 actual themed views.
All current accepted artwork passes; the 12 failed original views remain recorded with exact
later-child dispositions. These are test evaluations, not user approval.

The original five-session/eight-tone source checkpoint is committed under `trial/sources`.
`trial/followup` preserves the later source overlay and original review transfer; the final ordinary
project registers six sessions and one explicit locked-tone comparison. The downloaded five-session
review was resumed through the installed engine, two explicitly selected parents were refined from
saved SVG bytes, and the later diagram used immutable `trial-v1` kit/scheme/palette. The five-target
snapshot remains unchanged; `trial-v2-six-targets` remained pending until explicit adoption.

Actual local project browser checks, 37 watcher transitions, the frozen packed consumer, the
separate no-browser consumer, named final SVG/HTML exports and the separate installed catalog
upgrade have passed. Local detached file transport was blocked by platform policy and is preserved
as a failed local attempt. The first pinned CI run at `b2b37b4dc9cf809cbcc090105cdd39c13dddeb23`
passed actual detached single/project coverage using browser `147.0.7727.15`; its tested synthetic
merge was `2337f377ba29bcef7f4739f2d934a53b0cffde84`. This is prior-run evidence, not final-head
acceptance: the subsequent validator fixes and frozen followup artifacts require final-head checks.

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

The manifest preserves `integratedSha` as the authored runtime package base and separately records
`validatedHeadSha`, which must equal actual checkout HEAD. A hashed runtime-equivalence command
record binds the unchanged engine/initializer packages and lockfile to that head and both archived
payload hashes; validation reruns the scoped Git diff. Root and CI records must execute at the final
head. CI records distinguish the PR head from its actually tested synthetic merge SHA.

The manifest records archive hashes, installed engine module, explicit
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
both newly created child themes and actual transferred feedback. Every parent must match an explicitly selected session/candidate/fingerprint. Children begin from exact saved
bytes; parent bytes and saved child feedback remain unchanged. Final child art receives its own
capture and inspection. Named SVG exports are compared byte for byte; both ordinary and project
HTML must be self-contained and free of known private/absolute source paths.

`workflow.immutableFiles`, `workflow.catalogUpgrade` and `workflow.noBrowser` retain separate
before/after records. The upgraded catalog must load from a different installed consumer and
actually resolve a changed context. The installed engine actually exports named saved candidates and single/project HTML before and after the
change; those outputs must match the original reviewed exports. Validation reexports through the
changed installed API using disposable output directories. Its copied old snapshot remains identical;
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

## Required gates and final validation

`scripts/integrated-acceptance.mjs` exports `GATE_ASSERTIONS`, the fixed required gate/assertion
matrix. Each pass links successful command JSON with the exact integrated SHA and named passing
assertions; a generic `status:pass` is insufficient. Missing, stale or duplicate records fail.
Failed/deferred gates require exact reproduction and a linked blocker issue. Browser helpers own
the actual assertions; the checker does not relabel HTTP transport as detached `file:` success.

Current required gates cover the trial, all-24 offline catalog, real project review and browser
matrix, watcher transitions, downloaded review/resume, saved refinement/later diagram, immutable
lock, separate installed catalog upgrade, exact exports, detached single/project HTML, no-browser
consumer, containment, root regressions, supported generated consumers and exact-head pinned CI.

Small authored SVG sources from the actual trial are frozen under `trial/sources` for
deterministic CI. CI must never call models or paid generation services. Bulk PNG evidence remains
local and ignored; no Git LFS is used. Historical pilot/P09/P10 failures and local browser/file
restrictions remain separately identified. The final external manifest is assembled after the report commit and final checks, avoiding a
self-referential committed SHA. Its exact-head result and CI links belong in the final review record.
