# Ten native texture and material packs

P09 issue 76 adds ten authored packs, initially `rollout-1` with subsequent revisions recorded below. Each owns a scheme, editable kit template, deterministic literal kit, synchronized recipe and a rerenderable native composition. Original source/light/dark SVG bytes remain unchanged. The companion TEXTURE-PACKS.json supplies catalog metadata to the serialized P09 owner; this helper does not activate the complete-catalog gate.

These are structural authoring results. Actual browser captures and placement acceptance remain the manager’s responsibility; passing resource checks do not establish readable Japanese glyphs or style fidelity.

## Construction and limitations

| Tone | Reference-derived construction | Limits to inspect |
| --- | --- | --- |
| contour-wash | Precise open contours over broad translucent washes. Wash overlap is decoration, never an additional relation. | Wash contrast varies with backdrop; inspect both themes after remapping. |
| luminous-glass | Overlapping translucent glass planes with selected luminous rim halos; crisp opaque labels sit outside the planes. | Both original variants are intrinsically dark. Remapping to a light surface requires independent contrast review; small slots lose halo character. |
| editorial-serif | Large deliberate serif specimen lettering and restrained rules in open margins; instructional labels have their own upright Japanese serif role. | Installed serif fallback metrics and CJK glyph coverage require image inspection. |
| isometric-solid | Opaque projected tiles with distinct top and side facets and hard cast shadows; circles become tangible medallions. | Facet depth can dominate a compact slot; essential labels stay outside projection. |
| isometric-wire | Open projected contours, dashed construction edges and accent registration edges, without solid extrusions. | Thin grid and dashed geometry need simplification in narrow slots. |
| risograph-duo | Two offset spot passes with broad overlapping circles and sparse print grain. Labels are single-pass to preserve Japanese legibility. | Overprint is approximated by layered opacity, not a calibrated print blend. Warning uses the second spot plus explicit wording. |
| halftone-manual | Firm monochrome keylines, picture-area dot screens and diagonal hatching; essential labels occupy clean knockout ground. | Dot screens may alias at reduced size; screen spacing must be judged in the actual raster capture. |
| marker-workshop | Broad rounded marker paths with imperfect corners, loose loops and flat highlighter swipes. | Bold marks overwhelm dense diagrams; simplify swipes before compressing the layout. |
| chalkboard | Broken chalk contours with a faint second pass, sparse dust, warm accents and open blackboard ground. | Both native light/dark palettes retain an intrinsic dark ground; an arbitrary light remap changes the board atmosphere, and dashed chalk marks can vanish when downscaled. |
| cut-paper | Irregular hand-cut silhouettes with offset pasted edges and flat organic color fields; label planes remain clean. | Too many overlapping cuts suggest extra objects; retain clear factual object counts. |

## Semantic construction

Every kit contains person, pin, slot-card, empty-seat, arrow, check and clock; no missing capability or primitive alternative is used. Each empty-seat retains an unoccupied back/seat/legs construction. Each check and clock remains a different silhouette. Offset printing passes, chalk echoes, extrusion facets and pasted backing are parts of one object.

Contour wash separates precise contours from translucent fields. Glass replaces opacity-free outlines with overlapping planes and rim halos; no external filter or resource is needed. Editorial person/seat geometry uses terminal rules; the slot is a typographic specimen separated by open rules. Solid isometric silhouettes have filled top/side facets and hard backing. Wire silhouettes have open projected contours and dashed construction edges. Risograph uses two spot roles, offset broad silhouettes and sparse grain. Halftone confines dot and hatch patterns to picture areas with firm keylines. Marker paths use asymmetric rounded strokes, loose loops and highlighter planes. Chalk paths have broken contours plus a faint displaced echo and sparse dust. Cut-paper uses irregular polygons with a separate offset backing and organic inset cuts.

The references are each tone’s bundled recipe, source.svg, light.svg and dark.svg plus the required shared composition meaning and provenance texts. Optional external inspiration does not supply mandatory facts. P03’s accepted pilot recommendation informs the distinction between substantial construction and removable decoration; the four pilot resources are unchanged.

## Evidence input and checks

Each composition is 640 × 360 CSS pixels, with two participants, one reservation card and one visibly empty chair. Arrows express the participant-to-card-to-seat reading route. Pending and completed marks are separate legend entries, with an explicit warning label above. The long Japanese reservation label wraps into two authored lines outside primitive boxes. Essential label size and minimum are read from the scheme.

`composition.template.svg` owns native surrounding geometry and labels. `composition.instances.json` supplies instances appended by the shared P09 evidence generator through production `materializeKit`. The manager prepares composition and kit-grid captures in native and alternate palettes, both themes: eight assets per tone. Any visual corrections must update the authoritative scheme/template then regenerate the kit; original reference artwork remains untouched.

Focused `rollout-texture.test.mjs` checks each ten-tone pack’s schema, seven symbols, deterministic regeneration, numeric recipe drift, offline complete resolution, repeated IDs/local references, both-theme non-default palette materialization and composition inputs. It also compares SHA-256 hashes of all thirty original SVG reference files against a frozen map captured from the shared seed, without requiring Git history in shallow CI. Geometry remains invariant between light/dark role remaps.

## Authored resource hashes

The following hashes identify current helper resources, including font and visual corrections. SHA-256 of original UTF-8 bytes; scheme context hashing is independently computed by the production resolver. The complete matrix and visual history retain actual review status; corrected compositions remain pending recapture.

| Tone | Revision | Scheme bytes SHA-256 | Kit bytes SHA-256 |
| --- | --- | --- | --- |
| contour-wash | rollout-1 | `0dc8c6ebc1fed331014bf075ed2dc9ea43f0fbecb794fc654b31edb23bd199c4` | `978fb802db22dab9f88fc6c8b76cf9b8e966b10d18f59d0009b5e99b1bbcac78` |
| luminous-glass | rollout-1 | `5c27c80e7555afc89b101bb18d800c850250cfd538ec556e3249c9da3a96c5e7` | `17c0baaadbbb40e5ff41cba694bb74592d32787debe05387e3a42e1a39351484` |
| editorial-serif | rollout-2 | `dbea6f3c91b91aaf45f4ec7edff0ff2ed05ce7cb8842b4f61047cee96003d6d7` | `28899e0630942c08e9606c5f45ca6409cbcc8c184a76d642d2b5ca266244255d` |
| isometric-solid | rollout-2 | `bf03462f710a9efa473a71f46c48fd91e602511959319eaf79ed7cdeee543aea` | `2842e5ede454f1e2bcb97623f94ce3325ce27bf03165a072a3d8def71f7fd27c` |
| isometric-wire | rollout-1 | `8842d4d09f931f329301a698b9150c300bde9c7b778ad2bc2a96ad0dfcccd403` | `577da26987c071cafdb1c5957d5f751a41271a1c712577cba12eea1660953356` |
| risograph-duo | rollout-1 | `8dcc34bb1c3a74f47cb08a70ef563953a0405311067202bcc803f1964a630368` | `f8fc7294be16ced0c077fd189fa6d4d426eb0ea83086721a9c358eb426c78066` |
| halftone-manual | rollout-1 | `e7941ae7382954d91e0dd0d540eaee7748fca3cbc7fa1212cae97e08fae46993` | `5fa9816a72849e4053f3bbab760eb2e746bafb1f95eeb866cddbdd07799d3db2` |
| marker-workshop | rollout-2 | `98ea00ec40297b39408c544caea7e57a9217435ceab84c9f4becbbe2deec044d` | `a8870e6db66be7f2c3434ebd5b12c884fd73244d6ed8d0017b253145c66320b0` |
| chalkboard | rollout-1 | `e69430c412ae3eaab736ac163081366719835b352bba703b08b1b1a60ca7c302` | `a9ac56e1c172c8f8b548154d62a2dd7233223a6d0eaeae6489649d368294d1af` |
| cut-paper | rollout-1 | `596da97529da5df0e668d0afa584c41056166a5d991d4cf83d63b69badd6e67b` | `9bda21b9c1a6e1b1612e8a1ba309f7f14315c06e0c0055d48c5d34b4d7ff0e9e` |
