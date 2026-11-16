// ─── A TOWN FINDS ITS MARKET (11/16/2026) ────────────────────────────────────
// "Which market" read "National baseline" for Alexandria, VA (HANDOFF item):
// no city-to-metro table existed. The state decides as much as the city.
import { metroForPlace } from '../metroForPlace';
import { METRO_MARKETS } from '../vendorEstimator';

test.each([
  ['Alexandria', 'VA', 'dc'], ['Washington', 'DC', 'dc'], ['Bethesda', 'MD', 'dc'], ['Greenbelt', 'MD', 'dc'],
  ['Brooklyn', 'NY', 'nyc'], ['Jersey City', 'NJ', 'nyc'], ['Decatur', 'GA', 'atl'], ['Oakland', 'CA', 'sf'],
  ['Fort Worth', 'TX', 'dal'], ['Overland Park', 'KS', 'kc'], ['St. Louis', 'MO', 'stl'], ['  santa monica ', 'ca', 'la'],
])('%s, %s → %s', (city, state, id) => {
  expect(metroForPlace({ city, state })).toBe(id);
});

test.each([
  ['Alexandria', 'LA'], ['Arlington', 'MA'], ['Portland', 'ME'], ['Springfield', 'IL'], ['Columbia', 'MD'],
  ['Asheville', 'NC'], ['Alexandria', ''], ['', 'VA'],
])('not listed or no state → null: %s, %s', (city, state) => {
  expect(metroForPlace({ city, state })).toBe(null);
});

test('every id it can return is a real market', () => {
  const ids = new Set(METRO_MARKETS.map((m) => m.id));
  for (const [c, s] of [['Alexandria', 'VA'], ['Brooklyn', 'NY'], ['Tampa', 'FL'], ['Carmel', 'IN']]) {
    expect(ids.has(metroForPlace({ city: c, state: s }))).toBe(true);
  }
});
