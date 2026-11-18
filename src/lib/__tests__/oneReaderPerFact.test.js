// ONE READER PER FACT — the five Low findings of the 11/18/2026 single-source
// audit. Each surface read a fact its own way while a shared reader existed:
//   #8  lodging ranked against raw totalBudget  → budgetTotal  (HostShellV2; covered by the build + e2e)
//   #9  CommandCenter's private budgetIsSet     → budgetFor
//   #10 eventGeoQuery read `state` before `venueState` (venueFor reads the reverse)
//   #11 the vendor price hint skipped the guest list → guestCountFor (HostShellV2)
//   #12 (portfolio overdue count) needed no change: taskIsOverdue already
//       runs effectiveDone, so a step the plan counts done is never overdue.
import { eventPlan } from '../../CommandCenter';
import { eventGeoQuery } from '../eventGeoQuery';
import { venueFor } from '../venueFor';

const NOW = new Date(2026, 10, 18, 12, 0, 0);
const localIso = (days) => { const d = new Date(NOW); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
afterEach(() => jest.useRealTimers());

test('#9 a budget that exists only as lines is "set", and its handled row names the amount', () => {
  const ev = { id: 'b1', name: 'Lines only', type: 'Birthday', date: localIso(30), startTime: '6:00 PM',
    venue: 'Home', venueKind: 'home', guestMode: 'count', guestEstimate: 20, guestCountSource: 'host',
    budget: [{ category: 'Food', budgeted: 200 }, { category: 'Decor', budgeted: 100 }], vendors: [], guests: [], timeline: [] };
  const plan = JSON.stringify(eventPlan(ev));
  expect(plan).toContain('Budget set · $300');
  expect(plan).not.toMatch(/"Budget set"/);
});

test('#10 the shopping anchor and venueFor agree on the state', () => {
  const ev = { venueCity: 'Laurel', venueState: 'MD', state: 'VA' };
  expect(venueFor(ev).state).toBe('MD');
  expect(eventGeoQuery(ev)).toBe('Laurel, MD, US');
});
