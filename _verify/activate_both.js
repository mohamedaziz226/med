const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');
db.serialize(() => {
  db.run("UPDATE workflow_entity SET active = 1 WHERE id = 'TESTdebtWF0001'", function (err) {
    if (err) { console.error('Update TEST err:', err.message); }
    else { console.log('TEST active updated:', this.changes); }
  });
  db.run("UPDATE workflow_entity SET active = 1 WHERE id = 'cIIOrjdhNGTPjwfJ'", function (err) {
    if (err) { console.error('Update PROD err:', err.message); }
    else { console.log('PROD active updated:', this.changes); }
  });
  db.all("SELECT id, name, active FROM workflow_entity ORDER BY id", (err, rows) => {
    if (err) { console.error(err); }
    else { console.log('AFTER:', JSON.stringify(rows)); }
    db.close();
  });
});