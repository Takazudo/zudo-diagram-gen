# Saved style revisions and semantic SVG authoring

P04 provides local package APIs and the narrow `project lock` / `project adopt` commands. These operations do not generate diagrams, call models, install skills, or approve artwork. Use the ordinary project loader and scaffolder; a session alone does not acquire a project style by choosing a drawing in the viewer.

## Resolve explicit themes before review

```js
import {
  resolveToneContext,
  resolvePalette,
  materializeKit,
  materializeSvg,
} from '@takazudo/zudo-diagram-gen';

const context = await resolveToneContext('fine-outline');
const palette = resolvePalette(context.scheme); // or a complete explicit override
const canvas = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><title>予約の確認</title></svg>';
const instances = [
  { id: 'person-a', primitive: 'person', x: 20, y: 30, width: 80, height: 80 },
  { id: 'person-b', primitive: 'person', x: 180, y: 30, width: 80, height: 80 },
];
const light = materializeKit(context.kit.text, {
  scheme: context.scheme, palette, theme: 'light', instances, svg: canvas,
});
const dark = materializeKit(context.kit.text, {
  scheme: context.scheme, palette, theme: 'dark', instances, svg: canvas,
});
```

Save `light` and `dark` in the candidate directory before review. The palette has exactly `ink`, `surface`, `border`, `accent`, `deep`, `warning` in **both** themes, each a literal `#RRGGBB`. Complete overrides preserve the semantic distinction between warning and emphasis; an absent theme/role or unknown role fails. Values are copied, not inherited from a future catalog. No geometry changes follow from palette changes.

`materializeSvg(customSvg, {palette, theme})` also supports custom geometry. Only explicit `data-palette-fill` / `data-palette-stroke` markers change their literal default attributes; unmarked equal colors are left alone. Markers are removed in the output. Conflicting inline fill/stroke declarations fail rather than silently hiding a remap.

Each kit instance needs a unique slug ID and positive width/height; x/y default to zero. The instance contains a namespaced copy of the validated local definitions, including nested symbols, gradients, masks, clips, `href` / `xlink:href`, `url(#id)` and accessibility token lists. Local `<use>` references remain within the same self-contained SVG; external kits/CSS are never needed. Copying all local definitions conservatively avoids dropping dependencies and keeps construction deterministic, at the cost of larger files. Duplicate/dangling IDs, scripts, animation, external resources, dynamic colors/variables and unsupported reference syntax fail. Stylesheet selector rules are explicitly unsupported by these authoring helpers; use presentation attributes or static inline declarations. Existing standalone hand-authored SVG loading remains compatible.

Mechanical validation does not establish aesthetic quality, factual accuracy, label readability, or descriptive rule compliance. Inspect both literal assets at the actual placement, especially after remapping contrast and with long Japanese labels.

## Lock only with an authoritative explicit selection

A caller supplies a selection JSON, separate from browser review state:

```json
{
  "schemaVersion": 1,
  "kind": "explicit-selection",
  "purpose": "test",
  "baselines": [
    { "sessionId": "diagram", "candidateId": "c01", "fingerprint": "REPLACE_WITH_EXACT_CURRENT_64_HEX_FINGERPRINT" }
  ]
}
```

This example is a **test decision**, not user approval. Use `purpose: "user"` only for an explicitly supplied user decision. The lock validates each applicable registered session, exact candidate ID/fingerprint and tone. Session-qualified target dimensions and scheme typography are saved as constraints. A drawing selection, tone switch, preview, capture or shortlist never creates a lock.

```bash
zudo-diagram-gen project lock ./project --tone fine-outline \
  --palette ./palette.json --selection ./selection.json --revision r1 --json
zudo-diagram-gen project adopt ./project --revision r2 --json
```

Palette input is the complete `{light:{...},dark:{...}}` document. CLI commands reject duplicate/unknown options and emit one version-one envelope in JSON mode. Validation/stale selections exit 1, usage errors 2, unsafe resources/conflicts/I/O 4.

`lockProjectStyle(root, {toneId, palette?, selection, revision, toneRoot?})` writes `styles/<revision>/{style.json,scheme.json,palette.json,kit.svg}`. The first explicit lock adopts the new reference. Further calls create pending immutable revisions; **explicit** `adoptProjectStyle(root, {revision})` is required to change the effective project reference. Adoption reads and validates saved constituents and current baselines, without consulting the catalog. `palette.json` includes `schemaVersion:1`; its hash excludes derived hash fields, as do style/scheme hashes. `kit.svg` is preserved byte for byte. Test/user selection purpose is retained in immutable metadata.

`readStyleRevision(root, revision, {expectedHash?, sessions?})` returns `{style,scheme,palette,kit,hash}`. Supplying current project sessions additionally checks baseline/target compatibility; the actual project loader always does so for its adopted reference. The returned palette omits the snapshot format's `schemaVersion` field and can be passed directly to materializers. For a later diagram use these saved constituents, not `resolveToneContext` against a newer catalog.

Exclusive `.style-operation` prevents cooperating concurrent writers. Files are staged and the complete revision is published by rename before any atomic manifest update. Existing/partial revisions are never overwritten; interrupted staging and operation locks are preserved for diagnosis. After inspecting an interrupted operation, the caller may remove its abandoned lock explicitly; helpers never clear another process's lock or repair partial revision contents. If publication completed but adoption did not, validate and explicitly adopt that existing revision. Repeated creation refuses conflicts; repeated adoption is safe. A stale baseline may be replaced only by a fresh explicit selection in a new revision; old immutable files remain available.

## Preserve artwork lineage and review provenance

`styleProvenance(savedStyle)` returns `styleRevision,styleHash,schemeHash,kitHash,paletteHash`. Save this under `candidate.json`'s `provenance`; optional `assetHashes:{light,dark?}` must match saved asset bytes. The session loader exposes these fields without including them in legacy artwork fingerprints. P05 capture reads the saved `provenance.styleHash` into its existing sidecar contract.

`reviewCompatibility(candidate, previous, current)` compares artwork fingerprint, styleHash, placementHash and captureHash independently. Each result is `current`, `stale` or `unknown`; absent new metadata is unknown. Changing effective style while preserving saved artwork retains artwork feedback. The viewer preserves optional provenance hashes through review storage/import/export and shows style/placement evidence separately. The viewer has no loaded current capture evidence, so capture compatibility remains unknown there; API callers may compare actual saved capture hashes. Artwork changes still require explicit review, and existing notes/selected IDs remain visible; no fingerprints are advanced automatically.

`createRefinement(sessionRoot, {baselineCandidateId,fingerprint,roundId,candidateId,title,order?,feedback?})` starts a new child from the exact named saved light/dark SVGs. Supply a new unique ID in an existing later round; the parent pointer is the saved baseline. Optional feedback identifies that baseline by ID/fingerprint and is copied to `baselineFeedback` in the child's metadata. The copied geometry/facts stay intact until deliberately edited; helpers cannot certify later author changes. Original saved files and browser feedback remain intact. If editing a child with `assetHashes`, update those hashes deliberately to the new saved bytes, then review the new fingerprint.

`exportCandidate(sessionRoot, id, {theme,output,resourceRoot?})` exports saved validated UTF-8 bytes, including BOM and line endings. It never rematerializes or regenerates against current kits. For a session nested in a project, explicitly supply the project `resourceRoot` (CLI `--resource-root`) to protect project/style inputs and validate the candidate's saved style revision/hash. No ancestor project is discovered. Without an explicit project root, protection remains session-local and project style validation is unknown. Export refuses source overlap, missing themes/assets, supplied asset-hash mismatch, symlink/hard-link aliases and invalid saved style references. Atomic temporary-file publication preserves existing valid output during failures and supports ordinary repeated SVG overwrite behavior.
