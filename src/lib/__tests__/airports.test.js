// ─── Airports reference proof (host directives 2026-07-28) ───────────────────
const { AIRPORTS, nearestAirports, airportSearch, airportByCodeOrName, distanceMiles } = require('../airports');

describe('airports reference', () => {
  test('dataset is well-formed: unique 3-letter codes, real coordinates', () => {
    const codes = AIRPORTS.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const a of AIRPORTS) {
      expect(a.code).toMatch(/^[A-Z]{3}$/);
      expect(Math.abs(a.lat)).toBeLessThanOrEqual(72);
      expect(Math.abs(a.lon)).toBeLessThanOrEqual(180);
      expect(a.name.length).toBeGreaterThan(3);
    }
  });

  test('nearest to Deep Creek Lake, MD is the real drive set (MGW/PIT region)', () => {
    // McHenry, MD ≈ 39.56, -79.36
    const near = nearestAirports(39.56, -79.36, 3).map((a) => a.code);
    expect(near[0]).toBe('MGW');                    // ~35 mi straight-line
    expect(near).toContain('PIT');                  // the major within reach
    const withD = nearestAirports(39.56, -79.36, 3);
    expect(withD[0].distanceMi).toBeLessThan(60);
    expect(withD.every((a, i, arr) => i === 0 || a.distanceMi >= arr[i - 1].distanceMi)).toBe(true);
  });

  test('nearest to Pensacola Beach is PNS then the panhandle set', () => {
    const near = nearestAirports(30.33, -87.14, 3).map((a) => a.code);
    expect(near[0]).toBe('PNS');
  });

  test('search: code prefix beats name substring; both work', () => {
    expect(airportSearch('bw')[0].code).toBe('BWI');
    expect(airportSearch('baltimore')[0].code).toBe('BWI');
    expect(airportSearch('dulles')[0].code).toBe('IAD');
    expect(airportSearch('')).toEqual([]);
    expect(airportSearch('zzzz')).toEqual([]);
  });

  test('exact resolve autofills either direction', () => {
    expect(airportByCodeOrName('bwi').name).toMatch(/Baltimore/);
    expect(airportByCodeOrName('Pittsburgh Intl').code).toBe('PIT');
    expect(airportByCodeOrName('nope')).toBe(null);
  });

  test('distance math sanity: BWI→IAD is ~50 straight-line miles', () => {
    const d = distanceMiles(39.1754, -76.6683, 38.9445, -77.4558);
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(60);
  });
});

// ─── THE DERIVED "WORTH KNOWING" NOTE (host DIFM directive 2026-07-28) ───────
describe('the airport tradeoff the app can compute for itself', () => {
  const { airportTradeoff } = require('../airports');
  // Deep Creek Lake, MD — the running fixture for this engine.
  const LAT = 39.52, LON = -79.30;

  test('it states the distance it can actually measure', () => {
    const t = airportTradeoff({ code: 'PIT' }, LAT, LON, ['PIT']);
    expect(t.text).toMatch(/^\d+ miles as the crow flies/);
    expect(t.why).toMatch(/measured from the event location/);
  });

  test('it never claims flights or fares — the things it cannot know', () => {
    const t = airportTradeoff({ code: 'PIT' }, LAT, LON, ['PIT', 'BWI', 'IAD']);
    expect(t.text).not.toMatch(/flight|fare|cheap|price|\$|drive time/i);
  });

  test('it ranks against the airports SHE listed, not all 119', () => {
    const codes = ['PIT', 'BWI', 'IAD'];
    const notes = codes.map((c) => airportTradeoff({ code: c }, LAT, LON, codes));
    const closest = notes.filter((n) => /the closest of the ones you listed/.test(n.text));
    expect(closest).toHaveLength(1);
  });

  test('one airport alone gets distance and no comparison', () => {
    const t = airportTradeoff({ code: 'BWI' }, LAT, LON, ['BWI']);
    expect(t.text).toMatch(/miles as the crow flies/);
    expect(t.text).not.toMatch(/closest|farther/);
  });

  test('it says "as the crow flies" — a straight line is not a drive', () => {
    expect(airportTradeoff({ code: 'BWI' }, LAT, LON, ['BWI']).text).toMatch(/crow flies/);
  });

  test('unplaceable input yields null, never a guess', () => {
    expect(airportTradeoff(null, LAT, LON, [])).toBeNull();
    expect(airportTradeoff({ code: 'ZZZ' }, LAT, LON, [])).toBeNull();
    expect(airportTradeoff({ code: 'BWI' }, NaN, LON, [])).toBeNull();
  });
});
