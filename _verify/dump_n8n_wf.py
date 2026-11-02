"""Dump a full n8n workflow from the container sqlite copy to a JSON file."""
import json
import sqlite3
import sys

db_path = "c:\\Users\\Aziz\\Desktop\\med\\_verify\\n8n_container.sqlite"
conn = sqlite3.connect(db_path)
cur = conn.cursor()
wid = sys.argv[1]
out_path = sys.argv[2]
cur.execute(
    "SELECT id, name, nodes, connections, settings, pinData, staticData, meta, active "
    "FROM workflow_entity WHERE id = ?",
    (wid,),
)
row = cur.fetchone()
if not row:
    print("Workflow not found:", wid)
    sys.exit(1)
workflow = {
    "id": row[0],
    "name": row[1],
    "nodes": json.loads(row[2]),
    "connections": json.loads(row[3]),
    "settings": json.loads(row[4]),
    "pinData": json.loads(row[5]) if row[5] else {},
    "staticData": json.loads(row[6]) if row[6] else {},
    "meta": json.loads(row[7]) if row[7] else {},
    "active": bool(row[8]),
}
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(workflow, f, ensure_ascii=False, indent=2)
print(f"Wrote {out_path}")
conn.close()