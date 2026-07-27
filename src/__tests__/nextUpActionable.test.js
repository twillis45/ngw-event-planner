// Next Up rows on the event overview must never be dead labels — every visible
// milestone routes through the shared earliest-keyword-wins router to the exact
// place it gets done (deep-link doctrine; user report 2026-07-07).

import { milestoneActionRoute } from '../CommandCenter';

const ev = {
  id: 'e1',
  vendors: [
    { id: 'v1', name: 'Smoke & Fire BBQ', status: 'Confirmed', depositAmt: 0 },
    { id: 'v2', name: 'Petal & Stem', status: 'Quoted' },
  ],
};

test('caterer-booking label routes to Vendors first-undone, not Guests (earliest keyword wins)', () => {
  const r = milestoneActionRoute('Book the Black-owned caterer or confirm the host-cooks plan and confirm the final guest count', ev, 't1');
  expect(r.tab).toBe('Vendors');
  expect(r.vendorId).toBe('v2');
});

test('guest-leading label routes to the guests entry field', () => {
  expect(milestoneActionRoute('Invite guests and chase RSVPs', ev, 't2'))
    .toEqual({ tab: 'Guests', focusField: 'guests-entry' });
});

test('budget label routes to the budget field', () => {
  expect(milestoneActionRoute('Set the budget for the party', ev, 't3'))
    .toEqual({ tab: 'Budget', focusField: 'hsp-budget' });
});

test('food/shopping label routes to the food plan anchor', () => {
  expect(milestoneActionRoute('Shop for drinks and supplies', ev, 't4'))
    .toEqual({ tab: 'Planning', focusField: 'food-plan' });
});

test('non-domain label falls back to the timeline anchored to the milestone — never a dead end', () => {
  expect(milestoneActionRoute('Charge phones and speakers', ev, 't5'))
    .toEqual({ tab: 'Timeline', taskId: 't5', timelineId: 't5' }); // taskId rides too — the executor reads it (drift fix 2026-07-27)
});

test('vendor route with no vendors lands on the add-vendor anchor', () => {
  expect(milestoneActionRoute('Book the DJ', { vendors: [] }, 't6'))
    .toEqual({ tab: 'Vendors', focusField: 'vendor-add' });
});
