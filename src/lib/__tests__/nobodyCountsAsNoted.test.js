// ─── "NOBODY" COUNTS AS NOTED (owner ruling 1, 11/21/2026) ───────────────────
//
// Follow-up to "The menu hero offers the next open question" (08c93ca2). A host
// answers Thanksgiving's "Who at the table has a dietary need to cook for?" with
// "Nobody — the traditional menu works for everyone", and the hero's next words
// were "Who has a food allergy?". The answer said there is no need to note;
// dietaryResolved read only event.dietaryNoted and the guest rows, so it never
// heard it.
//
// The shared rule (playbooks.dietaryNoted) now hears it, and every reader of
// "dietary needs noted" goes through it: the allergy gate, the food cue, the
// food area's handled count, and the checklist's "Collect dietary needs" step.
// The e2e twin is the Thanksgiving walk in
// hostv2/e2e/theMenuHeroRollsToTheNextQuestion.spec.mjs.
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { dietaryNoted, openFoodChoices, playbookFoodPlan, playbookChecklist } from '../playbooks';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { timelineStepResolved, factsATickRecords } from '../taskEngine';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const seed = (type, picks, extra) => ({
  id: 'nobody-' + type.replace(/\W/g, ''), name: type, type, date: daysFromNow(6),
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host',
  guests: Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'yes' })),
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  startTime: '16:00', startTimeSource: 'host', totalBudget: 60000,
  budget: [], vendors: [], timeline: [], createdAt: new Date().toISOString(),
  foodChoices: picks, ...(extra || {}),
});
// Every other menu question answered with its first option, the table with `table`.
const answered = (type, table, extra) => {
  let ev = seed(type, { dietary_table: table }, extra);
  for (let k = 0; k < 12; k++) {
    const open = (openFoodChoices(ev) || []).filter((c) => c.id !== 'dietary_table');
    if (!open.length) break;
    ev = { ...ev, foodChoices: { ...ev.foodChoices, [open[0].id]: open[0].options[0] } };
  }
  return ev;
};
const actions = (ev) => (eventPlan(ev, buildExperienceContext(ev, null, 1)) || {}).nextActions || [];
const allergyAsks = (ev) => actions(ev)
  .filter((a) => /food allergy|dietary (needs|restrictions)/i.test(`${a.ask || ''} ${a.title || ''}`))
  .map((a) => a.id);
const foodArea = (ev) => ((deriveEventPhaseProgress(ev) || {}).items || []).find((i) => i && i.id === 'food');

const CASES = [
  ['Thanksgiving Hosting', 'Nobody — the traditional menu works for everyone', 'One or two needs — adjust dishes and label them'],
  ['Friendsgiving', 'Nobody at this table', 'One or two needs — label dishes and plan a safe plate'],
];

describe.each(CASES)('%s', (type, nobody, someNeeds) => {
  test('PREMISE: with the table unanswered, it is the one menu question left', () => {
    const ev = answered(type, undefined);
    expect(dietaryNoted(ev)).toBe(false);
    expect((openFoodChoices(ev) || []).map((c) => c.id)).toEqual(['dietary_table']);
  });

  test(`"${nobody}" is dietary needs noted — no allergy ask follows`, () => {
    const ev = answered(type, nobody);
    expect(openFoodChoices(ev)).toEqual([]);
    expect(dietaryNoted(ev)).toBe(true);
    expect(playbookFoodPlan(ev).dietaryResolved).toBe(true);
    expect(allergyAsks(ev)).toEqual([]);
  });

  test('in headcount mode too, where nothing else can settle it', () => {
    const ev = answered(type, nobody, { guestMode: 'count', guests: [] });
    expect(allergyAsks(ev)).toEqual([]);
  });

  test('the food area reads handled, and the checklist\'s "Collect dietary needs" step with it', () => {
    const ev = answered(type, nobody);
    const food = foodArea(ev);
    expect(food.handled).toBe(true);
    const steps = (playbookChecklist(ev) || []).filter((r) => /\b(collect|note)\b[^;]*\bdietary/i.test(r.task || ''));
    for (const r of steps) {
      const t = { id: r.id, task: r.task, done: false };
      expect(timelineStepResolved(ev, t)).toBe(true);
      // A tick has nothing left to record: the answer already stands for it.
      expect(factsATickRecords(ev, t)).toEqual({});
    }
  });

  test(`"${someNeeds}" is not noted: the host still owes who`, () => {
    const ev = answered(type, someNeeds);
    expect(dietaryNoted(ev)).toBe(false);
    expect(allergyAsks(ev).length).toBeGreaterThan(0);
    expect(foodArea(ev).handled).toBe(false);
  });
});

test('a default the host never picked is not an answer', () => {
  // dietary_table's authored default is "One or two needs", never "Nobody"; and a
  // proposal is not a pick. Only foodChoices — what the host chose — counts.
  const ev = seed('Thanksgiving Hosting', { hosting_model: 'Host cooks the whole meal' });
  expect(dietaryNoted(ev)).toBe(false);
});
