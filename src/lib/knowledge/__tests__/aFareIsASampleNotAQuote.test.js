// ─── A SAMPLE OF WHAT WAS PAID IS NOT A QUOTE, AND IT IS SIX MONTHS OLD ────
//
// The property that matters is not "airfare gets a number". It is that the
// module never turns a historical ten-percent ticket sample into something
// a host could mistake for a bookable price, and never answers for a city
// it does not cover. A confident fare for Annapolis — which has no
// commercial airport — is the failure mode.
//
// DOT's own words, which the basis must keep carrying: "A ten-percent
// sample of passenger tickets... it is unlikely that the average fares from
// this report will be the same as any particular fare offered."
import { DOT_CITY_FARES, DOT_PERIOD, MIN_MARKETS } from '../dotAirfareRates';
import { airfareBandFor, airfareBandNote } from '../airfareBandIndex';

describe('the table is what DOT published', () => {
  test('the shape measured at derivation still holds', () => {
    // 184 cities kept of the 317 in 2026 Q1, at a floor of 8 markets.
    expect(DOT_CITY_FARES).toHaveLength(184);
    expect(MIN_MARKETS).toBe(8);
    expect(DOT_PERIOD).toEqual({ year: 2026, quarter: 1, updated: '2026-09-03' });
  });

  test('every row is ordered, plausible, and above the market floor', () => {
    const bad = [];
    for (const [name, markets, p25, median, p75] of DOT_CITY_FARES) {
      // Seven entries carry a trailing "(Metropolitan Area)". The index
      // must strip it; this only asserts the state is findable at all.
      if (!/,\s[A-Z]{2}(\s*\([^)]*\))?$/.test(name)) bad.push(`name ${name}`);
      if (markets < MIN_MARKETS) bad.push(`${name} has ${markets} markets`);
      // The quartiles must not cross — a sort bug would show up here first.
      if (!(p25 <= median && median <= p75)) bad.push(`${name} ${p25}/${median}/${p75}`);
      if (!(p25 > 40 && p75 < 900)) bad.push(`${name} out of range ${p25}-${p75}`);
    }
    expect(bad).toEqual([]);
  });

  test('SPOT-CHECKED against the source pull, not against itself', () => {
    // Computed from the 2026 Q1 CSV on 2026-09-27 and pinned, so a bad
    // regeneration fails rather than shipping a self-consistent wrong table.
    //   Santa Fe, NM     17 markets  $294 / $313 / $382
    //   Charleston, SC   99 markets  $259 / $307 / $340
    //   Austin, TX      147 markets  $263 / $295 / $318
    expect(airfareBandFor('Santa Fe', 'NM')).toMatchObject({ markets: 17, low: 294, median: 313, high: 382 });
    expect(airfareBandFor('Charleston', 'SC')).toMatchObject({ markets: 99, low: 259, high: 340 });
    expect(airfareBandFor('Austin', 'TX')).toMatchObject({ markets: 147, low: 263, high: 318 });
  });
});

describe('a band, never a point', () => {
  test('a multi-city market answers to each town in its name', () => {
    // DOT calls it "Dallas/Fort Worth, TX". A host types one of them.
    const dal = airfareBandFor('Dallas', 'TX');
    const ftw = airfareBandFor('Fort Worth', 'TX');
    expect(dal).toBeTruthy();
    expect(ftw).toEqual(dal);
  });

  test('THE SEVEN METROPOLITAN AREAS are reachable, not silently dropped', () => {
    // Atlanta, Boston, Miami, Norfolk, Quad Cities, San Francisco and
    // Washington DC are named "City, ST (Metropolitan Area)" in DOT's table.
    // The first index read the state off the raw string and lost all seven —
    // five of the biggest destination markets in the country — while every
    // other assertion in this file still passed.
    for (const [c, st] of [['Atlanta', 'GA'], ['Boston', 'MA'], ['Miami', 'FL'],
      ['Norfolk', 'VA'], ['San Francisco', 'CA'], ['Washington', 'DC']]) {
      const b = airfareBandFor(c, st);
      expect({ [c]: !!b }).toEqual({ [c]: true });
      expect(b.low).toBeGreaterThan(0);
    }
  });

  test('two Charlestons stay two Charlestons', () => {
    // Keyed on city AND state, or a South Carolina wedding gets West
    // Virginia's fares.
    const sc = airfareBandFor('Charleston', 'SC');
    const wv = airfareBandFor('Charleston', 'WV');
    expect(sc).toBeTruthy();
    if (wv) expect(wv.low).not.toBe(sc.low);
  });

  test('the city is matched however the host typed it', () => {
    const a = airfareBandFor('Austin', 'TX');
    for (const c of ['austin', '  AUSTIN  ']) {
      expect(airfareBandFor(c, 'tx')).toEqual(a);
    }
  });
});

describe('what it refuses', () => {
  test('a town with no commercial service gets nothing, not its neighbor’s', () => {
    // Annapolis guests really do fly, into BWI. Answering with Baltimore
    // would be guessing which airport they pick — the same guess
    // lodgingIntel refuses to make about how a party divides into rooms.
    expect(airfareBandFor('Annapolis', 'MD')).toBeNull();
  });

  test('outside the contiguous states there is no band', () => {
    for (const [c, st] of [['Honolulu', 'HI'], ['Anchorage', 'AK'], ['San Juan', 'PR']]) {
      expect({ [c]: airfareBandFor(c, st) }).toEqual({ [c]: null });
    }
  });

  test('no state, no band', () => {
    for (const s of [null, undefined, '', '  ', 'Texas', 7, {}]) {
      expect({ [String(s)]: airfareBandFor('Austin', s) }).toEqual({ [String(s)]: null });
    }
  });

  test('THE FLOOR: a city in too few markets is absent rather than noisy', () => {
    // 133 of 317 cities were dropped. The guarantee is that nothing below
    // the floor is reachable at all, not that some particular town is out.
    const kept = new Set(DOT_CITY_FARES.map((r) => r[0]));
    expect(kept.size).toBe(184);
    expect(DOT_CITY_FARES.every((r) => r[1] >= MIN_MARKETS)).toBe(true);
  });
});

describe('the words that reach a host', () => {
  test('every basis names the quarter and the sample, and promises nothing', () => {
    const b = airfareBandFor('Santa Fe', 'NM');
    expect(b.basis).toMatch(/2026 Q1/);
    expect(b.basis).toMatch(/ten-percent sample/i);
    expect(b.basis).toMatch(/unlikely to match/i);
    expect(b.basis).not.toMatch(/\b(quote|book|guarantee|you will pay)\b/i);
  });

  test('the host line leads with the age and fits a phone', () => {
    const n = airfareBandNote('Santa Fe', 'NM');
    expect(n).toMatch(/\$294–\$382/);
    expect(n).toMatch(/2026 Q1/);
    expect(n).toMatch(/what people paid then, not a quote/);
    expect(n.length).toBeLessThanOrEqual(120);
    expect(airfareBandNote('Annapolis', 'MD')).toBeNull();
  });

  test('a band is never collapsed to one number on the way out', () => {
    // `median` is carried for callers that need to sort, but low and high
    // must differ wherever the source distribution does.
    const wide = DOT_CITY_FARES.filter((r) => r[4] - r[2] > 50);
    expect(wide.length).toBeGreaterThan(20);
    for (const [name, , p25, , p75] of wide.slice(0, 5)) {
      const b = airfareBandFor(name.slice(0, name.lastIndexOf(',')).split('/')[0], name.slice(-2));
      expect({ [name]: b && [b.low, b.high] }).toEqual({ [name]: [p25, p75] });
    }
  });
});
