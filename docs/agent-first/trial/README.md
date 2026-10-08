# Saved integrated trial

`sources/` freezes the actual five-session, eight-tone trial authored through the installed package from integration commit `c1935b83d4722397c1260a8684d24d84f58ad858`. It preserves 55 original candidates and six later readability corrections, including the original failed drawings. `source-provenance.json` binds every source byte. Formatting tools exclude this immutable tree.

All 110 original theme images and 12 correction images were opened in the managed trial. Twelve original images failed readability because routes or borders crossed labels. All corrected images passed the factual/readability/character rubric. These are unblinded agent evaluations and explicit test decisions, not user approval or a controlled model-efficiency experiment. The acceptance report distinguishes image evaluation from deterministic CI checks.

`node scripts/check-integrated-trial-fixture.mjs` validates saved source structure. `scripts/check-integrated-trial-packed.sh` installs fresh local archives, copies only hash-verified sources, builds the host and exports detached HTML. The browser helpers exercise these actual files; CI never calls a model. Large PNGs remain external evidence, not repository assets.

This checkpoint deliberately retains five sessions and all eight comparison sets. Later locked-style workflow evidence is separate; adding a sixth diagram does not silently make these original comparison maps complete for six sessions. See [integrated acceptance](../ACCEPTANCE.md) for current gate status and limitations.
