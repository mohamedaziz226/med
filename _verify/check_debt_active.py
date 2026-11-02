"""Check active version of DEBT workflow for 'return []' bug."""
import json
import sqlite3

DB = r"c:\Users\Aziz\Desktop\med\_verify\n8n_container.sqlite"
conn = sqlite3.connect(DB)
cur = conn.cursor()

WID = "cIIOrjdhNGTPjwfJ"
cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (WID,))
row = cur.fetchone()
av = row[0] if row else None
print("DEBT activeVersionId:", av)

cur.execute(
    "SELECT versionId, nodes FROM workflow_history WHERE workflowId=? ORDER BY createdAt DESC",
    (WID,),
)
for vid, nodes_raw in cur.fetchall():
    nodes = json.loads(nodes_raw) if nodes_raw else []
    is_active = vid == av
    for n in nodes:
        if "jsCode" in n.get("parameters", {}):
            js = n["parameters"]["jsCode"]
            nm = n["name"]
            print(f"\nversionId={vid} ACTIVE={is_active} node={nm}")
            print("  has 'return [];' : ", "return [];" in js)

conn.close()