// The first pull of a session must not be spent on a failure.
//
// Driven on prod 2026-10-02 23:12: the first pull came back "Reading that
// search is taking too long. Open it and copy the page instead", and the same
// pull worked immediately afterwards. The endpoint is not slow — measured
// three times right after at 1.45-1.59s with 18 of 18 priced. The backend had
// been idle through a 35-minute matrix, Render's free tier spins down, and
// waking it costs far more than the 12s abort.
//
// That is the first pull of somebody's morning, on the path that now carries
// the prices, and it was sending them away to copy the page by hand.
// API_BASE is read at MODULE LOAD, so it has to exist before the import or
// lodgingResults returns "reading searches isn't switched on here" and every
// test below passes over a function that never ran.
process.env.REACT_APP_API_BASE_URL = 'https://example.test';
const { lodgingResults, unfurlListing } = require('../lodgingIntel');

const abort = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
const URL_ = 'https://www.airbnb.com/s/Santa-Fe--NM/homes?adults=10';

describe('a cold backend costs one call, not the feature', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  test('a timeout is retried once, and the retry is what the host sees', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      if (calls === 1) throw abort();          // cold instance, still waking
      return { ok: true, json: async () => ({ ok: true, count: 2, priced: 2,
        places: [{ url: 'u1', totalPrice: 100 }, { url: 'u2', totalPrice: 200 }] }) };
    });
    const r = await lodgingResults(URL_);
    expect(calls).toBe(2);
    expect(r.ok).toBe(true);
    expect(r.priced).toBe(2);
  });

  test('two timeouts is really too slow, and says so', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => { calls += 1; throw abort(); });
    const r = await lodgingResults(URL_);
    expect(calls).toBe(2);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/taking too long/i);
  });

  // ── THE HALF THAT MATTERS MORE ────────────────────────────────────────
  // A refusal is a real answer. Retrying it would be hammering a server that
  // already said no, against a host that blocks datacenter traffic — the way
  // one refusal becomes a blocked IP.
  test('a refusal is NOT retried', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      return { ok: false, status: 502, json: async () => ({ detail: 'The site declined an automated read.' }) };
    });
    const r = await lodgingResults(URL_);
    expect(calls).toBe(1);
    expect(r.ok).toBe(false);
  });

  test('an unreachable host is NOT retried', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => { calls += 1; throw new Error('network down'); });
    const r = await lodgingResults(URL_);
    expect(calls).toBe(1);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Couldn’t reach that search/i);
  });

  test('a first-time success costs exactly one call', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      return { ok: true, json: async () => ({ ok: true, count: 1, priced: 1, places: [{ url: 'u', totalPrice: 50 }] }) };
    });
    const r = await lodgingResults(URL_);
    expect(calls).toBe(1);
    expect(r.ok).toBe(true);
  });
});

// ── THE OTHER PATH, LEFT EXPOSED FOR A DAY ─────────────────────────────────
// /results was fixed on 2026-10-02 and unfurlListing was not, on the reasoning
// that one listing is worth less than the whole search. The mechanism is the
// same cold dyno and the same 12s abort, so a host whose first action of the
// day is reading ONE listing got the same false "too slow" — from the request
// that woke the server.
describe('one listing gets the same patience as a whole search', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });
  const LISTING = 'https://www.airbnb.com/rooms/12345';

  test('a timeout is retried once, and the retry is what the host sees', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      if (calls === 1) throw abort();          // cold instance, still waking
      return { ok: true, json: async () => ({ ok: true, name: 'Casa Verde', pricePerNight: 310 }) };
    });
    const r = await unfurlListing(LISTING);
    expect(calls).toBe(2);
    expect(r.ok).toBe(true);
    expect(r.name).toBe('Casa Verde');
  });

  test('two timeouts keeps the link and says so', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => { calls += 1; throw abort(); });
    const r = await unfurlListing(LISTING);
    expect(calls).toBe(2);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/taking too long/i);
    expect(r.reason).toMatch(/kept the link/i);
  });

  test('a refusal is NOT retried', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      return { ok: false, status: 502, json: async () => ({ detail: 'The site declined an automated read.' }) };
    });
    const r = await unfurlListing(LISTING);
    expect(calls).toBe(1);
    expect(r.ok).toBe(false);
  });

  test('an unreachable host is NOT retried', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => { calls += 1; throw new Error('network down'); });
    const r = await unfurlListing(LISTING);
    expect(calls).toBe(1);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Couldn’t reach the listing/i);
  });

  test('a first-time success costs exactly one call', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      return { ok: true, json: async () => ({ ok: true, name: 'Adobe House' }) };
    });
    const r = await unfurlListing(LISTING);
    expect(calls).toBe(1);
    expect(r.ok).toBe(true);
  });
});
