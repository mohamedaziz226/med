const fs = require('fs');
const d = JSON.parse(fs.readFileSync('/tmp/cred1.json', 'utf8'));
console.log('name:', d.name, 'type:', d.type, 'keys:', Object.keys(d));
// data may be a JSON string (with possible GCM-wrapped header) or object
let raw = d.data;
console.log('data type:', typeof raw);
if (typeof raw === 'string') {
  let body = raw;
  if (body.startsWith('*')) { // n8n v1 encryption prefix
    const idx = body.indexOf('*', 1);
    if (idx > 0) body = body.slice(idx + 1);
  }
  try {
    const dec = JSON.parse(body);
    console.log('decoded top keys:', Object.keys(dec).join(','));
    console.log('has oauthTokenData:', !!(dec.oauthTokenData && dec.oauthTokenData.access_token));
    console.log('has clientId:', !!dec.clientId);
  } catch (e) { console.log('not plain JSON (encrypted):', e.message.slice(0, 80)); }
} else {
  console.log('data object keys:', Object.keys(raw).join(','));
  console.log('has oauthTokenData:', !!(raw.oauthTokenData && raw.oauthTokenData.access_token));
}