const base = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-nodes-base@file+packages+nodes-base_@opentelemetry+api@1.9.0_@opentelemetry+exporte_9e31dcec10980323a9c957753d2416c7/node_modules/n8n-nodes-base/dist/nodes/SplitInBatches';
const mod = require(base + '/v3/SplitInBatchesV3.node.js');
const cls = mod.SplitInBatchesV3;
console.log('class name:', cls && cls.name);
if (typeof cls === 'function') {
  const inst = new cls();
  const props = {};
  // try to find the description
  let desc = inst.description;
  if (!desc && inst.getDescription) { try { desc = inst.getDescription(); } catch(e) { console.log('getDescription err', e.message); } }
  console.log('description version:', desc && desc.version);
  console.log('outputs:', JSON.stringify(desc && desc.outputs));
}
// Also read raw file top to understand structure
const fs = require('fs');
const src = fs.readFileSync(base + '/v3/SplitInBatchesV3.node.js', 'utf8');
const lines = src.split('\n');
console.log('--- lines 1-40 ---');
for (let i = 0; i < Math.min(40, lines.length); i++) console.log(i + 1, lines[i]);