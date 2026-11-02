"""Verify and fix the TEST workflow's email node credential."""
import json

SRC = r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\TEST-debt-reminders-manual.json"

with open(SRC, "r", encoding="utf-8") as f:
    wf = json.load(f)

for n in wf["nodes"]:
    if n["name"] == "Send Debt Reminder Email":
        creds = n.get("credentials", {})
        print(f"Current credentials: {json.dumps(creds)}")
        
        # Make sure SMTP credential is set
        if "smtp" not in creds:
            n["credentials"] = {
                "smtp": {
                    "id": "TEST-smtp-cred-0001",
                    "name": "TEST SMTP Mailpit"
                }
            }
            print("✓ Added SMTP credential to test workflow")
        else:
            print("✓ SMTP credential already present")

with open(SRC, "w", encoding="utf-8") as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print(f"✅ Test workflow verified: {SRC}")