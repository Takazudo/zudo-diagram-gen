# P09 native catalog acceptance

All 24 stable catalog tones have complete native packs. All 192 composition/inventory × native/alternate palette × light/dark images passed primary review; 104 images from 13 textured/layered tones passed an independent second review. Accepted images have zero recorded factual violations and readability/character scores of at least 3. The 72 original reference SVGs and four accepted pilot pack directories remain unchanged.

[Portable per-image evidence](./P09-VISUAL-EVIDENCE.json) identifies artwork head `d700a7b600ad42c131103ce85d45198cc5b961e6`, current SVG/PNG hashes, capture/placement fingerprints, browser, font file hashes and evaluator records. Twenty-four corrected compositions were recaptured; the other 168 exact SVG and PNG hashes matched previously opened images. All initial failures and evaluator disagreements remain in the artifact and [revision history](./P09-VISUAL-REVISION-HISTORY.json). Revisions resolved route/frame collisions, checkmark contrast, pilot label misassociation, isometric shadow interference and marker warning contrast.

The [matrix](./P09-COMPLETENESS-MATRIX.json) derives acceptance from exact current SVG hashes and placement dimensions, matching captured PNG hashes and passing primary plus required independent reviews. Historical capture context metadata remains historical when identical artwork is reused. Current scheme/context identities are separately recorded. New sessions retain `inspected:false`; preparation does not manufacture an actual inspection.

## Validation provenance

At artwork head `d700a7b600ad42c131103ce85d45198cc5b961e6`, guarded aggregate validation passed all 8 groups: 231 tests in 21 files, 47 HTML pages and 2066 local links. Separate source review found no remaining defects. [CI run 37705256552](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/37705256552) and [security run 37705256623](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/37705256623) passed. Those runs validate that artwork head; final evidence/status commit review and CI are separate merge gates.

Fresh offline installed archive checks passed 24 contexts, 98 local references, 72 descriptor reads and 48 repeated light/dark materializations. Archive SHA-256 values were engine `67edaad0a047c7a2fcb85768f3b6a5f00e13355779af0132448594307ae751ce` and initializer `21e8fd0389efbdf01e4903c24df516622ea9dc75e9f85e1f95a099f47ed2db6b`. These identify the locally packed artwork revision, not a publication or a later documentation archive.

Production captures used local Chromium 151.0.7922.173 and available Noto CJK primary families. Pinned CI Chromium 147.0.7727.15 separately passed actual HTTP project and detached combined/single export checks with source moved away and network blocked. No workflow changes or readiness-check bypass supported acceptance.

## Reproduction and limits

Run `node scripts/build-rollout-kits.mjs --check`, `pnpm check:examples` and `node scripts/build-p09-evidence.mjs /absolute/fresh/output`. The latter reproduces 192 self-contained sessions and recalculates hash-based matrix status against the committed evidence. [Authoring instructions](./P09-AUTHORING.md) describe registered placement, explicit fonts and production materialization; new artwork needs production capture and new evaluator records. Local PNGs remain outside the repository, referenced through normalized `local-evidence/` paths. Saved validation logs are identified as `p09-d700-b4push.log`, `p09-d700-offline-archive.log` and `p09-d700-ci.log` in the manager evidence archive.

Acceptance covers only the shown placements and palettes. Smaller slots need new readability review. Fine textures can become subdued at kit size; alternate light palettes weaken luminous/blackboard atmosphere while recognizable construction remains. This unblinded deterministic rollout is not a new paired experiment, efficiency claim, universal aesthetic guarantee or user approval. P10/P11 and root/main integration are not complete.
