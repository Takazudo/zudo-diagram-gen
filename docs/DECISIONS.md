# Project decisions

These decisions capture the agreed direction for the first app handoff. The executable data contract is described in `IMPLEMENTATION-CONTRACT.md`; user-facing explanations live in the project website.

## 1. Local review workspace backed by an engine package

The initializer creates a small private host. The engine owns viewer behavior; each session owns the brief, metadata, SVGs, and rounds. This follows the small-host/shared-package precedent of zudo-doc and zudo-sg.

## 2. zfb is the normal lifecycle

Use zfb for development, build, and preview. The root documentation site also uses zudo-doc. An offline one-file HTML export is a supplementary review artifact and shares the same viewer/data renderer.

## 3. Ordinary SVG remains the drawing model

The first version does not impose a universal node/edge or layout DSL. A compact metadata schema identifies drawings, themes, and lineage; the SVG contains the actual illustration.

## 4. Paths belong to the caller

The initializer accepts a destination. The future core skill accepts `--out` for a new session or `--session` for continuation. The user's wrapper resolves their personal output convention and passes the path into the core.

## 5. Compare before establishing a new visual direction

For an exploratory request, produce actual candidate drawings. Keep shared facts fixed when comparing tones, and identify structure changes when exploring the explanation too. Honor requested candidate counts.

## 6. Refinement starts from the saved baseline

The selected SVG is the strongest reference for its next revision. Preserve prior reviewed versions, create new candidate IDs for refinements, and record an earlier-round parent. Keep explicitly accepted properties while making the requested changes.

## 7. Theme and backdrop are independent

A candidate declares complete light and optional dark SVG assets. The viewer backdrop is an inspection aid. Missing dark artwork remains visibly unavailable and cannot silently fall back during export.

## 8. Feedback transfer is explicit in version one

Use browser-local state for review convenience, copied text for conversation, and downloaded JSON for structured records. The app does not claim a localStorage update is a workspace write. A future server write endpoint is a separate extension.

## 9. Skills are a subsequent integration

This handoff builds the application, initializer, collection, and documentation. It specifies the core and personal wrapper interfaces without installing either. Implement the final Claude Code skill in the user's selected repository after exercising a real diagram request.

## 10. Verification describes its actual scope

Keep engine tests, static SVG checks, zfb builds, package consumer checks, and browser interactions distinguishable. A source bundle can be useful before every environment-dependent check is available; the handoff must state those limits accurately.
