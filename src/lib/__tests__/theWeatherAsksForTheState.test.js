// THE WEATHER LOOKUP NAMES THE STATE (11/18/2026). Probed live, the geocoder
// with limit=1 placed "Abbeville, LA, US" in Alabama. The store finder already
// sends `state`; the weather lookup now does the same for a "City, ST" query,
// so the server keeps only a match in that state.
describe('geocodeVenue', () => {
  let geocodeVenue;
  const calls = [];
  beforeAll(() => {
    process.env.REACT_APP_API_BASE_URL = 'https://api.test.invalid';
    jest.isolateModules(() => { ({ geocodeVenue } = require('../weather')); });
  });
  // CRA's jest runs resetMocks before every test, so the fake fetch is made per test.
  beforeEach(() => {
    calls.length = 0;
    global.fetch = jest.fn(async (url) => { calls.push(url); return { ok: true, json: async () => ({ result: { lat: 30, lon: -92 } }) }; });
  });

  test('a "City, ST, US" query sends the state', async () => {
    await geocodeVenue('Abbeville, LA, US');
    expect(calls[0]).toContain('&state=LA');
  });

  test('a "City, ST" query sends the state', async () => {
    await geocodeVenue('Silver Spring, MD');
    expect(calls[0]).toContain('&state=MD');
  });

  test('a street address or a venue name sends no state', async () => {
    await geocodeVenue('1600 Pennsylvania Ave NW');
    await geocodeVenue("Vida's");
    expect(calls.some((u) => u.includes('&state='))).toBe(false);
  });
});
