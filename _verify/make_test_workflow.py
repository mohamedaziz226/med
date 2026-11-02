"""Génère une copie TEST du workflow de rappels de dettes avec Webhook + Email Send SMTP.

Le workflow de production (cIIOrjdhNGTPjwfJ, Schedule 09:00, Gmail) n'est PAS modifié.
La copie porte un id/nom distincts, son trigger Schedule est remplacé par un Webhook,
et le nœud Gmail est remplacé par un Email Send (SMTP) vers Mailpit de test.
"""
import json
import shutil

CRED_ID = "TEST-smtp-cred-0001"

SRC = r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json"
DST = r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\TEST-debt-reminders-manual.json"

shutil.copyfile(SRC, DST)
with open(DST, encoding="utf-8") as f:
    wf = json.load(f)

wf["name"] = "TEST — Rappels de dettes (exécution contrôlée)"
wf["id"] = "TESTdebtWF0001"
wf["active"] = True

# Remplace le Schedule Trigger par un Webhook (POST /webhook/debt-test-exec)
wf["nodes"] = [n for n in wf["nodes"] if n["name"] != "Schedule Trigger"]
wf["nodes"].append(
    {
        "parameters": {
            "httpMethod": "POST",
            "path": "debt-test-exec",
            "responseMode": "onReceived",
            "options": {},
        },
        "id": "webhook-test-trigger",
        "name": "Webhook (TEST)",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "webhookId": "debt-test-exec",
        "position": [-1600, 0],
    }
)

# Remplace le nœud Gmail par un Email Send (SMTP) pointant sur Mailpit de test.
# On GARDE le même nom de nœud ("Send Debt Reminder Email") pour ne pas casser les connexions.
for n in wf["nodes"]:
    if n["id"] == "gmail-debt" and n["name"] == "Send Debt Reminder Email":
        n["id"] = "email-test-debt"
        n["type"] = "n8n-nodes-base.emailSend"
        n["typeVersion"] = 2
        n["parameters"] = {
            "operation": "send",
            "fromEmail": "noreply@medsecretariat.test",
            "fromName": "MedSecretariat TEST",
            "toEmail": "={{ $json.patient_email }}",
            "subject": "={{ $json.title }}",
            "emailFormat": "html",
            "html": "={{ $json.gmail_html }}",
            "options": {},
        }
        n["credentials"] = {"smtp": {"id": CRED_ID, "name": "TEST SMTP Mailpit"}}

conns = wf["connections"]
conns["Webhook (TEST)"] = conns.pop("Schedule Trigger")

with open(DST, "w", encoding="utf-8") as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("OK ->", DST)
