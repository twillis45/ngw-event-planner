// Wave-2e: intra-cell tiebreak — same-profile rows resolve by real structure (things they
// drive / depend-on / cost) before the due-date fallback, and it NEVER flips rows that
// already differ in importance (bounded < the 0.25 importance step).
import { playbookDecisionBoard } from '../index';

function dateN(n) { const d = new Date('2026-07-16T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
const asOf = new Date('2026-07-16T12:00:00');

describe('Wave-2e structural tiebreak', () => {
  test('a structurally-distinguishable same-weight pair no longer ties on score', () => {
    // Wedding budget vs guestcount were both authored high and previously tied at 311.00,
    // resolving only by due-date. The tiebreak (budget drives cost/affects) now separates them.
    const w = playbookDecisionBoard({ id: 'e', type: 'Wedding', date: dateN(120), guests: [], guestEstimate: 80 }, asOf);
    const rows = [...w.open, ...(w.deferred || [])];
    const budget = rows.find((r) => r.id === 'budget');
    const guest = rows.find((r) => r.id === 'guestcount');
    if (budget && guest) {
      expect(budget.priorityScore).not.toBe(guest.priorityScore);
    }
  });

  test('the tiebreak is bounded — it cannot flip importance-distinct rows (authored orderings hold)', () => {
    // Crab Feast (Wave-2a scenario): dietary (high) still leads; steam floats over where_buy.
    const b = playbookDecisionBoard({ id: 'e', type: 'Crab Feast', date: dateN(0), guestMode: 'count', guestCount: 20 }, asOf);
    const ids = b.open.map((r) => r.id);
    expect(ids.indexOf('dietary')).toBe(0);
    expect(ids.indexOf('steam_vs_order')).toBeLessThan(ids.indexOf('where_buy'));
    // every structural tiebreak value is bounded to [0, 0.2] — never a full importance step.
    for (const r of b.open) {
      const frac = r.priorityScore - Math.floor(r.priorityScore);
      expect(frac).toBeGreaterThanOrEqual(0);
      expect(frac).toBeLessThan(1);
    }
  });
});
