import json

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'

# Appointment workflow
with open(f'{BASE}\\appointment-reminders-with-notifications.json', encoding='utf-8') as f:
    appt = json.load(f)

print("=== APPOINTMENT WORKFLOW ===")
for n in appt['nodes']:
    if n['name'] in ('Prepare Reminders', 'Send a Message', 'Generate Reminder Message'):
        print(f'--- Node: {n["name"]} ---')
        print(f'type: {n["type"]}')
        if 'jsCode' in n.get('parameters', {}):
            code = n['parameters']['jsCode']
            print('jsCode (first 800):', code[:800])
            if 'TEST_EMAIL' in code or 'azizzeiri7' in code:
                print('*** CONTAINS TEST_EMAIL ***')
        if 'credentials' in n:
            print('credentials:', n['credentials'])
        print('parameters keys:', list(n.get('parameters', {}).keys()))
        print()

# Debt workflow
with open(f'{BASE}\\debt-reminders-with-notifications.json', encoding='utf-8') as f:
    debt = json.load(f)

print("=== DEBT WORKFLOW ===")
for n in debt['nodes']:
    if n['name'] in ('Generate Debt Reminder Message', 'Send Debt Reminder Email', 'Calculate Debt', 'Aggregate Payments', 'Prepare Debt Reminders'):
        print(f'--- Node: {n["name"]} ---')
        print(f'type: {n["type"]}')
        if 'jsCode' in n.get('parameters', {}):
            code = n['parameters']['jsCode']
            print('jsCode (first 800):', code[:800])
            if 'TEST_EMAIL' in code or 'azizzeiri7' in code:
                print('*** CONTAINS TEST_EMAIL ***')
        if 'credentials' in n:
            print('credentials:', n['credentials'])
        print('parameters keys:', list(n.get('parameters', {}).keys()))
        print()