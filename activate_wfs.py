import sqlite3, json

conn = sqlite3.connect(r'C:\Users\Aziz\Desktop\med\database.sqlite')
c = conn.cursor()

# Activate both workflows
for wf_id, wf_name in [('cIIOrjdhNGTPjwfJ', 'PROD'), ('TESTdebtWF0001', 'TEST')]:
    c.execute("UPDATE workflow_entity SET active=1 WHERE id=?", (wf_id,))
    print(f"Activated {wf_name} workflow ({c.rowcount} rows)")

conn.commit()

# Verify
c.execute("SELECT id, name, active FROM workflow_entity WHERE id IN ('cIIOrjdhNGTPjwfJ', 'TESTdebtWF0001')")
for row in c.fetchall():
    print(f"  id={row[0]}, name={row[1]}, active={row[2]}")

conn.close()