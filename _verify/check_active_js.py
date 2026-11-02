"""Check active versions of both RDV and DEBT workflows for 'return []' bug."""
import json
import sqlite3

DB = r"c:\Users\Aziz\Desktop\med\_verify\n8n_container.sqlite"
conn = sqlite3.connect(DB)
cur = conn.cursor()

for label, wid, target_node_id in [
    ("RDV", "TuKvVdtren4w6HHM", "prepare-rdv"),
    ("DEBT", "cIIOrjdhNGTPjwfJ", "Calculate Debt"),
]:
    cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (wid,))
    row = cur.fetchone()
    if not row or not row[0]:
        print(f"\n[{label}] workflow not found or no active version")
        continue
    active_vid = row[0]
    cur.execute(
        "SELECT versionId, nodes FROM workflow_history WHERE workflowId=? ORDER BY createdAt DESC LIMIT 5",
        (wid,),
    )
    rows = cur.fetchall()
    for vid, nodes_raw in rows:
        nodes = json.loads(nodes_raw) if nodes_raw else []
        is_active = vid == active_vid
        for n in nodes:
            # Match by id or by name
            nid = n.get("id", "")
            nname = n.get("name", "")
            if target_node_id in (nid, nname):
                if "jsCode" in n.get("parameters", {}):
                    js = n["parameters"]["jsCode"]
                    has_return_empty = "return [];" in js
                    print(f"\n[{label}] versionId={vid} ACTIVE={is_active} node={nname}")
                    print(f"  has 'return [];' : {has_return_empty}")
                    print(f"  first 300 chars: {js[:300]}...")
                    break
        else:
            continue
        break

conn.close()