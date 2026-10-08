# 16 Risograph duo

Two offset spot colors, visible overprint, broad circular motifs, and sparse print grain give the diagram a small-edition risograph character.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Restrict the drawing to two spot-color roles plus the paper background.
- Use a small consistent registration offset and visible overprint where shapes overlap.
- Apply sparse print grain to large image areas rather than instructional labels.
- Keep broad silhouettes and short text so the intentional imprecision remains readable.
- Do not use registration error or blended color where the diagram depends on exact color discrimination.

## Useful placements

Creative applications, brand-rich guides, editorial help pages, and memorable explanatory spot illustrations.

## Size and theme notes

Registration offsets and print grain reduce precision; avoid fine UI reproduction or charts requiring exact color discrimination.

The preserved original artwork has a 720 × 400 viewBox. Its original text sizes describe that example, not the new kit authority. Check the actual host slot, longer translations, and available fonts before integration.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern and Text identify the two contributing layers. MAKE is sample text shown in the text input and the composed result, not a second action or duplicate output. PNG identifies the exported image. Perspective, stacked edges, sketch marks or print offsets describe this tone's visual construction; they do not introduce extra data stages.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — flat illustration principles](https://www.ibm.com/design/language/illustration/flat-style/design/)
- [Indeed Design — a scalable illustration system](https://indeed.design/article/building-a-scalable-illustration-system/)

## Authoritative native pack

Two offset spot passes with broad overlapping circles and sparse print grain. Labels are single-pass to preserve Japanese legibility.

- Outline stroke: {{scheme:geometry.strokeWidths.outline}}; connector stroke: {{scheme:geometry.strokeWidths.connector}}; detail stroke: {{scheme:geometry.strokeWidths.detail}}.
- Card radius: {{scheme:geometry.radii.card}}; head radius role: {{scheme:geometry.radii.head}}.
- Label font size: {{scheme:typography.label.fontSize}}; minimum CSS size: {{scheme:typography.label.minCssPx}}.
- Texture frequency: {{scheme:texture.frequency}}; amplitude: {{scheme:texture.amplitude}}; seed: {{scheme:texture.seed}}.
- Authored offset: {{scheme:geometry.layers.offset.dx}}, {{scheme:geometry.layers.offset.dy}}; secondary opacity: {{scheme:geometry.opacities.secondary}}.

All seven semantics are implemented: participant, location, card, unoccupied chair, directional connector, completion and pending clock. Decorative registration, facets, backing cuts or second chalk passes are parts of one logical object. Overprint is approximated by layered opacity, not a calibrated print blend. Warning uses the second spot plus explicit wording.
