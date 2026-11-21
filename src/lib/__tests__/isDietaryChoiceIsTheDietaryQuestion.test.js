// ─── isDietaryChoice IS THE DIETARY QUESTION, NOT ANY LABEL THAT SAYS "DIETARY" ─
//
// isDietaryChoice decides which menu question "dietary needs noted" closes
// (openFoodChoices) and which one the checklist's menu rule leaves to the
// allergy step (taskEngine). It matched /dietary|allerg/ anywhere in a label,
// so five decisions that only MENTION diets were read as the dietary question:
//
//   Engagement Party  invite     "Invite + RSVP + dietary/allergy ask"
//   Retirement Party  invite     "Invite + RSVP + dietary/allergy + accessibility ask"
//   Anniversary       guestlist  "Confirm guest count + collect dietary/accessibility needs"
//   Vow Renewal       guestlist  "Confirm guest count + collect dietary/accessibility/travel needs"
//   Bachelorette      drinkers   "Drinking mix + dietary/no-alcohol needs"
//
// The bite: Bachelorette's `drinkers` is a menu question, and once dietary
// needs were noted it dropped out of openFoodChoices unanswered, so the food
// area could read handled over an open drinking-mix call.
import { ALL_PLAYBOOKS, getPlaybook, isDietaryChoice, openFoodChoices } from '../playbooks';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const decision = (type, id) => (getPlaybook(type).decisions || []).find((d) => d && d.id === id);

const DIETARY = [
  ['Dinner Party', 'dietary'],
  ['Birthday', 'dietary'],
  ['Baby Shower', 'dietary'],
  ['Bridal Shower', 'dietary'],
  ['Crab Feast', 'dietary'],
  ['Thanksgiving Hosting', 'dietary_table'],
  ['Friendsgiving', 'dietary_table'],
];
const NOT_DIETARY = [
  ['Engagement Party', 'invite'],
  ['Retirement Party', 'invite'],
  ['Anniversary', 'guestlist'],
  ['Vow Renewal', 'guestlist'],
  ['Bachelorette Party', 'drinkers'],
];

test.each(DIETARY)('%s %s is the dietary question', (type, id) => {
  const d = decision(type, id);
  expect(d).toBeTruthy();
  expect(isDietaryChoice(d)).toBe(true);
});

test.each(NOT_DIETARY)('%s %s only mentions diets: not the dietary question', (type, id) => {
  const d = decision(type, id);
  expect(d).toBeTruthy();
  expect(isDietaryChoice(d)).toBe(false);
});

test('across every playbook, exactly the dietary questions above match', () => {
  const hits = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of (pb.decisions || [])) if (d && isDietaryChoice(d)) hits.push(`${pb.type}:${d.id}`);
  }
  expect(hits.sort()).toEqual(DIETARY.map(([t, id]) => `${t}:${id}`).sort());
});

test('Bachelorette: noting dietary needs does not answer the drinking mix', () => {
  const ev = {
    id: 'bach-diet', type: 'Bachelorette Party', date: daysFromNow(20),
    guestMode: 'count', guestEstimate: 12, guestCountSource: 'host', guests: [],
    foodChoices: {}, dietaryNoted: true,
  };
  expect((openFoodChoices(ev) || []).map((c) => c.id)).toContain('drinkers');
});
