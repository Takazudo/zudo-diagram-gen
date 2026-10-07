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

## Pilot scheme and kit — authored revision pilot-3

The scheme is the numeric authority for new drawings. Required scheme guidance takes precedence over conflicting sparse/removable-texture advice in legacy recipe guidance: retain a visible construction region while keeping labels clear.

Read the seven semantic primitives and fuller/short-wide support symbols in `kit.svg`. `kit.template.svg` and `scripts/build-pilot-kits.mjs` are deterministic authoring sources, not a production materializer. Inline needed geometry and apply semantic palette roles to make self-contained candidates. The supports are examples, not a fixed diagram layout. Keep filled paper planes or a contiguous pencil crossing field exposed after placing the actual Japanese labels; never add factual objects just to demonstrate style.

Nominal label/detail sizes: {{scheme:typography.label.fontSize}} / {{scheme:typography.detail.fontSize}} user units. Connector stroke: {{scheme:geometry.strokeWidths.connector}} user units. Texture seed/amplitude/frequency: {{scheme:texture.seed}} / {{scheme:texture.amplitude}} / {{scheme:texture.frequency}}. Values resolve from the scheme; no independent numeric recipe copy.

### Required

- **native-construction**: Use imperfect major contours with a lighter displaced retrace and an exposed distributed crossed-pencil region recognizable at actual placement. Neighboring diagonal strokes form real interior crossings, not isolated X glyphs or zigzag tips. This required scheme supersedes conflicting sparse/removable-texture advice in legacy recipe guidance: keep fine airy strokes, but do not remove the principal field. Preserve exact Japanese text and vacant interiors; move or resize the backing/label planes when necessary.
- **facts-and-labels**: Preserve exact brief labels, locked relations and factual counts. Empty, pending and complete remain separate states. Inspect Japanese text at the actual placement.
- **palette-roles**: Use the six semantic palette roles; every kit color-bearing element declares its role. Palette changes do not change geometry.
- **texture-control**: Use seeded-pencil-field with fixed seed controlling line-position jitter, never model generation. Frequency is diagonal intervals per canonical 100-unit span; repeat opposing families across the authored field dimensions without fitting one finite patch into a wide viewport. Keep crossings exposed and text clear. Legacy seeded-pencil-hatch and seeded-pencil-crosshatch algorithms remain unchanged for prior reproduction.

### Preferred

- **reading-hierarchy**: Notebook ruling stays subordinate to every label and essential route; remove ruling locally behind text.
- **tone-emphasis**: Keep arrowheads unambiguous and text upright; express the hand through geometry rather than distorted Japanese glyphs.
- **field-transfer**: Use a contiguous field with neighboring crossings on a meaningful backing region. At short wide sizes expose it laterally or in a region with enough depth to show intersections, rather than hiding the entire center under a full-width label. Ruled ground stays subordinate. Empty objects keep their vacant interior clear; decorate surrounding construction.

### Flexible

- **layout**: Panel count, object placement, arrow routing and line breaks follow the actual brief and aspect ratio; the reference is not a page template.
- **hand-geometry**: Hand-author tone-native variations or omit nonessential detail. Explain departures from preferred rules and retain required facts.
- **glyph-style**: Use the declared Japanese font for essential labels; decorative Latin lettering may reflect the original reference when it remains readable.
- **texture-placement**: Choose field location, extent, cell spacing, contour variation and wrapping for the brief. Fine strokes may be simplified locally, but keep a distributed crossing region; no fixed stroke count, motif or coverage percentage is a visual gate. Original Pattern/Text and PNG content is not required.

### Composition vocabulary

- **arrows**: A gently imperfect ink path plus lighter retrace, ending in an open asymmetrical arrowhead.
- **people**: An imperfect head loop and hand-drawn shoulders; the displaced lighter trace is a sketch mark, never a second person.
- **empty**: An irregular retraced open chair with a visible vacant seat and explicit empty label. A chair-back hatch is optional detail; broader crossed texture belongs on the enclosing label/backing plane, never in the vacant seat.
- **pending**: Use a retraced clock next to the waiting object and retain its pending label.
- **emphasis**: Reserve a contiguous crossed-pencil field beside or around the clear label plane. Keep neighboring diagonal strokes visibly intersecting; labels must not mask every crossing or leave only tips. A muted loose underline may support emphasis.
- **warning**: Use a handwritten-looking contour around an upright warning label; preserve the exact text.

Preparation, structural checks and deterministic generation do not establish visual gate acceptance. Layout, exact motifs and percentages are not imposed; actual independent pilot images still need unchanged factual/readability/character review.
