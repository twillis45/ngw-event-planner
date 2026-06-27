#!/usr/bin/env node
// Guardrail: fail if any raw font literal sneaks back into App.js. Use the tokens:
//   fontSize → T.<display|title|body|secondary|caption|eyebrow>   (useType())
//   fontWeight → FW.<regular|medium|semibold|bold|heavy|black>
//   fontFamily → FF   (only 'inherit' and 'monospace' literals are allowed)
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'App.js');
const lines = fs.readFileSync(file, 'utf8').split('\n');
const bad = [];
lines.forEach((l, i) => {
  if (/fontSize:\s*\d/.test(l)) bad.push([i + 1, 'fontSize', l.trim().slice(0, 90)]);
  if (/fontWeight:\s*\d/.test(l)) bad.push([i + 1, 'fontWeight', l.trim().slice(0, 90)]);
  const fam = l.match(/fontFamily:\s*'([^']*)'/);
  if (fam && !['inherit', 'monospace'].includes(fam[1])) bad.push([i + 1, 'fontFamily', l.trim().slice(0, 90)]);
});
if (bad.length) {
  console.error(`\n✗ ${bad.length} raw font literal(s) found — use the T / FW / FF tokens:`);
  bad.slice(0, 25).forEach(([n, k, t]) => console.error(`  App.js:${n}  [${k}]  ${t}`));
  if (bad.length > 25) console.error(`  …and ${bad.length - 25} more`);
  process.exit(1);
}
console.log('✓ font tokens: 0 raw fontSize / fontWeight / fontFamily literals in App.js');
