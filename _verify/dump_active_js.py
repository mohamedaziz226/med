"""Dump the JS code of the active version of a workflow node."""
import json
import sqlite3
import sys

DB = r"c:\Users\Aziz\Desktop\med\_verify\n8n_fix.sqlite"
WID = sys.argv[1] if len(sys.argv) > 1 else "TuKvVdtren4w6HHM"
NODE = sys.argv[2] if len(sys.argv) > 2 else "Prepare Reminders"

conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (WID,))
av = cur.fetchone()[0]
cur.execute("SELECT nodes FROM workflow_history WHERE workflowId=? AND versionId=?", (WID, av))
raw = cur.fetchone()[0]
for n in json.loads(raw):
    if n.get("name") == NODE:
        print(n.get("parameters", {}).get("jsCode", "(no jsCode)"))
conn.close()
