"""Exporte la donnée flatted d'une exécution n8n vers un fichier (brute, sans re-parse)."""
import os
import sqlite3
import sys

DB = os.path.join(os.environ.get("TEMP", "."), "n8ndb", "database.sqlite")
EXEC_ID = sys.argv[1] if len(sys.argv) > 1 else "13"
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.environ["TEMP"], "n8ndb", f"exec{EXEC_ID}_flatted.json")

con = sqlite3.connect(DB)
cur = con.cursor()
cur.execute("SELECT typeof(data), data FROM execution_data WHERE executionId=?", (EXEC_ID,))
row = cur.fetchone()
print("storage type:", row[0])
val = row[1]
if isinstance(val, bytes):
    val = val.decode("utf-8", "replace")
if not isinstance(val, str):
    import json
    val = json.dumps(val)
# Corrige le cas où les sous-objets ont été sérialisés en objets : on écrit la string brute telle quelle
with open(OUT, "w", encoding="utf-8") as f:
    f.write(val)
print("written:", OUT, len(val), "chars")

