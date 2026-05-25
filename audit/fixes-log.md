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

## Pending (next increments)

- NPA cleanup: 27 garbled numbers + 2 duplicate-act groups (ВК РФ, ЗК РФ) —
  date-aware `fix-npa.py` + `npa-fixes.json` with `requires_legal_verification`.
- Wire `documents-catalog.json` + `layout-overrides.json` into the loader.
- Render hidden types (`condition`/`document`/`documentList`/`sidebar`).
- Vite build migration; visual/edge/a11y/contrast work (Phase 3); ValidationPanel.

## Unresolved / needs author confirmation

- Cross-edge topology for the originally-dangling `s2-zouit-label`/`s2-ird-label`
  (repointed to nearest real section entry).
- NPA number splits are heuristic — every change will be flagged for legal review.
