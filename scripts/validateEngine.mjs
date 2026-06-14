import { GRAPHS, solve, familyFor } from '../src/lib/eventSolve.mjs';
const fams = Object.keys(GRAPHS);
let problems = 0;
const D = new Date('2027-01-01T00:00:00Z'); const asOf = new Date('2026-06-13T00:00:00Z');
for (const f of fams) {
  const g = GRAPHS[f];
  const ids = new Set(g.map(m => m.id));
  const events = g.filter(m => m.id === 'event');
  if (events.length !== 1) { console.log(`✗ ${f}: ${events.length} 'event' nodes`); problems++; }
  for (const m of g) for (const dep of m.deps) if (!ids.has(dep)) { console.log(`✗ ${f}: ${m.id} → missing dep ${dep}`); problems++; }
  try { const r = solve(g, D, new Set(), asOf); if (!r.binding) { console.log(`✗ ${f}: no binding`); problems++; } }
  catch (e) { console.log(`✗ ${f}: solve threw ${e.message}`); problems++; }
}
console.log(`\n${fams.length} families · ${problems} problems`);
const TAXO = ['Wedding','Engagement Party','Vow Renewal','Anniversary','Bridal Shower','Baby Shower','Birthday','Sweet 16','Quinceañera','Graduation','Retirement Party','Reunion','Holiday Party','Board Meeting','Conference','Product Launch','Team Retreat','Town Hall','Training / Workshop','Award Ceremony','Client Dinner','Fundraiser / Gala','Networking Event','Other','Get-Together','Housewarming','Bachelorette Party','Surprise Proposal','Gender Reveal','Elopement','Wellness Retreat'];
console.log('\nTYPE → FAMILY:'); let unmapped = 0;
for (const t of TAXO) { const f = familyFor({type:t}); console.log(`  ${f?'✓':'·'} ${t.padEnd(22)} → ${f||'(no model — honest null)'}`); if (!f && t!=='Other') unmapped++; }
console.log(`\nunmapped real types: ${unmapped}`);
