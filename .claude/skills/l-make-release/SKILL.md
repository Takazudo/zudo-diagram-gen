---
name: l-make-release
description: >-
  Release the zudo-diagram-gen ChatGPT plugin as a versioned Git tag and a
  downloadable GitHub Release ZIP. Use for /l-make-release or a request to cut a
  plugin release. Never publishes to npm.
user-invocable: true
disable-model-invocation: true
argument-hint: "[patch|minor|major|X.Y.Z] [--dry-run] [--confirm]"
---

# /l-make-release

Deliver a versioned, downloadable **skills-only ChatGPT plugin ZIP**, not an npm
package and not GitHub's automatically generated source-code archive. Read
`AGENTS.md`, `CLAUDE.md` and `RELEASE.md` first. Creating or editing this skill is
not an instruction to execute a release.

## Contract

- Version source: `plugins/zudo-diagram-gen/plugin.json`. Tags are `vX.Y.Z`.
- Do not bump the private workspace or the two local-archive package versions.
  They are separate from the plugin distribution version.
- Publish `zudo-diagram-gen-vX.Y.Z.zip`, the identical convenience asset
  `zudo-diagram-gen.zip`, and `SHA256SUMS` on one GitHub Release.
- `node scripts/plugin-release.mjs pack` uses the existing `assemblePlugin` and
  `validatePlugin` contract: all 24 tones, relative resources, inventory hashes,
  forbidden-file checks and fresh-extraction verification remain mandatory.
- No `npm publish`, `pnpm publish`, registry token, Homebrew update, Cloudflare
  command, credential change, personal installation or unrelated issue closure.
- A normal invocation authorizes the release operations described here. Honor
  session-specific merge/deployment restrictions and repository protections.
  Main merges can trigger the existing docs deployment; when deployment is not
  authorized, stop with the prepared release PR rather than changing that gate.
- Default: announce the version and proceed without routine confirmation.
  `--confirm` adds one confirmation immediately before the tag push/publication.
  `--dry-run` is read-only for the entire skill: no edits, install, build, branch,
  PR, tag, upload or release mutation.

## 1. Establish the exact starting point

Require authenticated `gh`, Git, the repository's pinned pnpm, supported Node,
`zip` and `unzip`. Confirm `origin` is `Takazudo/zudo-diagram-gen`, branch is
`main`, and `git status --porcelain` is empty. Fetch origin and tags, then require
`HEAD` to equal `origin/main`. Inspect open release PRs, tags and Releases before
creating anything; adopt matching partial work only after verifying its contents.
Do not silently delete drafts or retarget tags.

Read the plugin version with:

```bash
node scripts/plugin-release.mjs version
```

There is **no required bootstrap tag**. With no existing version tags, the
no-argument first release uses the current manifest version (initially `0.1.0`).
An explicit bump argument still bumps it. Do not invent a previous release.

After the first release, inspect changes since the latest reachable plugin tag
and choose a stable patch for fixes/maintenance, minor for additions, or major
for breaking compatibility. Explicit `patch`, `minor`, `major` or `X.Y.Z` wins.
If the manifest already contains the intended, not-yet-tagged release version,
resume that version instead of bumping twice. Reject equal/downgrade targets
except when resuming exactly the same verified release. Stop on unrelated tags
or inconsistent version history. Prereleases are intentionally unsupported until
the portable plugin manifest validator supports them too.

Preview a bump without writing:

```bash
node scripts/plugin-release.mjs bump minor --dry-run
```

Announce current version, proposed version, exact source commit, release-note
summary and any merge/deployment boundary. For `--dry-run`, report and stop here.

## 2. Prepare a release PR when source changes are needed

Create `release/plugin-vX.Y.Z` from current `origin/main`. Use
`node scripts/plugin-release.mjs bump <mode-or-version>` only when a bump is
needed. Write plain Markdown release notes at `releases/vX.Y.Z.md` and add a
user-facing dated MDX entry under `src/content/docs/changelog/`. Describe plugin
changes and limitations truthfully; do not present a ZIP build as proof of actual
ChatGPT installation, discovery or refinement acceptance. Issue #100 remains a
separate host-acceptance task; Mac acceptance #105 is separate too.

Run the checks appropriate to the repository, including:

```bash
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm format:check
pnpm lint
pnpm check
pnpm test
pnpm check:examples
pnpm build
node --test test/plugin-release.node.mjs
node scripts/plugin-release.mjs pack
```

Use guarded aggregate/browser/packed-consumer gates as required by AGENTS and
CI. Fix failures; never substitute an old run or a source-only render for current
verification. Review the diff and stage only intended release files, not ignored
ZIPs or unrelated work. Commit, push and open the release PR. Wait for all
required current-head checks and required reviews. Merge only through ordinary
repository policy and within the session's merge/deployment authorization.
Never use an admin bypass. Otherwise leave the PR unmerged with the exact blocker.

Switch to main, fetch and fast-forward after merge. Require a clean tree and
record `release_sha=$(git rev-parse HEAD)`. Confirm the `CI` workflow's **push to
main** run for that exact SHA succeeded (not just the PR run, Plugin ZIP job or
a skipped job). Inspect required status checks and the actionlint result too.
If main has advanced, re-evaluate the release notes and use a fully checked
commit; do not accidentally release an unreviewed newer HEAD.

## 3. Tag the validated commit and build its ZIP

Set `version`, `tag=v$version` and `release_sha` from the checked manifest and
commit, not from shell text copied from a Release title. Verify that the release
notes exist and that `git status --porcelain` is empty. Inspect the local and
remote exact tag before mutation. If either already exists, resolve annotated
tags to commits and require equality with `release_sha`; never force-move a tag.

With `--confirm`, show the version, SHA and asset names and wait once, before the
first tag push or release upload. Otherwise proceed.

For a new tag:

```bash
git tag -a "$tag" "$release_sha" -m "zudo-diagram-gen $tag"
git push origin "refs/tags/$tag"
node scripts/plugin-release.mjs pack --tag "$tag"
```

`pack --tag` requires both manifest/tag version equality and tag/HEAD commit
equality. It creates versioned and stable-named ZIPs plus checksums under
`artifacts/release/`. Verify both SHA-256 entries and extract into a fresh
directory outside the checkout. Run the existing `--verify-dir` validator on
that extracted `zudo-diagram-gen/` folder. Do not upload a previous build or an
Actions wrapper ZIP. The `Plugin ZIP` workflow also stores the distributable as
an Actions artifact; that retention-limited artifact is not the durable release.

## 4. Upload, verify and publish the GitHub Release

Use `gh release view "$tag"` to inspect existing state. Distinguish a genuine
not-found response from authentication/network failure; fail closed on the latter.
For a new release, explicitly attach the actual plugin archives and checksum file:

```bash
gh release create "$tag" \
  "artifacts/release/zudo-diagram-gen-v${version}.zip" \
  artifacts/release/zudo-diagram-gen.zip \
  artifacts/release/SHA256SUMS \
  --repo Takazudo/zudo-diagram-gen --verify-tag --draft \
  --title "zudo-diagram-gen $tag" --notes-file "releases/$tag.md"
```

The draft is a staging boundary, not completion. Download all three attached
assets into a new temporary directory with `gh release download`. Verify the
checksums, compare the downloaded ZIP bytes with the locally validated ZIP,
fresh-extract, check `plugin.json.version`, and run `--verify-dir` again. Confirm
the exact tag still resolves to the reviewed SHA. Only then publish:

```bash
gh release edit "$tag" --repo Takazudo/zudo-diagram-gen --draft=false --latest
```

Read the Release back, require `isDraft=false`, and report its URL and the actual
ZIP asset URL. Check that the published download is available. Success means a
published Release with validated downloadable ZIP assets, not merely a pushed tag.

## Recovery and completion

For a matching draft, compare existing asset bytes first and upload only missing
assets. Never use `--clobber`, delete unrelated drafts, or replace a published
asset silently. If a draft contains differing bytes, stop and explain the
mismatch. An already-published identical release is a successful idempotent
resume; a published mismatch needs a new version. A tag without a Release can
resume at packaging/upload after rechecking its SHA and CI. A failed upload or
publication leaves an explicit partial state, never a success claim.

Report version, tag, exact commit, Release/ZIP URLs, SHA-256, actual validation
results and any remaining host-acceptance limits. Explicitly state that no npm
publication occurred. Do not claim background monitoring or future work.
