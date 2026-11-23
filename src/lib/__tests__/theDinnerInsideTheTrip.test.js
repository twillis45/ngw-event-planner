// ─── THE DINNER INSIDE THE TRIP (owner decision 11/21/2026, "B with A's money") ─
//
// A destination multi-day event with a celebration moment carries that moment
// as its own planned dinner. One night pick is the single source for which day
// the celebration is; "Your days" and the invite read it. The trip's other meals
// are planned per day, and the money splits into "The celebration" and "Around
// it" through one calculation.
import { routeByWords } from '../__fixtures__/stepByWords';
import { getPlaybook, playbookFoodPlan, ALL_PLAYBOOKS } from '../playbooks';
import { guestItinerary, guestFacingDays } from '../itinerary';
import {
  celebrationNight, celebrationTitle, celebrationAppliesWith, tripDays, aroundMeals,
  heardCelebrationPlace, celebrationFieldsToPersist, mealsOutPayer, NO_CELEBRATION_FAMILIES,
} from '../tripMeals';
import { celebrationApplies, tripFoodMoney, dinnerParts } from '../tripFood';
import { clausesNotUsed } from '../heardClauses';

const SENTENCE = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, about 30 people flying in for 3 nights, dinner at an adobe courtyard, she uses a walker and the altitude is hard on her";
const SF = (extra = {}) => ({
  id: 'sf', name: 'Mom’s 80th Birthday', honoree: 'Mom', type: 'Birthday',
  date: '2027-06-14', endDate: '2027-06-17', venueCity: 'Santa Fe', venueState: 'NM',
  guestMode: 'count', guestEstimate: 30, isDestination: true, guestsStayOvernight: true,
  travelMode: 'fly', timeOfDay: 'evening',
  accessNeeds: [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }],
  celebration: { place: 'adobe courtyard' },
  ...extra,
});
const RENTAL = { foodChoices: { dest_lodging: 'A host-arranged Airbnb' } };

describe('the dinner night is one source', () => {
  test('unpicked: suggests the second day (Jun 15), and says it is not picked', () => {
    const n = celebrationNight(SF());
    expect(n.picked).toBe(false);
    expect(n.iso).toBe(null);
    expect(n.suggestedIso).toBe('2027-06-15');
    expect(n.effectiveIso).toBe('2027-06-15');
    expect(n.effectiveIndex).toBe(2);
  });
  test('picked: the pick wins, and a pick outside the trip is ignored', () => {
    expect(celebrationNight(SF({ celebration: { night: '2027-06-14' } })).effectiveIso).toBe('2027-06-14');
    expect(celebrationNight(SF({ celebration: { night: '2027-06-14' } })).picked).toBe(true);
    const out = celebrationNight(SF({ celebration: { night: '2027-07-01' } }));
    expect(out.picked).toBe(false);
    expect(out.effectiveIso).toBe('2027-06-15');
  });
  test('the title comes from the event name, the type swapped for "dinner"', () => {
    expect(celebrationTitle(SF())).toBe('Mom’s 80th dinner');
  });
  test('trip days carry their role and a short label', () => {
    const d = tripDays(SF());
    expect(d.map((x) => x.label)).toEqual(['Mon, Jun 14', 'Tue, Jun 15', 'Wed, Jun 16', 'Thu, Jun 17']);
    expect(d.map((x) => x.role)).toEqual(['arrival', 'full', 'full', 'departure']);
  });
});

describe('"Your days" reads the night and never disagrees', () => {
  const celebRows = (it) => it.rows.filter((r) => r.celebration);
  test('the proposal puts the dinner on the suggested night, with no generic "main event"', () => {
    const it = guestItinerary(SF(), getPlaybook);
    expect(it.rows.some((r) => /^the main event$/i.test(r.title))).toBe(false);
    expect(celebRows(it)).toHaveLength(1);
    expect(celebRows(it)[0]).toMatchObject({ day: 2, slot: 'evening', title: 'Mom’s 80th dinner' });
  });
  test('picking Jun 14 moves the dinner to day 1', () => {
    const it = guestItinerary(SF({ celebration: { night: '2027-06-14', place: 'adobe courtyard' } }), getPlaybook);
    expect(celebRows(it)[0].day).toBe(1);
  });
  test('an accepted plan follows a later pick (the stored row holds no day of its own)', () => {
    const accepted = guestItinerary(SF(), getPlaybook).rows;
    const ev = SF({ itinerary: accepted, celebration: { night: '2027-06-16', place: 'adobe courtyard' } });
    const it = guestItinerary(ev, getPlaybook);
    expect(it.source).toBe('host');
    expect(celebRows(it)[0].day).toBe(3);
  });
  test('the invite shows the dinner only once the night is picked, on that night', () => {
    expect(guestFacingDays(SF()).rows.filter((r) => r.celebration)).toHaveLength(0);
    const rows = guestFacingDays(SF({ celebration: { night: '2027-06-15', place: 'adobe courtyard' } })).rows;
    expect(rows.filter((r) => r.celebration)).toEqual([expect.objectContaining({ day: 2, title: 'Mom’s 80th dinner' })]);
  });
  test('the invite carries the group meals out, by day', () => {
    const ev = SF({ ...RENTAL, celebration: { night: '2027-06-15' }, tripMeals: { plan: 'dinners' } });
    const meals = guestFacingDays(ev).rows.filter((r) => r.meal);
    expect(meals).toEqual([expect.objectContaining({ day: 3, slot: 'evening', title: 'Group dinner out' })]);
  });
});

describe('the meals around the dinner', () => {
  test('7 meals around the dinner on a 4-day trip; the starting point fills them', () => {
    const a = aroundMeals(SF(RENTAL), { celebration: true });
    expect(a.total).toBe(7);
    expect(a.planned).toBe(0);
    const b = aroundMeals(SF({ ...RENTAL, tripMeals: { plan: 'dinners' } }), { celebration: true });
    expect(b.planned).toBe(7);
    expect(b.counts).toEqual({ house: 4, out: 1, own: 2 });
  });
  test('without a told kitchen, nothing is put "at the house" by default', () => {
    const b = aroundMeals(SF({ tripMeals: { plan: 'dinners' } }), { celebration: true });
    expect(b.counts.house).toBe(0);
  });
  test('a per-meal pick overrides the starting point', () => {
    const b = aroundMeals(SF({ ...RENTAL, tripMeals: { plan: 'dinners', meals: { '2027-06-16:lunch': 'out' } } }), { celebration: true });
    expect(b.counts).toEqual({ house: 4, out: 2, own: 1 });
  });
  test('who pays defaults from "Who pays for what"', () => {
    expect(mealsOutPayer(SF())).toBe('each');
    expect(mealsOutPayer(SF({ costSharing: { mode: 'pooled-dues' } }))).toBe('host');
    expect(mealsOutPayer(SF({ tripMeals: { payer: 'split' } }))).toBe('split');
  });
});

describe('the two-layer money, one calculation', () => {
  const est = { low: 670, high: 1585 };
  test('each pays: out is $0 to the host, house meals need a price source, own is $0', () => {
    const m = tripFoodMoney(SF({ ...RENTAL, tripMeals: { plan: 'dinners' } }), { foodEstimate: est });
    expect(m.celebration).toMatchObject({ low: 670, high: 1585, basis: 'spread', title: 'Mom’s 80th dinner' });
    const by = Object.fromEntries(m.around.rows.map((r) => [r.mode, r]));
    expect(by.out).toMatchObject({ count: 1, low: 0, high: 0, payer: 'each' });
    expect(by.house).toMatchObject({ count: 4, low: null, high: null, needsPriceSource: true });
    expect(by.own).toMatchObject({ count: 2, low: 0, high: 0 });
    expect([m.totalLow, m.totalHigh]).toEqual([670, 1585]);
    expect(m.unpricedMeals).toBe(4);
  });
  test('you cover them: a dinner out is the restaurant rate per head; a lunch out has no source', () => {
    const m = tripFoodMoney(SF({ ...RENTAL, tripMeals: { plan: 'dinners', payer: 'host', meals: { '2027-06-16:lunch': 'out' } } }), { foodEstimate: est });
    const out = m.around.rows.find((r) => r.mode === 'out');
    expect(out).toMatchObject({ count: 2, low: 750, high: 2250, needsPriceSource: true, unpriced: 1 });
    expect([m.totalLow, m.totalHigh]).toEqual([670 + 750, 1585 + 2250]);
    expect(m.unpricedMeals).toBe(4 + 1);
    expect(m.sources).toContain('boxedlunch-restaurant-2026');
  });
  test('a restaurant celebration uses the restaurant rate, before drinks, tax and tip', () => {
    const m = tripFoodMoney(SF({ celebration: { place: 'a restaurant on the plaza' } }), { foodEstimate: est });
    expect(m.celebration).toMatchObject({ low: 750, high: 2250, basis: 'restaurant' });
  });
  test('nothing planned: around is not planned and adds nothing', () => {
    const m = tripFoodMoney(SF(), { foodEstimate: est });
    expect(m.around.planned).toBe(0);
    expect([m.totalLow, m.totalHigh]).toEqual([670, 1585]);
  });
});

describe('which event types get a celebration', () => {
  test('the rule: a travel-led or corporate playbook has no single celebration', () => {
    expect([...NO_CELEBRATION_FAMILIES].sort()).toEqual(['corporate', 'travel_led']);
    for (const pb of ALL_PLAYBOOKS) {
      expect(celebrationAppliesWith(SF({ type: pb.type }), pb)).toBe(!NO_CELEBRATION_FAMILIES.has(pb.family));
    }
  });
  test('Birthday, Anniversary, Reunion, Bachelorette and Vow Renewal do; Group Trip does not', () => {
    for (const t of ['Birthday', 'Anniversary', 'Reunion', 'Bachelorette Party', 'Vow Renewal']) {
      expect(celebrationApplies(SF({ type: t }))).toBe(true);
    }
    expect(celebrationApplies(SF({ type: 'Group Trip' }))).toBe(false);
  });
  test('a single-day or local event has neither', () => {
    expect(celebrationApplies(SF({ endDate: '' }))).toBe(false);
    expect(celebrationApplies(SF({ isDestination: false }))).toBe(false);
  });
  test('a Group Trip shows only trip meals: every dinner is around, none is the celebration', () => {
    const ev = SF({ type: 'Group Trip', name: 'Girls Trip' });
    const it = guestItinerary(ev, getPlaybook);
    expect(it.rows.some((r) => r.celebration)).toBe(false);
    expect(aroundMeals(ev, { celebration: celebrationApplies(ev) }).total).toBe(8);
  });
});

describe('the dinner sheet only links out', () => {
  test('six parts, each owned by another sheet; the night alone is set here', () => {
    const parts = dinnerParts(SF());
    expect(parts.map((p) => p.id)).toEqual(['night', 'place', 'food', 'drinks', 'cake', 'seats']);
    expect(parts.filter((p) => p.set)).toHaveLength(0);
    expect(parts.find((p) => p.id === 'place').goes).toBe('venue');
    expect(parts.find((p) => p.id === 'seats').goes).toBe('seating');
    expect(parts.find((p) => p.id === 'seats').stepFree).toBe('she uses a walker');
    const picked = dinnerParts(SF({ celebration: { night: '2027-06-15' }, foodChoices: { alcohol: 'Beer + wine' } }));
    expect(picked.filter((p) => p.set).map((p) => p.id)).toEqual(['night', 'drinks']);
  });
});

describe('"decided" on the Spread counts food decisions only', () => {
  test('"How are guests staying?" is not one of the food choices', () => {
    const plan = playbookFoodPlan(SF());
    expect(plan.choices.map((c) => c.id)).not.toContain('dest_lodging');
    expect(plan.choices.length).toBeGreaterThan(0);
  });
});

describe('creation keeps the courtyard', () => {
  test('the kind of place is heard, not a named venue', () => {
    expect(heardCelebrationPlace(SENTENCE)).toBe('adobe courtyard');
    expect(heardCelebrationPlace('dinner at the Pink Adobe on the plaza')).toBe('the Pink Adobe');
    expect(heardCelebrationPlace('a dinner at home for 12')).toBe(null);
    expect(heardCelebrationPlace('birthday in Santa Fe for 30')).toBe(null);
  });
  test('creation persists it as the celebration place, and the clause counts as used', () => {
    expect(celebrationFieldsToPersist(SENTENCE)).toEqual({ celebration: { place: 'adobe courtyard' } });
    expect(celebrationFieldsToPersist('birthday in Santa Fe')).toEqual({});
    expect(clausesNotUsed(SENTENCE).join(' | ')).not.toMatch(/courtyard/);
  });
});

describe('only meals out together add a step, labeled with their day', () => {
  const { playbookChecklist } = require('../playbooks');
  const steps = (ev) => playbookChecklist(ev, '2026-11-21').filter((r) => r.provenance && r.provenance.derived === 'trip-meals');
  test('a group dinner each night with a kitchen: one table to reserve, on Wed', () => {
    const s = steps(SF({ ...RENTAL, tripMeals: { plan: 'dinners' } }));
    expect(s.map((r) => r.task)).toEqual(['Wed, Jun 16 · Reserve a table for the group dinner']);
    expect(s[0].provenance.group).toBe('Wed, Jun 16');
  });
  test('house and on-your-own meals add none', () => {
    expect(steps(SF({ ...RENTAL, tripMeals: { plan: 'house' } }))).toHaveLength(0);
    expect(steps(SF({ tripMeals: { plan: 'own' } }))).toHaveLength(0);
  });
});

test('the day everyone leaves is not a dinner night', () => {
  expect(celebrationNight(SF({ celebration: { night: '2027-06-17' } })).picked).toBe(false);
});

describe('Your days is its own sheet, and the meal steps open it', () => {
  const { checklistRouteFor } = require('../taskRoute');
  const { resolveRoute } = require('../routeResolver');
  test('a "Reserve a table for the group dinner" step routes to Your days', () => {
    const hit = routeByWords('Wed, Jun 16 · Reserve a table for the group dinner', { category: 'planning' }, SF());
    expect(hit && hit.route).toEqual({ focusField: 'your-days' });
    expect(resolveRoute(hit.route)).toEqual({ kind: 'days' });
  });
});
