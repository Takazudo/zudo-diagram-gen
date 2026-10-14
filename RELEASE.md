# Plugin releases

This project distributes a skills-only ChatGPT plugin ZIP through GitHub Releases.
It does not publish npm packages as part of a plugin release.

## Maintainer command

In Claude Code, run `/l-make-release`. Optional arguments are `patch`, `minor`,
`major`, an explicit stable `X.Y.Z`, `--dry-run`, and `--confirm`.
The project-local skill lives at `.claude/skills/l-make-release/SKILL.md`.

The version source is `plugins/zudo-diagram-gen/plugin.json`. A release uses one
annotated `vX.Y.Z` tag and one GitHub Release. The private root and the two local
engine/initializer archives have independent versions; do not bump them merely
to distribute the plugin. No prerelease syntax is supported by the current
portable plugin validator.

Before any setup or fetch, the skill runs `node scripts/plugin-release-plan.mjs`
with the optional version argument. The whole `--dry-run` stops after this
read-only plan; missing local history or failed remote queries are reported,
never repaired by fetching/installing/building. An explicit same-version retry
uses the original annotated tag commit even when main has advanced. A matching
release PR is adopted without rebumping. Partial drafts upload only missing,
verified assets; identical published retries perform no mutation. Conflicts
fail closed, and published missing assets require reconciliation.

The first no-argument release uses the current plugin manifest version without
a dummy prerequisite tag. Later releases bump the plugin version. Release notes
live at `releases/vX.Y.Z.md`, alongside a dated public changelog entry. Source
changes go through a reviewed release PR and current-head CI. Existing main
merges may trigger documentation deployment; the skill honors session-specific
merge/deployment limits and does not change Cloudflare settings.

## Build without publishing

```bash
node scripts/plugin-release.mjs version
node scripts/plugin-release.mjs bump patch --dry-run
node --test test/plugin-release.node.mjs
node scripts/plugin-release.mjs pack
```

Release output is ignored under `artifacts/release/`:

- `zudo-diagram-gen-vX.Y.Z.zip`: version-specific installable plugin.
- `zudo-diagram-gen.zip`: identical bytes, convenient latest-release asset name.
- `SHA256SUMS`: checksums of both ZIP names.

The builder reuses the existing plugin assembler and validator, including the
24-tone catalog, inventory and forbidden-file checks. It normalizes ZIP entry
order, timestamps and file modes, then tests and freshly extracts the archive.
The ZIP contains the `zudo-diagram-gen/` plugin directory, not the repository or
an npm tarball. The existing `pnpm plugin-pack` local command remains available.

After creating a version tag, `node scripts/plugin-release.mjs pack --tag vX.Y.Z`
checks that it matches both the plugin manifest version and the checked-out
commit. A `Plugin ZIP` Actions artifact is convenient for CI snapshots, but it
has limited retention. A published GitHub Release is the durable download.
GitHub's automatic **Source code (zip)** download is not the installable plugin.

## Downloads and verification

After the first plugin release is published, use the Assets section of
[the latest GitHub Release](https://github.com/Takazudo/zudo-diagram-gen/releases/latest).
The stable filename also supports
[the latest plugin ZIP](https://github.com/Takazudo/zudo-diagram-gen/releases/latest/download/zudo-diagram-gen.zip).
These links are not evidence that a first release has already been published.

Download both ZIP assets and `SHA256SUMS` into a fresh directory and run
`sha256sum -c SHA256SUMS` (or `shasum -a 256 -c SHA256SUMS` on macOS). Extract the
versioned ZIP and run `node /path/to/checkout/scripts/plugin-pack.mjs --verify-dir
/path/to/extracted/zudo-diagram-gen` for the resource/inventory checks.

Upload to a draft Release, download and verify the actual uploaded assets, then
publish. Never move an existing tag or overwrite released bytes. Resume matching
partial releases; use a new version for published corrections.

A validated ZIP does not establish native ChatGPT account installation/discovery
or artifact-flow acceptance. [Issue #100](https://github.com/Takazudo/zudo-diagram-gen/issues/100)
tracks that separate verification.
