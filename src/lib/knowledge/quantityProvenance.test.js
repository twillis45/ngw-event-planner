// Wave-2w: item-quantity provenance grounded to REAL portion/drink sources (WebstaurantStore
// protein + portions; party drink-provisioning consensus). A per-guest QUANTITY is a
// researchable norm (unlike a taste judgment), so grounding it is real Grounding coverage.
import { ALL_PLAYBOOKS, playbookTasks } from '../playbooks';
import { QTY_SOURCES, isGroundedItemQty, qtySourcesFor } from './quantityProvenance';

describe('item-quantity provenance grounding', () => {
  test('a meaningful fraction of per-guest quantities is grounded to real sources', () => {
    let withProv = 0; let grounded = 0; const bySource = {};
    for (const pb of ALL_PLAYBOOKS) {
      for (const p of (pb.purchases || [])) {
        if (p.provenance) withProv++;
        if (p.provenance && isGroundedItemQty(p.provenance)) {
          grounded++;
          expect(qtySourcesFor(p.provenance).length).toBeGreaterThan(0);
          for (const s of p.provenance.sources) expect(QTY_SOURCES[s]).toBeTruthy();
          bySource[p.provenance.sources[0]] = (bySource[p.provenance.sources[0]] || 0) + 1;
        }
      }
    }
    expect(grounded).toBeGreaterThanOrEqual(35); // wave-2w 31 + wave-2x consistency sweep = 38
    expect(grounded).toBeLessThan(withProv); // honest — many remain a research backlog / are judgment
    expect(bySource['bar-provision-2026']).toBeGreaterThan(0);
    expect(bySource['webstaurant-protein-2026']).toBeGreaterThan(0);
  });

  test('isGroundedItemQty rejects synthesized / sourceless / bogus-source provenance', () => {
    expect(isGroundedItemQty(null)).toBe(false);
    expect(isGroundedItemQty({ tier: 'trade-heuristic', sources: ['bar-provision-2026'] })).toBe(false);
    expect(isGroundedItemQty({ tier: 'researched', sources: [] })).toBe(false);
    expect(isGroundedItemQty({ tier: 'researched', sources: ['not-a-real-source'] })).toBe(false);
    expect(isGroundedItemQty({ tier: 'researched', sources: ['bar-provision-2026'] })).toBe(true);
  });

  test('every QTY_SOURCES entry is a real, dated, attributed source', () => {
    for (const [, s] of Object.entries(QTY_SOURCES)) {
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(String(s.org).length).toBeGreaterThan(3);
      expect(String(s.claim).length).toBeGreaterThan(30);
    }
  });

  test('the buy-list surfaces qtyGrounded (reaches runtime)', () => {
    // every buy-task row carries a boolean qtyGrounded flag derived from the item provenance,
    // so a UI can show sourced quantities. Assert the wiring, not window timing.
    const near = new Date(); near.setDate(near.getDate() + 2);
    const rows = playbookTasks({ id: 'e', type: 'Baby Shower', date: near.toISOString().slice(0, 10), guests: [], guestEstimate: 30, guestMode: 'count', guestCount: 30, foodChoices: {} });
    expect(Array.isArray(rows)).toBe(true);
    for (const r of rows) expect(typeof r.qtyGrounded).toBe('boolean');
  });
});
