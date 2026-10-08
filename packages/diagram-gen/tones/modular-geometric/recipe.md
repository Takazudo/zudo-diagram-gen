# 23 Modular geometric

A studio-style tile vocabulary of circles, quarter circles, blocks, and deliberately open space. Simple convergence paths preserve the explanation while the artwork carries the expressive geometry.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Build motifs from circles, quarter circles, rectangles, and a small repeated tile vocabulary.
- Use deliberate open space and a limited balanced palette.
- Keep explanatory connectors simple enough to read separately from decorative geometry.
- Repeat motifs only when their relationship to the source and assembled result stays understandable.
- Use a separate control reference when the reader needs to locate an exact interface element.

## Useful placements

Creative tools, design systems, visual editors, minimal brand-led help centers.

## Size and theme notes

Abstract modules communicate concepts better than exact interface locations; pair with a screenshot when users must find a control.

The original reference remains unchanged. New pack canvas: {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Labels: {{scheme:typography.label.fontSize}} and detail {{scheme:typography.detail.fontSize}}, minimum {{scheme:typography.label.minCssPx}} CSS pixels. Actual readability requires inspection.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern identifies the repeated background; MAKE previews the Text input. MAKE SOMETHING is sample lettering in the composed result, and PNG marks its image export. Routes, cells, panels and layered shapes connect inputs to output; they are explanatory marks rather than controls, circuits or a claim about the product's internal implementation.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — flat illustration principles](https://www.ibm.com/design/language/illustration/flat-style/design/)

## Native rollout pack

Authored from this tone’s local original construction: circle, quarter-circle and square tile vocabulary with open gaps. `scheme.json` is numeric authority; edit `kit.template.svg`, then run `node scripts/build-rollout-kits.mjs --tone modular-geometric`. Production candidates use `materializeKit` with explicit themes and repeated instances. `composition.template.svg` plus `composition.instances.json` provides public test preparation, never user approval or automatic aesthetic certification.

### Required

- **native-construction**: Construct related objects with circle, quarter-circle and square tile vocabulary with open gaps. Preserve this geometry when remapping palette.
- **facts-and-labels**: Keep exact brief facts, counts and directions; separate empty, pending and complete. Inspect upright Japanese labels at actual placement.
- **semantic-palette**: Declare palette roles on every color-bearing mark. Ink carries readable content; surface is backing; border construction; accent emphasis; deep subordinate planes; warning explicitly labeled risk.

### Preferred

- **reading-hierarchy**: Keep labels outside small marks; use sparse subordinate geometry and generous negative space.

### Flexible

- **layout**: Change panel count, spacing, connectors and line breaks for the actual brief; this evidence composition is not a mandatory page template.
- **native-variation**: Author new silhouettes using this construction; explain intentional preferred-rule departures.
