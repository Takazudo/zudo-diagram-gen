# 08 Contour + wash

Precise contour lines with soft translucent color fields.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Keep the structural contour precise and consistent before adding color washes.
- Place a few broad translucent fields behind or within the important shapes.
- Use overlap to add personality without creating unintended data or process relationships.
- Keep labels and connectors opaque enough to remain readable on every wash.
- Inspect the flattened light and dark outputs because a wash's apparent contrast depends on its background.

## Useful placements

Friendly help art with more personality than pure wireframes.

## Size and theme notes

Keep washes subordinate to the relationship being explained.

The preserved original artwork has a 720 × 400 viewBox. Its original text sizes describe that example, not the new kit authority. Check the actual host slot, longer translations, and available fonts before integration.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern and Text identify the two input layers. Aa is a lettering preview; MAKE SOMETHING is sample copy in their combined composition. PNG identifies the exported image. The connectors show that both inputs contribute to one result, not that text is transformed into a pattern.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — line illustration principles](https://www.ibm.com/design/language/illustration/line-style/design/)
- [Atlassian Design — illustration purposes and formats](https://atlassian.design/foundations/illustrations)

## Authoritative native pack

Precise open contours over broad translucent washes. Wash overlap is decoration, never an additional relation.

- Outline stroke: {{scheme:geometry.strokeWidths.outline}}; connector stroke: {{scheme:geometry.strokeWidths.connector}}; detail stroke: {{scheme:geometry.strokeWidths.detail}}.
- Card radius: {{scheme:geometry.radii.card}}; head radius role: {{scheme:geometry.radii.head}}.
- Label font size: {{scheme:typography.label.fontSize}}; minimum CSS size: {{scheme:typography.label.minCssPx}}.
- Texture frequency: {{scheme:texture.frequency}}; amplitude: {{scheme:texture.amplitude}}; seed: {{scheme:texture.seed}}.
- Authored offset: {{scheme:geometry.layers.offset.dx}}, {{scheme:geometry.layers.offset.dy}}; secondary opacity: {{scheme:geometry.opacities.secondary}}.

All seven semantics are implemented: participant, location, card, unoccupied chair, directional connector, completion and pending clock. Decorative registration, facets, backing cuts or second chalk passes are parts of one logical object. Wash contrast varies with backdrop; inspect both themes after remapping.
