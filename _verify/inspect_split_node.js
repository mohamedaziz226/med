// Inspect splitInBatches node description outputs order
const { SplitInBatches } = require('/usr/local/lib/node_modules/n8n/nodes-base/dist/nodes/Flow/SplitInBatches/SplitInBatches.node.js');
console.log('NODE NAME:', SplitInBatches.description.name);
console.log('VERSIONS:', JSON.stringify(SplitInBatches.description.defaultVersion));
const outs = SplitInBatches.description.outputs;
if (outs) {
  console.log('OUTPUTS:');
  outs.forEach((o, i) => console.log(`  [${i}] ${JSON.stringify(o)}`));
}
const outputsDeclaration = SplitInBatches.getOutputsDeclarations ? SplitInBatches.getOutputsDeclarations() : null;
if (outputsDeclaration) {
  console.log('getOutputsDeclarations:');
  outputsDeclaration.forEach((o, i) => console.log(`  [${i}] ${JSON.stringify(o.name)}`));
}