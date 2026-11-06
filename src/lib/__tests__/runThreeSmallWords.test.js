// Run 3 break run (11/6/2026), the P3s that live in words.
import { deriveVendorAccountability } from '../vendorAccountability/derive';
import { answerPlanQuestion } from '../askPlan';
import { parseSmartEventText } from '../smartParseEvent';
import { localISO } from '../dates';

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return localISO(d); };

test('R3-1: a promise due today says "due today", not "due in 0 day(s)"', () => {
  const ev = { id: 'e', date: day(5) };
  const ps = [{ promiseText: 'Final guest count', dueDate: day(0), status: 'promised' }, { promiseText: 'Menu', dueDate: day(1), status: 'promised' }, { promiseText: 'Deposit', dueDate: day(3), status: 'promised' }];
  const txt = deriveVendorAccountability({ id: 'v', category: 'Catering' }, ev, ps).reasons.join(' | ');
  expect(txt).toMatch(/Final guest count due today\./);
  expect(txt).toMatch(/Menu due tomorrow\./);
  expect(txt).toMatch(/Deposit due in 3 days\./);
  expect(txt).not.toMatch(/day\(s\)/);
});

test('R3-2: one word for one figure', () => {
  const r = answerPlanQuestion('will $500 cover it?', { money: { expected: 285, committed: 255 } });
  expect(r.answer).toMatch(/covers what your plan comes to so far/);
});

test.each([
  ['retirement party for my boss carl, 35 people', 'Carl'],
  ['birthday dinner for my friend Dana, 8 people', 'Dana'],
  ['retirement party for my coach', 'Coach'],
])('R3-9: %s → honoree %s', (s, who) => {
  expect(parseSmartEventText(s).honoree).toBe(who);
});
