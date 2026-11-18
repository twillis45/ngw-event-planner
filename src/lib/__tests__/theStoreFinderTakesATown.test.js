// THE STORE FINDER TAKES A TOWN (owner, 11/18/2026: "Zip input should also
// take city state and use the other city state lookup list we use in the app").
// A "City, ST" (the shape the app's city list emits) is geocoded with its state
// enforced, then stores are found near that point. A ZIP works as before.
let sp;
const OLD = process.env.REACT_APP_API_BASE_URL;
beforeAll(() => {
  jest.resetModules();
  process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
  // eslint-disable-next-line global-require
  sp = require('../storePrices');
});
afterAll(() => { process.env.REACT_APP_API_BASE_URL = OLD; });
afterEach(() => { delete global.fetch; });

const STORES = { configured: true, locations: [{ locationId: '09700398', name: 'Harris Teeter - Old Town Alexandria', address: '735 N Saint Asaph St' }] };
const route = (geo) => {
  const urls = [];
  global.fetch = jest.fn(async (url) => {
    urls.push(String(url));
    if (/\/api\/weather\/geocode/.test(url)) return { ok: true, json: async () => ({ ok: true, result: geo }) };
    return { ok: true, json: async () => STORES };
  });
  return urls;
};

test('a ZIP goes straight to the store search, as before', async () => {
  const urls = route(null);
  const r = await sp.nearbyStores('20744');
  expect(urls).toHaveLength(1);
  expect(urls[0]).toMatch(/kroger\/locations\?zip=20744/);
  expect(r.stores).toHaveLength(1);
});

test('"Fort Washington, MD" is placed with its state enforced, then stores are found near it', async () => {
  const urls = route({ lat: 38.7254674, lon: -76.9900251, name: 'Fort Washington', state: 'Maryland' });
  const r = await sp.nearbyStores('Fort Washington, MD');
  expect(urls[0]).toMatch(/\/api\/weather\/geocode\?q=Fort%20Washington%2C%20MD%2C%20US&state=MD/);
  expect(urls[1]).toMatch(/kroger\/locations\?lat=38\.7254674&lon=-76\.9900251/);
  expect(r.stores[0].locationId).toBe('09700398');
});

test('a town the geocoder cannot place in its state says so, and asks for nothing else', async () => {
  const urls = route(null);
  const r = await sp.nearbyStores('Abbeville, OR');
  expect(r.reason).toBe('no-place');
  expect(urls).toHaveLength(1);
});

test('a bare town with no state is not guessed at', async () => {
  const urls = route({ lat: 1, lon: 2 });
  const r = await sp.nearbyStores('Springfield');
  expect(r.reason).toBe('no-zip');
  expect(urls).toHaveLength(0);
});

test('parsePlace reads the shapes the city list and a host produce', () => {
  expect(sp.parsePlace('20744')).toEqual({ zip: '20744' });
  expect(sp.parsePlace(' Oxon Hill, md ')).toEqual({ city: 'Oxon Hill', state: 'MD' });
  expect(sp.parsePlace('Springfield')).toBeNull();
  expect(sp.parsePlace('2074')).toBeNull();
});
