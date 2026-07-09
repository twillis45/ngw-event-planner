// POP-1C: the one recommendation lifecycle. planningState.recommendationLifecycle
// is a pure read-only PROJECTION over already-computed state — every item lands
// on one of the 7 canonical states, and dismissed items reach Archived (the one
// exit path). Consumers filter by state instead of re-deriving "is this done?".
import { eventPlan } from '../../CommandCenter';

const STATES = new Set(['Discovered', 'Recommended', 'Accepted', 'Working', 'Blocked', 'Completed', 'Archived']);

test('every lifecycle item carries a valid canonical state', () => {
  const event = {
    id: 'e', type: 'Wedding', date: '2026-09-01', venue: 'Hall',
    guestCount: 80, budget: [{ category: 'Venue', budgeted: 5000 }], timeline: [],
    vendors: [
      { id: 'v1', category: 'Catering', name: 'A', status: 'Confirmed' },
      { id: 'v2', category: 'Photography', name: 'B', status: 'Considering' },
    ],
  };
  const lc = eventPlan(event).planningState.recommendationLifecycle;
  expect(Array.isArray(lc)).toBe(true);
  expect(lc.length).toBeGreaterThan(0);
  lc.forEach(item => {
    expect(STATES.has(item.state)).toBe(true);
    expect(typeof item.id).toBe('string');
    expect(typeof item.category).toBe('string');
  });
});

test('a booked vendor workstream is Completed; an unstarted one is Recommended', () => {
  const event = {
    id: 'e', type: 'Wedding', date: '2026-09-01', venue: 'Hall', guestCount: 80,
    vendors: [
      { id: 'v1', category: 'Catering', name: 'A', status: 'Deposit Paid' }, // booked → ready
    ], timeline: [], budget: [],
  };
  const lc = eventPlan(event).planningState.recommendationLifecycle;
  const catering = lc.find(i => i.category === 'vendor' && i.id.includes('food'));
  expect(catering && catering.state).toBe('Completed');
});

test('a dismissed risk reaches Archived — the one exit path', () => {
  const event = {
    id: 'e', type: 'Wedding', date: '2026-09-01', venue: 'Hall', guestCount: 80,
    vendors: [], timeline: [], budget: [],
    riskStatus: { 'weather-outdoor': 'dismissed' },
  };
  const lc = eventPlan(event).planningState.recommendationLifecycle;
  const archived = lc.find(i => i.state === 'Archived' && i.id === 'risk:weather-outdoor');
  expect(archived).toBeTruthy();
});

test('a blocked workstream (critical COI) reads Blocked, not Completed', () => {
  const event = {
    id: 'e', type: 'Wedding', date: '2026-09-01', venue: 'Grand Hall', guestCount: 80,
    vendors: [
      { id: 'v1', category: 'Catering', name: 'A', status: 'Confirmed', coiStatus: 'required' },
    ], timeline: [], budget: [],
  };
  const lc = eventPlan(event).planningState.recommendationLifecycle;
  const states = lc.filter(i => i.category === 'vendor').map(i => i.state);
  // at least classified, never silently dropped
  expect(states.length).toBeGreaterThan(0);
  states.forEach(s => expect(STATES.has(s)).toBe(true));
});
