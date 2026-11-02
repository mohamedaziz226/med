"""Inspection read-only de la base SQLite de n8n (copie locale).

Usage: python inspect_n8n_db.py [section]
Sections: workflows, executions, credentials, schema
"""
import json
import os
import sqlite3
import sys

DB = os.path.join(os.environ.get("TEMP", "."), "n8ndb", "database.sqlite")


def workflows(cur):
    cur.execute("PRAGMA table_info(workflow_entity)")
    cols = [r[1] for r in cur.fetchall()]
    print("COLS:", cols)
    cur.execute("SELECT id, name, active FROM workflow_entity ORDER BY name")
    for r in cur.fetchall():
        print(f"  id={r[0]!r} active={r[2]} name={r[1]!r}")


def executions(cur):
    cur.execute("PRAGMA table_info(execution_entity)")
    cols = [r[1] for r in cur.fetchall()]
    print("EXEC COLS:", cols)
    try:
        cur.execute(
            "SELECT id, workflowId, status, startedAt, stoppedAt FROM execution_entity ORDER BY id DESC LIMIT 15"
        )
        for r in cur.fetchall():
            print(" ", r)
    except sqlite3.OperationalError as exc:
        print("ERR:", exc)
    print("--- execution_data count ---")
    cur.execute("SELECT COUNT(*) FROM execution_entity")
    print("total executions:", cur.fetchone()[0])


def credentials(cur):
    cur.execute("SELECT id, type, name FROM credentials_entity")
    for r in cur.fetchall():
        print(f"  id={r[0]!r} type={r[1]!r} name={r[2]!r}")


def schema(cur):
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    for r in cur.fetchall():
        print(" ", r[0])


def main():
    con = sqlite3.connect(DB)
    cur = con.cursor()
    section = sys.argv[1] if len(sys.argv) > 1 else "workflows"
    if section == "workflows":
        workflows(cur)
    elif section == "executions":
        executions(cur)
    elif section == "credentials":
        credentials(cur)
    elif section == "schema":
        schema(cur)
    con.close()


if __name__ == "__main__":
    main()
