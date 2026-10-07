# 13 Pencil notebook

A ruled notebook ground, light doubled contours, imperfect hatch strokes, and quiet pencil arrows make a process feel like a clearly explained working sketch.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Use lightly doubled contours and sparse imperfect hatching to suggest a working sketch.
- Keep the ruled notebook background lighter than every essential connector and label.
- Use quiet hand-drawn arrows whose direction remains unambiguous.
- Reserve a small muted accent for the point being taught.
- Increase contrast or remove pencil texture at small sizes rather than accepting indistinct paths.

## Useful placements

Friendly how-to notes, early concepts, tutorials, and informal explanations that benefit from a human hand.

## Size and theme notes

The low-contrast pencil character loses definition at small sizes and is unsuitable for dense technical diagrams.

The original example is preserved. The pilot canvas uses {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Essential pilot labels use fontSize {{scheme:typography.label.fontSize}}, with minimum {{scheme:typography.label.minCssPx}}px after contain placement. Check actual line breaks, Japanese glyphs, transformations and overlap; nominal size is not readability evidence.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern and Text identify the two contributing layers. MAKE is sample text shown in the text input and the composed result, not a second action or duplicate output. PNG identifies the exported image. Perspective, stacked edges, sketch marks or print offsets describe this tone's visual construction; they do not introduce extra data stages.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [Rough.js — sketch contours and vector hatching](https://roughjs.com/)

## Pilot scheme and kit — authored revision pilot-2

The scheme is the numeric authority for new pilot drawings; original example geometry stays unchanged. Read `scheme.json` and the seven symbols in `kit.svg` together. `kit.template.svg` is authoring source, checked in this repository by `node scripts/build-pilot-kits.mjs --check`; it is not a runtime materialization API. Palette-bearing marks carry semantic attributes and literal light defaults. Inline needed geometry for a self-contained candidate and use the common experiment palette; do not reference the kit as an external image.

Nominal label/detail sizes: {{scheme:typography.label.fontSize}} / {{scheme:typography.detail.fontSize}} user units. Connector stroke: {{scheme:geometry.strokeWidths.connector}} user units. Texture seed/amplitude/frequency: {{scheme:texture.seed}} / {{scheme:texture.amplitude}} / {{scheme:texture.frequency}}. These expressions resolve from the scheme; do not copy their values into an independent recipe.

### Required

- **native-construction**: Use imperfect major object contours with a visibly lighter displaced retrace, plus a crossed hatch field recognizable at actual placement. Sparse means airy individual strokes across a visible field; tiny parallel corner ticks alone do not carry the texture. Hatching never covers Japanese labels or implies extra factual objects.
- **facts-and-labels**: Preserve exact brief labels, locked relations and factual counts. Empty, pending and complete remain separate states. Inspect Japanese text at the actual placement.
- **palette-roles**: Use the six semantic palette roles; every kit color-bearing element declares its role. Palette changes do not change geometry.
- **texture-control**: Use seeded-pencil-crosshatch with the fixed texture seed. Frequency is strokes per direction in the canonical patch, with two opposing directions. The seed controls stroke jitter only, never model generation. Keep a clear label plane; no random noise or distorted text.

### Preferred

- **reading-hierarchy**: Notebook ruling stays subordinate to every label and essential route; remove ruling locally behind text.
- **tone-emphasis**: Keep arrowheads unambiguous and text upright; express the hand through geometry rather than distorted Japanese glyphs.
- **field-transfer**: Use crossed hatching on a meaningful object backing or edge region large enough to read as construction, with a clear foreground label plane. Do not confine all texture to miniature chair inserts. On empty objects, decorate the surrounding label/backing rather than the vacant interior.

### Flexible

- **layout**: Panel count, object placement, arrow routing and line breaks follow the actual brief and aspect ratio; the reference is not a page template.
- **hand-geometry**: Hand-author tone-native variations or omit nonessential detail. Explain departures from preferred rules and retain required facts.
- **glyph-style**: Use the declared Japanese font for essential labels; decorative Latin lettering may reflect the original reference when it remains readable.
- **texture-placement**: Choose field placement, extent and line breaks for the brief and aspect ratio. Fine individual strokes may be simplified for readability, but preserve the crossed construction rather than substituting only clean cards. Original Pattern/Text and PNG content is not required for other topics.

### Composition vocabulary

- **arrows**: A gently imperfect ink path plus lighter retrace, ending in an open asymmetrical arrowhead.
- **people**: An imperfect head loop and hand-drawn shoulders; the displaced lighter trace is a sketch mark, never a second person.
- **empty**: An irregular retraced open chair with a visible vacant seat and explicit empty label. A chair-back hatch is optional detail; broader crossed texture belongs on the enclosing label/backing plane, never in the vacant seat.
- **pending**: Use a retraced clock next to the waiting object and retain its pending label.
- **emphasis**: Use a meaningful crossed-hatch backing or edge field behind a clear surface-role label plane, with a muted underline where useful. Texture and connectors never cover the exact Japanese text.
- **warning**: Use a handwritten-looking contour around an upright warning label; preserve the exact text.

This pack is prepared for the frozen paired pilot, not accepted by a visual gate. Schemas, deterministic generation and nominal text size cannot establish tone character, factual accuracy or Japanese readability. No fixture is user approval.
