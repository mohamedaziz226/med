const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT id, name, active FROM workflow_entity ORDER BY id", (err, rows) => {
  if (err) { console.error('ERR', err); }
  else { for (const r of rows) console.log(`${r.id} | active=${r.active} | ${r.name}`); }
  db.close();
});