#!/bin/sh
# Print full error details for executions listed in /tmp/exec_ids.txt (JSON array)
export NODE_PATH=/usr/local/lib/node_modules
node -e "
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3').verbose();
const fs = require('fs');
const ids = JSON.parse(fs.readFileSync('/tmp/exec_ids.txt', 'utf8'));
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
process.on('exit', () => {});
setTimeout(() => process.exit(0), 8000);

for (const id of ids) {
  db.get('SELECT workflowId, status FROM execution_entity WHERE id=?', [id], (err, meta) => {
    console.log('='.repeat(70));
    console.log('EXEC ' + id + ':', JSON.stringify(meta));
    db.get('SELECT data FROM execution_data WHERE executionId=?', [id], (e2, row) => {
      if (e2 || !row) { console.log('  no data', e2 ? e2.message : ''); return; }
      const d = JSON.parse(row.data);
      const runs = (d.resultData || {}).runData || {};
      for (const [name, rs] of Object.entries(runs)) {
        for (const r of rs) {
          const e = r.error;
          if (!e) continue;
          console.log('--- node \"' + name + '\" ---');
          console.log('name:', e.name);
          console.log('message:', e.message);
          console.log('description:', e.description);
          console.log('httpCode:', e.httpCode);
        }
      }
    });
  });
}
"
