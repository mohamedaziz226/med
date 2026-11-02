const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const fs = require('fs');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.get("SELECT executionId, workflowData, data FROM execution_data WHERE executionId = 1", (e, row) => {
  if (e) { console.error('ERR', e); return; }
  if (!row) { console.log('NO DATA ROW'); db.close(); return; }
  console.log('executionId:', row.executionId);
  console.log('workflowData len:', (row.workflowData || '').length);
  console.log('data len:', (row.data || '').length);
  try {
    const parsed = JSON.parse(row.data);
    fs.writeFileSync('/tmp/exec1.json', JSON.stringify(parsed, null, 1));
    console.log('WROTE /tmp/exec1.json');
    // quick summary of runData nodes
    if (parsed.runData) {
      for (const [nodeName, runs] of Object.entries(parsed.runData)) {
        const last = runs[runs.length - 1];
        const execS = Array.isArray(execS_placeholder) ? '' : '';
        console.log(`NODE ${nodeName}: runStatus=${last.executionStatus}`, last.error ? `ERROR: ${last.error.message}` : '');
      }
    }
    console.log('lastNodeExecuted:', parsed.lastNodeExecuted);
    console.log('resultData:', JSON.stringify(parsed.resultData)?.slice(0, 200));
  } catch (err) {
    console.log('JSON PARSE ERR:', err.message);
  }
  db.close();
});