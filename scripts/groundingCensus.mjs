// Exact census against the REAL objects, not the source text. Imports every
// playbook and walks it for anything carrying a unitCostRange.
import { readdir, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── IT REPORTED ZERO, AND ZERO IS A NUMBER (2026-08-14) ─────────────────────
// This script used to `import()` each playbook directly. The data files are ESM
// `.js` with no `"type":"module"` anywhere above them, so node loads them as
// CommonJS and every single one throws `Unexpected token 'export'`. Each throw
// printed a SKIP line and `continue`d — and then the summary printed:
//
//     priced items          0
//     WITHOUT (need labelling)           0
//
// A reader sees a headline of zeroes. The SKIP lines scroll past above it. So
// the instrument that measures THE binding constraint on this product — the one
// number WHERE_WE_ARE tells you to watch — was reporting "nothing priced,
// nothing unlabelled" for a corpus of 538 priced items, and it was reporting it
// in the same shape a genuinely clean result would take.
//
// The files are bundled through esbuild first, which resolves their imports and
// emits real ESM. That also closes the KNOWN LIMIT recorded at the bottom of
// this file: crabFeast.js used to fail on an unresolved dependency and its ~16
// priced items were silently missing from the totals.
//
// AND IT CAN NEVER REPORT A FALSE ZERO AGAIN: any file that fails to load is
// now a hard exit, not a SKIP line. A census that cannot read its corpus must
// refuse to print a number rather than print a comforting one.
const DIR = process.argv[2];
const files = (await readdir(DIR)).filter((f) => f.endsWith('.js')).sort();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ESBUILD = path.resolve(HERE, '../hostv2/node_modules/.bin/esbuild');
if (!existsSync(ESBUILD)) {
  console.error('CENSUS ABORTED — esbuild not found at ' + ESBUILD);
  console.error('It lives in hostv2/node_modules; run `npm --prefix hostv2 install` first.');
  process.exit(1);
}
const TMP = await mkdtemp(path.join(os.tmpdir(), 'ngw-census-'));
const bundled = new Map();
for (const f of files) {
  const out = path.join(TMP, f.replace(/\.js$/, '.mjs'));
  try {
    execFileSync(ESBUILD, [path.resolve(DIR, f), '--bundle', '--format=esm', '--platform=neutral', '--log-level=error', '--outfile=' + out], { stdio: 'pipe' });
    bundled.set(f, out);
  } catch (e) {
    console.error('CENSUS ABORTED — could not bundle ' + f);
    console.error(String(e.stderr || e.message).slice(0, 400));
    await rm(TMP, { recursive: true, force: true });
    process.exit(1);
  }
}

let priced = 0, labeled = 0, unlabeled = 0, inAlt = 0;
const byStatus = {};
const worst = [];
for (const f of files) {
  let mod;
  try { mod = await import(bundled.get(f)); } catch (e) {
    console.error('CENSUS ABORTED — could not load ' + f + ' — ' + e.message.slice(0, 200));
    await rm(TMP, { recursive: true, force: true });
    process.exit(1);
  }
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
// A census whose denominator is zero read the corpus and found nothing priced,
// which for THIS corpus means it did not really read it. Refuse the number.
if (!priced) {
  console.error('\nCENSUS ABORTED — zero priced items across ' + files.length + ' files. That is not a result, it is a failure to read.');
  await rm(TMP, { recursive: true, force: true });
  process.exit(1);
}
await rm(TMP, { recursive: true, force: true });

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
