const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT id, nodes, connections FROM workflow_entity WHERE id='cIIOrjdhNGTPjwfJ'", (err, rows) => {
  if (err) { console.error('ERR', err); return; }
  for (const r of rows) {
    const nodes = JSON.parse(r.nodes);
    for (const n of nodes) {
      if (n.type === 'n8n-nodes-base.code') {
        console.log(`\nNODE [${n.name}] jsCode:\n${n.parameters.jsCode}`);
      }
      if (n.type === 'n8n-nodes-base.httpRequest' && n.parameters && n.parameters.jsonBody) {
        console.log(`\nNODE [${n.name}] jsonBody:\n${n.parameters.jsonBody}`);
      }
      if (n.type === 'n8n-nodes-base.gmail') {
        console.log(`\nNODE [${n.name}] params:\n${JSON.stringify(n.parameters, null, 1)}`);
        console.log(`  creds: ${JSON.stringify(n.credentials)}`);
      }
    }
  }
  db.close();
});