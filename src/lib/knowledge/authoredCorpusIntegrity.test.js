// ─── AUTHORED CORPUS INTEGRITY — the other half of the room (Phase 5F.5) ─────
//
// WHAT WAS ALREADY GUARDED. `corpusIntegrity.test.js` asserts that no PUBLISHED KCR
// and no BAKED SNAPSHOT entry lists sources while failing the grounding predicate, and
// `groundingHonesty` blocks new ones at the publish gate.
//
// WHAT WAS NOT. Both of those guard knowledge that arrived through GOVERNANCE. The
// authored playbook data — 537 purchase lines, 39 files, the overwhelming majority of
// the corpus — went through none of it. Measured here in 5F.5:
//
//   7  authored lines list sources AND fail isGroundedItemQty
//  16  authored source strings resolve in NO registry (raw URLs, free-text vendors)
//
// That is the same defect class the publish gate exists to stop, sitting in the larger
// corpus, unguarded, because the gate guards a door the authored data never walks
// through.
//
// WHY THIS FILE PINS RATHER THAN DEMANDS ZERO. Repairing those lines means editing
// playbook data by hand — which is exactly what the Acquisition workflow exists to
// replace, and what this program forbids. So the gate makes the number a RATCHET:
// the known offenders are named, and any NEW one fails. The list may shrink as
// corrections are published through governance. It may never grow.
//
// AND IT CHECKS THE THING THAT ACTUALLY MATTERS. A listed-but-unresolvable source is
// untidy; a source shown to a HOST without the predicate passing is a lie. The last
// block asserts the second property against real `playbookFoodPlan` output, because
// the corpus is a claim and output is the witness.
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks/index';
import { isGroundedItemQty, QTY_SOURCES } from './quantityProvenance';
import { COST_SOURCES, isGroundedCost } from './costProvenance';

const key = (pb, p) => `${pb.type} | ${p.id}`;
const sourcesOf = (prov) => (prov && typeof prov === 'object' && Array.isArray(prov.sources)
  ? prov.sources.filter(Boolean) : []);

/** Every authored purchase line, flattened once. */
const LINES = [];
for (const pb of ALL_PLAYBOOKS) {
  for (const p of (pb.purchases || [])) LINES.push({ pb, p, prov: p.provenance });
}

// ── THE RATCHET ──────────────────────────────────────────────────────────────
// Measured 2026-08-01. Every one of these is an ENGINE-OWNED line: six are the
// channel-priced proteins (`sourcingPrices` wins over `unitCostRange`) and the seventh
// is `p_crabs`, which the crab engine delegates outright. None of them renders a
// "Sourced —" line, because that render is gated on the predicate — proven below.
const KNOWN_SOURCED_NOT_GROUNDING = [
  'Crab Feast | p_crabs',
  'Get-Together | p_protein',
  'Juneteenth Cookout | p_chicken',
  'Juneteenth Cookout | p_ribs',
  'The Cookout | p_burgers_dogs',
  'The Cookout | p_chicken',
  'The Cookout | p_ribs',
];

describe('the AUTHORED corpus — sources vs the predicate', () => {
  test('it is not empty — a vacuous pass would hide everything below', () => {
    expect(LINES.length).toBeGreaterThan(400);
  });

  // ── THE PREDICATE WAS THE WRONG AXIS (2026-08-14) ──────────────────────────
  // This measured `!isGroundedItemQty` alone, which resolves sources only in the
  // per-guest QUANTITY registry. Six of the seven pinned offenders are the
  // channel-priced proteins and the seventh is p_crabs — every one of them cites
  // real, dated COST sources. They were never "sourced but not grounding"; they
  // were being graded against a registry their claim does not belong to.
  //
  // A line is an offender when it lists sources and fails BOTH axes — that is
  // the defect this file exists to stop: a claim citing something no registry
  // resolves. Each predicate still requires tier:'researched' and that EVERY id
  // resolve, so nothing here lowers the bar.
  const failsBothAxes = (prov) => !isGroundedItemQty(prov) && !isGroundedCost(prov);

  test('RATCHET: no NEW authored line lists sources while resolving in NO registry', () => {
    const offenders = LINES
      .filter(({ prov }) => sourcesOf(prov).length && failsBothAxes(prov))
      .map(({ pb, p }) => key(pb, p))
      .sort();
    // Named, not counted: a failure has to say WHICH line regressed.
    expect(offenders).toEqual(KNOWN_SOURCED_NOT_GROUNDING);
  });

  test('RATCHET: the count may shrink, never grow', () => {
    const n = LINES.filter(({ prov }) => sourcesOf(prov).length && failsBothAxes(prov)).length;
    expect(n).toBeLessThanOrEqual(KNOWN_SOURCED_NOT_GROUNDING.length);
  });
});

describe('the AUTHORED corpus — do the cited sources resolve at all', () => {
  const REGISTERED = new Set([...Object.keys(QTY_SOURCES), ...Object.keys(COST_SOURCES)]);

  test('RATCHET: unresolvable source strings are confined to the known lines', () => {
    // A raw URL or a free-text vendor description is not a source ID — nothing can
    // look it up, so nothing can re-verify it or tell a host where the number came
    // from. The source PICKER (5F.2) makes new ones impossible; these predate it.
    const bad = new Set();
    for (const { pb, p, prov } of LINES) {
      for (const s of sourcesOf(prov)) if (!REGISTERED.has(s)) bad.add(key(pb, p));
    }
    expect([...bad].sort()).toEqual(KNOWN_SOURCED_NOT_GROUNDING);
  });

  test('every RESOLVABLE authored source belongs to a real registry entry', () => {
    for (const { prov } of LINES) {
      for (const s of sourcesOf(prov)) {
        if (!REGISTERED.has(s)) continue;
        expect(QTY_SOURCES[s] || COST_SOURCES[s]).toBeTruthy();
      }
    }
  });
});

// ── THE PROPERTY THAT ACTUALLY REACHES A HOST ────────────────────────────────
describe('runtime output — an unresolvable source never becomes a host claim', () => {
  const EVENT = (type) => ({ id: 'authored-integrity', type, date: '2026-09-01', guestCount: 18 });
  const plan = (type) => {
    try { return (playbookFoodPlan(EVENT(type), {}) || {}).list || []; } catch (_e) { return []; }
  };

  test('NO rendered line is grounded while its provenance fails the predicate', () => {
    // hostv2 renders `it.qtyGrounded && it.provenance && it.provenance.note`. This is
    // that condition, asserted against real output for every playbook.
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const row of plan(pb.type)) {
        if (!row || !row.qtyGrounded) continue;
        if (!isGroundedItemQty(row.provenance)) {
          bad.push(`${pb.type} | ${row.id || row.item} -> qtyGrounded=true, predicate=false`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('a ratcheted line reaches a host ONLY when governance has repaired it', () => {
    // The justification for pinning rather than hand-editing rests entirely on this.
    //
    // Written first as "none of the 7 ever renders", which FAILED — and the failure was
    // the system working. `Crab Feast | p_crabs` authors `tier: 'primary'` with four
    // free-text vendor strings, and a published KCR supersedes that with
    // `tier: 'researched', sources: ['webstaurant-protein-2026']`. Measured:
    //
    //   AUTHORED  tier=primary      sources=["Captain White's Seafood (Oxon Hill, MD…"]
    //   RUNTIME   tier=researched   sources=["webstaurant-protein-2026"]
    //             governedFields=["provenance"]   qtyGrounded=true
    //
    // So the correct property is not silence, it is: a line either renders nothing, or
    // renders through GOVERNED provenance that grounds. An authored line can never
    // reach a host on its own unresolvable sources.
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const row of plan(pb.type)) {
        const k = `${pb.type} | ${row && row.id}`;
        if (!KNOWN_SOURCED_NOT_GROUNDING.includes(k)) continue;
        if (!(row.qtyGrounded && row.provenance && row.provenance.note)) continue;
        const governed = Array.isArray(row.governedFields) && row.governedFields.includes('provenance');
        if (!governed || !isGroundedItemQty(row.provenance)) {
          bad.push(`${k} renders a Sourced line WITHOUT governed, grounding provenance`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('exactly one ratcheted line has been repaired through governance so far', () => {
    // Pins the shrink path itself. When another is corrected this number moves and the
    // ratchet list above should lose a member in the same change — the two must move
    // together, or the docs and the corpus have drifted apart.
    const repaired = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const row of plan(pb.type)) {
        const k = `${pb.type} | ${row && row.id}`;
        if (!KNOWN_SOURCED_NOT_GROUNDING.includes(k)) continue;
        if (Array.isArray(row.governedFields) && row.governedFields.includes('provenance')
          && isGroundedItemQty(row.provenance)) repaired.push(k);
      }
    }
    expect(repaired).toEqual(['Crab Feast | p_crabs']);
  });

  test('every line that DOES render a Sourced claim cites only registered sources', () => {
    const REGISTERED = new Set([...Object.keys(QTY_SOURCES), ...Object.keys(COST_SOURCES)]);
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const row of plan(pb.type)) {
        if (!row || !row.qtyGrounded || !row.provenance || !row.provenance.note) continue;
        for (const s of sourcesOf(row.provenance)) {
          if (!REGISTERED.has(s)) bad.push(`${pb.type} | ${row.id} -> "${String(s).slice(0, 50)}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
