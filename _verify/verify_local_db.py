"""Verify the local patched DB file has the fix."""
import json
import sqlite3
import os
import sys

db_path = sys.argv[1] if len(sys.argv) > 1 else r"c:\Users\Aziz\Desktop\med\_verify\n8n_live.sqlite"
print(f"File: {db_path}")
print(f"Size: {os.path.getsize(db_path)} bytes")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", ("TuKvVdtren4w6HHM",))
av = cur.fetchone()
if not av or not av[0]:
    print("Workflow not found!")
    sys.exit(1)
print(f"Active versionId: {av[0]}")

cur.execute(
    "SELECT nodes FROM workflow_history WHERE workflowId=? AND versionId=?",
    ("TuKvVdtren4w6HHM", av[0]),
)
row = cur.fetchone()
nodes = json.loads(row[0]) if row and row[0] else []
for n in nodes:
    if n.get("id") == "prepare-rdv":
        js = n["parameters"]["jsCode"]
        has_bug = "return [];" in js
        has_fallback = "reminder_type: null" in js
        print(f"  return []; present: {has_bug}")
        print(f"  fallback item present: {has_fallback}")
        if not has_bug and has_fallback:
            print("  STATUS: OK - FIXED")
        else:
            print("  STATUS: BUGGY")
        break

# Check workflow_entity
cur.execute("SELECT nodes FROM workflow_entity WHERE id=?", ("TuKvVdtren4w6HHM",))
row = cur.fetchone()
if row and row[0]:
    ent_nodes = json.loads(row[0])
    for n in ent_nodes:
        if n.get("id") == "prepare-rdv" and "jsCode" in n.get("parameters", {}):
            js = n["parameters"]["jsCode"]
            print(f"\n  workflow_entity return []; present: {'return [];' in js}")
            break

conn.close()