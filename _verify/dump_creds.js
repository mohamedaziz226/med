const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT id, name, type, data FROM credentials_entity", (err, rows) => {
  if (err) { console.error('ERR', err); return; }
  for (const r of rows) {
    console.log(`CRED [${r.id}] ${r.name} (${r.type})`);
    try {
      const d = JSON.parse(r.data);
      const keys = Object.keys(d);
      const out = {};
      for (const k of keys) {
        if (typeof d[k] === 'string' && (k.toLowerCase().includes('pass') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('apikey'))) out[k] = '***';
        else out[k] = d[k];
      }
      console.log('  data:', JSON.stringify(out));
    } catch (e) { console.log('  RAW:', r.data); }
  }
  db.close();
});