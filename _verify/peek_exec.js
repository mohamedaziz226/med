const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/tmp/exec1.json', 'utf8'));
console.log('KEYS:', Object.keys(j));
const s = JSON.stringify(j);
console.log('LEN:', s.length);
console.log('HEAD:', s.slice(0, 3000));