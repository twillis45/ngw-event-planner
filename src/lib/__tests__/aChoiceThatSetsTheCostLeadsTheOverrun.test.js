// A CHOICE THAT SETS THE COST LEADS AN EXPECTED OVERRUN (PR #229 follow-up,
// 11/22/2026). Over/under is judged on EXPECTED cost (owner ruling, D-03), but
// that is a basis, not a new hero priority. A host who has just given a budget
// was told "Bring the plan inside your budget." before she had picked the food
// that sets the cost (Friendsgiving for 15 at $200; Wanda's $5,000 against an
// estimate of $5,263). The rule:
//   - an overrun that is EXPECTED only (nothing booked past the budget) does not
//     lead while a call that sets the cost is open — that call leads;
//   - when what is booked is itself over, or nothing cost-setting is open, the
//     money leads as before.
// The ledger's Budget part still reads "over" on the same basis either way.
import { eventPlan } from '../../CommandCenter';
import { playbookChecklist } from '../playbooks';
import { deriveEventPhaseProgress } from '../phaseProgress';

const NOW = new Date(2026, 10, 18, 12, 0, 0);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mk = (days, extra = {}) => {
  const d = new Date(NOW); d.setDate(d.getDate() + days);
  const ev = { id: 'cust-fg', name: 'My Friendsgiving', type: 'Friendsgiving', date: iso(d), startTime: '4:00 PM',
    venue: "Vida's", venueKind: 'venue', guestMode: 'count', guestEstimate: 15, guestCountSource: 'host',
    budget: [], vendors: [], guests: [], createdAt: NOW.toISOString(), totalBudget: 200, ...extra };
  ev.timeline = playbookChecklist(ev).map((r) => ({ id: r.id, week: r.week || '', leadDays: r.leadDays ?? null, task: r.task || '', done: false }));
  return ev;
};
const acts = (ev) => eventPlan(ev).nextActions;
const budgetPart = (ev) => (deriveEventPhaseProgress(ev).items || []).find((i) => i.id === 'budget');

beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
afterEach(() => jest.useRealTimers());

test('premise: the $200 plan is expected over, and the ledger says so', () => {
  expect(budgetPart(mk(3)).handled).toBe(false);
  expect(budgetPart(mk(3)).cueLabel).toMatch(/^Expected costs are \$[\d,]+ over your budget$/);
});

test('an expected-only overrun does not lead while the menu is open: the menu leads', () => {
  const a = acts(mk(3));
  expect(a[0].domain).toBe('food');
  expect(a.some((x) => x && x.domain === 'budget' && !x.done)).toBe(false);
});

test('when what is BOOKED is over the budget, the money leads', () => {
  const ev = mk(3, { vendors: [{ id: 'v', name: 'Hall Rental Co', category: 'Venue', status: 'Contracted', cost: 900, contractSigned: true }] });
  expect(acts(ev)[0].domain).toBe('budget');
});

test('when no cost-setting call is open, the expected overrun leads', () => {
  // Every menu call answered with its first option.
  let ev = mk(3);
  const { openFoodChoices } = require('../playbooks');
  for (let k = 0; k < 12; k++) {
    const open = (openFoodChoices(ev) || []).filter((c) => (c.options || []).length && !/^dietary(_|$)/.test(c.id));
    if (!open.length) break;
    ev = { ...ev, foodChoices: { ...(ev.foodChoices || {}), [open[0].id]: open[0].options[0] } };
  }
  ev = { ...ev, dietaryNoted: true };
  expect(budgetPart(ev).handled).toBe(false);
  expect(acts(ev)[0].domain).toBe('budget');
});

// A hired vendor not yet booked is a cost still being set: its quote becomes
// the price only at booking (Wanda, after "Drop-off catering": Semper Catering
// quoted, not booked; her ceremony call led before the money did on #228).
test('an unbooked hired vendor holds the expected overrun back too', () => {
  const ev = mk(20, { foodChoices: { dietary_table: 'Nobody at this table' } });
  let e = ev;
  const { openFoodChoices } = require('../playbooks');
  for (let k = 0; k < 12; k++) {
    const open = (openFoodChoices(e) || []).filter((c) => (c.options || []).length && !/^dietary(_|$)/.test(c.id));
    if (!open.length) break;
    e = { ...e, foodChoices: { ...(e.foodChoices || {}), [open[0].id]: open[0].options[0] } };
  }
  const quoted = { ...e, vendors: [{ id: 'c', name: 'Semper Catering Co.', category: 'Catering', status: 'Quoted', cost: 150 }] };
  expect(acts(e)[0].domain).toBe('budget');            // premise: nothing open, the money leads
  expect(acts(quoted).some((x) => x && x.domain === 'budget' && !x.done)).toBe(false);
});
