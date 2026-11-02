"""Scan brut des chunks d'une exécution n8n : cherche les données clés par mots-clés."""
import json
import os
import sqlite3
import sys

DB = os.path.join(os.environ.get("TEMP", "."), "n8ndb", "database.sqlite")
EXEC_ID = int(sys.argv[1]) if len(sys.argv) > 1 else 13
KEYWORDS = sys.argv[2].split(",") if len(sys.argv) > 2 else [
    "access_token", "patient_email", "debt", "reminder_type", "j15", "j10",
    "daysUntil", "Gmail", "credential", "error", "Email", "debt.test",
]

con = sqlite3.connect(DB)
cur = con.cursor()
cur.execute("SELECT data FROM execution_data WHERE executionId=?", (EXEC_ID,))
row = cur.fetchone()
raw = row[0] if isinstance(row[0], str) else row[0].decode("utf-8", "replace")
payload = json.loads(raw)

print(f"chunks: {len(payload)}")

seen_msgs = set()


def walk(node, path="root"):
    """Parcourt récursivement et affiche les feuilles contenant un mot-clé."""
    if isinstance(node, dict):
        for k, v in node.items():
            walk(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, f"{path}[{i}]")
    else:
        s = str(node)
        for kw in KEYWORDS:
            if kw.lower() in s.lower() and len(s) < 4000:
                msg = f"{path} = {s[:300]}"
                if msg not in seen_msgs:
                    seen_msgs.add(msg)
                    print(msg)
                break


for i, chunk in enumerate(payload):
    walk(chunk, f"#{i}")
con.close()
