# Frozen public pilot protocol — revision 1

Freeze date: 2026-10-07, before any P03 output. P00 supplies inputs and this protocol; no experiment result or rollout approval is asserted here. All five briefs are original invented Japanese scenarios. No private deck/manual/screenshots or external image assets were consulted or redistributed. The JSON palette is bounded to six semantic roles in both themes; fonts are named but not bundled. Record the actual installed font environment.

## Controlled experiment

Evaluate four tones: fine-outline, soft-fill, paper-layers and pencil-notebook. Three conditions: A recipe + original light/dark example + required local meaning; B same inputs plus scheme; C same inputs plus scheme and kit. C measures incremental kit value before P04 by directly authoring inline, self-contained SVG; it must not introduce a competing production helper. The common palette/brief/placement/factual checklists are identical in all conditions.

Use **two paired repetitions**, five diagrams per tone per condition per repetition: 24 independent tone-batch generation runs, 120 initial light SVG outputs. One author owns each tone's five-diagram batch in a run; every candidate directory has one writer. Coordinator alone writes sessions/rounds/comparison mappings. Fresh agent context per run, no previous condition artwork, feedback, scores or private conversation. Use direct authorized development-agent generation, with no separately purchased model service, API credentials or paid-service integration. A run can execute in an isolated agent turn; this document does not authorize extra agents where the active workflow prohibits them.

Before starting, record the exact available model identifier/version (or explicitly unknown), reasoning setting, available generation controls, package commit, input SHA-256 values, browser/OS/fonts, prompt and budget. Use the same available model/settings for all runs; if the platform changes them, mark the affected pair incomparable and rerun the pair under one recorded setting. Do not invent a model seed or token count when the interface does not expose it. Texture seed is fixed in each scheme; generation stochasticity is separate.

Run order is fixed to reduce order bias: repetition 1 uses A→B→C for fine-outline/paper-layers and C→B→A for soft-fill/pencil-notebook; repetition 2 reverses each order. Within each run, use the five inputs in `inputs.json` order. Budget per batch: one initial authoring turn, 8,000 output-token ceiling where configurable; then at most two correction turns of 2,000 output tokens each. If output-token ceilings are unavailable, enforce one initial turn and two correction turns, record generated output bytes and elapsed time as measured proxies, and label token cost unavailable. Each correction uses the same rubric-based factual/readability findings; no extra unrecorded editing. A truncation/failure consumes its attempt; retain it and report missing outputs. A smaller exploratory dry run cannot replace this repeated gate.

The shared prompt is: “Read these five briefs, placements and palette. Author one self-contained light SVG per brief in the specified tone. Preserve exact labels, facts and locked relationships. Use the declared fonts; maintain readability at target CSS size. Condition resources are attached below. Do not infer approval or add facts. Save outputs and explain deliberate departures.” Attach A/B/C resources as defined above. Save exact prompts/resource lists and output hashes. Dark palette is fixed for later thematic checks; dark variants are generated after scoring the light pilot, and are reported separately rather than inflating paired sample count.

## Measurement and scoring

Run structural validation and P05 placement capture for every available candidate. An evaluator must actually open each image at CSS target size and inspect it, recording image path/hash, timestamp and criterion notes. Capture success and a fonts-ready event are not inspection or approval. Use opaque run IDs for evaluator views where practical; record when blinding is impossible. An independent second visual pass is required for paper-layers and pencil-notebook character/texture judgments before recommendation. Do not substitute pixel equality for quality.

| Measure | Frozen rubric | Recorded unit |
| --- | --- | --- |
| Facts | Check every required assertion and exact label. Count invented facts, reversed relationships and omissions separately. | counts + checklist item IDs |
| Readability | 0 unusable; 1 multiple unreadable/cut/overlapping labels; 2 one material defect; 3 all labels readable at target; 4 all readable with clear hierarchy and distinction. | 0–4 per diagram + notes |
| Within-tone consistency | Compare all five diagrams: 0 contradictory style; 1 frequent unexplained changes; 2 occasional changes; 3 coherent with justified layout variation; 4 coherent and distinct across aspect ratios. | 0–4 per batch |
| Tone character | Compare original examples: 0 lost; 1 generic/recolored substitute; 2 recognizable but a defining property lost; 3 defining geometry/type/texture retained; 4 retained with useful expressive variation. | 0–4 per batch + named defining traits |
| Corrections | Count turns until facts and readability satisfy gates; uncompleted after two turns stays failed. | 0–2 turns + exhausted flag |
| Context cost | Input/output tokens if measured; otherwise prompt UTF-8 bytes, attached resource bytes, output bytes, elapsed seconds and explicit unavailable token fields. | measured totals; no guesses |

Record initial and final scores separately; preserve failed and corrected outputs under new IDs/earlier-round lineage after review. Summarize B−A and C−B within each tone/repetition, including counts, medians and full ranges; report all per-run values. Two repetitions are a small sample: no statistical significance or general improvement claim. More context or corrections can be an honest negative result. Same evaluator should score pairs; second-pass disagreement remains visible.

## Decision rules fixed before outputs

A final accepted candidate has zero factual errors/omissions/lock violations and readability >=3. Every B/C tone batch needs consistency >=3 and character >=3 in both repetitions; a drop of >=1 character point from paired A is a material flattening signal requiring investigation and reevaluation. A weak A cannot excuse unreadable B/C. Failed/unavailable capture or actual inspection means unverified. Resource/structural success alone cannot pass the visual gate.

Recommend proceed only with complete paired records, all final fact/readability gates satisfied, no unresolved material flattening, and measured B−A/C−B evidence explaining useful and ineffective constraints. Fewer corrections is a hypothesis: no reduction can be reported honestly if visual/consistency value is demonstrated; absent value or adverse results require revise/narrow or an inconclusive recommendation. Do not unlock P09 with an inconclusive/failed gate. Scheme revisions after scoring require a new versioned protocol amendment and reruns of affected pairs, retaining original results.

## Reproducible evidence and later trial

Use `run-record.template.json` for run metadata, append one record per candidate and record evaluator notes plus paired summary in the P03 report. Store prompts, SVGs, captures and sidecars with relative paths and hashes; oversized generated artifacts stay local/ignored (no Git LFS). Commit compact records and truthful evidence locations. Unknown/missing measurements are null with a reason, never zero/pass. Fixture decisions use purpose test and do not represent user approval.

The P11 full workflow reuses these five briefs: three initial candidates per session, then eight named-tone sets (fine-outline, soft-fill, ui-miniature, swiss-grid, contour-wash, paper-layers, pencil-notebook, isometric-solid), explicit exact mappings, capture/inspection, test lock, review transfer, saved-baseline refinement and exact/offline exports. That broader workflow is distinct from this 120-output paired pilot. Deterministic CI validates authored data/resource contracts; stochastic authoring is recorded dogfood, never an always-on network/model dependency.
