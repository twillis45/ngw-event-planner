// ─── WHAT 50 FRIENDSGIVING HOSTS TYPED (owner run, 11/16/2026) ──────────────
//
// Fifty synthetic hosts typed their own Friendsgiving into the creation screen
// (clock: Sunday 11/15/2026). Three sentence shapes went wrong, each a WRONG
// answer rather than a missing one:
//   · "the day after Thanksgiving" and "the Saturday before Thanksgiving" both
//     saved Thanksgiving itself (11/26);
//   · "Marcus's Friendsgiving" made Marcus the person being celebrated; a
//     Friendsgiving celebrates nobody, and the possessive names the HOST;
//   · "a friend's loft" made "Friend" the honoree; a loft is a place.
import { parseSmartEventText } from '../smartParseEvent';

const NOW = new Date('2026-11-15T12:00:00');
const p = (t) => parseSmartEventText(t, { now: NOW });

describe('a day named against a holiday is that day, not the holiday', () => {
  test.each([
    ['Friendsgiving the day after Thanksgiving at my place for 25', '2026-11-27'],
    ['A Friendsgiving dinner for 20 the Saturday before Thanksgiving', '2026-11-21'],
    ['Friendsgiving the Sunday after Thanksgiving', '2026-11-29'],
    ['Friendsgiving the day before Thanksgiving', '2026-11-25'],
  ])('%s → %s', (text, date) => {
    expect(p(text).date).toBe(date);
  });
  test('(control) Thanksgiving alone is still Thanksgiving', () => {
    expect(p('Thanksgiving dinner for 12').date).toBe('2026-11-26');
  });
});

describe("a name before 'Friendsgiving' is the host, not an honoree", () => {
  test.each(['Marcus', 'Aisha', 'Sam'])('%s’s Friendsgiving', (n) => {
    const r = p(`${n}'s Friendsgiving potluck, Saturday Nov 21, about 8 friends`);
    expect(r.honoree).toBe(null);
    expect(r.hostName).toBe(n);
    expect(r.type).toBe('Friendsgiving');
  });
  test('(control) a birthday possessive still names the honoree', () => {
    expect(p("Marcus's 40th birthday for 30").honoree).toBe('Marcus');
  });
});

describe("a friend's loft is a place", () => {
  test.each([
    "friendsgiving next sunday 15 ppl a friend's loft",
    "Friendsgiving at my cousin's townhouse for 10",
    "Friendsgiving in Sam's dorm room for 8",
  ])('%s', (text) => {
    expect(p(text).honoree).toBe(null);
  });
});
