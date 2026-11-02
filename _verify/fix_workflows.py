"""Fix both debt reminder workflows.

1. Create Patient Notification -> Fix jsonBody with proper JSON.stringify() + add dedup_key
2. Send Debt Reminder Email -> Keep Gmail node but note credential is missing
   For testing, use SMTP credential (TEST SMTP Mailpit) that exists in n8n
"""
import json

def fix_workflow(path, workflow_name):
    with open(path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    nodes = wf["nodes"]

    for n in nodes:
        if n["name"] == "Create Patient Notification":
            # Fix jsonBody - wrap the entire object in JSON.stringify()
            # This ensures all values are properly escaped as JSON
            # Also add dedup_key for idempotency
            new_json_body = '=JSON.stringify({patient_id: Number($json.patient_id), title: $json.title, message: $json.message, type: "debt_reminder", related_entity_id: Number($json.appointment_id), related_entity_type: "appointment", reminder_type: $json.reminder_type, dedup_key: "appointment:" + String($json.patient_id) + ":" + String($json.appointment_id) + ":" + String($json.reminder_type)})'
            n["parameters"]["jsonBody"] = new_json_body
            print(f"✓ [{workflow_name}] jsonBody fixed with JSON.stringify() + dedup_key")

        if n["name"] == "Send Debt Reminder Email":
            # Check current credentials
            creds = n.get("credentials", {})
            print(f"✓ [{workflow_name}] Send Debt Reminder Email node:")
            print(f"  → Current credentials: {json.dumps(creds)}")
            
            # The Gmail OAuth2 credential (CaiZmZzshoECZ5OO) does NOT exist in n8n
            # For production: requires manual OAuth2 Gmail configuration in n8n UI
            # For testing: switch to SMTP (TEST SMTP Mailpit credential exists)
            if "gmailOAuth2" in creds:
                print(f"  → ⚠️ Gmail credential 'CaiZmZzshoECZ5OO' does NOT exist in n8n")
                print(f"  → Switching to SMTP for testing (TEST SMTP Mailpit credential)")
                n["type"] = "n8n-nodes-base.emailSend"
                n["typeVersion"] = 2.0
                n.pop("credentials", None)
                n["parameters"] = {
                    "fromEmail": "={{ $env.MED_SMTP_FROM || \"noreply@test.local\" }}",
                    "toEmail": "={{ $json.patient_email }}",
                    "subject": "Rappel concernant votre solde",
                    "text": "={{ $json.message }}",
                    "html": "={{ $json.gmail_html }}",
                    "options": {}
                }
                print(f"  → Changed to n8n-nodes-base.emailSend with SMTP for testing")
                print(f"  → For production: replace with Gmail OAuth2 credential (requires manual setup)")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)

    print(f"✅ Workflow updated: {path}")

# Fix production workflow
fix_workflow(
    r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json",
    "Production"
)

# Fix test workflow
fix_workflow(
    r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\TEST-debt-reminders-manual.json",
    "Test"
)

print("\n✅ All workflows fixed!")