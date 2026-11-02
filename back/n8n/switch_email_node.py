"""Switch email nodes between Gmail OAuth2 (production) and SMTP Mailpit (tests).

Usage:
    python switch_email_node.py smtp    -> n8n-nodes-base.emailSend via Mailpit (tests)
    python switch_email_node.py gmail   -> n8n-nodes-base.gmail via OAuth2 (production)
"""
import json
import sys

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'

GMAIL_CRED = {'gmailOAuth2': {'id': 'CaiZmZzshoECZ5OO', 'name': 'Gmail account'}}
SMTP_CRED = {'smtp': {'id': 'TEST-smtp-cred-0001', 'name': 'TEST SMTP Mailpit'}}

# name -> (workflow file, gmail parameters as configured for production)
GMAIL_NODES = {
    'Send a Message': (
        f'{BASE}\\appointment-reminders-with-notifications.json',
        {
            'operation': 'send',
            'message': {
                'to': '={{ $json.patient_email }}',
                'subject': '={{ $json.title }}',
                'emailType': 'html',
                'message': '={{ $json.gmail_html }}',
            },
            'options': {},
        },
    ),
    'Send Debt Reminder Email': (
        f'{BASE}\\debt-reminders-with-notifications.json',
        {
            'operation': 'send',
            'message': {
                'to': '={{ $json.patient_email }}',
                'subject': '={{ $json.title }}',
                'emailType': 'html',
                'message': '={{ $json.gmail_html }}',
            },
            'options': {},
        },
    ),
}

SMTP_PARAMS = {
    'operation': 'send',
    'fromEmail': 'noreply@medsecretariat.test',
    'fromName': 'MedSecretariat',
    'toEmail': '={{ $json.patient_email }}',
    'subject': '={{ $json.title }}',
    'emailFormat': 'html',
    'html': '={{ $json.gmail_html }}',
    'options': {},
}


def switch(mode: str) -> None:
    seen = set()
    for node_name, (path, gmail_params) in GMAIL_NODES.items():
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for node in data['nodes']:
            if node['name'] == node_name:
                if mode == 'smtp':
                    node['type'] = 'n8n-nodes-base.emailSend'
                    node['typeVersion'] = 2
                    node['parameters'] = dict(SMTP_PARAMS)
                    node['credentials'] = dict(SMTP_CRED)
                else:
                    node['type'] = 'n8n-nodes-base.gmail'
                    node['typeVersion'] = 2.1
                    node['parameters'] = json.loads(json.dumps(gmail_params))
                    node['credentials'] = dict(GMAIL_CRED)
                seen.add(node_name)
                print(f'{path.split(chr(92))[-1]}: {node_name} -> {mode}')
                break
        else:
            print(f'WARNING: node "{node_name}" not found in {path}')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print('Done')


if __name__ == '__main__':
    switch(sys.argv[1] if len(sys.argv) > 1 else 'smtp')
