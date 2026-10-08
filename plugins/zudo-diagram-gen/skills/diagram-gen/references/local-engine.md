# Optional local engine workflow

The separate `@takazudo/zudo-diagram-gen` engine package supplies a CLI, local browser workbench, schemas, capture, project styles, and exact-file export. It is an advanced path for a user who explicitly wants a local session or project. It requires a separately installed package and its own `skills/diagram-gen/SKILL.md`; this plugin neither bundles that runtime nor installs it. The CLI creates and inspects files but does not call a model or draw artwork.

Do not introduce Node, pnpm, a server, a checkout, `session.json`, or the workbench into a conversational request solely because those features exist. If the user opts into the engine, use its installed skill and public documentation for actual commands and constraints. Browser-local feedback must be copied or downloaded before an agent can consume it. A drawing choice, image capture, and project-wide style adoption remain separate actions.
