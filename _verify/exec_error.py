"""Extract error details of a given n8n execution id."""
import json
import sqlite3
import sys

EX_ID = int(sys.argv[1]) if len(sys.argv) > 1 else 52
DB = r"c:\Users\Aziz\Desktop\med\_verify\n8n_now.sqlite"

conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("PRAGMA table_info(execution_data)")
cols = [c[1] for c in cur.fetchall()]
print("execution_data cols:", cols)
cur.execute("SELECT data FROM execution_data WHERE executionId=?", (EX_ID,))
row = cur.fetchone()
if not row:
    print("no execution_data row for", EX_ID)
    sys.exit()
data = json.loads(row[0])
rd = data.get("resultData", {})
err = rd.get("error")
print("\nGLOBAL ERROR:", json.dumps(err, ensure_ascii=False, indent=2)[:2000])
run_data = rd.get("runData", {})
for node_name, runs in run_data.items():
    for run in runs:
        e = run.get("error")
        if e:
            print(f"\nNODE ERROR in '{node_name}':", json.dumps(e, ensure_ascii=False, indent=2)[:2000])
            for item in run.get("data", {}).get("main", []):
                if item:
                    print("  item json:", json.dumps(item[0].get("json", {}), ensure_ascii=False)[:500])
# Also show which nodes ran and their outputs summary
print("\nNodes executed:", list(run_data.keys()))
conn.close()
