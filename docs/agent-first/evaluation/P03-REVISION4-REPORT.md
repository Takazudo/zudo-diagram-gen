# P03 paired pilot — revision 4 results

Decision: **proceed; pencil visual gate passed**. All six prospective pencil batches are complete. Every B/C batch receives character three and consistency four from both evaluators; all final factual/readability gates pass. Original failures and independent judgments remain unchanged alongside these new scores. This supports the bounded rollout recommendation, subject to integrated code/package checks; it is not user approval of artwork.

## Per-run results

Readability is the minimum across five diagrams; consistency/character are coordinator batch scores. Bytes are measured proxies, not token counts.

| Run | Tone | Condition | Rep | Initial readability | Final readability | Consistency | Character | Correction turns | Initial SVG bytes | Resource bytes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| p301 | pencil-notebook | C | 1 | 3 | 3 | 4 | 3 | 0 | 165635 | 149985 |
| p302 | pencil-notebook | B | 1 | 3 | 3 | 4 | 3 | 0 | 115891 | 129702 |
| p303 | pencil-notebook | A | 1 | 4 | 4 | 4 | 2 | 0 | 21245 | 122800 |
| p304 | pencil-notebook | A | 2 | 2 | 3 | 4 | 2 | 1 | 23772 | 122800 |
| p305 | pencil-notebook | B | 2 | 3 | 3 | 4 | 3 | 0 | 174804 | 129702 |
| p306 | pencil-notebook | C | 2 | 2 | 3 | 4 | 3 | 1 | 128157 | 149985 |

## Paired changes

B−A and C−B within the same tone/repetition. Positive correction cost is worse. No statistical significance or pooled interchangeable revision comparison is claimed.

| Tone | Rep | Pair | Initial readability Δ | Final readability Δ | Character Δ | Consistency Δ | Corrections Δ | Initial SVG bytes Δ | Resource bytes Δ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pencil-notebook | 1 | B−A | -1 | -1 | 1 | 0 | 0 | 94646 | 6902 |
| pencil-notebook | 1 | C−B | 0 | 0 | 0 | 0 | 0 | 49744 | 20283 |
| pencil-notebook | 2 | B−A | 1 | 0 | 1 | 0 | -1 | 151032 | 6902 |
| pencil-notebook | 2 | C−B | -1 | 0 | 0 | 0 | 1 | -46647 | 20283 |

Medians [full ranges] across the two paired observations per contrast:

- B−A: initial readability: 0 [-1, 1]; final readability: -0.5 [-1, 0]; character: 1 [1, 1]; consistency: 0 [0, 0]; correction turns: -0.5 [-1, 0]; initial SVG bytes: 122839 [94646, 151032]; resource bytes: 6902 [6902, 6902].
- C−B: initial readability: -0.5 [-1, 0]; final readability: 0 [0, 0]; character: 0 [0, 0]; consistency: 0 [0, 0]; correction turns: 0.5 [0, 1]; initial SVG bytes: 1548.5 [-46647, 49744]; resource bytes: 20283 [20283, 20283].

## Scope and evidence

6 independent batches produced 30 initial light SVGs and 2 correction turns. Every available initial/final image was captured through frozen P05 at DPR1 and actually inspected. Unchanged correction copies were additionally verified by identical image SHA256 against the previously opened native initial image. Every changed image was opened separately. All original failures, character disagreements, corrections, exact prompts and artifacts remain.

`revision-4-records.json` retains full raw judgments and independent reviews, source/input/image hashes, fixed environment and available model/budget controls. `revision-4-artifacts/manifest.json` protects 114 small immutable source/prompt/sidecar files. Large PNGs remain local under `/workspace/diagram-evidence/pilot-runs/`; no Git LFS. Exact requested model is gpt-6.1-sol/medium; deployed snapshot, seed, token ceilings and token counts are unavailable. Preparation/dispatch-to-completion time includes orchestration and is not inference-only.

Explicit system Chromium151.0.7922.173 / Playwright1.59.1 and recorded Noto font hash remain unchanged. Native images retain prescribed slot geometry within larger placement frames. Font-ready does not establish glyph/semantic correctness. Coordinator was unblinded; independent reviewers saw opaque runs/references/briefs, no condition resources or coordinator scores. Dark variants are outside the light paired count and remain separately gated.

## Findings and next decision

The clarified principal-object/backing guidance transfers in both B repetitions: exposed crossings now belong to explanatory node construction, with visible retraced contours/routes and readable label/detail hierarchy. C retains those defining properties with native chair/clock/box motifs. All four B/C batches receive character three from both evaluators; neither paired C−B comparison loses character. Both fresh A controls receive two from both, reflecting sparse corner strokes and otherwise clean diagram cards. This comparison supports construction retention in these public briefs, not general causal efficacy or statistical significance.

Regular cards and systematic hatch strips still limit expressive variation. Upright Japanese glyphs and the common palette are permitted adaptations and were not treated as missing facts or required source lettering. The earlier p204 disagreement remains in revision three; this is new evidence after a prospective clarification, not its rescore. Paper remains byte-identical to revision three; fine/soft remains byte-identical to revision one. Their separate accepted evaluations are linked in the rollout recommendation, not pooled into revision-four statistics.

Two factual/readability correction turns produced ten copies, forty total captures. p304's confirmed-only qualifier crossed a connector; p306's no-damage label crossed its branch line. Clear surface backing corrected each without tuning character. Every initial and both changed correction images were actually opened by the coordinator; the other eight correction copies match previously opened SVG and PNG hashes. Independent original reviews had not judged those crossings material (readability four), and their original scores remain unchanged beside correctedFinal observations. Other retained differences include compact-layout readability, p304 consistency four versus three, and coordinator long-label readability three versus independent four. No disagreement leaves final readability below three or B/C consistency/character below three.

Resource costs increased: B adds6,902 bytes to A; C adds20,283 more. Source-output bytes grow substantially in B and vary in C. The two repetitions do not establish lower token cost, latency or fewer corrections. Exact deployed snapshot, generation seed and token measurements are unavailable. One A and one C correction turn do not prove kit efficiency. Use schemes to state construction and kits to assist editing, with actual review still required.

The fourth environment replacement occurred after freezing/preparing p301 but before any author was dispatched. Pack/baseline/preparation/font/browser hashes were reverified; preparation delay is separately retained. A reserved p301 agent alias rejected a spawn, then confirmed in a read-only recovery reply that it had read no input and produced no output. A new explicitly configured p301_author context performed the sole initial authoring turn. All six output-bearing initial authoring turns ran after recovery; no output was discarded or regenerated to select a favorable result.

Next: preserve this report and audit its evidence, integrate the current base, and complete required deterministic/package gates before merging P03. Then proceed with production materialization and independently reviewed all-tone rollout. Dark support preparation passed separately; these thirty paired outputs are light only, and downstream remapped light/dark review remains required.
