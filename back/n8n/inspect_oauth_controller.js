const fs = require('fs');
const c = fs.readFileSync('/usr/local/lib/node_modules/n8n/dist/controllers/oauth/oauth2-credential.controller.js', 'utf8');
const i = c.indexOf('@Post');
console.log(c.slice(Math.max(0, i - 1000), i + 2500));