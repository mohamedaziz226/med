import sqlite3, json

conn = sqlite3.connect(r'C:\Users\Aziz\Desktop\med\database.sqlite')
c = conn.cursor()

for wf_id, wf_name in [('cIIOrjdhNGTPjwfJ', 'PROD'), ('TESTdebtWF0001', 'TEST')]:
    c.execute("SELECT active, nodes, connections FROM workflow_entity WHERE id=?", (wf_id,))
    row = c.fetchone()
    if row:
        active = row[0]
        nodes = json.loads(row[1])
        conns = json.loads(row[2])
        print(f"\n=== {wf_name} WORKFLOW (active={active}) ===")
        print(f"Nodes ({len(nodes)}):")
        for n in nodes:
            print(f"  [{n['id']}] {n['name']} ({n.get('type','?').split('.')[-1]})")
        
        print(f"\nConnections:")
        for k, v in conns.items():
            for out_idx, output in enumerate(v.get("main", [])):
                for conn in output:
                    print(f"  {k} [out{out_idx}] -> {conn['node']}")
        
        # Check specific fixes
        for n in nodes:
            if n["name"] == "Generate Debt Reminder Message":
                js = n["parameters"]["jsCode"]
                has_bug = "if (!reminder_type) return [];" in js
                has_null_return = "reminder_type: null" in js
                print(f"\n  Generate Debt: has 'return []' bug={has_bug}, has null return={has_null_return}")
            
            if n["name"] == "Create Patient Notification":
                jb = n["parameters"].get("jsonBody", "")
                has_stringify = "JSON.stringify" in jb
                print(f"  Create Notif: has JSON.stringify={has_stringify}")
            
            if n["name"] == "IF Eligible Reminder":
                print(f"  IF Eligible Reminder: PRESENT")
            
            if n["name"] == "Send Debt Reminder Email":
                t = n.get("type", "?")
                cr = n.get("credentials", {})
                print(f"  Send Email: type={t}, credentials={json.dumps(cr)}")

conn.close()