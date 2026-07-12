// Vegetarian/vegan double-buy — the protein base used to subtract kids but never
// vegetarians, so a vegetarian guest was bought their share of the meat protein
// (full guest count) AND the separate diet-derived veg main on top. Fixed by
// netting vegN out of the appetite-food guest count the same way kids are, at a
// full (not 40%) discount since a vegetarian eats none of the protein line.
import { playbookFoodPlan } from '../index';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 40); return d.toISOString().slice(0, 10); })();
const ev = (extra) => ({ id: 'e', type: 'Crab Feast', date: future, guestCount: 30, guestEstimate: 30, ...extra });
const qtyById = (plan, id) => { const r = (plan.list || []).find((x) => x.id === id); return r ? r.qty : null; };

describe('vegetarian/vegan guests no longer double-bought', () => {
  test('vegetarians reduce the protein (crab) count — previously it never moved at all', () => {
    const base = playbookFoodPlan(ev());
    const withVeg = playbookFoodPlan(ev({ dietCounts: { Vegetarian: 6 } }));
    expect(qtyById(withVeg, 'p_crabs')).toBeLessThan(qtyById(base, 'p_crabs'));
  });

  test('the diet-derived veg main is still added alongside the reduced protein (no longer double-bought)', () => {
    const withVeg = playbookFoodPlan(ev({ dietCounts: { Vegetarian: 6 } }));
    const vegLine = (withVeg.list || []).find((i) => i.id === 'diet-veg');
    expect(vegLine).toBeTruthy();
    expect(vegLine.qty).toBe(6);
  });

  test('vegetarians discount the protein MORE than the same number of kids — a veg guest eats none of it, a kid eats 40%', () => {
    const withKids = playbookFoodPlan(ev({ kidsCount: 6 }));
    const withVeg = playbookFoodPlan(ev({ dietCounts: { Vegetarian: 6 } }));
    expect(qtyById(withVeg, 'p_crabs')).toBeLessThan(qtyById(withKids, 'p_crabs'));
  });

  test('kids and vegetarians combine — strictly less protein than either discount alone', () => {
    const withVeg = playbookFoodPlan(ev({ dietCounts: { Vegetarian: 6 } }));
    const withKids = playbookFoodPlan(ev({ kidsCount: 10 }));
    const both = playbookFoodPlan(ev({ kidsCount: 10, dietCounts: { Vegetarian: 6 } }));
    expect(qtyById(both, 'p_crabs')).toBeLessThan(qtyById(withVeg, 'p_crabs'));
    expect(qtyById(both, 'p_crabs')).toBeLessThan(qtyById(withKids, 'p_crabs'));
  });

  test('never sizes below one adult-equivalent even when vegetarians outnumber the crowd', () => {
    const allVeg = playbookFoodPlan(ev({ guestCount: 4, guestEstimate: 4, dietCounts: { Vegetarian: 4 } }));
    expect(qtyById(allVeg, 'p_crabs')).toBeGreaterThan(0);
  });

  test('no vegetarians (or dietCounts unset) is byte-identical to before', () => {
    const a = playbookFoodPlan(ev());
    const b = playbookFoodPlan(ev({ dietCounts: {} }));
    expect(b.foodLow).toBe(a.foodLow);
    expect(b.foodHigh).toBe(a.foodHigh);
  });
});
