import json

with open(r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json", encoding="utf-8") as f:
    wf = json.load(f)

for n in wf["nodes"]:
    name = n.get("name", "?")
    nid = n.get("id", "?")
    ntype = n.get("type", "?")
    print(f"\n{'='*60}")
    print(f"Node: {name} (id={nid}, type={ntype})")
    print(f"{'='*60}")
    params = n.get("parameters", {})
    for k, v in params.items():
        if isinstance(v, str) and len(v) > 300:
            print(f"  {k}: {v[:500]}...[truncated, total={len(v)} chars]")
        else:
            print(f"  {k}: {v}")
    if "credentials" in n:
        print(f"  credentials: {n['credentials']}")
    if "typeVersion" in n:
        print(f"  typeVersion: {n['typeVersion']}")
    print(f"  position: {n.get('position')}")

print(f"\n{'='*60}")
print("CONNECTIONS:")
print(f"{'='*60}")
for k, v in wf["connections"].items():
    print(f"\n  {k}:")
    for out_idx, output in enumerate(v.get("main", [])):
        for conn in output:
            print(f"    output[{out_idx}] -> {conn['node']} ({conn['type']}[{conn['index']}])")

print(f"\nWorkflow id: {wf.get('id')}")
print(f"Workflow name: {wf.get('name')}")
print(f"Active: {wf.get('active')}")
print(f"Settings: {wf.get('settings')}")