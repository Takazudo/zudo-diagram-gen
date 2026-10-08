# zudo-diagram-gen

Ask an agent for a grounded SVG explanation, review concrete drawings at the real placement size, then refine the actual saved drawing. Earlier versions and feedback stay available. The installed package owns the review app; your session or project owns ordinary JSON, Markdown and SVG files.

Start with [Ask for your first diagram](src/content/docs/getting-started/first-session.mdx). The [project site](https://zudo-diagram-gen.zudolab.dev/) has documentation, 24 tone references, worked examples and an embedded workbench under `/docs/`. Local source documentation may be newer than the deployed site.

## Actual setup

Engine and initializer are `0.1.0` local archives; registry publication is not established. Use Node.js 22–24 and pnpm 10.30.3. From a source checkout:

```bash
pnpm install --frozen-lockfile
pnpm pack:local
```

Use the printed absolute engine archive path. [Local archive setup](src/content/docs/getting-started/local-archives.mdx) gives the complete tested command sequence to create a new external consumer, install dependencies, and resolve/copy the packaged skill into an explicitly chosen project-local directory. The initializer never installs a personal skill or initializes Git. Keep the archive available for reinstalls. CLI/manual use works without a skill-capable host.

The archive includes `skills/diagram-gen/SKILL.md` and commands/authoring/scenario references. Availability is not personal installation or native automatic discovery. After the optional project-local copy, explicitly ask your agent:

```text
Read .claude/skills/diagram-gen/SKILL.md and its relative references.
Resume this existing session. Explain the public review workflow at 360 × 200:
save candidates, inspect them, choose a direction, transfer Keep/Change feedback,
and refine the saved drawing. Show up to three useful directions.
Keep facts and labels fixed; present saved IDs and actually inspect the images.
This practice request does not approve a project-wide style.
```

A host with verified discovery can invoke `/diagram-gen --session .`; it is an agent task, not a shell command. The CLI calls no model and generates no artwork. The personal `/my-diagram-gen` wrapper is outside this delivery.

## Review, refine and export

Run `pnpm check` and `pnpm dev` inside the installed consumer and open zfb's printed URL. Inspect target-size placement and actual light/dark assets; **Shortlist** retains alternatives, **Choose direction** names only this drawing's baseline. **Copy feedback** or downloaded **Review JSON** explicitly transfers Keep/Change/Next action. Browser state does not write source files or resume a conversation.

The agent consumes the actual file/text, checks stale evidence, and starts a new later-round candidate from the named saved SVG/fingerprint. [Public API](src/content/docs/reference/api.mdx) gives the exact baseline helper; [Manual tutorial](src/content/docs/getting-started/manual-session.mdx) remains supported. Export uses the actual chosen candidate ID and theme; it copies saved bytes, not a regenerated tone. [CLI reference](src/content/docs/reference/cli.mdx) covers commands, envelopes/errors, safe outputs and legacy JSON.

## Projects and style

[Projects](src/content/docs/authoring/projects.mdx) group sessions in one zfb host with session-qualified identities and exact comparison mappings. Partial inspect/dev/export reports missing/invalid/stale/theme-unavailable slots while strict check/build requires valid current data. A tone switch, shortlist, screenshot or single drawing choice is not project-wide style approval. [Tone contexts](src/content/docs/authoring/tone-context.mdx) describe complete local schemes/kits, semantic palettes and immutable explicit lock/adopt revisions.

[Placement/capture](src/content/docs/reference/placement-capture.mdx) documents optional consumer Playwright/browser setup, local geometry and provenance. A successful check or capture is not actual image inspection, semantic correctness or user approval. Open images and record concrete observations separately.

## Contribute and verify

```bash
pnpm check
pnpm test
pnpm lint
pnpm format:check
pnpm check:examples
pnpm build
```

Packaging/setup examples need fresh consumers outside source, using installed public exports. Viewer/review/capture changes need actual browser/image verification. Follow the active environment's heavy/browser guards. See [AGENTS.md](AGENTS.md), [current contract](IMPLEMENTATION-CONTRACT.md), [current handoff](docs/CODEX-HANDOFF.md) and [quality checks](src/content/docs/development/quality-and-handoff.mdx). Historical verification and dated changelog entries remain preserved; [P09 acceptance](docs/agent-first/rollout/P09-ACCEPTANCE.md) records bounded tone evidence.

The root is one zudo-doc site on zfb 2 with embedded package workbench; generated hosts use zfb 3/zudo-react and retain zfb 2/Preact compatibility. The separate root zfb migration, package publication, site deployment, personal wrappers, MCP/model services and automatic integration are outside this documentation delivery.
