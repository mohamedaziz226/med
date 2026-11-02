const path = '/home/node/.n8n/database.sqlite';

// Find and use n8n's bundled SQLite library
const DB_PATH = '/home/node/.n8n/database.sqlite';
const N8N_MODULES = '/usr/local/lib/node_modules/n8n/node_modules';

try {
  const sqlite3Path = `${N8N_MODULES}/.pnpm/sqlite3@5.1.7/node_modules/sqlite3`;
  const sqlite3 = require(sqlite3Path);
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(() => {
    db.run("UPDATE workflow_entity SET active = 1 WHERE id IN ('cIIOrjdhNGTPjwfJ', 'TESTdebtWF0001')", function(err) {
      if (err) { console.error('Update error:', err.message); }
      else { console.log('Updated:', this.changes, 'rows'); }
    });
    db.all("SELECT id, name, active FROM workflow_entity WHERE id IN ('cIIOrjdhNGTPjwfJ', 'TESTdebtWF0001')", (err, rows) => {
      if (err) console.error(err);
      else console.log('Verified:', JSON.stringify(rows));
    });
    db.close();
  });
} catch (e) {
  console.log('sqlite3 from n8n:', e.message);
}
  }
}