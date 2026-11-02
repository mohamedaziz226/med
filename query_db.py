import sqlite3, json
conn = sqlite3.connect(r'C:\Users\Aziz\Desktop\med\database.sqlite')
c = conn.cursor()

# Production workflow
c.execute("SELECT nodes, connections FROM workflow_entity WHERE name LIKE '%Rappels de dettes%' AND name LIKE '%J-15%' AND id='cIIOrjdhNGTPjwfJ'")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    conns = json.loads(row[1])
    print("=== PROD WORKFLOW NODES ===")
    for n in nodes:
        nid = n.get('id', '?')
        nname = n.get('name', '?')
        ntype = n.get('type', '?')
        print(f"  [{nid}] {nname} ({ntype})")
    print("\n=== PROD WORKFLOW CONNECTIONS ===")
    for k, v in conns.items():
        print(f"  {k}:")
        for output_idx, output in enumerate(v.get('main', [])):
            for conn in output:
                print(f"    output[{output_idx}] -> {conn['node']} ({conn['type']}[{conn['index']}])")
    # Check Gmail credential in Send Debt Reminder Email
    for n in nodes:
        if n['name'] == 'Send Debt Reminder Email':
            print(f"\n=== Send Debt Reminder Email ===")
            print(f"  type: {n.get('type')}")
            print(f"  credentials: {n.get('credentials', 'NONE')}")
            print(f"  parameters keys: {list(n.get('parameters', {}).keys())}")
    # Check Create Patient Notification
    for n in nodes:
        if n['name'] == 'Create Patient Notification':
            print(f"\n=== Create Patient Notification ===")
            print(f"  jsonBody: {json.dumps(n.get('parameters', {}).get('jsonBody', 'MISSING'))}")
    # Check Generate Debt Reminder Message
    for n in nodes:
        if n['name'] == 'Generate Debt Reminder Message':
            print(f"\n=== Generate Debt Reminder Message ===")
            print(f"  jsCode: {n.get('parameters', {}).get('jsCode', 'MISSING')[:500]}")

conn.close()