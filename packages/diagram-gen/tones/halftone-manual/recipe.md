# 18 Halftone manual

Monochrome technical-print language: firm dark keylines, visible dot screens, diagonal hatching, and knockout lettering. Texture is confined to meaningful picture areas.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Use firm keylines, a restricted monochrome palette, and clear knockout lettering.
- Confine dots and diagonal hatching to meaningful picture areas.
- Keep labels and thin connectors clear of texture.
- Choose one consistent screen size and test it at the intended rendering scale.
- Remove or enlarge the halftone texture when downscaling produces interference or visual noise.

## Useful placements

Manuals, compact how-to illustrations, black-and-white export, print-oriented projects.

## Size and theme notes

Dot screens can produce moire when rasterized very small; keep the vector or export at the intended display size.

The preserved original artwork has a 720 × 400 viewBox. Its original text sizes describe that example, not the new kit authority. Check the actual host slot, longer translations, and available fonts before integration.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern identifies the repeated background; MAKE previews the Text input. MAKE SOMETHING is sample lettering in the composed result, and PNG marks its image export. Routes, cells, panels and layered shapes connect inputs to output; they are explanatory marks rather than controls, circuits or a claim about the product's internal implementation.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)
- [Rough.js — sketch contours and vector hatching](https://roughjs.com/)

## Authoritative native pack

Firm monochrome keylines, picture-area dot screens and diagonal hatching; essential labels occupy clean knockout ground.

- Outline stroke: {{scheme:geometry.strokeWidths.outline}}; connector stroke: {{scheme:geometry.strokeWidths.connector}}; detail stroke: {{scheme:geometry.strokeWidths.detail}}.
- Card radius: {{scheme:geometry.radii.card}}; head radius role: {{scheme:geometry.radii.head}}.
- Label font size: {{scheme:typography.label.fontSize}}; minimum CSS size: {{scheme:typography.label.minCssPx}}.
- Texture frequency: {{scheme:texture.frequency}}; amplitude: {{scheme:texture.amplitude}}; seed: {{scheme:texture.seed}}.
- Authored offset: {{scheme:geometry.layers.offset.dx}}, {{scheme:geometry.layers.offset.dy}}; secondary opacity: {{scheme:geometry.opacities.secondary}}.

All seven semantics are implemented: participant, location, card, unoccupied chair, directional connector, completion and pending clock. Decorative registration, facets, backing cuts or second chalk passes are parts of one logical object. Dot screens may alias at reduced size; screen spacing must be judged in the actual raster capture.
