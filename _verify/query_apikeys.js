const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT * FROM user_api_keys", (e, keys) => {
  if (e) console.error('api keys ERR', e); else { console.log('--- user_api_keys ---'); keys.forEach((r) => console.log(JSON.stringify(r))); }
  db.all("SELECT id, activeVersionId, isArchived FROM workflow_entity WHERE id IN ('TESTdebtWF0001','cIIOrjdhNGTPjwfJ','XEWOdpaklAxSNPts')", (e2, wfs) => {
    if (e2) console.error('wf ERR', e2); else { console.log('--- workflow essential ---'); wfs.forEach((r) => console.log(JSON.stringify(r))); }
    db.all("SELECT * FROM settings", (e3, sets) => {
      if (e3) console.error('settings ERR', e3); else { console.log('--- settings ---'); sets.forEach((r) => console.log(JSON.stringify(r))); }
      db.close();
    });
  });
});