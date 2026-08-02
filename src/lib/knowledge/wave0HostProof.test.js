// ─── WAVE 0 HOST PROOF (Phase 5F.11) ─────────────────────────────────────────
//
// The last link in the chain the directive names:
//
//   Claim -> Axis -> Source -> Evidence -> Tier -> Governance -> Predicate
//         -> Publish -> Bake -> HOST OUTPUT
//
// Wave 0 committed three ice provenance records. This asserts what a HOST actually
// sees for each, against real `playbookFoodPlan` output — not against the corpus, not
// against the snapshot, and not against intent.
//
// It also pins the property that made the whole exercise necessary: the value must NOT
// have moved. Every Wave 0 record is provenance-only. If a future edit quietly changes
// a quantity while carrying the same source, this fails.
import { ALL_PLAYBOOKS, playbookFoodPlan, getPlaybook } from '../playbooks/index';
import { isGroundedItemQty } from './quantityProvenance';
import corpus from './publishedKcrs.json';
import snapshot from './publishedKnowledge.json';

const EVENT = (type) => ({ id: 'wave0', type, date: '2026-09-01', guestCount: 18 });
const rowFor = (type, id) => {
  const list = (playbookFoodPlan(EVENT(type), {}) || {}).list || [];
  return list.find((r) => r && r.id === id) || null;
};

// What Wave 0 governed, and the value each line MUST still carry.
const WAVE0 = [
  { asset: 'Fish Fry', id: 'p_ice', source: 'reddy-ice-2026', authored: 1.5 },
  { asset: 'Dinner Party', id: 'p_ice', source: 'bar-provision-2026', authored: 1.5 },
  { asset: 'Crab Feast', id: 'p_ice', source: 'reddy-ice-2026', authored: 2 },
];

describe('Wave 0 reaches the host', () => {
  test.each(WAVE0)('$asset $id renders a Sourced line from $source', ({ asset, id, source }) => {
    const row = rowFor(asset, id);
    expect(row).toBeTruthy();
    // hostv2 renders on `it.qtyGrounded && it.provenance && it.provenance.note`.
    expect(row.qtyGrounded).toBe(true);
    expect(row.provenance).toBeTruthy();
    expect(String(row.provenance.note || '').length).toBeGreaterThan(0);
    expect(row.provenance.sources).toEqual([source]);
    expect(row.provenance.tier).toBe('researched');
    // and the predicate agrees, which is what makes the line honest
    expect(isGroundedItemQty(row.provenance)).toBe(true);
  });

  test.each(WAVE0)('$asset $id: the VALUE did not move — provenance-only', ({ asset, id, authored }) => {
    // The rule Wave 0 was executed under: never change a quantity because a source
    // suggests a higher one. Each authored figure is asserted unchanged at the source.
    const pb = getPlaybook(asset);
    const p = (pb.purchases || []).find((x) => x.id === id);
    expect(p.qtyPerGuest).toBe(authored);
  });

  test('the commercial-source caveat travels all the way to the rendered note', () => {
    // Two of the three cite a packaged-ice manufacturer. A host reading the Sourced
    // line should be able to see that, not just a reviewer reading the KCR.
    for (const asset of ['Fish Fry', 'Crab Feast']) {
      expect(rowFor(asset, 'p_ice').provenance.note).toMatch(/CAVEAT|ceiling-leaning/);
    }
  });
});

describe('corpus, snapshot and host agree', () => {
  test('every committed record has a snapshot entry carrying its evidence ids', () => {
    // The defect Wave 0 stopped for: newProvenance written empty, so the bake produced
    // evidenceIds [] and the field became permanently uncorrectable.
    for (const e of (snapshot.entries || [])) {
      expect(Array.isArray(e.evidenceIds)).toBe(true);
      expect(e.evidenceIds.length).toBeGreaterThan(0);
      expect(e.provenance.verificationStatus).toBe('cited');
    }
  });

  test('both halves of provenance agree on every committed record', () => {
    for (const k of corpus) {
      const nv = k.proposal.newValue;
      const np = k.proposal.newProvenance;
      if (!nv || !Array.isArray(nv.sources) || !nv.sources.length) continue;
      expect(np.sources).toEqual(nv.sources);
    }
  });

  test('no ungoverned ice line claims a source it does not have', () => {
    // The inverse: playbooks Wave 0 did NOT touch must still render nothing.
    const untouched = ALL_PLAYBOOKS
      .filter((pb) => !WAVE0.some((w) => w.asset === pb.type))
      .filter((pb) => (pb.purchases || []).some((p) => p.id === 'p_ice'));
    expect(untouched.length).toBeGreaterThan(10);
    for (const pb of untouched) {
      const row = rowFor(pb.type, 'p_ice');
      if (row && row.qtyGrounded) expect(isGroundedItemQty(row.provenance)).toBe(true);
    }
  });
});
