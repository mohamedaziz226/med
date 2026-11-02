"""Update debt reminders workflow."""
import json

WORKFLOW_PATH = r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json'

# JavaScript code for Calculate Debt node
CALC_DEBT_JS = """// Recupere les paiements du patient + calcule la dette
const apt = $('Loop Appointments').item.json;
const patient = $json;

const st = String(apt.status || '').toLowerCase();
const eligible = (st === 'confirmed' || st === 'pending');

let debt = 0;
if (eligible) {
  try {
    const token = $('Login Backend').first().json.access_token;
    const res = await $http.request({
      method: 'GET',
      url: `${$env.MED_BACKEND_URL}/api/v1/payments?patient_id=${apt.patient_id}`,
      headers: { Authorization: `Bearer ${token}` }
    });
    const payments = Array.isArray(res.data) ? res.data : [];
    for (const p of payments) {
      debt += (Number(p.amount) || 0) - (Number(p.amount_paid) || 0);
    }
  } catch (e) {
    debt = 0;
  }
}
debt = Math.round(debt * 100) / 100;

return [{
  json: {
    patient_id: apt.patient_id,
    appointment_id: apt.id,
    appointment_scheduled_at: apt.scheduled_at,
    patient_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient',
    patient_email: patient.email || '',
    debt
  }
}];"""

# JavaScript code for Generate Debt Reminder Message node
GENERATE_DEBT_JS = """// Calcule le jour du rappel J-15 / J-10 et genere le message.
const item = $json;

const now = new Date();
now.setHours(0, 0, 0, 0);
const d = new Date(item.appointment_scheduled_at);
d.setHours(0, 0, 0, 0);
const daysUntil = Math.round((d - now) / 86400000);

let reminder_type = null;
let notification_type = null;
if (daysUntil === 15) { reminder_type = 'j15'; notification_type = 'DEBT_REMINDER_15'; }
else if (daysUntil === 10) { reminder_type = 'j10'; notification_type = 'DEBT_REMINDER_10'; }

if (!reminder_type) {
  return [{ json: { ...item, reminder_type: null } }];
}

const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const debtStr = Number(item.debt).toFixed(2);

// Sujets d'email selon la demande
const subject = reminder_type === 'j15'
  ? 'Rappel de paiement - J-15'
  : 'Rappel de paiement - J-10';

const typeLabel = reminder_type === 'j15' ? 'Rappel 15 jours avant' : 'Rappel 10 jours avant';

const message = `Bonjour ${item.patient_name}, nous vous informons qu'un montant de ${debtStr} DT reste à régler sur votre dossier. Votre prochain rendez-vous est prévu le ${dateStr} à ${timeStr}. Type: ${typeLabel}.`;

const gmail_html = `<html><body>
<h2>Rappel de paiement</h2>
<p>Bonjour <strong>${item.patient_name}</strong>,</p>
<p>Nous vous informons qu'un montant de <strong>${debtStr} DT</strong> reste à régler sur votre dossier.</p>
<ul>
<li><strong>Date du rendez-vous:</strong> ${dateStr}</li>
<li><strong>Heure:</strong> ${timeStr}</li>
<li><strong>Montant restant:</strong> ${debtStr} DT</li>
<li><strong>Type de notification:</strong> ${typeLabel}</li>
</ul>
<p>Nous vous invitons à régulariser votre situation avant cette date.</p>
<p>Cordialement,<br/>MedSecretariat</p>
</body></html>`;

// Destinataire test pendant la phase de test
const TEST_EMAIL = 'azizzeiri7@gmail.com';
const useTestEmail = true;
const toEmail = useTestEmail ? TEST_EMAIL : (item.patient_email || TEST_EMAIL);

return [{
  json: {
    ...item,
    patient_email: toEmail,
    title: subject,
    message: message,
    gmail_html: gmail_html,
    reminder_type: reminder_type,
    notification_type: notification_type,
    dedup_key: `appointment:${item.patient_id}:${item.appointment_id}:${notification_type}`
  }
}];"""

# JSON body for Create Patient Notification node
CREATE_NOTIF_JSONBODY = """={
  "patient_id": {{ $json.patient_id }},
  "title": "{{ $json.title }}",
  "message": "{{ $json.message }}",
  "type": "debt_reminder",
  "related_entity_id": {{ $json.appointment_id }},
  "related_entity_type": "appointment",
  "reminder_type": "{{ $json.reminder_type }}",
  "dedup_key": "{{ $json.dedup_key }}"
}"""


def main():
    with open(WORKFLOW_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for node in data['nodes']:
        # Update Calculate Debt node
        if node['name'] == 'Calculate Debt':
            node['parameters']['jsCode'] = CALC_DEBT_JS
            print('Updated Calculate Debt node')

        # Update Generate Debt Reminder Message node
        if node['name'] == 'Generate Debt Reminder Message':
            node['parameters']['jsCode'] = GENERATE_DEBT_JS
            print('Updated Generate Debt Reminder Message node')

        # Update Send Debt Reminder Email node to use Gmail OAuth2
        if node['name'] == 'Send Debt Reminder Email':
            node['type'] = 'n8n-nodes-base.gmail'
            node['typeVersion'] = 2.2
            node['parameters'] = {
                'operation': 'send',
                'message': {
                    'to': '={{ $json.patient_email }}',
                    'subject': '={{ $json.title }}',
                    'emailType': 'html',
                    'message': '={{ $json.gmail_html }}'
                },
                'options': {}
            }
            node['credentials'] = {
                'gmailOAuth2': {
                    'id': 'CaiZmZzshoECZ5OO',
                    'name': 'Gmail account'
                }
            }
            print('Updated Send Debt Reminder Email node to Gmail OAuth2')

        # Update Create Patient Notification node
        if node['name'] == 'Create Patient Notification':
            node['parameters']['jsonBody'] = CREATE_NOTIF_JSONBODY
            print('Updated Create Patient Notification node')

    with open(WORKFLOW_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print('Debt workflow saved successfully')


if __name__ == '__main__':
    main()
