# Content parity — original scheme → JSON model → render

Status legend: **OK** · **wrong-stage** · **missing** · **dangling** · **hidden**
(present in data but not rendered) · **fixed** (resolved in this pass).

## Headline defects (Этап 4 / Этап 5)

| Original block | Original stage | Was in JSON | Status → | Fix |
|---|---|---|---|---|
| Технический план | 5 | stage4 `s4-techplan` | wrong-stage → **fixed** | → stage5 `s5-techplan` |
| Кадастровый учёт | 5 | stage4 `s4-kadastr` | wrong-stage → **fixed** | → stage5 `s5-kadastr` |
| Регистрация прав | 5 | stage4 `s4-register` | wrong-stage → **fixed** | → stage5 `s5-register` |
| Выписка из ЕГРН | 5 | — | missing → **fixed** | new `s5-vypiska` (restored from source) |
| Объект создан | 5 | stage4 `s4-created` | wrong-stage → **fixed** | → stage5 `s5-created` |
| Начало эксплуатации | 5 | stage4 `s4-exploit` | wrong-stage → **fixed** | → stage5 `s5-exploit` |
| Инженерные сети (электро/тепло/вода/газ/водоотв./связь): ТУ, договор с РСО, временное подключение, акт о подключении, перенос/вынос | 4 (construction) | stage5 (all 36 nodes) | wrong-stage → **fixed** | → stage4 section `nets` (`s4-net-*`) |

Result: Этап 5 = 6 cadastral nodes; Этап 4 = `proc`(4) + `build`(7) + `nets`(36).

## Dangling cross-stage edges (all repaired)

| Edge | Was | Status → | Now |
|---|---|---|---|
| `cross-1-2a` | target `s2-zouit-label` (missing) | dangling → **fixed** | `s2-zouit-approve` |
| `cross-2-3a` | target `s3-input` (missing) | dangling → **fixed** | `s3-ii-program` |
| `cross-2-3b` | source `s2-ird-label`, target `s3-input` (both missing) | dangling → **fixed** | `s2-ird-constraints` → `s3-ii-program` |
| `cross-3-4b` | target `s4-procure` (missing) | dangling → **fixed** | `s4-procure-plan` |
| `cross-4-5a` | target `s5-created` (missing) | dangling → **fixed** | `s4-rv` → `s5-techplan` (commissioning → cadastre entry) |

## Hidden-but-present (Phase 1c / Phase 3 — rendering)

| Item | Where | Status | Planned fix |
|---|---|---|---|
| `condition` nodes (6 net headers) | stage4 `nets` | hidden (type not in `visibleTypes`) | render `condition` as section-header band |
| `document` nodes (3) | stage3 | hidden | render `document` type |
| `documentList` node (1) | stage3 `s3-budget-docs-list` | hidden | render expandable doc list |
| `sidebar` blocks `s1-grad/cat/gp/pzz/dpt` | stage1 | hidden (`layout.jsx:101` drops sidebarChips) | render as left vertical band |
| Footnotes `*`/`**` | original | missing | add to stage data + inspector |
| Standalone "СРОК" badges | original | missing | `durationBadge` element kind |

## Open content judgment calls (for author sanity-check)

- **"Начало эксплуатации" vs "ввод в эксплуатацию"** — resolved by following the
  source: ввод/РВ closes Этап 4; начало эксплуатации is the Этап-5 terminus.
- **Cross-edge topology** — `s2-zouit-label`/`s2-ird-label` never existed; repointed
  to the nearest real section-entry node. Confirm intended source/target with the
  scheme author.
