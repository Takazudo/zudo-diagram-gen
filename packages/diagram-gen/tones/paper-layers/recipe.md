# 12 Paper layers

Overlapping off-white sheets, slight rotations, cut-paper motifs, and small offset shadows make the layer composition feel physical and easy to grasp.

This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.

## Drawing recipe

- Represent independent inputs as overlapping sheets with small, deliberate rotations.
- Use restrained offset shadows to show stacking and keep a consistent direction for light.
- Place cut-paper motifs within the sheets without obscuring their edges.
- Keep the relationship between the source sheets and the assembled result visible.
- Adapt the warm paper palette to the project while preserving sufficient separation between sheets.

## Useful placements

Composition tools, content assembly, creative onboarding, and calm editorial documentation.

## Size and theme notes

The paper metaphor carries a warm editorial personality and may conflict with highly technical interfaces.

The original example is preserved. The pilot canvas uses {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Essential pilot labels use fontSize {{scheme:typography.label.fontSize}}, with minimum {{scheme:typography.label.minCssPx}}px after contain placement. Check actual line breaks, Japanese glyphs, transformations and overlap; nominal size is not readability evidence.

`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.

## Shared example meaning

A pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.

Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.

## Reading this drawing

Pattern and Text identify the two contributing layers. MAKE is sample text shown in the text input and the composed result, not a second action or duplicate output. PNG identifies the exported image. Perspective, stacked edges, sketch marks or print offsets describe this tone's visual construction; they do not introduce extra data stages.

## Optional public inspiration

These links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.

- [IBM Design Language — flat illustration principles](https://www.ibm.com/design/language/illustration/flat-style/design/)
- [Atlassian Design — illustration purposes and formats](https://atlassian.design/foundations/illustrations)

## Pilot scheme and kit — authored revision pilot-1

The scheme is the numeric authority for new pilot drawings; original example geometry stays unchanged. Read `scheme.json` and the seven symbols in `kit.svg` together. `kit.template.svg` is authoring source, checked in this repository by `node scripts/build-pilot-kits.mjs --check`; it is not a runtime materialization API. Palette-bearing marks carry semantic attributes and literal light defaults. Inline needed geometry for a self-contained candidate and use the common experiment palette; do not reference the kit as an external image.

Nominal label/detail sizes: {{scheme:typography.label.fontSize}} / {{scheme:typography.detail.fontSize}} user units. Connector stroke: {{scheme:geometry.strokeWidths.connector}} user units. Texture seed/amplitude/frequency: {{scheme:texture.seed}} / {{scheme:texture.amplitude}} / {{scheme:texture.frequency}}. These expressions resolve from the scheme; do not copy their values into an independent recipe.

### Required

- **native-construction**: Build cut-paper silhouettes from overlapping planar pieces with visible cut edges and one offset shadow direction.
- **facts-and-labels**: Preserve exact brief labels, locked relations and factual counts. Empty, pending and complete remain separate states. Inspect Japanese text at the actual placement.
- **palette-roles**: Use the six semantic palette roles; every kit color-bearing element declares its role. Palette changes do not change geometry.
- **texture-control**: Use the scheme texture and fixed seed. Do not add random noise or distort text; no texture means no procedural texture.

### Preferred

- **reading-hierarchy**: Keep paper edges visible around labels; shadows and rotations must never imply extra factual objects.
- **tone-emphasis**: Retain editorial spacing and optional serif sample lettering; required Japanese labels remain upright in the declared readable font.

### Flexible

- **layout**: Panel count, object placement, arrow routing and line breaks follow the actual brief and aspect ratio; the reference is not a page template.
- **hand-geometry**: Hand-author tone-native variations or omit nonessential detail. Explain departures from preferred rules and retain required facts.
- **glyph-style**: Use the declared Japanese font for essential labels; decorative Latin lettering may reflect the original reference when it remains readable.

### Composition vocabulary

- **arrows**: A slim curved ink route joins sheets; a cut triangular tip indicates direction without becoming another sheet.
- **people**: Separate cut-paper head, shoulders and torso overlap; a backing silhouette exposes the paper depth.
- **empty**: A cut chair from separate back, seat and legs, with visible vacancy; label the seat explicitly.
- **pending**: Place a cut clock disk and pointer alongside the waiting sheet; retain the pending label.
- **emphasis**: Overlap an accent cutout on a quiet sheet without obscuring the source/destination relationship.
- **warning**: Use a distinct labeled paper tab rather than an alarming shadow or extra data layer.

This pack is prepared for the frozen paired pilot, not accepted by a visual gate. Schemas, deterministic generation and nominal text size cannot establish tone character, factual accuracy or Japanese readability. No fixture is user approval.
