# create-zudo-diagram-gen

Initialize a small local zfb app for comparing and refining SVG diagram candidates. The generated project stores the brief, session metadata, rounds, and SVG files. Its installed `@takazudo/zudo-diagram-gen` engine owns the review interface.

Requires Node.js 22–24 and pnpm. Package version `0.1.0` is a development handoff; this repository does not claim it has been published.

## Run from this source checkout

First follow the root README to install dependencies and pack the engine. Then run the initializer with the engine archive's **absolute path**:

```bash
node packages/create-zudo-diagram-gen/bin/create-zudo-diagram-gen.mjs \
  ./diagram-review \
  --name "Help diagram exploration" \
  --engine-package "/absolute/path/to/takazudo-zudo-diagram-gen-0.1.0.tgz" \
  --yes

cd diagram-review
pnpm install
pnpm dev
```

The `file:` dependency points at that tarball. Keep it available when reinstalling dependencies, or regenerate the workspace using its new absolute path. The initializer rejects relative local archive paths because the generated project's working directory differs from the caller's.

## After publication

These forms become available when the initializer and engine versions have actually been published:

```bash
pnpm create zudo-diagram-gen diagram-review --yes
pnpm create zudo-diagram-gen diagram-review --name "Release help" --install
```

## Options

| Argument | Behavior |
| --- | --- |
| `[destination]` | Relative or absolute output directory; defaults to `./diagram-session`. An existing directory must be empty. |
| `--name <title>` | Human-readable session title; defaults to the destination basename. A safe slug becomes the package name. The persisted session ID adds a UUID so same-named workspaces have separate browser review state. |
| `--engine-package <spec>` | Engine dependency override: version or tag, complete engine package spec, npm alias, or absolute existing `.tgz`/`.tar.gz` path. Default: `0.1.0`. |
| `--install` | Run `pnpm install` after generation. Default: disabled. |
| `--yes`, `-y` | Accepted for automation. Initialization uses predictable defaults and never prompts; each new session receives a unique identity. |
| `--help`, `-h` | Print usage. |
| `--version`, `-v` | Print initializer version. |

Use `--` before a destination that begins with a dash. Paths and titles can contain spaces. The initializer never creates a Git repository or installs an agent skill. Personal wrapper skills choose the destination and defaults; the initializer has no personal directory assumptions.

## Generated project

The initial `rounds/r01/round.json` contains no candidates. This is a valid empty gallery, ready for an agent to populate after writing the brief. `AGENTS.md` documents the candidate format and review workflow; `CLAUDE.md` points to those instructions.

`zfb.config.ts` uses the normal `defineConfig` entrypoint. The engine generates `pages/index.tsx` for the viewer when its development/build command runs; do not edit that generated page. New hosts pin `@takazudo/zfb` and `@takazudo/zfb-runtime` to `3.2.0` and configure the zudo-react JSX import source in `tsconfig.json`. They do not need Preact, preact-render-to-string, or a direct Hono dependency; Hono is owned by zfb-runtime. Existing v2 sessions and the root showcase retain their compatible dependencies. The generated `pnpm-workspace.yaml` makes a session independent of a surrounding workspace.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Serve the gallery through zfb and watch session content. |
| `pnpm check` | Validate session content and SVG assets. |
| `pnpm build` | Build the static zfb app. |
| `pnpm preview` | Preview the static build. |
| `pnpm export:html` | Export a self-contained `diagram-review.html` for offline review. |

## Programmatic use

```js
import { createProject } from 'create-zudo-diagram-gen';

const result = await createProject({
  destination: '/absolute/path/to/review',
  name: 'Note history help',
  enginePackage: '/absolute/path/to/engine.tgz',
  install: false
});
```

The function resolves relative destinations against `cwd` (optional) or the caller's current working directory. It returns the directory, slug name, unique `sessionId`, title, installation status, and generated relative file list. Keep that session ID when continuing or relocating a session; initialize a new session for independent work. Existing nonempty destinations and symbolic-link destinations are rejected before writing files. Installation failures retain the generated files and explain how to retry.

## Validation

```bash
node --test packages/create-zudo-diagram-gen/test/*.test.mjs
```

Tests cover initialization in paths containing spaces and quotes, destination protection, symlinks, engine archive references, predictable package metadata with unique session identity, explicit installation, CLI errors, and a valid empty session scaffold. Root integration checks also exercise a packed engine consumer.
