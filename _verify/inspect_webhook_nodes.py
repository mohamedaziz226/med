"""Inspect webhook nodes in both workflow source JSONs."""
import json

for wf_path, label in [
    (r"backend\n8n\workflows\appointment-reminders-with-notifications.json", "RDV"),
    (r"backend\n8n\workflows\debt-reminders-with-notifications.json", "DEBT"),
]:
    print(f"\n=== {label} Workflow ===")
    wf = json.load(open(wf_path, encoding="utf-8"))
    for n in wf["nodes"]:
        if "webhook" in n.get("type", "").lower() or "webhook" in n.get("name", "").lower():
            print(json.dumps(n, indent=2, ensure_ascii=False))
    # Also print all node names
    print(f"  All nodes: {[n.get('name') for n in wf['nodes']]}")
    print(f"  Connections from Webhook: {wf.get('connections', {}).get('Webhook (Test)', {})}")