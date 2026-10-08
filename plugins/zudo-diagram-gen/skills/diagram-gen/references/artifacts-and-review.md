# Saved artifacts and conversational review

Use host file tools to save actual SVG bytes. A compact sidecar note in the conversation or a saved text file is enough for this workflow; do not fabricate the engine's `session.json` or a browser review record. Record: brief/source facts, target CSS dimensions, language/fonts, candidate ID, tone ID, appearance/theme, saved filename, parent ID (or `none`), Keep/Change notes, checks, and any actual visual observations. IDs remain stable within the work; a refinement gets a new ID rather than overwriting its parent. Example IDs: `r01-c01`, `r02-c01`.

For a direct request, save one candidate. For exploration, default to at most four. Show each candidate’s actual attached SVG and available raster preview. Call an image "inspected" only after opening it at the requested size with an image-viewing tool. When a renderer exists but the image cannot be opened, report rendering only. When rendering is unavailable, SVG syntax checks alone do not prove layout, glyph coverage, contrast, or visual quality. A user’s selection is the only approval of that drawing; an agent test selection is test evidence only.

If the host permits downloadable files, attach the exact saved SVG and an actual preview PNG when possible. Do not substitute a screenshot of code, a fabricated download URL, or a regenerated approximation. If only chat text can be returned, label the SVG code block as a reduced source fallback and explain that no downloadable file or visual verification was produced.

## Refinement

Before editing, identify the saved baseline by ID and file. Read its exact contents and confirm it matches the previously presented drawing or attached source. Preserve the baseline bytes. Copy to a new file with a new ID and record `parent: <baseline ID>`; then apply the requested Change notes while protecting Keep notes and factual labels. Reinspect the changed result. Attach both the new file and the unchanged baseline if useful for comparison. Export means providing the exact selected saved file bytes, not reconstructing it from a tone example, kit, or prior message.

If the baseline is absent, unreadable, or differs from the reviewed file, report the uncertainty and ask for the exact saved SVG before claiming a faithful refinement. Existing files and review notes remain available; do not silently replace them. A new chat does not imply access to old sandbox files or browser storage. Ask for the saved SVG, ID, target size, and Keep/Change notes as attachments or explicit text. Source supplied only as a screenshot can guide a new approximation, but cannot establish exact-byte lineage.

Selecting or shortlisting one drawing does not authorize a project-wide style. Record a reusable style preference only when the user explicitly requests that broader scope. The engine's immutable style lock/adopt mechanism belongs to its separate local workflow.
