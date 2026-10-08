# 06 Swiss grid

Strict alignment, numerical rhythm, strong accent fields and plain type.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Align labels, shapes, and connectors to a strict shared grid.
- Use plain typography, a clear hierarchy, and a small number of bold accent fields.
- Use numerical labels only when the content actually has an order.
- Keep whitespace deliberate and repeat spacing rules across every panel.
- Reduce the size or intensity of accent areas when the drawing competes with surrounding controls.

## Useful placements

Instruction sequences and structured manuals.

## Size and theme notes

Expressive accent fields need discipline beside neutral UI.

The original reference remains unchanged. New pack canvas: {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Labels: {{scheme:typography.label.fontSize}} and detail {{scheme:typography.detail.fontSize}}, minimum {{scheme:typography.label.minCssPx}} CSS pixels. Actual readability requires inspection.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Read 01 / Pattern and 02 / Text as the two inputs. Aa previews editable lettering. The combined destination is numbered 03 / PNG: the numbers order this explanation, not application commands. MAKE SOMETHING is sample lettering, not an operation label. The aligned grid organizes the same merge/export story.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)
- [GitLab Pajamas — illustration construction and sizes](https://design.gitlab.com/product-foundations/illustration/)

## Native rollout pack

Authored from this tone’s local original construction: strict shared columns; square fields and aligned baseline rules. `scheme.json` is numeric authority; edit `kit.template.svg`, then run `node scripts/build-rollout-kits.mjs --tone swiss-grid`. Production candidates use `materializeKit` with explicit themes and repeated instances. `composition.template.svg` plus `composition.instances.json` provides public test preparation, never user approval or automatic aesthetic certification.

### Required

- **native-construction**: Construct related objects with strict shared columns; square fields and aligned baseline rules. Preserve this geometry when remapping palette.
- **facts-and-labels**: Keep exact brief facts, counts and directions; separate empty, pending and complete. Inspect upright Japanese labels at actual placement.
- **semantic-palette**: Declare palette roles on every color-bearing mark. Ink carries readable content; surface is backing; border construction; accent emphasis; deep subordinate planes; warning explicitly labeled risk.

### Preferred

- **reading-hierarchy**: Keep labels outside small marks; use sparse subordinate geometry and generous negative space.

### Flexible

- **layout**: Change panel count, spacing, connectors and line breaks for the actual brief; this evidence composition is not a mandatory page template.
- **native-variation**: Author new silhouettes using this construction; explain intentional preferred-rule departures.
