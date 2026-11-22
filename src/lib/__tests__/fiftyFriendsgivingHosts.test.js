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

// Round 2 (11/16/2026): trips written with weekday names saved a one-day event.
describe('a stay written with weekday names keeps its last day', () => {
  test.each([
    ['Friendsgiving weekend at a cabin in the Shenandoah, Fri Nov 27 to Sun Nov 29, 12 friends staying over', '2026-11-27', '2026-11-29'],
    ['Friendsgiving Thursday Nov 26 through Sunday Nov 29 in Vermont, 10 of us renting a house', '2026-11-26', '2026-11-29'],
    ['Friendsgiving Sat Nov 21 and Sun Nov 22 at Joshua Tree, 8 friends camping', '2026-11-21', '2026-11-22'],
  ])('%s', (text, date, end) => {
    const r = p(text);
    expect(r.date).toBe(date);
    expect(r.endDate).toBe(end);
  });
  test('(control) "and" between two far-apart dates is two dates, not a span', () => {
    expect(p('Friendsgiving Nov 21 and Nov 28, pick one').endDate).toBe(null);
  });
  test('(control) "and" before a count is not a day', () => {
    expect(p('Friendsgiving Nov 21 and 25 guests').endDate).toBe(null);
  });
});

// Round 2 (11/16/2026): the "didn't make it into the plan" list showed the
// fragment "saturday at my". "at my backyard" WAS used; only "saturday" was not.
import { clausesNotUsed } from '../heardClauses';
// Since the owner ruling of 11/22/2026 ("Resolve to the next one with the date
// shown so she can fix it as well.") a bare "saturday" IS used — it is the next
// Saturday — so the trimming is pinned on a word that is still unread.
describe('an unused word is reported without the used words around it', () => {
  test('"karaoke", not "karaoke at my"', () => {
    const out = clausesNotUsed('friends giving dinner 10 people karaoke at my backyard');
    expect(out).toContain('karaoke');
    out.forEach((c) => expect(c).not.toMatch(/\b(?:at|my)\s*$/i));
  });
  test('"saturday" is the next Saturday now, and not reported', () => {
    expect(clausesNotUsed('friends giving dinner 10 people saturday at my backyard').join(' | ')).not.toMatch(/saturday/i);
  });
});
