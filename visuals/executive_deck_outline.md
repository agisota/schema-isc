# Executive Deck Outline: ISC-2030 OS

Status: 8-slide narrative outline. Draft expert review, not legal opinion.

| # | Slide | Core claim | Visual | Data required | Risk/caveat |
|---|---|---|---|---|---|
| 1 | Why this matters | ISC needs one shared operating map across lifecycle, law, evidence, and execution. | Lifecycle Atlas | 23-step lifecycle, stage grouping | Do not imply every step is legally complete. |
| 2 | The cycle is a system, not a picture | The 23 steps should be treated as a data-backed process graph. | Lifecycle Atlas + step appendix | steps, step order, stage labels | Stage abstraction may hide exceptions. |
| 3 | The legal layer is the backbone | 53 NPAs and 109 step-act links define the review surface. | Knowledge Graph Hub | acts, step_act_map, authority metadata | NPA linkage is not a legal opinion. |
| 4 | Evidence confidence is the real readiness signal | The key question is not "is there a box" but "is the claim source-backed and current-edition checked". | Evidence Heatmap Matrix | evidence_matrix.csv, source_status, review_state | Confidence means evidence completeness only. |
| 5 | Bottlenecks need basis separation | Delay/loss analysis must separate statutory terms, observed delays, and scenario estimates. | Sankey Loss Ledger | duration_basis, deadlines, observed deltas | Avoid additive day-saving claims without dependency review. |
| 6 | Gates turn diagrams into governance | Readiness gates make each transition auditable: evidence, owner, deadline, blocker. | Gate-first BPMN | gate status, documents, owner, deadline | BPMN notation should not obscure source requirements. |
| 7 | Control Tower is the product face | The operational MVP is heatmap + action queue + evidence drawer, with graph as drilldown. | Control Tower View | action queue, risk, owner, evidence links | Do not imply live production monitoring before pilot validation. |
| 8 | Decision request | Choose the first operating mode: executive deck, legal evidence pass, or Control Tower pilot. | OS Metamodel Stack + Visual Product System | graph schema, view config, review plan | Scope decision must preserve legal review gates. |

## Speaker notes

- Use one claim per slide; keep appendix for dense evidence.
- Keep "DRAFT / EXPERT REVIEW / NOT LEGAL OPINION" in footer.
- Put confidence caveat on all evidence and NPA slides.
- Never say "latest/current law" unless source review has reached approved_l3.

## Acceptance checks

- 8 slides exactly.
- Each slide has one headline claim and one primary visual.
- Slides 3-6 include legal/source caveats.
- Slide 8 ends with a decision, not a generic roadmap.
