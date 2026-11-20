// The app emails a helper their job (owner, 11/20/2026). The client never
// claims more than the server said: only { ok: true, status: 'accepted' } is a
// success, and every refusal names itself (lib/api/helperLink emailHelperJob).
jest.mock('../../apiAuth', () => ({ authHeaders: async () => ({ 'Content-Type': 'application/json' }) }));

const load = () => {
  jest.resetModules();
  process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
  return require('../helperLink');
};
const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: async () => body });

describe('emailHelperJob', () => {
  afterEach(() => { delete global.fetch; });

  test('posts the helper’s NAME only, to the event’s route, once', async () => {
    const { emailHelperJob } = load();
    global.fetch = jest.fn(() => reply(200, { ok: true, status: 'accepted', message_id: '7' }));
    await expect(emailHelperJob('ev 1', 'Jordan Lee')).resolves.toEqual({ ok: true, status: 'accepted' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/events/ev%201/helper-links/email');
    expect(JSON.parse(init.body)).toEqual({ helper_name: 'Jordan Lee' });
  });

  test('a 200 that says failed is a failure, not a send', async () => {
    const { emailHelperJob } = load();
    global.fetch = jest.fn(() => reply(200, { ok: false, status: 'failed', message_id: '7' }));
    await expect(emailHelperJob('ev1', 'Jordan')).resolves.toEqual({ ok: false, kind: 'failed', status: 200 });
  });

  test.each([[401, 'signed-out'], [403, 'refused'], [404, 'not-found'], [409, 'unsaved'], [410, 'stopped'],
    [422, 'no-email'], [429, 'capped'], [500, 'failed']])('%s → %s, and no retry', async (status, kind) => {
    const { emailHelperJob } = load();
    global.fetch = jest.fn(() => reply(status, { detail: 'x' }));
    await expect(emailHelperJob('ev1', 'Jordan')).resolves.toEqual({ ok: false, kind, status });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('a dropped connection is not retried (a second POST could send twice)', async () => {
    const { emailHelperJob } = load();
    global.fetch = jest.fn(() => Promise.reject(new TypeError('offline')));
    await expect(emailHelperJob('ev1', 'Jordan')).resolves.toEqual({ ok: false, kind: 'network', status: null });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('helperEmailWords: the button says what it does, and never "Sent" on a failure', () => {
  const { helperEmailWords } = load();
  test('idle and busy', () => {
    expect(helperEmailWords('Jordan', null)).toEqual({ button: 'Email Jordan their job', line: null });
    expect(helperEmailWords('Jordan', { busy: true }).button).toBe('Emailing Jordan…');
  });
  test('accepted says accepted, not delivered', () => {
    const w = helperEmailWords('Jordan', { ok: true, status: 'accepted' });
    expect(w.line).toMatch(/accepted/);
    expect(w.line).not.toMatch(/delivered|Sent/);
    expect(w.tone).toBe('ok');
  });
  test.each(['failed', 'signed-out', 'refused', 'not-found', 'unsaved', 'stopped', 'no-email', 'capped', 'network', 'something-new'])(
    '%s says it didn’t go out', (kind) => {
      const w = helperEmailWords('Jordan', { ok: false, kind });
      expect(w.line).toMatch(/The email didn’t go out\.$/);
      expect(w.line).not.toMatch(/\bSent\b|accepted/);
      expect(w.tone).toBe('danger');
    });
});

describe('messageEmailResult: the message route’s answer, read the same way', () => {
  const { messageEmailResult } = require('../../appEmail');
  test('only an accepted delivery is a success', () => {
    expect(messageEmailResult({ metadata: { delivery: { status: 'accepted' } } })).toEqual({ ok: true });
    expect(messageEmailResult({ metadata: { delivery: { status: 'failed', error: 'x' } } })).toEqual({ ok: false, kind: 'failed' });
    expect(messageEmailResult({ id: 1 })).toEqual({ ok: false, kind: 'failed' });
  });
  test.each([[429, 'capped'], [403, 'refused'], [410, 'stopped'], [401, 'signed-out'], [500, 'failed']])('→ %s is %s', (st, kind) => {
    expect(messageEmailResult(null, new Error(`Comm API POST /x → ${st}`))).toEqual({ ok: false, kind });
  });
  test('a thrown fetch is a network failure', () => {
    expect(messageEmailResult(null, new TypeError('Failed to fetch'))).toEqual({ ok: false, kind: 'network' });
  });
});
