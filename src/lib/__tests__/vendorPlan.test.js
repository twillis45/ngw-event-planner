// VENDOR-COST-1 — vendor category cost estimates, explainable and honest.
// Never invented per-vendor quotes; a real host-entered cost always outranks
// an estimate; every applied factor (metro, rush) names itself so the UI can
// answer "why is this more/less expensive."

import { buildVendorPlan } from '../vendorPlan';

const ev = (over = {}) => ({
  id: 'e-vendor', type: 'Retirement Party', guestCount: 40, date: '2027-01-01', vendors: [], ...over,
});

test('1 · flat-cost category returns the authored range unscaled with no factors', () => {
  const p = buildVendorPlan(ev());
  expect(p.relevant).toBe(true);
  const photog = p.categories.find(c => c.category === 'Photographer');
  expect(photog.baseRange).toEqual([200, 600]);
  expect(photog.estimateLow).toBe(200);
  expect(photog.estimateHigh).toBe(600);
  expect(photog.factorsApplied).toEqual([]);
  expect(photog.estimateCopy).toMatch(/about \$200–\$600, before your quotes/i);
});

test('2 · per-guest category scales by the resolved guest count', () => {
  const p = buildVendorPlan(ev({ guestCount: 40 }));
  const catering = p.categories.find(c => c.category === 'Catering / Buffet');
  expect(catering.costUnit).toBe('per guest');
  expect(catering.estimateLow).toBe(15 * 40);
  expect(catering.estimateHigh).toBe(40 * 40);
});

test('3 · metro factor scales the estimate and names itself in factorsApplied', () => {
  const p = buildVendorPlan(ev(), { metroFactor: 1.45, metroLabel: 'Washington DC / NoVA' });
  const photog = p.categories.find(c => c.category === 'Photographer');
  expect(photog.estimateLow).toBe(Math.round(200 * 1.45));
  expect(photog.estimateHigh).toBe(Math.round(600 * 1.45));
  expect(photog.factorsApplied.find(f => f.key === 'metro').explanation).toMatch(/Washington DC \/ NoVA/);
});

test('4 · rush factor scales the estimate and names itself with its own explanation', () => {
  const rush = { multiplier: 1.25, label: 'RUSH', explanation: 'Less than 30 days out — vendors typically charge premium.' };
  const p = buildVendorPlan(ev(), { rush });
  const photog = p.categories.find(c => c.category === 'Photographer');
  expect(photog.estimateLow).toBe(Math.round(200 * 1.25));
  const applied = photog.factorsApplied.find(f => f.key === 'rush');
  expect(applied.label).toMatch(/RUSH/);
  expect(applied.explanation).toBe(rush.explanation);
});

test('5 · metro + rush compose multiplicatively, both named', () => {
  const rush = { multiplier: 1.12, label: 'COMPRESSED', explanation: 'Tight timeline.' };
  const p = buildVendorPlan(ev(), { metroFactor: 1.3, metroLabel: 'Chicago', rush });
  const photog = p.categories.find(c => c.category === 'Photographer');
  expect(photog.estimateLow).toBe(Math.round(200 * 1.3 * 1.12));
  expect(photog.factorsApplied.map(f => f.key)).toEqual(['metro', 'rush']);
});

test('6 · a real host-entered cost replaces the estimate — never both', () => {
  const p = buildVendorPlan(ev({ vendors: [{ id: 'v1', category: 'Photographer', cost: 450, name: 'Northlight' }] }));
  const photog = p.categories.find(c => c.category === 'Photographer');
  expect(photog.hasRealCost).toBe(true);
  expect(photog.realCost).toBe(450);
  expect(photog.booked).toBe(true);
  expect(photog.vendorName).toBe('Northlight');
  expect(photog.estimateCopy).toMatch(/\$450 — from your quote/);
});

test('7 · category match is case-insensitive on category name', () => {
  const p = buildVendorPlan(ev({ vendors: [{ id: 'v1', category: 'photographer', cost: 300 }] }));
  const photog = p.categories.find(c => c.category === 'Photographer');
  expect(photog.hasRealCost).toBe(true);
});

test('8 · a non-retirement event type with no authored vendor list is not relevant', () => {
  const p = buildVendorPlan({ id: 'e', type: 'Nonexistent Event Type XYZ' });
  expect(p.relevant).toBe(false);
  expect(p.categories).toEqual([]);
});

test('9 · a vendor entry with no real cost (quote not in yet) does not count as hasRealCost', () => {
  const p = buildVendorPlan(ev({ vendors: [{ id: 'v1', category: 'Photographer', name: 'TBD' }] }));
  const photog = p.categories.find(c => c.category === 'Photographer');
  expect(photog.hasRealCost).toBe(false);
  expect(photog.booked).toBe(true); // matched by category, just unpriced
  expect(photog.estimateCopy).toMatch(/before your quotes/i);
});
