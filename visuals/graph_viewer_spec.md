# Graph Viewer Spec

Status: implementation handoff for an interactive ISC graph viewer. Static first, then production graph UI.

## Goal

Build a viewer that makes the 23-step / 53-NPA / 109-edge navigator explorable without showing every node and edge at once.

## Inputs

- `graph_model.schema.json` as schema contract.
- `manifest.json` as concept/view registry.
- `evidence_matrix.csv` as legal/source confidence ledger.
- Derived `graph_bundle.json` containing `entities`, `edges`, `views`, and `sources`.

## Canonical layouts

| Layout | Use | Default density |
|---|---|---|
| Lifecycle path | Executive overview of step order | stage aggregate, step drilldown |
| Ego graph | Step detail and local dependencies | selected step + 1 hop |
| NPA lattice | Legal/source review | clustered by act_type and authority |
| Gate flow | Pilot workflow | gate sequence with blockers |
| OS stack | Architecture narrative | layered, not force-directed |

## Filters

- Entity kind: Step, Act, DocumentType, Authority, Trigger, Risk, Deadline, Source.
- Review state: draft, needs_review, approved_l1, approved_l2, approved_l3.
- Source status: candidate, internal_model, official_source_pending, official_source_verified.
- Confidence band: 0-0.39, 0.40-0.69, 0.70-1.0.
- Stage, authority, document type, risk severity, deadline state.

## Node card

Required fields:

- ID, kind, title, lifecycle stage or authority class.
- Incoming/outgoing edge counts.
- Related claims from `evidence_matrix.csv`.
- Source status and current-edition status.
- Owner and next action when present.
- Exportable citation/provenance block.

## Edge behavior

- Edge label shows relation type.
- Edge details show basis, confidence_score, review_state, source_id, and notes.
- Risk and deadline edges are visible only when their filters are active or the selected node uses them.
- Unreviewed candidate edges are dashed and never shown as solid legal facts.

## Export

- SVG/PNG for selected view.
- JSON for selected subgraph.
- CSV for evidence matrix slice.
- HTML review packet with caveat banner.

## QA checks

- No graph mode renders more than 60 visible edges by default.
- Every visible claim can be traced to a source row or is labeled `internal_model`.
- Keyboard focus can reach search, filters, node card, and export controls.
- Browser smoke checks: no console errors, no broken SVG/object previews, no mobile overflow.

## Three-sprint path

### Sprint 1: Static truth pack

- Finalize `graph_model.schema.json`, `view_config.json`, and `evidence_matrix.csv`.
- Generate sample `graph_bundle.json` from existing CSV/JSON sources.
- Ship static review page and ZIP with validation scripts.

### Sprint 2: Interactive viewer prototype

- Build React + AntV G6 or D3 prototype.
- Implement search, filters, ego graph, node card, and export of selected subgraph.
- Add visual QA screenshots for desktop/mobile.

### Sprint 3: Review workflow

- Add review_state transitions, action queue, and source-confidence workflow.
- Add controlled exports for ministry review.
- Add test fixtures for legal wording, evidence completeness, and density limits.
