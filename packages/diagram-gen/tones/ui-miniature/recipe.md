# 07 UI miniature

Reduced application chrome, readable layer rows, one emphasized result.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Retain the application's recognizable panel structure while removing incidental controls.
- Represent controls and layers with a few legible rows or shapes; emphasize one meaningful state or action.
- Use project colors and corner rules for surfaces, dividers, and the active item.
- Keep labels outside tiny chrome where possible; use real product terminology.
- Describe the output as a conceptual miniature unless it is an exact screenshot or control map.

## Useful placements

In-app help closely tied to recognizable interface structure.

## Size and theme notes

A conceptual reconstruction; it is not a screenshot or exact control map.

The original reference remains unchanged. New pack canvas: {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Labels: {{scheme:typography.label.fontSize}} and detail {{scheme:typography.detail.fontSize}}, minimum {{scheme:typography.label.minCssPx}} CSS pixels. Actual readability requires inspection.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern and Text identify the two input layers. Aa is a lettering preview; MAKE SOMETHING is sample copy in their combined composition. PNG identifies the exported image. The connectors show that both inputs contribute to one result, not that text is transformed into a pattern.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — hybrid UI illustration](https://www.ibm.com/design/language/illustration/hybrid-ui-style/design/)
- [GitLab Pajamas — illustration construction and sizes](https://design.gitlab.com/product-foundations/illustration/)

## Native rollout pack

Authored from this tone’s local original construction: reduced chrome; layer rows, small dividers and one active state. `scheme.json` is numeric authority; edit `kit.template.svg`, then run `node scripts/build-rollout-kits.mjs --tone ui-miniature`. Production candidates use `materializeKit` with explicit themes and repeated instances. `composition.template.svg` plus `composition.instances.json` provides public test preparation, never user approval or automatic aesthetic certification.

### Required

- **native-construction**: Construct related objects with reduced chrome; layer rows, small dividers and one active state. Preserve this geometry when remapping palette.
- **facts-and-labels**: Keep exact brief facts, counts and directions; separate empty, pending and complete. Inspect upright Japanese labels at actual placement.
- **semantic-palette**: Declare palette roles on every color-bearing mark. Ink carries readable content; surface is backing; border construction; accent emphasis; deep subordinate planes; warning explicitly labeled risk.
- **conceptual-ui**: Do not present the invented chrome as an exact screenshot or an interactive control map.

### Preferred

- **reading-hierarchy**: Keep labels outside small marks; use sparse subordinate geometry and generous negative space.

### Flexible

- **layout**: Change panel count, spacing, connectors and line breaks for the actual brief; this evidence composition is not a mandatory page template.
- **native-variation**: Author new silhouettes using this construction; explain intentional preferred-rule departures.
