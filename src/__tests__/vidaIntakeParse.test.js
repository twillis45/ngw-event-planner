// Host report 2026-07-27 (prod, tablet): "not enough of the app is recognizing
// all of the words" for a real multi-day destination birthday input. This
// pins the FULL sentence — every fact the host typed must be heard.
const { parseSmartEventText } = require('../lib/smartParseEvent');

const VIDA = 'Birthday celebration for Vida November 13-16 . Rent Airbnb or vrbo house in deep creek lake, Maryland. This will be for 10 people. Want spend up to $200 a person for the rental house. No kids.';

describe('Vida destination-birthday intake (host report 2026-07-27)', () => {
  const p = parseSmartEventText(VIDA);

  test('type + honoree — "for Vida" names the honoree without a possessive', () => {
    expect(p.type).toBe('Birthday');
    expect(p.honoree).toBe('Vida');
  });

  test('date range — November 13-16 parses as a multi-day span', () => {
    expect(p.date).toMatch(/-11-13$/);
    expect(p.endDate).toMatch(/-11-16$/);
  });

  test('guests + per-person budget — "$200 a person" for 10 means $2,000, not $200', () => {
    expect(p.guests).toBe(10);
    expect(p.budget).toBe(2000);
  });

  test('rented roof is a venue, not home — Airbnb/VRBO sets venueKind', () => {
    // '' falls back to at-home in doItForMe; a destination rental must not.
    expect(p.venueKind).toBe('venue');
    expect(p.isDestination).toBe(true);
    expect(p.vacationArea).toBe('deep-creek');
    expect(p.venueCity).toBe('McHenry');
    expect(p.venueState).toBe('MD');
  });

  test('"No kids." carries the invite policy the invite already consumes', () => {
    expect(p.kidsPolicy).toBe('adults_only');
  });

  test('honoree guards — months/pronouns after "for" never invent one', () => {
    expect(parseSmartEventText('Party for November 10').honoree).toBe(null);
    expect(parseSmartEventText('Dinner for My friends').honoree).toBe(null);
    expect(parseSmartEventText('Retirement dinner for Mom').honoree).toBe('Mom');
  });

  test('per-person guard — plain totals stay untouched', () => {
    const q = parseSmartEventText('Birthday for 20 people, budget $500');
    expect(q.budget).toBe(500);
  });
});
