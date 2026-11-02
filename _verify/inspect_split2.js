const base = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-nodes-base@file+packages+nodes-base_@opentelemetry+api@1.9.0_@opentelemetry+exporte_9e31dcec10980323a9c957753d2416c7/node_modules/n8n-nodes-base/dist/nodes/SplitInBatches';
const { SplitInBatchesV3 } = require(base + '/v3/SplitInBatchesV3.node.js');
const desc = SplitInBatchesV3.description;
console.log('NAME:', desc.name, 'VERSION:', desc.version);
const outs = desc.outputs || desc.outputsDefinition;
console.log('OUTPUTS:', JSON.stringify(outs, null, 1));
const outs2 = desc.getOutputsDeclarations ? desc.getOutputsDeclarations() : null;
console.log('getOutputsDeclarations:', JSON.stringify(outs2, null, 1));