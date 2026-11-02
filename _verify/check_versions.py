"""Check n8n workflow versioning: activeVersionId, published versions, history."""
import json
import sqlite3

conn = sqlite3.connect("c:\\Users\\Aziz\\Desktop\\med\\_verify\\n8n_container.sqlite")
cur = conn.cursor()

print("=== workflow_entity version fields ===")
cols = [d[1] for d in cur.execute("PRAGMA table_info(workflow_entity)")]
print("cols:", cols)
cur.execute("SELECT id, name, activeVersionId, versionId FROM workflow_entity")
for r in cur.fetchall():
    print(f"  id={r[0]} name={r[1]} activeVersionId={r[2]} versionId={r[3]}")

print("\n=== workflow_published_version ===")
try:
    cols = [d[1] for d in cur.execute("PRAGMA table_info(workflow_published_version)")]
    print("cols:", cols)
    for r in cur.execute("SELECT * FROM workflow_published_version"):
        # r may contain large JSON; print structure not full raw
        print("  row len:", len(r), "| id:", r[0])
        # show which columns are the large ones
except Exception as exc:
    print(" error:", exc)

print("\n=== workflow_publish_history ===")
try:
    cols = [d[1] for d in cur.execute("PRAGMA table_info(workflow_publish_history)")]
    print("cols:", cols)
    for r in cur.execute("SELECT * FROM workflow_publish_history"):
        print("  ", json.dumps(r, ensure_ascii=False, default=str)[:400])
except Exception as exc:
    print(" error:", exc)

print("\n=== workflow_history ===")
try:
    cols = [d[1] for d in cur.execute("PRAGMA table_info(workflow_history)")]
    print("cols:", cols)
    for r in cur.execute("SELECT workflowId, versionId, createdAt FROM workflow_history LIMIT 20"):
        print("  ", r)
except Exception as exc:
    print(" error:", exc)

conn.close()