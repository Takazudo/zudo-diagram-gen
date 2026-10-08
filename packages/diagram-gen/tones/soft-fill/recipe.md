# 02 Soft fill

Large gentle shapes, generous rounding, almost no perimeter strokes.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Use large soft surfaces with rounded corners and little or no perimeter stroke.
- Separate overlapping forms with tonal contrast and spacing rather than many internal outlines.
- Use rounded broad connectors that remain visibly subordinate to the main objects.
- Give the destination a single accent treatment; retain high-contrast upright labels.
- Adapt corner radii to the host project; choose another tone if a strict square interface would lose its identity.

## Useful placements

Approachable onboarding and consumer apps.

## Size and theme notes

Large soft forms can feel out of place in square technical UIs.

The original example is preserved. The pilot canvas uses {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Essential pilot labels use fontSize {{scheme:typography.label.fontSize}}, with minimum {{scheme:typography.label.minCssPx}}px after contain placement. Check actual line breaks, Japanese glyphs, transformations and overlap; nominal size is not readability evidence.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern and Text identify the two input layers. Aa is a lettering preview; MAKE SOMETHING is sample copy in their combined composition. PNG identifies the exported image. The connectors show that both inputs contribute to one result, not that text is transformed into a pattern.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — flat illustration principles](https://www.ibm.com/design/language/illustration/flat-style/design/)
- [Atlassian Design — illustration purposes and formats](https://atlassian.design/foundations/illustrations)

## Pilot scheme and kit — authored revision pilot-1

The scheme is the numeric authority for new pilot drawings; original example geometry stays unchanged. Read `scheme.json` and the seven symbols in `kit.svg` together. `kit.template.svg` is authoring source, checked in this repository by `node scripts/build-pilot-kits.mjs --check`; it is not a runtime materialization API. Palette-bearing marks carry semantic attributes and literal light defaults. Inline needed geometry for a self-contained candidate and use the common experiment palette; do not reference the kit as an external image.

Nominal label/detail sizes: {{scheme:typography.label.fontSize}} / {{scheme:typography.detail.fontSize}} user units. Connector stroke: {{scheme:geometry.strokeWidths.connector}} user units. Texture seed/amplitude/frequency: {{scheme:texture.seed}} / {{scheme:texture.amplitude}} / {{scheme:texture.frequency}}. These expressions resolve from the scheme; do not copy their values into an independent recipe.

### Required

- **native-construction**: Broad rounded filled silhouettes carry objects; do not add perimeter outlines to every form.
- **facts-and-labels**: Preserve exact brief labels, locked relations and factual counts. Empty, pending and complete remain separate states. Inspect Japanese text at the actual placement.
- **palette-roles**: Use the six semantic palette roles; every kit color-bearing element declares its role. Palette changes do not change geometry.
- **texture-control**: Use the scheme texture and fixed seed. Do not add random noise or distort text; no texture means no procedural texture.

### Preferred

- **reading-hierarchy**: Separate overlapping objects by spacing and semantic tonal contrast.
- **tone-emphasis**: Keep the broad rounded connector subordinate to the main surface; use ink for labels rather than muted shape colors.

### Flexible

- **layout**: Panel count, object placement, arrow routing and line breaks follow the actual brief and aspect ratio; the reference is not a page template.
- **hand-geometry**: Hand-author tone-native variations or omit nonessential detail. Explain departures from preferred rules and retain required facts.
- **glyph-style**: Use the declared Japanese font for essential labels; decorative Latin lettering may reflect the original reference when it remains readable.

### Composition vocabulary

- **arrows**: A broad rounded route terminating in a filled soft wedge; avoid fine wire connectors.
- **people**: A solid round head and broad shoulder/body silhouette separated by a clear gap.
- **empty**: A broad filled chair, vacant between back and seat, accompanied by an explicit empty label.
- **pending**: Use a filled clock badge adjacent to the waiting object, with a text label.
- **emphasis**: Use a single accent destination or badge and quiet deep-role subordinate forms.
- **warning**: Use a labeled warning badge whose shape remains distinct under palette remapping.

This pack is prepared for the frozen paired pilot, not accepted by a visual gate. Schemas, deterministic generation and nominal text size cannot establish tone character, factual accuracy or Japanese readability. No fixture is user approval.
