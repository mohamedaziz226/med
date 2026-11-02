"""Dump le code JS du nœud 'prepare-rdv' (et prepare-debt) dans la version active du conteneur n8n."""
import json
import sqlite3

DB = r"c:\Users\Aziz\Desktop\med\_verify\n8n_container.sqlite"
conn = sqlite3.connect(DB)
cur = conn.cursor()

for wid_name, wid, node_id, label in [
    ("RDV", "TuKvVdtren4w6HHM", "prepare-rdv", "Prepare Reminders"),
    ("DEBT", "cIIOrjdhNGTPjwfJ", "prepare-debt", "Calculate Debt"),
]:
    cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (wid,))
    row = cur.fetchone()
    if not row:
        print(f"{label}: workflow not found")
        continue
    active_vid = row[0]
    print(f"\n=== {label} workflow {wid} ===")
    print(f"activeVersionId: {active_vid}")

    cur.execute(
        "SELECT versionId, nodes FROM workflow_history WHERE workflowId=? ORDER BY createdAt DESC LIMIT 5",
        (wid,),
    )
    rows = cur.fetchall()
    for vid, nodes_raw in rows:
        nodes = json.loads(nodes_raw) if nodes_raw else []
        is_active = vid == active_vid
        for n in nodes:
            if n.get("id") == node_id:
                print(f"\n--- versionId={vid} | ACTIVE={is_active} | node={node_id} ---")
                if "jsCode" in n.get("parameters", {}):
                    print(n["parameters"]["jsCode"])
                else:
                    print(json.dumps(n.get("parameters", {}), indent=2, ensure_ascii=False))
                break
    conn.close()