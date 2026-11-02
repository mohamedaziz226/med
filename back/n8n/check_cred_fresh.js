// Inspect credential CaiZmZzshoECZ5OO in n8n SQLite
let db;
try {
  db = require("better-sqlite3")("/home/node/.n8n/database.sqlite");
} catch (e) {
  console.error("Cannot load better-sqlite3:", e.message);
  process.exit(1);
}
try {
  const rows = db.prepare("SELECT id, name, type, data FROM credentials WHERE id = 'CaiZmZzshoECZ5OO'").all();
  if (rows.length === 0) {
    console.log("Credential not found. All credentials:");
    const all = db.prepare("SELECT id, name, type FROM credentials").all();
    console.log(JSON.stringify(all, null, 2));
  } else {
    const cred = rows[0];
    console.log("Credential ID:", cred.id);
    console.log("Name:", cred.name);
    console.log("Type:", cred.type);
    try {
      const data = JSON.parse(cred.data);
      console.log("Data keys:", Object.keys(data));
      if (data.token) {
        console.log("Token keys:", Object.keys(data.token));
        console.log("Has access_token:", !!data.token.access_token);
        console.log("Has refresh_token:", !!data.token.refresh_token);
      } else {
        console.log("NO token object. Full data (first 500):", JSON.stringify(data).substring(0, 500));
      }
    } catch (e) {
      console.log("Cannot parse data (possibly encrypted). Raw length:", cred.data ? cred.data.length : 0);
    }
  }
} catch (e) {
  console.error("Query error:", e.message);
} finally {
  if (db) db.close();
}
