# Control Tower MVP

Status: static handoff spec for product design and frontend implementation. Draft expert review, not legal opinion.

## Product intent

Turn the ISC navigator from a static process scheme into an operational review surface:

1. Show where the 23-step cycle is blocked, under-evidenced, or ready for review.
2. Tie each visible warning to a source-backed claim, responsible authority, deadline, and next action.
3. Keep the graph as drilldown, not the main screen. The main screen is heatmap + action queue.

## Primary users

- Ministry/executive reviewer: needs a fast picture of bottlenecks and readiness.
- Legal/analyst reviewer: needs source provenance, edition status, and claim confidence.
- Product/operator: needs action queue, validation gates, and exportable handoff.

## Screen contract

### 1. Overview

- KPI strip: steps covered, NPA mapped, source gaps, overdue deadlines, ready gates.
- Lifecycle heatmap: 23 steps grouped by lifecycle stage.
- Risk legend: blocked, needs source, needs current-edition check, ready for review, approved.
- Action queue: sorted by severity, deadline, and dependency count.

### 2. Step detail drawer

- Step summary: ID, title, lifecycle stage, owner, gate status.
- Evidence tab: related acts, article/source URL, source_status, confidence_score, review_state.
- Documents tab: required/produced document types and missing inputs.
- Risk tab: blockers, mitigation action, responsible owner, target date.
- Graph tab: local ego graph around the step only.

### 3. Legal evidence matrix

- Sparse table generated from `evidence_matrix.csv`.
- Filters: source_status, current_edition_verified, confidence band, review_state, authority.
- Export: CSV, JSON, and review packet PDF/HTML later.

### 4. Graph drilldown

- Highlighted path mode: Step -> Act -> Source -> Authority -> Risk/Deadline.
- Default hides unrelated edges to avoid the "all links at once" failure.
- Shows relation type, basis, confidence, and review_state on edge hover/click.

## Data contract

Minimum bundle:

- `graph_model.schema.json`
- `manifest.json`
- `evidence_matrix.csv`
- `view_config.json`
- `steps.csv`, `acts.csv`, `step_act_map.csv` or derived JSON bundle

Required fields for each action queue item:

- `action_id`
- `entity_id`
- `severity`
- `reason`
- `required_evidence`
- `owner`
- `due_date`
- `blocking_edges`
- `review_state`
- `next_action`

## Validation gates

| Gate | Required proof | Fail state |
|---|---|---|
| Source attached | source URL/title/status present | claim hidden from executive summary |
| Current edition checked | `current_edition_verified=true` | badge remains `edition pending` |
| Legal review | `review_state>=approved_l2` | no "current/latest" wording |
| Product review | action has owner and next step | action remains unassigned |
| Export review | browser screenshot + CSV parse | pack cannot be sent externally |

## Interaction rules

- Clicking a heatmap cell opens the step drawer.
- Clicking an action queue item focuses the exact step and claim.
- Clicking a graph edge opens provenance, not an animation-only tooltip.
- Search accepts step ID, act title, authority, document type, and source ID.
- Color is always duplicated with status text and pattern/icon.

## UI risks

- Dense graph can look authoritative while hiding missing sources.
- KPI values can imply legal validation if caveats are not attached.
- Sankey/day loss views can be misread as additive savings.
- Overuse of color harms accessibility and legal nuance.

## Acceptance checks

- Every visible red/amber state has a linked claim in `evidence_matrix.csv`.
- No executive claim uses "current/latest" unless `approved_l3` and `current_edition_verified=true`.
- Mobile layout has no horizontal overflow outside intentionally scrollable tables.
- Static prototype loads without console errors and exports the linked handoff files.
