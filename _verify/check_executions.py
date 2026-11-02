"""Check n8n settings, scheduled jobs and webhook endpoints."""
import json
import sqlite3

conn = sqlite3.connect("c:\\Users\\Aziz\\Desktop\\med\\_verify\\n8n_container.sqlite")
cur = conn.cursor()

print("=== settings ===")
try:
    cur.execute("SELECT key, value FROM settings")
    for r in cur.fetchall():
        print(" ", r[0], "=", str(r[1])[:200])
except Exception as exc:
    print("  error:", exc)

print("\n=== scheduled_job ===")
try:
    cur.execute("SELECT * FROM scheduled_job")
    cols = [d[1] for d in cur.execute("PRAGMA table_info(scheduled_job)")]
    print("  cols:", cols)
    for r in cur.fetchall():
        print(" ", r)
except Exception as exc:
    print("  error:", exc)

print("\n=== scheduled_task ===")
try:
    cur.execute("SELECT * FROM scheduled_task")
    cols = [d[1] for d in cur.execute("PRAGMA table_info(scheduled_task)")]
    print("  cols:", cols)
    for r in cur.fetchall():
        print(" ", r)
except Exception as exc:
    print("  error:", exc)

print("\n=== webhook_entity ===")
try:
    cols = [d[1] for d in cur.execute("PRAGMA table_info(webhook_entity)")]
    print("  cols:", cols)
    for r in cur.execute("SELECT * FROM webhook_entity"):
        print(" ", r)
except Exception as exc:
    print("  error:", exc)

print("\n=== workflow_statistics ===")
try:
    cur.execute("SELECT * FROM workflow_statistics")
    for r in cur.fetchall():
        print(" ", r)
except Exception as exc:
    print("  error:", exc)
conn.close()