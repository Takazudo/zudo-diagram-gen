# P03 original paired pilot — revision 1 results

Decision: **revise; rollout gate failed**. All 24 batches produced 120 initial light SVGs. All were captured through P05 at DPR 1 and actually opened by the same coordinator at their supplied placement size. All final candidates have zero observed factual omissions, inventions, reversed relationships or lock violations and readability at least 3. Paper/pencil character remains below the frozen threshold; structural success does not override it.

There were 9 correction turns, each preserving five initial SVGs and new candidate lineage. Corrections targeted measured label/connector collisions or contrast; none tuned character after scoring. Every correction completed in one turn. Initial and final image hashes and scores remain distinct.

## Per-run results

Readability columns are minimum across each batch of five; consistency and character are coordinator batch scores on the frozen 0–4 rubric. Resource bytes include the exact supplied snapshots, including original rendered PNG examples. SVG bytes are initial authored source only; token measurements are unavailable.

| Run | Tone | Condition | Rep | Initial readability | Final readability | Consistency | Character | Correction turns | Initial SVG bytes | Resource bytes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| p001 | fine-outline | A | 1 | 3 | 3 | 4 | 3 | 0 | 17531 | 66324 |
| p002 | soft-fill | C | 1 | 2 | 3 | 4 | 4 | 1 | 17121 | 80756 |
| p003 | paper-layers | A | 1 | 4 | 4 | 4 | 3 | 0 | 19700 | 131409 |
| p004 | pencil-notebook | C | 1 | 4 | 4 | 4 | 2 | 0 | 63004 | 133629 |
| p005 | fine-outline | B | 1 | 4 | 4 | 4 | 3 | 0 | 18553 | 70246 |
| p006 | soft-fill | B | 1 | 4 | 4 | 4 | 4 | 0 | 17896 | 76716 |
| p007 | paper-layers | B | 1 | 2 | 3 | 3 | 2 | 1 | 21869 | 135474 |
| p008 | pencil-notebook | B | 1 | 4 | 4 | 4 | 2 | 0 | 45364 | 126944 |
| p009 | fine-outline | C | 1 | 3 | 3 | 4 | 4 | 0 | 14050 | 73946 |
| p010 | soft-fill | A | 1 | 2 | 4 | 4 | 3 | 1 | 14326 | 72821 |
| p011 | paper-layers | C | 1 | 2 | 4 | 4 | 2 | 1 | 19313 | 139887 |
| p012 | pencil-notebook | A | 1 | 3 | 3 | 4 | 2 | 0 | 27192 | 122800 |
| p013 | fine-outline | C | 2 | 2 | 4 | 4 | 3 | 1 | 15275 | 73946 |
| p014 | soft-fill | A | 2 | 2 | 4 | 4 | 3 | 1 | 13017 | 72821 |
| p015 | paper-layers | C | 2 | 4 | 4 | 4 | 2 | 0 | 19701 | 139887 |
| p016 | pencil-notebook | A | 2 | 4 | 4 | 4 | 2 | 0 | 19691 | 122800 |
| p017 | fine-outline | B | 2 | 2 | 4 | 4 | 3 | 1 | 14167 | 70246 |
| p018 | soft-fill | B | 2 | 2 | 4 | 4 | 4 | 1 | 16684 | 76716 |
| p019 | paper-layers | B | 2 | 4 | 4 | 4 | 2 | 0 | 17116 | 135474 |
| p020 | pencil-notebook | B | 2 | 4 | 4 | 4 | 2 | 0 | 32244 | 126944 |
| p021 | fine-outline | A | 2 | 4 | 4 | 4 | 3 | 0 | 15703 | 66324 |
| p022 | soft-fill | C | 2 | 2 | 4 | 4 | 4 | 1 | 16288 | 80756 |
| p023 | paper-layers | A | 2 | 3 | 3 | 4 | 2 | 0 | 19515 | 131409 |
| p024 | pencil-notebook | C | 2 | 3 | 3 | 4 | 2 | 0 | 48149 | 133629 |

## Paired changes

Deltas are B−A and C−B within the same tone and repetition. Readability delta compares batch minimum, character and consistency compare batch scores, corrections compare turns, and bytes compare initial output/context resources. Positive correction cost is worse; no statistical significance is claimed.

| Tone | Rep | Pair | Initial readability Δ | Final readability Δ | Character Δ | Consistency Δ | Corrections Δ | Initial SVG bytes Δ | Resource bytes Δ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fine-outline | 1 | B−A | 1 | 1 | 0 | 0 | 0 | 1022 | 3922 |
| fine-outline | 1 | C−B | -1 | -1 | 1 | 0 | 0 | -4503 | 3700 |
| fine-outline | 2 | B−A | -2 | 0 | 0 | 0 | 1 | -1536 | 3922 |
| fine-outline | 2 | C−B | 0 | 0 | 0 | 0 | 0 | 1108 | 3700 |
| soft-fill | 1 | B−A | 2 | 0 | 1 | 0 | -1 | 3570 | 3895 |
| soft-fill | 1 | C−B | -2 | -1 | 0 | 0 | 1 | -775 | 4040 |
| soft-fill | 2 | B−A | 0 | 0 | 1 | 0 | 0 | 3667 | 3895 |
| soft-fill | 2 | C−B | 0 | 0 | 0 | 0 | 0 | -396 | 4040 |
| paper-layers | 1 | B−A | -2 | -1 | -1 | -1 | 1 | 2169 | 4065 |
| paper-layers | 1 | C−B | 0 | 1 | 0 | 1 | 0 | -2556 | 4413 |
| paper-layers | 2 | B−A | 1 | 1 | 0 | 0 | 0 | -2399 | 4065 |
| paper-layers | 2 | C−B | 0 | 0 | 0 | 0 | 0 | 2585 | 4413 |
| pencil-notebook | 1 | B−A | 1 | 1 | 0 | 0 | 0 | 18172 | 4144 |
| pencil-notebook | 1 | C−B | 0 | 0 | 0 | 0 | 0 | 17640 | 6685 |
| pencil-notebook | 2 | B−A | 0 | 0 | 0 | 0 | 0 | 12553 | 4144 |
| pencil-notebook | 2 | C−B | -1 | -1 | 0 | 0 | 0 | 15905 | 6685 |

Across all eight paired observations per contrast (four tones × two repetitions), medians [full ranges] are:

- B−A: initial minimum readability: 0.5 [-2, 2]; final minimum readability: 0 [-1, 1]; character: 0 [-1, 1]; consistency: 0 [-1, 0]; correction turns: 0 [-1, 1]; initial SVG bytes: 2869.5 [-2399, 18172]; resource bytes: 3993.5 [3895, 4144].
- C−B: initial minimum readability: 0 [-2, 0]; final minimum readability: 0 [-1, 1]; character: 0 [0, 1]; consistency: 0 [0, 1]; correction turns: 0 [0, 1]; initial SVG bytes: 356 [-4503, 17640]; resource bytes: 4226.5 [3700, 6685].

## Findings and evaluator differences

Fine-outline B/C batches retain thin open geometry, arrows and quiet whitespace; the kit adds useful recognizable icons in the first repetition. Soft-fill B/C adds coherent native filled icons and thicker curved forms; it does not eliminate layout corrections. Neither resource structure mechanically prevents an author from placing text over a connector.

Paper B/C repeatedly reduces layered collage to separate skewed cards with shadows and top strips. Pencil often retains notebook ruling and uneven outlines while reducing crossed texture to tiny ticks or miniature icon hatching. These are character failures under the frozen rubric. The weak recipe-only batches mean the experiment does not isolate scheme/kit causation; the new constraints did not reliably repair a transfer weakness.

Independent paper/pencil reviews actually opened all 60 initial images plus p011 corrected images and original references. Exact review JSON is included without rewriting disagreements. Coordinator/second character disagreements: p003 3/2, p012 2/3, p019 2/3, p020 2/3 and p024 2/3. Other reviewed batches agree at 2. They are not averaged into a passing score. p007 second consistency is 3; the coordinator also records 3.

The proposed next step is a versioned paper/pencil construction revision, preserving original examples and palette/font requirements, then all A/B/C conditions in both repetitions for both tones (12 fresh batches, 60 initial outputs). Original A inputs remain unchanged; transfer guidance belongs to revised B/C resources. No cherry-picked subset or retrospective rescoring can replace the rerun.

## Reproduction and limits

The source is `8525083ee53c2d3377f5203c4b36d00cda00c575`; original A resources are from `647fb95f965caed7f72bbbc83ce6cb408672d784`. Frozen P05 engine bytes, preparation/capture scripts, prompts, all SVGs, image sidecars and full raw records remain in `/workspace/diagram-evidence/`. Run directories are `pilot-runs/p001` through `p024`; each has `inputs/`, `prompt.txt`, `outputs/`, `sessions/`, `captures/v0/` and any `captures/v1/`. `revision-1-records.json` preserves resource and artifact hashes, exact evaluator notes, independent reviews and metadata. `revision-1-artifacts/` preserves all initial/corrected SVG bytes, exact file prompts, author notes and capture sidecars (387 files, about 1.1 MB), with a SHA-256 manifest. Large generated PNG images remain local/ignored; no Git LFS. Local PNG paths are session evidence rather than permanent public downloads; their saved SVGs and sidecars support rerendering in the recorded environment.

Requested model was `gpt-6.1-sol` with medium reasoning for every fresh context. Exact deployed snapshot, generation seed, token usage and configurable token ceilings are not exposed. One initial and at most two correction turns were enforced; byte/time proxies are not token counts. Shared author prompt and run-specific instructions are saved as prompt.txt; earlier external dispatch text is not uniformly preserved as a separate file, so the complete transport envelope is not claimed reproducible.

An environment replacement interrupted agents: p007 outputs were recovered complete but its completion timing is outage-contaminated; p008 had zero output files and its interrupted dispatch is retained before a fresh-context replacement. This is a protocol deviation, not a successful initial attempt. The affected pencil family will be rerun in full. Late/missing dispatch timestamps for some runs are excluded from timing comparisons; other elapsed values include orchestration, not inference-only cost. No latency improvement is claimed.

All captures use explicit system Chromium 151.0.7922.173 with Playwright 1.59.1 because the local pinned browser download was unavailable. Noto Sans CJK JP Regular file SHA256 is recorded and was unchanged across replacement. Browser/font-ready checks alone are not glyph or semantic validation. The coordinator inspected actual native raster frames, whose slot sizes equal the briefs; independent reviewers used the same images, with font identity/scale uncertainty stated. Coordinator knows conditions; second reviewers receive opaque IDs and original references but no condition resources or coordinator scores.

Dark variants are outside the light paired count and remain a separate later validation. The small repeated sample supports a scoped revise decision, not general efficacy or fewer-corrections claims. P03 and the all-24 rollout remain blocked until a supported passing recommendation and required packaging checks.
