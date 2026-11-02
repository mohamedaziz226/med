import json, urllib.request
from urllib.parse import quote

BASE = 'http://localhost:8080/api/v1'
PAYMENT_ID = 3  # TEST DebtJ10 — patient 8, dette 200 DT

def call(url, data=None, token=None):
    h = {'Content-Type': 'application/json'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data is not None else None,
        headers=h,
        method='POST' if data is not None else 'GET',
    )
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return json.loads(body) if body else None

# 1) Connexion médecin (staff autorisé à relancer)
tok = call(BASE + '/auth/login', {'email': 'dr@med.com', 'password': 'med2026'})['access_token']

# 2) Envoyer la relance avec le message de la modale
note = 'Relance pour solde restant dû de 200 DT pour actes médicaux.'
updated = call(BASE + '/payments/%s/remind?note=%s' % (PAYMENT_ID, quote(note)),
               data={}, token=tok)
print('RELANCE ENVOYEE | compteur:', updated.get('reminder_sent_count'),
      '| last_reminder_at:', updated.get('last_reminder_at'))
print('patient_id:', updated.get('patient_id'))
