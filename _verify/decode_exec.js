/** Décode une exécution n8n 2.x (format flatted) et extrait runData.
 * Usage: node decode_exec.js <fichier_json_flatted>
 */
const fs = require('fs');
const { parse } = require('/usr/local/lib/node_modules/n8n/node_modules/.pnpm/flatted@3.4.2/node_modules/flatted');

const file = process.argv[2];
let raw = fs.readFileSync(file, 'utf8');
raw = raw.trim();
// La donnée peut être déjà un JSON flatted (tableau) ou une string JSON imbriquée
let data = JSON.parse(raw);
if (typeof data === 'string') data = JSON.parse(data);
const parsed = parse(data);

const execData =
  parsed.executionData && parsed.executionData.runData
    ? parsed.executionData
    : parsed.resultData || parsed;

const runData = execData.runData || {};
const out = { lastNodeExecuted: execData.lastNodeExecuted, nodes: {} };

for (const [nodeName, runs] of Object.entries(runData)) {
  out.nodes[nodeName] = runs.map((r) => {
    const summary = { outputs: [], error: r.error || null };
    const main = (r.data && r.data.main) || [];
    for (const branch of main) {
      if (!branch) {
        summary.outputs.push(null);
        continue;
      }
      summary.outputs.push(
        branch.map((it) => {
          const j = it.json || {};
          const pick = {};
          for (const k of [
            'id', 'patient_id', 'appointment_id', 'appointment_scheduled_at',
            'patient_email', 'patient_name', 'debt', 'daysUntil', 'reminder_type',
            'title', 'message', 'appointment_date', 'access_token', 'token_type',
            'status', 'scheduled_at', 'email', 'first_name', 'last_name', 'threadId',
            'idLabel', 'amount', 'amount_paid', 'reminder_sent_count',
          ]) {
            if (k in j) pick[k] = j[k];
          }
          return pick;
        })
      );
    }
    return summary;
  });
}
console.log(JSON.stringify(out, null, 1));

