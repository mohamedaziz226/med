"""Inspect the n8n sqlite database for deployed workflows."""
import json
import sqlite3

conn = sqlite3.connect("c:\\Users\\Aziz\\Desktop\\med\\_verify\\n8n_container.sqlite")
cur = conn.cursor()
cur.execute("SELECT id, name, active FROM workflow_entity")
rows = cur.fetchall()
for wid, name, active in rows:
    print(f"ID: {wid} | ACTIVE: {active} | NAME: {name}")

print("\n--- Details ---")
cur.execute("SELECT id, name, nodes, connections FROM workflow_entity")
for wid, name, nodes_raw, conns_raw in cur.fetchall():
    print(f"\n=== {name} (id={wid}) ===")
    try:
        nodes = json.loads(nodes_raw) if nodes_raw else []
        conns = json.loads(conns_raw) if conns_raw else {}
    except Exception as exc:
        print("  parse error:", exc)
        continue
    for n in nodes:
        print(f"  node: {n.get('name')} [{n.get('type')}]")
    print("  connections keys:", list(conns.keys()))
conn.close()