# Agentic swarm plan for SHMH / ISC visual system

Status: execution blueprint, not a running mode transcript. Keep max 6 concurrent child agents under local AGENTS.md.

## Target
Turn the concept pack into a graph-ready visual analytics system without letting any single diagram become unreadable or legally overclaim.

## Six-lane swarm

| Lane | Agent role | Input | Output | Acceptance |
|---|---|---|---|---|
| 1. Graph contract | architect | CSV/JSON corpus, current graph data | `graph_model.schema.json`, relation vocabulary | validates sample bundle; every edge has basis/confidence/review_state |
| 2. Legal evidence | analyst/legal reviewer | 53 NPA x 23 steps, sources | `evidence_matrix.csv` | every claim has source/status/confidence/review_state |
| 3. Dashboard product | designer/product | Control Tower concept | `control_tower_mvp.md` | screen contract, data contract, action queue, validation gates |
| 4. Diagram-as-code | executor | 02/06/07 concepts | `isc_graph.d2`, `isc_graph.mmd` | renders to SVG without syntax errors |
| 5. Executive deck | writer | 01/03/07/10 concepts | `executive_deck_outline.md` | 8 slides, one claim per slide, caveated language |
| 6. Verification | verifier | generated artifacts | evidence pack | live URL, ZIP, SVG parse, browser smoke, no console errors |

## Integration rule
Do not let lanes invent incompatible semantics. `graph_model.schema.json` owns entity kinds, edge types, confidence, review_state, and source status.

## Fast execution order
1. Lock `graph_model.schema.json` with 10-20 sample nodes/edges.
2. Build sparse evidence ledger; derive heatmap from ledger, not from a dense spreadsheet.
3. Convert Knowledge Graph Hub + Gate-first BPMN + OS Stack to D2/Mermaid.
4. Build Control Tower MVP around heatmap + action queue; graph is drilldown, not main screen.
5. Assemble executive deck from Lifecycle -> Evidence -> Gates -> Control Tower -> Decision.
6. Run visual/browser/legal wording QA before external handoff.

## Non-negotiables
- No current/latest legal wording unless `approved_l3` + `current_edition_verified`.
- No additive day-saving claims without overlap/dependency review.
- One view = one management question.
- Color must be duplicated by text/pattern/status.
- Dense graph views show highlighted paths and aggregates, not every edge at once.
