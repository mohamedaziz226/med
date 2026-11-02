import sqlite3, json

conn = sqlite3.connect(r'C:\Users\Aziz\Desktop\med\database.sqlite')
c = conn.cursor()

# List all workflows
c.execute("SELECT id, name, active FROM workflow_entity")
print("=== ALL WORKFLOWS BEFORE ACTIVATION ===")
for row in c.fetchall():
    print(f"  id={row[0]}, name={row[1]}, active={row[2]}")

# Activate both workflows
for wf_id, wf_name in [('cIIOrjdhNGTPjwfJ', 'PROD'), ('TESTdebtWF0001', 'TEST')]:
    c.execute("UPDATE workflow_entity SET active=1 WHERE id=?", (wf_id,))
    print(f"\nActivated {wf_name} ({wf_id}): {c.rowcount} row(s)")

# Also set credentials to be shared with the project
c.execute("SELECT credentialsId, projectId, role FROM shared_credentials")
print("\n=== SHARED CREDENTIALS ===")
for row in c.fetchall():
    print(f"  {row}")

# Check credential data is present
c.execute("SELECT id, name, type FROM credentials_entity")
print("\n=== CREDENTIALS ===")
for row in c.fetchall():
    print(f"  {row}")

conn.commit()

# Verify activation
c.execute("SELECT id, name, active FROM workflow_entity WHERE id IN ('cIIOrjdhNGTPjwfJ', 'TESTdebtWF0001')")
print("\n=== VERIFICATION ===")
for row in c.fetchall():
    print(f"  id={row[0]}, name={row[1]}, active={row[2]}")

conn.close()