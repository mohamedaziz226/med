// Reads the exported credential file, decrypts it, and prints token presence
const crypto = require("crypto");
const fs = require("fs");

const ENCRYPTION_KEY = process.env.N8N_ENCRYPTION_KEY || "2AUOSFZekm/GxgrUrf/834VgY6IujHKt";
const credFile = process.argv[2] || "/tmp/gmail_cred_export.json";

const cred = JSON.parse(fs.readFileSync(credFile, "utf8"))[0];
const encryptedB64 = cred.data;

console.log("Credential name:", cred.name);
console.log("Type:", cred.type);
console.log("Encrypted data length:", encryptedB64 ? encryptedB64.length : 0);

const data = Buffer.from(encryptedB64, "base64");
if (data.slice(0, 8).toString() !== "Salted__") {
  console.log("Not a salted n8n payload");
  process.exit(0);
}

const salt = data.slice(8, 16);
const ciphertext = data.slice(16);

// EVP_BytesToKey (MD5) -> key(32) + iv(16)
let d = Buffer.alloc(0);
let prev = Buffer.alloc(0);
while (d.length < 48) {
  const h = crypto.createHash("md5");
  h.update(Buffer.concat([prev, Buffer.from(ENCRYPTION_KEY, "utf8"), salt]));
  prev = h.digest();
  d = Buffer.concat([d, prev]);
}
const key = d.slice(0, 32);
const iv = d.slice(32, 48);

let decrypted;
try {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
} catch (e) {
  console.error("Decryption failed:", e.message);
  process.exit(1);
}

console.log("\n=== Decrypted credential data (raw) ===");
try {
  const obj = JSON.parse(decrypted);
  console.log("Parsed JSON keys:", Object.keys(obj));
  console.log("clientId:", obj.clientId ? "present" : "absent");
  console.log("clientSecret:", obj.clientSecret ? "present" : "absent");
  if (obj.token) {
    console.log("=== Token ===");
    console.log("Token keys:", Object.keys(obj.token));
    console.log("Has access_token:", !!obj.token.access_token);
    console.log("Has refresh_token:", !!obj.token.refresh_token);
    console.log("Has expiry_date:", !!obj.token.expiry_date);
  } else {
    console.log("NO token object found");
    console.log("Full data (first 1000 chars):", JSON.stringify(obj).substring(0, 1000));
  }
} catch (e) {
  console.log("Not pure JSON. Raw (first 800 chars):", decrypted.substring(0, 800));
  const start = decrypted.indexOf("{");
  if (start >= 0) {
    try {
      const obj = JSON.parse(decrypted.slice(start));
      console.log("Keys from offset:", Object.keys(obj));
      if (obj.token) console.log("Token keys:", Object.keys(obj.token));
    } catch (e2) {
      console.log("Could not parse JSON from offset");
    }
  }
}
