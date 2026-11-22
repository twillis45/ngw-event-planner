// ─── WHAT THE CREATION BOX HEARS (audit lane B, 11/22/2026) ──────────────────
//
// Forty-two sentences typed into "Start my event" with the clock fixed at
// Sunday 11/22/2026, noon. Five creation*.test.js files pin the findings,
// one each, every one watched failing before its fix:
//
//   1. A common word is not a month: "maybe 30-35" was May 30 – Jun 4,
//      "married 25 years" was Mar 25, "my junior 17 friends" was Jun 17.
//   2. The occasion she named is the playbook: a celebration of life, a
//      Kwanzaa gathering and a Juneteenth celebration were all Birthdays; a
//      Memorial Day camping trip was a Day Party; a brunch was a cookout; a
//      church fish fry fundraiser was a ballroom gala.
//   3. "after the funeral" does not name the repast's honoree "After".
//   4. Every clause is used or reported: BYOB the playbook cannot hold, a bare
//      weekday, "this/next weekend", places inside a used phrase. "next
//      September" and "sometime in February" are a month to pick from.
//   5. "no kids" is the Halloween audience; "DJ already booked" is booked.
//
// The clock: `now` is passed to the parser, and Date is frozen for the
// clause reader (which takes no clock). Local noon, so the day is Sunday
// 11/22 in every timezone, Kiritimati (UTC+14) and Midway (UTC-11) included.
import { parseSmartEventText } from '../smartParseEvent';

const NOW = new Date(2026, 10, 22, 12, 0, 0);
const p = (text) => parseSmartEventText(text, { now: NOW });

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

test('the clock is Sunday, November 22, 2026, wherever this runs', () => {
  expect([NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getDay()]).toEqual([2026, 10, 22, 0]);
});

describe('1 · a common word is not a month', () => {
  test('"maybe 30-35" is a headcount, not May 30 – Jun 4', () => {
    const r = p("Mom's 80th at a restaurant in Atlanta, maybe 30-35 people, she uses a walker");
    expect(r.date).toBeNull();
    expect(r.endDate).toBeNull();
    expect(r.overnight).toBeNull();
    expect(r.guests).toBe(35);
  });
  test('"married 25 years" and "my junior 17 friends" set no date', () => {
    expect(p('anniversary dinner, married 25 years, 20 people').date).toBeNull();
    expect(p('birthday party for my junior, 17 friends').date).toBeNull();
    expect(p('party for my junior 17 friends').date).toBeNull();
    expect(p('decent party for 12 friends').date).toBeNull();
  });
  test('real month words still read, short and long', () => {
    expect(p('party May 30, 30 people').date).toBe('2027-05-30');
    expect(p('party Mar 25 for 10').date).toBe('2027-03-25');
    expect(p('party march 25 for 10').date).toBe('2027-03-25');
    expect(p('party Sept. 12 for 10').date).toBe('2027-09-12');
    expect(p('party June 17 for 10').date).toBe('2027-06-17');
    expect([p('reunion June 12-14').date, p('reunion June 12-14').endDate]).toEqual(['2027-06-12', '2027-06-14']);
  });
  test('a range never rolls a day that does not exist into the next month', () => {
    const r = p('reunion June 28-34, 40 people');
    expect(r.endDate).toBeNull();
  });
});
