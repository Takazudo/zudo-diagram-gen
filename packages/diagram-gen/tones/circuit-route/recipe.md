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

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern identifies the repeated background; MAKE previews the Text input. MAKE SOMETHING is sample lettering in the composed result, and PNG marks its image export. Routes, cells, panels and layered shapes connect inputs to output; they are explanatory marks rather than controls, circuits or a claim about the product's internal implementation.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)
