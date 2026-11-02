const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT id, name, active FROM workflow_entity", (err, rows) => {
  if (err) { console.error('ERR', err); return; }
  console.log('WORKFLOWS:');
  for (const r of rows) console.log(`  ${r.id} | active=${r.active} | ${r.name}`);
  db.all("SELECT id, name, type FROM credentials_entity", (err2, creds) => {
    if (err2) { console.error('ERR2', err2); return; }
    console.log('CREDENTIALS:');
    for (const c of creds) console.log(`  ${c.id} | ${c.name} | ${c.type}`);
    db.all("SELECT id, workflowId, status, startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 12", (err3, execs) => {
      if (err3) { console.error('ERR3', err3); return; }
      console.log('RECENT EXECUTIONS:');
      for (const e of execs) console.log(`  ${e.id} | wf=${e.workflowId} | ${e.status} | ${e.startedAt}`);
      db.close();
    });
  });
});