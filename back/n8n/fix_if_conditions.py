"""Fix If-node conditions: replace empty/notEmpty operator (buggy without
singleValue flag in n8n If v2) with a boolean-true check."""
import json

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'

TARGETS = [
    (f'{BASE}\\appointment-reminders-with-notifications.json',
     'If Reminder Day (J-7 / J-1)'),
    (f'{BASE}\\debt-reminders-with-notifications.json',
     'IF Eligible Reminder'),
]

NEW_CONDITION = {
    'conditions': {
        'options': {
            'caseSensitive': True,
            'leftValue': '',
            'typeValidation': 'loose',
        },
        'conditions': [{
            'id': 'cond-reminder-set',
            'leftValue': '={{ Boolean($json.reminder_type) }}',
            'rightValue': '',
            'operator': {
                'type': 'boolean',
                'operation': 'true',
                'singleValue': True,
            },
        }],
    },
    'options': {},
}

for path, node_name in TARGETS:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for node in data['nodes']:
        if node['name'] == node_name:
            node['parameters'] = json.loads(json.dumps(NEW_CONDITION))
            print(f'{path.split(chr(92))[-1]}: {node_name} -> boolean-true condition')
            break
    else:
        print(f'WARNING: {node_name} not found in {path}')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print('Done')
