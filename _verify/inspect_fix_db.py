"""Inspect consolidated n8n DB: credentials + 'return []' bug on both workflows."""
import json
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else r"c:\Users\Aziz\Desktop\med\_verify\n8n_fix.sqlite"
conn = sqlite3.connect(DB)
cur = conn.cursor()

print("Tables:", [r[0] for r in cur.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'workflow%'").fetchall()])

for wid, label, node_id in [
    ("TuKvVdtren4w6HHM", "RDV", "prepare-rdv"),
    ("cIIOrjdhNGTPjwfJ", "DEBT", "prepare-debt"),
]:
    cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (wid,))
    r = cur.fetchone()
    av = r[0] if r else None
    print(f"\n[{label}] {wid} activeVersionId: {av}")
    if not av:
        continue
    cur.execute(
        "SELECT versionId, nodes FROM workflow_history WHERE workflowId=?", (wid,))
    for vid, raw in cur.fetchall():
        if not raw:
            continue
        nodes = json.loads(raw)
        is_active = "ACTIVE" if vid == av else "hist "
        for n in nodes:
            params = n.get("parameters", {})
            js = params.get("jsCode", "")
            if js:
                buggy = "return [];" in js
                print(f"  v={vid[:8]} {is_active} js-node={n['name']} return[]-bug={buggy}")
            cr = n.get("credentials", {}).get("gmailOAuth2", {}).get("id", "")
            if cr:
                print(f"  v={vid[:8]} {is_active} node={n['name']} cred={cr}")
    # Also check draft nodes in workflow_entity
    cur.execute("SELECT nodes FROM workflow_entity WHERE id=?", (wid,))
    row = cur.fetchone()
    if row and row[0]:
        for n in json.loads(row[0]):
            cr = n.get("credentials", {}).get("gmailOAuth2", {}).get("id", "")
            if cr:
                print(f"  draft node={n['name']} cred={cr}")
            js = n.get("parameters", {}).get("jsCode", "")
            if js:
                print(f"  draft js-node={n['name']} return[]-bug={'return [];' in js}")

conn.close()
