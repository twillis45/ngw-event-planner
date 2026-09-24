// ─── THE PRICE HAS TO ARRIVE WITH ITS ROW, OR THE SERVER CANNOT KEEP IT ──────
//
// The server records a KAS observation per real shelf price, so the corpus can
// be re-verified from prices hosts already fetch rather than from a scheduled
// scrape. It refuses to record one unless the line names the corpus row it
// belongs to — matching a free-text product name back to `p_ice` by string
// would be a guess, the same guess `geoItemMap` refuses to make.
//
// So the whole feature hinges on two optional fields reaching the wire. If
// `purchaseId` or `assetId` silently stop being sent, nothing breaks, nothing
// errors, no test fails, and the corpus quietly stops learning — which is
// exactly how the prices came to be discarded in the first place. This is the
// guard for that.
//
// It asserts on the REQUEST BODY, not on a mock's arguments: the body is the
// contract the Python side parses, and `backend/tests/test_kroger_price_observations.py`
// holds the other half of it.
import { storePrices } from '../storePrices';

const LINES = [
  { name: 'Ice (for chilling + drinks)', id: 'p_ice' },
  { name: 'Ribs (racks)', id: 'p_protein' },
];

const captureBody = async (fn) => {
  let body = null;
  global.fetch = jest.fn(async (_url, init) => {
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ configured: true, results: [] }) };
  });
  await fn();
  return body;
};

describe('what reaches the wire', () => {
  const OLD = process.env.REACT_APP_API_BASE_URL;
  afterEach(() => { process.env.REACT_APP_API_BASE_URL = OLD; delete global.fetch; });

  test('NO STORE, NO CALL — a price without a location is not a shelf price', async () => {
    global.fetch = jest.fn();
    const r = await storePrices(LINES, '', 'Get-Together');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(r.results).toEqual([]);
  });
});

// The body-shape assertions need a configured module. `BASE` is captured at
// import time from the environment, so the module is re-imported with one set —
// done in an isolated registry so no other suite inherits it.
describe('THE ATTRIBUTION FIELDS, on a configured build', () => {
  let sp;
  beforeAll(() => {
    jest.resetModules();
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
    // eslint-disable-next-line global-require
    sp = require('../storePrices');
  });
  afterEach(() => { delete global.fetch; });

  test('each line carries its corpus row id as `purchaseId`', async () => {
    const body = await captureBody(() => sp.storePrices(LINES, '01400376', 'Get-Together'));
    expect(body.items.map((i) => i.purchaseId)).toEqual(['p_ice', 'p_protein']);
  });

  test('the playbook type travels as `assetId`', async () => {
    const body = await captureBody(() => sp.storePrices(LINES, '01400376', 'Get-Together'));
    expect(body.assetId).toBe('Get-Together');
  });

  test('`name` is STILL the plan text — attribution must not change the key', async () => {
    // priceLayers indexes the response by `name`. If adding attribution ever
    // rewrote it, every price would match nothing and the visible feature would
    // break to buy an invisible one.
    const body = await captureBody(() => sp.storePrices(LINES, '01400376', 'Get-Together'));
    expect(body.items.map((i) => i.name)).toEqual([
      'Ice (for chilling + drinks)', 'Ribs (racks)',
    ]);
  });

  test('A LINE WITH NO ID IS SENT UNATTRIBUTED, not guessed', async () => {
    const body = await captureBody(() => sp.storePrices(
      [{ name: 'Something a host typed' }], '01400376', 'Get-Together',
    ));
    expect(body.items[0].name).toBe('Something a host typed');
    expect('purchaseId' in body.items[0]).toBe(false);
  });

  test('and with no assetId the key is ABSENT rather than empty', async () => {
    // The server treats a missing assetId as "do not record". An empty string
    // would be a value, and a slugged empty string is a valid-looking id.
    const body = await captureBody(() => sp.storePrices(LINES, '01400376', ''));
    expect('assetId' in body).toBe(false);
  });

  test('NOTHING ABOUT THE HOST TRAVELS', async () => {
    // kas_records is declared "no host data, no PII", and the browser is where
    // host data actually lives — so the boundary is asserted on this side too.
    const body = await captureBody(() => sp.storePrices(LINES, '01400376', 'Get-Together'));
    const blob = JSON.stringify(body).toLowerCase();
    for (const forbidden of ['eventid', 'zip', 'email', 'userid', 'guestcount', 'venue']) {
      expect(blob).not.toContain(forbidden);
    }
  });
});
