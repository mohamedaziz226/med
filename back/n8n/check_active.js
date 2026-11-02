const fs = require('fs');
for (const f of ['/tmp/wf1.json', '/tmp/wf2.json']) {
  const w = JSON.parse(fs.readFileSync(f));
  console.log(f, 'top-level keys:', Object.keys(w).join(','));
  const wf = Array.isArray(w) ? w[0] : w;
  console.log(wf.id, 'active=' + wf.active,
    'nodes=' + (wf.nodes ? wf.nodes.length : 'n/a'),
    'webhook=' + (wf.nodes ? wf.nodes.some(n => n.type === 'n8n-nodes-base.webhook') : 'n/a'));
}
