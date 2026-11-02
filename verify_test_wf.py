import json

# Check TEST workflow
TEST_FILE = r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\TEST-debt-reminders-manual.json"
with open(TEST_FILE, encoding="utf-8") as f:
    wf = json.load(f)

print("=== TEST WORKFLOW ===")
print(f"Name: {wf['name']}")
print(f"ID: {wf['id']}")
print(f"Active: {wf['active']}")
print()
print("Nodes:")
for n in wf["nodes"]:
    ntype = n["type"].split(".")[-1]
    print(f"  [{n['id']}] {n['name']} ({ntype})")
print()
print("Connections:")
for k, v in wf["connections"].items():
    for out_idx, output in enumerate(v.get("main", [])):
        for conn in output:
            print(f"  {k} [out{out_idx}] -> {conn['node']}")
print()
# Check Send Debt Reminder Email in TEST workflow
for n in wf["nodes"]:
    if n["name"] == "Send Debt Reminder Email":
        print("Send Debt Reminder Email:")
        print(f"  type: {n['type']}")
        print(f"  credentials: {json.dumps(n.get('credentials', {}))}")
        print(f"  fromEmail: {n['parameters'].get('fromEmail')}")

# Check Create Patient Notification jsonBody
for n in wf["nodes"]:
    if n["name"] == "Create Patient Notification":
        print("\nCreate Patient Notification jsonBody:")
        print(f"  {n['parameters']['jsonBody']}")

# Check IF Eligible Reminder node exists
for n in wf["nodes"]:
    if n["name"] == "IF Eligible Reminder":
        print("\nIF Eligible Reminder:")
        print(f"  id: {n['id']}")
        print(f"  conditions: {json.dumps(n['parameters']['conditions'])}")