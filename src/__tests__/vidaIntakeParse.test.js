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

// Live-drive find 2026-07-27 (New Orleans seed): "at City Park, New Orleans, LA"
// left venue AND town empty — the 2-part gate ate "City Park, New Orleans" as
// city+state and the strict state gate (rightly) refused it. Three comma parts
// now mean venue verbatim + the same strict city/state gate on the tail.
describe('"at Venue, City, ST" three-part grammar', () => {
  test('venue, town, and state all heard', () => {
    const p = parseSmartEventText('Family reunion cookout July 29-31 at City Park, New Orleans, LA for 30 people');
    expect(p.venue).toBe('City Park');
    expect(p.venueKind).toBe('venue');
    expect(p.venueCity).toBe('New Orleans');
    expect(p.venueState).toBe('LA');
  });

  test('the 2-part "in City, State" form is unchanged', () => {
    const p = parseSmartEventText('Graduation party in Santa Fe, New Mexico for 40');
    expect(p.venueCity).toBe('Santa Fe');
    expect(p.venueState).toBe('NM');
    expect(p.venue).toBe('');
  });

  test('a comma list after "at" never invents a location', () => {
    const p = parseSmartEventText('Cookout at the park, food, and games for everyone');
    expect(p.venueCity).toBe(null);
    expect(p.venueState).toBe(null);
  });
});

// Host live report 2026-07-27 (second round): numeric ranges parsed the start
// and silently dropped the end — the exact defect the word-month range fixed.
describe('numeric date ranges', () => {
  test('"11/13-11/16" is a span', () => {
    const p = parseSmartEventText('Birthday 11/13-11/16 for 10');
    expect(p.date).toMatch(/-11-13$/);
    expect(p.endDate).toMatch(/-11-16$/);
  });

  test('full years ride both sides', () => {
    const p = parseSmartEventText('Birthday 11/13/2026 - 11/16/2026');
    expect(p.date).toBe('2026-11-13');
    expect(p.endDate).toBe('2026-11-16');
  });

  test('a backwards numeric "range" is noise, not a span', () => {
    const p = parseSmartEventText('Party 11/16-11/13');
    expect(p.endDate).toBe(null);
  });

  test('Dec–Jan numeric straddle lands next year', () => {
    const p = parseSmartEventText('Reunion 12/30-1/2');
    expect(p.date).toMatch(/-12-30$/);
    expect(p.endDate).toMatch(/-01-02$/);
    expect(Number(p.endDate.slice(0, 4))).toBe(Number(p.date.slice(0, 4)) + 1);
  });
});
