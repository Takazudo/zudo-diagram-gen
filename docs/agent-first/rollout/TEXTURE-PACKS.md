# Ten native texture and material packs

P09 issue 76 adds ten authored `rollout-1` packs. Each owns a scheme, editable kit template, deterministic literal kit, synchronized recipe and a rerenderable native composition. Original source/light/dark SVG bytes remain unchanged. The companion TEXTURE-PACKS.json supplies catalog metadata to the serialized P09 owner; this helper does not activate the complete-catalog gate.

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
| chalkboard | Broken chalk contours with a faint second pass, sparse dust, warm accents and open blackboard ground. | Both palettes retain an intrinsic dark ground; dashed chalk marks can vanish when downscaled. |
| cut-paper | Irregular hand-cut silhouettes with offset pasted edges and flat organic color fields; label planes remain clean. | Too many overlapping cuts suggest extra objects; retain clear factual object counts. |

## Semantic construction

Every kit contains person, pin, slot-card, empty-seat, arrow, check and clock; no missing capability or primitive alternative is used. Each empty-seat retains an unoccupied back/seat/legs construction. Each check and clock remains a different silhouette. Offset printing passes, chalk echoes, extrusion facets and pasted backing are parts of one object.

Contour wash separates precise contours from translucent fields. Glass replaces opacity-free outlines with overlapping planes and rim halos; no external filter or resource is needed. Editorial person/seat geometry uses terminal rules; the slot is a typographic specimen separated by open rules. Solid isometric silhouettes have filled top/side facets and hard backing. Wire silhouettes have open projected contours and dashed construction edges. Risograph uses two spot roles, offset broad silhouettes and sparse grain. Halftone confines dot and hatch patterns to picture areas with firm keylines. Marker paths use asymmetric rounded strokes, loose loops and highlighter planes. Chalk paths have broken contours plus a faint displaced echo and sparse dust. Cut-paper uses irregular polygons with a separate offset backing and organic inset cuts.

The references are each tone’s bundled recipe, source.svg, light.svg and dark.svg plus the required shared composition meaning and provenance texts. Optional external inspiration does not supply mandatory facts. P03’s accepted pilot recommendation informs the distinction between substantial construction and removable decoration; the four pilot resources are unchanged.

## Evidence input and checks

Each composition is 640 × 360 CSS pixels, with two participants, one reservation card and one visibly empty chair. Arrows express the participant-to-card-to-seat reading route. Pending and completed marks are separate legend entries, with an explicit warning label above. The long Japanese reservation label wraps into two authored lines outside primitive boxes. Essential label size and minimum are read from the scheme.

`composition.template.svg` owns native surrounding geometry and labels. `composition.instances.json` supplies instances appended by the shared P09 evidence generator through production `materializeKit`. The manager prepares composition and kit-grid captures in native and alternate palettes, both themes: eight assets per tone. Any visual corrections must update the authoritative scheme/template then regenerate the kit; original reference artwork remains untouched.

Focused `rollout-texture.test.mjs` checks each ten-tone pack’s schema, seven symbols, deterministic regeneration, numeric recipe drift, offline complete resolution, repeated IDs/local references, both-theme non-default palette materialization and composition inputs. It also compares all thirty original SVG reference files against the shared seed byte-for-byte. Geometry remains invariant between light/dark role remaps.

## Authored resource hashes

The following hashes identify helper resources before actual manager image inspection. SHA-256 of original UTF-8 bytes; scheme context hashing is independently computed by the production resolver. Visual acceptance is pending for every row.

| Tone | Revision | Scheme bytes SHA-256 | Kit bytes SHA-256 |
| --- | --- | --- | --- |
| contour-wash | rollout-1 | `6c96eae04d5a9d2961f0e29e16fa6e431e21e30f40b73bc6d0ba5014351c2380` | `f30968ee9a15b06227e6979ab93c02c43c05933bff73ca5bf49430840dd8fa23` |
| luminous-glass | rollout-1 | `4460618c0f3ce1da192e68912cb0a043d12bf738079f67920d53a6d4a9e90c09` | `b57487720bdf4f12098a456f34718843e8a3763d7472ac153f7f940aa4f2489e` |
| editorial-serif | rollout-1 | `d565f9c35daf5c3e30db4439c0f252c7c285edb870c8c3d3ac8e61e3dfcd0c79` | `f7990795bf460907ab63f3b0efcd9e9cf37c8a565abde5ddc2a9bd149226af3f` |
| isometric-solid | rollout-1 | `1b2ec2798599fe5454b45f1377217b9ebedbcf61df4c1fa645b84a6fa451e1db` | `310ffdd663dcd75968d195538798005cef3e684890892b8787051fe58a94f8bf` |
| isometric-wire | rollout-1 | `d1d98d4fcd80f8da60fd1c3487843d25a2d90194b1759330a516c7760b668e19` | `084c3dcc8c9f7ac7f22d1e3ec9db61f69e4e7eeff3819f3763dacd19809e7ff2` |
| risograph-duo | rollout-1 | `fa6fb80814b5bf42bf7652a51e37dbe9b68243c353e8c63623c17e7fa7d914cc` | `0cf86d4255d7e8ec25a689899638bf2b0fd8f7027bbabadbc00952cd18172dc4` |
| halftone-manual | rollout-1 | `e5fd403dbbf29f1810f1c6008f001d138274314827c26c1ebc2a6a0d485acc68` | `59c4bfda905474b79fe971bf3db8f92837c6603d0eedc1f0cfbd42a144d24a17` |
| marker-workshop | rollout-1 | `e42b92233798e31f5cf53606b6ea3f9541183995978170606d8f21e236242597` | `2071c6bab9b82282478da798c83611a205568d04cf573b58bb92fca1dcc12327` |
| chalkboard | rollout-1 | `9c57c6b96d58cf1a1a5fcf8a10121ff8b7f94cef9c826da745a83db413143b65` | `606a944190e5d3892fd5968a1b39763759ef73fa4fef5b99df2c751ca0874c17` |
| cut-paper | rollout-1 | `59d2bc0f06792c7b4f536b93c9c731dd8dc86b13c9eac1e7cbdafb5382c12723` | `18ab90ad529fe0f0642e1a19a0095fe58f1a7702c8d2d3ba7b751f18137dbfad` |
