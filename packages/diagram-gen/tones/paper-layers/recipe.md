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

## Pilot scheme and kit — authored revision pilot-3

The scheme is the numeric authority for new drawings. Required scheme guidance takes precedence over conflicting sparse/removable-texture advice in legacy recipe guidance: retain a visible construction region while keeping labels clear.

Read the seven semantic primitives and fuller/short-wide support symbols in `kit.svg`. `kit.template.svg` and `scripts/build-pilot-kits.mjs` are deterministic authoring sources, not a production materializer. Inline needed geometry and apply semantic palette roles to make self-contained candidates. The supports are examples, not a fixed diagram layout. Keep filled paper planes or a contiguous pencil crossing field exposed after placing the actual Japanese labels; never add factual objects just to demonstrate style.

Nominal label/detail sizes: {{scheme:typography.label.fontSize}} / {{scheme:typography.detail.fontSize}} user units. Connector stroke: {{scheme:geometry.strokeWidths.connector}} user units. Texture seed/amplitude/frequency: {{scheme:texture.seed}} / {{scheme:texture.amplitude}} / {{scheme:texture.frequency}}. Values resolve from the scheme; no independent numeric recipe copy.

### Required

- **native-construction**: Use visibly overlapping cut-paper planes with a substantial filled decorative region still exposed after labels are placed. A separate readable label sheet belongs to the same logical object. Pale hollow outlines, edge tips, shadow alone or generic boxed strips do not carry the construction. Exact motif family and exposed-area percentage are not requirements; keep factual counts and Japanese labels intact.
- **facts-and-labels**: Preserve exact brief labels, locked relations and factual counts. Empty, pending and complete remain separate states. Inspect Japanese text at the actual placement.
- **palette-roles**: Use the six semantic palette roles; every kit color-bearing element declares its role. Palette changes do not change geometry.
- **texture-control**: Use the scheme cut-paper-repeat construction. Frequency is motifs per row in the canonical support patch; the patch has two authored rows. Seed and amplitude are zero because the cut motif is periodic, not randomly perturbed. No photographic or procedural noise.

### Preferred

- **reading-hierarchy**: Keep paper edges visible around labels; shadows and rotations must never imply extra factual objects.
- **tone-emphasis**: Retain editorial spacing and optional serif sample lettering; required Japanese labels remain upright in the declared readable font.
- **clear-label-plane**: Keep essential labels ink on a clear surface-role plane, with no connector crossing the text. A shadow or top rule alone does not carry the layered construction.
- **construction-transfer**: State diagrams may use layered state objects; seat diagrams decorate enclosing label/backing planes while retaining exact chair counts and vacancies. Long labels occupy a clear foreground sheet. Parallel checks keep their distinct branches; return guidance keeps the empty container empty. These are construction options, not a fixed diagram layout.
- **wide-construction**: For short wide or label-heavy objects, expose an offset lateral motif sheet or another contiguous filled region, rather than stretching a fixed motif patch behind a full-width label. Wrap or shift the clear label sheet to preserve both text and material construction. Use purposeful asymmetry; do not repeat one boxed strip for every object.

### Flexible

- **layout**: Panel count, object placement, arrow routing and line breaks follow the actual brief and aspect ratio; the reference is not a page template.
- **hand-geometry**: Hand-author tone-native variations or omit nonessential detail. Explain departures from preferred rules and retain required facts.
- **glyph-style**: Use the declared Japanese font for essential labels; decorative Latin lettering may reflect the original reference when it remains readable.
- **motif-family**: Arches, scallops, bands or other cut shapes may vary freely if filled decorative mass, contrasting pieces and separate overlapping planes remain visible. Original Pattern/Text labels, poster merge and PNG output are example facts, never required content. Small primitives may omit motifs; the principal construction still carries the tone.

### Composition vocabulary

- **arrows**: A slim curved ink route joins sheets; a cut triangular tip indicates direction without becoming another sheet.
- **people**: Separate cut-paper head, shoulders and torso overlap; a backing silhouette exposes the paper depth.
- **empty**: A cut chair from separate back, seat and legs, with visible vacancy; label the seat explicitly.
- **pending**: Place a cut clock disk and pointer alongside the waiting sheet; retain the pending label.
- **emphasis**: Overlap a separately cut clear label sheet with a substantial filled motif backing. Reserve a contiguous exposed motif region beside or around the label, retaining filled shapes and contrasting inset pieces rather than pale hollow edge fragments.
- **warning**: Use a distinct labeled paper tab rather than an alarming shadow or extra data layer.

Preparation, structural checks and deterministic generation do not establish visual gate acceptance. Layout, exact motifs and percentages are not imposed; actual independent pilot images still need unchanged factual/readability/character review.
