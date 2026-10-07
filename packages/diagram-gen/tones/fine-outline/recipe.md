# 01 Fine outline

Fine continuous outlines, open surfaces, a single filled teaching point.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Build open shapes with a consistent fine contour; use {{scheme:geometry.strokeWidths.outline}}-unit strokes on the {{scheme:coordinateSystem.viewBox.2}} by {{scheme:coordinateSystem.viewBox.3}} reference canvas.
- Use one restrained accent for the teaching point and keep the remaining surfaces quiet.
- Use generous negative space, short upright labels, and clearly joined input paths.
- Keep arrows and silhouettes readable at the target width; thicken essential connectors when reducing the drawing.
- Map ink, surface, border, and accent to the project's semantic palette before introducing a new color.

## Useful placements

Small help dialogs; quiet documentation.

## Size and theme notes

Thin strokes need checking at the final display size.

The original example is preserved. The pilot canvas uses {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Essential pilot labels use fontSize {{scheme:typography.label.fontSize}}, with minimum {{scheme:typography.label.minCssPx}}px after contain placement. Check actual line breaks, Japanese glyphs, transformations and overlap; nominal size is not readability evidence.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern and Text identify the two input layers. Aa is a lettering preview; MAKE SOMETHING is sample copy in their combined composition. PNG identifies the exported image. The connectors show that both inputs contribute to one result, not that text is transformed into a pattern.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — line illustration principles](https://www.ibm.com/design/language/illustration/line-style/design/)
- [IBM Design Language — technical diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/)

## Pilot scheme and kit — authored revision pilot-1

The scheme is the numeric authority for new pilot drawings; original example geometry stays unchanged. Read `scheme.json` and the seven symbols in `kit.svg` together. `kit.template.svg` is authoring source, checked in this repository by `node scripts/build-pilot-kits.mjs --check`; it is not a runtime materialization API. Palette-bearing marks carry semantic attributes and literal light defaults. Inline needed geometry for a self-contained candidate and use the common experiment palette; do not reference the kit as an external image.

Nominal label/detail sizes: {{scheme:typography.label.fontSize}} / {{scheme:typography.detail.fontSize}} user units. Connector stroke: {{scheme:geometry.strokeWidths.connector}} user units. Texture seed/amplitude/frequency: {{scheme:texture.seed}} / {{scheme:texture.amplitude}} / {{scheme:texture.frequency}}. These expressions resolve from the scheme; do not copy their values into an independent recipe.

### Required

- **native-construction**: Keep open contours and quiet unfilled interiors; accent only the teaching point.
- **facts-and-labels**: Preserve exact brief labels, locked relations and factual counts. Empty, pending and complete remain separate states. Inspect Japanese text at the actual placement.
- **palette-roles**: Use the six semantic palette roles; every kit color-bearing element declares its role. Palette changes do not change geometry.
- **texture-control**: Use the scheme texture and fixed seed. Do not add random noise or distort text; no texture means no procedural texture.

### Preferred

- **reading-hierarchy**: Use upright labels outside silhouettes and preserve generous negative space.
- **tone-emphasis**: Connector stroke may use the stronger connector role at narrow placement; inspect before reducing contours.

### Flexible

- **layout**: Panel count, object placement, arrow routing and line breaks follow the actual brief and aspect ratio; the reference is not a page template.
- **hand-geometry**: Hand-author tone-native variations or omit nonessential detail. Explain departures from preferred rules and retain required facts.
- **glyph-style**: Use the declared Japanese font for essential labels; decorative Latin lettering may reflect the original reference when it remains readable.

### Composition vocabulary

- **arrows**: An open routed contour with a distinct open arrowhead; join contributing inputs deliberately.
- **people**: An open head circle over an unfilled shoulder contour; omit face and gender cues.
- **empty**: An outlined chair with an unobstructed seat and an explicit empty label; no person silhouette.
- **pending**: A clock beside the pending object with an explicit pending label; never imply completion.
- **emphasis**: Use one small filled accent or junction rather than filling every object.
- **warning**: Combine a warning label and distinct accent mark; do not encode a fact only with color.

This pack is prepared for the frozen paired pilot, not accepted by a visual gate. Schemas, deterministic generation and nominal text size cannot establish tone character, factual accuracy or Japanese readability. No fixture is user approval.
