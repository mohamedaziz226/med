const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
console.log('--- workflow_entity columns ---');
db.all("PRAGMA table_info(workflow_entity)", (err, cols) => {
  if (err) console.error(err); else cols.forEach(c => console.log(`  ${c.name} (${c.type})`));
  console.log('--- full workflow rows ---');
  db.all("SELECT * FROM workflow_entity", (err2, rows) => {
    if (err2) console.error(err2);
    else for (const r of rows) console.log(JSON.stringify(r));
    console.log('--- tables ---');
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%project%' OR name LIKE '%shared%' OR name LIKE '%user%')", (err3, t3) => {
      if (err3) console.error(err3); else t3.forEach(t => console.log(' ', t.name));
      db.close();
    });
  });
});