// Test n8n-style encryption round-trip + decrypt the Gmail credential
const crypto = require("crypto");
const fs = require("fs");

const KEY = process.env.N8N_ENCRYPTION_KEY || "2AUOSFZekm/GxgrUrf/834VgY6IujHKt";
const KEY_BUF = Buffer.from(KEY, "utf8");

function evpBytesToKey(password, salt, keyLen, ivLen) {
  let d = Buffer.alloc(0);
  let prev = Buffer.alloc(0);
  while (d.length < keyLen + ivLen) {
    const h = crypto.createHash("md5");
    h.update(Buffer.concat([prev, password, salt]));
    prev = h.digest();
    d = Buffer.concat([d, prev]);
  }
  return { key: d.slice(0, keyLen), iv: d.slice(keyLen, keyLen + ivLen) };
}

function encryptN8n(plaintext) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpBytesToKey(KEY_BUF, salt, 32, 16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const result = Buffer.concat([Buffer.from("Salted__"), salt, enc]);
  return "U2FsdGVkX1" + result.slice(8).toString("base64");
}

function decryptN8n(b64) {
  const raw = Buffer.from(b64, "base64");
  if (raw.slice(0, 8).toString() !== "Salted__") throw new Error("Bad prefix");
  const salt = raw.slice(8, 16);
  const ct = raw.slice(16);
  const { key, iv } = evpBytesToKey(KEY_BUF, salt, 32, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString("utf8");
}

// --- Round-trip test ---
console.log("=== Round-trip test ===");
const testPlain = JSON.stringify({ clientId: "test", token: { x: 1 } });
const enc = encryptN8n(testPlain);
console.log("Encrypted:", enc.substring(0, 40) + "...");
try {
  const dec = decryptN8n(enc);
  console.log("Decrypted match:", dec === testPlain);
} catch (e) {
  console.log("Round-trip FAILED:", e.message);
}

// --- Decrypt real credential ---
console.log("\n=== Decrypting real credential ===");
const credFile = process.argv[2] || "/tmp/gmail_cred_export.json";
let cred;
try {
  cred = JSON.parse(fs.readFileSync(credFile, "utf8"))[0];
} catch (e) {
  // Fallback: read from DB
  console.log("credFile not found, trying db...");
  process.exit(1);
}
try {
  const decrypted = decryptN8n(cred.data);
  console.log("Decrypted OK! Length:", decrypted.length);
  const obj = JSON.parse(decrypted);
  console.log("Keys:", Object.keys(obj));
  console.log("clientId present:", !!obj.clientId);
  console.log("clientSecret present:", !!obj.clientSecret);
  if (obj.token) {
    console.log("Token keys:", Object.keys(obj.token));
    console.log("Has access_token:", !!obj.token.access_token);
    console.log("Has refresh_token:", !!obj.token.refresh_token);
  } else {
    console.log("NO TOKEN");
  }
  // Write decrypted to file for the OAuth script to use
  fs.writeFileSync("/tmp/gmail_cred_decrypted.json", JSON.stringify(obj, null, 2));
  console.log("\nDecrypted credential written to /tmp/gmail_cred_decrypted.json");
} catch (e) {
  console.error("Decrypt FAILED:", e.message);
}
