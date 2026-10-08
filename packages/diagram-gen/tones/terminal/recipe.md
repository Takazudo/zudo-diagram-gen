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

The original reference remains unchanged. New pack canvas: {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Labels: {{scheme:typography.label.fontSize}} and detail {{scheme:typography.detail.fontSize}}, minimum {{scheme:typography.label.minCssPx}} CSS pixels. Actual readability requires inspection.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern identifies the repeated background; MAKE previews the Text input. MAKE SOMETHING is sample lettering in the composed result, and PNG marks its image export. Routes, cells, panels and layered shapes connect inputs to output; they are explanatory marks rather than controls, circuits or a claim about the product's internal implementation.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)

## Native rollout pack

Authored from this tone’s local original construction: corner-bracket frames; phosphor orthogonal marks on intrinsic dark canvas. `scheme.json` is numeric authority; edit `kit.template.svg`, then run `node scripts/build-rollout-kits.mjs --tone terminal`. Production candidates use `materializeKit` with explicit themes and repeated instances. `composition.template.svg` plus `composition.instances.json` provides public test preparation, never user approval or automatic aesthetic certification.

### Required

- **native-construction**: Construct related objects with corner-bracket frames; phosphor orthogonal marks on intrinsic dark canvas. Preserve this geometry when remapping palette.
- **facts-and-labels**: Keep exact brief facts, counts and directions; separate empty, pending and complete. Inspect upright Japanese labels at actual placement.
- **semantic-palette**: Declare palette roles on every color-bearing mark. Ink carries readable content; surface is backing; border construction; accent emphasis; deep subordinate planes; warning explicitly labeled risk.

### Preferred

- **reading-hierarchy**: Keep labels outside small marks; use sparse subordinate geometry and generous negative space.

### Flexible

- **layout**: Change panel count, spacing, connectors and line breaks for the actual brief; this evidence composition is not a mandatory page template.
- **native-variation**: Author new silhouettes using this construction; explain intentional preferred-rule departures.
