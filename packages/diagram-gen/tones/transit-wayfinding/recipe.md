# 22 Transit wayfinding

Thick routed lines, round station rings, clean transfer geometry, and bold wayfinding labels. Two named source branches join before the combined poster and one PNG destination.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Use thick routed lines, round station rings, and clear transfer geometry.
- Assign route colors to meaningful input or process categories and retain those meanings.
- Place bold labels beside stations and keep them clear of branches.
- Show only the branches and destinations that the product actually supports.
- Reduce station detail and route complexity for small diagrams without changing the explanation.

## Useful placements

Multi-step product help, navigation explanations, connected tools, process diagrams.

## Size and theme notes

Route colors need consistent meaning across a documentation set; do not add decorative branches that imply extra actions.

The supplied artwork has a 720 × 400 viewBox. Most essential labels are at least 26 units tall; at 360px display width that is approximately 13px. Check the actual host slot, longer translations, and available fonts before integration.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

## References

- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)
- [Example content — zudo-pattern-gen Composer manual](https://github.com/zudolab/zudo-pattern-gen/blob/develop/manual/src/content/docs/composer/index.mdx)
