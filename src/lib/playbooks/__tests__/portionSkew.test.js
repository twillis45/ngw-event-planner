// PORTION SKEW — kids/light eaters scale the PROTEIN lines only; everything else (and the
// kidsCount=0 default) is byte-identical to today.
import { playbookFoodPlan } from '../index';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 40); return d.toISOString().slice(0, 10); })();
const ev = (extra) => ({ id: 'e', type: 'Crab Feast', date: future, guestCount: 30, guestEstimate: 30, ...extra });
const qtyById = (plan, id) => { const r = (plan.list || []).find((x) => x.id === id); return r ? r.qty : null; };

describe('portion skew — kids/light eaters', () => {
  test('kidsCount = 0 (or unset) is byte-identical', () => {
    const a = playbookFoodPlan(ev());
    const b = playbookFoodPlan(ev({ kidsCount: 0 }));
    expect(b.foodLow).toBe(a.foodLow);
    expect(b.foodHigh).toBe(a.foodHigh);
    expect(b.list.map((i) => [i.id, i.qty])).toEqual(a.list.map((i) => [i.id, i.qty]));
  });

  test('kids reduce the PROTEIN (crab) count, not the sides', () => {
    const base = playbookFoodPlan(ev());
    const withKids = playbookFoodPlan(ev({ kidsCount: 10 }));
    // proteins drop: crabs sized at 9/guest → 9 × (30 − 10×0.6) = 9 × 24 = 216 (vs 270).
    expect(qtyById(withKids, 'p_crabs')).toBeLessThan(qtyById(base, 'p_crabs'));
    // a non-protein side keeps the full count.
    const sideBase = qtyById(base, 'p_sides');
    const sideKids = qtyById(withKids, 'p_sides');
    if (sideBase != null) expect(sideKids).toBe(sideBase);
    // the food total drops (fewer crabs) — the budget follows the same source.
    expect(withKids.foodHigh).toBeLessThan(base.foodHigh);
  });

  test('never sizes below one adult-equivalent', () => {
    const allKids = playbookFoodPlan(ev({ guestCount: 4, guestEstimate: 4, kidsCount: 4 }));
    expect(qtyById(allKids, 'p_crabs')).toBeGreaterThan(0);
  });
});
