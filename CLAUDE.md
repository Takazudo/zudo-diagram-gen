# Claude Code project guidance

Read `AGENTS.md` for shared repository instructions and `docs/CODEX-HANDOFF.md` for the local development handoff. They are the canonical project guidance for this repository.

The engine implements session/project review, complete local tone contexts, placement/capture, immutable styles, saved refinement, exact export and explicit create/inspect/resume. Its archive includes the core diagram-gen skill and references. Read it explicitly or verify project-local discovery; no personal skill is installed automatically. The personal `/my-diagram-gen` wrapper remains future work. CLI commands do not generate SVGs or call a model.

When authoring candidates, keep the brief and intended display size visible. Make each candidate's real SVG the source of truth. Once the user chooses a direction, start subsequent work from that saved file, preserve the accepted characteristics, and create a new candidate for each reviewed refinement.
