// Inspect credential using n8n's own Cipher module
const fs = require("fs");
const path = require("path");

// Find better-sqlite3 inside n8n's node_modules
let db;
const candidates = [
  "/usr/local/lib/node_modules/n8n/node_modules/better-sqlite3",
  "/usr/local/lib/node_modules/n8n/node_modules/.pnpm/better-sqlite3@7.8.0/node_modules/better-sqlite3",
  "/usr/local/lib/node_modules/n8n/node_modules/.pnpm/better-sqlite3@7.9.0/node_modules/better-sqlite3",
];
let Database;
for (const c of candidates) {
  try {
    Database = require(c);
    console.log("Found better-sqlite3 at:", c);
    break;
  } catch(e) {}
}
// fallback: search
if (!Database) {
  try {
    Database = require("better-sqlite3");
    console.log("Found better-sqlite3 globally");
  } catch(e) {
    console.log("Trying with sqlite3...");
    try {
      const Sequelize = require("sequelize");
    } catch(e2) {
      console.error("No sqlite module found");
      process.exit(1);
    }
  }
}

if (Database) {
  db = new Database("/home/node/.n8n/database.sqlite");
  const cred = db.prepare("SELECT id, name, type, data FROM credentials WHERE id = 'CaiZmZzshoECZ5OO'").get();
  if (!cred) {
    console.log("Credential not found. Listing all:");
    const all = db.prepare("SELECT id, name, type FROM credentials").all();
    console.log(JSON.stringify(all, null, 2));
  } else {
    console.log("ID:", cred.id);
    console.log("Name:", cred.name);
    console.log("Type:", cred.type);
    console.log("Data length:", cred.data ? cred.data.length : 0);
    // Check what users exist for login
    try {
      const users = db.prepare("SELECT id, email, password FROM user").all();
      console.log("\n=== n8n users ===");
      users.forEach(u => {
        console.log(`  id=${u.id} email=${u.email} hasPassword=${!!u.password}`);
      });
    } catch(e) {
      console.log("No user table:", e.message);
    }
  }
  db.close();
}
