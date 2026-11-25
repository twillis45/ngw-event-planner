// A DATE SAYS WHEN IT IS A HOLIDAY (owner, 11/25/2026: "we're not skipping
// holidays for reply-bys. In general, but it needs to be verified for each
// event, for each question, if it is a holiday.")
//
// The app proposed Friday, December 25 as the reply-by date for a January 4
// party and said nothing. Every date the app proposes or a host picks is checked
// against the same computed holidays the date parser uses, and the answer is
// named so the screen can say it. Nothing is moved: the host decides.
import { holidayOn } from '../holidayDates.mjs';
import { proposeReplyBy } from '../replyBy';

test('a holiday date names its holiday', () => {
  expect(holidayOn('2026-12-25')).toBe('Christmas');
  expect(holidayOn('2026-12-24')).toBe('Christmas Eve');
  expect(holidayOn('2026-11-26')).toBe('Thanksgiving');
  expect(holidayOn('2027-05-31')).toBe('Memorial Day');
  expect(holidayOn('2027-03-28')).toBe('Easter');
  expect(holidayOn('2027-01-01')).toBe("New Year's Day");
});

test('an ordinary date, or no date, names nothing', () => {
  expect(holidayOn('2027-01-04')).toBeNull();
  expect(holidayOn('2026-12-23')).toBeNull();
  expect(holidayOn('')).toBeNull();
  expect(holidayOn(null)).toBeNull();
  expect(holidayOn('next week')).toBeNull();
});

test('the reply-by proposal says when it lands on a holiday, and keeps the date', () => {
  // Jan 4, 2027 with nothing that needs a count: a week to lock + 3 days to chase = Dec 25.
  const p = proposeReplyBy({ date: '2027-01-04', type: 'Birthday' }, new Date('2026-11-25T12:00:00Z'));
  expect(p.iso).toBe('2026-12-25');
  expect(p.holiday).toBe('Christmas');
  const q = proposeReplyBy({ date: '2027-01-12', type: 'Birthday' }, new Date('2026-11-25T12:00:00Z'));
  expect(q.holiday).toBeNull();
});
