# P03 phase 1 — four prepared tone packs

Status: pack preparation complete; repeated visual gate **open**. This report covers deterministic pack authoring and validation only. The coordinator owns independent A/B/C authoring, placement capture, actual inspection, scoring and the rollout decision under [PROTOCOL.md](./PROTOCOL.md). No initial pilot candidate, correction, score or user approval is supplied by this phase.

## Inputs and preservation

Pack work starts from integration commit `647fb95f965caed7f72bbbc83ce6cb408672d784`, after P01, P02 and P05. The original four recipes, source SVG construction and rendered original light examples were read. The coordinator supplied the original-example and kit contact-sheet images, which were actually opened during this pass; no browser was launched by this worker. Source/light/dark bytes for all 24 tones are checked against that baseline in `packages/diagram-gen/test/fixtures/pilot-original-reference-hashes.json`. All 72 hashes and ordered stable tone IDs remain unchanged.

The experiment's A condition must use original baseline recipes/examples/local meaning at the baseline commit above. B and C add frozen scheme/kit resources to those identical A inputs. Reading today's enriched recipe for A would leak scheme guidance and invalidate the control. The coordinator retains original resources independently before authoring. Pack preparation does not freeze the experiment: the coordinator freezes exact committed input hashes after review and before independent runs.

The five public briefs, shared palette, declared fonts and placements were read. Essential label roles use `'Noto Sans CJK JP', sans-serif`; paper's original Latin serif lettering and pencil's Latin working-sketch character do not override the Japanese brief font. Their geometry must compensate while preserving readable exact labels. Font readiness and nominal size remain separate from glyph coverage and actual readability.

## Authored resources

Each of `fine-outline`, `soft-fill`, `paper-layers` and `pencil-notebook` has `scheme.json`, `kit.svg`, `kit.template.svg` and an updated local recipe. Catalog declarations add `toneRevision: pilot-1`, package-relative scheme and kit paths. Schema format and collection remain version one and `0.1.0` respectively; revision is authored identity, not a content hash.

| Tone | Native construction retained | Open visual question |
| --- | --- | --- |
| Fine outline | Thin open object contours, restrained junction/emphasis, open routed arrowhead, quiet surfaces | Essential connectors may use the stronger connector role under the existing recipe's thickening allowance; verify narrow placements. |
| Soft fill | Solid rounded head/body, broad tonal chair, rounded slot card, broad curved connector and filled wedge, soft clock/check badges | Strong silhouettes must stay subordinate to facts and Japanese labels under the common palette. |
| Paper layers | Separate head/shoulder/torso cutouts, tilted quadrilateral sheets, consistent offset depth, cut pin/check and planar clock pointers | Explicit pieces and shadows must read as style rather than extra factual people, seats or stages. |
| Pencil notebook | Imperfect retraced contours, asymmetrical open arrows, sparse seed-controlled hatching on the vacant chair, quiet teaching underline | Hatching is subtle and concentrated on the chair; small-scale recognizability and ruled-ground treatment remain pilot questions. |

All seven required symbol IDs are present in each kit. The pencil hatch support symbol is an additional local definition. Kit contact sheets are inventory previews, not a shared composition template for the five briefs. Each tone has separately authored geometry. Palette-bearing SVG attributes have explicit semantic markers and inspectable literal light defaults; no color remapping is inferred from coincident colors.

Schemes cover geometry, type, texture, palette and composition with required, preferred and flexible rules. There are no tone-specific primitive omissions requiring an alternative. Empty, pending and complete are explicitly distinct in the descriptive rules; a primitive alone does not certify those semantics in a drawing.

## Deterministic authoring and authority

`node scripts/build-pilot-kits.mjs` generates the four kit files from separate templates; `--check` refuses stale committed bytes. Numeric role placeholders use P02's scheme resolver, font placeholders use declared typography, and palette placeholders resolve semantic light defaults. Seeded pencil hatching uses a fixed unsigned 32-bit LCG and three-decimal coordinate serialization. Its texture seed is not a model-generation seed. No random process or model service runs in CI.

Scheme values are the numeric authority for role widths, radii, opacity, offsets, typography and texture. Authored path coordinates remain the primitive's original geometry. Template references avoid duplicate numeric role literals. Fine outline retains the original contour width, while the stronger connector role is an explicit preferred adaptation already allowed by the original recipe; source geometry is untouched.

`import-tones.py --tones-only` preserves scheme/kit/revision, recipe templates, `recipeNumericReferences` and optional kit authoring templates. Catalog numeric bindings become checked comments in the generated Markdown recipe, preventing a bound catalog number from becoming unbound prose. Unknown future scheme formats retain opaque resources; runtime validation owns their acceptance. Pilot guide sections derive required/preferred/flexible and composition descriptions from the authored scheme. Other tone recipes are unchanged.

This is a repository authoring tool, not P04's production materializer: it does not namespace instances, resolve arbitrary kit graphs, inline candidates or expose a runtime service. No viewer, project style lock, API generation service or candidate-rendering helper is introduced.

## Checks and preliminary review

- Focused pilot and P02 suites: 20 tests passed. They verify resource completeness per pilot tone, all primitive inventories, nominal text minima for five placements, original bytes/IDs, deterministic kit drift detection, semantic palette defaults, local references, seed response and importer binding/template preservation.
- Engine package suites: 87 tests passed, including reference auditing and package behavior. The existing opaque-future-resource importer fixture exposed an integration defect; preserving its opaque format while deriving guide sections only for known schema format fixed it.
- Targeted ESLint and Prettier passed for new JavaScript/tests and authored JSON. Documentation formatting passed for this report, changelog and updated recipes.
- `node scripts/check-examples.mjs`: all six example sessions, the 24-tone catalog and 98 required offline resources passed.
- `node scripts/build-pilot-kits.mjs --check`: committed kit bytes reproduced exactly.
- Local engine archive prepack passed. The archive included all four schemes, kits and authoring templates. Extracted archive context/resource APIs loaded and validated all four complete packs from a temporary directory outside the checkout using the already installed declared parser dependency. This is a resource/package boundary check, not a fresh dependency installation or initializer/UI workflow claim.

The coordinator rendered and actually inspected each kit inventory at the original reference canvas size. Fine outline, soft fill and paper layers were visibly distinct; paper showed genuinely separate overlapping pieces and offset depth. Pencil retained doubled imperfect contours, with subtle hatching. No preparation blocker was reported. This review is **not** Japanese target-size pilot inspection, a character score, an independent second experimental visual pass or the repeated gate.

## Remaining evidence and decision

No rollout recommendation is supported yet. The frozen protocol still requires 24 independent tone-batch runs and 120 initial light SVG outputs, retained failures/corrections, actual placement captures and provenance, exact factual checklist/label review, paired B−A/C−B comparisons, correction/context-cost measurements and independent paper/pencil visual passes. The coordinator records unknown model controls as unknown, measures byte/time proxies where token controls are unavailable, and preserves all failed attempts.

No all-24 authoring is unlocked. P03 and its issue remain open until the manager's repeated pilot passes and the accepted evidence is merged. If the schemes flatten a tone or captions fail, retain results, version any amendment and rerun affected pairs before a supported decision. Current pack geometry is a reviewed freeze candidate; do not tune it from future scores during a paired run.
