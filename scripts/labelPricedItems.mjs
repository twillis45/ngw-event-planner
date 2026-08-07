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
// ─── STATUS: STILL BLOCKED, AND THE THIRD REASON IS THE WORST ──────────────
// APPLIED ONCE AND REVERTED. The forward lexer below is correct — both
// detectors agreed at 148 labelled / 393 unlabelled, it wrote all 393, and the
// census then read 541/541 with zero unlabelled. It looked like a clean pass.
//
// Two jest suites failed, and they were right. THE CORPUS HAS TWO PROVENANCE
// FORMS: the object `provenance: { tier, confidence, verificationStatus }`, and
// a bare STRING shorthand `provenance: 'synthesized'`, used 13 times across
// anniversary / holidayParty / engagementParty. Neither detector understood the
// string form — the census tests `node.provenance.verificationStatus`, which is
// undefined on a string, and this script greps for `verificationStatus:`, which
// a string does not contain. So BOTH agreed those items were unlabelled, and
// both were wrong.
//
// The write then added a SECOND `provenance:` key to those object literals. A
// duplicate key does not error — the later one silently wins — so 13 authored
// provenances were destroyed and the corpus still parsed, built, and censused
// clean. Only `hostLabelsAreTruthful` ("the corpus string forms are exactly what
// was measured": expected 21, received 0) and the fieldState suite caught it.
//
// AGREEMENT BETWEEN TWO DETECTORS IS NOT CORRECTNESS. They can share a blind
// spot, and these did — both asked "is there a verificationStatus?" when the
// question was "is there ANY provenance, in any authored form?"
//
// BEFORE RE-RUNNING: handle the string form by UPGRADING it in place
// (`provenance: 'synthesized'` -> the object with the same status), never by
// adding a key beside it; treat any existing `provenance:` as already-labelled;
// and add a post-write assertion that no object literal carries two
// `provenance:` keys. Then run jest, because jest is the only instrument in
// this chain that actually caught the damage.
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

// ─── ONE FORWARD SCAN, PROPERLY (rewritten 2026-08-07) ─────────────────────
// The previous version walked BACKWARD from each hit, tracking string
// delimiters by single-character lookback. That cannot work: read right-to-
// left, the apostrophe in `"Captain White's Seafood"` is indistinguishable
// from a closing quote, so it mis-located the enclosing brace and reported the
// corpus's best-sourced item as unlabelled.
//
// Forward is the only direction a lexer can be correct in, because a string
// begins before it ends. One pass per file: track strings (with escapes), line
// and block comments, keep a stack of open braces, and record every hit
// together with the brace that owned it AT THAT MOMENT. No lookback anywhere.
const scanFile = (s) => {
  const hits = [];              // { idx, open, close } for each unitCostRange in CODE
  const stack = [];             // indices of currently-open braces
  const pending = [];           // hits whose owning brace has not closed yet
  let i = 0;
  const KEY = 'unitCostRange';
  while (i < s.length) {
    const c = s[i];
    // comments
    if (c === '/' && s[i + 1] === '/') { const nl = s.indexOf('\n', i); i = nl === -1 ? s.length : nl; continue; }
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); i = e === -1 ? s.length : e + 2; continue; }
    // strings — consume to the matching close, honouring backslash escapes
    if (c === "'" || c === '"' || c === '`') {
      const q = c; i++;
      while (i < s.length) { if (s[i] === '\\') { i += 2; continue; } if (s[i] === q) { i++; break; } i++; }
      continue;
    }
    if (c === '{') { stack.push(i); i++; continue; }
    if (c === '}') {
      const open = stack.pop();
      for (let k = pending.length - 1; k >= 0; k--) {
        if (pending[k].open === open) { hits.push({ idx: pending[k].idx, open, close: i }); pending.splice(k, 1); }
      }
      i++; continue;
    }
    // the key, in code context only, and only in a property position
    if (c === 'u' && s.startsWith(KEY, i)) {
      let j = i + KEY.length;
      while (j < s.length && /\s/.test(s[j])) j++;
      if (s[j] === ':' && stack.length) {
        let k = j + 1; while (k < s.length && /\s/.test(s[k])) k++;
        if (s[k] === '[') pending.push({ idx: i, open: stack[stack.length - 1] });
      }
      i += KEY.length; continue;
    }
    i++;
  }
  return hits;
};

const files = (await readdir(DIR)).filter((f) => f.endsWith('.js')).sort();
let found = 0, already = 0;
const edits = [];

for (const f of files) {
  const src = await readFile(path.join(DIR, f), 'utf8');
  const hits = [];
  for (const h of scanFile(src)) {
    const body = src.slice(h.open, h.close + 1);
    if (/verificationStatus:/.test(body)) { already++; continue; }
    hits.push([h.open, h.close]);
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
