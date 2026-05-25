#!/usr/bin/env python3
"""Authoritative data validator for the ИСЦ Атлас model.

Loads stage1..5 + cross-stage-edges + npa-catalog (+ documents-catalog if present)
from a data directory and reports structural defects:

  - duplicate node ids (within / across stages)
  - dangling intra-stage and cross-stage edges
  - unknown node types
  - grid nodes missing row/col (would silently collapse to 0,0)
  - nodes without a label / stage
  - NPA: garbled resolution numbers (clause digits glued to act number)
  - NPA: duplicate acts (same law, multiple ids)

Usage:  python3 audit/scripts/validate.py [data_dir]   (default: data)
Exit code is non-zero if any ERROR-level issue is found.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

KNOWN_TYPES = {
    "process", "result", "auxiliary", "alternative",
    "condition", "document", "documentList", "group",
}
STAGE_FILES = [f"stage{i}.json" for i in range(1, 6)]


def load(data_dir: Path):
    stages = []
    for fn in STAGE_FILES:
        stages.append(json.loads((data_dir / fn).read_text(encoding="utf-8")))
    cross = json.loads((data_dir / "cross-stage-edges.json").read_text(encoding="utf-8"))
    npa = json.loads((data_dir / "npa-catalog.json").read_text(encoding="utf-8"))
    docs = None
    docs_path = data_dir / "documents-catalog.json"
    if docs_path.exists():
        docs = json.loads(docs_path.read_text(encoding="utf-8"))
    return stages, cross, npa, docs


def validate(data_dir: Path):
    stages, cross, npa, docs = load(data_dir)
    errors, warnings = [], []

    # --- nodes ---
    node_stage = {}        # id -> stage id
    seen = set()
    type_counts = Counter()
    per_stage_nodes = defaultdict(int)
    for s in stages:
        sid = s["id"]
        for n in s.get("nodes", []):
            nid = n["id"]
            per_stage_nodes[sid] += 1
            type_counts[n.get("type", "process")] += 1
            if nid in seen:
                errors.append(f"duplicate node id: {nid} (in {sid})")
            seen.add(nid)
            node_stage[nid] = sid
            t = n.get("type", "process")
            if t not in KNOWN_TYPES:
                errors.append(f"unknown node type '{t}' on {nid} ({sid})")
            if not n.get("label") and t not in ("documentList",):
                warnings.append(f"node without label: {nid} ({sid}, type={t})")
            # grid coordinate check: non-sidebar / non-labelCol nodes need a col
            is_sidebar = bool(n.get("sidebar"))
            is_labelcol = bool((n.get("data") or {}).get("labelCol"))
            if not is_sidebar and not is_labelcol:
                if n.get("col") is None:
                    warnings.append(f"grid node missing 'col' (would collapse to 0): {nid} ({sid})")
                if n.get("row") is None:
                    warnings.append(f"grid node missing 'row' (would collapse to 0): {nid} ({sid})")

    # --- intra-stage edges ---
    dangling = []
    edge_count = 0
    for s in stages:
        sid = s["id"]
        for e in s.get("edges", []):
            edge_count += 1
            for end in ("source", "target"):
                if e[end] not in seen:
                    dangling.append(f"intra {sid}: edge {e.get('id')} {end}={e[end]} (missing)")

    # --- cross-stage edges ---
    cross_dangling = []
    for e in cross:
        for end in ("source", "target"):
            if e[end] not in seen:
                cross_dangling.append(f"cross: edge {e.get('id')} {end}={e[end]} (missing)")

    for d in dangling:
        errors.append("dangling " + d)
    for d in cross_dangling:
        errors.append("dangling " + d)

    # --- NPA garbled numbers + duplicates ---
    npa_items = npa.get("npa", npa if isinstance(npa, list) else [])
    garbled, dup_groups = scan_npa(npa_items)

    # --- report ---
    print(f"# Validation report — {data_dir}")
    print(f"stages={len(stages)}  nodes={len(seen)}  intra_edges={edge_count}  "
          f"cross_edges={len(cross)}  npa={len(npa_items)}"
          + (f"  documents={len(docs.get('documents', docs) if docs else [])}" if docs else ""))
    print("nodes per stage: " + ", ".join(f"{k}={v}" for k, v in sorted(per_stage_nodes.items())))
    print("type counts:     " + ", ".join(f"{k}={v}" for k, v in sorted(type_counts.items())))
    print()
    print(f"ERRORS ({len(errors)}):")
    for e in errors:
        print("  - " + e)
    print(f"\nWARNINGS ({len(warnings)}):")
    for w in warnings:
        print("  - " + w)
    print(f"\nNPA garbled numbers ({len(garbled)}):")
    for g in garbled:
        print(f"  - {g['id']}: {g['short']!r}  ⇒ guess {g['guess']!r}")
    print(f"\nNPA duplicate acts ({len(dup_groups)} groups):")
    for canon, ids in dup_groups.items():
        print(f"  - {canon}: {ids}")

    return len(errors)


GARBLE_RE = re.compile(r"№\s*(\d{5,})")


def scan_npa(items):
    """Heuristic: a resolution (ПП/Приказ) number with 5+ digits is likely
    'NNNN' + clause 'KK' glued. Split as act=first 3-4 digits, clause=rest."""
    garbled = []
    for n in items:
        short = n.get("short_name", "") or ""
        m = GARBLE_RE.search(short)
        if not m:
            continue
        num = m.group(1)
        # Resolutions are typically 1-4 digits; 5+ is suspicious.
        if len(num) <= 4:
            continue
        act, clause = guess_split(num)
        guess = short.replace(num, f"{act} п.{clause}")
        garbled.append({"id": n.get("id"), "short": short, "guess": guess,
                        "act": act, "clause": clause})

    # duplicates: normalize short name
    by_norm = defaultdict(list)
    for n in items:
        norm = norm_act(n.get("short_name", "") or n.get("full_name", ""))
        if norm:
            by_norm[norm].append(n.get("id"))
    dup_groups = {k: v for k, v in by_norm.items() if len(v) > 1}
    return garbled, dup_groups


def guess_split(num: str):
    """Split a glued 'NNNNKK' into (act, clause). Prefer act length 3 or 4."""
    if len(num) == 5:
        return num[:3], num[3:].lstrip("0") or num[3:]
    if len(num) == 6:
        # could be 4+2 or 3+3 — prefer 4+2
        return num[:4], num[4:].lstrip("0") or num[4:]
    return num[:4], num[4:].lstrip("0") or num[4:]


def norm_act(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    mapping = {
        "вк рф": "Водный кодекс РФ", "водный кодекс рф": "Водный кодекс РФ",
        "водный кодекс российской федерации": "Водный кодекс РФ",
        "зк рф": "Земельный кодекс РФ", "зк р": "Земельный кодекс РФ",
        "земельный кодекс рф": "Земельный кодекс РФ",
        "грк рф": "Градостроительный кодекс РФ",
        "градостроительный кодекс рф": "Градостроительный кодекс РФ",
    }
    return mapping.get(s, "")


if __name__ == "__main__":
    d = Path(sys.argv[1] if len(sys.argv) > 1 else "data")
    sys.exit(1 if validate(d) else 0)
