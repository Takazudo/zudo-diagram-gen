# zzmod / Takazudo Modular — Audio and control voltage

VCO to VCF to VCA to output follows the cyan audio path. The envelope sends purple control voltage to VCA. This uses the existing synth SVG subsystem's background, audio and CV colors.

## Shared facts

- The cyan audio path runs from VCO through VCF and VCA to output.
- The envelope's purple control-voltage path controls VCA gain.
- Positions are conceptual rather than physical sockets. Envelope trigger and pitch inputs are outside this drawing.

## Scope and limits

Intentionally dark in both appearance modes to retain existing semantic audio/CV colors. Symbols are original simplifications, not reused branded patch symbols; positions are conceptual, not physical module sockets. Envelope trigger and pitch inputs are outside this focused diagram.

## Visual adaptation

Dark signal schematic. The catalog tone ID `circuit-route` locates the nearest general drawing family. This project adaptation follows its own meaning and design constraints; it is not a claim that the catalog palette is a project token.

The preview size is a review fixture, not a guaranteed production slot. Test the actual component, language, and widths when integrating. The illustration retains a 720 × 400 viewBox. `source.svg` preserves the editable themed reference; the viewer uses explicit literal-color light and dark files.

## Provenance

These original studies were grounded in a September 2026 repository review. Source snapshots are listed below; branch URLs can change. Recheck current implementation before shipping a diagram. Each project example has its own session because the topics differ.

- [develop/sub-packages/synth-svg/src/core/theme.ts](https://github.com/zudolab/zzmod/blob/develop/sub-packages/synth-svg/src/core/theme.ts)
- [develop/.claude/skills/l-synth-diagram-wisdom/references/basic-signal-chain.md](https://github.com/zudolab/zzmod/blob/develop/.claude/skills/l-synth-diagram-wisdom/references/basic-signal-chain.md)
