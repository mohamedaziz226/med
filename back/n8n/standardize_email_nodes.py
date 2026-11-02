"""Standardize email nodes on both workflows:
- explicit node references ($('X').first().json)
- TEST redirect: all emails to azizzeiri7@gmail.com
- correct SMTP credentials (TEST-smtp-cred-0001)
"""
import json

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'
TEST_EMAIL = 'azizzeiri7@gmail.com'
SMTP_CRED = {'smtp': {'id': 'TEST-smtp-cred-0001', 'name': 'TEST SMTP Mailpit'}}

TARGETS = [
    (f'{BASE}\\appointment-reminders-with-notifications.json', 'Send a Message',
     'Prepare Reminders'),
    (f'{BASE}\\debt-reminders-with-notifications.json', 'Send Debt Reminder Email',
     'Generate Debt Reminder Message'),
]

for path, node_name, ref_node in TARGETS:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for node in data['nodes']:
        if node['name'] == node_name:
            node['type'] = 'n8n-nodes-base.emailSend'
            node['typeVersion'] = 2.1
            node['parameters'] = {
                'fromEmail': 'MedSecretariat <noreply@medsecretariat.test>',
                'toEmail': TEST_EMAIL,
                'subject': f"={{{{ $('{ref_node}').first().json.title }}}}",
                'emailFormat': 'html',
                'html': f"={{{{ $('{ref_node}').first().json.gmail_html }}}}",
                'options': {},
            }
            node['credentials'] = dict(SMTP_CRED)
            print(f'{path.split(chr(92))[-1]}: {node_name} standardized (to={TEST_EMAIL})')
            break
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

for p, *_ in TARGETS:
    json.load(open(p, encoding='utf-8'))
print('Done — JSON valid')
