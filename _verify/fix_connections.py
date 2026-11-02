"""Applique les connexions corrigées (format 'main' indexé) aux workflows dettes+TEST dans la DB n8n."""
import json
import os
import sqlite3

SRC = r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json"
DB = os.path.join(os.environ.get("TEMP", "."), "n8ndb", "database.sqlite")

with open(SRC, encoding="utf-8") as f:
    wf = json.load(f)
conns = json.dumps(wf["connections"], ensure_ascii=False)

con = sqlite3.connect(DB)
cur = con.cursor()
for wid in ("cIIOrjdhNGTPjwfJ", "TESTdebtWF0001"):
    cur.execute("UPDATE workflow_entity SET connections=? WHERE id=?", (conns, wid))
    print(wid, "updated rows:", cur.rowcount)
con.commit()
cur.execute("SELECT id, connections FROM workflow_entity WHERE id IN ('cIIOrjdhNGTPjwfJ','TESTdebtWF0001')")
for wid, c in cur.fetchall():
    parsed = json.loads(c)
    loop = parsed.get("Loop Appointments")
    print(wid, "-> Loop Appointments keys:", list(loop.keys()), "| branches:", len(loop["main"]))
con.close()
