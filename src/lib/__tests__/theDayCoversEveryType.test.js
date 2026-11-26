// THE DAY COVERS EVERY TYPE (owner, 11/26/2026, Thanksgiving morning): "I
// thought I used to see some little moments like when to take pictures, and
// ... safety information about if someone has too much to drink." Then: "Make
// sure these are systematic changes, not just Thanksgiving and Friendsgiving."
// Measured across all 47 playbook types before this change:
//   - 25 offered only the generic group photo as a moment;
//   - 33 had no rides-home row on the day-of list, whatever they served;
//   - 42 never got the grease-fire line, which keyed off a few type words.
// Each is now a rule over the plan's own data, held here for every type.
import { ALL_PLAYBOOKS, playbookDayOfChecklist, playbookFoodPlan, servesAlcohol } from '../playbooks';
import { momentsForType, suggestableMoments } from '../momentLibrary';
import { playbookRunOfShow } from '../playbooks';
import { incidentPlanFor } from '../knowledge/incidentContext';
import { foodApproach } from '../playbooks';

const TYPES = ALL_PLAYBOOKS.map((p) => p.type);
const ev = (type, extra = {}) => ({ type, guestEstimate: 12, date: '2026-12-31', ...extra });
const RIDES_RE = /(sober (driver|ride|way home)|designated driver|rides? home|rideshare|take (their|the) keys|way home)/i;
const ridesRow = (e) => ((playbookDayOfChecklist(e) || {}).items || []).filter((i) => RIDES_RE.test(i.label + ' ' + i.detail));
const added = (e) => ((playbookDayOfChecklist(e) || {}).items || []).filter((i) => /NHTSA’s host rule/.test(i.detail));

describe('moments: every type has its own, not only the group photo', () => {
  it.each(TYPES)('%s', (t) => {
    expect(momentsForType(t).filter((m) => m.id !== 'groupPhoto').length).toBeGreaterThan(0);
  });
  it('Thanksgiving names its thankful-for moment; New Year’s its countdown', () => {
    expect(momentsForType('Thanksgiving Hosting').map((m) => m.id)).toContain('thankful');
    expect(momentsForType("New Year's Eve Party").map((m) => m.id)).toContain('countdown');
  });
  it('Thanksgiving’s own timeline already holds the thankful-for moment, so it suggests the group photo', () => {
    const ros = (playbookRunOfShow(ev('Thanksgiving Hosting')) || []).map((r) => ({ segment: r.segment }));
    expect(suggestableMoments('Thanksgiving Hosting', ros)[0].id).toBe('groupPhoto');
  });
  it('Juneteenth keeps The reading (its name also says cookout)', () => {
    expect(momentsForType('Juneteenth Cookout')[0].id).toBe('reading');
  });
});

describe('rides home: on the day-of list whenever the plan serves alcohol, never twice, never when dry', () => {
  it.each(TYPES)('%s', (t) => {
    const e = ev(t);
    if (servesAlcohol(e)) expect(ridesRow(e).length).toBeGreaterThanOrEqual(1);
    else expect(added(e)).toEqual([]);
    // never twice: an authored rides row means the added one stays off
    if (ridesRow(e).some((i) => !/NHTSA’s host rule/.test(i.detail))) expect(added(e)).toEqual([]);
  });
  it('Thanksgiving buys wine, so it gets the row; Friendsgiving’s bring-a-bottle does too', () => {
    expect(servesAlcohol(ev('Thanksgiving Hosting'))).toBe(true);
    expect(added(ev('Thanksgiving Hosting')).length).toBe(1);
    expect(servesAlcohol(ev('Friendsgiving'))).toBe(true);
  });
  it('a dry pick drops it; a sweet-tea default never had it', () => {
    const dry = ev('Dinner Party', { foodChoices: { drinks: 'Zero-proof / dry' } });
    const dec = ALL_PLAYBOOKS.find((p) => p.type === 'Dinner Party').decisions.find((d) => d.drinksCall);
    dry.foodChoices = { [dec.id]: 'Zero-proof / dry' };
    expect(servesAlcohol(dry)).toBe(false);
    expect(added(dry)).toEqual([]);
    expect(servesAlcohol(ev('Fish Fry'))).toBe(false);
  });
  it('the row quotes NHTSA’s host rule', () => {
    const r = added(ev('Thanksgiving Hosting'))[0];
    expect(r.detail).toMatch(/sober driver/);
  });
});

describe('grease fire: whenever the host cooks', () => {
  it.each(TYPES)('%s', (t) => {
    const e = ev(t);
    if (foodApproach(e).cooking === true) expect(incidentPlanFor(e).lines.map((l) => l.key)).toContain('fire');
  });
  it('a catered dinner party does not', () => {
    const pb = ALL_PLAYBOOKS.find((p) => p.type === 'Dinner Party');
    const e = ev('Dinner Party');
    const fa = foodApproach(e);
    const dec = pb.decisions.find((d) => d.id === fa.decisionId);
    const cater = dec.options.find((o) => foodApproach({ ...e, foodChoices: { [dec.id]: o } }).cooking === false);
    expect(cater).toBe('Private chef');
    e.foodChoices = { [dec.id]: cater };
    expect(foodApproach(e).cooking).toBe(false);
    expect(incidentPlanFor(e).lines.map((l) => l.key)).not.toContain('fire');
  });
  it('Thanksgiving gets it', () => {
    expect(incidentPlanFor(ev('Thanksgiving Hosting')).lines.map((l) => l.key)).toContain('fire');
  });
});

test('the food plan is what the alcohol rule reads (sanity)', () => {
  expect(Array.isArray(playbookFoodPlan(ev('Thanksgiving Hosting')).list)).toBe(true);
});
