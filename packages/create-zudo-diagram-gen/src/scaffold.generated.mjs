// Generated from packages/diagram-gen/src/scaffold.mjs by scripts/sync-scaffold.mjs.
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { lstat, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const VERSION = '0.1.0';
export const ENGINE_PACKAGE = '@takazudo/zudo-diagram-gen';

/**
 * Generate a self-contained session host. Installation is explicitly opt-in.
 * @param {{destination?:string, name?:string, enginePackage?:string, install?:boolean, cwd?:string}} options
 */
export async function createProject(options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const destination = options.destination ?? 'diagram-session';
  if (typeof destination !== 'string' || !destination.trim() || destination.includes('\0')) {
    throw new Error('Destination must be a nonempty directory path.');
  }
  const directory = path.resolve(cwd, destination);
  const name = options.name === undefined ? path.basename(directory) : options.name;
  if (typeof name !== 'string' || !name.trim() || /[\r\n\0]/.test(name)) {
    throw new Error('Session name must be a nonempty, single-line title.');
  }
  const title = name.trim();
  const nameSlug = slug(title);
  const id = `${nameSlug}-${randomUUID()}`;
  const engine = await normalizeEnginePackage(options.enginePackage ?? VERSION);
  await assertEmptyDestination(directory);
  const files = scaffold({ id, nameSlug, title, engine });
  if (options.project) {
    const specs = options.sessions ?? [{ slug: 'diagram', title }];
    if (!Array.isArray(specs) || !specs.length)
      throw new Error('Project scaffolding requires at least one session.');
    const seen = new Set();
    const registrations = [];
    for (const [order, spec] of specs.entries()) {
      if (
        !spec ||
        !/^[a-z0-9][a-z0-9._-]*$/i.test(spec.slug ?? '') ||
        ['.', '..'].includes(spec.slug) ||
        seen.has(spec.slug)
      )
        throw new Error('Session slugs must be valid and unique.');
      seen.add(spec.slug);
      const sessionTitle = spec.title ?? spec.slug;
      if (typeof sessionTitle !== 'string' || !sessionTitle.trim())
        throw new Error('Expected session title.');
      const sessionId = spec.id ?? `${spec.slug}-${randomUUID()}`;
      if (
        typeof sessionId !== 'string' ||
        !/^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/i.test(sessionId) ||
        registrations.some((entry) => entry.id === sessionId)
      )
        throw new Error('Session IDs must be valid and unique.');
      registrations.push({ id: sessionId, path: `sessions/${spec.slug}`, order });
      const content = scaffold({ id: sessionId, nameSlug: spec.slug, title: sessionTitle, engine });
      for (const relative of ['session.json', 'brief.md', 'rounds/r01/round.json'])
        files[`sessions/${spec.slug}/${relative}`] = content[relative];
      if (spec.target) {
        if (
          ![spec.target.width, spec.target.height].every(
            (n) => Number.isFinite(n) && n > 0 && n <= 20000,
          )
        )
          throw new Error('Invalid session target.');
        const metadata = JSON.parse(files[`sessions/${spec.slug}/session.json`]);
        metadata.target = spec.target;
        files[`sessions/${spec.slug}/session.json`] = json(metadata);
        files[`sessions/${spec.slug}/brief.md`] = brief(spec.target);
      }
    }
    delete files['session.json'];
    delete files['brief.md'];
    delete files['rounds/r01/round.json'];
    files['project.json'] = json({
      schemaVersion: 1,
      id,
      title,
      sessions: registrations,
      comparisonSets: [],
    });
    files['README.md'] = files['README.md'].replace(
      'with the current session and viewer embedded',
      'with the registered project sessions and viewer embedded',
    );
    files['.gitignore'] += 'pages/sessions/\n';
    files['README.md'] +=
      '\nOne installed host serves every session registered in project.json. The overview is / and each session has /sessions/<session-id>/. Keep IDs stable; candidate IDs need only be unique within their session.\n';
  }
  if (options.brief !== undefined) {
    if (typeof options.brief !== 'string') throw new Error('brief must be Markdown text.');
    if (options.project) {
      for (const key of Object.keys(files))
        if (key.endsWith('/brief.md')) files[key] = options.brief;
    } else files['brief.md'] = options.brief;
  }
  const createdFiles = [];
  await mkdir(directory, { recursive: true });
  try {
    for (const [relative, content] of Object.entries(files)) {
      const filename = path.join(directory, relative);
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, content, { encoding: 'utf8', flag: 'wx' });
      createdFiles.push({ filename, content });
    }
  } catch (error) {
    // Only remove files created by this call. Never remove a competing process's files.
    await Promise.allSettled(
      createdFiles.map(async ({ filename, content }) => {
        const { readFile } = await import('node:fs/promises');
        if ((await readFile(filename, 'utf8')) === content) await rm(filename);
      }),
    );
    throw Object.assign(
      new Error(
        `Could not finish creating ${directory}: ${error.message}. Preserve remaining files for diagnosis; resume existing content rather than retrying new.`,
      ),
      { code: error.code === 'EEXIST' ? 'OUTPUT_CONFLICT' : 'IO_ERROR' },
    );
  }
  const result = {
    directory,
    name: nameSlug,
    ...(options.project ? { projectId: id } : { sessionId: id }),
    title,
    installed: false,
    files: Object.keys(files),
  };
  if (options.install === true) {
    try {
      await installDependencies(directory, options.installOutput);
      result.installed = true;
    } catch (error) {
      error.code = 'IO_ERROR';
      error.data = {
        ...result,
        recovery: 'Run pnpm install in this directory, then resume it; do not rerun new.',
      };
      throw error;
    }
  }
  return result;
}

function slug(value) {
  const normalized = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
  return normalized || `diagram-${createHash('sha256').update(value).digest('hex').slice(0, 10)}`;
}

async function assertEmptyDestination(directory) {
  let ancestor = directory;
  while (true) {
    try {
      if ((await lstat(ancestor)).isSymbolicLink())
        throw Object.assign(new Error(`Destination ancestor is a symbolic link: ${ancestor}.`), {
          code: 'RESOURCE_UNSAFE',
        });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  let entry;
  try {
    entry = await lstat(directory);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (entry.isSymbolicLink())
    throw Object.assign(
      new Error(`Destination is a symbolic link: ${directory}. Choose a regular directory.`),
      { code: 'RESOURCE_UNSAFE' },
    );
  if (!entry.isDirectory())
    throw Object.assign(new Error(`Destination is not a directory: ${directory}.`), {
      code: 'OUTPUT_CONFLICT',
    });
  if ((await readdir(directory)).length) {
    throw Object.assign(
      new Error(
        `Destination is not empty: ${directory}. Choose a new or empty directory; no files were changed.`,
      ),
      { code: 'OUTPUT_CONFLICT' },
    );
  }
}

async function normalizeEnginePackage(input) {
  const fail = (message, code = 'INVALID_ARGUMENT') => Object.assign(new Error(message), { code });
  if (typeof input !== 'string' || !input.trim() || /[\r\n\0]/.test(input)) {
    throw fail('--engine-package requires a nonempty package spec or an absolute tarball path.');
  }
  const value = input.trim();
  const tarball = value.startsWith('file:') ? value.slice(5) : value;
  if (path.isAbsolute(tarball) || value.startsWith('file:')) {
    if (!path.isAbsolute(tarball)) throw fail('Local engine tarballs must use an absolute path.');
    if (!/\.(tgz|tar\.gz)$/i.test(tarball))
      throw fail('Local engine package must be a .tgz or .tar.gz file.');
    let entry;
    try {
      entry = await stat(tarball);
    } catch (error) {
      if (error.code === 'ENOENT')
        throw fail(`Engine tarball does not exist: ${tarball}.`, 'IO_ERROR');
      throw error;
    }
    if (!entry.isFile())
      throw fail(`Engine tarball is not a regular file: ${tarball}.`, 'RESOURCE_UNSAFE');
    return `file:${path.resolve(tarball)}`;
  }
  if (
    /^(\.|~|workspace:|link:)/.test(value) ||
    (/\.(tgz|tar\.gz)$/i.test(value) && !/^https?:\/\//.test(value))
  ) {
    throw fail(
      'Local engine tarballs must use an absolute path. Workspace and linked dependencies are not supported in a standalone session.',
    );
  }
  if (value === ENGINE_PACKAGE) return 'latest';
  if (value.startsWith(`${ENGINE_PACKAGE}@`))
    return value.slice(ENGINE_PACKAGE.length + 1) || 'latest';
  if (value.startsWith('-')) throw fail('Engine package spec must not begin with a dash.');
  return value;
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function scaffold({ id, nameSlug, title, engine }) {
  return {
    'package.json': json({
      name: nameSlug,
      version: '0.0.0',
      private: true,
      type: 'module',
      packageManager: 'pnpm@10.30.3',
      engines: { node: '>=22 <25' },
      scripts: {
        dev: 'zudo-diagram-gen dev .',
        build: 'zudo-diagram-gen build .',
        preview: 'zudo-diagram-gen preview .',
        check: 'zudo-diagram-gen check .',
        'export:html': 'zudo-diagram-gen export-html . --out exports/diagram-review.html',
      },
      dependencies: {
        [ENGINE_PACKAGE]: engine,
        '@takazudo/zfb': '4.3.0',
        '@takazudo/zfb-runtime': '4.3.0',
      },
      devDependencies: { typescript: '5.9.3', '@types/node': '22.19.7' },
    }),
    'pnpm-workspace.yaml':
      "packages:\n  - '.'\nonlyBuiltDependencies:\n  - '@takazudo/zfb'\n  - esbuild\n",
    'tsconfig.json': json({
      compilerOptions: {
        jsx: 'react-jsx',
        jsxImportSource: '@takazudo/zfb/zudo-react',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
        noEmit: true,
      },
      include: ['pages/**/*.tsx', 'zfb.config.ts'],
    }),
    'zfb.config.ts':
      "import { defineConfig } from '@takazudo/zfb/config';\n\nexport default defineConfig({});\n",
    '.gitignore':
      'node_modules/\ndist/\n.zfb/\n.zfb-*\n.generated/\npages/index.tsx\nexports/diagram-review.html\n',
    'session.json': json({
      schemaVersion: 1,
      id,
      title,
      description: 'A workspace for comparing and refining SVG diagram candidates.',
      target: { width: 360, height: 200, label: 'Help diagram' },
      toneCollectionVersion: VERSION,
    }),
    'brief.md': brief({ width: 360, height: 200 }),
    'rounds/r01/round.json': json({
      schemaVersion: 1,
      id: 'r01',
      title: 'First exploration',
      description: 'Compare alternative directions for the shared brief.',
      order: 1,
      baselineCandidateId: null,
    }),
    'AGENTS.md': agentInstructions,
    'CLAUDE.md':
      '# Agent instructions\n\nRead and follow [AGENTS.md](./AGENTS.md) before generating or editing diagrams.\n',
    'README.md': sessionReadme,
  };
}

const agentInstructions = `# Diagram session instructions

This directory is content for the package-owned zudo-diagram-gen viewer. A project host registers sessions under sessions/<slug>/ in project.json; the working files below are relative to each registered session. Keep project registrations and session IDs stable.

## Working files

- The coordinator owns session.json, brief.md, and each rounds/<round>/round.json.
- A candidate worker owns one rounds/<round>/<candidate>/ directory containing candidate.json and its SVG assets.
- pages/index.tsx and .generated/ are engine-generated. Project routes under pages/sessions/<session-id>/ are generated too. The engine regenerates the page when dev/build runs; edit session content to change the gallery.
- The core workflow accepts this directory as its destination. Personal wrapper skills choose directories and personal defaults outside this workspace.
- session.json has a unique persisted ID so same-named sessions have separate browser review state. Keep that ID when continuing this session; initialize a new session when starting independent work.

## Generation and revision

1. Read the actual feature and write a shared brief before drawing. Record real labels, relationships, source references, placement, and target size.
2. Read the tone catalog with pnpm exec zudo-diagram-gen tones list. Read chosen recipes with pnpm exec zudo-diagram-gen tones show <tone-id>.
3. Give each candidate a stable slug ID unique within its session. Add one candidate directory at a time; the viewer discovers additions during dev.
4. Run pnpm check, then inspect every candidate visually at its intended size. Validation cannot determine whether the drawing describes the feature correctly.
5. User selection establishes a refinement baseline. Copy the selected SVG into a new candidate in a later round and record parentCandidateId. Preserve reviewed candidates and change only the requested aspects.
6. A shortlist does not authorize integration. A clear request to use a candidate in the project does. Browser feedback is browser state; Copy feedback and downloaded review JSON do not write files into this directory.

## Candidate format

Create rounds/r01/c01/candidate.json with this shape and create diagram.svg beside it:

~~~json
{
  "schemaVersion": 1,
  "id": "r01-c01",
  "title": "Fine outline",
  "toneId": "fine-outline",
  "description": "A concise explanation of this candidate's direction.",
  "order": 1,
  "assets": { "light": "diagram.svg" },
  "parentCandidateId": null
}
~~~

Use a catalog tone ID when following a reference, or a clear custom tone ID when exploring another treatment. Describe custom drawing conventions in the candidate description and shared brief so later revisions can preserve them. Light is required; add assets.dark only when a separate dark SVG exists. Asset paths are relative to candidate.json. Use self-contained SVGs with a viewBox, title and description, literal colors, and no external dependencies. Diagram text and SVG geometry are the source of truth; retain them when refining.

For a refinement, add a new round.json with a greater order and baselineCandidateId set to the chosen candidate. Its child candidates have new IDs and parentCandidateId referring to that earlier candidate.

## Commands

- pnpm dev — start the zfb review workspace.
- pnpm check — validate session metadata, assets, and lineage.
- pnpm build and pnpm preview — produce and inspect the zfb static build.
- pnpm export:html — create a single-file offline review at exports/diagram-review.html.
- pnpm exec zudo-diagram-gen export <candidate-id> --session . --theme light --out <output.svg> — export the actual SVG; use dark only when the candidate has that asset.
`;

const sessionReadme = `# Diagram review workspace

This small zfb host loads its gallery UI from @takazudo/zudo-diagram-gen. Start with the shared brief and add SVG candidate directories; the initial empty round is valid.

## Run

~~~bash
pnpm install
pnpm dev
~~~

The command prints the local URL. Review AGENTS.md for the content contract, tone discovery, and refinement workflow. Supply network settings when needed with pnpm dev --host 0.0.0.0 --port 4799.

## Review and export

- pnpm check validates content and reports actionable errors.
- pnpm build makes the normal zfb static output, and pnpm preview serves it.
- pnpm export:html creates exports/diagram-review.html with the current session and viewer embedded for offline review.
- Copy feedback identifies the chosen candidate and requested changes for the agent. Browser-local choices are not automatically written back to the workspace.

Keep the selected SVG and its IDs stable once reviewed. Add refinements in later rounds so you can compare them with their originals.

## Engine dependency

The initializer pins the engine version unless --engine-package supplied another dependency. A local file: tarball dependency must remain at its recorded path until installation completes. For an unpublished handoff, keep that tarball available when reinstalling, or initialize again with its new absolute path. Once the package is published, change that dependency to a published version when you intentionally upgrade.
`;

async function installDependencies(directory, output = 'inherit') {
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['install'], {
      cwd: directory,
      stdio: output === 'stderr' ? ['inherit', 2, 2] : 'inherit',
      shell: process.platform === 'win32',
    });
    child.once('error', (error) =>
      reject(
        new Error(
          `Workspace created, but pnpm install could not start: ${error.message}. Run pnpm install in ${directory}.`,
        ),
      ),
    );
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `Workspace created, but pnpm install failed (${signal ? `signal ${signal}` : `exit ${code}`}). Files are preserved in ${directory}; run pnpm install there to retry.`,
          ),
        );
    });
  });
}

function brief(target) {
  return `# Diagram brief

## Intent
Describe actual feature behavior and the question the drawing answers.

## Must show
Record exact factual labels and relationships.

## May drop
Record details that may be simplified.

## References
Name original or invented sources and redistribution authority for supplied assets.

## Lock
List explicit constraints and any selected saved baseline; do not infer approval.

## Target
${target.width} × ${target.height} CSS pixels. session.json is authoritative.

## Language and fonts
Specify label language, required fonts and Japanese glyph requirements when applicable.
`;
}
