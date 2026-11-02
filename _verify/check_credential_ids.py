"""Check Gmail credential references in both workflows."""
import json

for wf_path, label in [
    (r"backend\n8n\workflows\appointment-reminders-with-notifications.json", "RDV"),
    (r"backend\n8n\workflows\debt-reminders-with-notifications.json", "DEBT"),
]:
    print(f"\n=== {label} Workflow ===")
    wf = json.load(open(wf_path, encoding="utf-8"))
    for n in wf["nodes"]:
        nm = n.get("name", "")
        if "message" in nm.lower() or "email" in nm.lower() or "gmail" in nm.lower() or "send" in nm.lower():
            print(f"  Node: {nm} (id={n.get('id')})")
            params = n.get("parameters", {})
            if "credentials" in params:
                print(f"  credentials: {json.dumps(params['credentials'], indent=4, ensure_ascii=False)}")
            if "authentication" in params:
                print(f"  authentication: {params['authentication']}")
            for k, v in params.items():
                if k not in ("jsCode", "jsonBody", "specifyBody", "options"):
                    print(f"  {k}: {json.dumps(v, ensure_ascii=False)[:200]}")