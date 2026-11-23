// ─── THE DINNER'S STEPS ARE ONE GROUP IN THE CHECKLIST (queued from #222) ────
//
// On a destination trip with a celebration, the dinner is its own planned
// moment (tripMeals / tripFood). Its steps in the checklist — the night, the
// place, the dinner's food — were scattered through the list by due date, and
// the night and the place had no step at all. They are now one group, under
// the dinner's title, so the host sees them as one thing.
//
// Acceptance case: Mom's 80th birthday in Santa Fe, about 30 flying in for 3
// nights, dinner at an adobe courtyard.
import { routeByWords } from '../__fixtures__/stepByWords';
import { playbookChecklist } from '../playbooks';
import { taskSatisfied } from '../taskEngine';
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { DINNER_GROUP, DINNER_NIGHT_STEP, DINNER_PLACE_STEP, groupDinnerSteps } from '../tripMeals';
// INPUTS ONLY changed (six root causes, cause 1, part 2): a row is proven by
// the facts its step DECLARES, never by its words, so each row literal below
// carries `facts`: the declaration a step with its words carries (derived once
// from the retired text rules, as the playbooks' were). Assertions unchanged.

const SF = (extra = {}) => ({
  id: 'sf', name: 'Mom’s 80th Birthday', honoree: 'Mom', type: 'Birthday',
  date: '2027-06-14', endDate: '2027-06-17', venueCity: 'Santa Fe', venueState: 'NM',
  guestMode: 'count', guestEstimate: 30, isDestination: true, guestsStayOvernight: true,
  travelMode: 'fly', timeOfDay: 'evening',
  celebration: { place: 'adobe courtyard' },
  ...extra,
});
const AS_OF = '2026-11-22';
const rowsOf = (ev) => playbookChecklist(ev, AS_OF);
const inDinner = (r) => !!(r.provenance && r.provenance.group === DINNER_GROUP);

describe('the dinner has its own steps, and they carry the dinner group', () => {
  test('the night and the place are steps, worded as the dinner card asks them', () => {
    const dinner = rowsOf(SF()).filter(inDinner).map((r) => r.task);
    expect(dinner).toContain(DINNER_NIGHT_STEP);
    expect(dinner).toContain(DINNER_PLACE_STEP);
    expect(DINNER_NIGHT_STEP).toBe('Pick the night of the dinner');
  });
  test('the dinner\'s food steps (the playbook\'s food phase) are in the group', () => {
    const rows = rowsOf(SF());
    const cake = rows.find((r) => /^Cake \+ candles/.test(r.task));
    const prep = rows.find((r) => /make-ahead sides/.test(r.task));
    expect(inDinner(cake)).toBe(true);
    expect(inDinner(prep)).toBe(true);
  });
  test('steps that are not the dinner stay out: the invite, the trip\'s own meals out', () => {
    const rows = rowsOf(SF({ foodChoices: { dest_lodging: 'A host-arranged Airbnb' }, tripMeals: { plan: 'dinners' } }));
    expect(inDinner(rows.find((r) => /^Send invites/.test(r.task)))).toBe(false);
    const meal = rows.find((r) => /Reserve a table for the group dinner/.test(r.task));
    expect(meal).toBeTruthy();
    expect(inDinner(meal)).toBe(false);
  });
  test('no celebration, no group: a birthday at home, and a Group Trip (the trip is the occasion)', () => {
    const home = { id: 'h', name: 'Ty’s 40th', type: 'Birthday', date: '2027-06-14', guestMode: 'count', guestEstimate: 20 };
    expect(rowsOf(home).some(inDinner)).toBe(false);
    expect(rowsOf(home).some((r) => r.task === DINNER_NIGHT_STEP)).toBe(false);
    const trip = { ...SF(), type: 'Group Trip', name: 'Girls trip' };
    expect(rowsOf(trip).some(inDinner)).toBe(false);
  });
});

// INPUTS ONLY changed (six root causes, cause 1, part 2): each dinner step is
// passed by its id (`cel-<key>`), never found by its words. Assertions unchanged.
describe('the dinner\'s steps tick from the dinner\'s own parts', () => {
  test('the night step is done once the night is picked', () => {
    expect(taskSatisfied(SF(), { id: 'cel-night', task: DINNER_NIGHT_STEP })).toBe(false);
    expect(taskSatisfied(SF({ celebration: { place: 'adobe courtyard', night: '2027-06-15' } }), { id: 'cel-night', task: DINNER_NIGHT_STEP })).toBe(true);
  });
  test('the place step is done once a place (not home) is named in Venue', () => {
    expect(taskSatisfied(SF(), { id: 'cel-place', task: DINNER_PLACE_STEP })).toBe(false);
    expect(taskSatisfied(SF({ venue: 'Casa Courtyard' }), { id: 'cel-place', task: DINNER_PLACE_STEP })).toBe(true);
  });
});

describe('each dinner step opens where its part is owned', () => {
  test('the night opens the dinner; the place opens Venue', () => {
    const night = routeByWords(DINNER_NIGHT_STEP, { category: 'planning' }, SF());
    expect(resolveRoute(night.route)).toMatchObject({ kind: 'celebration' });
    const place = routeByWords(DINNER_PLACE_STEP, { category: 'planning' }, SF());
    expect(resolveRoute(place.route)).toMatchObject({ kind: 'venue' });
  });
});

describe('groupDinnerSteps: the list renders the group as one block', () => {
  const tl = [
    { id: 'a', task: 'Send invites', facts: ['invites-out'] },
    { id: 'cake', task: 'Cake + candles moment' },
    { id: 'b', task: 'Chill drinks' },
    { id: 'night', task: DINNER_NIGHT_STEP },
    { id: 'c', task: 'Pack leftovers' },
    { id: 'place', task: DINNER_PLACE_STEP },
  ];
  const ids = new Set(['cake', 'night', 'place']);
  test('members sit together where the first one was, the dinner\'s own steps first', () => {
    const out = groupDinnerSteps(tl, ids);
    expect(out.map((x) => x.t.id)).toEqual(['a', 'night', 'place', 'cake', 'b', 'c']);
    expect(out.map((x) => x.i)).toEqual([0, 3, 5, 1, 2, 4]);
    expect(out.filter((x) => x.head).map((x) => x.t.id)).toEqual(['night']);
    expect(out.filter((x) => x.inGroup).length).toBe(3);
  });
  test('with no members the list is unchanged', () => {
    const out = groupDinnerSteps(tl, new Set());
    expect(out.map((x) => x.i)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(out.some((x) => x.head || x.inGroup)).toBe(false);
  });
});
