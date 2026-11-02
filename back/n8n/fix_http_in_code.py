"""Fix both workflows: remove $http from Code nodes (unsupported in n8n sandbox).

1. Appointment workflow: 'Prepare Reminders' uses apt.doctor_name (backend property).
2. Debt workflow: insert 'Get Patient Payments' (HTTP) + 'Aggregate Payments' nodes,
   rewrite 'Calculate Debt' to read payments from the aggregated item.
"""
import json

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'

# ---------------------------------------------------------------- appointment
APPT = f'{BASE}\\appointment-reminders-with-notifications.json'
with open(APPT, 'r', encoding='utf-8') as f:
    appt = json.load(f)

for node in appt['nodes']:
    if node['name'] == 'Prepare Reminders':
        code = node['parameters']['jsCode']
        start = code.index('let doctorName =')
        end = code.index("doctorName = doctorName || 'Médecin';")
        code = (
            code[:start]
            + "let doctorName = apt.doctor_name || 'Médecin';\n\n"
            + code[end:]
        )
        node['parameters']['jsCode'] = code
        print('appointment: Prepare Reminders -> uses apt.doctor_name (no $http)')
        break

with open(APPT, 'w', encoding='utf-8') as f:
    json.dump(appt, f, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- debt
DEBT = f'{BASE}\\debt-reminders-with-notifications.json'
with open(DEBT, 'r', encoding='utf-8') as f:
    debt = json.load(f)

names = [n['name'] for n in debt['nodes']]
if 'Get Patient Payments' not in names:
    debt['nodes'].append({
        'parameters': {
            'method': 'GET',
            'url': '={{ $env.MED_BACKEND_URL }}/api/v1/payments?patient_id={{ $json.id }}',
            'sendHeaders': True,
            'headerParameters': {
                'parameters': [{
                    'name': 'Authorization',
                    'value': '=Bearer {{ $(\'Login Backend\').first().json.access_token }}',
                }]
            },
            'options': {},
        },
        'id': 'get-patient-payments-1',
        'name': 'Get Patient Payments',
        'type': 'n8n-nodes-base.httpRequest',
        'typeVersion': 4.2,
        'position': [240, 200],
        'alwaysOutputData': True,
    })
    debt['nodes'].append({
        'parameters': {
            'aggregate': 'aggregateAllItemData',
            'destinationFieldName': 'payments',
            'options': {},
        },
        'id': 'aggregate-payments-1',
        'name': 'Aggregate Payments',
        'type': 'n8n-nodes-base.aggregate',
        'typeVersion': 1,
        'position': [460, 200],
    })
    # rewire: Get Patient -> Get Patient Payments -> Aggregate Payments -> Calculate Debt
    debt['connections']['Get Patient'] = {
        'main': [[{'node': 'Get Patient Payments', 'type': 'main', 'index': 0}]]
    }
    debt['connections']['Get Patient Payments'] = {
        'main': [[{'node': 'Aggregate Payments', 'type': 'main', 'index': 0}]]
    }
    debt['connections']['Aggregate Payments'] = {
        'main': [[{'node': 'Calculate Debt', 'type': 'main', 'index': 0}]]
    }
    print('debt: inserted Get Patient Payments + Aggregate Payments nodes')

for node in debt['nodes']:
    if node['name'] == 'Calculate Debt':
        node['parameters']['jsCode'] = """// Calcule la dette du patient courant (paiements aggrégés)
const apt = $('Loop Appointments').first().json;
const patient = $('Get Patient').first().json;

const st = String(apt.status || '').toLowerCase();
const eligible = (st === 'confirmed' || st === 'pending');

let debt = 0;
if (eligible) {
  const arr = Array.isArray($json.payments) ? $json.payments : [];
  for (const p of arr) {
    if (p && p.amount != null && p.amount !== undefined) {
      debt += (Number(p.amount) || 0) - (Number(p.amount_paid) || 0);
    }
  }
}
debt = Math.round(debt * 100) / 100;

return {
  json: {
    patient_id: apt.patient_id,
    appointment_id: apt.id,
    appointment_scheduled_at: apt.scheduled_at,
    patient_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient',
    patient_email: patient.email || '',
    debt
  }
};"""
        print('debt: Calculate Debt rewritten (reads aggregated payments)')
        break

with open(DEBT, 'w', encoding='utf-8') as f:
    json.dump(debt, f, ensure_ascii=False, indent=2)

for p in (APPT, DEBT):
    json.load(open(p, encoding='utf-8'))
print('Done — JSON valid')
