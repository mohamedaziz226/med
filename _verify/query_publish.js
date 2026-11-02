const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.all("PRAGMA table_info(workflow_published_version)", (e, cols) => {
  if (e) console.error('pv cols ERR', e); else { console.log('--- workflow_published_version cols ---'); cols.forEach((c) => console.log(' ', c.name)); }
  db.all("SELECT * FROM workflow_published_version", (e2, rows) => {
    if (e2) console.error('pv rows ERR', e2); else { console.log('--- workflow_published_version rows ---'); rows.forEach((r) => console.log(JSON.stringify(r))); }
    db.all("PRAGMA table_info(webhook_entity)", (e3, cols3) => {
      if (e3) console.error('wh cols ERR', e3); else { console.log('--- webhook_entity cols ---'); cols3.forEach((c) => console.log(' ', c.name)); }
      db.all("SELECT * FROM webhook_entity", (e4, wh) => {
        if (e4) console.error('wh rows ERR', e4); else { console.log('--- webhook_entity rows ---'); wh.forEach((r) => console.log(JSON.stringify(r))); }
        db.all("SELECT workflowId, activeVersionId, id FROM workflow_entity WHERE id IN ('TESTdebtWF0001','cIIOrjdhNGTPjwfJ','XEWOdpaklAxSNPts')", (e5, wfs) => {
          if (e5) console.error('wf ERR', e5); else { console.log('--- workflow activeVersionId ---'); wfs.forEach((r) => console.log(JSON.stringify(r))); }
          db.close();
        });
      });
    });
  });
});