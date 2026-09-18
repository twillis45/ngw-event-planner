// ─── THE BARE-CITY GATE (CITY-SAID-1, 2026-09-18) ────────────────────────────
//
// The parser used to lose the town in three of the four shapes a host writes
// ("in 20770", "in Asheville", "trip to Nashville" — only "City, ST" survived),
// and the town gates weather, the shopping list, lodging search and maps.
//
// The fix is deliberately NOT a looser regex. Two properties do all the work,
// and this file exists to hold them down:
//
//   1. A NON-PLACE WORD CAN NEVER BECOME A TOWN. Admission is membership in the
//      curated lib/usCities.js whitelist, so "Memory", "Grand Ballroom",
//      "Aisha's" and "Vida" cannot resolve no matter how they are phrased.
//   2. A STATE IS NEVER INFERRED. resolveSpokenCity returns state: null for
//      every input, always — including names that appear exactly once in the
//      list ("Arlington" → Arlington, TX only, because Arlington, VA is not in
//      it). Publishing that state would fabricate a fact the host never typed.
//
// And the third property, which is about what did NOT change: parseVenueLocation
// — the strict gate every seam that COMMITS a location runs through — is
// untouched and still refuses a bare city outright.
import { resolveSpokenCity, parseVenueLocation, isPlausibleCityText } from '../cityText';
import { parseSmartEventText } from '../smartParseEvent';
import US_CITIES from '../usCities';
import { corpusNow } from './fixtures/parseCorpus.mjs';

const parse = (t) => parseSmartEventText(t, { now: corpusNow() });

describe('resolveSpokenCity — what may become a town', () => {
  test('a curated city resolves, in the list’s own spelling', () => {
    expect(resolveSpokenCity('Asheville')).toEqual({ city: 'Asheville', state: null });
    expect(resolveSpokenCity('Nashville')).toEqual({ city: 'Nashville', state: null });
    expect(resolveSpokenCity('New Orleans')).toEqual({ city: 'New Orleans', state: null });
    expect(resolveSpokenCity('Salt Lake City')).toEqual({ city: 'Salt Lake City', state: null });
    expect(resolveSpokenCity('winston-salem')).toEqual({ city: 'Winston-Salem', state: null });
  });

  test('IT NEVER RETURNS A STATE — for every city in the list, not just the easy ones', () => {
    // A property, not a sample: if anyone ever "helpfully" resolves the state
    // for names that look unique, this fails on all 240 of them at once.
    const withState = US_CITIES
      .map((e) => String(e).slice(0, String(e).lastIndexOf(',')).trim())
      .map((name) => [name, resolveSpokenCity(name)])
      .filter(([, r]) => !r || r.state !== null)
      .map(([name]) => name);
    expect(withState).toEqual([]);
  });

  test('Arlington is the proof: one entry in the list, and STILL no state', () => {
    // Arlington, TX is in the curated list; Arlington, VA (pop ~238k) is not.
    // "Unique in a 240-row list" is not "unique in America".
    const arlington = US_CITIES.filter((e) => /^Arlington,/.test(e));
    expect(arlington).toEqual(['Arlington, TX']);
    expect(resolveSpokenCity('Arlington')).toEqual({ city: 'Arlington', state: null });
  });

  test('junk in the town slot resolves to nothing', () => {
    const JUNK = [
      'Memory', 'Honor', 'Celebration', 'Grand Ballroom', 'The Clubhouse',
      "Aisha's", "Wanda's", 'Vida', 'Wanda', 'Marcus', 'Linda Stewart',
      'June', 'August', 'Saturday', 'Sunday', 'Tomorrow',
      'Cookout', 'Reunion', 'Graduation', 'Backyard', 'Zoom', 'Hilton', 'Marriott',
      'Fellowship Hall', 'VFW Post', 'Anytown', 'Narnia', 'Springfeild',
    ];
    const leaked = JUNK.filter((w) => resolveSpokenCity(w) !== null);
    expect(leaked).toEqual([]);
  });

  test('no month or weekday name is in the whitelist (a future list edit cannot smuggle one in)', () => {
    const WORDS = /^(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;
    const bad = US_CITIES
      .map((e) => String(e).slice(0, String(e).lastIndexOf(',')).trim())
      .filter((n) => WORDS.test(n));
    expect(bad).toEqual([]);
  });

  test('a "City, ST" string is NOT this function’s job — it belongs to parseVenueLocation', () => {
    expect(resolveSpokenCity('Asheville, NC')).toBeNull();
  });

  test('digits and venue-shaped strings are refused by the shared CITY-LEAK gate', () => {
    expect(resolveSpokenCity('20770')).toBeNull();                       // a ZIP routes through parseVenueLocation
    expect(resolveSpokenCity('VFW Post 3150 — Alexandria')).toBeNull();
    expect(resolveSpokenCity('')).toBeNull();
    expect(resolveSpokenCity(null)).toBeNull();
    expect(isPlausibleCityText('20770')).toBe(false);
  });
});

describe('the strict gate was NOT loosened', () => {
  test('parseVenueLocation still refuses every bare city, including the ones the parser now hears', () => {
    ['Asheville', 'Nashville', 'Arlington', 'Springfield', 'Annapolis'].forEach((c) => {
      expect(parseVenueLocation(c)).toBeNull();
    });
  });
  test('parseVenueLocation still accepts only City, ST / State name / ZIP', () => {
    expect(parseVenueLocation('Asheville, NC')).toEqual({ city: 'Asheville', state: 'NC' });
    expect(parseVenueLocation('Savannah, Georgia')).toEqual({ city: 'Savannah', state: 'GA' });
    expect(parseVenueLocation('20770')).toEqual({ zip: '20770' });
  });
});

describe('parseSmartEventText — the town reaches the parse result', () => {
  test('a bare ZIP resolves (it names one place and has no state to guess)', () => {
    const g = parse('Cookout in 20770 for 30');
    expect(g.venueCity).toBe('20770');
    expect(g.venueState).toBeNull();
  });

  test('a bare city carries the town and no state', () => {
    expect(parse('Reunion in Asheville Aug 3 to Aug 7 2027')).toMatchObject({ venueCity: 'Asheville', venueState: null });
    expect(parse('Bachelorette weekend trip to Nashville')).toMatchObject({ venueCity: 'Nashville', venueState: null });
  });

  test('a said "City, ST" still wins outright — the strongest form is never downgraded', () => {
    expect(parse('Cookout in Greenbelt, MD for 30')).toMatchObject({ venueCity: 'Greenbelt', venueState: 'MD' });
    expect(parse('Reunion in Asheville, NC for 24')).toMatchObject({ venueCity: 'Asheville', venueState: 'NC' });
    // A curated vacation AREA keeps its real hub town + state (registry-backed).
    expect(parse('Family reunion at Deep Creek Lake for 30, 3 nights')).toMatchObject({ venueCity: 'McHenry', venueState: 'MD' });
  });

  test('sentences that must NOT produce a town, still do not', () => {
    const MUST_STAY_EMPTY = [
      'Reunion in Memory of Dad for 40',
      'Reception in Grand Ballroom for 60',
      "Baby shower in Aisha's honor for 25",
      'Retirement party in Honor of Wanda for 60',
      'Reunion in June for 30',
      'Reunion in Vida for 20',
      'Birthday celebration for Vida, 20 people, $2500 budget',
      'Zoom baby shower for 20',
      'Cookout for 8 people at my place',
      'Crab feast for 20 in the backyard',
      'Engagement party at the clubhouse for 50, adults only',
      'Party with 3 kegs and a taco truck',
      'Bridal shower on Saturday for 20',
    ];
    const leaked = MUST_STAY_EMPTY
      .map((t) => [t, parse(t)])
      .filter(([, g]) => g.venueCity || g.venueState)
      .map(([t, g]) => `${t} → ${JSON.stringify(g.venueCity)}/${JSON.stringify(g.venueState)}`);
    expect(leaked).toEqual([]);
  });

  test('"at <X>" names a VENUE, not a town — only "in <Town>" and "trip to <Town>" are locative', () => {
    // "at Hilton" / "at Boston Market" must not become a city even though the
    // first word of each is on the whitelist.
    expect(parse('Party at Hilton for 50').venueCity).toBeNull();
    expect(parse('Dinner at Boston Market for 12').venueCity).toBeNull();
  });

  test('a house number is not a ZIP — the street line keeps it', () => {
    const g = parse('Cookout at 20770 Main St for 30');
    expect(g.venueAddress).toBe('20770 Main St');
    expect(g.venueCity).toBeNull();
  });

  test('a budget, a headcount and a year are never read as a ZIP', () => {
    expect(parse('Quinceanera on May 2 2027 for 120, budget $15,000').venueCity).toBeNull();
    expect(parse('Anniversary dinner on March 20 2027, budget 50000').venueCity).toBeNull();
    expect(parse('Cookout for 20000 people').venueCity).toBeNull();
  });

  test('the destination stack is unchanged by the town now being recorded', () => {
    // isDestination reads the same three signals it always did; this change only
    // writes down the town. Guarded so a future edit cannot quietly re-route it.
    expect(parse('Cookout in 20770 for 30').isDestination).toBe(false);
    expect(parse('Reunion in Asheville for 24')).toMatchObject({ isDestination: true, destinationBasis: 'place-named' });
    expect(parse('Bachelorette weekend trip to Nashville')).toMatchObject({ isDestination: true, destinationBasis: 'travel-language' });
  });
});
