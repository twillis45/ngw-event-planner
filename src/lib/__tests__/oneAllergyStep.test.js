// ─── ONE ALLERGY STEP (owner ruling 2, 11/21/2026) ───────────────────────────
//
// The allergy was asked by two producers: the decision-first gate
// ("Collect dietary restrictions & allergies", playbooks.topPlaybookDecision,
// keyed 'decision:dietary') and the food area's cue ("Note dietary needs on the
// food plan", phaseProgress, keyed 'phase:food'). Both asked "Who has a food
// allergy?", both could be on the list at once, and setting one aside left the
// other standing — the 'phase:food' snooze did not even name the allergy, it
// named the whole food area.
//
// One rule now: the allergy step is ONE debt with ONE id, 'decision:dietary',
// whichever producer raises it. Answering (dietaryNoted, the shared rule) clears
// both; setting either aside sets the step aside; and a set-aside is not a
// handled food area. (A third tier adopted the cue too: the readiness ladder
// made it the hero under a slugged id, 'top:readiness:note-dietary-…'.)
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { openFoodChoices, playbookChecklist } from '../playbooks';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { timelineStepResolved, factsATickRecords } from '../taskEngine';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const seed = (type, picks, extra) => ({
  id: 'allergy-' + type.replace(/\W/g, ''), name: type, type, date: daysFromNow(6),
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host',
  guests: Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'yes' })),
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  startTime: '16:00', startTimeSource: 'host', totalBudget: 60000,
  budget: [], vendors: [], timeline: [], createdAt: new Date().toISOString(),
  foodChoices: picks, ...(extra || {}),
});
// Every menu question answered with its first option except the table, which
// says there ARE needs — so the allergy step is genuinely owed.
const owed = (type, extra) => {
  let ev = seed(type, { dietary_table: 'One or two needs — adjust dishes and label them' }, extra);
  for (let k = 0; k < 12; k++) {
    const open = (openFoodChoices(ev) || []).filter((c) => (c.options || []).length);
    if (!open.length) break;
    ev = { ...ev, foodChoices: { ...ev.foodChoices, [open[0].id]: open[0].options[0] } };
  }
  return ev;
};
const plan = (ev) => eventPlan(ev, buildExperienceContext(ev, null, 1)) || {};
const isAllergyAsk = (a) => !!a && /food allergy|dietary (needs|restrictions)/i.test(`${a.ask || ''} ${a.title || ''}`);
const allergyAsks = (ev) => (plan(ev).nextActions || []).filter(isAllergyAsk);
const setAsideAsks = (ev) => (plan(ev).setAside || []).filter(isAllergyAsk);
const snooze = (ev, id) => ({ ...ev, snoozed: { ...(ev.snoozed || {}), [id]: daysFromNow(3) } });
const foodArea = (ev) => ((deriveEventPhaseProgress(ev) || {}).items || []).find((i) => i && i.id === 'food');

describe.each([['Thanksgiving Hosting'], ['Birthday']])('%s', (type) => {
  test('PREMISE: the allergy is owed, and asked', () => {
    expect(allergyAsks(owed(type)).length).toBeGreaterThan(0);
  });

  test('it is asked once, under one id', () => {
    const asks = allergyAsks(owed(type));
    expect(asks.map((a) => a.id)).toEqual(['decision:dietary']);
  });

  test('setting aside "Collect dietary restrictions & allergies" sets aside the food-plan cue too', () => {
    const ev = snooze(owed(type), 'decision:dietary');
    expect(allergyAsks(ev)).toEqual([]);
    // It is in the set-aside pile once, and comes back on its own.
    expect(setAsideAsks(ev).map((a) => a.id)).toEqual(['decision:dietary']);
  });

  test('the reverse: setting aside the food-plan cue sets aside "Collect dietary restrictions & allergies"', () => {
    // A month out no food buy is in its window, so the gate is quiet and the
    // food-plan cue is the only producer. Set aside whatever id that card
    // carries — exactly what the shell writes — then let the buy window open.
    const far = owed(type, { date: daysFromNow(30) });
    const cue = (plan(far).nextActions || []).find(isAllergyAsk);
    expect(cue && cue.title).toMatch(/^Note dietary needs on the food plan/);
    const near = { ...snooze(far, cue.id), date: daysFromNow(6) };
    expect(allergyAsks(near)).toEqual([]);
    // Setting the allergy aside does not set aside the rest of the food area.
    expect(near.snoozed['phase:food']).toBeUndefined();
  });

  test('set aside is not handled: the food area still counts it open', () => {
    expect(foodArea(snooze(owed(type), 'decision:dietary')).handled).toBe(false);
  });

  test('answering in either place clears both, and the checklist step with them', () => {
    const noted = { ...owed(type), dietaryNoted: true };
    expect(allergyAsks(noted)).toEqual([]);
    expect(foodArea(noted).handled).toBe(true);
    for (const r of (playbookChecklist(noted) || []).filter((x) => /\b(collect|note)\b[^;]*\bdietary/i.test(x.task || ''))) {
      expect(timelineStepResolved(noted, { id: r.id, task: r.task, done: false })).toBe(true);
    }
  });
});

test('ticking the checklist step records the answer the food-plan cue reads', () => {
  const ev = owed('Thanksgiving Hosting');
  const step = (playbookChecklist(ev) || []).find((r) => /^collect dietary needs/i.test(r.task || ''));
  expect(step).toBeTruthy();
  const facts = factsATickRecords(ev, { id: step.id, task: step.task, done: false });
  expect(facts).toEqual({ dietaryNoted: true });
  expect(allergyAsks({ ...ev, ...facts })).toEqual([]);
});
