// smartParseEvent — the "What are we planning?" free-text parser (V2's
// "Say it like you'd text a friend" input), extracted from HostShellV2.jsx
// into a real, unit-tested lib function. `now` is always passed explicitly so
// every date-relative test is deterministic, not dependent on the clock.
import { parseSmartEventText, HOST_TYPES } from '../smartParseEvent';

const NOW = new Date(2026, 0, 15, 9, 0, 0); // Jan 15 2026 — a fixed reference "today"

describe('type resolution', () => {
  test('a plain occasion word resolves to its playbook type', () => {
    expect(parseSmartEventText('crab feast for 20 in the backyard', { now: NOW }).type).toBe('Crab Feast');
  });
  test('"destination X" resolves to X, not Wellness Retreat (DESTINATION-1)', () => {
    expect(parseSmartEventText('destination 80th birthday celebration', { now: NOW }).type).toBe('Birthday');
    expect(parseSmartEventText('a destination anniversary trip', { now: NOW }).type).toBe('Anniversary');
  });
  test('a genuine destination trip/getaway does not get swallowed by another type either', () => {
    // 'Wellness Retreat' has no playbook of its own (confirmed separately), so
    // HOST_TYPES filtering means it can never surface as `type` regardless of
    // this regex — the real assertion here is that it stays null rather than
    // being misassigned to some unrelated type.
    expect(parseSmartEventText('a destination getaway with friends', { now: NOW }).type).toBeNull();
  });
  test('HOST_TYPES excludes business-only types', () => {
    expect(HOST_TYPES).not.toContain('Board Meeting');
    expect(HOST_TYPES).not.toContain('Conference');
    expect(HOST_TYPES).toContain('Birthday');
  });
});

describe('guests', () => {
  test('"for N" / "about N" / "~N" all capture the count', () => {
    expect(parseSmartEventText('crab feast for 20', { now: NOW }).guests).toBe(20);
    expect(parseSmartEventText('birthday about 45 people', { now: NOW }).guests).toBe(45);
    expect(parseSmartEventText('~30 for the cookout', { now: NOW }).guests).toBe(30);
  });
  test('no guest count in the text → null (never guessed here)', () => {
    expect(parseSmartEventText('destination 80th birthday celebration', { now: NOW }).guests).toBeNull();
  });
});

describe('budget', () => {
  test('a dollar amount is captured', () => {
    expect(parseSmartEventText('birthday party, $3000 budget', { now: NOW }).budget).toBe(3000);
  });
  test('a comma-formatted amount is captured', () => {
    expect(parseSmartEventText('$3,500 for the wedding', { now: NOW }).budget).toBe(3500);
  });
  test('a "k" suffix multiplies by 1000', () => {
    expect(parseSmartEventText('$5k budget', { now: NOW }).budget).toBe(5000);
  });
  test('"budget of $X" phrasing works without a leading $ requirement', () => {
    expect(parseSmartEventText('budget of 2500 for the shower', { now: NOW }).budget).toBe(2500);
  });
  test('no budget mentioned → null', () => {
    expect(parseSmartEventText('crab feast for 20 in the backyard', { now: NOW }).budget).toBeNull();
  });
});

describe('date — precise forms (unchanged behavior)', () => {
  test('"in N days/weeks/months" resolves relative to now', () => {
    expect(parseSmartEventText('a party in 10 days', { now: NOW }).date).toBe('2026-01-25');
    expect(parseSmartEventText('a party in 2 weeks', { now: NOW }).date).toBe('2026-01-29');
    expect(parseSmartEventText('a party in 1 month', { now: NOW }).date).toBe('2026-02-15');
  });
  test('"tomorrow"', () => {
    expect(parseSmartEventText('crab feast tomorrow', { now: NOW }).date).toBe('2026-01-16');
  });
  test('"next/this <weekday>"', () => {
    // NOW is Thursday Jan 15 2026 — the very next Saturday is 2 days out.
    expect(parseSmartEventText('party next saturday', { now: NOW }).date).toBe('2026-01-17');
  });
  test('month + day, rolls to next year if already past', () => {
    expect(parseSmartEventText('birthday on aug 2', { now: NOW }).date).toBe('2026-08-02');
    expect(parseSmartEventText('birthday on jan 2', { now: NOW }).date).toBe('2027-01-02'); // Jan 2 already past NOW=Jan 15
  });
  test('slash date M/D or M/D/Y', () => {
    expect(parseSmartEventText('party on 8/2', { now: NOW }).date).toBe('2026-08-02');
    expect(parseSmartEventText('party on 8/2/2027', { now: NOW }).date).toBe('2027-08-02');
  });
});

describe('date — month+year only, never invents a day (RECOMMEND-2)', () => {
  test('"June of 2028" and "June 2028" both surface a monthYear, date stays null', () => {
    const a = parseSmartEventText('birthday in June of 2028', { now: NOW });
    expect(a.date).toBeNull();
    expect(a.monthYear).toEqual({ year: 2028, month: 5, label: 'Jun 2028' });
    const b = parseSmartEventText('birthday in June 2028', { now: NOW });
    expect(b.monthYear).toEqual({ year: 2028, month: 5, label: 'Jun 2028' });
  });
  test('a precise date always wins over a month+year phrase elsewhere in the same text', () => {
    const p = parseSmartEventText('birthday tomorrow, sometime around June 2028 too', { now: NOW });
    expect(p.date).toBe('2026-01-16');
    expect(p.monthYear).toBeNull();
  });
});

describe('date — bare "next month" / "this month"', () => {
  test('"next month" resolves to the following month, no day invented', () => {
    expect(parseSmartEventText('birthday next month', { now: NOW }).monthYear).toEqual({ year: 2026, month: 1, label: 'Feb 2026' });
  });
  test('"next month" wraps the year at December', () => {
    const dec = new Date(2026, 11, 5);
    expect(parseSmartEventText('party next month', { now: dec }).monthYear).toEqual({ year: 2027, month: 0, label: 'Jan 2027' });
  });
  test('"this month" resolves to the current month', () => {
    expect(parseSmartEventText('birthday this month', { now: NOW }).monthYear).toEqual({ year: 2026, month: 0, label: 'Jan 2026' });
  });
});

describe('date — seasons', () => {
  test('"next summer" resolves to next year\'s summer anchor month', () => {
    expect(parseSmartEventText('a wedding next summer', { now: NOW }).monthYear).toEqual({ year: 2027, month: 6, label: 'Summer 2027' });
  });
  test('"this fall" resolves to the current year\'s fall anchor month', () => {
    expect(parseSmartEventText('a reunion this fall', { now: NOW }).monthYear).toEqual({ year: 2026, month: 9, label: 'Fall 2026' });
  });
  test('"autumn" is normalized to the "Fall" label', () => {
    expect(parseSmartEventText('a party this autumn', { now: NOW }).monthYear.label).toBe('Fall 2026');
  });
});

describe('honoree + venue (unchanged)', () => {
  test('possessive name capture', () => {
    expect(parseSmartEventText('Todd’s birthday for 20', { now: NOW }).honoree).toBe('Todd');
  });
  test('backyard venue phrase kept verbatim', () => {
    const p = parseSmartEventText('crab feast in my brother’s backyard', { now: NOW });
    expect(p.venue).toMatch(/brother.s backyard/i);
    expect(p.venueKind).toBe('home');
  });
});

describe('milestone number (DESTINATION-1 follow-up)', () => {
  test('"80th birthday" captures the milestone', () => {
    expect(parseSmartEventText('destination 80th birthday celebration', { now: NOW }).milestone).toBe('80th');
  });
  test('"50th anniversary" captures the milestone', () => {
    expect(parseSmartEventText('our 50th anniversary party', { now: NOW }).milestone).toBe('50th');
  });
  test('no milestone phrase → null', () => {
    expect(parseSmartEventText('birthday party for 20', { now: NOW }).milestone).toBeNull();
  });
});

describe('city + state extraction (DESTINATION-1 follow-up)', () => {
  test('a two-word city + full state name resolves via parseVenueLocation', () => {
    const p = parseSmartEventText('birthday in Santa Fe, New Mexico', { now: NOW });
    expect(p.venueCity).toBe('Santa Fe');
    expect(p.venueState).toBe('NM');
  });
  test('a one-word city + state abbreviation resolves', () => {
    const p = parseSmartEventText('party at Annapolis, MD', { now: NOW });
    expect(p.venueCity).toBe('Annapolis');
    expect(p.venueState).toBe('MD');
  });
  test('a bare city with no state is NOT accepted (same strict gate as the manual field)', () => {
    const p = parseSmartEventText('party in Austin sometime soon', { now: NOW });
    expect(p.venueCity).toBeNull();
  });
  test('no location phrase → null, not a false positive', () => {
    const p = parseSmartEventText('crab feast for 20 in the backyard', { now: NOW });
    expect(p.venueCity).toBeNull();
    expect(p.venueState).toBeNull();
  });
});

describe('the full destination-birthday input, end to end', () => {
  test('destination 80th birthday celebration in Santa Fe, New Mexico in June of 2028', () => {
    const p = parseSmartEventText('destination 80th birthday celebration in Santa Fe, New Mexico in June of 2028', { now: NOW });
    expect(p.type).toBe('Birthday');
    expect(p.milestone).toBe('80th');
    expect(p.venueCity).toBe('Santa Fe');
    expect(p.venueState).toBe('NM');
    expect(p.date).toBeNull();
    expect(p.monthYear).toEqual({ year: 2028, month: 5, label: 'Jun 2028' });
    expect(p.isDestination).toBe(true);
  });
});

describe('isDestination — a suggestion, not an invented fact', () => {
  test('the word "destination" triggers the suggestion', () => {
    expect(parseSmartEventText('a destination anniversary trip', { now: NOW }).isDestination).toBe(true);
  });
  test('"out of town" / "fly in" phrasing also triggers it', () => {
    expect(parseSmartEventText('an out-of-town reunion for everyone', { now: NOW }).isDestination).toBe(true);
    expect(parseSmartEventText('fly in for the party', { now: NOW }).isDestination).toBe(true);
  });
  test('a real city+state match alone also triggers it (a real travel signal)', () => {
    expect(parseSmartEventText('birthday in Austin, Texas', { now: NOW }).isDestination).toBe(true);
  });
  test('a plain local event has no destination signal', () => {
    expect(parseSmartEventText('crab feast for 20 in the backyard', { now: NOW }).isDestination).toBe(false);
  });
});
