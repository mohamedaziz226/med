#!/bin/sh
# Print full error details for executions listed in /tmp/exec_ids.txt (JSON array)
export NODE_PATH=/usr/local/lib/node_modules
node -e "
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3').verbose();
const fs = require('fs');
const ids = JSON.parse(fs.readFileSync('/tmp/exec_ids.txt', 'utf8'));
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.serialize(() => {
for (const id of ids) {
  db.all('SELECT workflowId, status FROM execution_entity WHERE id=?', [id], (err, rows) => {
    console.log('EXEC ' + id + ' meta:', err ? ('ERR ' + err.message) : JSON.stringify(rows));
  });
  db.all('SELECT length(data) AS len, data FROM execution_data WHERE executionId=?', [id], (err, rows) => {
    if (err) { console.log('  data query ERR:', err.message); return; }
    if (!rows || !rows.length || !rows[0].data) { console.log('  no data row'); return; }
    console.log('  data len:', rows[0].len);
    let d;
    try { d = JSON.parse(rows[0].data); } catch (ex) { console.log('  parse err:', ex.message); return; }
    console.log('  TOP keys:', Object.keys(d).join(','));
    const rd = d.resultData || {};
    console.log('  resultData keys:', Object.keys(rd).join(','));
    console.log('  DATA HEAD:', JSON.stringify(d).slice(0, 1200));

  });
}
});
setTimeout(() => process.exit(0), 10000);
"
