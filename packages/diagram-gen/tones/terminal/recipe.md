# 20 Terminal

Monospace lettering, corner-bracket frames, spare orthogonal geometry, and phosphor colors on an inherently dark canvas. This is a vector diagram with terminal character, not a block of ASCII art.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Use monospace labels, corner-bracket frames, and spare orthogonal geometry.
- Limit bright phosphor colors to important entities and paths.
- Use actual SVG shapes for the diagram while retaining terminal character in typography and framing.
- Keep the dark canvas open and avoid dense simulated terminal output around the explanation.
- Both supplied appearance variants retain the intrinsic dark terminal identity.

## Useful placements

Developer utilities, technical onboarding, command-line-adjacent products, optional expert help.

## Size and theme notes

The dark terminal identity is deliberately strong and should be selected by the project rather than used as a universal default. Both supplied appearance variants intentionally retain an intrinsic dark surface.

The supplied artwork has a 720 × 400 viewBox. Most essential labels are at least 26 units tall; at 360px display width that is approximately 13px. Check the actual host slot, longer translations, and available fonts before integration.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

## References

- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)
- [Example content — zudo-pattern-gen Composer manual](https://github.com/zudolab/zudo-pattern-gen/blob/develop/manual/src/content/docs/composer/index.mdx)
