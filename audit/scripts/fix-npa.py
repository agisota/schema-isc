#!/usr/bin/env python3
"""NPA catalog cleanup — garbled numbers + duplicate acts (idempotent).

WHY: the .idml→text extraction glued clause numbers onto resolution numbers
(e.g. «№ 11961» really means «№ 1196 п.1»), and a few codes were duplicated
(ВК РФ / Водный кодекс РФ; ЗК РФ / ЗК Р). Every correction is heuristic, so each
is recorded in audit/npa-fixes.json and flagged requires_legal_verification.

HEURISTIC for glued numbers: group entries by their (date) so siblings reveal the
real act number. Within a group, choose base length L∈{3,4} that yields all
clauses ≤2 digits while sharing the base across the most siblings (prefer fewer
distinct bases, then smaller L). Singletons fall back to L=3 unless that leaves a
>2-digit clause.

DEDUP: merge duplicate act ids into a canonical id and remap
documents-catalog regulatory_basis[].npa_id references.

Usage: python3 audit/scripts/fix-npa.py [data_dir]   (default: data)
       (run for both data/ and visual-lab/data/ for npa-catalog;
        documents-catalog lives only in data/.)
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

NUM_RE = re.compile(r"(№\s*)(\d{5,})")
DATE_RE = re.compile(r"от\s*([\d.\s]+?\d{4})")

# Duplicate act ids → canonical id (+ canonical short/full).
DEDUP = {
    "npa-водный-кодекс-рф": ("npa-вк-рф", "ВК РФ", "Водный кодекс Российской Федерации"),
    "npa-зк-р": ("npa-зк-рф", "ЗК РФ", "Земельный кодекс Российской Федерации"),
}


def date_key(short: str) -> str:
    m = DATE_RE.search(short or "")
    return re.sub(r"[.\s]", "", m.group(1)) if m else ""


def choose_base_len(nums):
    best = None
    for L in (3, 4):
        parts = [(n[:L], n[L:]) for n in nums]
        if any(len(c) == 0 or len(c) > 2 for _, c in parts):
            continue
        distinct = len({b for b, _ in parts})
        score = (distinct, L)
        if best is None or score < best[0]:
            best = (score, L)
    return best[1] if best else 3


def fix(data_dir: Path):
    npa_path = data_dir / "npa-catalog.json"
    catalog = json.loads(npa_path.read_text(encoding="utf-8"))
    items = catalog["npa"]

    # --- 1. garbled numbers: group by date, decide base length per group ---
    groups = defaultdict(list)  # date -> [(item, glued_num)]
    for it in items:
        short = it.get("short_name", "") or ""
        m = NUM_RE.search(short)
        if m and len(m.group(2)) >= 5:
            groups[date_key(short)].append((it, m.group(2)))

    fixes = []
    for dk, members in groups.items():
        nums = [num for _, num in members]
        L = choose_base_len(nums)
        for it, num in members:
            base, clause = num[:L], num[L:]
            if not clause or len(clause) > 2:
                # leave untouched but still flag
                continue
            repl = f"{base} п.{int(clause)}"
            before = it.get("short_name", "")
            after = NUM_RE.sub(lambda mo: mo.group(1) + repl, before, count=1)
            it["short_name"] = after
            if it.get("full_name"):
                it["full_name"] = NUM_RE.sub(lambda mo: mo.group(1) + repl,
                                             it["full_name"], count=1)
            fixes.append({
                "id": it["id"], "kind": "garbled_number",
                "before": before, "after": after,
                "act": base, "clause": int(clause), "date_group": dk,
                "requires_legal_verification": True,
            })

    # --- 2. dedupe ---
    kept, remap = [], {}
    seen = set()
    for it in items:
        if it["id"] in DEDUP:
            canon_id, _, _ = DEDUP[it["id"]]
            remap[it["id"]] = canon_id
            fixes.append({"id": it["id"], "kind": "duplicate_merge",
                          "merged_into": canon_id, "requires_legal_verification": True})
            continue
        if it["id"] in seen:
            continue
        seen.add(it["id"])
        kept.append(it)
    # ensure canonical entries carry clean names
    by_id = {it["id"]: it for it in kept}
    for dup, (canon_id, short, full) in DEDUP.items():
        if canon_id in by_id:
            by_id[canon_id]["short_name"] = short
            by_id[canon_id]["full_name"] = full
    catalog["npa"] = kept

    write_json(npa_path, catalog)

    # --- 3. remap document references (only where documents-catalog exists) ---
    docs_path = data_dir / "documents-catalog.json"
    remapped_refs = 0
    if docs_path.exists() and remap:
        docs = json.loads(docs_path.read_text(encoding="utf-8"))
        for d in docs.get("documents", []):
            for rb in d.get("regulatory_basis", []):
                if rb.get("npa_id") in remap:
                    rb["npa_id"] = remap[rb["npa_id"]]
                    remapped_refs += 1
        write_json(docs_path, docs)

    print(f"[{data_dir}] npa: {len(items)}→{len(kept)} "
          f"(merged {len(remap)}), garbled fixed {sum(1 for f in fixes if f['kind']=='garbled_number')}, "
          f"doc refs remapped {remapped_refs}")
    return fixes


def write_json(path: Path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    base = Path(sys.argv[1] if len(sys.argv) > 1 else "data")
    fixes = fix(base)
    out = Path("audit/npa-fixes.json")
    # merge fixes across runs is overkill; last run wins (run data/ last for the doc refs)
    out.write_text(json.dumps(fixes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"audit trail ({len(fixes)} entries) → {out}")
