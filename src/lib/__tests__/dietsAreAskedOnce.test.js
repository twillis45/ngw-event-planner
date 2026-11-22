// DIETS ARE ASKED ONCE (audit 2 lane A P1-2 and lane D D-10, 11/22/2026).
// Crab Feast asked "Who can't eat shellfish — and what will they eat
// instead?", then, after the host answered, the generic "Who has a food
// allergy?". Friendsgiving and Dinner Party did the same. And a diet that came
// in through the invite reply (`diets`, `allergens`, the plus-one's needs) was
// counted on the Plan (dietCountsFor) while the hero still asked.
import { playbookFoodPlan, dietaryNoted, getPlaybook } from '../playbooks';
import { deriveEventPhaseProgress } from '../phaseProgress';

const dayOut = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ev = (type, extra = {}) => ({ id: `t-${type}`, type, name: type, date: dayOut(40), guestMode: 'count', guestCount: 20,
  venue: 'Our place', venueKind: 'home', venueCity: 'Bowie, MD', guests: [], vendors: [], budget: [], ...extra });
const foodCue = (e) => {
  const item = (deriveEventPhaseProgress(e, new Date()).items || []).find((i) => i.id === 'food');
  return item ? String(item.cueLabel || '') + ' ' + String((item.ask) || '') : '';
};

describe('a pick on the authored diet call that names the need settles the allergy ask', () => {
  for (const type of ['Crab Feast', 'Dinner Party']) {
    test(type, () => {
      const pb = getPlaybook(type);
      const d = (pb.decisions || []).find((x) => /^dietary(_|$)/.test(x.id));
      expect(d).toBeTruthy();
      const pick = d.options.find((o) => !/^\s*(nobody|no one|none)\b/i.test(o));
      const e = ev(type, { foodChoices: { [d.id]: pick } });
      expect(dietaryNoted(e)).toBe(true);
      expect(playbookFoodPlan(e).dietaryResolved).toBe(true);
      expect(foodCue(e)).not.toMatch(/food allergy/i);
    });
  }

  test('the authored default is not her answer', () => {
    expect(dietaryNoted(ev('Friendsgiving'))).toBe(false);
  });

  // Owner ruling 2 (oneAllergyStep.test.js): "One or two needs" says there ARE
  // needs without naming them, so who they are is still owed.
  test('"One or two needs" names no need, so the follow-up stays owed', () => {
    const e = ev('Friendsgiving', { foodChoices: { dietary_table: 'One or two needs — label dishes and plan a safe plate' } });
    expect(dietaryNoted(e)).toBe(false);
  });
});

describe('a diet from the invite reply closes the allergy ask', () => {
  test('diets / allergens arrays', () => {
    const e = ev('Birthday', { guests: [{ id: 'a', name: 'Pat', rsvp: 'Yes', diets: ['Vegetarian'] }, { id: 'b', name: 'Sam', rsvp: 'Yes', allergens: ['Nut allergy'] }] });
    expect(playbookFoodPlan(e).dietaryResolved).toBe(true);
  });
  test("the plus-one's needs", () => {
    const e = ev('Birthday', { guests: [{ id: 'a', name: 'Pat', rsvp: 'Yes', plusOne: 'Chris', plusOneNeeds: 'Vegetarian' }] });
    expect(playbookFoodPlan(e).dietaryResolved).toBe(true);
  });
  test('a declined row still does not count', () => {
    const e = ev('Birthday', { guests: [{ id: 'a', name: 'Pat', rsvp: 'No', diets: ['Vegetarian'] }] });
    expect(playbookFoodPlan(e).dietaryResolved).toBe(false);
  });
});
