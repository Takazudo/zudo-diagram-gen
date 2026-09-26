# Claude Code project guidance

Read `AGENTS.md` for shared repository instructions and `docs/CODEX-HANDOFF.md` for the local development handoff. They are the canonical project guidance for this repository.

The first version implements the review application, initializer, tone collection, and documentation. The `/diagram-gen` core skill and personal `/my-diagram-gen` wrapper are documented integration contracts; this repository handoff does not install either skill.

When authoring candidates, keep the brief and intended display size visible. Make each candidate's real SVG the source of truth. Once the user chooses a direction, start subsequent work from that saved file, preserve the accepted characteristics, and create a new candidate for each reviewed refinement.
