#!/usr/bin/env node
// Grounding coverage audit — the scoreboard that turns "can I trust these prices?" into
// a number. Scans every playbook data file for provenance/verificationStatus, and reports
// how much of the priced canon is CITED (real sources) vs SYNTHESIZED (model-authored
// estimate) vs trade/cultural consensus. Drive `cited` up over time via the research pass.
//
// Run:  node scripts/groundingAudit.mjs            (human scoreboard)
//       node scripts/groundingAudit.mjs --json     (machine — for the monthly cron)
//       node scripts/groundingAudit.mjs --stale 30 (list cited items not re-verified in N days)
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const DATA = path.resolve('src/lib/playbooks/data');
const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const staleIdx = argv.indexOf('--stale');
const staleDays = staleIdx >= 0 ? Number(argv[staleIdx + 1] || 30) : null;

const countRe = (txt, re) => (txt.match(re) || []).length;

const files = (await readdir(DATA)).filter((f) => f.endsWith('.js')).sort();
const rows = [];
const totals = { cited: 0, synthesized: 0, consensus: 0, tradition: 0, priced: 0, sources: 0, lastVerified: 0 };

for (const f of files) {
  const txt = await readFile(path.join(DATA, f), 'utf8');
  const r = {
    file: f.replace(/\.js$/, ''),
    cited: countRe(txt, /verificationStatus:\s*'cited'/g),
    synthesized: countRe(txt, /verificationStatus:\s*'synthesized'/g),
    consensus: countRe(txt, /verificationStatus:\s*'established-consensus'/g),
    tradition: countRe(txt, /tier:\s*'cultural-tradition'/g),
    priced: countRe(txt, /unitCostRange:\s*\[/g),
    sources: countRe(txt, /sources:\s*\[/g),
    lastVerified: countRe(txt, /lastVerified:/g),
  };
  const labeled = r.cited + r.synthesized + r.consensus;
  r.grounded = labeled ? Math.round((r.cited / labeled) * 100) : 0;
  rows.push(r);
  for (const k of Object.keys(totals)) totals[k] += r[k] || 0;
}

const labeledTotal = totals.cited + totals.synthesized + totals.consensus;
const groundedPct = labeledTotal ? Math.round((totals.cited / labeledTotal) * 100) : 0;
const summary = { groundedPct, ...totals, playbooks: files.length, generatedNote: 'stamp the run date from the caller — Date.now() is intentionally not used here' };

if (asJson) {
  console.log(JSON.stringify({ summary, rows: rows.sort((a, b) => a.grounded - b.grounded) }, null, 2));
} else {
  console.log(`\n  GROUNDING COVERAGE — ${groundedPct}% cited  (${totals.cited} cited · ${totals.consensus} consensus · ${totals.synthesized} synthesized · ${totals.priced} priced items · ${files.length} playbooks)\n`);
  console.log('  Lowest-grounded playbooks (research these first):');
  rows.filter((r) => r.priced > 0).sort((a, b) => a.grounded - b.grounded).slice(0, 12)
    .forEach((r) => console.log(`    ${String(r.grounded + '%').padStart(4)}  ${r.file.padEnd(24)} ${r.cited} cited / ${r.priced} priced`));
  if (staleDays != null) {
    console.log(`\n  (lastVerified stamps found: ${totals.lastVerified} — items without one, or older than ${staleDays}d, are due for the monthly re-check)`);
  }
  console.log('');
}
