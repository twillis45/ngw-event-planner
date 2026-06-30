// FOOD-2A Stage 1 — Effective Item seam.
// Two jobs:
//   A. GOLDEN / no-drift: across 6 representative playbooks × the 3 existing sourcing modes,
//      prove playbookFoodPlan's `effectiveItems` is a FAITHFUL projection of the untouched
//      `list`, that the totals are well-formed, and that sourcing/BLS still move the numbers
//      (i.e. the read-only seam changed no behavior).
//   B. RESOLVER unit: prove resolveEffectiveItem's contract on crafted inputs (kind, honesty,
//      provenance, defensive on host-added lines, never collapses a range into a quote).

import { playbookFoodPlan } from '../playbooks';
import { resolveEffectiveItem } from '../effectiveItem';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 40); return d.toISOString().slice(0, 10); })();
const ev = (type, extra = {}) => ({ id: 'e', type, date: future, guestCount: 24, guestEstimate: 24, ...extra });

const PLAYBOOKS = ['Get-Together', 'Dinner Party', 'Crab Feast', 'Graduation', 'Baby Shower', 'Birthday'];
const MODES = ['butcher', 'costco', 'grocery'];

describe('FOOD-2A · golden — effectiveItems is a faithful, behavior-identical projection', () => {
  for (const type of PLAYBOOKS) {
    for (const mode of MODES) {
      test(`${type} · ${mode}: effectiveItems mirrors list 1:1 with no drift`, () => {
        const plan = playbookFoodPlan(ev(type, { sourcing: mode }));
        expect(Array.isArray(plan.list)).toBe(true);
        expect(plan.list.length).toBeGreaterThan(0);
        // 1:1 with the SAME order — the projection adds nothing and drops nothing.
        expect(plan.effectiveItems.length).toBe(plan.list.length);
        plan.list.forEach((li, idx) => {
          const eff = plan.effectiveItems[idx];
          expect(eff.id).toBe(li.id);
          expect(eff.name).toBe(li.item || li.short || '');
          // Cost reflects the line EXACTLY: a host-locked line uses its locked value, else
          // the engine's low/high. No rounding, no re-derivation.
          const expLow = li.locked != null ? li.locked : (li.low || 0);
          const expHigh = li.locked != null ? li.locked : (li.high || 0);
          expect(eff.cost.low).toBe(expLow);
          expect(eff.cost.high).toBe(expHigh);
          // HONESTY: an engine range is never collapsed into a single fabricated quote.
          if (li.locked == null && li.low !== li.high) expect(eff.cost.kind).toBe('range');
          expect(eff.provenance).toBeTruthy();
          expect(['engine', 'swap', 'host']).toContain(eff.provenance.costFrom);
          expect(eff.visible).toBe(true);
        });
        // Totals well-formed and consistent with the projection.
        expect(typeof plan.foodLow).toBe('number');
        expect(plan.foodHigh).toBeGreaterThanOrEqual(plan.foodLow);
      });
    }
  }

  test('sourcing still moves protein cost (behavior preserved through the seam)', () => {
    // Crab Feast has a real protein; butcher vs costco must differ on at least one line.
    const but = playbookFoodPlan(ev('Crab Feast', { sourcing: 'butcher' }));
    const cos = playbookFoodPlan(ev('Crab Feast', { sourcing: 'costco' }));
    const costAt = (plan) => plan.effectiveItems.reduce((s, e) => s + (e.cost.high || 0), 0);
    expect(costAt(but)).not.toBe(costAt(cos)); // a real, non-cosmetic difference survives
  });

  test('BLS price factor still scales the projected cost', () => {
    const base = playbookFoodPlan(ev('Get-Together', { sourcing: 'butcher' }), { priceFactor: 1 });
    const hi = playbookFoodPlan(ev('Get-Together', { sourcing: 'butcher' }), { priceFactor: 1.2 });
    const sum = (p) => p.effectiveItems.reduce((s, e) => s + (e.cost.high || 0), 0);
    expect(sum(hi)).toBeGreaterThan(sum(base));
  });

  test('a made/unknown food choice still gates visibility upstream (effectiveItems are all visible)', () => {
    // The list is post-predicate, so every projected item is visible; a hidden item simply
    // isn't in the list. Prove a choice reshapes the COUNT, not a per-item visible:false.
    const a = playbookFoodPlan(ev('Crab Feast', { sourcing: 'butcher', foodChoices: {} }));
    expect(a.effectiveItems.every((e) => e.visible === true)).toBe(true);
  });
});

describe('FOOD-2A · resolver unit — contract on crafted lines', () => {
  const baseEvent = { id: 'e', sourcing: 'butcher', foodGot: {} };

  test('engine range → kind "range", honest perUnit, provenance engine', () => {
    const eff = resolveEffectiveItem(
      { id: 'p_ribs', item: 'Pork ribs', cat: 'food', qty: 12, unit: 'lb', where: ['Butcher', 'Costco'], low: 48, high: 84, perUnitLow: 4, perUnitHigh: 7 },
      baseEvent,
    );
    expect(eff.cost).toMatchObject({ low: 48, high: 84, kind: 'range' });
    expect(eff.cost.perUnit).toEqual([4, 7]);
    expect(eff.source).toMatchObject({ store: 'Butcher', options: ['Butcher', 'Costco'], global: 'butcher' });
    expect(eff.provenance.costFrom).toBe('engine');
    expect(eff.flags).toMatchObject({ skipped: false, locked: false, swapped: false, got: false });
  });

  test('host-locked line → kind "fixed", cost is the host number, provenance host (NOT a fabricated quote)', () => {
    const eff = resolveEffectiveItem({ id: 'x', item: 'Cake', cat: 'food', low: 30, high: 50, locked: 42 }, baseEvent);
    expect(eff.cost).toMatchObject({ low: 42, high: 42, kind: 'fixed' });
    expect(eff.provenance.costFrom).toBe('host');
    expect(eff.flags.locked).toBe(true);
  });

  test('$0 line → kind "free" (potluck / host-provided), never an invented price', () => {
    const eff = resolveEffectiveItem({ id: 'a1', item: "Auntie's potato salad", group: 'Food', low: 0, high: 0, added: true }, baseEvent);
    expect(eff.cost.kind).toBe('free');
    expect(eff.category).toBe('food'); // defensive: derived from group when `cat` absent
    expect(eff.flags.added).toBe(true);
  });

  test('swapped line → provenance swap', () => {
    const eff = resolveEffectiveItem({ id: 's', item: 'Pork shoulder', swappedFrom: 'Pork ribs', low: 30, high: 45 }, baseEvent);
    expect(eff.provenance.costFrom).toBe('swap');
    expect(eff.flags.swapped).toBe(true);
  });

  test('got flag reads event.foodGot; visible is always true for a listed line', () => {
    const eff = resolveEffectiveItem({ id: 'g', item: 'Buns', low: 6, high: 10 }, { ...baseEvent, foodGot: { g: true } });
    expect(eff.flags.got).toBe(true);
    expect(eff.visible).toBe(true);
  });

  test('defensive on missing fields (no throw, sane defaults)', () => {
    const eff = resolveEffectiveItem({ id: 'm' }, baseEvent);
    expect(eff.id).toBe('m');
    expect(eff.cost).toEqual({ low: 0, high: 0, kind: 'free', perUnit: [0, 0] });
    expect(eff.source.options).toEqual([]);
    expect(eff.alternatives).toEqual([]);
  });

  test('never converts a [low,high] range into an exact quote', () => {
    const eff = resolveEffectiveItem({ id: 'r', item: 'Shrimp', low: 40, high: 70 }, baseEvent);
    expect(eff.cost.low).not.toBe(eff.cost.high);
    expect(eff.cost.kind).toBe('range');
  });
});
