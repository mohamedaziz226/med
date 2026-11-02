"""Quick verify: check the RDV workflow's active version in a SQLite DB."""
import json
import sqlite3
import sys

DB_PATH = sys.argv[1] if len(sys.argv) > 1 else "/fix/database.sqlite"
WID = "TuKvVdtren4w6HHM"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (WID,))
row = cur.fetchone()
if not row:
    print("Workflow not found!")
    sys.exit(1)
active_vid = row[0]
print(f"Active versionId: {active_vid}")

cur.execute(
    "SELECT nodes FROM workflow_history WHERE workflowId=? AND versionId=?",
    (WID, active_vid),
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
            print("  STATUS: ✅ FIXED")
        else:
            print("  STATUS: ❌ BUGGY")
        break
else:
    print("  Node 'prepare-rdv' not found in active version!")

# Also check entity
cur.execute("SELECT nodes FROM workflow_entity WHERE id=?", (WID,))
row = cur.fetchone()
entities = json.loads(row[0]) if row and row[0] else []
for n in entities:
    if n.get("id") == "prepare-rdv":
        js = n["parameters"]["jsCode"]
        has_bug = "return [];" in js
        print(f"\n  workflow_entity return []; present: {has_bug}")
        break

# Count all versions and check each
cur.execute(
    "SELECT versionId, nodes FROM workflow_history WHERE workflowId=?", (WID,)
)
buggy_versions = []
total = 0
for vid, nodes_raw in cur.fetchall():
    total += 1
    nodes = json.loads(nodes_raw) if nodes_raw else []
    for n in nodes:
        if n.get("id") == "prepare-rdv" and "jsCode" in n.get("parameters", {}):
            if "return [];" in n["parameters"]["jsCode"]:
                buggy_versions.append(vid[:8])
            break

print(f"\n  Total versions: {total}")
print(f"  Buggy versions: {buggy_versions if buggy_versions else 'NONE ✅'}")
conn.close()