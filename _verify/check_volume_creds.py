"""Check the actual database in the running n8n volume."""
import json
import sqlite3
import sys

DB_PATH = sys.argv[1] if len(sys.argv) > 1 else "/fix/database.sqlite"
WID_RDV = "TuKvVdtren4w6HHM"
WID_DEBT = "cIIOrjdhNGTPjwfJ"
OLD_CRED = "CaiZmZzshoECZ5OO"
NEW_CRED = "zDNxc43cvYUrbJe9"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

for label, wid in [("RDV", WID_RDV), ("DEBT", WID_DEBT)]:
    print(f"\n=== {label} workflow (id={wid}) ===")

    # Check workflow_entity
    cur.execute("SELECT nodes FROM workflow_entity WHERE id=?", (wid,))
    row = cur.fetchone()
    if row and row[0]:
        nodes = json.loads(row[0])
        for n in nodes:
            creds = n.get("credentials", {})
            if "gmailOAuth2" in creds:
                cid = creds["gmailOAuth2"].get("id", "")
                print(f"  entity Send node cred ID: {cid} {'✅' if cid == NEW_CRED else '❌'}")
                break

    # Check active version
    cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (wid,))
    av_row = cur.fetchone()
    if av_row and av_row[0]:
        av = av_row[0]
        cur.execute(
            "SELECT nodes FROM workflow_history WHERE workflowId=? AND versionId=?",
            (wid, av),
        )
        row = cur.fetchone()
        if row and row[0]:
            nodes = json.loads(row[0])
            for n in nodes:
                creds = n.get("credentials", {})
                if "gmailOAuth2" in creds:
                    cid = creds["gmailOAuth2"].get("id", "")
                    print(f"  active history Send node cred ID: {cid} {'✅' if cid == NEW_CRED else '❌'}")
                    break

# Check credentials_entity table
print("\n=== credentials_entity ===")
cur.execute("SELECT id, name, type FROM credentials_entity")
for r in cur.fetchall():
    print(f"  id={r[0]} name={r[1]} type={r[2]}")

# Check if old cred ID exists anywhere
cur.execute("SELECT id FROM credentials_entity WHERE id=?", (OLD_CRED,))
row = cur.fetchone()
print(f"\n  Old cred '{OLD_CRED}' exists: {bool(row)}")

cur.execute("SELECT id FROM credentials_entity WHERE id=?", (NEW_CRED,))
row = cur.fetchone()
print(f"  New cred '{NEW_CRED}' exists: {bool(row)}")

conn.close()