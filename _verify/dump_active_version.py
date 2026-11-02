"""Compare workflow_entity.nodes vs active version (workflow_history) for the RDV workflow."""
import json
import sqlite3

conn = sqlite3.connect("c:\\Users\\Aziz\\Desktop\\med\\_verify\\n8n_container.sqlite")
cur = conn.cursor()

WID = "TuKvVdtren4w6HHM"

# Active version id
cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (WID,))
active_version = cur.fetchone()[0]
print("activeVersionId:", active_version)

# entity nodes ids
cur.execute("SELECT nodes FROM workflow_entity WHERE id=?", (WID,))
entity_nodes = json.loads(cur.fetchone()[0])
print("\nentity node ids:", [n.get("id") for n in entity_nodes])

# history (active version) nodes
cur.execute(
    "SELECT versionId, nodes, name, autosaved FROM workflow_history WHERE workflowId=?",
    (WID,),
)
rows = cur.fetchall()
print("\nhistory rows for", WID, len(rows))
for vid, nodes_raw, name, autosaved in rows:
    try:
        nodes = json.loads(nodes_raw) if nodes_raw else []
    except Exception as exc:
        print("  parse error for", vid, exc)
        continue
    print(f"  versionId={vid} autosaved={autosaved} nodes={[n.get('id') for n in nodes]}")
    if vid == active_version:
        # Show the reminder code block of active version
        for n in nodes:
            if n.get("id") == "prepare-rdv":
                js = n["parameters"]["jsCode"]
                print("\n  >>> ACTIVE VERSION 'Prepare Reminders' jsCode:")
                print(js)
conn.close()