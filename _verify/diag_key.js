// Diagnose which encryption key can decrypt the credentials in the volume DB
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const KEY_A = "J1kQ0c5ykuhE+ZyEBfW6EpfpquWpIrmP"; // key currently in /home/node/.n8n/config
const KEY_B = "2AUOSFZekm/GxgrUrf/834VgY6IujHKt"; // key in workspace .n8n_data/config

function tryDecrypt(key, encB64) {
  try {
    const data = Buffer.from(encB64, "base64");
    if (data.slice(0, 8).toString() !== "Salted__") return "NOT-SALTED";
    const salt = data.slice(8, 16);
    const ct = data.slice(16);
    // EVP_BytesToKey (MD5) -> key(32) + iv(16)
    let d = Buffer.alloc(0), prev = Buffer.alloc(0);
    while (d.length < 48) {
      const h = crypto.createHash("md5");
      h.update(Buffer.concat([prev, Buffer.from(key, "utf8"), salt]));
      prev = h.digest();
      d = Buffer.concat([d, prev]);
    }
    const dec = crypto.createDecipheriv("aes-256-cbc", d.slice(0, 32), d.slice(32, 48));
    Buffer.concat([dec.update(ct), dec.final()]);
    return "OK";
  } catch (e) {
    return "FAIL (" + e.code + ")";
  }
}

const db = new DatabaseSync("/home/node/.n8n/database.sqlite");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%cred%'").all();
console.log("credential tables:", tables.map(t => t.name).join(", "));

const rows = db.prepare("SELECT id, name, type, data FROM credentials_entity").all();
for (const r of rows) {
  console.log(`- ${r.id} "${r.name}" (${r.type})`);
  console.log(`    key in config (J1kQ...): ${tryDecrypt(KEY_A, r.data)}`);
  console.log(`    key in workspace (...IujHKt): ${tryDecrypt(KEY_B, r.data)}`);
}
if (rows.length === 0) console.log("No credentials found in volume DB.");
