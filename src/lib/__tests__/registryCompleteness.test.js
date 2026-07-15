// ─── REGISTRY COMPLETENESS: the qidx may not hand-wire attention ─────────────
//
// The surface registry's header states the disease this file inoculates against:
//
//     "Every new surface starts life invisible and stays invisible until someone
//      remembers to hand-wire a row. That is not a bug; it is a bug FACTORY."
//
// Wave 5 moved the HostShellV2 quiet-index (qidx) attention tints and count
// badges onto the ledger: every row's `attn:` reads `raised[<surfaceId>]`, where
// `raised` is the memoized result of raiseCounts(event). This test is the
// RATCHET that keeps it that way. It reads the shell's SOURCE (not its runtime)
// because the failure mode is a source-level habit: someone adds a row and types
// `attn: myLocalPredicate > 0` — which compiles, renders, and silently re-creates
// the two-ledgers world the registry was built to end.
//
// WHAT IT ENFORCES, EXACTLY:
//
//   1. Inside the qidx region (from the "QUIET INDEX" banner comment to the
//      rows array's `].filter(Boolean)`), every occurrence of `attn:` must be a
//      ledger read matching (whitespace-tolerant):
//
//          attn: (raised['<surface-id>'] || 0) > 0
//
//      i.e. the regex /attn:\s*\(\s*raised\[\s*['"]/ — OR carry the literal
//      marker `registry-gap:` on the same line. Exactly ONE such exception is
//      allowed today (the "People you're hiring" row: booking PROGRESS lives in
//      the canonical vendor rollup and has no SURFACES id). Adding a second
//      exception fails this test on purpose — write a raiser instead.
//
//   2. Every surface id the shell reads via raised['...'] (attn or badge) must
//      be a real id: in SURFACES, or in the wave-5 CONTRACT list below while
//      its raiser is still landing. Any id outside the contract fails
//      immediately — a typo'd id would silently never tint.
//
//   3. The four rows wave 5 wired (seating / lodging / travel-air /
//      travel-ground) must still read the ledger — deleting the reads outright
//      is as much a regression as hand-wiring new ones.

import fs from 'fs';
import path from 'path';
import { SURFACES } from '../surfaceRegistry';

const SHELL_PATH = path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx');

// The wave-5 registry contract (parallel-landing raisers). CONTRACT CRUTCH:
// membership below is checked against SURFACES ∪ (this list minus what SURFACES
// already has), so each id self-expires from the crutch the moment its raiser
// lands — no edit here needed. When ALL raisers have landed this list is inert
// and can be deleted, leaving a pure SURFACES-membership check.
const CONTRACT_IDS = [
  'risks', 'vendor-conflicts', 'vendor-arrivals', 'vendor-reconfirm', 'day-of',
  'seating', 'lodging', 'travel-air', 'travel-ground',
  'helpers', 'decisions', 'vendor-payments', 'vendor-coi',
];

const src = fs.readFileSync(SHELL_PATH, 'utf8');

// The qidx region: banner comment through the end of the rows array. Both
// markers are load-bearing prose/structure — if either moves, fail loudly
// rather than silently scanning nothing.
function qidxRegion() {
  const start = src.indexOf('QUIET INDEX');
  const end = src.indexOf('].filter(Boolean)', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('registry completeness: qidx attention derives from the raise ledger', () => {
  test('every attn: in the qidx region is a ledger read (one documented registry-gap exception)', () => {
    const region = qidxRegion();
    // Each attn: occurrence, with the remainder of its line for inspection.
    const occurrences = [...region.matchAll(/attn:[^\n]*/g)].map((m) => m[0]);
    expect(occurrences.length).toBeGreaterThan(0);

    const ledgerRead = /^attn:\s*\(\s*raised\[\s*['"][a-z-]+['"]\s*\]\s*\|\|\s*0\s*\)\s*>\s*0/;
    const exceptions = [];
    const violations = [];
    for (const line of occurrences) {
      if (ledgerRead.test(line)) continue;
      if (line.includes('registry-gap:')) { exceptions.push(line); continue; }
      violations.push(line);
    }

    // A hand-wired attention boolean is the bug FACTORY the registry exists to
    // kill. If this fails: give the surface a raise() in surfaceRegistry.js and
    // read raised['<id>'] here instead.
    expect(violations).toEqual([]);

    // Exactly one exception (vendor booking progress — canonical rollup, not a
    // raise). A second one means someone took the shortcut; don't.
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]).toContain('registry-gap:');
  });

  test("every raised['...'] surface id exists in the registry (contract-pending ids tolerated until their raisers land)", () => {
    const ids = [...src.matchAll(/raised\[\s*['"]([a-z-]+)['"]\s*\]/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);

    const known = new Set(SURFACES.map((s) => s.id));
    // Self-expiring crutch: a contract id is only tolerated while SURFACES
    // lacks it. This assertion goes fully strict (pure SURFACES membership)
    // as the wave-5 raisers land — no test edit required.
    const tolerated = new Set([...known, ...CONTRACT_IDS.filter((id) => !known.has(id))]);
    const unknown = [...new Set(ids)].filter((id) => !tolerated.has(id));
    // An id outside both the registry and the contract is a typo or an
    // invented surface — either way the row would never tint. Fail now.
    expect(unknown).toEqual([]);
  });

  test('the wave-5 wired rows still read the ledger (seating, lodging, travel-air, travel-ground)', () => {
    const region = qidxRegion();
    for (const id of ['seating', 'lodging', 'travel-air', 'travel-ground']) {
      expect(region).toMatch(new RegExp(`raised\\[\\s*['"]${id}['"]\\s*\\]`));
    }
  });

  test('contract ids are the agreed set — registry may grow only through the contract or a conscious edit here', () => {
    // Every id the registry exports today must be part of the agreed contract;
    // a brand-new id should arrive by expanding the contract consciously (and
    // wiring its consumer), not by side door.
    const stray = SURFACES.map((s) => s.id).filter((id) => !CONTRACT_IDS.includes(id));
    expect(stray).toEqual([]);
  });
});
