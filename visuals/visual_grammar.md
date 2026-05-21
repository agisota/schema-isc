# SHMH / ISC visual grammar v2

## Purpose
Make every new node, edge, heatmap cell, dashboard card, and executive slide use the same semantics.

## Entity tokens
- Step: navy rounded rectangle, stage/order prefix, duration basis visible.
- Act: blue outline, act type/edition status visible.
- DocumentType: cyan surface, required/produced label.
- Authority: green surface, owner/administers/issued_by edge labels.
- Risk: red surface, severity plus blocker state.
- Deadline: amber surface, due rule plus basis.
- Source: gray/black source chip, official/current/candidate/gap status.

## Edge semantics
- Solid navy: lifecycle dependency.
- Solid blue: legal/regulatory requirement.
- Dashed amber: deadline/risk pressure.
- Dotted gray: provenance or candidate mapping.
- Red hatch/mark: blocked, collision, superseded, or unsafe external wording.

## Status vocabulary
- approved_l3: externally usable after legal/QA approval.
- official_anchor: source exists but claim is not legal sufficiency.
- needs_edition_confirmation: source/text/current edition unresolved.
- candidate: internal only.
- blocked: collision, supersession, missing legal basis, or unsafe wording.
- gap: no source or no claim.

## Density rules
- Executive: <= 7 chunks per viewport, no full 109-edge graph.
- Legal: show status/confidence/source before aesthetics.
- Product: heatmap + action queue first, graph second.
- Engineering: schema, relation vocabulary, renderable diagram-as-code.
- Pilot: gates, owner, evidence requirement, blocker, next action.
