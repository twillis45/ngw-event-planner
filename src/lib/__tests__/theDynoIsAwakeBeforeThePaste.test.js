// THE FIRST PASTE OF A SESSION FAILED, AND THE APP BLAMED ITSELF.
//
// Host, 2026-09-29, mid-demo: "demo airbnb paste. not working."
//
// Measured 2026-09-30: the Render free dyno answers /health in 32.7 SECONDS
// cold. UNFURL_MS is 12s. So the very first read of a session aborts, and the
// surface tells the host reading listings "isn't switched on here" — which is
// false. It is switched on; it is asleep.
//
// The fix is not a longer timeout (a host watching a 33-second spinner reads
// it as broken, which is the thing UNFURL_MS exists to prevent). It is to pay
// the cold start EARLY, when the host opens the surface and is still reading,
// long before they have a link in hand.
//
// What this gate holds: it fires, it hits /health on the configured base, it
// fires at most ONCE, and it is silent — a rejected fetch must never surface
// as an error, because the real call still runs its own timeout and still
// says the honest thing if the backend is genuinely down.
describe('the warm-up ping', () => {
  const OLD = process.env.REACT_APP_API_BASE_URL;
  let calls;

  beforeEach(() => {
    jest.resetModules();
    calls = [];
    global.fetch = jest.fn((u) => { calls.push(String(u)); return Promise.resolve({ ok: true }); });
  });
  afterEach(() => { process.env.REACT_APP_API_BASE_URL = OLD; });

  const load = (base) => {
    if (base === undefined) delete process.env.REACT_APP_API_BASE_URL;
    else process.env.REACT_APP_API_BASE_URL = base;
    // eslint-disable-next-line global-require
    return require('../lodgingIntel');
  };

  test('hits /health on the configured backend', () => {
    const { warmUnfurl } = load('https://ngw-events-api.example.com');
    expect(warmUnfurl()).toBe(true);
    expect(calls).toEqual(['https://ngw-events-api.example.com/health']);
  });

  test('fires ONCE — a warm dyno costs one 200, not one per render', () => {
    const { warmUnfurl } = load('https://ngw-events-api.example.com');
    warmUnfurl(); warmUnfurl(); warmUnfurl();
    expect(calls.length).toBe(1);
  });

  test('does nothing where no backend is configured — no request, no throw', () => {
    const { warmUnfurl } = load(undefined);
    expect(warmUnfurl()).toBe(false);
    expect(calls.length).toBe(0);
  });

  test('a rejected ping is SILENT — it can never become an error the host sees', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('dyno asleep')));
    const { warmUnfurl } = load('https://ngw-events-api.example.com');
    expect(() => warmUnfurl()).not.toThrow();
    // An unhandled rejection here would fail the process, not this assertion —
    // giving the microtask queue a turn is what actually proves it is caught.
    await Promise.resolve();
    await Promise.resolve();
  });

  test('a fetch that THROWS synchronously is silent too', () => {
    global.fetch = jest.fn(() => { throw new Error('blocked'); });
    const { warmUnfurl } = load('https://ngw-events-api.example.com');
    expect(() => warmUnfurl()).not.toThrow();
  });
});
