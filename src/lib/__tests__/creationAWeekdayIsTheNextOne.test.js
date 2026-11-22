// ─── A BARE WEEKDAY IS THE NEXT ONE (owner ruling, 11/22/2026) ───────────────
//
// Verbatim: "Resolve to the next one with the date shown so she can fix it as
// well." It replaces the earlier bare-weekday ruling (a weekday alone set no
// date — aWeekdaySpanNeedsAStart.test.js) for a sentence with no other date:
//
//   · a bare weekday ("Saturday", "friday night", "the funeral Saturday") is
//     its next occurrence AFTER today; said on that weekday, it is next week's;
//   · "this weekend" is the coming Saturday — today when today is Saturday,
//     the following Saturday when today is Sunday;
//   · "next weekend" is the Saturday after "this weekend";
//   · a Saturday or Sunday said with a weekend is that day of that weekend.
//
// The parser marks the day `dateBasis: 'resolved-weekday'` so the preview chip
// shows the weekday with the date ("Sat, Nov 28") and she can change it with
// the date control like any typed date.
//
// Two clocks, local noon so the day holds in Kiritimati (UTC+14) and Midway
// (UTC-11): Sunday 11/22/2026 and Wednesday 11/25/2026 (and a Saturday for the
// "this weekend is today" case).
import { parseSmartEventText } from '../smartParseEvent';
import { clausesNotUsed } from '../heardClauses';

const SUN = new Date(2026, 10, 22, 12, 0, 0);
const WED = new Date(2026, 10, 25, 12, 0, 0);
const SAT = new Date(2026, 10, 28, 12, 0, 0);
const at = (now) => (text) => parseSmartEventText(text, { now });

afterEach(() => { jest.useRealTimers(); });

test('the clocks are the days they claim, wherever this runs', () => {
  expect([SUN.getDate(), SUN.getDay()]).toEqual([22, 0]);
  expect([WED.getDate(), WED.getDay()]).toEqual([25, 3]);
  expect([SAT.getDate(), SAT.getDay()]).toEqual([28, 6]);
});

describe.each([['Sunday 11/22', SUN], ['Wednesday 11/25', WED]])('on %s', (_label, now) => {
  const p = at(now);
  test('a bare weekday is the next one, and says it was resolved', () => {
    const r = p('Repast for my grandmother after the funeral Saturday at the church fellowship hall, about 100 people');
    expect([r.date, r.dateBasis]).toEqual(['2026-11-28', 'resolved-weekday']);
    expect(p('kids birthday party at chuck e cheese saturday, 20 kids').date).toBe('2026-11-28');
  });
  test('the time she said stays with it', () => {
    const night = p('Card party at my house friday night, 3 tables of 4');
    expect([night.date, night.timeOfDay]).toEqual(['2026-11-27', 'night']);
    const seven = p('dinner party friday at 7pm for 8');
    expect([seven.date, seven.startTime]).toEqual(['2026-11-27', '7:00 PM']);
  });
  test('"this weekend" is the coming Saturday; "next weekend" the one after', () => {
    expect(p('game night this weekend for 8').date).toBe('2026-11-28');
    expect(p('game night for 8 friends next weekend, potluck').date).toBe('2026-12-05');
  });
  test('a Sunday said with "this weekend" is that weekend\'s Sunday', () => {
    expect(p('Sunday dinner this weekend for 10, two vegetarians').date).toBe('2026-11-29');
  });
  test('a weekday span starts at the next Friday and keeps its end', () => {
    const r = p('reunion Friday to Sunday, 30 people');
    expect([r.date, r.endDate]).toEqual(['2026-11-27', '2026-11-29']);
  });
  test('a date she typed beats the weekday, and is not marked resolved', () => {
    const r = p('Housewarming party saturday dec 5 at our new place, 30 people');
    expect([r.date, r.dateBasis]).toEqual(['2026-12-05', null]);
    expect(p('dinner next Friday for 8').dateBasis).toBeNull();
  });
  test('a weekday inside a month she named sets no day ("a Saturday next September")', () => {
    const r = p('wedding on a Saturday next September, 120 guests');
    expect(r.date).toBeNull();
    expect(r.monthYear).toEqual({ year: 2027, month: 8, label: 'Sep 2027' });
  });
  test('the resolved weekday is used, not reported as dropped', () => {
    jest.useFakeTimers(); jest.setSystemTime(now);
    expect(clausesNotUsed('Card party at my house friday night, 3 tables of 4').join(' | ')).not.toMatch(/friday/i);
    expect(clausesNotUsed('game night for 8 friends next weekend, potluck').join(' | ')).not.toMatch(/weekend/i);
  });
});

test('said on Sunday, "Sunday" is next week\'s Sunday, not today', () => {
  expect(at(SUN)('brunch Sunday for 10').date).toBe('2026-11-29');
});
test('said on Wednesday, "Wednesday" is next week\'s Wednesday, not today', () => {
  expect(at(WED)('game night Wednesday for 8').date).toBe('2026-12-02');
});
test('said on Saturday, "this weekend" is today and "next weekend" a week out', () => {
  expect(at(SAT)('game night this weekend for 8').date).toBe('2026-11-28');
  expect(at(SAT)('game night next weekend for 8').date).toBe('2026-12-05');
});
