import {
  playbookCoverage,
  culturalMix,
  locationSpread,
  memoryDepth,
  funnelContent,
} from '../analyticsReader';

// Small fixtures. Real (non-seed) ids must NOT start with ev-/cl-.
const realDinner = {
  id: 'evt-1', type: 'Dinner Party', market: 'DMV', venue: '123 Main St',
  date: '2026-07-01', guestCount: 12,
  ros: [{ id: 'r1', label: 'Doors' }],
  decisionMemory: [{ id: 'd1' }],
  outcomes: { capturedAt: '2026-07-02T10:00:00Z' },
  lessons: 'Order ice earlier.',
  vendors: [
    { id: 'v1', name: 'Acme Catering', status: 'Confirmed' },
    { id: 'v2', name: 'Maybe DJ', status: 'Considering' },
  ],
};
const realMemorial = {
  id: 'evt-2', type: 'Memorial Service', market: 'NYC', venue: "Host's home",
  date: '2026-08-10', guestCount: 30,
  vendors: [{ id: 'v1', name: 'acme catering', status: 'Booked' }], // rehire (same name)
};
const realBare = {
  id: 'evt-3', type: 'Quantum Llama Festival', // no playbook
  // no market, no venue, no date, no guest count
};
const seedEvent = { id: 'ev-wedding', type: 'Wedding', market: 'DMV', venue: 'X', date: '2026-01-01', guestCount: 5 };

const BOOK = [realDinner, realMemorial, realBare, seedEvent];

test('seed events (ev-/cl- ids) are excluded from every aggregate', () => {
  expect(playbookCoverage(BOOK).total).toBe(3);
  expect(culturalMix(BOOK).total).toBe(3);
  expect(locationSpread(BOOK).total).toBe(3);
  expect(funnelContent(BOOK).total).toBe(3);
});

test('playbookCoverage counts types and flags unmatched real types', () => {
  const c = playbookCoverage(BOOK);
  expect(c.byType['Dinner Party']).toBe(1);
  expect(c.byType['Quantum Llama Festival']).toBe(1);
  expect(c.unmatchedTypes).toContain('Quantum Llama Festival');
  expect(c.unmatchedTypes).not.toContain('Dinner Party'); // has a playbook
});

test('culturalMix splits sombre vs festive by voice', () => {
  const m = culturalMix(BOOK);
  expect(m.sombre).toBe(1); // memorial
  expect(m.festive).toBe(2); // dinner + festival
  expect(m.byVoice.remembrance).toBe(1);
  expect(m.total).toBe(3);
});

test('locationSpread reports markets, at-home and missing-venue shares', () => {
  const s = locationSpread(BOOK);
  expect(s.byMarket.DMV).toBe(1);
  expect(s.byMarket.NYC).toBe(1);
  expect(s.byMarket.Unspecified).toBe(1); // bare event
  expect(s.atHomeShare).toBeCloseTo(1 / 3); // memorial at "Host's home"
  expect(s.missingVenueShare).toBeCloseTo(1 / 3); // bare event has no venue
});

test('memoryDepth counts outcomes, lessons, confirmed vendors and rehires', () => {
  const d = memoryDepth(BOOK);
  expect(d.eventsWithOutcomes).toBe(1);
  expect(d.eventsWithLessons).toBe(1);
  expect(d.vendorsTracked).toBe(2); // Acme Confirmed + acme Booked (Considering excluded)
  expect(d.rehiredVendors).toBe(1); // "Acme Catering" across both events
});

test('funnelContent measures local content completeness', () => {
  const f = funnelContent(BOOK);
  expect(f.qualified).toBe(2); // dinner + memorial have date + guests
  expect(f.withRos).toBe(1);
  expect(f.withOutcomes).toBe(1);
  expect(f.withDecisions).toBe(1);
});

test('empty / non-array input is safe', () => {
  expect(playbookCoverage([]).total).toBe(0);
  expect(culturalMix(null).total).toBe(0);
  expect(locationSpread(undefined).atHomeShare).toBe(0);
  expect(memoryDepth([]).rehiredVendors).toBe(0);
});
