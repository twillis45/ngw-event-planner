// One catered course says its price is pending (batch 11, #233 Left: "a single
// catered course is still priced as groceries"). #233 stopped Dinner Party's
// "Drop-off catering for 1 course" from pricing a whole catered meal and
// dropping the six courses she still cooks. What is left is the course the
// caterer brings: no source prices one catered course, and the pick does not
// say which course it is, so the plan keeps that course at its grocery price.
// That stand-in is now said, the way every other unsourced pick is
// (costPending → "Price pending a source"), instead of shown as a real price.
// Which course, and so which grocery line to drop, is hers to say: an owner
// call, not ours to guess. The owner ruled 11/23/2026 (#239): a follow-up asks
// which course, and its answer takes that course off the list
// (aCateredCourseAsksWhichCourse.test.js). Before she answers, this holds.
import { playbookFoodPlan, foodApproach } from '../playbooks';

const ev = (foodChoices = {}) => ({
  id: 'ev-dp', type: 'Dinner Party', date: '2027-06-12', guestMode: 'count', guestCount: 10, guestCountLocked: true,
  guestEstimate: 10, budget: [], vendors: [], guests: [], foodChoices,
});

test('the one-course pick is reported as priced pending a source', () => {
  const e = ev({ help: 'Drop-off catering for 1 course' });
  expect(foodApproach(e).usesCaterer).toBe(false); // she still cooks the rest (#233)
  const pending = playbookFoodPlan(e).pricePending || [];
  expect(pending).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'help', pick: 'Drop-off catering for 1 course' })]));
  expect(pending.find((p) => p.id === 'help').why).toMatch(/one catered course/i);
});

test('no other help pick is reported pending', () => {
  for (const pick of ['Fully DIY', 'Hire a cleaner for after', 'Hire a bartender']) {
    expect((playbookFoodPlan(ev({ help: pick })).pricePending || []).filter((p) => p.id === 'help')).toEqual([]);
  }
});
