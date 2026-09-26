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

The supplied artwork has a 720 × 400 viewBox. Most essential labels are at least 26 units tall; at 360px display width that is approximately 13px. Check the actual host slot, longer translations, and available fonts before integration.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

## References

- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)
- [Rough.js — sketch contours and vector hatching](https://roughjs.com/)
- [Example content — zudo-pattern-gen Composer manual](https://github.com/zudolab/zudo-pattern-gen/blob/develop/manual/src/content/docs/composer/index.mdx)
