#!/usr/bin/env python3
"""Stage 4/5 re-partition + cross-stage edge repair (idempotent).

WHY: stage5.json shipped containing only engineering-network utilities, while
the cadastral chain (Технический план → Кадастровый учёт → Регистрация прав →
Объект создан) was misplaced at the tail of stage4.json. The original scheme
(verified in isc-integrated-v3.json) puts cadastral учёт / регистрация прав /
Выписка из ЕГРН / Начало эксплуатации in stage 5, and the networks belong to the
construction phase (stage 4, interaction with РСО).

This script:
  1. Moves the cadastral block stage4 → stage5 (re-prefix s4-* → s5-*),
     restores "Выписка из ЕГРН", and makes "Начало эксплуатации" the terminus.
  2. Moves the engineering networks stage5 → stage4 as a new "nets" section
     (re-prefix s5-* → s4-net-*).
  3. Repoints the 6 dangling cross-stage edges to real node ids.

Idempotent: if stage5 already has a "cadastre" section it does nothing.
Emits an id-remap audit trail to audit/repartition-remap.json.

Usage: python3 audit/scripts/repartition.py [data_dir]   (default: data)
"""
import json
import sys
from pathlib import Path

# Cadastral nodes to move stage4 -> stage5, with new id, row, col, and field tweaks.
# Order defines the stage-5 chain.
CADASTRE_PLAN = [
    # old_id,        new_id,        row, col
    ("s4-techplan",  "s5-techplan",  0, 0),
    ("s4-kadastr",   "s5-kadastr",   0, 1),
    ("s4-register",  "s5-register",  0, 2),
    # s5-vypiska is inserted here (new node, no stage-4 origin)
    ("s4-created",   "s5-created",   1, 0),
    ("s4-exploit",   "s5-exploit",   2, 0),
]
CADASTRE_OLD_IDS = {p[0] for p in CADASTRE_PLAN}

# stage-4 build edges to drop (they touched the moved cadastral nodes)
DROP_BUILD_EDGES = {"s4-b8", "s4-b9", "s4-b10", "s4-b11", "s4-b12"}

CROSS_FIXES = {
    # edge id: (field, old, new)
    "cross-1-2a": [("target", "s2-zouit-label", "s2-zouit-approve")],
    "cross-2-3a": [("target", "s3-input", "s3-ii-program")],
    "cross-2-3b": [("source", "s2-ird-label", "s2-ird-constraints"),
                   ("target", "s3-input", "s3-ii-program")],
    "cross-3-4b": [("target", "s4-procure", "s4-procure-plan")],
    "cross-4-5a": [("target", "s5-created", "s5-techplan")],
}


def reprefix(s, old, new):
    return new + s[len(old):] if s.startswith(old) else s


def repartition(data_dir: Path):
    s4 = json.loads((data_dir / "stage4.json").read_text(encoding="utf-8"))
    s5 = json.loads((data_dir / "stage5.json").read_text(encoding="utf-8"))

    if any(sec.get("id") == "cadastre" for sec in s5.get("sections", [])):
        print(f"[{data_dir}] already re-partitioned — skipping")
        return None

    remap = {}

    # ---- 1. extract cadastral nodes from stage4 ----
    s4_nodes_by_id = {n["id"]: n for n in s4["nodes"]}
    cadastre_nodes = []
    for old_id, new_id, row, col in CADASTRE_PLAN:
        n = dict(s4_nodes_by_id[old_id])
        remap[old_id] = new_id
        n["id"] = new_id
        n["section"] = "cadastre"
        n["process"] = "5.1"          # was "4.1" — align with new stage
        n["row"] = row
        n["col"] = col
        n.pop("colSpan", None)
        cadastre_nodes.append(n)

    # ---- 2. networks: move stage5 utilities into stage4 as section "nets" ----
    net_nodes = []
    for n in s5["nodes"]:
        nn = dict(n)
        new_id = reprefix(n["id"], "s5-", "s4-net-")
        remap[n["id"]] = new_id
        nn["id"] = new_id
        nn["section"] = "nets"
        nn["process"] = "4.nets"      # was "5.1" — align with new stage
        net_nodes.append(nn)
    net_edges = []
    for e in s5["edges"]:
        ne = dict(e)
        ne["id"] = reprefix(e["id"], "s5-", "s4-net-")
        ne["source"] = reprefix(e["source"], "s5-", "s4-net-")
        ne["target"] = reprefix(e["target"], "s5-", "s4-net-")
        net_edges.append(ne)

    # ---- 3. rebuild stage4 ----
    kept_s4_nodes = [n for n in s4["nodes"] if n["id"] not in CADASTRE_OLD_IDS]
    s4["sections"] = [
        {"id": "proc", "label": "Включение закупки на СМР"},
        {"id": "build", "label": "Строительство и ввод в эксплуатацию"},
        {"id": "nets", "label": "Инженерные сети и подключение к РСО",
         "color": "rgba(27,46,88,0.04)"},
    ]
    s4["nodes"] = kept_s4_nodes + net_nodes
    s4["edges"] = [e for e in s4["edges"] if e["id"] not in DROP_BUILD_EDGES] + net_edges

    # ---- 4. rebuild stage5 (cadastre) ----
    vypiska = {
        "id": "s5-vypiska", "type": "result", "label": "Выписка из ЕГРН",
        "process": "5.1", "track": "offbudget",
        "data": {"description": "Выписка из ЕГРН, подтверждающая регистрацию права"},
        "layers": {"coverage": "full"}, "section": "cadastre", "row": 0, "col": 3,
    }
    # insert vypiska after s5-register in chain order
    chain = []
    for n in cadastre_nodes:
        chain.append(n)
        if n["id"] == "s5-register":
            chain.append(vypiska)

    s5["name"] = "Государственный кадастровый учёт, регистрация прав, начало эксплуатации"
    s5["sections"] = [
        {"id": "cadastre",
         "label": "Кадастровый учёт, регистрация прав, начало эксплуатации"},
    ]
    s5["nodes"] = chain
    s5["edges"] = [
        {"id": "s5-c1", "source": "s5-techplan", "target": "s5-kadastr", "type": "default"},
        {"id": "s5-c2", "source": "s5-kadastr", "target": "s5-register", "type": "default"},
        {"id": "s5-c3", "source": "s5-register", "target": "s5-vypiska", "type": "default"},
        {"id": "s5-c4", "source": "s5-vypiska", "target": "s5-created", "type": "default",
         "sourceHandle": "source-bottom", "targetHandle": "target-top"},
        {"id": "s5-c5", "source": "s5-created", "target": "s5-exploit", "type": "default",
         "sourceHandle": "source-bottom", "targetHandle": "target-top"},
    ]

    # ---- 5. cross-stage edges ----
    cross_path = data_dir / "cross-stage-edges.json"
    cross = json.loads(cross_path.read_text(encoding="utf-8"))
    for e in cross:
        for eid, fixes in CROSS_FIXES.items():
            if e.get("id") == eid:
                for field, old, new in fixes:
                    if e.get(field) == old:
                        e[field] = new

    # ---- write ----
    write_json(data_dir / "stage4.json", s4)
    write_json(data_dir / "stage5.json", s5)
    write_json(cross_path, cross)
    print(f"[{data_dir}] re-partitioned: stage4 nodes={len(s4['nodes'])} "
          f"edges={len(s4['edges'])}; stage5 nodes={len(s5['nodes'])} "
          f"edges={len(s5['edges'])}; cross fixed")
    return remap


def write_json(path: Path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    base = Path(sys.argv[1] if len(sys.argv) > 1 else "data")
    remap = repartition(base)
    if remap is not None:
        out = Path("audit/repartition-remap.json")
        out.write_text(json.dumps(remap, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"id remap ({len(remap)} ids) → {out}")
