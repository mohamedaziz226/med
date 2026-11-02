"""Fix node references after 'Check Dedup Key' HTTP node (which only returns {exists}).

Send/Create nodes must reference upstream nodes instead of $json so that
patient_email / title / gmail_html survive the dedup check.
"""
import json

BASE = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows'

FIXES = {
    f'{BASE}\\appointment-reminders-with-notifications.json': {
        'Send a Message': {
            'toEmail': "={{ $('Prepare Reminders').first().json.patient_email }}",
            'subject': "={{ $('Prepare Reminders').first().json.title }}",
            'html': "={{ $('Prepare Reminders').first().json.gmail_html }}",
        },
        'Create Patient Notification': {
            'sendBody': True,
            'specifyBody': 'json',
            'jsonBody': (
                '={{ JSON.stringify({'
                "patient_id: $('Prepare Reminders').first().json.patient_id, "
                "title: $('Prepare Reminders').first().json.title, "
                "message: $('Prepare Reminders').first().json.message, "
                "type: 'APPOINTMENT_REMINDER', "
                "related_entity_id: $('Prepare Reminders').first().json.appointment_id, "
                "related_entity_type: 'appointment', "
                "reminder_type: $('Prepare Reminders').first().json.notification_type, "
                "dedup_key: $('Prepare Reminders').first().json.dedup_key }) }}"
            ),
        },
    },
    f'{BASE}\\debt-reminders-with-notifications.json': {
        'Send Debt Reminder Email': {
            'toEmail': "={{ $('Generate Debt Reminder Message').first().json.patient_email }}",
            'subject': "={{ $('Generate Debt Reminder Message').first().json.title }}",
            'html': "={{ $('Generate Debt Reminder Message').first().json.gmail_html }}",
        },
        'Create Patient Notification': {
            'sendBody': True,
            'specifyBody': 'json',
            'jsonBody': (
                '={{ JSON.stringify({'
                "patient_id: $('Generate Debt Reminder Message').first().json.patient_id, "
                "title: $('Generate Debt Reminder Message').first().json.title, "
                "message: $('Generate Debt Reminder Message').first().json.message, "
                "type: 'DEBT_REMINDER', "
                "related_entity_id: $('Generate Debt Reminder Message').first().json.appointment_id, "
                "related_entity_type: 'appointment', "
                "reminder_type: $('Generate Debt Reminder Message').first().json.notification_type, "
                "dedup_key: $('Generate Debt Reminder Message').first().json.dedup_key }) }}"
            ),
        },
    },
}

for path, node_fixes in FIXES.items():
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for node in data['nodes']:
        if node['name'] in node_fixes:
            node['parameters'].update(node_fixes[node['name']])
            print(f"{path.split(chr(92))[-1]}: updated '{node['name']}'")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print('Done')
