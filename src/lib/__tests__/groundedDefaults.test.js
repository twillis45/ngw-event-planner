// Two numbers the app ALREADY COMPUTED and then threw away — from engines the runtime
// already imports. Neither is new intelligence; both are stopped leaks.

import { tableCountOf, tableCountBasis, playbookTableCount, DEFAULT_TABLE_COUNT } from '../seatingPlan';
import { buildVendorPlan } from '../vendorPlan';

const feast = (over = {}) => ({
  id: 'g', type: 'Crab Feast', date: '2026-08-04',
  guestMode: 'count', guestCount: 18, guestEstimate: 18,
  guests: [], vendors: [], ...over,
});

describe('the table count comes from the playbook, not a bare 5', () => {
  test("THE REGRESSION: 5 tables the host never chose, drawn as fact", () => {
    // crabFeast authors long folding tables at qtyPerGuest 0.15 — about one per 6–7 pickers.
    // 18 guests is NOT five tables, and it never was; playbookCapacity has always known.
    const n = playbookTableCount(feast());
    expect(n).toBeGreaterThan(0);
    expect(n).not.toBe(DEFAULT_TABLE_COUNT);
    expect(tableCountOf(feast())).toBe(n);
    expect(tableCountBasis(feast())).toBe('playbook');
  });

  test('it scales with the real guest count — a bare constant could not', () => {
    const small = tableCountOf(feast({ guestCount: 12, guestEstimate: 12 }));
    const big = tableCountOf(feast({ guestCount: 60, guestEstimate: 60 }));
    expect(big).toBeGreaterThan(small);
  });

  test("the HOST's own number always wins — they are the one standing in the room", () => {
    expect(tableCountOf(feast({ tables: 9 }))).toBe(9);
    expect(tableCountBasis(feast({ tables: 9 }))).toBe('host');
  });

  test('a playbook with no table row does NOT get an invented count — it gets a disclosed fallback', () => {
    const noTables = feast({ type: 'Book Club' });
    expect(playbookTableCount(noTables)).toBeNull();
    expect(tableCountOf(noTables)).toBe(DEFAULT_TABLE_COUNT);
    expect(tableCountBasis(noTables)).toBe('default');   // the surface says "a starting point"
  });
});

describe('the vendor cost estimate survives the moment the host needs it', () => {
  test('the estimate exists, is a RANGE, and says it is not a quote', () => {
    const plan = buildVendorPlan(feast(), { metroFactor: 1, rush: 1 });
    const withEst = (plan.categories || []).filter(c => c && c.estimateCopy);
    expect(withEst.length).toBeGreaterThan(0);
    // It must never read as a settled price — that is the money-invention bug.
    expect(withEst[0].estimateCopy).toMatch(/about/i);
    expect(withEst[0].estimateCopy).toMatch(/before your quotes come in/i);
  });

  test("a REAL quote replaces the estimate — the host's number always wins", () => {
    // Use whatever category this playbook actually offers, rather than assuming one.
    const base = buildVendorPlan(feast(), { metroFactor: 1, rush: 1 });
    const first = (base.categories || []).find(c => c && c.estimateCopy);
    expect(first).toBeTruthy();

    const ev = feast({ vendors: [{ id: 'v1', name: 'Someone', category: first.category, cost: 2400 }] });
    const plan = buildVendorPlan(ev, { metroFactor: 1, rush: 1 });
    const cat = (plan.categories || []).find(c => c && c.category === first.category);
    expect(cat.estimateCopy).toMatch(/from your quote/i);
  });
});
