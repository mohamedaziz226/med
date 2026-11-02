/**
 * Gmail OAuth2 self-contained flow + n8n credential re-encryption.
 * Flow: local HTTP server catches the Google callback, exchanges code->token,
 * re-encrypts with n8n format.
 */
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const fs = require("fs");
const { exec } = require("child_process");
const { URL } = require("url");

const ENCRYPTION_KEY = "2AUOSFZekm/GxgrUrf/834VgY6IujHKt";
const KEY_BUF = Buffer.from(ENCRYPTION_KEY, "utf8");
const PORT = 9876;
const REDIRECT_URI = `http://localhost:${PORT}`;

// --- n8n-compatible crypto (AES-256-CBC, Salted__, EVP_BytesToKey MD5) ---
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
  return Buffer.concat([Buffer.from("Salted__"), salt, enc]).toString("base64");
}

// --- 1. Load decrypted credential ---
let cred;
const decryptedFile = __dirname + "/gmail_cred_decrypted.json";
if (fs.existsSync(decryptedFile)) {
  cred = JSON.parse(fs.readFileSync(decryptedFile, "utf8"));
  console.log("[1] Loaded decrypted credential from", decryptedFile);
} else {
  console.error("Missing", decryptedFile);
  process.exit(1);
}

const CLIENT_ID = cred.clientId;
const CLIENT_SECRET = cred.clientSecret;
const SCOPE = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";

// --- 2. Build authorization URL ---
const params = new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: SCOPE,
  access_type: "offline",
  prompt: "consent",
});
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
console.log("\n[2] Authorization URL prepared");
console.log("\nOpening browser... if it doesn't open, copy & paste the URL below:");
console.log(authUrl);

// --- 5. Exchange code -> token ---
function exchangeCode(code) {
  const postData = new URLSearchParams({
    code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
  });
  const tokenReq = https.request("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }, (resp) => {
    let body = "";
    resp.on("data", (chunk) => (body += chunk));
    resp.on("end", () => {
      try {
        const token = JSON.parse(body);
        if (token.error) {
          console.error("[5] Token error:", token.error, token.error_description);
          console.error("Full:", body);
          process.exit(1);
        }
        console.log("[5] Token received! access_token:", token.access_token ? "OK" : "MISSING", "| refresh:", token.refresh_token ? "OK" : "MISSING");
        cred.oauthTokenData = {
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          token_type: token.token_type || "Bearer",
          scope: token.scope || SCOPE,
          expiry_date: Date.now() + (token.expires_in || 3600) * 1000,
        };
        // --- 6+7. Re-encrypt ---
        const credJson = JSON.stringify(cred);
        const encrypted = encryptN8n(credJson);
        console.log("[7] Credential re-encrypted, length:", encrypted.length);
        // --- 8. Write importable file ---
        const exportCred = [{
          id: "CaiZmZzshoECZ5OO", name: "Gmail account", type: "gmailOAuth2",
          data: encrypted, isManaged: false, isGlobal: false, isResolvable: false,
          resolvableAllowFallback: false, resolverId: null, usageScope: "project",
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }];
        fs.writeFileSync("gmail_cred_final.json", JSON.stringify(exportCred, null, 2));
        console.log("[8] Credential written to gmail_cred_final.json");
        console.log("\n✅ Flow complete! Import this credential into n8n via:");
        console.log("  n8n import:credentials --input=<dir_with_file> --separate --decrypt");
        process.exit(0);
      } catch (e) {
        console.error("[5] Parse error:", e.message, "Raw:", body.substring(0, 300));
        process.exit(1);
      }
    });
  });
  tokenReq.on("error", (e) => { console.error("Token exchange error:", e.message); process.exit(1); });
  tokenReq.write(postData.toString());
  tokenReq.end();
}

// --- 3+4. Start local server + open browser ---
const server = http.createServer((req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  if (code) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>✅ OAuth2 success — close this tab.</h1>");
    server.close();
    console.log("\n[4] Received authorization code");
    exchangeCode(code);
  } else {
    res.writeHead(400);
    res.end("No code");
  }
});
server.listen(PORT, () => {
  console.log(`[3] Local server on http://localhost:${PORT}`);
  exec(`start "" "${authUrl}"`);
});
