import sqlite3, json
conn = sqlite3.connect(r'C:\Users\Aziz\Desktop\med\database.sqlite')
c = conn.cursor()

# Settings
print("=== SETTINGS ===")
c.execute("SELECT key, value FROM settings")
for row in c.fetchall():
    val = row[1]
    print(f"  {row[0]}: {val[:200] if val else val}")

# User
print("\n=== USER ===")
c.execute("SELECT id, email, firstName, lastName FROM user")
for row in c.fetchall():
    print(f"  {row}")

conn.close()