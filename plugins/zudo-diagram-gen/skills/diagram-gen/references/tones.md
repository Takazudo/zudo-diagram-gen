# Using bundled tone references

The assembled plugin contains the canonical 24-tone collection in `../tones/`. The source plugin folder is incomplete until the packaging step copies those files. All paths in `catalog.json` are relative to `../tones/`. Select from the catalog summary before reading full packs, so unrelated tones need not enter context.

For each selected entry, read every required `bundledReferences[].path`, its `scheme` and `kit` when declared, and its light/dark example files. `source.svg` is editable reference material where present. The examples teach composition and tone; they are not the requested product drawing. `shared/composition-meaning.md` describes their invented teaching example, and `shared/provenance.md` explains attribution and reuse. Public `sourceReferences` are optional inspiration; do not fetch them to complete the drawing or copy third-party artwork.

## Resolve rules before drawing

`recipe` strings and recipes may contain `{{scheme:...}}` placeholders. Resolve each path against that tone's `scheme.json`, including numeric array indices such as `coordinateSystem.viewBox.2`. State the literal value and its units if reporting the rule. If the path cannot be resolved, report the unresolved rule and avoid treating the placeholder as a final instruction. Do not copy template syntax into SVG output.

Treat the scheme's `rules.required` as obligations for the selected tone and explanation. Follow `rules.preferred` unless a reason to depart is recorded. `rules.flexible` permits geometry and layout suited to the actual brief. The catalog's examples and sample palette do not override the user's facts, requested style, accessibility needs, or destination design rules. A palette change alone does not change geometry. If a required tone rule conflicts with the user’s goal, explain the conflict and choose another tone or get the user’s direction.

Use explicit `palette.light` or `palette.dark` values for the requested appearance; all colors in the finished SVG must be literal. Use the six semantic roles—ink, surface, border, accent, deep, warning—consistently. Preserve both theme assets separately when both are requested. A light asset is not a dark-theme fallback. Some tone examples, such as luminous glass, intentionally use a dark-looking surface in both named variants; inspect actual pixels rather than infer appearance from the filename.

Use `coordinateSystem.viewBox`, geometry, typography, and texture as construction guidance, adapting them to the requested target. With a contained fit, the nominal scale is `min(targetWidth/viewBoxWidth, targetHeight/viewBoxHeight)`. Multiply the scheme font size by that scale and compare to `minCssPx`, then actually inspect the rendered glyphs and text fit. A font family named in the scheme may be unavailable in the host; choose an available replacement, record it, and recheck labels. Numeric size checks do not establish readability.

Keep output independent of the viewer: inline any needed kit geometry, namespace or uniquely name IDs, and resolve local `url(#id)`/`href` references. Do not link to a kit or tone SVG from the final artifact. The tone reference files and their original license/provenance remain bundled; generated work must still respect rights for user-supplied materials.
