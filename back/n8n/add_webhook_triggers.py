"""Add a Webhook trigger to both production workflows for test execution."""
import json

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'

TARGETS = [
    (f'{BASE}\\appointment-reminders-with-notifications.json', 'appointment-reminders-exec'),
    (f'{BASE}\\debt-reminders-with-notifications.json', 'debt-reminders-exec'),
]

for path, hook_path in TARGETS:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    has_hook = any(n['type'] == 'n8n-nodes-base.webhook' for n in data['nodes'])
    if not has_hook:
        hook = {
            'parameters': {
                'httpMethod': 'POST',
                'path': hook_path,
                'responseMode': 'onReceived',
                'options': {},
            },
            'id': f'webhook-{hook_path}',
            'name': 'Webhook (Test)',
            'type': 'n8n-nodes-base.webhook',
            'typeVersion': 2,
            'position': [-1700, 200],
            'webhookId': f'wh-{hook_path}',
        }
        data['nodes'].append(hook)
        data['connections']['Webhook (Test)'] = {
            'main': [[{'node': 'Login Backend', 'type': 'main', 'index': 0}]]
        }
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'{hook_path}: webhook trigger added')
    else:
        print(f'{hook_path}: webhook already present')

print('Done')
