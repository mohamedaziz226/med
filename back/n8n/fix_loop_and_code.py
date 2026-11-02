"""Fix Loop Appointments connections (numeric outputs) and Calculate Debt return value."""
import json

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'

# --- Fix 1: appointment workflow — numeric output connections for Loop Appointments v3
APPT = f'{BASE}\\appointment-reminders-with-notifications.json'
with open(APPT, 'r', encoding='utf-8') as f:
    appt = json.load(f)

appt['connections']['Loop Appointments'] = {
    'main': [
        [{'node': 'End', 'type': 'main', 'index': 0}],          # output 0 = done
        [{'node': 'Get Patient', 'type': 'main', 'index': 0}],  # output 1 = loop
    ]
}
with open(APPT, 'w', encoding='utf-8') as f:
    json.dump(appt, f, ensure_ascii=False, indent=2)
print('appointment: Loop Appointments connections -> numeric (0=done, 1=loop)')

# --- Fix 2: debt workflow — Calculate Debt must return a single object (runOnceForEachItem)
DEBT = f'{BASE}\\debt-reminders-with-notifications.json'
with open(DEBT, 'r', encoding='utf-8') as f:
    debt = json.load(f)

for node in debt['nodes']:
    if node['name'] == 'Calculate Debt':
        code = node['parameters']['jsCode']
        old_ret = 'return [{\n  json: {'
        new_ret = 'return {\n  json: {'
        if old_ret in code:
            # replace trailing "}]" of the return with "}"
            start = code.index(old_ret)
            end = code.index('}];', start)
            code = code[:start] + code[start:end].replace(old_ret, new_ret) + '}' + code[end + 3:]
            node['parameters']['jsCode'] = code
            print('debt: Calculate Debt return -> single object')
        else:
            print('debt: WARNING return pattern not found — no change')
        break

with open(DEBT, 'w', encoding='utf-8') as f:
    json.dump(debt, f, ensure_ascii=False, indent=2)

# sanity: validate JSON
for p in (APPT, DEBT):
    json.load(open(p, encoding='utf-8'))
print('Done — JSON valid')
