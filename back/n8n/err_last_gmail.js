const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/home/node/.n8n/database.sqlite');
const id = db.prepare("SELECT MAX(id) m FROM execution_entity WHERE workflowId='ZzTESTGmail001'").get().m;
const row = db.prepare('SELECT data FROM execution_data WHERE executionId=?').get(id);
let flatted;
try { flatted = require('flatted'); } catch (e) { flatted = require('/usr/local/lib/node_modules/n8n/node_modules/flatted'); }
const d = flatted.parse(String(row.data));
const runs = d.resultData.runData || {};
for (const [name, rs] of Object.entries(runs)) {
  for (const r of rs) {
    const e = r.error;
    if (!e) continue;
    console.log('=== node:', name, '===');
    console.log('name:', e.name);
    console.log('message:', e.message);
    console.log('description:', e.description);
    console.log('httpCode:', e.httpCode);
    console.log('causes:', JSON.stringify(e.causes || null));
  }
}