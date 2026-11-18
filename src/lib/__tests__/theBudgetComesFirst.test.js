// THE BUDGET COMES FIRST (owner ruling 11/18/2026, chosen after the cons were
// laid out: "Budget always first"). With no budget set, "Set your budget." leads
// the board at any distance — above a closing menu or shop window. Two
// exceptions: the event day itself (the day's own steps lead), and a CRITICAL
// action (a real emergency), which keeps its place above it.
import { eventPlan } from '../../CommandCenter';
import { playbookChecklist } from '../playbooks';

// LOCAL calendar days (CI also runs in Pacific/Midway and Pacific/Kiritimati):
// a UTC date string put "the event day" a day away in Midway, where the budget
// rightly leads.
const NOW = (() => { const d = new Date(2026, 10, 18, 12, 0, 0); return d; })();
const localIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mk = (days, extra = {}) => {
  const d = new Date(NOW); d.setDate(d.getDate() + days);
  const ev = { id: 'cust-fg', name: 'My Friendsgiving', type: 'Friendsgiving', date: localIso(d), startTime: '4:00 PM',
    venue: "Vida's", venueKind: 'venue', guestMode: 'count', guestEstimate: 15, guestCountSource: 'host', budget: [], vendors: [], guests: [],
    createdAt: NOW.toISOString(), ...extra };
  ev.timeline = playbookChecklist(ev).map((r) => ({ id: r.id, week: r.week || '', leadDays: r.leadDays ?? null, task: r.task || '', done: false }));
  return ev;
};
const top = (ev) => eventPlan(ev).nextActions[0];

beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
afterEach(() => jest.useRealTimers());

test('three days out, no budget: the budget leads, the menu is next', () => {
  const acts = eventPlan(mk(3)).nextActions;
  expect(acts[0].domain).toBe('budget');
  expect(acts[1].domain).toBe('food');
});

test('ten and thirty days out: the budget leads', () => {
  expect(top(mk(10)).domain).toBe('budget');
  expect(top(mk(30)).domain).toBe('budget');
});

test('with a budget set, the menu leads again', () => {
  expect(top(mk(3, { totalBudget: 200 })).domain).toBe('food');
});

test('on the event day the budget is not forced to the top', () => {
  const t = top(mk(0));
  expect(t ? t.domain : null).not.toBe('budget');
});

test('the budget does not jump its own prerequisites: an open guest count stays above it', () => {
  const acts = eventPlan(mk(3, { guestEstimate: null, guestCountSource: null })).nextActions;
  const gi = acts.findIndex((a) => a.domain === 'guests');
  const bi = acts.findIndex((a) => a.domain === 'budget');
  expect(gi).toBeGreaterThanOrEqual(0);
  expect(gi).toBeLessThan(bi);
});
