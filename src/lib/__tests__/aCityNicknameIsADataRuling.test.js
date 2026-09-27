import US_CITIES from '../usCities';
import { cityNicknameEntries, resolveCityNickname, resolveSpokenCity, parseVenueLocation } from '../cityText';
import { parseSmartEventText } from '../smartParseEvent';

// Measured 2026-09-27 BEFORE the alias layer existed: "vegas", "philly", "NYC",
// "DC" and "NOLA" every one resolved to nothing, through resolveSpokenCity and
// through the whole parser. The host typed her town in the form she actually
// uses and the app heard no town at all.
//
// The fix is a table, and a table is a DATA RULING — so this file gates the
// RULE (see CITY_NICKNAMES in cityText.js), not a sample of rows. What it pins:
//
//   1. The four admitted rows resolve, case-insensitively, to a real city AND a
//      real state, and the state reaches venueCity/venueState at runtime.
//   2. Every row's referent exists VERBATIM in the curated usCities list, so no
//      alias can ever publish a place the rest of the app does not know.
//   3. No row is two letters — the state-abbreviation slot. DC, LA, SF and KC
//      are ABSENT ON PURPOSE and this test fails if one is added.
//   4. Ambiguous and unknown nicknames still resolve to NOTHING — including
//      "Frisco", which is a real curated city (Frisco, TX) and must never
//      become San Francisco or acquire a state.
//   5. parseVenueLocation is not loosened by any of it.

const NOW = new Date('2026-09-27T12:00:00');

describe('a city nickname is a data ruling', () => {
  // The EXPECTED rows, and the LIVE table. Both, deliberately: the first pins
  // which rows the ruling admitted, the second is what rules 2 and 4 below are
  // held against, so adding a row to cityText.js cannot slip past them.
  const ADMITTED = [
    ['vegas', 'Las Vegas', 'NV'],
    ['philly', 'Philadelphia', 'PA'],
    ['nyc', 'New York', 'NY'],
    ['nola', 'New Orleans', 'LA'],
  ];
  const LIVE = cityNicknameEntries();

  test('the table holds EXACTLY the rows the ruling admitted — no quiet additions', () => {
    expect([...LIVE].sort()).toEqual([...ADMITTED].sort());
  });

  test('the admitted nicknames resolve to a city AND a state, whatever the case', () => {
    for (const [nick, city, state] of ADMITTED) {
      for (const form of [nick, nick.toUpperCase(), nick[0].toUpperCase() + nick.slice(1), `  ${nick} `]) {
        expect(resolveCityNickname(form)).toEqual({ city, state });
        expect(resolveSpokenCity(form)).toEqual({ city, state });
      }
    }
  });

  test('RULE 4, as a property: every referent is verbatim in the curated list', () => {
    // If a row is ever added for a city the app does not carry, this fails.
    const missing = LIVE
      .filter(([, city, state]) => !US_CITIES.includes(`${city}, ${state}`))
      .map(([nick]) => nick);
    expect(missing).toEqual([]);
  });

  test('RULE 2, as a property: no nickname is two letters', () => {
    // A bare two-letter token in this parser sits in the STATE slot ("in
    // greenbelt md"). Admitting one would let a state be read as a city.
    const tooShort = LIVE.map(([nick]) => nick).filter((n) => n.length <= 2);
    expect(tooShort).toEqual([]);
  });

  test('NEGATIVE CONTROL — ambiguous, coded and unknown nicknames resolve to nothing', () => {
    // DC / LA / SF / KC: rule 2 (and KC is ambiguous twice — the curated list
    // holds Kansas City, KS and Kansas City, MO). ATL / LAX / ORD: rule 3.
    // Chi-town / Nashvegas / Bean Town / The Big Easy: rule 1.
    for (const n of ['DC', 'dc', 'D.C.', 'LA', 'la', 'SF', 'KC', 'ATL', 'LAX', 'ORD',
      'Chi-town', 'Chitown', 'Nashvegas', 'Bean Town', 'The Big Easy', 'Motor City',
      'Philly Philly', 'vegass', 'nolaa', 'zzzzz']) {
      expect(resolveCityNickname(n)).toBeNull();
    }
  });

  test('NEGATIVE CONTROL — "Frisco" stays Frisco, TX and STILL carries no state', () => {
    // Frisco, TX is a real city of ~240k and is itself in the curated list, so
    // "Frisco" has two plausible referents. It must resolve as the bare city it
    // literally is — never San Francisco, and never with a guessed state.
    expect(resolveCityNickname('Frisco')).toBeNull();
    expect(resolveSpokenCity('Frisco')).toEqual({ city: 'Frisco', state: null });
  });

  test('a bare real city name still carries NO state — the old rule is intact', () => {
    expect(resolveSpokenCity('Asheville')).toEqual({ city: 'Asheville', state: null });
    expect(resolveSpokenCity('Arlington')).toEqual({ city: 'Arlington', state: null });
    expect(resolveSpokenCity('Springfield')).toEqual({ city: 'Springfield', state: null });
  });

  test('parseVenueLocation is NOT loosened — a bare nickname is still refused there', () => {
    for (const [nick] of ADMITTED) {
      expect(parseVenueLocation(nick)).toBeNull();
      expect(parseVenueLocation(nick.toUpperCase())).toBeNull();
    }
    // And the strict gate still reads a real "City, ST" exactly as before.
    expect(parseVenueLocation('Las Vegas, NV')).toEqual({ city: 'Las Vegas', state: 'NV' });
  });

  test('IT REACHES RUNTIME — the nickname becomes venueCity + venueState', () => {
    const cases = [
      ['Reunion in vegas Aug 3 2027', 'Las Vegas', 'NV'],
      ['Reunion in Vegas Aug 3 2027', 'Las Vegas', 'NV'],
      ['Cookout in philly for 30', 'Philadelphia', 'PA'],
      ['Wedding in NYC on July 10 2027', 'New York', 'NY'],
      ['Reunion in nola Aug 3 2027', 'New Orleans', 'LA'],
      ['Bachelorette trip to Philly', 'Philadelphia', 'PA'],
    ];
    for (const [text, city, state] of cases) {
      const r = parseSmartEventText(text, { now: NOW });
      expect([text, r.venueCity, r.venueState]).toEqual([text, city, state]);
    }
  });

  test('IT REACHES RUNTIME — a bare real town still arrives with no state', () => {
    const r = parseSmartEventText('Reunion in Asheville Aug 3 2027', { now: NOW });
    expect(r.venueCity).toBe('Asheville');
    expect(r.venueState).toBeNull();
  });

  test('NEGATIVE CONTROL at runtime — a rejected nickname publishes no town', () => {
    for (const text of ['Cookout in DC for 30', 'Reunion in ATL Aug 3 2027']) {
      const r = parseSmartEventText(text, { now: NOW });
      expect([text, r.venueCity, r.venueState]).toEqual([text, null, null]);
    }
  });
});
