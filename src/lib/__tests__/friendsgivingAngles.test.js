// ─── FRIENDSGIVING, FROM EVERY ANGLE A HOST WILL ACTUALLY TRY ───────────────
//
// Written 11/15/2026 with the Friendsgiving playbook (data/friendsgiving.js).
// The anchor case is the owner's own test event: a Friendsgiving next Saturday,
// 11/21/2026, for 15 people at a friend's place — six days out, the weekend
// before Thanksgiving (Thursday 11/26/2026). The repo is public, so the friend's
// name and street are SYNTHETIC here ("Jordan's", "120 Maple Ave"); the real
// event is driven in the browser, not committed.
//
// Each block is one angle. Every assertion was measured against the engine
// before it was written down.
import {
  getPlaybook, playbookChecklist, playbookMilestones, playbookFoodPlan, foodApproach,
  playbookRunOfShow, playbookDayOfChecklist, sizingGuests,
} from '../playbooks';
import { resolveCanonicalType } from '../eventTaxonomy.mjs';
import { parseSmartEventText } from '../smartParseEvent';
import { getCompressionLevel, getStandardLeadDays } from '../workflowCompression';
import { US_HOLIDAYS } from '../estimatorFactors';

const AS_OF = new Date('2026-11-15T12:00:00');   // a Sunday
const HOST_MAIN = 'Potluck — host makes the main, friends each bring an assigned dish';
const ALL_ASSIGNED = 'Full potluck — even the main is assigned to a friend';
const HOST_COOKS = 'Host cooks most of it — friends bring drinks and dessert';
const ORDERED = 'Ordered in — a restaurant or caterer cooks, the group splits the bill';

const ev = (foodChoices = {}, extra = {}) => ({
  id: 'fg', type: 'Friendsgiving', name: 'Friendsgiving', date: '2026-11-21', startTime: '18:00',
  guestCount: 15, guestMode: 'count', foodChoices, vendors: [], guests: [], budget: [], timeline: [],
  venue: "Jordan's", ...extra,
});
const taskIds = (e) => playbookChecklist(e, AS_OF).map((c) => c.id.replace(/^pbt-fg-/, ''));
const foodIds = (e) => playbookFoodPlan(e).list.map((i) => i.id);
const dayOfIds = (e) => playbookDayOfChecklist(e).items.map((i) => i.id);
const due = (e, id) => playbookMilestones(e, AS_OF).find((m) => m.id === id).dueDate;

describe('angle 1 — the word "Friendsgiving" reaches its own playbook', () => {
  test.each(['Friendsgiving', 'friendsgiving potluck', 'Friends-giving dinner', 'Friendsgiving the Saturday before Thanksgiving'])('%s → Friendsgiving', (s) => {
    expect(resolveCanonicalType(s)).toBe('Friendsgiving');
  });
  test.each(['Thanksgiving', 'Thanksgiving dinner', 'turkey day'])('%s still → Thanksgiving Hosting', (s) => {
    expect(resolveCanonicalType(s)).toBe('Thanksgiving Hosting');
  });
  test('the playbook is registered under its own type', () => {
    expect(getPlaybook('Friendsgiving').type).toBe('Friendsgiving');
    expect(getPlaybook('Thanksgiving Hosting').type).toBe('Thanksgiving Hosting');
  });
  test('typed the way the owner said it, the intake reads type, date, count and place', () => {
    const r = parseSmartEventText("Friendsgiving this Saturday at Jordan's for 15 people", { now: AS_OF });
    expect(r).toEqual(expect.objectContaining({ type: 'Friendsgiving', date: '2026-11-21', guests: 15, honoree: null, venue: "Jordan's" }));
  });
  test('an address after the place stays one venue and is not a destination trip', () => {
    const r = parseSmartEventText("Friendsgiving this Saturday at Jordan's - 120 Maple Ave, Pasadena, MD for 15", { now: AS_OF });
    expect(r.type).toBe('Friendsgiving');
    expect(r.honoree).toBe(null);
    // A bare town with no home city on file is a GUESS; the shell declines to
    // commit a 'place-named' guess (HostShellV2 destinationIsGuess), so no
    // destination plan — and no $39 pass — follows from the address alone.
    expect(r.destinationBasis).toBe('place-named');
  });
});

describe('angle 2 — the Saturday before Thanksgiving, 15 guests, six days out', () => {
  const e = ev();
  test('a 21-day plan started with 6 days left reads as a rush, measured against Friendsgiving, not the 91-day default', () => {
    expect(getStandardLeadDays('Friendsgiving')).toBe(21);
    expect(getCompressionLevel(6, 'Friendsgiving')).toBe('rush');        // 6/21 = 0.29
    expect(getCompressionLevel(13, 'Friendsgiving')).toBe('tight');      // two weeks out is tight, not late
  });
  test('the dated plan lands on real days: thaw Monday, confirm Tuesday, shop Thursday, set up Friday', () => {
    expect(due(e, 'fg_thaw')).toBe('2026-11-16');
    expect(due(e, 'fg_confirm')).toBe('2026-11-17');
    expect(due(e, 'fg_shop')).toBe('2026-11-19');
    expect(due(e, 'fg_setup')).toBe('2026-11-20');
    expect(due(e, 'fg_invite')).toBe('2026-10-31');   // already past — the rush is real
  });
  test('the bird is sized to the table, and the thaw starts in time for its weight', () => {
    // The attendance model's plan-to headcount (buy so you won't run short),
    // not "guests plus the host": it reads 16 for 15 invited.
    expect(sizingGuests(e, getPlaybook('Friendsgiving'))).toBe(16);
    const turkey = playbookFoodPlan(e).list.find((i) => i.id === 'p_turkey');
    expect(turkey.qty).toBe(20);   // 1.25 lb × 16
    // FSIS: about a day per 4-5 lb in the refrigerator, so 20 lb needs 4-5 days.
    // Monday 11/16 to Saturday 11/21 is five.
    expect((new Date('2026-11-21') - new Date(due(e, 'fg_thaw'))) / 86400000).toBe(5);
  });
  test('the turkey is timed to dinner, not to arrivals: its 45-minute rest ends when dinner starts', () => {
    const ros = playbookRunOfShow(e);
    const at = (re) => ros.find((c) => re.test(c.segment)).time;
    expect(at(/^Turkey into the oven/)).toBe('14:00');
    expect(at(/^Thermometer check/)).toBe('18:05');
    expect(at(/^Turkey out to rest/)).toBe('18:15');
    expect(at(/^Dinner:/)).toBe('19:00');
  });
  test('the day-of list carries the turkey and food-safety checks', () => {
    expect(dayOfIds(e)).toEqual(expect.arrayContaining(['thaw', 'thermometer', 'labels', 'hot_cold', 'two_hours']));
  });
});

describe('angle 3 — who cooks what', () => {
  test('default potluck: the host buys the turkey; the friends\' dishes are assigned, not bought or charged to the host', () => {
    const e = ev();
    expect(foodApproach(e)).toEqual(expect.objectContaining({ usesCaterer: false, cooking: true }));
    expect(foodIds(e)).toEqual(expect.arrayContaining(['p_turkey', 'p_gravy', 'p_labels']));
    // Review finding 11/15/2026: a "Guests bring" line was still a host buy-task
    // and a host cost. The dishes friends carry live in the assignment task.
    expect(foodIds(e)).not.toContain('p_stuffing');   // the sides are one line per dish since 11/18/2026
    expect(foodIds(e)).not.toContain('p_desserts');
    expect(taskIds(e)).toEqual(expect.arrayContaining(['t_assign', 't_buy_bird', 't_thaw', 't_transport_note', 't_oven_slots']));
  });
  test('full potluck: a friend brings the main, so nothing about a turkey lands on the host', () => {
    const e = ev({ hosting_model: ALL_ASSIGNED });
    expect(foodIds(e)).not.toEqual(expect.arrayContaining(['p_turkey']));
    expect(foodIds(e)).not.toContain('p_gravy');
    expect(foodIds(e)).not.toContain('p_thermometer');
    expect(taskIds(e)).toContain('t_assign_main');
    expect(taskIds(e)).not.toContain('t_thaw');
    expect(taskIds(e)).not.toContain('t_bird_in');
    expect(dayOfIds(e)).not.toContain('thaw');
    expect(dayOfIds(e)).not.toContain('thermometer');
    // Milestones and the run of show follow the same gate (review 11/15/2026).
    expect(playbookMilestones(e, AS_OF).map((m) => m.id)).not.toEqual(expect.arrayContaining(['fg_thaw']));
    expect(playbookMilestones(e, AS_OF).map((m) => m.id)).not.toContain('fg_main');
    expect(playbookRunOfShow(e).some((c) => /^(Turkey|Baste|Thermometer)/.test(c.segment))).toBe(false);
  });
  test('host cooks most of it: the sides move to the grocery list, and friends are asked for drinks and dessert', () => {
    const e = ev({ hosting_model: HOST_COOKS });
    expect(foodIds(e)).toContain('p_stuffing');
    expect(playbookFoodPlan(e).list.find((i) => i.id === 'p_stuffing').where[0]).toBe('Grocery');
    expect(taskIds(e)).toContain('t_assign_light');
    expect(taskIds(e)).not.toContain('t_assign');
  });
  test('ordered in: the caterer path takes over and the group is asked for a per-person price', () => {
    const e = ev({ hosting_model: ORDERED });
    expect(foodApproach(e).usesCaterer).toBe(true);
    expect(foodIds(e)).not.toContain('p_turkey');
    expect(taskIds(e)).toEqual(expect.arrayContaining(['t_order', 't_confirm_order', 't_shop_basics']));
    // Nothing a cook does: no dish intake, no transport note, no gap-fill run, no main to shop for.
    for (const id of ['t_transport_note', 't_arrivals', 't_confirm', 't_fill_gaps', 't_shop', 't_buy_bird', 't_thaw']) expect(taskIds(e)).not.toContain(id);
    expect(playbookMilestones(e, AS_OF).map((m) => m.id)).not.toContain('fg_thaw');
    expect(dayOfIds(e)).not.toContain('every_dish');
    expect(playbookRunOfShow(e).some((c) => /^(Turkey|Baste|Thermometer)/.test(c.segment))).toBe(false);
  });
});

describe('angle 4 — the main is not always a turkey', () => {
  test('a ham or a big vegetarian main: no thaw, still a thermometer', () => {
    const e = ev({ main_dish: 'Something else — ham, roast chicken, or a big vegetarian main' });
    expect(foodIds(e)).toContain('p_main_alt');
    expect(foodIds(e)).not.toContain('p_turkey');
    expect(taskIds(e)).not.toContain('t_thaw');
    expect(taskIds(e)).toContain('t_main_in');
    expect(dayOfIds(e)).not.toContain('thaw');
    expect(dayOfIds(e)).toContain('thermometer');
    expect(playbookRunOfShow(e).some((c) => /out to rest/.test(c.segment))).toBe(false);   // only a bird rests 45 minutes
  });
  test('no single main: no bird, no thermometer, no resting beat', () => {
    const e = ev({ main_dish: 'No single main — a table of shareable dishes' });
    expect(foodIds(e)).not.toContain('p_turkey');
    expect(foodIds(e)).not.toContain('p_main_alt');
    expect(foodIds(e)).not.toContain('p_thermometer');
    expect(playbookRunOfShow(e).some((c) => /out to rest/.test(c.segment))).toBe(false);
  });
});

describe('angle 4b — a turkey breast for a small table', () => {
  test('it gets its own oven start and still thaws', () => {
    const e = ev({ main_dish: 'A turkey breast or a smaller bird' }, { guestCount: 6 });
    expect(taskIds(e)).toEqual(expect.arrayContaining(['t_breast_in', 't_thaw']));
    expect(taskIds(e)).not.toContain('t_bird_in');
  });
});

describe('angle 5 — allergies at a table with a dozen cooks', () => {
  test('when someone has a need, every cook is told and that guest serves first', () => {
    const e = ev({ dietary_table: 'Several — plan dishes everyone can eat' });
    expect(taskIds(e)).toEqual(expect.arrayContaining(['t_allergy_route', 't_safe_first']));
  });
  test('when nobody does, neither task appears', () => {
    const e = ev({ dietary_table: 'Nobody at this table' });
    expect(taskIds(e)).not.toContain('t_allergy_route');
    expect(taskIds(e)).not.toContain('t_safe_first');
  });
});

describe('angle 6 — money and drinks', () => {
  test('splitting afterward adds the settle-up step two days after; the default does not', () => {
    expect(taskIds(ev())).not.toContain('t_settle');
    expect(taskIds(ev({ cost_split: 'Split shared costs evenly afterward' }))).toContain('t_settle');
  });
  test('covering all the drinks costs the host more than bring-a-bottle', () => {
    const line = (e) => playbookFoodPlan(e).list.find((i) => i.id === 'p_drinks');
    const base = line(ev());
    const all = line(ev({ drinks: 'Host covers all the drinks' }));
    expect(all.high).toBeGreaterThan(base.high);
    // The default's "alcohol-free" must not trip the engine's dry-party discount
    // (it once said "zero-proof", which the beverage rule reads as x0.6).
    expect(all.high / base.high).toBeCloseTo(3, 0);
  });
});

describe('angle 7 — size', () => {
  test.each([6, 25])('%i guests: the bird scales with the plan-to headcount, never below the invite count', (guests) => {
    const e = ev({}, { guestCount: guests });
    const sized = sizingGuests(e, getPlaybook('Friendsgiving'));
    expect(sized).toBeGreaterThanOrEqual(guests);
    expect(playbookFoodPlan(e).list.find((i) => i.id === 'p_turkey').qty).toBeCloseTo(sized * 1.25, 0);
  });
  test('a small table gets a small bird and a big one a big bird', () => {
    const q = (n) => playbookFoodPlan(ev({}, { guestCount: n })).list.find((i) => i.id === 'p_turkey').qty;
    expect(q(6)).toBeLessThan(q(15));
    expect(q(15)).toBeLessThan(q(25));
  });
});

describe('angle 8 — which weekend', () => {
  const tw = US_HOLIDAYS.find((h) => h.label === 'Thanksgiving weekend');
  test('the Saturday before Thanksgiving carries no holiday premium', () => {
    expect(tw.test(new Date(2026, 10, 21))).toBe(false);
  });
  test('the Saturday after does', () => {
    expect(tw.test(new Date(2026, 10, 28))).toBe(true);
  });
  test('the Wednesday night before Thanksgiving does too — the rule says Wednesday through Sunday', () => {
    expect(tw.test(new Date(2026, 10, 25))).toBe(true);
    expect(tw.test(new Date(2026, 10, 24))).toBe(false);   // Tuesday
  });
});
