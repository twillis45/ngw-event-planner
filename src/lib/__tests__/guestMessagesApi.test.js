// ─── THE GUEST QUESTIONS CLIENT NAMES ITS FAILURES ───────────────────────────
//
// Mirrors helperLinkApi.test.js. Guest questions are FREE (owner ruling
// 11/16/2026): nothing here may ever read "pass-required". Writes THROW so a
// page never shows "Sent to your host" for a message the server refused; reads
// return a named result so a refused request is never shown as an empty inbox.
jest.mock('../apiAuth', () => ({ authHeaders: async () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer t' }), isSignedIn: async () => true }));

const API = 'https://guest-messages-mock.invalid';
const CODE = 'abcdefghij1234567890xy';
const KEY = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TID = '9b2f0c1e-1111-4222-8333-444455556666';
const reply = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const THREAD = { guest_name: 'Jordan Avery', email: null, email_opt_in: false, closed: false,
  messages: [{ author: 'guest', body: 'Is there parking?', created_at: '2026-11-20T12:00:00Z' }] };

describe('guest questions client — not configured', () => {
  let mod;
  beforeEach(() => { delete process.env.REACT_APP_API_BASE_URL; jest.isolateModules(() => { mod = require('../api/guestMessages'); }); });

  test('nothing is fetched; reads name it, writes throw', async () => {
    global.fetch = jest.fn();
    expect(mod.isGuestMessagesApiConfigured()).toBe(false);
    await expect(mod.fetchMyGuestThread(CODE, KEY)).resolves.toEqual({ ok: false, reason: 'not-configured' });
    await expect(mod.fetchGuestThreads('e1')).resolves.toEqual({ ok: false, reason: 'not-configured' });
    await expect(mod.askHost(CODE, { guestKey: KEY, name: 'Jordan', body: 'Hi' })).rejects.toThrow();
    await expect(mod.replyToGuestThread('e1', TID, 'Hi')).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
    delete global.fetch;
  });
});

describe('guest questions client — configured', () => {
  let mod;
  beforeEach(() => {
    process.env.REACT_APP_API_BASE_URL = API;
    jest.isolateModules(() => { mod = require('../api/guestMessages'); });
  });
  afterEach(() => { delete process.env.REACT_APP_API_BASE_URL; delete global.fetch; });

  test('the guest reads their own thread with the code and device key', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, thread: THREAD }));
    await expect(mod.fetchMyGuestThread(CODE, KEY)).resolves.toEqual({ ok: true, thread: THREAD });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(API + '/api/public/questions/' + CODE + '/mine');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ guest_key: KEY });
  });

  test('no thread from this device is not a failure; a dead network is', async () => {
    global.fetch = jest.fn(async () => reply(404, { detail: 'not found' }));
    await expect(mod.fetchMyGuestThread(CODE, KEY)).resolves.toEqual({ ok: true, thread: null });
    global.fetch = jest.fn(async () => reply(500, {}));
    await expect(mod.fetchMyGuestThread(CODE, KEY)).resolves.toEqual({ ok: false, reason: 'unavailable' });
    global.fetch = jest.fn(async () => { throw new TypeError('offline'); });
    await expect(mod.fetchMyGuestThread(CODE, KEY)).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  test('asking posts name and body, and THROWS with the status on refusal', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, thread: THREAD }));
    await expect(mod.askHost(CODE, { guestKey: KEY, name: 'Jordan Avery', body: 'Is there parking?' }))
      .resolves.toEqual({ ok: true, thread: THREAD });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(API + '/api/public/questions/' + CODE + '/ask');
    expect(JSON.parse(init.body)).toEqual({ guest_key: KEY, name: 'Jordan Avery', body: 'Is there parking?' });
    for (const status of [403, 404, 422, 429, 402]) {
      global.fetch = jest.fn(async () => reply(status, { detail: 'refused' }));
      // eslint-disable-next-line no-await-in-loop
      await expect(mod.askHost(CODE, { guestKey: KEY, name: 'J', body: 'x' })).rejects.toMatchObject({ status, message: 'refused' });
    }
  });

  test('email opt-in is sent only as given, never assumed', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, thread: THREAD }));
    await mod.setGuestEmail(CODE, { guestKey: KEY, email: 'jordan@example.test' });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ guest_key: KEY, email: 'jordan@example.test', email_opt_in: false });
    await mod.setGuestEmail(CODE, { guestKey: KEY, email: 'jordan@example.test', emailOptIn: true });
    expect(global.fetch.mock.calls[1][0]).toBe(API + '/api/public/questions/' + CODE + '/email');
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).email_opt_in).toBe(true);
  });

  test('a guest deletes their own thread; nothing there reads as deleted: false', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, deleted: true }));
    await expect(mod.deleteMyGuestThread(CODE, KEY)).resolves.toEqual({ ok: true, deleted: true });
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/public/questions/' + CODE + '/delete');
    global.fetch = jest.fn(async () => reply(404, {}));
    await expect(mod.deleteMyGuestThread(CODE, KEY)).resolves.toEqual({ ok: true, deleted: false });
    global.fetch = jest.fn(async () => reply(500, {}));
    await expect(mod.deleteMyGuestThread(CODE, KEY)).rejects.toMatchObject({ status: 500 });
  });

  test('the host inbox names a refused request instead of showing an empty list', async () => {
    const rows = [{ id: TID, guest_name: 'Jordan Avery', unanswered: true }];
    global.fetch = jest.fn(async () => reply(200, rows));
    await expect(mod.fetchGuestThreads('e 1')).resolves.toEqual({ ok: true, rows });
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/events/e%201/guest-threads');
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer t');
    for (const [status, reason] of [[401, 'signed-out'], [403, 'forbidden'], [500, 'unavailable'], [402, 'unavailable']]) {
      global.fetch = jest.fn(async () => reply(status, {}));
      // eslint-disable-next-line no-await-in-loop
      await expect(mod.fetchGuestThreads('e1')).resolves.toEqual({ ok: false, reason });
    }
  });

  test('the host reads one thread, replies, and blocks', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, thread: { id: TID }, messages: [] }));
    await expect(mod.fetchGuestThread('e1', TID)).resolves.toEqual({ ok: true, thread: { id: TID }, messages: [] });
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/events/e1/guest-threads/' + TID);
    global.fetch = jest.fn(async () => reply(404, {}));
    await expect(mod.fetchGuestThread('e1', TID)).resolves.toEqual({ ok: false, reason: 'not-found' });

    global.fetch = jest.fn(async () => reply(200, { ok: true, message: { author: 'host', body: 'Yes' } }));
    await expect(mod.replyToGuestThread('e1', TID, 'Yes')).resolves.toEqual({ ok: true, message: { author: 'host', body: 'Yes' } });
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/events/e1/guest-threads/' + TID + '/reply');
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ body: 'Yes' });

    global.fetch = jest.fn(async () => reply(200, { ok: true, thread: { blocked: true } }));
    await mod.blockGuestThread('e1', TID);
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/events/e1/guest-threads/' + TID + '/block');
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ blocked: true });
    await mod.blockGuestThread('e1', TID, false);
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ blocked: false });

    global.fetch = jest.fn(async () => reply(409, { detail: 'blocked' }));
    await expect(mod.replyToGuestThread('e1', TID, 'Yes')).rejects.toMatchObject({ status: 409 });
  });

  // "Opened your invite": fire-and-forget from the invite page; never throws,
  // never retries, and the host side names a refused request.
  test('an open posts the device id and, when there is one, the guest key; it never throws', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true }));
    await expect(mod.recordInviteOpened(CODE, { deviceId: 'device-0000000000000001', guestKey: KEY })).resolves.toBe(true);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(API + '/api/public/invite/' + CODE + '/opened');
    expect(JSON.parse(init.body)).toEqual({ device_id: 'device-0000000000000001', guest_key: KEY });
    await mod.recordInviteOpened(CODE, { deviceId: 'device-0000000000000001' });
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ device_id: 'device-0000000000000001' });
    global.fetch = jest.fn(async () => { throw new TypeError('offline'); });
    await expect(mod.recordInviteOpened(CODE, { deviceId: 'device-0000000000000001' })).resolves.toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('the invite device id is random, stable on this device, and long enough', () => {
    const a = mod.inviteDeviceId();
    expect(a.length).toBeGreaterThanOrEqual(16);
    expect(mod.inviteDeviceId()).toBe(a);
  });

  test('the host gets opened times and daily totals, or a named refusal', async () => {
    const body = { ok: true, guests: [{ guest_name: 'Jordan Avery', last_opened_at: '2026-11-20T12:00:00Z', rsvp_id: 7, thread_id: null }],
      days: [{ day: '2026-11-20', opens: 3, distinct_devices: 2 }] };
    global.fetch = jest.fn(async () => reply(200, body));
    await expect(mod.fetchInviteOpens('e1')).resolves.toEqual({ ok: true, guests: body.guests, days: body.days });
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/events/e1/invite-opens');
    for (const [status, reason] of [[401, 'signed-out'], [403, 'forbidden'], [500, 'unavailable']]) {
      global.fetch = jest.fn(async () => reply(status, {}));
      // eslint-disable-next-line no-await-in-loop
      await expect(mod.fetchInviteOpens('e1')).resolves.toEqual({ ok: false, reason });
    }
  });
});
