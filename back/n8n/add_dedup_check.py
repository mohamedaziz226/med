"""Insert dedup-check nodes before email sending + fix debt time formatting.

New flow (both workflows), inside the loop after the eligibility IF:
  IF Eligible -> Check Dedup Key (HTTP GET /notifications/dedup-exists)
              -> IF Not Already Sent -> Send Email -> Create Notification -> Loop
                                      \-> Loop (already sent)
Also fixes 'Generate Debt Reminder Message' timeStr computed on the zeroed date.
"""
import json

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'

TARGETS = [
    (f'{BASE}\\appointment-reminders-with-notifications.json',
     'If Reminder Day (J-7 / J-1)', 'Send a Message', 'Create Patient Notification',
     'Prepare Reminders', 'Loop Appointments'),
    (f'{BASE}\\debt-reminders-with-notifications.json',
     'IF Eligible Reminder', 'Send Debt Reminder Email', 'Create Patient Notification',
     'Generate Debt Reminder Message', 'Loop Appointments'),
]


def patch(path, if_name, email_name, notif_name, source_node, loop_name, x):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    names = [n['name'] for n in data['nodes']]

    # 1) insert Check Dedup Key + IF Not Already Sent nodes
    if 'Check Dedup Key' not in names:
        data['nodes'].append({
            'parameters': {
                'method': 'GET',
                'url': ('={{ $env.MED_BACKEND_URL }}/api/v1/notifications/dedup-exists'
                        f"?dedup_key={{{{ $('{source_node}').item.json.dedup_key }}}}"),
                'sendHeaders': True,
                'headerParameters': {'parameters': [{
                    'name': 'Authorization',
                    'value': "=Bearer {{ $('Login Backend').first().json.access_token }}",
                }]},
                'options': {},
            },
            'id': f'check-dedup-{x}',
            'name': 'Check Dedup Key',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [x, 420],
        })
        data['nodes'].append({
            'parameters': {
                'conditions': {
                    'options': {'caseSensitive': True, 'leftValue': '',
                                'typeValidation': 'loose'},
                    'conditions': [{
                        'id': f'cond-not-sent-{x}',
                        'leftValue': '={{ $json.exists }}',
                        'rightValue': '',
                        'operator': {'type': 'boolean', 'operation': 'false',
                                     'singleValue': True},
                    }],
                },
                'options': {},
            },
            'id': f'if-not-sent-{x}',
            'name': 'IF Not Already Sent',
            'type': 'n8n-nodes-base.if',
            'typeVersion': 2,
            'position': [x + 220, 420],
        })
        # rewire: IF Eligible -> Check Dedup Key -> IF Not Already Sent
        data['connections'][if_name] = {
            'main': [[{'node': 'Check Dedup Key', 'type': 'main', 'index': 0}],
                     [{'node': loop_name, 'type': 'main', 'index': 0}]]
        }
        data['connections']['Check Dedup Key'] = {
            'main': [[{'node': 'IF Not Already Sent', 'type': 'main', 'index': 0}]]
        }
        data['connections']['IF Not Already Sent'] = {
            'main': [[{'node': email_name, 'type': 'main', 'index': 0}],
                     [{'node': loop_name, 'type': 'main', 'index': 0}]]
        }
        print(f'{path.split(chr(92))[-1]}: dedup check inserted')
    else:
        print(f'{path.split(chr(92))[-1]}: dedup check already present')

    # 2) fix debt time formatting (computed on zeroed date -> 00:00)
    for node in data['nodes']:
        if node['name'] == 'Generate Debt Reminder Message':
            code = node['parameters']['jsCode']
            if 'const dFull' not in code:
                code = code.replace(
                    "const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });",
                    "const dFull = new Date(item.appointment_scheduled_at);\n"
                    "const timeStr = dFull.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });",
                )
                node['parameters']['jsCode'] = code
                print('debt: timeStr fixed (uses original timestamp)')

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


for i, t in enumerate(TARGETS):
    patch(*t, 300 if i == 0 else 500)

for t in TARGETS:
    json.load(open(t[0], encoding='utf-8'))
print('Done - JSON valid')
