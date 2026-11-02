const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
// Dump the stored workflow JSON for both workflows
db.all("SELECT id, name, active, nodes, connections FROM workflow_entity", (err, rows) => {
  if (err) { console.error('ERR', err); return; }
  for (const r of rows) {
    console.log(`\n===== WORKFLOW ${r.id} | active=${r.active} | ${r.name} =====`);
    try {
      const nodes = JSON.parse(r.nodes);
      for (const n of nodes) {
        const creds = n.credentials ? JSON.stringify(n.credentials) : '';
        const jsonBody = n.parameters && n.parameters.jsonBody ? 'jsonBody=' + JSON.stringify(n.parameters.jsonBody) : '';
        console.log(`  NODE [${n.name}] type=${n.type} id=${n.id}${creds ? ' creds=' + creds : ''}${jsonBody ? ' | ' + jsonBody : ''}`);
      }
      const conns = JSON.parse(r.connections);
      for (const [from, val] of Object.entries(conns)) {
        const outs = (val.main || []).map((arr, idx) => `${idx}:` + (arr || []).map(c => `${c.node}#${c.type}${c.index}`).join(',')).join(' | ');
        console.log(`  CONN ${from} => [${outs}]`);
      }
    } catch (e) { console.log('PARSE ERR', e.message); }
  }
  db.close();
});