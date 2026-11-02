"""Create a minimal test workflow to check Code node sandbox capabilities."""
import json

wf = {
    "name": "ZZ-TEST sandbox capabilities",
    "id": "ZZtestSANDBOX001",
    "nodes": [
        {
            "parameters": {"httpMethod": "POST", "path": "sandbox-test", "responseMode": "onReceived", "options": {}},
            "id": "hook-1", "name": "Webhook", "type": "n8n-nodes-base.webhook",
            "typeVersion": 2, "position": [0, 0], "webhookId": "wh-sandbox-test",
        },
        {
            "parameters": {
                "mode": "runOnceForEachItem",
                "jsCode": (
                    "let httpErr = null;\n"
                    "try { await $http.request({method:'GET', url:'http://backend-app-1:8000/healthz'}); } catch (e) { httpErr = String(e && e.message || e); }\n"
                    "return { json: {\n"
                    "  has_dollar_http: typeof $http,\n"
                    "  has_helpers: typeof $helpers,\n"
                    "  has_httpErr: httpErr,\n"
                    "  env_url: typeof $env !== 'undefined' ? ($env.MED_BACKEND_URL || 'UNSET') : 'NO_ENV'\n"
                    "} };"
                ),
            },
            "id": "code-1", "name": "Sandbox Check", "type": "n8n-nodes-base.code",
            "typeVersion": 2, "position": [220, 0],
        },
    ],
    "connections": {"Webhook": {"main": [[{"node": "Sandbox Check", "type": "main", "index": 0}]]}},
    "settings": {},
    "active": False,
}

with open(r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows\ZZ-test-sandbox.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, indent=2)
print('written')
