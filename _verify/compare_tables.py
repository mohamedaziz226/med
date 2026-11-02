"""Compare tables and credential data between n8n DB copies."""
import sqlite3


def get_tables(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]
    conn.close()
    return tables


db1 = r"c:\Users\Aziz\Desktop\med\_verify\n8n_container.sqlite"
db2 = r"c:\Users\Aziz\Desktop\med\_verify\n8n_live.sqlite"

tables1 = get_tables(db1)
tables2 = get_tables(db2)

print("=== Tables in n8n_container.sqlite ===")
for t in tables1:
    conn = sqlite3.connect(db1)
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    count = cur.fetchone()[0]
    conn.close()
    tag = " ***" if "cred" in t.lower() else ""
    print(f"  {t}: {count} rows{tag}")

print("\n=== Tables in n8n_live.sqlite (patched) ===")
for t in tables2:
    conn = sqlite3.connect(db2)
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    count = cur.fetchone()[0]
    conn.close()
    tag = " ***" if "cred" in t.lower() else ""
    print(f"  {t}: {count} rows{tag}")

print("\n=== Differences ===")
only1 = set(tables1) - set(tables2)
only2 = set(tables2) - set(tables1)
print("Only in container.sqlite:", only1)
print("Only in live.sqlite:", only2)

# Check for credentials in both
for label, db in [
    ("container.sqlite", db1),
    ("live.sqlite", db2),
]:
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    for t in get_tables(db):
        if "cred" in t.lower():
            cur.execute(f"SELECT * FROM {t} LIMIT 5")
            rows = cur.fetchall()
            cur.execute(f"PRAGMA table_info({t})")
            cols = [c[1] for c in cur.fetchall()]
            print(f"\n--- {label} / {t} ---")
            print(f"  columns: {cols}")
            for r in rows:
                # Show only non-sensitive columns
                row_dict = dict(zip(cols, r))
                safe = {k: v for k, v in row_dict.items() if "secret" not in k.lower() and "token" not in k.lower()}
                print(f"  {safe}")
    conn.close()