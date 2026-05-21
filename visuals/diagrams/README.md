# Diagram-as-code handoff

Status: v3 static handoff. D2 is the implementation source; Mermaid mirrors are for Markdown/GitHub review.

## Files

- `02-knowledge-graph-hub.d2` / `.mmd` — typed graph projection.
- `06-gate-first-bpmn.d2` / `.mmd` — gate workflow and blocker loop.
- `07-os-metamodel-stack.d2` / `.mmd` — OS/data/evidence/governance stack.

## Rules

- Use canonical relation names from `../graph_model.schema.json`.
- Include `DRAFT / EXPERT REVIEW` and `not legal opinion` caveat.
- Keep dense graph views filtered; no default "show all 109 links" view.
- Do not use display labels as stable IDs.

## Validation

Renderer tools are optional for this static pack. If available:

```bash
d2 --check diagrams/02-knowledge-graph-hub.d2
mmdc -i diagrams/02-knowledge-graph-hub.mmd -o /tmp/02.svg
```
