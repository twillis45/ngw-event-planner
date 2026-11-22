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
import { clausesNotUsed } from '../heardClauses';

const NOW = new Date(2026, 10, 22, 12, 0, 0);
const p = (text) => parseSmartEventText(text, { now: NOW });

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

test('the clock is Sunday, November 22, 2026, wherever this runs', () => {
  expect([NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getDay()]).toEqual([2026, 10, 22, 0]);
});

describe('4 · every clause is used or reported', () => {
  const dropped = (text) => clausesNotUsed(text).join(' | ').toLowerCase();

  test('BYOB the playbook cannot hold is reported (New Year\'s Eve, Crab Feast)', () => {
    expect(dropped("New Year's Eve party at my place, about 30 people, BYOB")).toMatch(/byob/);
    expect(dropped('Labor Day crab feast in Annapolis, about 40, BYOB')).toMatch(/byob/);
  });
  test('BYOB a playbook holds as its drinks answer is used, not reported (Watch Party)', () => {
    expect(dropped('Super Bowl watch party at my apartment Feb 7, 12 people, BYOB')).not.toMatch(/byob/);
  });
  // A bare weekday and "this/next weekend" are no longer reported: the owner
  // ruled on 11/22/2026 "Resolve to the next one with the date shown so she
  // can fix it as well." (creationAWeekdayIsTheNextOne.test.js). One the plan
  // cannot apply — a weekday inside a month she named — still is.
  test('a weekday the plan could not apply is still reported', () => {
    expect(dropped('wedding on a Saturday next September, 120 guests')).toMatch(/saturday/);
  });
  test('a weekday the plan used is not reported', () => {
    expect(dropped('dinner party for 8 next Friday at 7pm, adults only')).not.toMatch(/friday/);
  });
  test('"next September" and "sometime in February" are a month to pick a day from', () => {
    expect(p('wedding in Napa next September, 120 guests, budget around $40k').monthYear)
      .toEqual({ year: 2027, month: 8, label: 'Sep 2027' });
    const r = p('Engagement party at my parents house, about 50 guests, sometime in February');
    expect(r.monthYear).toEqual({ year: 2027, month: 1, label: 'Feb 2027' });
    expect(r.date).toBeNull();
    expect(dropped('Engagement party at my parents house, about 50 guests, sometime in February')).not.toMatch(/february/);
    expect(dropped('wedding in Napa next September, 120 guests, budget around $40k')).not.toMatch(/september/);
  });
  test('"may" the verb is never a month', () => {
    expect(p('we may have 30 people for a cookout').monthYear).toBeNull();
  });
  test('a place inside a used phrase is stored or reported', () => {
    const church = p('fish fry fundraiser at the church april 25, about 200 people');
    expect([church.venue, church.venueKind]).toEqual(['The church', 'venue']);
    const hall = p('Repast for my grandmother after the funeral Saturday at the church fellowship hall, about 100 people');
    expect([hall.venue, hall.venueKind]).toEqual(['The church fellowship hall', 'venue']);
    const moms = p("Thanksgiving weekend at my mom's in Charlotte Nov 26-29, 12 of us, two vegans");
    expect([moms.venue, moms.venueKind]).toEqual(["My mom's", 'home']);
    expect(dropped("Mom's 80th at a restaurant in Atlanta, maybe 30-35 people, she uses a walker")).toMatch(/at a restaurant/);
  });
});
