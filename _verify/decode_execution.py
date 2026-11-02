"""Dump full runData entries for a given execution id (argv[1])."""
import json
import sqlite3
import sys

exec_id = sys.argv[1] if len(sys.argv) > 1 else "63"
conn = sqlite3.connect("c:\\Users\\Aziz\\Desktop\\med\\_verify\\n8n_container.sqlite")
cur = conn.cursor()
cur.execute("SELECT data FROM execution_data WHERE executionId=?", (exec_id,))
row = cur.fetchone()
if not row:
    print("no data for", exec_id)
    raise SystemExit
raw = row[0]
try:
    import gzip
    try:
        raw = gzip.decompress(raw)
    except Exception:
        pass
except Exception:
    pass
doc = json.loads(raw)


def deref(value, depth=0):
    if depth > 12:
        return value
    if isinstance(value, list):
        out = []
        for x in value:
            if isinstance(x, str) and x.isdigit() and int(x) < len(doc):
                out.append(deref(doc[int(x)], depth + 1))
            else:
                out.append(deref(x, depth + 1))
        return out
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if isinstance(v, str) and v.isdigit() and int(v) < len(doc):
                out[k] = deref(doc[int(v)], depth + 1)
            else:
                out[k] = deref(v, depth + 1)
        return out
    return value


resolved = deref(doc[0])
run_data = (resolved.get("resultData") or {}).get("runData", {})
print("Nodes in runData:", list(run_data.keys()))


def show_node(name, keys):
    entries = run_data.get(name) or []
    print(f"\n### {name}")
    if not entries:
        print("  <no data>")
        return
    for entry in entries:
        main = (entry.get("data") or {}).get("main") or []
        for branch_idx, branch in enumerate(main):
            rows = []
            for it in branch or []:
                j = it.get("json", {}) if isinstance(it, dict) else {}
                rows.append({k: j.get(k) for k in keys if k in j})
            print(f"  branch {branch_idx}: {len(branch or [])} item(s)")
            for r in rows[:14]:
                print("   ", json.dumps(r, ensure_ascii=False, default=str)[:200])
            # Loop state
            if name == "Loop Appointments":
                st = entry.get("data", {}).get("main")  # not state
                # state is inside entry["data"]["main"]? try entry top-level keys
        print("  entry keys:", list(entry.keys()))


show_node("Loop Appointments", ["id", "patient_id", "status", "scheduled_at", "debt", "reminder_type"])
show_node("Calculate Debt", ["id", "patient_id", "debt"])
show_node("Generate Debt Reminder Message", ["id", "patient_id", "reminder_type", "notification_type", "debt"])
conn.close()