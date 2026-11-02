const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
let flatted;
try {
  flatted = require('flatted');
} catch (e) {
  flatted = require('/usr/local/lib/node_modules/n8n/node_modules/flatted');
}
const db = new DatabaseSync('/home/node/.n8n/database.sqlite');
let ids;
try { ids = JSON.parse(fs.readFileSync('/tmp/exec_ids.txt', 'utf8')); }
catch (e) {
  ids = db.prepare(
    "SELECT id FROM execution_entity WHERE workflowId IN ('TuKvVdtren4w6HHM','cIIOrjdhNGTPjwfJ','ZzTESTGmail001') ORDER BY id DESC LIMIT 4"
  ).all().map(r => r.id).reverse();
}
for (const id of ids) {
  const row = db.prepare('SELECT data FROM execution_data WHERE executionId=?').get(id);
  const meta = db.prepare('SELECT workflowId, status, startedAt FROM execution_entity WHERE id=?').get(id);
  console.log('='.repeat(70));
  console.log(`EXEC ${id}: workflow=${meta.workflowId} status=${meta.status} started=${meta.startedAt}`);
  if (!row) { console.log('  no data'); continue; }
  const d = flatted.parse(String(row.data));
  const rd = (d.resultData && typeof d.resultData === 'object') ? d.resultData : {};
  if (rd.error) console.log('  WORKFLOW ERROR:', JSON.stringify(rd.error).slice(0, 500));
  const runs = rd.runData || {};
  for (const [name, nr] of Object.entries(runs)) {
    for (const r of nr) {
      const err = r.error;
      const items = r.data && r.data.main
        ? r.data.main.reduce((a, b) => a + (b ? b.length : 0), 0) : 0;
      console.log(`  node "${name}" [${err ? 'ERROR' : 'ok'}] out_items=${items}`);
      if (err) console.log('    ->', JSON.stringify(err).slice(0, 500));
      const main = r.data && r.data.main;
      if (main && /If Reminder Day|Prepare Reminders/.test(name)) {
        main.forEach((branch, bi) => {
          if (branch) for (const it of branch) {
            console.log(`    branch[${bi}]: apt=${it.json.appointment_id} keys=${Object.keys(it.json).join(',')} reminder_type=${JSON.stringify(it.json.reminder_type)}`);
          }
        });
      }
    }
  }
}
