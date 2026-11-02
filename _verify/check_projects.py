"""Inspect n8n projects and workflow sharing."""
import sqlite3

conn = sqlite3.connect("c:\\Users\\Aziz\\Desktop\\med\\_verify\\n8n_container.sqlite")
cur = conn.cursor()

print("=== project ===")
try:
    cols = [d[1] for d in cur.execute("PRAGMA table_info(project)")]
    print(" cols:", cols)
    for r in cur.execute("SELECT * FROM project"):
        print(" ", r)
except Exception as exc:
    print(" error:", exc)

print("\n=== project_relation ===")
try:
    cols = [d[1] for d in cur.execute("PRAGMA table_info(project_relation)")]
    print(" cols:", cols)
    for r in cur.execute("SELECT * FROM project_relation"):
        print(" ", r)
except Exception as exc:
    print(" error:", exc)

print("\n=== shared_workflow (rdv) ===")
try:
    cols = [d[1] for d in cur.execute("PRAGMA table_info(shared_workflow)")]
    print(" cols:", cols)
    for r in cur.execute("SELECT * FROM shared_workflow WHERE workflowId='TuKvVdtren4w6HHM'"):
        print(" ", r)
except Exception as exc:
    print(" error:", exc)

print("\n=== shared_credentials (gmail) ===")
try:
    for r in cur.execute("SELECT * FROM shared_credentials"):
        print(" ", r)
except Exception as exc:
    print(" error:", exc)

print("\n=== user (owners) ===")
try:
    for r in cur.execute("SELECT id, email, role FROM user"):
        print(" ", r)
except Exception as exc:
    print(" error:", exc)
conn.close()