import json, io, sys

CODE_JS = r"""// Recupere les paiements du patient + calcule la dette = somme(amount - amount_paid)
// Renvoie TOUJOURS 1 item pour ne JAMAIS bloquer la boucle splitInBatches,
// meme si le statut est non eligible, si la reponse est vide ou si l'API echoue.
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
    // Une erreur HTTP ne doit jamais tuer la boucle : dette = 0 -> IF false -> on reboucle.
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


def main(paths):
    for p in paths:
        with io.open(p, 'r', encoding='utf-8') as f:
            wf = json.load(f)

        # 1) Build the new code v2 node
        new_node = {
            "parameters": {
                "mode": "runOnceForEachItem",
                "language": "javaScript",
                "jsCode": CODE_JS,
            },
            "id": "calc-debt",
            "name": "Calculate Debt",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [60, 0],
        }

        removed = []
        out_nodes = []
        for n in wf['nodes']:
            name = n.get('name')
            if name == 'Get Payments':
                removed.append('Get Payments')
                continue
            if name == 'Calculate Debt':
                # Replace old code v1 with the robust code v2
                out_nodes.append(new_node)
                continue
            out_nodes.append(n)
        wf['nodes'] = out_nodes

        # 2) Fix connections
        conns = wf['connections']
        if 'Get Patient' in conns and conns['Get Patient']['main'][0]:
            conns['Get Patient']['main'][0][0]['node'] = 'Calculate Debt'
        conns.pop('Get Payments', None)
        # Ensure "Calculate Debt" -> "IF Debt > 0" exists
        conns['Calculate Debt'] = {
            "main": [[{"node": "IF Debt > 0", "type": "main", "index": 0}]]
        }
        wf['connections'] = conns
        wf['active'] = True

        with io.open(p, 'w', encoding='utf-8') as f:
            json.dump(wf, f, ensure_ascii=False, indent=2)
        print('OK', p, '| removed:', removed, '| code nodes:', [n['name'] for n in wf['nodes'] if n['type'] == 'n8n-nodes-base.code'])


if __name__ == '__main__':
    main(sys.argv[1:])