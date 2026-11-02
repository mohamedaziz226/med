const path = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3';
const sqlite3 = require(path);
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT * FROM project", (err, projects) => {
  if (err) console.error('projects ERR', err); else { console.log('--- PROJECTS ---'); projects.forEach(p => console.log(JSON.stringify(p))); }
  db.all("SELECT * FROM shared_workflow", (err2, sw) => {
    if (err2) console.error('shared ERR', err2); else { console.log('--- SHARED WORKFLOW ---'); sw.forEach(r => console.log(JSON.stringify(r))); }
    db.all("SELECT * FROM project_relation", (err3, pr) => {
      if (err3) console.error('pr ERR', err3); else { console.log('--- PROJECT RELATION ---'); pr.forEach(r => console.log(JSON.stringify(r))); }
      db.all("SELECT id, email, role, firstName, lastName FROM user", (err4, us) => {
        if (err4) console.error('user ERR', err4); else { console.log('--- USERS ---'); us.forEach(r => console.log(JSON.stringify(r))); }
        db.close();
      });
    });
  });
});