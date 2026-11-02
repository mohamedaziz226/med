"""Inspect key nodes of the debt workflow."""
import json

wf = json.load(open(r"backend\n8n\workflows\debt-reminders-with-notifications.json", encoding="utf-8"))
for n in wf["nodes"]:
    nm = n.get("name", "")
    if nm in ("Generate Debt Reminder Message", "Calculate Debt", "IF Eligible Reminder", "IF Debt > 0"):
        print(f"=== {nm} ({n['id']}) ===")
        p = n.get("parameters", {})
        if "jsCode" in p:
            print(p["jsCode"])
        elif "conditions" in p:
            print(json.dumps(p["conditions"], indent=2, ensure_ascii=False))
        print()