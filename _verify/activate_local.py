import sqlite3, sys

DB = sys.argv[1]
con = sqlite3.connect(DB)
cur = con.cursor()
cur.execute("SELECT id, name, active FROM workflow_entity ORDER BY id")
print("BEFORE:")
for r in cur.fetchall():
    print("  ", r)
for wfid in ("TESTdebtWF0001", "cIIOrjdhNGTPjwfJ"):
    cur.execute("UPDATE workflow_entity SET active = 1 WHERE id = ?", (wfid,))
print("UPDATED rows:", cur.rowcount)
con.commit()
cur.execute("SELECT id, name, active FROM workflow_entity ORDER BY id")
print("AFTER:")
for r in cur.fetchall():
    print("  ", r)
con.close()