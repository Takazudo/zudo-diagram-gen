# zudo-doc-cloud — Collect two changes into a named draft

A square neutral fine-line diagram compares Workbench before and after moving selected changes A and B into Draft: Guide. Unselected change C remains on Workbench, which continues to exist.

## Shared facts

- In this successful Move example, selected changes A and B move from Workbench into the named Draft: Guide.
- Unselected change C remains on Workbench, which continues to exist.
- A, B, and C are illustrative changes. Dependency expansion, blockers, stale previews, and Keep a copy on Workbench are outside this drawing.

## Scope and limits

A, B, and C are illustrative semantic change units, not whole pages or asset files. Guide is an invented example draft title. This successful Move example assumes no dependency expansion, blockers, or stale preview; it does not explain the optional Keep a copy on Workbench mode. The complete Workbench document is not visualized, only its changes.

## Visual adaptation

Square neutral fine-line workflow. The catalog tone ID `fine-outline` locates the nearest general drawing family. This project adaptation follows its own meaning and design constraints; it is not a claim that the catalog palette is a project token.

Inspected Default palette OKLCH values from packages/zudo-doc-cloud/src/styles/tokens.css are numerically converted to nearest 8-bit sRGB for vector-renderer compatibility. Conversion is OKLCH to OKLab to linear sRGB, followed by the sRGB transfer function. Light bg/surface/fg/mild/muted: #f5f5f5/#ececec/#161616/#4a4a4a/#686868. Dark: #0b0b0c/#141415/#dedede/#a7a8a8/#8a8a8a. The 35% foreground + 65% background mix is computed in OKLCH before conversion: light (.7006657,0,0) gives #9e9e9e; dark (.4127331,.001378,286.141497) gives #4b4b4c. Its zero-chroma foreground hue is powerless. Hairline 12% foreground + transparent retains foreground RGB at alpha .12: rgba(22,22,22,.12) and rgba(222,222,222,.12). All exact input OKLCH mappings are retained in the SVG comment. Square geometry follows ADR 0012. Essential labels are enlarged to at least 26px for this prototype.

The preview size is a review fixture, not a guaranteed production slot. Test the actual component, language, and widths when integrating. The illustration retains a 720 × 400 viewBox. `source.svg` preserves the editable themed reference; the viewer uses explicit literal-color light and dark files.

## Provenance

These original studies were grounded in a September 2026 repository review. Source snapshots are listed below; branch URLs can change. Recheck current implementation before shipping a diagram. Each project example has its own session because the topics differ.

- [0bafaf39a278580f2f3118f972833b89347453ba/doc/src/content/docs/spec/project-hierarchy.mdx](https://github.com/zudolab/zudo-doc-cloud/blob/0bafaf39a278580f2f3118f972833b89347453ba/doc/src/content/docs/spec/project-hierarchy.mdx)
- [0bafaf39a278580f2f3118f972833b89347453ba/packages/zudo-doc-cloud/src/features/drafts/collect-into-draft-dialog.tsx](https://github.com/zudolab/zudo-doc-cloud/blob/0bafaf39a278580f2f3118f972833b89347453ba/packages/zudo-doc-cloud/src/features/drafts/collect-into-draft-dialog.tsx)
- [0bafaf39a278580f2f3118f972833b89347453ba/packages/zudo-doc-cloud/src/styles/tokens.css](https://github.com/zudolab/zudo-doc-cloud/blob/0bafaf39a278580f2f3118f972833b89347453ba/packages/zudo-doc-cloud/src/styles/tokens.css)
- [0bafaf39a278580f2f3118f972833b89347453ba/packages/zudo-doc-cloud/docs/adr/0012-square-design-system-and-palettes.md](https://github.com/zudolab/zudo-doc-cloud/blob/0bafaf39a278580f2f3118f972833b89347453ba/packages/zudo-doc-cloud/docs/adr/0012-square-design-system-and-palettes.md)
