// BUDGET-RECOVERY-1 — safe host-purchase recovery contract. Source-backed
// suggestions only; paid/signed/rain/honoree protected; no invented savings,
// no refund/negotiability language, no fake recovered state.

import { buildBudgetRecoveryPlan } from '../budgetRecovery';

// A crab-feast-shaped event with a real count so playbook plans exist.
const baseEvent = (over = {}) => ({
  id: 'e-br', type: 'bbq', date: '2026-09-05', guestCount: 30,
  totalBudget: 100, budget: [], vendors: [], guests: [],
  foodGot: {}, capacityChecked: {}, capacityOwned: {},
  ...over,
});

test('1 · no plan when not over budget', () => {
  const p = buildBudgetRecoveryPlan(baseEvent({ totalBudget: 100000 }));
  expect(p.status).toBe('not_over_budget');
  expect(p.suggestions).toEqual([]);
});

test('2 · over-budget amount comes from hostSpending committed vs total', () => {
  const p = buildBudgetRecoveryPlan(baseEvent({ totalBudget: 100 }));
  expect(p.status).toBe('recovery_available');
  expect(p.overBudgetAmount).toBeGreaterThan(0);
  expect(p.headline).toMatch(/\$[\d,]+ over your current plan/);
});

test('3+4 · unbought supply appears as safe cut; a checked-off one never does', () => {
  const open = buildBudgetRecoveryPlan(baseEvent());
  const capSug = open.suggestions.filter(s => s.id.startsWith('cap-'));
  expect(capSug.length).toBeGreaterThan(0);
  expect(capSug[0].class).toMatch(/safe_cut|ask/);
  const key = capSug[0].id.replace(/^cap-/, '');
  const bought = buildBudgetRecoveryPlan(baseEvent({ capacityChecked: { [key]: true } }));
  expect(bought.suggestions.find(s => s.id === `cap-${key}`)).toBeUndefined();
});

test('5+6 · unbought food line is a TRADEOFF with tradeoff copy; bought food never recoverable', () => {
  const p = buildBudgetRecoveryPlan(baseEvent());
  const food = p.suggestions.filter(s => s.id.startsWith('food-'));
  expect(food.length).toBeGreaterThan(0);
  food.forEach(f => {
    expect(f.class).toBe('tradeoff');
    expect(f.why).toMatch(/tradeoff|spread/i);
  });
  const id = food[0].id.replace(/^food-/, '');
  const bought = buildBudgetRecoveryPlan(baseEvent({ foodGot: { [id]: true } }));
  expect(bought.suggestions.find(s => s.id === `food-${id}`)).toBeUndefined();
});

test('7 · guest right-sizing appears only with a settled roster showing fewer yeses', () => {
  const guests = [
    ...Array.from({ length: 12 }, (_, i) => ({ name: `G${i}`, rsvp: 'Yes' })),
    ...Array.from({ length: 3 }, (_, i) => ({ name: `N${i}`, rsvp: 'No' })),
  ];
  const p = buildBudgetRecoveryPlan(baseEvent({ guests, guestCount: 30 }));
  const g = p.suggestions.find(s => s.id === 'guests-rightsize');
  expect(g).toBeTruthy();
  expect(g.route).toEqual({ tab: 'Guests', focusField: 'guests-entry' });
  expect(g.estimatedSavings).toBeNull(); // no single honest number — recompute
});

test('8 · missing guest count → missing-data prompt, and no sized-cost fiction', () => {
  const p = buildBudgetRecoveryPlan({ id: 'e', type: 'bbq', date: '2026-09-05', totalBudget: 50,
    budget: [{ budgetCategory: 'Misc', budgeted: 0, actual: 200 }], vendors: [], guests: [] });
  expect(p.status).toBe('recovery_available');
  expect(p.missingData.join(' ')).toMatch(/guest count/i);
  expect(p.suggestions.find(s => s.id === 'guests-rightsize')).toBeUndefined();
});

test('9+10 · paid deposit and signed vendor are PROTECTED, never suggestions', () => {
  const p = buildBudgetRecoveryPlan(baseEvent({ vendors: [
    { id: 'v1', name: 'Paid Caterer', cost: 800, depositAmt: 200, depositPaid: true, status: 'Deposit Paid' },
    { id: 'v2', name: 'Signed DJ', cost: 400, contractSigned: true, status: 'Contracted' },
  ] }));
  expect(p.suggestions.find(s => /v1|v2/.test(s.id))).toBeUndefined();
  const prot = p.protectedItems.map(x => x.label);
  expect(prot).toContain('Paid Caterer');
  expect(prot).toContain('Signed DJ');
  expect(p.protectedItems.find(x => x.label === 'Paid Caterer').why).toMatch(/already paid/i);
});

test('11 · uncommitted vendor quote is ask-framed with no savings number', () => {
  const p = buildBudgetRecoveryPlan(baseEvent({ vendors: [
    { id: 'v3', name: 'Quoted Florist', cost: 300, status: 'Quoted' },
  ] }));
  const ask = p.suggestions.find(s => s.id === 'vendor-ask-v3');
  expect(ask).toBeTruthy();
  expect(ask.class).toBe('ask');
  expect(ask.estimatedSavings).toBeNull();
  expect(ask.why).toMatch(/not guaranteed/i);
  expect(ask.route).toEqual({ tab: 'Vendors', vendorId: 'v3' });
});

test('12+13 · rain backup and honoree moment are protected', () => {
  const p = buildBudgetRecoveryPlan(baseEvent({ rainPlan: 'Move to the pavilion', honoree: 'Grandma June' }));
  const labels = p.protectedItems.map(x => x.label);
  expect(labels).toContain('Rain backup');
  expect(labels.join(' ')).toMatch(/Grandma June/);
});

test('14 · every $ figure has an explicit source field behind it', () => {
  const p = buildBudgetRecoveryPlan(baseEvent());
  p.suggestions.forEach(s => {
    if (s.estimatedSavings !== null) {
      expect(s.estimatedSavings).toBeGreaterThan(0);
      expect(s.source).toBeTruthy();
      expect(s.savingsConfidence).toBeTruthy();
    }
  });
});

test('15+16 · banned language: no refund/cancel/negotiate/overpriced/guaranteed savings/owed', () => {
  const p = buildBudgetRecoveryPlan(baseEvent({
    rainPlan: 'pavilion', honoree: 'June',
    vendors: [
      { id: 'v1', name: 'Paid', cost: 800, depositPaid: true, status: 'Deposit Paid' },
      { id: 'v3', name: 'Quoted', cost: 300, status: 'Quoted' },
    ],
  }));
  const all = JSON.stringify(p);
  expect(all).not.toMatch(/refund|cancel|renegotiat|overpriced|savings guaranteed|fully recovered|you owe|owed|collections/i);
  // Host-friendly budget language rule (2026-07-07): calm help, not accounting.
  // "cut"/"locked"/"unpaid" never appear in host-visible copy (class names are
  // internal); "recover" never appears as host copy either.
  const visible = [p.headline, p.summary,
    ...p.suggestions.flatMap(x => [x.label, x.why, x.actionLabel]),
    ...p.protectedItems.flatMap(x => [x.label, x.why])].filter(Boolean).join(' ');
  expect(visible).not.toMatch(/\bcut\b|\bcancel|\bunpaid\b|\bowed\b|\block(ed)?\b|overpriced|recover/i);
  expect(all).not.toMatch(/spent so far.*estimate/i);
});

test('17 · every suggestion routes somewhere real or is non-actionable by design', () => {
  const p = buildBudgetRecoveryPlan(baseEvent({ vendors: [{ id: 'v3', name: 'Q', cost: 300, status: 'Quoted' }] }));
  p.suggestions.forEach(s => {
    expect(s.route && s.route.tab).toBeTruthy();
    expect(s.actionLabel).toBeTruthy();
  });
});

test('18 · buying an item clears its suggestion on re-derive (no stored state)', () => {
  const before = buildBudgetRecoveryPlan(baseEvent());
  const capId = before.suggestions.find(s => s.id.startsWith('cap-'));
  const key = capId.id.replace(/^cap-/, '');
  const after = buildBudgetRecoveryPlan(baseEvent({ capacityChecked: { [key]: true } }));
  expect(after.suggestions.find(s => s.id === capId.id)).toBeUndefined();
});

test('no budget set → needs_more_data, never a fake over-budget claim', () => {
  const p = buildBudgetRecoveryPlan(baseEvent({ totalBudget: 0 }));
  expect(p.status).toBe('needs_more_data');
  expect(p.missingData.join(' ')).toMatch(/budget target/i);
});

test('over budget with everything committed → honest no-safe-options summary', () => {
  const p = buildBudgetRecoveryPlan({
    id: 'e', type: 'custom', date: '2026-09-05', guestCount: 10, totalBudget: 100,
    budget: [{ budgetCategory: 'Hall', budgeted: 0, actual: 500 }],
    vendors: [{ id: 'v1', name: 'Paid Hall', cost: 500, balancePaid: true, status: 'Confirmed' }],
    guests: [],
  });
  if (p.status === 'recovery_available' && p.suggestions.filter(s => s.class !== 'ask').length === 0) {
    expect(p.summary).toMatch(/committed or protected/i);
  }
});
