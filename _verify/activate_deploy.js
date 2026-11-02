const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');
db.serialize(() => {
  db.run("UPDATE workflow_entity SET active=1 WHERE id IN ('TESTdebtWF0001','cIIOrjdhNGTPjwfJ')", function (err) {
    if (err) console.error('UPDATE ERR:', err.message);
    else console.log('UPDATED:', this.changes);
  });
  db.all("SELECT id, active, versionId, activeVersionId FROM workflow_entity WHERE id IN ('TESTdebtWF0001','cIIOrjdhNGTPjwfJ')", (err, rows) => {
    if (err) console.error('SELECT ERR:', err.message);
    else for (const r of rows) console.log(`  ${r.id} active=${r.active} versionId=${r.versionId} activeVersionId=${r.activeVersionId}`);
    db.close();
  });
});