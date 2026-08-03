// ─── GUEST COUNT FROM ORDINARY SPEECH ─────────────────────────────────────
//
// The counting noun used to be one of six words. "20 cousins flying in" matched
// none of them, so the count parsed as null and the plan sized to the reunion
// TYPICAL (~50) instead — a number the host never said standing in for one they
// did, which then sized food, budget and shopping. Driven from create.
//
// The list stays closed on purpose: `\d+ \w+` would read "20 minutes" and
// "2028 in Asheville" as headcounts. Every accepted noun is a word for people.
import { parseSmartEventText } from '../smartParseEvent';

const g = (t) => parseSmartEventText(t, { now: new Date('2026-08-02T12:00:00') }).guests;

describe('kinship and group words count', () => {
  test.each([
    ['Family reunion in Asheville, 20 cousins flying in', 20],
    ['Cookout for the block — 30 neighbors', 30],
    ['Retirement lunch, 18 coworkers', 18],
    ['Graduation dinner, 12 relatives', 12],
    ['Team dinner, 15 teammates', 15],
    ['Reunion with 40 family members', 40],
    ['Birthday party, 8 kids', 8],
    ['Office holiday party, 60 employees', 60],
    ['Baby shower, 25 friends', 25],
  ])('%s -> %i', (text, n) => {
    expect(g(text)).toBe(n);
  });
});

describe('a count with no noun at all', () => {
  test.each([
    ['Weekend trip to Asheville, 12 of us', 12],
    ['Dinner out, 6 of us', 6],
  ])('%s -> %i', (text, n) => {
    expect(g(text)).toBe(n);
  });
});

describe('numbers that are NOT people stay unread', () => {
  test('a year is not a headcount', () => {
    expect(g('Family reunion the weekend of June 12, 2028 in Asheville')).toBe(null);
  });

  test('a milestone age is not a headcount', () => {
    expect(g('80th birthday dinner')).toBe(null);
  });

  test('a duration is not a headcount', () => {
    expect(g('Reunion, 3 days in the mountains')).toBe(null);
  });

  test('a time is not a headcount', () => {
    expect(g('Cookout at 5 pm')).toBe(null);
  });
});

describe('the forms that already worked keep working', () => {
  test.each([
    ['Crab feast for 20, Aug 2', 20],
    ['Cookout for about 30', 30],
    ['Dinner for ~12', 12],
    ['Reunion with 50 people', 50],
    ['Party for 15 guests', 15],
  ])('%s -> %i', (text, n) => {
    expect(g(text)).toBe(n);
  });
});

describe('the whole sentence from the live drive', () => {
  test('count, span, destination and travel all read from one line', () => {
    const p = parseSmartEventText(
      'Family reunion the weekend of June 12, 2028 in Asheville, 20 cousins flying in, staying at a rental',
      { now: new Date('2026-08-02T12:00:00'), homeCity: 'Annapolis' },
    );
    expect(p.guests).toBe(20);            // was null -> silently became ~50
    expect(p.date).toBe('2028-06-12');    // was 2027 -> stated year ignored
    // 2028-06-12 is a MONDAY, so "weekend of" does not resolve to a span and
    // deliberately stays a single day rather than inventing one.
    expect(p.endDate).toBe(null);
    expect(p.isDestination).toBe(true);
    expect(p.travelMode).toBe('fly');
    expect(p.overnight).toBe(true);
  });
});
