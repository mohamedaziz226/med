"""Create a single-controlled-email test workflow (Gmail OAuth2).

Sends exactly ONE real email to azizzeiri7@gmail.com when triggered via webhook,
to validate the full Gmail OAuth2 path before running the 4 real cases.
Uses fixed values (no Code node) to avoid Code-node quirks.
"""
import json

wf = {
    "name": "TEST UNIQUE - Validation Gmail OAuth2",
    "id": "ZzTESTGmail001",
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "gmail-oauth2-test",
                "responseMode": "onReceived",
                "options": {},
            },
            "id": "hook-1",
            "name": "Webhook (Gmail Test)",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [0, 0],
            "webhookId": "wh-gmail-oauth2-test",
        },
        {
            "parameters": {
                "operation": "send",
                "sendTo": "azizzeiri7@gmail.com",
                "subject": "TEST MedSecretariat - Connexion Gmail OAuth2",
                "emailType": "html",
                "message": (
                    "<html><body><h2>MedSecretariat</h2>"
                    "<p>Ceci est un email de validation unique de la connexion Gmail OAuth2.</p>"
                    "<p>Si vous recevez ce message, la chaine Gmail OAuth2 est opérationnelle.</p>"
                    "<p>Cordialement,<br/>MedSecretariat</p></body></html>"
                ),
                "options": {},
            },
            "credentials": {
                "gmailOAuth2": {
                    "id": "CaiZmZzshoECZ5OO",
                    "name": "Gmail account",
                }
            },
            "id": "gmail-1",
            "name": "Send Validation Email",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [220, 0],
        },
        {
            "parameters": {},
            "id": "end-1",
            "name": "End",
            "type": "n8n-nodes-base.noOp",
            "typeVersion": 1.0,
            "position": [440, 0],
        },
    ],
    "connections": {
        "Webhook (Gmail Test)": {
            "main": [[{"node": "Send Validation Email", "type": "main", "index": 0}]],
        },
        "Send Validation Email": {
            "main": [[{"node": "End", "type": "main", "index": 0}]],
        },
    },
    "active": True,
    "settings": {"executionOrder": "v1"},
    "pinData": {},
    "meta": {},
    "tags": [],
}

path = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows\TEST-gmail-oauth2-single.json'
with open(path, 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
print('written:', path)
import json

WORKFLOW_PATH = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows\TEST-all-notifications-manual.json'