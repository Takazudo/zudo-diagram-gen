# P03 paired pilot — revision 2 results

Decision: **revise; rollout gate failed**. Complete prospective paired rerun; no original result rescored or discarded. All final fact/readability gates pass after the bounded corrections below, but the unchanged character gate is not satisfied. Independent judgments remain alongside coordinator scores.

## Per-run results

Readability is the minimum across five diagrams; consistency/character are coordinator batch scores. Bytes are measured proxies, not token counts.

| Run | Tone | Condition | Rep | Initial readability | Final readability | Consistency | Character | Correction turns | Initial SVG bytes | Resource bytes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| p101 | paper-layers | A | 1 | 4 | 4 | 4 | 2 | 0 | 18653 | 131409 |
| p102 | pencil-notebook | C | 1 | 4 | 4 | 4 | 3 | 0 | 63195 | 137286 |
| p103 | paper-layers | B | 1 | 2 | 3 | 4 | 3 | 1 | 38591 | 137025 |
| p104 | pencil-notebook | B | 1 | 2 | 3 | 4 | 3 | 1 | 114386 | 128271 |
| p105 | paper-layers | C | 1 | 2 | 3 | 4 | 3 | 1 | 31478 | 144281 |
| p106 | pencil-notebook | A | 1 | 2 | 3 | 4 | 2 | 1 | 16162 | 122800 |
| p107 | paper-layers | C | 2 | 2 | 3 | 4 | 3 | 1 | 56457 | 144281 |
| p108 | pencil-notebook | A | 2 | 2 | 3 | 4 | 2 | 1 | 19741 | 122800 |
| p109 | paper-layers | B | 2 | 3 | 3 | 4 | 2 | 0 | 44705 | 137025 |
| p110 | pencil-notebook | B | 2 | 4 | 4 | 4 | 3 | 0 | 53736 | 128271 |
| p111 | paper-layers | A | 2 | 2 | 3 | 4 | 2 | 1 | 19638 | 131409 |
| p112 | pencil-notebook | C | 2 | 2 | 3 | 4 | 2 | 1 | 44086 | 137286 |

## Paired changes

B−A and C−B within the same tone/repetition. Positive correction cost is worse. No statistical significance or pooled interchangeable revision comparison is claimed.

| Tone | Rep | Pair | Initial readability Δ | Final readability Δ | Character Δ | Consistency Δ | Corrections Δ | Initial SVG bytes Δ | Resource bytes Δ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| paper-layers | 1 | B−A | -2 | -1 | 1 | 0 | 1 | 19938 | 5616 |
| paper-layers | 1 | C−B | 0 | 0 | 0 | 0 | 0 | -7113 | 7256 |
| paper-layers | 2 | B−A | 1 | 0 | 0 | 0 | -1 | 25067 | 5616 |
| paper-layers | 2 | C−B | -1 | 0 | 1 | 0 | 1 | 11752 | 7256 |
| pencil-notebook | 1 | B−A | 0 | 0 | 1 | 0 | 0 | 98224 | 5471 |
| pencil-notebook | 1 | C−B | 2 | 1 | 0 | 0 | -1 | -51191 | 9015 |
| pencil-notebook | 2 | B−A | 2 | 1 | 1 | 0 | -1 | 33995 | 5471 |
| pencil-notebook | 2 | C−B | -2 | -1 | -1 | 0 | 1 | -9650 | 9015 |

Medians [full ranges] across the four paired observations per contrast:

- B−A: initial readability: 0.5 [-2, 2]; final readability: 0 [-1, 1]; character: 1 [0, 1]; consistency: 0 [0, 0]; correction turns: -0.5 [-1, 1]; initial SVG bytes: 29531 [19938, 98224]; resource bytes: 5543.5 [5471, 5616].
- C−B: initial readability: -0.5 [-2, 2]; final readability: 0 [-1, 1]; character: 0 [-1, 1]; consistency: 0 [0, 0]; correction turns: 0.5 [-1, 1]; initial SVG bytes: -8381.5 [-51191, 11752]; resource bytes: 8135.5 [7256, 9015].

## Scope and evidence

12 independent batches produced 60 initial light SVGs and 8 correction turns. Every available initial/final image was captured through frozen P05 at DPR1 and actually inspected. Unchanged correction copies were additionally verified by identical image SHA256 against the previously opened native initial image. Every changed image was opened separately. All original failures, character disagreements, corrections, exact prompts and artifacts remain.

`revision-2-records.json` retains full raw judgments and independent reviews, source/input/image hashes, fixed environment and available model/budget controls. `revision-2-artifacts/manifest.json` protects 264 small immutable source/prompt/sidecar files. Large PNGs remain local under `/workspace/diagram-evidence/pilot-runs/`; no Git LFS. Exact requested model is gpt-6.1-sol/medium; deployed snapshot, seed, token ceilings and token counts are unavailable. Preparation/dispatch-to-completion time includes orchestration and is not inference-only.

Explicit system Chromium151.0.7922.173 / Playwright1.59.1 and recorded Noto font hash remain unchanged. Native images retain prescribed slot geometry within larger placement frames. Font-ready does not establish glyph/semantic correctness. Coordinator was unblinded; independent reviewers saw opaque runs/references/briefs, no condition resources or coordinator scores. Dark variants are outside the light paired count and remain separately gated.

## Findings and next decision

Both evaluators score paper B2 (p109) and pencil C2 (p112) character 2. Pencil C2 also drops one point from B2 in the coordinator pairing, an unresolved material flattening signal. The gate therefore fails independently of the remaining disagreements. Paper B1 (p103), pencil B1 (p104), and pencil C1 (p102) score 3 from the coordinator versus 2 from the independent reviewer; those differences remain unresolved and are not averaged into a passing score. Paper C1/C2 and pencil B2 score 3 from both. All four A batches score character 2 from both reviewers. Weak A controls do not excuse failed B/C transfer.

Paper B2 exposes mostly pale hollow arch fragments at the edges of a large label sheet. Paper C1/C2 retain filled contrasting cut pieces and overlapping planes more successfully. Pencil C1/C2 reduce the crossed field to zigzag ends when a finite aspect-preserved patch is placed behind a broad label plane. Pencil B1 has isolated regular X marks rather than a distributed woven field; B2 retains larger visible crossed regions. These are construction observations, not a numeric density threshold or a requirement to copy original example content.

Eight batches each needed one readability correction: p103, p104, p105, p106, p107, p108, p111 and p112. Corrections separate labels from connectors, decorative texture or icons, preserving all initial candidates and adding forty new candidate copies. Every final candidate has zero recorded factual errors, omissions, reversed relationships or lock violations and coordinator readability at least 3. Independent corrected-image judgments also pass readability. Readability judgments differ in places: for example the independent p105 initial reservation review was more favorable than the coordinator's overlap finding, and p106/p111 branch labels initially scored 4 independently despite coordinator 2. Both initial and corrected judgments remain in the records; the readability fixes do not retroactively change initial scores or restore character.

The extra scheme and kit context does not establish efficiency. B adds 5,471–5,616 resource bytes and C adds another 7,256–9,015; output-byte and correction changes vary in both directions. Token counts and enforceable output-token ceilings are unavailable. All twelve revision-2 initial authors completed without a recorded aborted or replacement authoring turn; an executor-disconnect notification arrived after initial completion, and successful shell/image reads confirmed availability. This does not erase revision-1 interruption limitations or turn orchestration elapsed time into inference time.

Next decision: retain this failed revision and attempt a separately frozen revision 3 that reserves complete visible construction regions beside readable labels. Paper should retain solid multi-part cut planes; pencil should tile distributed neighboring crossings without aspect-fit or label occlusion erasing the field. Preserve original A resource bytes, rubric, budgets, all prior results and the unchanged fine/soft packs. A fresh complete twelve-batch affected paired rerun is required. No preparation success, code check or exploratory subset unlocks P04/P09.
