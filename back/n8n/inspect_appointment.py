import json

path = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows\appointment-reminders-with-notifications.json'
with open(path, encoding='utf-8') as f:
    data = json.load(f)

for n in data['nodes']:
    nm = n['name']
    if nm in ('Send a Message', 'Webhook (Test)', 'Create Patient Notification', 'If Reminder Day (J-7 / J-1)', 'Check Dedup Key', 'IF Not Already Sent'):
        print(f'=== Node: {nm} ===')
        print(f'type: {n["type"]}')
        print(f'id: {n.get("id", "?")}')
        params = n.get('parameters', {})
        for k, v in params.items():
            if k == 'jsCode':
                print(f'{k}: (jsCode, len={len(v)})')
            elif k in ('sendTo', 'subject', 'message', 'toEmail', 'html'):
                print(f'{k}: {v}')
            else:
                print(f'{k}: {json.dumps(v)[:200]}')
        if 'credentials' in n:
            print('credentials:', json.dumps(n['credentials']))
        print()