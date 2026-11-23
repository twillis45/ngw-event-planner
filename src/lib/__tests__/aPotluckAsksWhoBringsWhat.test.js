// A potluck asks who brings what (batch 11; audit 2 lane C P2-4: "the potluck
// never asks who brings what"). Dana's 40th picked Potluck; the plan moved the
// mains, chips, veggie tray and salad to "Your guests" at $0, and from 300 days
// out to the day nothing asked her to find out who is bringing which. One rule
// for every playbook whose dishes guests bring (friendsBringWhen): while a
// dish guests bring has no name on it, the checklist carries the step; once
// every one is named, it is gone. A playbook that authors its own step (The
// Cookout, Friendsgiving) keeps its own.
import { playbookChecklist } from '../playbooks';

const AS_OF = new Date('2026-11-22T12:00:00');
const bday = (extra = {}) => ({
  id: 'aud-bday', type: 'Birthday', honoree: 'Dana', date: '2027-06-12', startTime: '15:00', startTimeSource: 'host',
  guestMode: 'count', guestCount: 30, totalBudget: 600, budget: [], vendors: [], guests: [], ...extra,
});
const asks = (ev) => (playbookChecklist(ev, AS_OF) || []).filter((r) => /who is bringing which dish/i.test(String(r.task || '')));

test('a potluck birthday is asked who brings which dish', () => {
  const rows = asks(bday({ foodChoices: { food_style: 'Potluck' } }));
  expect(rows.length).toBe(1);
  expect(rows[0].leadDays).toBe(-14);
});
test('no step when she is not running a potluck', () => {
  expect(asks(bday({ foodChoices: { food_style: 'Cook/grill yourself' } }))).toEqual([]);
  expect(asks(bday())).toEqual([]);
});
test('once every guest dish has a name, the step is gone', () => {
  const foodOwner = { p_mains: 'Aunt Rae', p_chips: 'Jo', p_veggietray: 'Sam', p_salad: 'Lee' };
  expect(asks(bday({ foodChoices: { food_style: 'Potluck' }, foodOwner }))).toEqual([]);
});
test('a playbook that authors its own who-brings-what step is not doubled (The Cookout)', () => {
  const cook = { id: 'co', type: 'The Cookout', date: '2027-07-04', guestMode: 'count', guestCount: 40, budget: [], vendors: [], guests: [] };
  expect(asks(cook)).toEqual([]);
});
