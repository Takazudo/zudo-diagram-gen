# Skills-only plugin confirmation

Date: 2026-10-09

This record covers the local integration confirmation for issue #99. It distinguishes package evidence and deterministic local fixtures from an actual ChatGPT host run.

## Local archive

Built with pnpm plugin-pack from base/diagram-plugin at 70bbb2b (merge commit for #97). The ignored local artifact was artifacts/plugin/zudo-diagram-gen.zip with SHA-256 7f1b70d99ff404487245b5db1c0cb1e6fbf7d7e99818d60b4945659e9b8c1e85. Its ZIP entries have one root directory, zudo-diagram-gen/.

After extracting to /tmp/zudo-plugin-99.mMlLnv/zudo-diagram-gen, the verify-dir command reported 24 tones, 217 files, and inventory SHA-256 281a59d97d1869a2d74aa93e78244568beb07e2318b997d887bb51c47d0b760b. The extracted skills/diagram-gen/tones/ tree was byte-for-byte identical to packages/diagram-gen/tones/. The catalog declares 122 unique resource paths; each resolved inside the extracted package and matched its inventory hash. All 24 tones also had their required source.svg and kit.template.svg files.

The package contains plugin.json, LICENSE, the skill and its references, all tone resources, and inventory.json. It contains no package.json, runtime engine, MCP server, or dependency manifest. The plugin manifest declares no dependencies or mcpServers. The inventory hashes every packaged source file, and the ZIP has no extra checkout root.

The installed-path instructions were checked against the extracted package: the skill reads tones/catalog.json first, resolves selected catalog resources from tones/, and links to its packaged references/ files. All 53 relative Markdown links across the 30 packaged Markdown files resolve within the package. The guide's natural-language example names the zudo-diagram-gen diagram-gen skill; it does not imply slash-command discovery.

To reproduce from the repository root, build the archive and verify a fresh extraction outside the checkout:

    pnpm plugin-pack
    EXTRACT_DIR="$(mktemp -d /tmp/zudo-diagram-plugin.XXXXXX)"
    unzip -q artifacts/plugin/zudo-diagram-gen.zip -d "$EXTRACT_DIR"
    node scripts/plugin-pack.mjs --verify-dir "$EXTRACT_DIR/zudo-diagram-gen"

The archive SHA-256 above identifies this local run; it is not a published or hosted download. The verify command reads the extracted package. It does not install or exercise the plugin in ChatGPT.

## Local tone and saved-file checks

The focused Vitest suites passed individually using a real temporary path on this macOS host:

    TMPDIR=/private/tmp pnpm exec vitest run test/plugin-pack.test.mjs
    TMPDIR=/private/tmp pnpm exec vitest run packages/diagram-gen/test/style.test.mjs
    TMPDIR=/private/tmp pnpm exec vitest run packages/diagram-gen/test/workflow-command.test.mjs

Results were 6/6 package tests, 11/11 style/refinement tests, and 25/25 CLI workflow tests. With the host's default temporary path, /var is a symlink and the engine's destination guard rejects test fixtures under it; /private/tmp avoids that host-path condition without changing the guard or tests.

For a static tone check, the extracted fine-outline light/dark, pencil-notebook light/dark, and swiss-grid light examples were rasterized to 720 × 400 PNGs with macOS sips and opened for visual inspection. The fine-outline examples use contrasting light and dark surfaces, pencil examples retain visible crossed texture in both themes, and the Swiss grid example has aligned panels with a red accent. These are bundled teaching examples, not output generated for a user. The check does not establish ChatGPT font selection or host rendering.

The local saved-refinement fixture in packages/diagram-gen/test/style.test.mjs creates candidate c02 as a child of saved baseline c01, preserves Keep/Change feedback, and copies the original light and dark SVG bytes. The CLI fixture in packages/diagram-gen/test/workflow-command.test.mjs exports the selected light SVG and compares the saved output to the exact source bytes; an invalid theme leaves the existing output unchanged. These are deterministic engine fixtures, not a ChatGPT conversation or model generation.

## Host acceptance still open

No authorized ChatGPT plugin host/account was available in this run. The ZIP was not installed, uploaded, or enabled in a personal account. Actual installation, discovery, skill invocation, host file creation, attached SVG/preview usability, Keep/Change refinement, and cross-conversation file attachment remain unverified. The local marketplace route and manual scenarios are documented in the [ChatGPT plugin guide](/docs/getting-started/chatgpt-plugin/). Follow-up [issue #100](https://github.com/Takazudo/zudo-diagram-gen/issues/100) tracks a scoped host acceptance run and requires evidence for the tested host; it makes no universal support claim.
