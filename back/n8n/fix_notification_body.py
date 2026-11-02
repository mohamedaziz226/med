"""Fix 'Create Patient Notification' jsonBody: reference the upstream Code node
($json is empty after emailSend nodes overwrite the item)."""
import json

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'

TARGETS = [
    (f'{BASE}\\appointment-reminders-with-notifications.json',
     'Create Patient Notification', 'Prepare Reminders'),
    (f'{BASE}\\debt-reminders-with-notifications.json',
     'Create Patient Notification', 'Generate Debt Reminder Message'),
]

for path, node_name, source_node in TARGETS:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for node in data['nodes']:
        if node['name'] == node_name:
            body = node['parameters']['jsonBody']
            body = body.replace('{{ $json.', f"{{{{ $('{source_node}').item.json.")
            node['parameters']['jsonBody'] = body
            print(f'{path.split(chr(92))[-1]}: {node_name} -> source={source_node}')
            print(body[:400])
            break
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print('Done')
