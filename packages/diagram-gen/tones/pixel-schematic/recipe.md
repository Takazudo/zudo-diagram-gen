# 19 Pixel schematic

Stepped silhouettes, discrete grid blocks, hard raster-like edges, and chunky directional glyphs. Large real text remains readable instead of imitating microscopic pixels.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Construct silhouettes and connectors on a discrete shared grid.
- Use stepped corners, hard edges, and chunky directional glyphs.
- Keep instructional text large and real rather than simulating unreadably tiny pixel lettering.
- Use a few strongly separated colors and preserve gaps between adjacent forms.
- Prefer integer scaling when possible, and inspect browser interpolation at the target width.

## Useful placements

Playful utilities, game-adjacent tools, pixel-art editors, illustrated empty states.

## Size and theme notes

Use integer scaling when possible; the rigid grid intentionally sacrifices curved or delicate shapes.

The supplied artwork has a 720 × 400 viewBox. Most essential labels are at least 26 units tall; at 360px display width that is approximately 13px. Check the actual host slot, longer translations, and available fonts before integration.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern identifies the repeated background; MAKE previews the Text input. MAKE SOMETHING is sample lettering in the composed result, and PNG marks its image export. Routes, cells, panels and layered shapes connect inputs to output; they are explanatory marks rather than controls, circuits or a claim about the product's internal implementation.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — flat illustration principles](https://www.ibm.com/design/language/illustration/flat-style/design/)
