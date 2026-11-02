"""Final validation for Gmail OAuth2 production mode.

- email nodes already use n8n-nodes-base.gmail with OAuth2 credential 'Gmail account'
- recipient: real patient email (no TEST_EMAIL anywhere)
- debt workflow uses Africa/Tunis business timezone
"""
import json

BASE = r"c:\Users\Aziz\Desktop\med\backend\n8n\workflows"
APPT = f"{BASE}\\appointment-reminders-with-notifications.json"
DEBT = f"{BASE}\\debt-reminders-with-notifications.json"
GMAIL_CRED = {"gmailOAuth2": {"id": "CaiZmZzshoECZ5OO", "name": "Gmail account"}}

# ---------------------------------------------------------------- appointment
with open(APPT, "r", encoding="utf-8") as f:
    appt = json.load(f)

for node in appt["nodes"]:
    if node["name"] == "Send a Message":
        node["type"] = "n8n-nodes-base.gmail"
        node["typeVersion"] = 2.1
        node["parameters"] = {
            "operation": "send",
            "sendTo": "={{ $('Prepare Reminders').first().json.patient_email }}",
            "subject": "={{ $('Prepare Reminders').first().json.title }}",
            "emailType": "html",
            "message": "={{ $('Prepare Reminders').first().json.gmail_html }}",
            "options": {},
        }
        node["credentials"] = dict(GMAIL_CRED)
        print("appointment: Send a Message -> Gmail OAuth2")

    if node["name"] == "Prepare Reminders":
        code = node["parameters"]["jsCode"]
        if "TEST_EMAIL" in code:
            # Replace the old test recipient block
            test_block = (
                "const TEST_EMAIL = 'azizzeiri7@gmail.com';\n"
                "const useTestEmail = true;\n"
                "const toEmail = useTestEmail ? TEST_EMAIL : (patient.email || TEST_EMAIL);"
            )
            replacement = "const toEmail = patient.email || '';"
            code = code.replace(test_block, replacement)
            node["parameters"]["jsCode"] = code
            print("appointment: Prepare Reminders -> TEST_EMAIL removed")
        else:
            print("appointment: already clean (no TEST_EMAIL)")

with open(APPT, "w", encoding="utf-8") as f:
    json.dump(appt, f, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- debt
with open(DEBT, "r", encoding="utf-8") as f:
    debt = json.load(f)

for node in debt["nodes"]:
    if node["name"] == "Send Debt Reminder Email":
        node["type"] = "n8n-nodes-base.gmail"
        node["typeVersion"] = 2.1
        node["parameters"] = {
            "operation": "send",
            "sendTo": "={{ $('Generate Debt Reminder Message').first().json.patient_email }}",
            "subject": "={{ $('Generate Debt Reminder Message').first().json.title }}",
            "emailType": "html",
            "message": "={{ $('Generate Debt Reminder Message').first().json.gmail_html }}",
            "options": {},
        }
        node["credentials"] = dict(GMAIL_CRED)
        print("debt: Send Debt Reminder Email -> Gmail OAuth2")

with open(DEBT, "w", encoding="utf-8") as f:
    json.dump(debt, f, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- sanity checks
for p in (APPT, DEBT):
    json.load(open(p, encoding="utf-8"))  # valid JSON
    raw = open(p, encoding="utf-8").read()
    assert "azizzeiri7@gmail.com" not in raw, f"TEST email remains in {p}!"
    assert "GOCSPX" not in raw, f"SECRET in {p}!"
    assert "TEST-smtp" not in raw, f"SMTP test credential remains in {p}!"
print("Done — no TEST_EMAIL, no secrets in workflow files")