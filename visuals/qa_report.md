# QA Report: SHMH / ISC Visual Pack v3

Generated: 2026-05-21

Status: deployed static handoff pack. GitHub Pages and Cloudflare proof was collected after publishing v3.

## Scope

This report covers the static ministry review pack under `/visuals/`:

- v2 gallery and 10 editable SVG concepts.
- v3 ministry decision route: `review_v3.html`.
- Handoff artifacts: graph schema, sample graph, evidence matrix, viewer spec, Control Tower MVP, executive outline, diagram-as-code.
- ZIP package integrity.

## Trust Surface

| Check | Status | Evidence |
|---|---|---|
| HTTP route | pass | `http://go.buildworth.org/visuals/review_v3.html` returned 200 after v3 commit. |
| HTTPS direct GitHub Pages | blocked | GitHub Pages certificate for `go.buildworth.org` did not exist; `https_enforced=true` failed with "The certificate does not exist yet". |
| Cloudflare DNS | improved | `go.buildworth.org` CNAME changed from DNS-only to proxied Cloudflare CNAME targeting `agisota.github.io`. |
| HTTPS through Cloudflare | pass | `https://go.buildworth.org/visuals/review_v3.html` and the ZIP returned 200 via Cloudflare. |

Note: local OS DNS cache may temporarily keep old GitHub AAAA/A records. Public resolvers should converge to Cloudflare proxied addresses.

## Static Validation Gates

| Gate | Status | Evidence |
|---|---|
| JSON parse | pass | `manifest.json`, `graph_model.schema.json`, `view_config.json`, `sample_graph.json`, `diagrams/diagram_manifest.json` parse cleanly. |
| Graph fixture | pass | `sample_graph.json` has 7 entities, 5 edges, and all edge endpoints resolve to entities. |
| Evidence CSV | pass | `evidence_matrix.csv` has 8 starter rows with required ID/status/confidence/disclaimer fields. |
| SVG parse | pass | 10 SVG files are XML-valid and include `viewBox`. |
| HTML parse | pass | `index.html` and `review_v3.html` expose expected v3 links and require no external JS. |
| ZIP integrity | pass | ZIP contains HTML, SVG, schema, sample graph, evidence matrix, visual grammar, specs, diagrams, and QA report. |
| Browser smoke | pass locally and live | Playwright checked `index.html` and `review_v3.html` at desktop/mobile widths locally and over `https://go.buildworth.org/visuals/`; live screenshots are stored under `~/.ai-agent-hub/evidence/playwright-smoke/shmh-schema-2026-05-21/visuals-v3/`. |

## Legal Wording Gates

- Keep `DRAFT / EXPERT REVIEW` visible.
- Keep `not legal opinion` visible in review route, QA report, diagrams, graph spec, and exports.
- Do not use "current/latest" as legal claim unless `approved_l3` and `current_edition_verified=true`.
- Keep Sankey/day claims as `scenario_parameter`, `expert_estimate`, or draft basis until overlap/dependency review is complete.

## Known Gaps

- `evidence_matrix.csv` is a starter ledger/template with 8 rows, not the complete 109-link matrix.
- Canonical IDs for all 23 steps, 53 NPAs, and 109 links still need to be loaded from the authoritative corpus before full legal evidence review.
- D2 and Mermaid renderers are not installed on this machine; diagram files are syntax-shaped handoff artifacts, but renderer proof is deferred unless `d2` and `mmdc` are installed.
- GitHub Pages native certificate is not available yet; Cloudflare proxy now provides the practical HTTPS path after DNS propagation.
