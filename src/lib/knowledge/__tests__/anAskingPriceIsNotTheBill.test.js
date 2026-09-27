// ─── ASKING, NOT PAID, AND NOT THE WHOLE BILL ─────────────────────────────
//
// The property that matters is that a number which systematically
// understates what a host will be charged never reaches a host without
// saying so, and that a licence condition never gets dropped on the way to
// the screen.
//
// The fee exclusion is MEASURED, not assumed. Inside Airbnb's data
// dictionary does not document `price` at all — it still lists the removed
// weekly_price/monthly_price and omits every price_quote_* field — so we
// parsed the raw quote JSON on the San Francisco file, 2026-09-27:
// cleaning_fee null in 6,196/6,196, service_fee null in 6,196/6,196, taxes
// set in 10/6,196. A cleaning fee on a two-night stay is routinely 15–30%
// of the real total, so this table is biased low, always in one direction.
import {
  AIRBNB_NIGHTLY, MIN_LISTINGS, INSIDE_AIRBNB_ATTRIBUTION,
} from '../airbnbNightlyRates';
import {
  airbnbNightlyFor, airbnbNightlyNote, bucketForSleeps, airbnbCoveredCities,
} from '../airbnbNightlyIndex';

describe('the table is what Inside Airbnb published', () => {
  test('all 34 US cities, each with its own snapshot date', () => {
    expect(AIRBNB_NIGHTLY).toHaveLength(34);
    for (const [city, st, date, buckets] of AIRBNB_NIGHTLY) {
      expect(typeof city).toBe('string');
      expect(st).toMatch(/^[A-Z]{2}$/);
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Object.keys(buckets).length).toBeGreaterThan(0);
    }
  });

  test('every band is ordered, above the floor, and plausible', () => {
    const bad = [];
    for (const [city, st, , buckets] of AIRBNB_NIGHTLY) {
      for (const [b, v] of Object.entries(buckets)) {
        const [listings, p25, median, p75] = v;
        if (listings < MIN_LISTINGS) bad.push(`${city} ${b} only ${listings}`);
        if (!(p25 <= median && median <= p75)) bad.push(`${city} ${b} ${p25}/${median}/${p75}`);
        if (!(p25 > 20 && p75 < 6000)) bad.push(`${city} ${b} range ${p25}-${p75}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('bigger places cost more — a sanity check on the bucketing itself', () => {
    // If `accommodates` parsing broke, the buckets would scramble and this
    // is the cheapest way to notice.
    //
    // ON p25 AND p75, NOT THE MEDIAN, and that is a measured choice rather
    // than a convenient one. Across all 34 cities the lower and upper
    // quartiles are monotonic in size WITHOUT EXCEPTION; exactly one median
    // is not — Pacific Grove's sleeps-8 median ($524) sits under its
    // sleeps-6 ($570). That bucket holds 22 listings, two above the floor,
    // and is the thinnest in the table; both its quartiles ($361/$954) are
    // still above the sleeps-6 band ($329/$942), so the dip is one thin
    // sample wobbling inside a very wide distribution, not a parse error.
    //
    // p25 and p75 are also what this module actually ships as `low` and
    // `high`. The median is carried for callers that need to sort and is
    // never rendered, so pinning the two we show is the stronger test.
    const ORDER = ['2', '4', '6', '8', '9+'];
    const wrong = [];
    for (const [city, st, , buckets] of AIRBNB_NIGHTLY) {
      const present = ORDER.filter((b) => buckets[b]);
      for (let i = 1; i < present.length; i += 1) {
        for (const [idx, label] of [[1, 'p25'], [3, 'p75']]) {
          const prev = buckets[present[i - 1]][idx];
          const cur = buckets[present[i]][idx];
          if (cur < prev) {
            wrong.push(`${city}, ${st} ${label}: ${present[i]} ($${cur}) < ${present[i - 1]} ($${prev})`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  test('…and the one median that dips is the one we measured and expect', () => {
    // Pinned so that if a regeneration produces a SECOND such dip, somebody
    // looks at it rather than at this comment.
    const ORDER = ['2', '4', '6', '8', '9+'];
    const dips = [];
    for (const [city, st, , buckets] of AIRBNB_NIGHTLY) {
      const present = ORDER.filter((b) => buckets[b]);
      for (let i = 1; i < present.length; i += 1) {
        if (buckets[present[i]][2] < buckets[present[i - 1]][2]) dips.push(`${city}, ${st}`);
      }
    }
    expect(dips).toEqual(['Pacific Grove, CA']);
  });

  test('SPOT-CHECKED against the source pull', () => {
    // Derived from the 2026-06-14 San Francisco file on 2026-09-27:
    //   sleeps 2  1,180 listings  $148 / $200 / $291
    //   sleeps 8    206 listings  $436 / $661 / $1,046
    expect(airbnbNightlyFor('San Francisco', 'CA', 2))
      .toMatchObject({ listings: 1180, low: 148, median: 200, high: 291 });
    expect(airbnbNightlyFor('San Francisco', 'CA', 8))
      .toMatchObject({ listings: 206, low: 436, median: 661, high: 1046 });
  });
});

describe('a party gets the size it needs', () => {
  test('sleeps maps to the bucket that can actually hold them', () => {
    expect(bucketForSleeps(1)).toBe('2');
    expect(bucketForSleeps(2)).toBe('2');
    expect(bucketForSleeps(3)).toBe('4');
    expect(bucketForSleeps(6)).toBe('6');
    expect(bucketForSleeps(7)).toBe('8');
    expect(bucketForSleeps(9)).toBe('9+');
    expect(bucketForSleeps(40)).toBe('9+');
    for (const v of [0, -1, null, undefined, 'six', NaN, {}]) {
      expect({ [String(v)]: bucketForSleeps(v) }).toEqual({ [String(v)]: null });
    }
  });

  test('a party of ten is never priced off four-person listings', () => {
    // The tempting fallback, and the wrong one: if a city has too few big
    // places the honest answer is "not enough of these here", not the price
    // of something that cannot hold the party.
    //
    // ALBANY, deliberately. The first version used Oakland, which HAS a 9+
    // bucket — so the smaller-bucket fallback it was meant to forbid was
    // never reached and red-proofing it PASSED. Albany is missing both '8'
    // and '9+', so a party of ten there has nowhere to fall back to except
    // a wrong answer.
    expect(airbnbNightlyFor('Albany', 'NY', 6)).toBeTruthy();
    expect(airbnbNightlyFor('Albany', 'NY', 8)).toBeNull();
    expect(airbnbNightlyFor('Albany', 'NY', 10)).toBeNull();
    const ten = airbnbNightlyFor('Oakland', 'CA', 10);
    expect(ten.bucket).toBe('9+');
    expect(ten.low).toBeGreaterThan(airbnbNightlyFor('Oakland', 'CA', 4).low);
  });

  test('the slugs that repeat their own state are matchable', () => {
    // Inside Airbnb's directories are washington-dc, salem-or,
    // clark-county-nv and twin-cities-msa. Title-cased raw they became
    // "Washington Dc", "Salem Or", "Clark County Nv" and "Twin Cities Msa" —
    // four regions no host would ever type.
    expect(airbnbNightlyFor('Washington', 'DC', 4)).toBeTruthy();
    expect(airbnbNightlyFor('Salem', 'OR', 4)).toBeTruthy();
    expect(airbnbNightlyFor('Clark County', 'NV', 4)).toBeTruthy();
    expect(airbnbNightlyFor('Twin Cities', 'MN', 4)).toBeTruthy();
    const trailing = AIRBNB_NIGHTLY
      .filter(([c, st]) => new RegExp(`\\s${st}$`, 'i').test(c))
      .map(([c, st]) => `${c}, ${st}`);
    expect(trailing).toEqual([]);
  });
});

describe('what it refuses', () => {
  test('a city outside the 34 gets nothing, not its neighbour’s listings', () => {
    // Annapolis is 30 miles from Washington and is not Washington.
    // SACRAMENTO, deliberately. The first version used only Annapolis and
    // Santa Fe — neither MD nor NM is a covered state, so a fallback that
    // substituted "any city in the same state" still returned null and
    // red-proofing it PASSED. Sacramento is absent while seven other
    // California cities are present, so a state-level substitution has
    // somewhere wrong to land.
    expect(airbnbNightlyFor('Sacramento', 'CA', 8)).toBeNull();
    expect(airbnbNightlyFor('San Francisco', 'CA', 8)).toBeTruthy();
    expect(airbnbNightlyFor('Annapolis', 'MD', 8)).toBeNull();
    expect(airbnbNightlyFor('Santa Fe', 'NM', 8)).toBeNull();
    expect(airbnbCoveredCities()).toHaveLength(34);
  });

  test('no state, no band', () => {
    for (const s of [null, undefined, '', 'California', 7, {}]) {
      expect({ [String(s)]: airbnbNightlyFor('San Francisco', s, 4) })
        .toEqual({ [String(s)]: null });
    }
  });
});

describe('the words that reach a host', () => {
  test('every basis carries the CC BY attribution — it is a licence condition', () => {
    let checked = 0;
    for (const [city, st, , buckets] of AIRBNB_NIGHTLY) {
      for (const b of Object.keys(buckets)) {
        const sleeps = b === '9+' ? 12 : Number(b);
        const r = airbnbNightlyFor(city, st, sleeps);
        if (!r) continue;
        checked += 1;
        expect(r.basis).toContain(INSIDE_AIRBNB_ATTRIBUTION);
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  test('every basis says asking, and says the fees are NOT in it', () => {
    const r = airbnbNightlyFor('San Francisco', 'CA', 8);
    expect(r.basis).toMatch(/asking prices, not what anyone paid/i);
    expect(r.basis).toMatch(/before cleaning and service fees/i);
    expect(r.basis).not.toMatch(/\b(total|all-in|quote|you will pay)\b/i);
  });

  test('the host line names the fee exclusion and fits a phone', () => {
    // The exclusion is the part that would otherwise make the number
    // quietly wrong in the host's favour, so it cannot be dropped for
    // brevity.
    const n = airbnbNightlyNote('San Francisco', 'CA', 8);
    expect(n).toMatch(/before cleaning fees/);
    expect(n).toContain('$436');
    expect(n.length).toBeLessThanOrEqual(120);
    expect(airbnbNightlyNote('Annapolis', 'MD', 8)).toBeNull();
  });
});
