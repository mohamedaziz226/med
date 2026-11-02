"""Patch the RDV workflow in an n8n sqlite DB: Prepare Reminders must always
return an item (fallback with reminder_type=null) so the splitInBatches loop
continues over ALL appointments (like the debt workflow already does).
"""
import json
import sqlite3
import sys

db_path = sys.argv[1]

conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT nodes FROM workflow_entity WHERE id='TuKvVdtren4w6HHM'")
row = cur.fetchone()
if not row:
    print("workflow not found")
    sys.exit(1)

nodes = json.loads(row[0])
changed = False
for node in nodes:
    if node.get("id") == "prepare-rdv":
        js = node["parameters"]["jsCode"]
        old_none = "if (!(st === 'confirmed' || st === 'pending')) return [];"
        new_none = (
            "if (!(st === 'confirmed' || st === 'pending')) {\n"
            "  return [{ json: { patient_id: apt.patient_id, appointment_id: apt.id, reminder_type: null, notification_type: null } }];\n"
            "}"
        )
        old_empty = "if (!reminder_type) return [];"
        new_empty = (
            "if (!reminder_type) {\n"
            "  return [{ json: { patient_id: apt.patient_id, appointment_id: apt.id, reminder_type: null, notification_type: null } }];\n"
            "}"
        )
        if old_none in js:
            js = js.replace(old_none, new_none)
            changed = True
        if old_empty in js:
            js = js.replace(old_empty, new_empty)
            changed = True
        if old_none not in js and old_empty not in js:
            print("  WARNING: pattern(s) not found! Dumping current code:")
            print(js)
        node["parameters"]["jsCode"] = js

if changed:
    cur.execute(
        "UPDATE workflow_entity SET nodes=? WHERE id='TuKvVdtren4w6HHM'",
        (json.dumps(nodes, ensure_ascii=False),),
    )
    conn.commit()
    print("Patched!")
else:
    print("No change applied")

# Verify
cur.execute("SELECT name, active FROM workflow_entity WHERE id='TuKvVdtren4w6HHM'")
print("Workflow:", cur.fetchone())
conn.close()