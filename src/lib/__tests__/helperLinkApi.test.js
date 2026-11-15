// ─── THE HELPER LINK CLIENT NAMES ITS FAILURES AND NEVER THROWS INTO THE UI ──
//
// Mirrors vendorBriefApi.test.js. The helper link is FREE (owner ruling
// 11/15/2026), so unlike the brief there is no 402 kind: nothing here may ever
// read "pass-required".
const API = 'https://helper-mock.invalid';
const CODE = 'abcdefghij1234567890xy';
const reply = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('helper link client — not configured', () => {
  let mod;
  beforeEach(() => { delete process.env.REACT_APP_API_BASE_URL; jest.isolateModules(() => { mod = require('../api/helperLink'); }); });

  test('nothing is fetched and nothing throws', async () => {
    global.fetch = jest.fn();
    expect(mod.isHelperLinkApiConfigured()).toBe(false);
    await expect(mod.mintHelperLinkResult('e1', 'Jordan Avery')).resolves.toEqual({ ok: false, kind: 'not-configured', status: null });
    await expect(mod.fetchPublicHelperLink(CODE)).resolves.toBeNull();
    await expect(mod.fetchHelperConfirmations('e1')).resolves.toEqual([]);
    await expect(mod.submitHelperAnswer(CODE, { state: 'confirmed' })).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
    delete global.fetch;
  });
});

describe('helper link client — configured', () => {
  let mod;
  beforeEach(() => {
    process.env.REACT_APP_API_BASE_URL = API;
    jest.isolateModules(() => { mod = require('../api/helperLink'); });
  });
  afterEach(() => { delete process.env.REACT_APP_API_BASE_URL; delete global.fetch; });

  test('a mint posts only the helper name and returns the code', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, code: CODE, helper_key: 'g1' }));
    const r = await mod.mintHelperLinkResult('e 1', 'Jordan Avery');
    expect(r).toEqual({ ok: true, code: CODE, helperKey: 'g1' });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(API + '/api/events/e%201/helper-links');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ helper_name: 'Jordan Avery' });
  });

  test('each failure has its own kind — never a code, never pass-required', async () => {
    for (const [status, kind] of [[401, 'signed-out'], [404, 'not-found'], [500, 'failed'], [402, 'failed']]) {
      global.fetch = jest.fn(async () => reply(status, { detail: 'x' }));
      // eslint-disable-next-line no-await-in-loop
      const r = await mod.mintHelperLinkResult('e1', 'Jordan Avery');
      expect(r).toEqual({ ok: false, kind, status });
      expect(global.fetch).toHaveBeenCalledTimes(1);   // an HTTP answer is not retried
    }
  });

  test('a network failure is retried once, then named', async () => {
    global.fetch = jest.fn(async () => { throw new TypeError('Failed to fetch'); });
    await expect(mod.mintHelperLinkResult('e1', 'Jordan Avery')).resolves.toEqual({ ok: false, kind: 'network', status: null });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('a 2xx with no code is a failure, not a link', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true }));
    await expect(mod.mintHelperLinkResult('e1', 'Jordan Avery')).resolves.toEqual({ ok: false, kind: 'failed', status: 200 });
  });

  test('the public resolve returns the helper payload, or null on any failure', async () => {
    const helper = { helperName: 'Jordan Avery', jobs: [{ kind: 'task', label: 'Bring chairs' }] };
    global.fetch = jest.fn(async () => reply(200, { ok: true, helper }));
    await expect(mod.fetchPublicHelperLink(CODE)).resolves.toEqual(helper);
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/public/helper/' + CODE);
    global.fetch = jest.fn(async () => reply(404, { detail: 'helper link not found' }));
    await expect(mod.fetchPublicHelperLink(CODE)).resolves.toBeNull();
    global.fetch = jest.fn(async () => { throw new TypeError('offline'); });
    await expect(mod.fetchPublicHelperLink(CODE)).resolves.toBeNull();
  });

  test('an answer posts to /answer and THROWS on failure, so the page never fakes success', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, submitted_at: '2026-11-20T12:00:00Z' }));
    await expect(mod.submitHelperAnswer(CODE, { idempotency_key: 'k', state: 'declined', note: 'Away' }))
      .resolves.toEqual({ ok: true, submitted_at: '2026-11-20T12:00:00Z' });
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/public/helper/' + CODE + '/answer');
    global.fetch = jest.fn(async () => reply(500, { detail: 'nope' }));
    await expect(mod.submitHelperAnswer(CODE, { idempotency_key: 'k', state: 'confirmed' })).rejects.toMatchObject({ status: 500 });
  });

  test('the host read-back returns rows, or [] on any failure', async () => {
    const rows = [{ helper_key: 'g1', state: 'confirmed', note: null }];
    global.fetch = jest.fn(async () => reply(200, rows));
    await expect(mod.fetchHelperConfirmations('e1')).resolves.toEqual(rows);
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/events/e1/helper-confirmations');
    global.fetch = jest.fn(async () => reply(401, {}));
    await expect(mod.fetchHelperConfirmations('e1')).resolves.toEqual([]);
  });

  test('the idempotency key is stable per code', () => {
    const a = mod.helperIdempotencyKey(CODE);
    expect(a).toBeTruthy();
    expect(mod.helperIdempotencyKey(CODE)).toBe(a);
    expect(mod.helperIdempotencyKey('another-code-123456789')).not.toBe(a);
  });
});
