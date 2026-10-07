# P03 paired pilot — revision 3 results

Decision: **revise; rollout gate failed**. Complete affected paired rerun, with one documented empty aborted dispatch and replacement after environment recovery; no output-bearing result discarded. All final fact/readability gates pass after the bounded corrections below, but the unchanged character gate is not satisfied. Independent judgments remain alongside coordinator scores.

## Per-run results

Readability is the minimum across five diagrams; consistency/character are coordinator batch scores. Bytes are measured proxies, not token counts.

| Run | Tone | Condition | Rep | Initial readability | Final readability | Consistency | Character | Correction turns | Initial SVG bytes | Resource bytes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| p201 | paper-layers | A | 1 | 2 | 3 | 4 | 2 | 2 | 17659 | 131409 |
| p202 | pencil-notebook | C | 1 | 2 | 3 | 4 | 3 | 1 | 139910 | 149009 |
| p203 | paper-layers | B | 1 | 2 | 3 | 4 | 3 | 1 | 80373 | 137575 |
| p204 | pencil-notebook | B | 1 | 4 | 4 | 4 | 3 | 0 | 79974 | 128726 |
| p205 | paper-layers | C | 1 | 3 | 3 | 4 | 3 | 0 | 29902 | 145638 |
| p206 | pencil-notebook | A | 1 | 3 | 3 | 4 | 2 | 0 | 19460 | 122800 |
| p213 | paper-layers | C | 2 | 3 | 3 | 4 | 3 | 0 | 30861 | 145638 |
| p208 | pencil-notebook | A | 2 | 4 | 4 | 4 | 2 | 0 | 19924 | 122800 |
| p209 | paper-layers | B | 2 | 2 | 3 | 4 | 3 | 1 | 76627 | 137575 |
| p210 | pencil-notebook | B | 2 | 4 | 4 | 4 | 3 | 0 | 75238 | 128726 |
| p211 | paper-layers | A | 2 | 4 | 4 | 4 | 2 | 0 | 19024 | 131409 |
| p212 | pencil-notebook | C | 2 | 4 | 4 | 4 | 3 | 0 | 127272 | 149009 |

## Paired changes

B−A and C−B within the same tone/repetition. Positive correction cost is worse. No statistical significance or pooled interchangeable revision comparison is claimed.

| Tone | Rep | Pair | Initial readability Δ | Final readability Δ | Character Δ | Consistency Δ | Corrections Δ | Initial SVG bytes Δ | Resource bytes Δ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| paper-layers | 1 | B−A | 0 | 0 | 1 | 0 | -1 | 62714 | 6166 |
| paper-layers | 1 | C−B | 1 | 0 | 0 | 0 | -1 | -50471 | 8063 |
| paper-layers | 2 | B−A | -2 | -1 | 1 | 0 | 1 | 57603 | 6166 |
| paper-layers | 2 | C−B | 1 | 0 | 0 | 0 | -1 | -45766 | 8063 |
| pencil-notebook | 1 | B−A | 1 | 1 | 1 | 0 | 0 | 60514 | 5926 |
| pencil-notebook | 1 | C−B | -2 | -1 | 0 | 0 | 1 | 59936 | 20283 |
| pencil-notebook | 2 | B−A | 0 | 0 | 1 | 0 | 0 | 55314 | 5926 |
| pencil-notebook | 2 | C−B | 0 | 0 | 0 | 0 | 0 | 52034 | 20283 |

Medians [full ranges] across the four paired observations per contrast:

- B−A: initial readability: 0 [-2, 1]; final readability: 0 [-1, 1]; character: 1 [1, 1]; consistency: 0 [0, 0]; correction turns: 0 [-1, 1]; initial SVG bytes: 59058.5 [55314, 62714]; resource bytes: 6046 [5926, 6166].
- C−B: initial readability: 0.5 [-2, 1]; final readability: 0 [-1, 0]; character: 0 [0, 0]; consistency: 0 [0, 0]; correction turns: -0.5 [-1, 1]; initial SVG bytes: 3134 [-50471, 59936]; resource bytes: 14173 [8063, 20283].

## Scope and evidence

12 independent batches produced 60 initial light SVGs and 5 correction turns. Every available initial/final image was captured through frozen P05 at DPR1 and actually inspected. Unchanged correction copies were additionally verified by identical image SHA256 against the previously opened native initial image. Every changed image was opened separately. All original failures, character disagreements, corrections, exact prompts and artifacts remain.

`revision-3-records.json` retains full raw judgments and independent reviews, source/input/image hashes, fixed environment and available model/budget controls. `revision-3-artifacts/manifest.json` protects 242 small immutable source/prompt/sidecar files. Large PNGs remain local under `/workspace/diagram-evidence/pilot-runs/`; no Git LFS. Exact requested model is gpt-6.1-sol/medium; deployed snapshot, seed, token ceilings and token counts are unavailable. Preparation/dispatch-to-completion time includes orchestration and is not inference-only.

Explicit system Chromium151.0.7922.173 / Playwright1.59.1 and recorded Noto font hash remain unchanged. Native images retain prescribed slot geometry within larger placement frames. Font-ready does not establish glyph/semantic correctness. Coordinator was unblinded; independent reviewers saw opaque runs/references/briefs, no condition resources or coordinator scores. Dark variants are outside the light paired count and remain separately gated.

## Findings and next decision

Paper B/C passes: all four batches receive character at least three from both evaluators. Pencil C1/C2 and B2 also receive three from both. Pencil B1 p204 retains coordinator three versus independent two; the aggregate gate fails. Original A controls are two from both evaluators. No score averaging or retrospective rubric change resolves the disagreement.

Read-only diagnosis supports a material transfer weakness: p204 has real slight skew, quadratic routes, doubled contours and crossed strokes, but four layouts place crossing fields above/below principal nodes. The clean node construction, weak retracing and weight-500-only labels flatten its pencil identity. Upright Japanese text is explicitly permitted; its regular glyphs alone do not justify failure. Contrasting p202 integrates crossing fields into meaningful node backing and retains stronger weight hierarchy/curved routes. This is descriptive evidence, not causal proof. The exact score boundary remains disputed.

Five correction turns produced twenty-five copies (eighty-five total captures). p201 required two turns for return-label and long-label overlap; p202 corrected seat/icon overlap; p203 corrected return usability text; p209 corrected an obscured publication note. Every changed image was opened; untouched copies matched previously opened SVG/PNG hashes. p201 initial long-label readability was amended from four to two after an additional actual inspection found overlap; its prior value, timestamp and reason remain in evaluationAmendments. Independent original/readability disagreements remain raw, including p201. No character tuning used correction turns.

The third environment replacement interrupted p207 before any input read or output. Its zero-output aborted record and exact dispatch are retained outside the sixty completed initial outputs. Fresh p213 replaced it; the affected second paper repetition then ran fresh C→B→A as p213/p209/p211. Prepared p208 had never been dispatched before replacement; its actual first-dispatch timing and preparation delay remain separately recorded. The same p205 independent reviewer resumed without authoring changes. The browser/font/frozen pack hashes were reverified. This is an interrupted experiment, not an uninterrupted timing benchmark. p209's reviewer received a corrected reference-directory typo before judging character; that message/path correction is recorded.

Decision: retain paper resources unchanged. Authorize one prospective pencil-only object-construction clarification, then freeze a revision-four amendment and run six fresh A/B/C batches (thirty initial outputs) with original A bytes, unchanged model/budgets, rubric and thresholds. Principal objects/backing/routes must visibly carry the pencil construction; a detached header/footer band alone is insufficient. Preserve readable upright Japanese, flexible field geometry and factual vacancy; impose no area quota, mandatory all-curved routing or new score threshold. No P04/P09 rollout is unlocked by preparation or deterministic checks.
