#!/usr/bin/env node
// ─── WHAT A GREEN RUN ACTUALLY COVERS ──────────────────────────────────────
//
// "6,226 tests pass" invites one wrong inference: that the host shell works.
// It does not say that, and cannot. react-scripts pins jest's roots to
// demo/src, so jest CANNOT EXECUTE hostv2 — the suites that reach it read it
// as text. Red-proofed 2026-09-03: with HostShellV2.jsx made unparseable,
// vitest failed while heroComposition and sendLedger — which both READ that
// file — stayed green across 73 assertions.
//
// This prints the decomposition, so any claim about coverage has the honest
// breakdown beside it instead of one headline number.
//
// Run: npm run coverage:honesty
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};

const jestTests = walk(path.join(ROOT, 'src')).filter((f) => f.endsWith('.test.js'));
const readsHostv2 = jestTests.filter((f) => {
  const s = fs.readFileSync(f, 'utf8');
  return s.includes('readFileSync') && s.includes('hostv2');
});

const e2e = walk(path.join(ROOT, 'hostv2', 'e2e')).filter((f) => f.endsWith('.spec.mjs'));
// Dormant BY DESIGN: the _*Capture specs render artifacts for board sittings
// and say so in their first two lines. Other specs quote the phrase "not a
// gate" in comments ABOUT gate honesty — they are live, and counting them as
// dormant was a classification error caught by reading the context.
const dormant = e2e.filter((f) => path.basename(f).startsWith('_'));

const vitest = walk(path.join(ROOT, 'hostv2', 'test')).filter((f) => f.endsWith('.test.mjs'));

const rows = [
  ['jest suites total', jestTests.length, 'execute demo/src — the shared engine'],
  ['  ...of which only READ hostv2', readsHostv2.length, 'TRIPWIRES. Cannot catch a parse error.'],
  ['vitest files (execute hostv2)', vitest.length, 'the seam. imports the tree.'],
  ['e2e specs total', e2e.length, 'execute the built shell in a browser'],
  ['  ...dormant by design (_*Capture)', dormant.length, 'render artifacts, never gate'],
  ['e2e LIVE GATES', e2e.length - dormant.length, 'the real behavior instrument'],
];
const w = Math.max(...rows.map((r) => r[0].length));
console.log('\nWhat a green run covers\n' + '─'.repeat(w + 30));
for (const [k, v, why] of rows) console.log(`${k.padEnd(w)}  ${String(v).padStart(4)}   ${why}`);
console.log('─'.repeat(w + 30));
console.log('A behavior claim needs an e2e. A text gate is a tripwire, and is');
console.log('never citable as behavior coverage.\n');

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    jestSuites: jestTests.length, hostv2TextGates: readsHostv2.length,
    vitestFiles: vitest.length, e2eTotal: e2e.length,
    e2eDormant: dormant.length, e2eLiveGates: e2e.length - dormant.length,
  }, null, 2));
}
export const counts = {
  jestSuites: jestTests.length, hostv2TextGates: readsHostv2.length,
  vitestFiles: vitest.length, e2eTotal: e2e.length,
  e2eDormant: dormant.length, e2eLiveGates: e2e.length - dormant.length,
};
