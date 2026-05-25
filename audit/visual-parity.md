# Visual parity — findings & plan (grows through Phase 3)

> Limitation: no raster tools available, so pixel-exact parity to the `.ai` is not
> auto-verified. Findings below are from reading `visual-lab/*.jsx` + `styles.css`
> and the source legend/geometry.

## Already good (keep)

- Route palette matches the original: внебюджет navy `#172b55`/`#1b2e58`,
  бюджет green `#2b7832`, ОКН gray `#6b7280`/`#b39127` gold accents.
- `edgePath()` (`layout.jsx:178`) already does side-based anchors (left/right/top/
  bottom) + orthogonal routing — needs tuning, not a rewrite.
- Hover/selection highlight + dim model exists in `canvas.jsx`.
- Three reading modes (executive / analyst / auditor) + critical mode.

## To fix (Phase 3)

| Area | Issue | Plan |
|---|---|---|
| Node types | `condition`/`document`/`documentList`/`group`/`labelCol` lack distinct styling; some are filtered out entirely | strict encoding: fill=route, border/badge=type, chip=duration/code, glow=state, dashed=conditional |
| Edges | parallel edges overlap; arrowheads can land mid-box; no edge labels/tooltip | per-side anchor offsets; arrowhead on box edge; edge tooltip src→tgt/type/stage |
| Sidebar | stage-1 preparatory blocks dropped | render as left vertical band |
| Inspector | no related documents / NPA / original reference | wire `documents-catalog` + cleaned `npa-catalog`; add source ref line |
| Search | matches label/id/process/description only | add fullLabel, abbreviations (ГПЗУ/РВ/РС/ЗОС/ТУ/ПЗЗ/ДПТ/ОКН/ЕГРН), doc & NPA names, stage names |
| Contrast (WCAG 2.2 AA) | gold `#c2922a` 2.82:1, faint inks ~3:1, default edge gray 2.6:1, amber 3.19:1 fail | retune tokens to ≥4.5:1 (text) / ≥3:1 (UI) |
| A11y | no `focus-visible` on nodes, no `prefers-reduced-motion`, no `@media print`, no node `aria-label`, no keyboard select | add all; node `role`+`aria-label`+`tabindex`; Enter/Space to select |
| Typography | long RU labels clip; abbreviations truncated | 2–4 line wrap; nbsp in durations; — dash |

## Verification approach

`cd visual-lab && npm run build && npm run preview`; browser check via `/run` or
`/verify`. If headless Chromium is unavailable, verify the rendered DOM via a node
script and capture before/after into `audit/`.
