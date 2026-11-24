// DECIDE THE MENU BEFORE THE SHOP (owner, 11/18/2026, on a live Friendsgiving
// three days out: "Why does the CTA go to shop and not plan first").
// The board led with "Get the food · The remaining items · 11 left" while
// "Decide what you're serving · 4 open" sat below it. In the final week the
// shopping row carries the playbook shop step's closing window, which lifts it
// over anything without a clock, and nothing made it wait for the menu its list
// is built from. Now, while menu questions are open, the shop's clock belongs
// to the menu decision: decide first, then shop.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { playbookChecklist } from '../playbooks';

const NOW = new Date('2026-11-18T05:51:00Z');   // 12:51 AM EST, Wed — the owner's screen
const created = (extra = {}) => {
  const ev = { id: 'cust-fg', name: 'My Friendsgiving', type: 'Friendsgiving', date: '2026-11-21', startTime: '4:00 PM',
    venue: "Vida's", venueKind: 'venue', guestMode: 'count', guestEstimate: 15, guestCountSource: 'host', totalBudget: 200,
    budget: [], vendors: [], guests: [], ...extra };
  ev.timeline = (playbookChecklist(ev) || []).map((r) => ({ id: r.id, week: r.week || '', leadDays: r.leadDays ?? null, task: r.task || '', done: false, category: r.category || '' }));
  return ev;
};
const items = (ev) => deriveEventPhaseProgress(ev, NOW).items;
const item = (ev, id) => items(ev).find((i) => i.id === id);

test('(premise) three days out, the menu is open and the shop step is on the clock', () => {
  const ev = created();
  // Named by the call it counts since cohesion F2 (11/24/2026).
  expect(item(ev, 'food').cueLabel).toMatch(/\? · \d+ open$/);
  expect(item(ev, 'shopping').cueLabel).toMatch(/Buy the remaining items/);
});

test('while the menu is open, the shop clock belongs to the menu decision', () => {
  const ev = created();
  expect(item(ev, 'food').closingWindow).toBe(true);
  expect(item(ev, 'shopping').closingWindow).not.toBe(true);
});

test('once the menu is decided, shopping gets its clock back', () => {
  const base = created();
  const plan = require('../playbooks').playbookFoodPlan(base);
  const picks = Object.fromEntries((plan.choices || []).map((c) => [c.id, (c.options || [])[0]]));
  const ev = { ...base, foodChoices: picks, dietaryNoted: true };
  expect(item(ev, 'shopping').closingWindow).toBe(true);
});
