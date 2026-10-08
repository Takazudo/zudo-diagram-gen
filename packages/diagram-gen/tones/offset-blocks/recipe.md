# 04 Offset blocks

Hard square geometry, thick keylines, flat offset shadows.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Use square blocks, thick keylines, and a small consistent hard offset for any shadows.
- Keep shadows flat and geometrically related to the objects; avoid soft ambient blur.
- Reserve the strongest accent for the result or active teaching point.
- Use direct chunky connectors and keep them clear of the displaced shadow edges.
- Omit the shadow treatment when the project's design contract disallows it.

## Useful placements

Expressive utilities, creative tool onboarding.

## Size and theme notes

Avoid shadows in projects whose design rules disallow them.

The original reference remains unchanged. New pack canvas: {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Labels: {{scheme:typography.label.fontSize}} and detail {{scheme:typography.detail.fontSize}}, minimum {{scheme:typography.label.minCssPx}} CSS pixels. Actual readability requires inspection.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern and Text identify the two input layers. Aa is a lettering preview; MAKE SOMETHING is sample copy in their combined composition. PNG identifies the exported image. The connectors show that both inputs contribute to one result, not that text is transformed into a pattern.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — flat illustration principles](https://www.ibm.com/design/language/illustration/flat-style/design/)

## Native rollout pack

Authored from this tone’s local original construction: square keylines; flat displaced shadow blocks without blur. `scheme.json` is numeric authority; edit `kit.template.svg`, then run `node scripts/build-rollout-kits.mjs --tone offset-blocks`. Production candidates use `materializeKit` with explicit themes and repeated instances. `composition.template.svg` plus `composition.instances.json` provides public test preparation, never user approval or automatic aesthetic certification.

### Required

- **native-construction**: Construct related objects with square keylines; flat displaced shadow blocks without blur. Preserve this geometry when remapping palette.
- **facts-and-labels**: Keep exact brief facts, counts and directions; separate empty, pending and complete. Inspect upright Japanese labels at actual placement.
- **semantic-palette**: Declare palette roles on every color-bearing mark. Ink carries readable content; surface is backing; border construction; accent emphasis; deep subordinate planes; warning explicitly labeled risk.

### Preferred

- **reading-hierarchy**: Keep labels outside small marks; use sparse subordinate geometry and generous negative space.

### Flexible

- **layout**: Change panel count, spacing, connectors and line breaks for the actual brief; this evidence composition is not a mandatory page template.
- **native-variation**: Author new silhouettes using this construction; explain intentional preferred-rule departures.

## Contrast and label clearance — rollout-2

The completed check is a surface-role cutout with an ink keyline on its accent block, preserving square geometry and the hard offset while separating it from both native and remapped backdrops. Place frame and displaced shadow edges clear of warning labels and their marks. Actual palette contrast and label clearance remain visual review obligations.

Its under-keyline width is {{scheme:geometry.strokeWidths.check}} user units; the central surface stroke retains the outline role. The keyline protects the pale native surface against its mustard accent while the cutout separates the check in remapped dark and teal palettes. Both strokes follow the exact same path.
