#!/usr/bin/env node
// Protein coverage + per-category food-cost breakdown. Shows which proteins the sourcing
// system re-prices, by category, with the researched per-channel $/lb and how many
// playbook items each covers. Regexes/prices mirror src/lib/sourcing.js (raw node sees
// that file as CJS, so they're inlined here — keep in sync).
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const PROTEIN_RE = /\b(rib|ribs|chicken|brisket|sausage|hot ?link|half-?smoke|pork|beef|turkey|seafood|shrimp|fish|crab|crawfish|lamb|wing|oxtail|meatball|steak|burger|salmon|prawn|bacon|ham)\b/i;
const CATS = [
  { key: 'ribs',    re: /\b(rib|ribs|spare ?rib|baby ?back|st\.? ?louis)\b/i, butcher: [4, 7], costco: [3, 4], grocery: [5, 8] },
  { key: 'brisket', re: /\bbrisket\b/i, butcher: [6, 10], costco: [4, 7], grocery: [5, 9] },
  { key: 'chicken', re: /\b(chicken|drumstick|thigh|wing|quarter|poultry)\b/i, butcher: [2, 4], costco: [1, 2.5], grocery: [3, 5] },
  { key: 'sausage', re: /\b(sausage|hot ?link|half-?smoke|brat|kielbasa|andouille|frank|hot ?dog)\b/i, butcher: [4, 7], costco: [3, 5], grocery: [4, 6] },
  { key: 'beef',    re: /\b(burger|ground beef|patty|patties|steak|beef|meatball)\b/i, butcher: [5, 8], costco: [3, 6], grocery: [5, 8] },
  { key: 'pork',    re: /\b(pork|pulled pork|boston butt|shoulder|bacon|ham)\b/i, butcher: [3, 6], costco: [2, 4], grocery: [3, 6] },
  { key: 'shrimp',  re: /\b(shrimp|prawn)\b/i, butcher: [8, 13], costco: [6, 10], grocery: [9, 14] },
  { key: 'seafood', re: /\b(fish|salmon|tilapia|catfish|seafood|crab|crawfish|lobster|oyster|clam|mussel|scallop)\b/i, butcher: [7, 13], costco: [6, 11], grocery: [8, 14] },
  { key: 'turkey',  re: /\b(turkey)\b/i, butcher: [2, 5], costco: [1.5, 3], grocery: [2, 5] },
  { key: 'lamb',    re: /\b(lamb|oxtail|goat)\b/i, butcher: [7, 14], costco: [6, 11], grocery: [8, 16] },
];
const catFor = (name) => CATS.find((c) => c.re.test(name));

const DATA = path.resolve('src/lib/playbooks/data');
const files = (await readdir(DATA)).filter((f) => f.endsWith('.js')).sort();
const counts = Object.fromEntries(CATS.map((c) => [c.key, 0]));
const playbooks = Object.fromEntries(CATS.map((c) => [c.key, new Set()]));
let proteins = 0, uncovered = 0;
for (const f of files) {
  const txt = await readFile(path.join(DATA, f), 'utf8');
  const re = /item:\s*'([^']+)'[^}]*?unitCostRange:\s*\[/g;
  let m;
  while ((m = re.exec(txt))) {
    const name = m[1];
    if (!PROTEIN_RE.test(name)) continue;
    proteins++;
    const c = catFor(name);
    if (!c) { uncovered++; continue; }
    counts[c.key]++; playbooks[c.key].add(f.replace(/\.js$/, ''));
  }
}
const rng = (r) => `$${r[0]}-${r[1]}`;
const pct = (a, b) => Math.round((1 - (a[0] + a[1]) / (b[0] + b[1])) * 100);
console.log(`\n  FOOD COST AFFECTED — per-channel protein pricing  (${proteins - uncovered}/${proteins} proteins · ${files.length} playbooks)\n`);
console.log(`  ${'category'.padEnd(9)} ${'items'.padStart(5)}  ${'butcher'.padStart(8)} ${'costco'.padStart(8)} ${'grocery'.padStart(8)}   Costco vs grocery`);
for (const c of CATS) {
  if (!counts[c.key]) continue;
  console.log(`  ${c.key.padEnd(9)} ${String(counts[c.key]).padStart(5)}  ${rng(c.butcher).padStart(8)} ${rng(c.costco).padStart(8)} ${rng(c.grocery).padStart(8)}   ${pct(c.costco, c.grocery) > 0 ? `-${pct(c.costco, c.grocery)}%` : ''}`);
}
console.log(`\n  (butcher = default/playbook base · Costco & grocery re-priced from researched $/lb · sides/drinks/supplies keep authored base — channel pricing doesn't apply)\n`);
