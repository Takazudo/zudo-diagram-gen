# Source import inventory

Imported from the supplied `zudo-diagram-gen` source directory on 2026-09-27. The original directory was read only.

The supplied JSON manifest lists 282 files. Each listed source file matched its recorded SHA-256 at import time. Of those, 241 authored files were copied to this repository. The other 41 were rebuildable outputs: 23 `.zudo-doc/routes-src` files, eight generated showcase pages, nine `public/previews` SVGs, and `src/generated/site-data.ts`. The source also held `dist/`, `artifacts/`, and `.generated/` output outside the manifest; those and dependency caches were excluded. The two executable CLI files retained executable mode.

The manifest file itself had SHA-256 `6aa598159898de4a89523e015f9146fe9a777291a09f5facd7964d400afed076` when imported. The receiver handoff note recorded `0a5a2e7835627ab080bc1f4031346dc299e820b74e2e3afa2b0d2d866b3cb0a4`. The reason for this manifest-file hash difference is unknown; every per-file hash in the current manifest matched the supplied source. No source file was overwritten to resolve the discrepancy.

`pnpm check` and `pnpm build` regenerate the showcase pages, previews, and site data before type checking or building. The preparation can also be run directly with `node scripts/build-showcase.mjs`. zudo-doc recreates its route output when needed. `pnpm export:preview` and `pnpm pack:local` recreate the ignored standalone HTML and package archives.

The imported baseline has 24 tone profiles with explicit light and dark reference SVGs, and six example sessions with 16 candidates and 32 declared theme SVGs. These counts were measured from the imported data; no session, candidate, or tone was rewritten to reach them.

The authored import was scanned for common credential markers and absolute personal paths before the public branch push. No matches were found. The generated source files excluded from Git can contain machine-specific paths, which is another reason to rebuild them locally.
