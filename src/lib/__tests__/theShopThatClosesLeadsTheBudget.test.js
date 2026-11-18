// Issue #100, D-11 (owner acceptance run, 11/5/2026). Two days before a game
// night, with the main shop due tomorrow, One Move led with "Set your budget."
// The owner asked whether that is the intended eventPlan() ordering, explicitly
// NOT for a game-night rule.
//
// Measured: the ranking rule is fine; a raise was missing its signals. The
// shopping row ("Buy the remaining items") reached the ranker with NO clock
// and NO declared window — consequence 0 — while the playbook's own "Main
// shop" task is due T-1. The board's closing-window ruling (2026-09-23) says a
// raise that knows its window does not reopen DECLARES it; you cannot shop
// for the event after the event. No constant changes here.
//
// AMENDED 11/18/2026 (owner, on a live Friendsgiving: "Why does the CTA go to
// shop and not plan first"). The shopping list is built FROM the menu choices,
// so while any is open the shop's clock belongs to the menu decision
// (decideTheMenuBeforeTheShop). This fixture has two open menu questions, so
// the checks below that are about the SHOP run on the same game night with its
// menu decided; the open-menu case is asserted separately at the end. What
// D-11 protects still holds in both: the budget never leads a closing shop.
import { eventPlan, actionConsequence } from '../../CommandCenter';
import { playbookFoodPlan } from '../playbooks';
import fixture from './fixtures/gameNightTwoDaysOut.json';

const at = (days) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days); return d; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const raw = (daysOut, patch = {}) => ({ ...JSON.parse(JSON.stringify(fixture)), date: iso(at(daysOut)), createdAt: at(0).toISOString(), ...patch });
// The menu decided: every open choice picked and dietary noted.
const decided = (ev) => {
  const plan = playbookFoodPlan(ev) || { choices: [] };
  return { ...ev, foodChoices: Object.fromEntries((plan.choices || []).map((c) => [c.id, (c.options || [])[0]])), dietaryNoted: true };
};
const event = (daysOut, patch = {}) => decided(raw(daysOut, patch));
const shopRow = (plan) => plan.nextActions.find((a) => a.domain === 'shopping');

test('the shopping raise carries the shop task’s clock and declares its window', () => {
  const row = shopRow(eventPlan(event(2)));
  expect(row).toBeTruthy();
  expect(row.dueInDays).toBe(1);
  expect(row.closingWindow).toBe(true);
});

test('two days out, the shop due tomorrow leads — not the budget', () => {
  const plan = eventPlan(event(2));
  expect(plan.nextActions[0].domain).toBe('shopping');
  expect(plan.nextActions.map((a) => a.domain)).toContain('budget');   // still asked, just not first
});

test('the boost is the ruled one, and only while a shop is still owed', () => {
  expect(actionConsequence(shopRow(eventPlan(event(2))))).toBeGreaterThan(3);
  // The host ticked the shop task: whatever shopping row remains has no clock to claim.
  const tl = fixture.timeline.map((t) => (/\bshop/i.test(t.task) ? { ...t, done: true } : t));
  const r = shopRow(eventPlan(event(2, { timeline: tl })));
  if (r) { expect(r.dueInDays).toBe(null); expect(r.closingWindow).not.toBe(true); }
});

test('outside the last week there is no shopping row to boost', () => {
  expect(shopRow(eventPlan(event(12)))).toBeFalsy();
});

test('with the menu still open, the menu decision carries the shop clock and leads — still not the budget', () => {
  const plan = eventPlan(raw(2));
  expect(plan.nextActions[0].domain).toBe('food');
  expect(plan.nextActions[0].closingWindow).toBe(true);
  expect(plan.nextActions[0].domain).not.toBe('budget');
});
