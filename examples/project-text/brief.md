# zudo-text — Split, then choose a component

A quiet native UI miniature shows the existing Note Tray preserved on the left, an Empty new frame on the right, and a component chooser. Splitting and selecting a new component are presented as distinct steps.

## Shared facts

- Split creates a new Empty frame while the existing Note Tray remains in its original frame.
- Choosing the new frame's component is a separate step after Split.
- Duplicate is a distinct operation. No note cloning is represented.

## Scope and limits

This is a conceptual help diagram, not a screenshot or an exact menu reproduction. The component picker is shortened to two valid examples. The depicted Empty state is the newly split frame; no note cloning occurs. No claim is made about which pointer or menu command invoked Split.

## Visual adaptation

Native UI miniature. The catalog tone ID `ui-miniature` locates the nearest general drawing family. This project adaptation follows its own meaning and design constraints; it is not a claim that the catalog palette is a project token.

Exact inspected default light/dark theme fallback colors and 3px/4px radii from packages/ui-components/src/tokens.css; colors are not a newly invented brand palette. The illustration reads foreground, background, secondary surface, accent, and border as semantic variables.

The preview size is a review fixture, not a guaranteed production slot. Test the actual component, language, and widths when integrating. The illustration retains a 720 × 400 viewBox. `source.svg` preserves the editable themed reference; the viewer uses explicit literal-color light and dark files.

## Provenance

These original studies were grounded in a September 2026 repository review. Source snapshots are listed below; branch URLs can change. Recheck current implementation before shipping a diagram. Each project example has its own session because the topics differ.

- [02e127725ed3c384750d16e9e0428fa95c4d2ae8/manual/src/content/docs/basics/layout.mdx](https://github.com/zudolab/zudo-text/blob/02e127725ed3c384750d16e9e0428fa95c4d2ae8/manual/src/content/docs/basics/layout.mdx)
- [02e127725ed3c384750d16e9e0428fa95c4d2ae8/packages/ui-components/src/tokens.css](https://github.com/zudolab/zudo-text/blob/02e127725ed3c384750d16e9e0428fa95c4d2ae8/packages/ui-components/src/tokens.css)
- [02e127725ed3c384750d16e9e0428fa95c4d2ae8/tauri-app/renderer/data/help-catalog/illustrations/index.tsx](https://github.com/zudolab/zudo-text/blob/02e127725ed3c384750d16e9e0428fa95c4d2ae8/tauri-app/renderer/data/help-catalog/illustrations/index.tsx)
- [02e127725ed3c384750d16e9e0428fa95c4d2ae8/tauri-app/renderer/data/help-catalog/illustrations.css](https://github.com/zudolab/zudo-text/blob/02e127725ed3c384750d16e9e0428fa95c4d2ae8/tauri-app/renderer/data/help-catalog/illustrations.css)
