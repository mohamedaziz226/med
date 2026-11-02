"""Analyse détaillée d'une exécution n8n : nœuds exécutés, sorties, erreurs."""
import json
import os
import sqlite3
import sys

DB = os.path.join(os.environ.get("TEMP", "."), "n8ndb", "database.sqlite")
EXEC_ID = int(sys.argv[1]) if len(sys.argv) > 1 else 13

con = sqlite3.connect(DB)
cur = con.cursor()
cur.execute("SELECT data FROM execution_data WHERE executionId=?", (EXEC_ID,))
row = cur.fetchone()
if not row:
    print("No execution_data for", EXEC_ID)
    sys.exit(1)

_resolved_cache = {}


"""Scan brut des chunks d'une exécution n8n : cherche les données clés par mots-clés."""
import json
import os
import re
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



payload = json.loads(row[0])
print("TYPE:", type(payload).__name__)
if isinstance(payload, list):
    # Format chunked n8n 2.x : {runData: <int-index>, lastNodeExecuted: ...}
    cand = None
    for el in payload:
        if isinstance(el, dict) and "runData" in el:
            cand = el
            break
    if cand is None:
        print("No runData chunk found")
        sys.exit(1)
    cand = resolve(cand, payload)
    run = cand.get("runData", {})
    if isinstance(run, str):
        try:
            run = json.loads(run)
        except Exception:
            pass
    last = cand.get("lastNodeExecuted")
    print("lastNodeExecuted:", json.dumps(last, ensure_ascii=False) if not isinstance(last, str) else last)
else:
    run = payload.get("resultData", {}).get("runData", {})
print("runData nodes:", list(run.keys()) if isinstance(run, dict) else type(run).__name__)
print("=== NŒUDS EXÉCUTÉS ===")
for node_name, runs in run.items():
    for r in runs:
        err = r.get("error")
        outs = r.get("data", {}).get("main", [])
        summary = []
        for oi, out in enumerate(outs):
            if out is None:
                summary.append(f"out{oi}=null")
            else:
                summary.append(f"out{oi}={len(out)} items")
        print(f"- {node_name}: {'; '.join(summary) or 'no outputs'}")
        if err:
            print(f"    ERROR: {json.dumps(err, ensure_ascii=False)[:400]}")

# Détail des items clés
print()
print("=== DÉTAIL (Login, Calculate, Generate, Gmail, Notification) ===")
for node_name in ["Login Backend", "Get Upcoming Appointments", "Calculate Debt",
                  "IF Debt > 0", "Generate Debt Reminder Message",
                  "Send Debt Reminder Email", "Create Patient Notification"]:
    runs = run.get(node_name)
    if not runs:
        print(f"--- {node_name}: PAS EXÉCUTÉ")
        continue
    for r in runs:
        outs = r.get("data", {}).get("main", [])
        print(f"--- {node_name}:")
        for oi, out in enumerate(outs):
            if not out:
                print(f"    output[{oi}]: vide/None")
                continue
            for it in out[:8]:
                j = it.get("json", {})
                ks = {k: j.get(k) for k in ("access_token", "patient_id", "appointment_id",
                                            "patient_email", "debt", "daysUntil", "reminder_type",
                                            "message", "title", "id", "threadId") if k in j}
                print(f"    output[{oi}]: {json.dumps(ks, ensure_ascii=False)[:500]}")
        if r.get("error"):
            print(f"    ERROR: {json.dumps(r['error'], ensure_ascii=False)[:400]}")
con.close()

