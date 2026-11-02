import sqlite3, json

# Copy from container first - actually we already have the local copy
# But it might be stale. Let me refresh it.

conn = sqlite3.connect(r'C:\Users\Aziz\Desktop\med\database.sqlite')
c = conn.cursor()

# Check prod workflow
c.execute("SELECT nodes, connections FROM workflow_entity WHERE id='cIIOrjdhNGTPjwfJ'")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    conns = json.loads(row[1])
    print("=== PROD WORKFLOW IN DB ===")
    node_names = [n["name"] for n in nodes]
    print(f"Nodes ({len(nodes)}): {node_names}")
    
    # Check Generate Debt Reminder Message
    for n in nodes:
        if n["name"] == "Generate Debt Reminder Message":
            jscode = n["parameters"]["jsCode"]
            has_return_empty = "return [];" in jscode
            print(f"\nGenerate Debt Reminder Message:")
            print(f"  Has 'return [];': {has_return_empty}")
            print(f"  Always returns: {'YES (fixed)' if not has_return_empty else 'NO (BUG)'}")
    
    # Check IF Eligible Reminder
    has_if_eligible = any(n["name"] == "IF Eligible Reminder" for n in nodes)
    print(f"\nIF Eligible Reminder node present: {has_if_eligible}")
    
    # Check connections
    print(f"\nConnections from 'Generate Debt Reminder Message':")
    gen_conns = conns.get("Generate Debt Reminder Message", {})
    for out_idx, output in enumerate(gen_conns.get("main", [])):
        for conn in output:
            print(f"  output[{out_idx}] -> {conn['node']}")
    
    print(f"\nConnections from 'IF Eligible Reminder':")
    if_eligible_conns = conns.get("IF Eligible Reminder", {})
    for out_idx, output in enumerate(if_eligible_conns.get("main", [])):
        for conn in output:
            print(f"  output[{out_idx}] -> {conn['node']}")
    
    # Check Create Patient Notification jsonBody
    for n in nodes:
        if n["name"] == "Create Patient Notification":
            json_body = n["parameters"]["jsonBody"]
            has_stringify = "JSON.stringify" in json_body
            print(f"\nCreate Patient Notification jsonBody:")
            print(f"  Has JSON.stringify: {has_stringify}")
            print(f"  Content: {json_body[:100]}...")

# Check TEST workflow
c.execute("SELECT nodes, connections FROM workflow_entity WHERE id='TESTdebtWF0001'")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    print(f"\n=== TEST WORKFLOW IN DB ===")
    node_names = [n["name"] for n in nodes]
    print(f"Nodes ({len(nodes)}): {node_names}")
    
    for n in nodes:
        if n["name"] == "Send Debt Reminder Email":
            print(f"\nSend Debt Reminder Email (TEST):")
            print(f"  type: {n['type']}")
            print(f"  credentials: {json.dumps(n.get('credentials', {}))}")

conn.close()