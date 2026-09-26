# 21 Circuit route

Consistent right-angle paths, circular ports, solder-pad-like junctions, and a restrained substrate palette. The routed paths describe the two input layers and the single exported result.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Route paths with consistent right-angle bends and repeat a small port and junction vocabulary.
- Distinguish actual explanatory connections from decorative substrate details.
- Keep route colors meaningful and stable across the documentation set.
- Use a restrained substrate palette and high-contrast short labels.
- For real signal diagrams preserve the application's audio, CV, gate, or other semantic color assignments.

## Useful placements

Hardware-related tools, modular-system documentation, engineering-oriented software help.

## Size and theme notes

Decorative traces must remain visibly inside the artwork so they cannot be confused with the actual explanation paths.

The supplied artwork has a 720 × 400 viewBox. Most essential labels are at least 26 units tall; at 360px display width that is approximately 13px. Check the actual host slot, longer translations, and available fonts before integration.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

## References

- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)
- [Example content — zudo-pattern-gen Composer manual](https://github.com/zudolab/zudo-pattern-gen/blob/develop/manual/src/content/docs/composer/index.mdx)
