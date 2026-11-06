import { parseVendorCost, vendorIsCommitted, vendorCommittedCost, vendorOutstanding } from '../vendorMoney';
import { duplicateEvent } from '../duplicateEvent';
import { taskSatisfied } from '../taskEngine';
import { buildBudgetRecoveryPlan } from '../budgetRecovery';
import { unpricedVendorCount } from '../budgetCopy';

test.each([
  ['4800.00', 4800], ['4800.50', 4800.5], ['0.01', 0.01],
  ['.50', 0.5], ['0', 0], ['', ''], [' 25.75 ', 25.75],
  // Run 2 (R2-20): how people type money.
  ['$650', 650], ['$ 650', 650], ['1,000', 1000], ['$1,250.50', 1250.5], ['1,000,000', 1000000],
])('vendor cost %s keeps its dollar value and cents', (raw, expected) => {
  expect(parseVendorCost(raw)).toBe(expected);
});

test.each(['-500', 'not a price', '12.345', 'NaN', 'Infinity', '1e3', '0x10', '2.5.0', '-$500', '$-500', '1,00', '10,00,000', '$$5', '1,000.555'])('%s is rejected instead of changed into a different amount', raw => {
  expect(() => parseVendorCost(raw)).toThrow();
});

test('an explicitly agreed amount is committed without changing a shopping status', () => {
  const vendor = { id: 'v', name: 'The photographer', category: 'Photography', status: 'Considering', cost: 4800.5, costAgreed: true };
  expect(vendorIsCommitted(vendor)).toBe(true);
  expect(vendorCommittedCost({ vendors: [vendor] })).toBe(4800.5);
  expect(vendorOutstanding({ vendors: [vendor] })).toBe(4800.5);
  expect(vendor.status).toBe('Considering');
  expect(taskSatisfied({ vendors: [vendor] }, { task: 'Book the photographer' })).toBe(false);
  expect(taskSatisfied({ vendors: [vendor] }, { task: 'Hire vendors' })).toBe(false);
});

test('a raw quoted price is not an agreement, and the evidence must be explicitly true', () => {
  for (const costAgreed of [undefined, false, 'true']) {
    const vendor = { status: 'Quoted', cost: 4800.5, costAgreed };
    expect(vendorIsCommitted(vendor)).toBe(false);
    expect(vendorCommittedCost({ vendors: [vendor] })).toBe(0);
  }
});

test('duplicating a plan retains the price but requires a new agreement', () => {
  const source = { id: 'source', vendors: [{ id: 'v', status: 'Considering', cost: 4800.5, costAgreed: true }] };
  const copy = duplicateEvent(source, { id: 'copy' });
  expect(copy.vendors[0].cost).toBe(4800.5);
  expect(copy.vendors[0].costAgreed).toBeUndefined();
  expect(vendorIsCommitted(copy.vendors[0])).toBe(false);
  expect(source.vendors[0].costAgreed).toBe(true);
});

test('recovery protects an agreed shopping-status amount while an unaccepted quote stays flexible', () => {
  const event = { id: 'e', type: 'Unknown', totalBudget: 100,
    budget: [{ id: 'b', category: 'Other expense', actual: 200 }],
    vendors: [{ id: 'v', name: 'The photographer', status: 'Quoted', category: 'Photography', cost: 4800.5 }] };
  expect(buildBudgetRecoveryPlan(event).suggestions.some(s => s.id === 'vendor-ask-v')).toBe(true);
  const plan = buildBudgetRecoveryPlan({ ...event, vendors: [{ ...event.vendors[0], costAgreed: true }] });
  expect(plan.suggestions.some(s => s.id === 'vendor-ask-v')).toBe(false);
  expect(plan.protectedItems.find(p => p.id === 'vendor-protected-v').why).toMatch(/agreed amount/i);
});

test('an explicitly agreed zero is priced; raw zero and a blank remain unknown', () => {
  expect(unpricedVendorCount({ vendors: [{ name: 'A gift', cost: 0, costAgreed: true }] })).toBe(0);
  expect(vendorIsCommitted({ status: 'Considering', cost: 0, costAgreed: true })).toBe(true);
  for (const vendor of [{ cost: 0 }, { cost: '' }, { cost: '', costAgreed: true }, {}]) {
    expect(unpricedVendorCount({ vendors: [{ name: 'Unknown', ...vendor }] })).toBe(1);
  }
});
