// ─── "FOR 4 NIGHTS" IS NOT FOUR GUESTS ────────────────────────────────────
//
// The guest-count reader opened with a bare `for N`, which matched the
// duration a host wrote and then beat the real headcount elsewhere in the
// sentence — `.match` takes the first ALTERNATIVE that fires, not the best
// one. Measured 2026-09-28 across ten phrasings: nine wrong, in both orders.
// Only "for 12 guests for 4 nights" survived, and only because `for 12`
// appears first in the string.
//
// It matters more than its size: guest count sizes the food plan, the budget
// estimate, capacity and lodging. A host who says "for 4 nights" was getting
// a plan for four people.
import { parseSmartEventText } from '../smartParseEvent';

const g = (s) => (parseSmartEventText(s) || {}).guests;
const n = (s) => (parseSmartEventText(s) || {}).nights;

describe('a duration is never a headcount', () => {
  test('every phrasing keeps the twelve, whichever side the nights sit on', () => {
    for (const head of ['with 12 of us', 'with 12 guests', 'for 12 guests', '12 people', '12 of us']) {
      expect(g(`Birthday ${head} for 4 nights`)).toBe(12);
      expect(g(`Birthday for 4 nights ${head}`)).toBe(12);
    }
  });

  test('and the nights are still read', () => {
    expect(n('Birthday with 12 guests for 4 nights')).toBe(4);
    expect(n('Birthday for 4 nights with 12 guests')).toBe(4);
  });

  test('a duration ALONE yields no headcount rather than a wrong one', () => {
    // The honest answer to "for 4 nights" is that nobody said how many
    // people. Null lets the playbook typical apply; 4 is a fabricated count.
    // null, not undefined: this parser states "nobody said" explicitly.
    expect(g('Birthday for 4 nights')).toBeNull();
    expect(g('Reunion for 3 days')).toBeNull();
    expect(g('Party for 2 weeks')).toBeNull();
  });

  test('the phrasings that always worked still work', () => {
    expect(g('Birthday for 12 guests')).toBe(12);
    expect(g('Reunion 3 nights 25 people')).toBe(25);
    expect(g('Birthday about 30')).toBe(30);
    expect(g('Cookout ~40')).toBe(40);
    expect(g('Reunion 20ish')).toBe(20);
    // The owner's Disneyland seed — 8 couples is sixteen people.
    expect(g('50th birthday nov 2027 8 couples 5 nights Disneyland')).toBe(16);
  });

  test('a clock time is not a headcount either', () => {
    expect(g('Dinner for 6 pm')).toBeNull();
  });
});
