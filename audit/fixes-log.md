# Fixes log

Chronological record of changes, id remaps, and unresolved items.
Target app: `visual-lab/` (the React atlas at `/visual-lab/`). The repo-root
Next.js export (`/index.html`, `/_next/`, `/cockpit`, `/new`) is a compiled
artifact with no source here and is left untouched.

## Increment 1 — data correctness (content parity)

**Scripts (committed, re-runnable):**
- `audit/scripts/validate.py` — authoritative structural validator (dangling
  edges, unknown types, missing coords, NPA garble/dupes). Baseline captured in
  `audit/validate-before.txt`.
- `audit/scripts/repartition.py` — idempotent stage 4/5 re-partition + cross-edge
  repair. Id remap → `audit/repartition-remap.json` (41 ids).

**Data changed** (both `data/` and `visual-lab/data/`, kept in sync):
- `stage4.json`, `stage5.json` — re-partition (see below).
- `cross-stage-edges.json` — 6 dangling endpoints repaired.

**Stage 4/5 re-partition** — `WHY`: stage5 shipped containing only engineering-
network utilities while the cadastral chain sat at the tail of stage4; the
original scheme (verified in `isc-integrated-v3.json`) places cadastral
учёт/регистрация/ЕГРН/начало эксплуатации in Этап 5 and networks in the
construction phase (Этап 4).
- Moved cadastral block stage4→stage5, re-prefixed `s4-*`→`s5-*`, process code
  `4.1`→`5.1`: techplan, kadastr, register, created, exploit.
- Restored `s5-vypiska` ("Выписка из ЕГРН") — present in source, was absent.
- Moved 36 network nodes + 24 edges stage5→stage4 section `nets`, re-prefixed
  `s5-*`→`s4-net-*`, process `5.1`→`4.nets`.
- Stage 4 sections now: `proc`(4) · `build`(7) · `nets`(36). Stage 5: `cadastre`(6).
- Dropped stale stage-4 build edges `s4-b8..s4-b12` (touched moved nodes);
  added stage-5 chain edges `s5-c1..s5-c5`.

**Cross-stage edge repairs:** `cross-1-2a`→`s2-zouit-approve`,
`cross-2-3a`/`cross-2-3b`→`s3-ii-program` (and source→`s2-ird-constraints`),
`cross-3-4b`→`s4-procure-plan`, `cross-4-5a`→`s5-techplan`.

**Result:** `validate.py` → 0 errors, 0 warnings, 0 dangling edges (was 6).

**Audit docs:** `original-map.md`, `content-parity.md`, `visual-parity.md` created.

## Increment 2 — NPA catalog cleanup

**Script:** `audit/scripts/fix-npa.py` (idempotent, date-aware). Audit trail →
`audit/npa-fixes.json` (29 entries, each `requires_legal_verification: true`).

- **27 garbled numbers** fixed by grouping entries by date so siblings reveal the
  real act number, then choosing base length 3/4 that keeps all clauses ≤2 digits
  with maximal base sharing. Examples: `№ 11961`→`№ 1196 п.1`,
  `№ 12213`→`№ 1221 п.3`, same-date `211520/212725/213020`→`2115/2127/2130`.
- **2 duplicate acts merged:** `npa-водный-кодекс-рф`→`npa-вк-рф`,
  `npa-зк-р`→`npa-зк-рф`; 3 `documents-catalog` `npa_id` refs remapped.
- `npa-catalog.json` 153→151 entries (both `data/` and `visual-lab/data/`);
  `documents-catalog.json` refs updated (root only).
- `validate.py` → 0 garbled, 0 duplicate-act groups, 0 errors.

> Caveat: number splits are heuristic. A real multi-digit act could be
> mis-split — every change is flagged for legal verification against pravo.gov.ru.

## Increment 3 — Vite build migration

Replaced the Babel-standalone + CDN-React runtime with a real Vite + React build.

- `visual-lab/` is now a Vite app: `package.json`, `package-lock.json`,
  `vite.config.js` (`base: '/visual-lab/'`), `index.html` (module entry → `src/app.jsx`).
- The 6 `*.jsx` files moved to `visual-lab/src/` and converted from the shared-`window`
  global pattern to ESM `import`/`export` (graph: `app → {layout,data-loader,canvas,
  views,panels}`, `canvas → layout`, `panels → data-loader`). `styles.css` imported
  from `app.jsx`; `html-to-image` + `react-dom/client` now npm imports.
- Data moved to `visual-lab/public/data/` (served at `/visual-lab/data/`); old
  `visual-lab/data/` removed. `documents-catalog.json` + `layout-overrides.json` now
  shipped to the app bundle for later wiring.
- `results.html` → `visual-lab/public/results.html`.
- `npm run build` passes (45 modules, 218 kB JS / 32 kB CSS gzipped 69/6 kB).
- **Runtime verification** without a browser: browser CDN is blocked here so
  Playwright/headless-Chrome is unavailable; added `audit-smoke.mjs` (jsdom) +
  `npm run test:smoke`. Smoke = PASS: app mounts, renders «Этап 1» tabs, renders the
  corrected stage-5 cadastral content (Кадастров/Регистрация прав/Выписка), 0 console
  errors.
- Deploy (`.github/workflows/deploy-pages.yml`): build visual-lab, then assemble the
  Pages artifact — whole repo served statically with the built atlas overlaid at
  `/visual-lab/`. Runs on push to `main` only.

> Limitation: no real-browser visual check possible in this environment (browser
> download CDN blocked). jsdom smoke covers mount + content, not pixel layout.

## Increment 4 — render previously-hidden node types

The type filter only knew `process/result/auxiliary/alternative`, so the 10
`condition`/`document`/`documentList` nodes were filtered out and never drawn.

- `NODE_TYPE_LABELS` (data-loader) + default `visibleTypes` (app.jsx) + the type
  filter UI (panels.jsx) now include `condition`/`document`/`documentList`/`group`.
- `styles.css`: `condition` renders as a navy header band (the utility headers
  ЭЛЕКТРОСНАБЖЕНИЕ/ТЕПЛО/…); `document` as a dashed paper card; `documentList` as a
  stacked-sheets card. `NodeBox` shows a computed label for empty `documentList`.
- Smoke test extended: `conditionNodesVisible` + `documentNodesVisible` → PASS.

## Pending (next increments)

- Render stage-1 `sidebar` blocks (`s1-grad`/`cat`/`gp`/`pzz`/`dpt`) — needs careful
  layout (collision risk with the existing `main` grid + labelCols); deferred to a
  visually-verified pass (`layout.jsx:101`).
- Wire `documents-catalog.json` + `layout-overrides.json` into the loader; enrich the
  inspector with related documents + cleaned NPA + original-reference.
- Phase 3 visual polish: edge anchor/routing tuning, contrast→WCAG 2.2 AA, keyboard
  a11y (`focus-visible`/`prefers-reduced-motion`/`@media print`/node `aria-label`),
  expanded search; ValidationPanel surfacing.
- Render hidden types (`condition`/`document`/`documentList`/`sidebar`).
- Vite build migration; visual/edge/a11y/contrast work (Phase 3); ValidationPanel.

## Unresolved / needs author confirmation

- Cross-edge topology for the originally-dangling `s2-zouit-label`/`s2-ird-label`
  (repointed to nearest real section entry).
- NPA number splits are heuristic — every change will be flagged for legal review.
