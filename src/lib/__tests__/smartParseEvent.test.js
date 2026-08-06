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

describe('secondary type (dual / compound event) + theme', () => {
  test('a dual event captures BOTH occasions (host report — birthday was dropped)', () => {
    const p = parseSmartEventText('50th birthday and 30 year Army retirement for Wanda', { now: NOW });
    const types = [p.type, p.secondaryType].filter(Boolean);
    expect(types.some((x) => /birthday/i.test(x))).toBe(true);
    expect(types.some((x) => /retirement/i.test(x))).toBe(true);
    expect(p.secondaryType).toBeTruthy();
    expect(p.secondaryType).not.toBe(p.type);
  });
  test('a single-occasion event has no secondary type', () => {
    expect(parseSmartEventText('crab feast for 20 in the backyard', { now: NOW }).secondaryType).toBeNull();
  });
  test('a theme phrase is captured, not dropped', () => {
    expect(parseSmartEventText('birthday, black and gold theme, 40 people', { now: NOW }).theme).toMatch(/black and gold/i);
  });
  test('no theme mentioned → null', () => {
    expect(parseSmartEventText('crab feast for 20', { now: NOW }).theme).toBeNull();
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
  // Live drive 2026-08-05: "12 guys flying in" fell through every counting
  // noun (COUNT_NOUNS had no word for a bachelor/bachelorette party's own
  // crowd) and silently fell back to the playbook's typical headcount (10)
  // instead of the 12 the host actually said.
  test('bachelor/bachelorette party count words are recognized', () => {
    expect(parseSmartEventText('bachelor party, 12 guys flying in', { now: NOW }).guests).toBe(12);
    expect(parseSmartEventText('bachelorette weekend, 8 girls', { now: NOW }).guests).toBe(8);
    expect(parseSmartEventText('wedding party, 6 bridesmaids and 5 groomsmen', { now: NOW }).guests).toBe(6);
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
  test('a date year just before "budget" is NOT taken as the budget (host report)', () => {
    // "March 20 2027, budget 5000" used to parse $2,027 (the year swallowed by /N budget/).
    const p = parseSmartEventText('retirement March 20 2027, budget 5000', { now: NOW });
    expect(p.budget).toBe(5000);
  });
  test('"5000 budget" (number-first) still works after the reorder', () => {
    expect(parseSmartEventText('birthday, 5000 budget, 40 people', { now: NOW }).budget).toBe(5000);
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

describe('time of day — the coarse word the host said (2026-07-14)', () => {
  const p = (txt) => parseSmartEventText(txt, { now: NOW });
  test('"in the afternoon" is captured — it used to be dropped, defeating the grounded start time', () => {
    expect(p('cookout for 25 in the afternoon on Sept 6').timeOfDay).toBe('afternoon');
  });
  test('each bucket', () => {
    expect(p('brunch for 10').timeOfDay).toBe('morning');
    expect(p('dinner party for 8').timeOfDay).toBe('evening');
    expect(p('birthday in the evening').timeOfDay).toBe('evening');
    expect(p('late night party').timeOfDay).toBe('late');
  });
  test('no time word → null, never a guess', () => {
    expect(p('crab feast for 20').timeOfDay).toBeNull();
  });
});


describe('vacation areas (host ask 2026-07-27)', () => {
  const opts = { now: new Date('2026-05-01T10:00:00') };
  test('"Deep Creek Lake" reads as a destination with the honest hub town', () => {
    const p = parseSmartEventText('Family reunion at Deep Creek Lake June 12-14 for 40 people', opts);
    expect(p.isDestination).toBe(true);
    expect(p.venue).toBe('Deep Creek Lake');
    expect(p.venueCity).toBe('McHenry');
    expect(p.venueState).toBe('MD');
    expect(p.vacationArea).toBe('deep-creek');
    expect(p.endDate).toBe('2026-06-14'); // the span still parses alongside
  });
  test('an explicit City, ST still wins over the area hub', () => {
    const p = parseSmartEventText('destination party at Deep Creek Lake in Oakland, Maryland', opts);
    expect(p.venueCity).toBe('Oakland');
    expect(p.venueState).toBe('MD');
  });
  test('non-area text is untouched', () => {
    const p = parseSmartEventText('Birthday June 12 for 20 people', opts);
    expect(p.vacationArea).toBe(null);
    expect(p.isDestination).toBe(false);
  });
});

// ── COMMA-LED LOCATIONS, NO PREPOSITION (live drive 2026-08-04) ──────────────
// Both location patterns required "in"/"at" before the town, so the ordinary
// comma-separated way hosts list facts dropped the town entirely — and with it
// the whole destination stack, since isDestination reads the parsed location.
// The app answered "Local event" for a five-day trip to a Santa Fe resort.
describe('a town listed without a preposition', () => {
  test('"…, Santa Fe, NM resort spa, …" resolves the town AND the destination read', () => {
    const p = parseSmartEventText('80th birthday for Linda Stewart, 10 of us, Santa Fe, NM resort spa, June 17-21', NOW);
    expect(p.venueCity).toBe('Santa Fe');
    expect(p.venueState).toBe('NM');
    expect(p.isDestination).toBe(true);
    expect(p.honoree).toBe('Linda');
  });

  test('the same shape for a lake area with a real state', () => {
    const p = parseSmartEventText('birthday for Vida Haynes, 10 people, Deep Creek Lake, MD, June 17-21', NOW);
    expect(p.venueCity).toBe('Deep Creek Lake');
    expect(p.venueState).toBe('MD');
    expect(p.honoree).toBe('Vida');
  });

  // The strict gate is what makes the loose scan safe: a name followed by a
  // count is not a place, and never becomes one.
  test('a person and a headcount are never mistaken for a town', () => {
    const p = parseSmartEventText('80th birthday for Linda Stewart, 10 of us, June 17-21', NOW);
    expect(p.venueCity == null || p.venueCity === '').toBe(true);
  });

  test('the prepositional forms still win when present', () => {
    const p = parseSmartEventText('family reunion in Deep Creek Lake, MD, 24 of us, June 17-21', NOW);
    expect(p.venueCity).toBe('Deep Creek Lake');
    expect(p.venueState).toBe('MD');
  });
});

// A CITY AND ITS STATE WITH NO COMMA BETWEEN THEM (live drive 2026-08-05):
// "Santa Fe NM" reads perfectly naturally to a host but every pattern above
// requires a comma before the state, so "destination trip in Santa Fe NM,
// resort spa" dropped the town — and with it isDestination — entirely.
describe('a city glued straight onto its state abbreviation, no comma', () => {
  test('"Santa Fe NM" resolves the same as "Santa Fe, NM"', () => {
    const p = parseSmartEventText("Mom's 80th birthday destination trip in Santa Fe NM, resort spa, 10 guests, June 17-21, budget $4000", NOW);
    expect(p.venueCity).toBe('Santa Fe');
    expect(p.venueState).toBe('NM');
    expect(p.isDestination).toBe(true);
  });

  test('a two-letter word that is not a real state is still rejected', () => {
    const p = parseSmartEventText('birthday for Linda Stewart TV dinner, 10 of us, June 17-21', NOW);
    expect(p.venueCity == null || p.venueCity === '').toBe(true);
  });
});
