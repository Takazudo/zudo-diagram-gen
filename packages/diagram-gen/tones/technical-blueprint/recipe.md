# 09 Technical blueprint

A precise drafting grid, fine orthogonal connectors, registration crosses, and measurement leaders make the composition read as an engineered construction.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Use a consistent drafting grid, fine orthogonal paths, and a restrained registration vocabulary.
- Use measurement leaders only for real dimensions; decorative drafting marks must not invent product specifications.
- Separate strong explanatory lines from low-contrast construction lines.
- Keep labels upright and sparse, reserving the bright accent for the main connection or result.
- Retain the intentionally dark blueprint surface when using this reference; both appearance variants are dark.

## Useful placements

Layer relationships, export settings, technical workflows, and documentation with an engineering character.

## Size and theme notes

Fine lines and grid detail need generous display size; the intrinsic dark surface is a strong visual commitment. Both supplied appearance variants intentionally retain an intrinsic dark surface.

The original reference remains unchanged. New pack canvas: {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Labels: {{scheme:typography.label.fontSize}} and detail {{scheme:typography.detail.fontSize}}, minimum {{scheme:typography.label.minCssPx}} CSS pixels. Actual readability requires inspection.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern and Text identify the two contributing layers. MAKE is sample text shown in the text input and the composed result, not a second action or duplicate output. PNG identifies the exported image. Perspective, stacked edges, sketch marks or print offsets describe this tone's visual construction; they do not introduce extra data stages.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)

## Native rollout pack

Authored from this tone’s local original construction: registration grid; fine orthogonal outlines and construction crosses. `scheme.json` is numeric authority; edit `kit.template.svg`, then run `node scripts/build-rollout-kits.mjs --tone technical-blueprint`. Production candidates use `materializeKit` with explicit themes and repeated instances. `composition.template.svg` plus `composition.instances.json` provides public test preparation, never user approval or automatic aesthetic certification.

### Required

- **native-construction**: Construct related objects with registration grid; fine orthogonal outlines and construction crosses. Preserve this geometry when remapping palette.
- **facts-and-labels**: Keep exact brief facts, counts and directions; separate empty, pending and complete. Inspect upright Japanese labels at actual placement.
- **semantic-palette**: Declare palette roles on every color-bearing mark. Ink carries readable content; surface is backing; border construction; accent emphasis; deep subordinate planes; warning explicitly labeled risk.
- **real-dimensions**: Measurement leaders only describe actual supplied dimensions; registration crosses and grid are construction aids, never invented specifications.

### Preferred

- **reading-hierarchy**: Keep labels outside small marks; use sparse subordinate geometry and generous negative space.

### Flexible

- **layout**: Change panel count, spacing, connectors and line breaks for the actual brief; this evidence composition is not a mandatory page template.
- **native-variation**: Author new silhouettes using this construction; explain intentional preferred-rule departures.
