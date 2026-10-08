# Multi-session projects

## Current status after P08/P09

Project review/combined offline export (P07), semantic immutable style validation/lock/adopt (P04), and explicit new/inspect/resume/packaged core skill (P08) are implemented. All 24 bundled tones have complete context (P09). Public current guidance is [Projects](../../src/content/docs/authoring/projects.mdx), [Tone context](../../src/content/docs/authoring/tone-context.mdx) and [CLI](../../src/content/docs/reference/cli.mdx). The P06 milestone text below is preserved historical implementation context: its future-P04/P07 statements describe that stage, not current capability.

## Original P06 milestone record

P06 adds project loading, one installed zfb host and individual session review routes. Candidate identity is `(sessionId, candidateId)`: ordinary session IDs, version-one review imports, saved SVG fingerprints and session-local refinement parents stay unchanged. The deck comparison UI, project review import and portable project HTML belong to P07.

## Create a host

```bash
create-zudo-diagram-gen ./diagram-project --project --engine-package /absolute/path/engine.tgz
cd diagram-project
pnpm install
pnpm dev
```

Creation leaves installation opt-in, never initializes Git and refuses nonempty or symlink destinations. `--project` creates one starter session under `sessions/diagram`; the programmatic `createProject({destination,project:true,sessions:[{slug,id?,title?,target?}]})` creates multiple sessions. The engine owns `src/scaffold.mjs`; the initializer distributes its generated bundle and prepack checks for drift, with no engine registry dependency.

The root overview lists every registered session with its current, invalid, missing or stale status. `/sessions/<persisted-session-id>/` serves the existing package-owned session workbench. Run one `pnpm dev` process from the host. The root documentation host remains on zfb 2; initialized consumers remain on zfb 3, and route generation supports both dialects.

## Manifest and validation

```json
{
  "schemaVersion": 1,
  "id": "teaching-deck",
  "title": "Teaching deck",
  "sessions": [
    { "id": "reservation-flow", "path": "sessions/reservation-flow", "order": 0 }
  ],
  "comparisonSets": []
}
```

IDs, paths and orders must be unique. A registered ID must equal its session.json ID. Paths stay inside `sessions/<slug>`; placement and style paths stay inside the project root. Registered paths reject symlink components and traversal. Comparison sets name exact session IDs, candidate IDs and fingerprints for every registered session. Missing coverage, duplicates, missing candidates, tone mismatch and changed fingerprints are explicit failures. Empty comparison sets are valid while authoring. Themes are reported from actual candidate assets; a missing dark asset remains unavailable.

`loadProject(root,{strict:false,lastValid?})` and `loadContent(root)` inspect partial content. Pass a caller-owned `Map` as `lastValid` to retain snapshots. Returned session entries explicitly mark retained data stale and include its observed content hash. Without that map, invalid sessions have no data. `validateProject`, CLI `check` and `build` require all registrations and comparisons to be current and valid. Dev keeps valid siblings usable through partial writes and recovery; retained galleries display a visible STALE banner. A malformed manifest cannot authorize new traversal: dev may show only its prior registrations as stale.

Optional style references use `{revision,path,hash}`. P06 checks contained snapshot paths, versions/revision, canonical metadata/constituent hashes and exact kit bytes. Full style semantic/lock validation awaits P04: a style reference currently yields an explicit incomplete diagnostic even when its hashes match. Hash validation alone never claims style approval. Declared placements use P05's shared loader for exact slot/target agreement, frame containment, fonts and local raster validation/resource budgets. Sessions expose the normalized descriptor, embedded reference images and a separate placementHash; absolute filesystem paths are excluded. Legacy candidate fingerprints and session review IDs stay unchanged. Placement errors invalidate only the affected session; a retained placement snapshot is visibly stale. Project HTML export remains assigned to P07, so the project scaffold does not advertise that command yet.

## Files and watching

The poller reads only project metadata, registered session content, declared placement files/images and the four referenced style snapshot files. It never scans unrelated sessions, dependencies or generated output. Add, remove and re-add registrations by editing project.json; keep retained IDs stable. Invalid-to-valid edits recover on subsequent polls. Generated routes are tracked by SHA-256 in `.generated/diagram-routes.json`: only unchanged owned routes are replaced or pruned. Hand-written routes and edited generated routes are preserved and reported as conflicts, even when they retain the generator comment. Keep the ledger with the generated host state; it is ignored in Git. When project.json is removed or partially written, the watcher retains only the previously authorized registrations so registered edits and metadata recreation still recover.

### Upgrading a pre-ledger host

An older generated pages/index.tsx has no hash ownership ledger. If it exactly matches the current generated source, preparation safely adopts it. If source content changed before the upgrade, preparation preserves the existing route and reports an actionable conflict. Review the route and record its exact SHA-256, then explicitly grant ownership:

```bash
sha256sum pages/index.tsx
node --input-type=module -e 'import {adoptGeneratedRoutes} from "@takazudo/zudo-diagram-gen"; await adoptGeneratedRoutes(".",{expectedHashes:{"pages/index.tsx":"REPLACE_WITH_REVIEWED_SHA256"}})'
pnpm dev
```

Adoption rejects missing files, non-generated routes, wrong hashes and changed bytes; it changes the ledger only. This explicit grant authorizes the next regeneration to replace those exact reviewed bytes. The generator comment alone never grants automatic ownership. Modified routes already protected by a ledger remain conflicts until explicitly reviewed and adopted.

## Five public inputs and evidence

The five public inputs in `evaluation/inputs.json` are reservation-flow, empty-seats, long-labels, pending-queue and return-items. Create one host containing their original briefs, persisted IDs, exact targets and placement references with:

```bash
node scripts/create-public-project.mjs /tmp/my-empty-public-project /absolute/path/engine.tgz
```

This generates no artwork or evaluation approval. Unit coverage includes five-session loading, exact comparisons, lineage and identity failures, symlink containment, hash ownership and actual filesystem polling recovery. For manager-scheduled packed validation, set absolute `ENGINE_TGZ`, `INITIALIZER_TGZ` and new `PROJECT_CHECK_OUT`, then run `scripts/check-project-packed.sh` under the heavy guard. Run `scripts/check-project-browser.mjs <installed-project>` under heavy/browser guards. `PROJECT_PLAYWRIGHT_MODULE` may select an explicit installed Playwright module; `PROJECT_BROWSER_EXECUTABLE` selects an explicit system browser whose version is recorded. The script uses HTTP, asserts all five routes, stale/current recovery, sibling availability, candidate addition and registration removal/re-addition. Packed/browser success is recorded only after these scripts actually run.
