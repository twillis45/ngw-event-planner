// One catered course asks which course (owner ruling, 11/23/2026, #239 item 3).
//
// Batch 11 labeled Dinner Party's "Drop-off catering for 1 course" as "Price
// pending a source": no source prices one catered course, and the pick does not
// say which course it is, so that course stayed on the shopping list at its
// grocery price. The owner's ruling: ask one short follow-up, which course, from
// the playbook's own courses. Then:
//   - that course's grocery lines leave the Spread and the shopping (the
//     caterer brings them);
//   - no registered source prices one catered course per guest, so the course
//     stays "Price pending a source", now with a reason that names the course
//     instead of asking which one it is.
// The follow-up is engine-injected the way the cash-bar follow-up is
// (cashBarCover), for every playbook with a one-course catering pick.
import {
  ALL_PLAYBOOKS, getPlaybook, playbookFoodPlan, injectedDecisionsFor, choicePickFor, choiceShown,
} from '../playbooks';
import { CATERED_COURSE_ID, ONE_COURSE_RE } from '../playbooks/cateredCourse';
import { hostSpending } from '../hostSpending';

const ONE = 'Drop-off catering for 1 course';
const ev = (foodChoices = {}) => ({
  id: 'ev-dp', type: 'Dinner Party', date: '2027-06-12', guestMode: 'count', guestCount: 10, guestCountLocked: true,
  guestEstimate: 10, budget: [], vendors: [], guests: [], foodChoices,
});
const ids = (e) => playbookFoodPlan(e).list.map((l) => l.id);
const pendingFor = (e) => (playbookFoodPlan(e).pricePending || []).find((p) => p.id === 'help');
const followUp = (e) => injectedDecisionsFor(e, getPlaybook(e.type)).find((d) => d.id === CATERED_COURSE_ID);

test('after the one-course pick, one follow-up asks which course, from her playbook’s courses', () => {
  const e = ev({ help: ONE });
  const d = followUp(e);
  expect(d).toBeTruthy();
  expect(d.options).toEqual(['The appetizer', 'The main', 'The sides', 'Dessert']);
  expect(d.default == null).toBe(true);            // hers to say, not ours to guess
  expect(choicePickFor(e, CATERED_COURSE_ID)).toBeNull();
  expect(choiceShown(e, d.whenChoice)).toBe(true);
  expect(choiceShown(ev({ help: 'Fully DIY' }), d.whenChoice)).toBe(false);
});

test('before she answers, every course stays and the pending reason asks which course', () => {
  const e = ev({ help: ONE });
  expect(ids(e)).toEqual(expect.arrayContaining(['p_appetizer', 'p_protein', 'p_starch', 'p_veg', 'p_dessert']));
  expect(pendingFor(e).why).toBe(getPlaybook('Dinner Party').decisions.find((x) => x.id === 'help').costPending);
});

test.each([
  ['The main', ['p_protein']],
  ['The sides', ['p_starch', 'p_veg']],
  ['Dessert', ['p_dessert']],
  ['The appetizer', ['p_appetizer']],
])('%s: its grocery lines leave the Spread; the rest stay', (course, gone) => {
  const e = ev({ help: ONE, [CATERED_COURSE_ID]: course });
  const list = ids(e);
  for (const id of gone) expect(list).not.toContain(id);
  for (const id of ['p_appetizer', 'p_protein', 'p_starch', 'p_veg', 'p_dessert'].filter((x) => !gone.includes(x))) expect(list).toContain(id);
});

test('answered, the course stays pending, with a reason that names it', () => {
  const e = ev({ help: ONE, [CATERED_COURSE_ID]: 'The main' });
  const p = pendingFor(e);
  expect(p).toBeTruthy();
  expect(p.why).toMatch(/the main/i);
  expect(p.why).toMatch(/no registered source prices one catered course/i);
  expect(p.why).not.toMatch(/which course/i);
  expect(hostSpending(e).priceSources.text).toContain(p.why);
});

test('a course answer left over from an earlier pick changes nothing', () => {
  const e = ev({ help: 'Fully DIY', [CATERED_COURSE_ID]: 'The main' });
  expect(ids(e)).toContain('p_protein');
  expect((playbookFoodPlan(e).pricePending || []).filter((p) => p.id === 'help')).toEqual([]);
});

test('every playbook with a one-course catering pick names its courses, from its own lines', () => {
  const withOne = ALL_PLAYBOOKS.filter((pb) => (pb.decisions || []).some((d) => (d.options || []).some((o) => ONE_COURSE_RE.test(String(o)))));
  expect(withOne.map((pb) => pb.type)).toEqual(['Dinner Party']);
  for (const pb of withOne) {
    const lines = new Set((pb.purchases || []).map((p) => p.id));
    expect(Array.isArray(pb.courses) && pb.courses.length > 1).toBe(true);
    for (const [label, courseLines] of pb.courses) {
      expect(typeof label).toBe('string');
      for (const id of courseLines) expect(`${pb.type}:${id}:${lines.has(id)}`).toBe(`${pb.type}:${id}:true`);
    }
  }
});
