const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT id, nodes, connections FROM workflow_entity WHERE id='TESTdebtWF0001'", (err, rows) => {
  if (err) { console.error('ERR', err); return; }
  for (const r of rows) {
    const nodes = JSON.parse(r.nodes);
    for (const n of nodes) {
      console.log(`\n===== NODE [${n.name}] (${n.type}) =====`);
      // Print full parameters for webhook, code nodes, email node, http notification node
      if (['n8n-nodes-base.webhook', 'n8n-nodes-base.code', 'n8n-nodes-base.emailSend', 'n8n-nodes-base.httpRequest'].includes(n.type)) {
        const p = n.parameters;
        if (n.type === 'n8n-nodes-base.webhook') console.log(JSON.stringify(p, null, 1));
        else if (n.type === 'n8n-nodes-base.code') console.log('jsCode:\n' + p.jsCode);
        else if (n.type === 'n8n-nodes-base.emailSend') console.log(JSON.stringify(p, null, 1));
        else if (n.type === 'n8n-nodes-base.httpRequest') {
          const copy = { ...p };
          if (typeof copy.jsonBody === 'string' && copy.jsonBody.startsWith('=')) {
            // Show the resolved expression with visible newlines
            console.log('method:', copy.method, 'url:', copy.url);
            console.log('jsonBody RAW (escaped):\n' + JSON.stringify(copy.jsonBody));
          } else console.log(JSON.stringify(copy, null, 1));
        }
      }
    }
  }
  db.close();
});