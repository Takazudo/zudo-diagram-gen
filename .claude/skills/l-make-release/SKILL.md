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

## 1. Classify before setup or mutation

Before fetch, checkout, installation, building or edits, run only the read-only
planner (omit the argument for a fresh no-argument release):

```bash
node scripts/plugin-release-plan.mjs [patch|minor|major|X.Y.Z]
```

Pass only the optional version argument, not `--dry-run` or `--confirm`, to the
planner. It uses Git reads, `git ls-remote` and authenticated paginated GitHub
lists. It never fetches, writes refs/FETCH_HEAD, installs or builds. Any failed
query aborts; a successful list with no match establishes absence. If local
history is insufficient, report that limitation; do not fetch during dry-run.
Require Git, supported Node and authenticated `gh` for this step, but do not
install missing tools. Announce the plan's mode, version, original source SHA,
release/PR state, notes summary from available local history and deployment
boundary. **For `--dry-run`, stop here**, including when planning fails. Never
run later setup or verification commands in dry-run.

The first fresh no-argument release with no tags uses the current manifest.
Later fresh no-argument releases default to patch (choose an explicit minor or
major when appropriate). An already prepared, higher untagged manifest version
is used as-is. Exactly one matching `release/plugin-vX.Y.Z` PR is adopted at its
recorded head and verified manifest; never recreate it or bump twice. Multiple
or conflicting release PRs require reconciliation.

An explicit `X.Y.Z` matching an existing annotated remote tag is a retry,
regardless of newer main's version. `resume-tag` keeps that tag's original
commit, manifest, notes and assets. A fresh no-argument operation after a
published release proposes the next version; it is not an idempotent retry.
Unrelated/lightweight tags, conflicting local/remote objects, downgrades and
Releases without tags abort. A plan is not evidence that assets match or CI
passed. Inspect those before any mutation.

After classification, a non-dry-run may fetch missing history and tags. Re-run
the planner and require the same selected version/commit before continuing.
For `new`, use clean current main equal to remote main, then prepare Step 2.
For `resume-pr`, adopt the verified PR branch and continue its review/checks in
Step 2. For `resume-tag`, skip version preparation and main selection entirely:
use an isolated clean detached checkout of the verified original tag commit,
verify its manifest and notes, and require successful push-to-main CI for that
exact original commit. Main advancing does not change the selected commit.
Never substitute newer main bytes, retag or select a new release commit on a
retry. Confirm repository policy and the session's production gate before a
release PR merge; no deployment setting changes are implied.

## 2. Prepare a release PR when source changes are needed

For a new plan, create `release/plugin-vX.Y.Z` from current `origin/main`.
For a matching release PR, adopt it instead. Use
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

After merge, read the actual merged PR's `mergeCommit.oid` from GitHub, verify
it against the integrated diff, and bind `release_sha` to that exact SHA. Fetch
only in this non-dry-run phase and create a clean detached checkout of that
commit before reading the manifest and notes. Never derive the release SHA
from a fast-forwarded main HEAD: main may have advanced already. Confirm the
`CI` workflow's successful **push to main** run for that exact selected SHA,
required checks and approvals (not just PR CI, Plugin ZIP or a skipped job).
Re-run state classification before tagging and preserve the actual integrated
commit for this new release. If any provenance or check is unavailable, stop.

## 3. Tag the validated commit and build its ZIP

Set `version`, `tag=v$version` and `release_sha` from the selected original
commit and checked manifest, not from newer main or a Release title. Verify that the release
notes exist and that `git status --porcelain` is empty. Inspect the local and
remote exact tag before mutation. If either already exists, resolve annotated
tags to commits and require equality with `release_sha`; never force-move a tag.

With `--confirm`, show the version, SHA and asset names and wait once, before the
first local tag creation, tag push, release upload or publication mutation.
Do this after building/verifying any existing-tag assets and before mutation. Otherwise proceed.

For a new tag:

```bash
git tag -a "$tag" "$release_sha" -m "zudo-diagram-gen $tag"
node scripts/plugin-release.mjs pack --tag "$tag"
git push origin "refs/tags/$tag"
```

`pack --tag` requires both manifest/tag version equality and tag/HEAD commit
equality. It creates versioned and stable-named ZIPs plus checksums under
`artifacts/release/`. Verify both SHA-256 entries and extract into a fresh
directory outside the checkout. Run the existing `--verify-dir` validator on
that extracted `zudo-diagram-gen/` folder. Do not upload a previous build or an
Actions wrapper ZIP. The `Plugin ZIP` workflow also stores the distributable as
an Actions artifact; that retention-limited artifact is not the durable release.

## 4. Upload, verify and publish the GitHub Release

Re-read the authenticated release list and exact tag to inspect existing state. Distinguish a genuine
not-found response from authentication/network failure; fail closed on the latter.
Branch on the verified state before running any create/upload command. For
`published`, verify all three downloaded assets from the original tag build and
return the unchanged published URL; if any asset is missing or differs, stop.
For `draft`, compare existing assets individually and upload only verified
missing names, then perform the full downloaded-asset checks below. For
`absent`, explicitly attach the actual plugin archives and checksum file:

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
the exact tag still resolves to the reviewed SHA. Immediately before publication, re-run the read-only planner for the explicit
version and require the same original commit and version. Set `make_latest` to
its boolean `makeLatest` output: `false` when a newer version is already
published, otherwise `true`. Failed or ambiguous queries stop publication.
This prevents an older tag-only or draft recovery from replacing a newer
release at the stable latest-download URL. Only then publish:

```bash
gh release edit "$tag" --repo Takazudo/zudo-diagram-gen --draft=false --latest="$make_latest"
```

Read the Release back, require `isDraft=false`, and report its URL and the actual
ZIP asset URL. Check that the published download is available. Success means a
published Release with validated downloadable ZIP assets, not merely a pushed tag.

## Recovery and completion

For a tag-only retry, package from the original clean tag checkout, then create
its draft with the three verified assets. For a partial draft, download each
existing expected asset separately; an all-assets download cannot succeed when
assets are missing. Compare bytes against the original tagged build before
uploading only the missing filenames with `gh release upload`, without
`--clobber`. Unexpected assets or mismatching release notes require explicit
reconciliation; do not delete anything. An identical published retry downloads
and verifies all three assets and returns success without upload/publication.
Missing assets in a published Release are a conflict, not a repair permission.
Use the helper's `releaseAssetPlan` in mocked rehearsals to classify verified
bytes; it never performs uploads. Never use `--clobber`, delete unrelated drafts, or replace a published
asset silently. If a draft contains differing bytes, stop and explain the
mismatch. An already-published identical release is a successful idempotent
resume; a published mismatch needs a new version. A tag without a Release can
resume at packaging/upload after rechecking its SHA and CI. A failed upload or
publication leaves an explicit partial state, never a success claim.

Report version, tag, exact commit, Release/ZIP URLs, SHA-256, actual validation
results and any remaining host-acceptance limits. Explicitly state that no npm
publication occurred. Do not claim background monitoring or future work.
