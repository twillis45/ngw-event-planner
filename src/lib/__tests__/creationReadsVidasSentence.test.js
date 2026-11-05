// The owner's real-world acceptance sentence (11/5/2026), driven through the
// live Creation box against a real backend, lost four things it plainly said.
// Each assertion below was RED on the parser as it stood (issue #100, D-1, D-2,
// D-3, D-6). The street address is a synthetic stand-in; the shape is exact.
import { parseSmartEventText, unusedClauses } from '../smartParseEvent';

const VIDA = 'Vida is hosting a girls’ game night this Saturday, November 7, at 12 Sample Rd in Pasadena, Maryland. Ten girlfriends are coming. We want fun, team-oriented games, food, drinks, and a relaxed atmosphere.';

describe('D-1: a count written in words is a count', () => {
  test.each([
    ['Ten girlfriends are coming', 10],
    ['twelve friends for dinner', 12],
    ['a dozen people over for cards', 12],
    ['twenty cousins flying in', 20],
    ['fifteen of us', 15],
    ['three besties and me', 3],
  ])('%s → %i', (s, n) => {
    expect(parseSmartEventText(s).guests).toBe(n);
  });

  test('the acceptance sentence plans for ten, as said', () => {
    expect(parseSmartEventText(VIDA).guests).toBe(10);
  });

  test('digits still win, and a duration is still not a headcount', () => {
    expect(parseSmartEventText('12 guests for 4 nights').guests).toBe(12);
    expect(parseSmartEventText('one longer headliner game').guests).toBe(null);
  });
});

describe('D-6: "night" in an event name is not an overnight stay', () => {
  test.each([
    'girls’ game night this Saturday',
    'trivia night at my place',
    'a movie night for 6',
    'date night',
  ])('%s → not overnight', (s) => {
    expect(parseSmartEventText(s).overnight).toBe(null);
  });

  test.each([
    '5 nights in Anaheim',
    'staying overnight at a cabin',
    'a kids’ sleepover for 6',
    'two nights at the lake',
  ])('%s → overnight', (s) => {
    expect(parseSmartEventText(s).overnight).toBe(true);
  });
});

describe('D-2: "<Name> is hosting" names the host', () => {
  test('the host is captured', () => {
    expect(parseSmartEventText(VIDA).hostName).toBe('Vida');
  });
  test('a host is not an honoree', () => {
    expect(parseSmartEventText(VIDA).honoree || '').toBe('');
  });
  test('ordinary sentences do not invent a host', () => {
    expect(parseSmartEventText('Game night at my house for 10').hostName || null).toBe(null);
    expect(parseSmartEventText('This is hosting season').hostName || null).toBe(null);
  });
});

describe('D-3: a date the plan applied is never reported as dropped', () => {
  test('"November 7" is not in the didn\'t-make-it list', () => {
    const dropped = unusedClauses(VIDA).map((c) => c.toLowerCase());
    expect(dropped.some((c) => c.includes('november'))).toBe(false);
  });
  test('genuinely unused clauses are still reported', () => {
    const dropped = unusedClauses(VIDA).join(' | ').toLowerCase();
    expect(dropped).toContain('team-oriented games');
  });
});

describe('a weekday is not an event type (clean-host run, 11/5/2026)', () => {
  test.each([
    'Book club at my place this Sunday, November 8, for 3 friends.',
    'book club on Monday',
    'knitting circle this Wednesday',
  ])('%s → not Day Party', (s) => {
    expect(parseSmartEventText(s).type).not.toBe('Day Party');
  });
  test('a day party is still a day party', () => {
    expect(parseSmartEventText('a day party Saturday').type).toBe('Day Party');
  });
});
