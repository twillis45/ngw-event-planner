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

// ── THE GAP THIS FILE LEFT OPEN FOR A DAY ──────────────────────────────────
// The tests above assert THAT it retries and that only a timeout retries.
// They say nothing about HOW LONG the first attempt waits, which is the whole
// substance of the 2026-10-03 fix: the first cut gave both attempts the full
// 12s and quadrupled every timeout path, taking the matrix from 35 minutes to
// 72 with ZERO failures — green, and a hard CI kill waiting, because the
// shards carry timeout-minutes: 30.
//
// So the only thing standing between a revert and that same silent 4x was a
// duration in a commit message. It is a gate now.
//
// FAKE TIMERS, so it costs no wall clock. Jest 27 has no
// advanceTimersByTimeAsync, so microtasks are flushed by hand between
// advances — the promise chain inside once() has to run before the next tick.
describe('the probe waits a probe’s time, not a full timeout', () => {
  const realFetch = global.fetch;
  let calls;

  const flush = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };
  // Never resolves on its own: the ONLY way out is the abort, which is exactly
  // the cold-start shape. Each call records itself so the count is the probe.
  const hangingFetch = () => jest.fn((_u, opts) => new Promise((_res, rej) => {
    calls += 1;
    if (opts && opts.signal) {
      opts.signal.addEventListener('abort',
        () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }
  }));

  beforeEach(() => { jest.useFakeTimers(); calls = 0; global.fetch = hangingFetch(); });
  afterEach(() => { jest.useRealTimers(); global.fetch = realFetch; });

  test('the FIRST attempt aborts at 5s — not 12', async () => {
    const p = lodgingResults(URL_);
    await flush();
    expect(calls).toBe(1);

    // Nothing may be retried before the probe is spent.
    jest.advanceTimersByTime(4999);
    await flush();
    expect(calls).toBe(1);

    jest.advanceTimersByTime(2);          // 5001ms total
    await flush();
    expect(calls).toBe(2);                // probe aborted, retry went out

    jest.advanceTimersByTime(12001);      // let the retry end so nothing hangs
    await flush();
    await p;
  });

  test('the RETRY gets the full 12s, because by then the dyno is awake', async () => {
    const p = lodgingResults(URL_);
    await flush();
    jest.advanceTimersByTime(5001);       // probe spent, retry issued
    await flush();
    expect(calls).toBe(2);

    // A second 5s must NOT be enough. If the retry were also probe-length this
    // is exactly where it would settle, so the sentinel is the assertion.
    jest.advanceTimersByTime(5001);
    await flush();
    const SENTINEL = Symbol('pending');
    const early = await Promise.race([p, Promise.resolve(SENTINEL)]);
    expect(early).toBe(SENTINEL);

    jest.advanceTimersByTime(7000);       // 12001ms into the retry
    await flush();
    const r = await p;
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/taking too long/i);
  });

  // The retry's timer does not EXIST until the probe's abort has been handled,
  // so the budget has to be spent in two steps. One 17001ms jump fires the
  // probe and then sits forever waiting on a timer nothing has scheduled yet —
  // which is how the first draft of this test hung rather than failed.
  test('a cold wake costs 5s + 12s, never 12s + 12s', async () => {
    const p = lodgingResults(URL_);
    await flush();
    jest.advanceTimersByTime(5001);
    await flush();
    // Assert the retry EXISTS before awaiting anything, so a regression fails
    // on this line instead of hanging until jest's own 5s timeout — a hung
    // test reads as a mystery in CI and costs five seconds to say nothing.
    expect(calls).toBe(2);
    jest.advanceTimersByTime(12001);
    await flush();
    const r = await p;
    expect(r.ok).toBe(false);
  });
});
