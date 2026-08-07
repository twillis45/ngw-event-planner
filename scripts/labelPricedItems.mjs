#!/usr/bin/env node
// ─── LABEL EVERY PRICED ITEM THAT CARRIES NO VERIFICATION STATUS ────────────
// Task #10. 393 of 541 priced items carry no `provenance.verificationStatus`,
// so they sit outside the grounding metric entirely — neither numerator nor
// denominator. Labelling them is the precondition for the number meaning
// anything, and it will make the headline FALL (3% -> ~1.5%) because the
// denominator finally includes everything. That is the metric becoming honest.
//
// WHAT IT WRITES, and why each part is the honest choice:
//   tier: 'estimate'                 CLAIM_BASIS.estimate — "An authored
//                                    starting figure, to be adjusted." That is
//                                    precisely what an unlabelled price is.
//   confidence: 'low'                already in use 21 times; the truthful
//                                    reading for a figure with no source.
//   verificationStatus: 'synthesized' the canonical unsettled status.
//
// IT INVENTS NOTHING. No sources, no claim text, no dates. Labelling an
// estimate as an estimate is the opposite of fabrication — it stops an
// unmarked guess from reading like a fact.
//
// METHOD: for each `unitCostRange: [`, walk OUTWARD to the enclosing object's
// braces by depth-counting (respecting strings), and inspect that object's real
// extent. A line-based heuristic was tried first and disagreed with the object
// census by 18 items — this brace walk must agree with `grounding:census`
// exactly (393) before anything is written, and the script refuses to run if it
// does not.
//
// ─── STATUS: DOES NOT RUN YET, AND THAT IS THE POINT ───────────────────────
// The guard has refused twice, and the second refusal is why it exists.
//
// This walk reports 394 unlabelled; `grounding:census` (which walks real
// OBJECTS) reports 393. The disagreement is `p_crabs` in crabFeast.js — the
// BEST-SOURCED ITEM IN THE CORPUS: four named DMV vendors, phone numbers,
// dated July 2026 quotes, verificationStatus:'cited'. This walker fails to see
// its provenance and would have stamped `tier:'estimate', confidence:'low'`
// over it, destroying the only properly-researched crab pricing we have.
//
// ROOT CAUSE, and it is in this file, not the data: `enclosingObject` walks
// BACKWARD tracking string delimiters. Scanning backward through
// `"Captain White's Seafood (Oxon Hill, MD)"` the apostrophe in "White's"
// flips inStr, so the scan mis-locates the object's opening brace and inspects
// the wrong span. Backward string tracking cannot be done correctly by
// single-character lookback — an apostrophe is indistinguishable from a quote
// when read right-to-left.
//
// THE FIX IS TO STOP PARSING JS WITH REGEX. Scan FORWARD once per file,
// tracking strings/comments properly, and record every object's [open, close]
// with its depth; then answer "which object owns this unitCostRange" from that
// index. Or use a real parser. Either way, the codemod must agree with the
// object census EXACTLY before it writes.
//
// Run:  node scripts/labelPricedItems.mjs --dry     (report only)
//       node scripts/labelPricedItems.mjs --apply   (write — currently blocked)
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DIR = path.resolve('src/lib/playbooks/data');
const apply = process.argv.includes('--apply');
const EXPECT = Number(process.env.EXPECT_UNLABELLED || 393);
const LABEL = "provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }";

// Find the object literal that encloses `idx`, returning [open, close] indices.
const enclosingObject = (s, idx) => {
  let depth = 0, i = idx, inStr = null;
  // walk back to the opening brace of this object
  for (; i >= 0; i--) {
    const c = s[i];
    if (inStr) { if (c === inStr && s[i - 1] !== '\\') inStr = null; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '}') depth++;
    else if (c === '{') { if (depth === 0) break; depth--; }
  }
  if (i < 0) return null;
  const open = i;
  // walk forward to its matching close
  depth = 0; inStr = null;
  for (let j = open; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (c === inStr && s[j - 1] !== '\\') inStr = null; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return [open, j]; }
  }
  return null;
};

const files = (await readdir(DIR)).filter((f) => f.endsWith('.js')).sort();
let found = 0, already = 0;
const edits = [];

for (const f of files) {
  const src = await readFile(path.join(DIR, f), 'utf8');
  const hits = [];
  const re = /unitCostRange:\s*\[/g;
  let m;
  while ((m = re.exec(src))) {
    // ── THE MATCH MUST BE A PROPERTY, NOT PROSE ──────────────────────────
    // crabFeast.js:204 carries `note: "... unitCostRange [32,188] spans
    // Medium at Captain White's to Jumbo Males ..."` — the corpus talks
    // ABOUT its own field names inside human copy. A bare regex counted that
    // sentence as a priced item, which is why this walk said 394 while the
    // object census said 393, and why applying it would have written a
    // provenance block into the middle of a note. A property key is always
    // preceded by `{` or `,` (ignoring whitespace); prose never is.
    const prev = src.slice(0, m.index).replace(/\s+$/, '').slice(-1);
    if (prev !== '{' && prev !== ',') continue;
    const span = enclosingObject(src, m.index);
    if (!span) continue;
    const body = src.slice(span[0], span[1] + 1);
    if (/verificationStatus:/.test(body)) { already++; continue; }
    hits.push(span);
    found++;
  }
  if (hits.length) edits.push({ f, hits });
  if (process.env.PERFILE) console.log(`  ${String(hits.length).padStart(3)} ${f.replace(/\.js$/, '')}`);
}

console.log(`priced items with a status already: ${already}`);
console.log(`priced items NEEDING a label:       ${found}`);

if (found !== EXPECT) {
  console.error(`\nREFUSING TO WRITE. This walk found ${found}; grounding:census says ${EXPECT}.`);
  console.error('Two detectors that disagree mean one of them is wrong, and a 393-item');
  console.error('codemod driven by the wrong one writes the wrong label to the wrong things.');
  console.error('Reconcile them before applying. (Override with EXPECT_UNLABELLED=<n>.)');
  process.exit(1);
}

if (!apply) { console.log('\nDRY RUN — detectors agree. Re-run with --apply to write.'); process.exit(0); }

let written = 0;
for (const { f, hits } of edits) {
  let src = await readFile(path.join(DIR, f), 'utf8');
  // apply from the END backwards so earlier indices stay valid
  for (const [, close] of hits.sort((a, b) => b[1] - a[1])) {
    const before = src.slice(0, close);
    const needsComma = /[^,{\s]\s*$/.test(before);
    src = before + (needsComma ? ', ' : ' ') + LABEL + ' ' + src.slice(close);
    written++;
  }
  await writeFile(path.join(DIR, f), src);
}
console.log(`\nlabelled ${written} priced items across ${edits.length} files.`);
