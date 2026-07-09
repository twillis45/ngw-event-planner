// POP-1E: the reusable procurement model. Every estimate must be a fully-
// explained BAND (assumptions/pricingModel/supplierType/regionalFactors/
// confidence/costReducers) with logistics — the contract any good implements.
import { buildProcurementEstimate, buildCrabProcurement, crabRegionFactor } from '../procurement';

const crabEvent = (over = {}) => ({
  id: 'e', type: 'Crab Feast', name: 'Backyard Crab Feast', date: '2026-08-01',
  guestCount: 20, guests: [], vendors: [], budget: [], ...over,
});

test('a crab event produces one blue_crab estimate; a non-crab event produces none', () => {
  expect(buildProcurementEstimate(crabEvent()).length).toBe(1);
  expect(buildProcurementEstimate({ id: 'x', type: 'Wedding', guestCount: 100 }).length).toBe(0);
});

test('every estimate explains itself — the POP-1E mandate, in full', () => {
  const est = buildCrabProcurement(crabEvent());
  expect(est.good).toBe('blue_crab');
  const ex = est.explanation;
  expect(Array.isArray(ex.assumptions)).toBe(true);
  expect(ex.assumptions.length).toBeGreaterThan(0);
  expect(typeof ex.pricingModel).toBe('string');
  expect(typeof ex.supplierType).toBe('string');
  expect(ex.regionalFactors).toHaveProperty('region');
  expect(ex.regionalFactors).toHaveProperty('factor');
  expect(['high', 'medium', 'low']).toContain(ex.confidence);
  expect(Array.isArray(ex.costReducers)).toBe(true);
});

test('the estimate is a cost BAND with per-person, not a fake-precise number', () => {
  const est = buildCrabProcurement(crabEvent());
  expect(est.cost.low).toBeLessThan(est.cost.high); // a real range
  expect(est.cost.perPerson.low).toBeGreaterThan(0);
  expect(est.cost.currency).toBe('USD');
});

test('logistics carry the operational reality a coverage number cannot', () => {
  const est = buildCrabProcurement(crabEvent());
  expect(est.logistics.pickupWindow).toBeTruthy();
  expect(est.logistics.storage).toBeTruthy();
  expect(est.logistics.transport).toBeTruthy();
  expect(Array.isArray(est.logistics.servingWaves)).toBe(true);
  expect(est.logistics.cooking).toBeTruthy();
});

test('region moves the band and its confidence — Chesapeake is the floor, unknown is low-confidence', () => {
  const md = buildCrabProcurement(crabEvent(), { state: 'MD' });
  const far = buildCrabProcurement(crabEvent(), { state: 'CO' });
  const none = buildCrabProcurement(crabEvent(), {});
  expect(md.cost.high).toBeLessThan(far.cost.high); // inland costs more
  expect(md.explanation.regionalFactors.region).toBe('Chesapeake');
  expect(none.explanation.confidence).toBe('low'); // no location = honest low confidence
  expect(crabRegionFactor('MD').factor).toBe(1.0);
});

test('host-entered real prices override the estimate — confidence high, model host-entered-actual', () => {
  const withPrices = crabEvent({
    crabPlan: { role: 'main', crabEatingHeadcount: 20, lines: [
      { id: 'l1', unit: 'bushel', size: 'large', quantity: 2, pricePerUnit: 260, estimatedCountPerUnit: 72 },
    ] },
  });
  const est = buildCrabProcurement(withPrices);
  expect(est.explanation.pricingModel).toBe('host-entered-actual');
  expect(est.explanation.confidence).toBe('high');
  expect(est.cost.low).toBe(est.cost.high); // a real number, not a band
  expect(est.cost.low).toBe(520);
});
