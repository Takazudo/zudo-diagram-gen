# Native rollout authoring and evidence preparation

P09 extends authored schemes and native kits to the existing catalog. Original source/light/dark artwork and the four accepted pilot packs remain byte protected. Tone IDs and ordering remain stable. A complete structural pack does not establish visual acceptance, facts, glyph coverage, contrast or readability.

Each new tone owns `scheme.json`, `kit.template.svg`, generated `kit.svg`, its authored recipe, `composition.template.svg` and `composition.instances.json`. Derive the construction from its own local original reference and recipe. Schemes distinguish required obligations, preferred choices and flexible author decisions. The six semantic roles explicitly map light and dark values; remapping roles preserves geometry. No new system spacing or common icon shape replaces the tone’s construction.

`node scripts/build-rollout-kits.mjs` generates the twenty new kits; `--check` rejects stale artifacts. Accepted pilot resources are deliberately excluded. Templates use `{{palette:role}}`, `{{font:role}}` and `{{scheme:numeric.path}}`; numeric summaries in recipes use the same scheme references. The production materializer remains the API for finished self-contained artwork.

Composition templates contain only self-contained custom geometry, labels and local definitions. They cannot reference primitives before materialization. The companion manifest is:

```json
{
  "schemaVersion": 1,
  "width": 720,
  "height": 400,
  "title": "Public invented example",
  "description": "Exact facts and intentional construction represented by this composition.",
  "instances": [
    { "id": "person-a", "primitive": "person", "x": 40, "y": 80, "width": 80, "height": 100 },
    { "id": "person-b", "primitive": "person", "x": 140, "y": 80, "width": 80, "height": 100 }
  ]
}
```

Manifest dimensions match the template viewBox extents. Labels stay outside instance boxes because production instances append after custom geometry. Different tone layouts and meaningful custom geometry are encouraged; the manifest is a transport format rather than a common visual template. Required primitives have native symbols or deliberate documented alternatives.

Run `node scripts/build-p09-evidence.mjs /absolute/local/output [tone-id ...]`. The generator uses production `resolvePalette` and `materializeKit`, preparing eight records per tone: native/alternate palettes, light/dark themes, composition/kit. Every session stores separately materialized literal light and dark SVGs; a record identifies the theme actually being reviewed. The kit repeats every available semantic primitive twice to exercise independent local reference rewriting. Short Japanese inventory labels use a readable declared placement. Composition placement uses its manifest dimensions; kit placement uses its native canvas. These are declared native evidence slots, not a claim of readability in every smaller application slot.

Records include revision, collection identity, scheme/kit/context/source hashes, composition input hashes, actual SVG hash, instance dimensions, primitive alternatives, fonts and target. P05 capture must use the registered placement and actual record theme. Capture sidecars and separate evaluator records supply browser/font/image/placement hashes and actual inspection. `inspected:false` remains until an evaluator really opens the image. Evaluate exact factual labels, long Japanese lines, warning/emphasis, empty/pending/complete distinctions, clipping and native character with P03’s rubric. Textured/layered packs require an independent second actual visual pass. Evidence preparation is not user approval or an automatic style certification.

Fresh installed archive verification reads all packs offline and exercises repeated materialization in both themes. Legacy user sessions and custom catalog transition behavior remain valid; the bundled catalog’s completeness gate does not regenerate reviewed artwork or alter existing review fingerprints. Export still copies saved bytes.

## Explicit font readiness

SVG roles retain their authored font stacks, while placement descriptors name every explicit primary family without quotes or generic fallbacks. Capture must check those families and fail when unavailable. Current packs use Noto Sans CJK JP, Noto Sans Mono CJK JP and Noto Serif CJK JP. Editorial rollout-2 uses Noto Serif CJK JP for both labels and the serif specimen, avoiding an unavailable Georgia primary while preserving native serif construction. Fonts are environment dependencies; no proprietary font installation or silent readiness suppression is implied. Font readiness remains separate from actual glyph/readability inspection.

## Reviewed rollout evidence

[P09 acceptance](./P09-ACCEPTANCE.md) and [portable per-image evidence](./P09-VISUAL-EVIDENCE.json) record the final declared-placement review. The generator computes matrix acceptance by joining current SVG hashes and targets to captures, then matching captured PNG hashes to passing primary and required independent reviews. It rejects stale artwork, altered placements, missing reviews and failed factual/readability/character scores. Capture inputs can retain their historical context metadata when the exact SVG and PNG are unchanged; current resource identities remain in the matrix. New preparation sessions still have `inspected:false`: linked evaluator evidence supplies the acceptance, and the generator never claims to have opened a new image.
