// Exact census against the REAL objects, not the source text. Imports every
// playbook and walks it for anything carrying a unitCostRange.
import { readdir } from 'node:fs/promises';
import path from 'node:path';
const DIR = process.argv[2];
const files = (await readdir(DIR)).filter((f) => f.endsWith('.js')).sort();
let priced = 0, labeled = 0, unlabeled = 0, inAlt = 0;
const byStatus = {};
const worst = [];
for (const f of files) {
  let mod;
  try { mod = await import(path.resolve(DIR, f)); } catch (e) { console.log('SKIP ' + f + ' — ' + e.message.slice(0, 80)); continue; }
  let p = 0, u = 0;
  const seen = new Set();
  const walk = (node, underAlternatives) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach((x) => walk(x, underAlternatives)); return; }
    if (Object.prototype.hasOwnProperty.call(node, 'unitCostRange')) {
      priced++; p++;
      if (underAlternatives) inAlt++;
      // ANY provenance counts. The corpus uses a bare string shorthand
      // (`provenance: 'synthesized'`) as well as the object form, and reading
      // only `.verificationStatus` called those unlabelled — a blind spot this
      // file SHARED with the codemod, which is how they agreed and were both
      // wrong. Agreement between two detectors is not correctness.
      const prov = node.provenance;
      const st = typeof prov === 'string' ? prov + ' (string form)'
        : (prov && prov.verificationStatus) || (prov ? '(object, no status)' : null);
      if (st) { labeled++; byStatus[st] = (byStatus[st] || 0) + 1; }
      else { unlabeled++; u++; }
    }
    for (const [k, v] of Object.entries(node)) walk(v, underAlternatives || k === 'alternatives');
  };
  for (const v of Object.values(mod)) walk(v, false);
  if (p) worst.push({ f: f.replace(/\.js$/, ''), p, u });
}
console.log(`\nTRUE CENSUS (objects, not text)`);
console.log(`  priced items          ${priced}`);
console.log(`  of those in alternatives ${inAlt}`);
console.log(`  WITH provenance.verificationStatus ${labeled}  ${JSON.stringify(byStatus)}`);
console.log(`  WITHOUT (need labelling)           ${unlabeled}`);
console.log(`\nworst files:`);
worst.sort((a, b) => b.u - a.u).slice(0, 10).forEach((r) => console.log(`  ${String(r.u).padStart(3)} unlabeled / ${String(r.p).padStart(3)} priced   ${r.f}`));

// ─── WHY THIS EXISTS ALONGSIDE groundingAudit.mjs ───────────────────────────
// The audit counts REGEX HITS IN SOURCE TEXT. That is fast and it is wrong in
// three distinct ways, all found by running this census against it (2026-08-07):
//
//  1. It counted `verificationStatus:` anywhere in a file and attributed it to
//     priced items. Text says 132 synthesized; the OBJECTS say 63. The other 69
//     are provenance blocks on things that are not priced items at all (risks,
//     timeline entries, other structures that carry their own provenance).
//
//  2. It does not count `researched` AT ALL — a status in live use on 37 priced
//     items. Those items are labelled, and the audit sees neither numerator nor
//     denominator for them. They are invisible.
//
//  3. Its denominator was labelled-only, so ~380 unlabelled priced items never
//     appeared. (Fixed in the audit itself; recorded here because the three
//     defects compound: each one moves the number in a different direction.)
//
// A metric that grades the product's honesty doctrine has to survive being
// pointed at itself. Run BOTH: the audit for the per-playbook worklist, this
// for the true counts.
//
// KNOWN LIMIT, stated rather than hidden: crabFeast.js fails to import here
// (unresolved `src/lib/crabSe…` dependency), so its ~16 priced items and 2
// cited items are missing from these totals. 525 + 16 = the audit's 541, which
// is how the two instruments were reconciled. Fix that import before trusting
// this file's absolute numbers.
