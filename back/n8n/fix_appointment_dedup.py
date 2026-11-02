"""Fix appointment workflow to include dedup_key."""
import json

WORKFLOW_PATH = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows\appointment-reminders-with-notifications.json'

CREATE_NOTIF_JSONBODY = """={
  "patient_id": {{ $json.patient_id }},
  "title": "{{ $json.title }}",
  "message": "{{ $json.message }}",
  "type": "appointment_reminder",
  "related_entity_id": {{ $json.appointment_id }},
  "related_entity_type": "appointment",
  "reminder_type": "{{ $json.reminder_type }}",
  "dedup_key": "{{ $json.dedup_key }}"
}"""


def main():
    with open(WORKFLOW_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for node in data['nodes']:
        if node['name'] == 'Create Patient Notification':
            node['parameters']['jsonBody'] = CREATE_NOTIF_JSONBODY
            print('Updated Create Patient Notification node with dedup_key')
            break

    with open(WORKFLOW_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print('Appointment workflow saved successfully')


if __name__ == '__main__':
    main()
