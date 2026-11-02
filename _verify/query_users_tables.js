const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (e, r) => {
  if (e) { console.error(e); return; }
  console.log('ALL TABLES:');
  r.forEach((t) => console.log(' ', t.name));
  db.all("PRAGMA table_info(user)", (e2, cols) => {
    if (!e2) { console.log('--- user columns ---'); cols.forEach((c) => console.log(' ', c.name)); }
    db.all("SELECT id, email, firstName, lastName FROM user", (e3, us) => {
      if (!e3) { console.log('--- USERS ---'); us.forEach((u) => console.log(' ', JSON.stringify(u))); }
      db.close();
    });
  });
});