"""Inspect key nodes in the RDV source workflow JSON."""
import json

wf = json.load(open(r"backend\n8n\workflows\appointment-reminders-with-notifications.json", encoding="utf-8"))

for n in wf["nodes"]:
    nid = n.get("id", "")
    if nid in ("if-rdv", "check-dedup-300", "if-not-sent-300", "finish-rdv", "loop-rdv"):
        print(json.dumps(n, indent=2, ensure_ascii=False))
        print("---")