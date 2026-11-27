/**
 * @jest-environment jsdom
 */
// Device notifications, the settings row's logic (owner decision "B",
// 11/20/2026). Pins, each red-proofed by removing the guard:
//  · the row is NOT shown on an iPhone or iPad — including an iPad whose
//    Safari says "Macintosh" — nor when the server answers 503, nor signed out,
//    nor where the worker was killed;
//  · permission is NEVER requested while loading the row, only by the tap
//    (turnOnPush); that the shipped row asks nothing on load is driven in a
//    browser by hostv2/e2e/theDeviceNotificationsRow.spec.mjs;
//  · on → the server gets exactly the endpoint and keys; a refused save leaves
//    no subscription behind; off always drops the browser's subscription.
const API = 'https://api.example.test';
const CHROME_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD_OLD = 'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

jest.mock('../commApi', () => ({ plannerAuthHeaders: async () => ({ Authorization: 'Bearer t' }) }));

const load = () => { jest.resetModules(); process.env.REACT_APP_API_BASE_URL = API; return require('../devicePush'); };

function makeEnv({ ua = CHROME_MAC, touch = 0, permission = 'default', answer = 'granted', existing = null, noPush = false } = {}) {
  const calls = { requestPermission: 0, subscribe: [], unsubscribed: 0 };
  const sub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/device-one',
    toJSON() { return { endpoint: this.endpoint, expirationTime: null, keys: { p256dh: 'BPub', auth: 'Sec' } }; },
    unsubscribe: async () => { calls.unsubscribed += 1; return true; },
  };
  let current = existing ? sub : null;
  const pushManager = {
    getSubscription: async () => current,
    subscribe: async (opts) => { calls.subscribe.push(opts); current = sub; return sub; },
  };
  const reg = { pushManager };
  const Notification = {
    permission,
    requestPermission: async () => { calls.requestPermission += 1; Notification.permission = answer; return answer; },
  };
  const env = {
    navigator: { userAgent: ua, maxTouchPoints: touch, serviceWorker: { getRegistration: async () => reg, ready: Promise.resolve(reg) } },
    Notification,
  };
  if (!noPush) env.PushManager = function PushManager() {};
  return { env, calls, sub };
}

const keyFetch = (status = 200, log = []) => async (url, init = {}) => {
  log.push({ url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null, headers: init.headers || {} });
  if (url.endsWith('/api/push/public-key')) return { ok: status === 200, status, json: async () => ({ key: 'BKey_x' }) };
  return { ok: true, status: 200, json: async () => ({ ok: true }) };
};

// ── where the row is shown ─────────────────────────────────────────────────

describe('the row is shown only where it can work', () => {
  test('desktop Chrome, Safari on a Mac, and Android Chrome: shown', async () => {
    const d = load();
    for (const ua of [CHROME_MAC, SAFARI_MAC, ANDROID]) {
      const { env } = makeEnv({ ua });
      const r = await d.loadPushRow({ signedIn: true, env, fetchImpl: keyFetch() });
      expect(r).toEqual({ show: true, key: 'BKey_x', permission: 'default', on: false });
    }
  });

  test.each([
    ['iPhone', IPHONE, 5],
    ['an older iPad', IPAD_OLD, 5],
    ['an iPad whose Safari says "Macintosh"', SAFARI_MAC, 5],
  ])('NOT on %s, even with every API present', async (_n, ua, touch) => {
    const d = load();
    const { env } = makeEnv({ ua, touch });
    const r = await d.loadPushRow({ signedIn: true, env, fetchImpl: keyFetch() });
    expect(r).toEqual({ show: false, reason: 'apple-touch' });
  });

  test('NOT when the server has no VAPID key (503)', async () => {
    const d = load();
    const { env } = makeEnv();
    expect(await d.loadPushRow({ signedIn: true, env, fetchImpl: keyFetch(503) })).toEqual({ show: false, reason: 'server-off' });
  });

  test('NOT when the server cannot be reached, or the app has no API', async () => {
    const d = load();
    const { env } = makeEnv();
    const down = async () => { throw new TypeError('Failed to fetch'); };
    expect((await d.loadPushRow({ signedIn: true, env, fetchImpl: down })).show).toBe(false);
    delete process.env.REACT_APP_API_BASE_URL;
    expect((await d.loadPushRow({ signedIn: true, env, fetchImpl: keyFetch() })).show).toBe(false);
  });

  test('NOT signed out, and the server is not even asked', async () => {
    const d = load();
    const { env } = makeEnv();
    const log = [];
    expect(await d.loadPushRow({ signedIn: false, env, fetchImpl: keyFetch(200, log) })).toEqual({ show: false, reason: 'signed-out' });
    expect(log).toEqual([]);
  });

  test('NOT where the offline worker was killed (?nosw=1), or a browser without push', async () => {
    const d = load();
    expect((await d.loadPushRow({ signedIn: true, swKilled: true, env: makeEnv().env, fetchImpl: keyFetch() })).reason).toBe('worker-off');
    expect((await d.loadPushRow({ signedIn: true, env: makeEnv({ noPush: true }).env, fetchImpl: keyFetch() })).reason).toBe('no-push');
  });

  test('reads "on" from the browser\'s own subscription, only with permission granted', async () => {
    const d = load();
    expect((await d.loadPushRow({ signedIn: true, env: makeEnv({ permission: 'granted', existing: true }).env, fetchImpl: keyFetch() })).on).toBe(true);
    expect((await d.loadPushRow({ signedIn: true, env: makeEnv({ permission: 'denied', existing: true }).env, fetchImpl: keyFetch() })).on).toBe(false);
  });
});

// ── permission ─────────────────────────────────────────────────────────────

describe('permission is asked for only by the tap', () => {
  test('loading the row never asks, whatever the state', async () => {
    const d = load();
    for (const permission of ['default', 'granted', 'denied']) {
      const { env, calls } = makeEnv({ permission, existing: permission === 'granted' });
      await d.loadPushRow({ signedIn: true, env, fetchImpl: keyFetch() });
      expect(calls.requestPermission).toBe(0);
    }
  });
});

// ── on and off ─────────────────────────────────────────────────────────────

describe('turning it on and off', () => {
  test('on: asks once, subscribes with the server\'s key, and sends exactly the endpoint and keys', async () => {
    const d = load();
    const { env, calls } = makeEnv();
    const log = [];
    expect(await d.turnOnPush('BKey_x', { env, fetchImpl: keyFetch(200, log) })).toEqual({ ok: true });
    expect(calls.requestPermission).toBe(1);
    expect(calls.subscribe).toHaveLength(1);
    expect(calls.subscribe[0].userVisibleOnly).toBe(true);
    expect(Array.from(calls.subscribe[0].applicationServerKey)).toEqual(Array.from(d.keyBytes('BKey_x')));
    expect(log).toEqual([{ url: `${API}/api/push/subscribe`, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
      body: { endpoint: 'https://fcm.googleapis.com/fcm/send/device-one', keys: { p256dh: 'BPub', auth: 'Sec' }, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } }]);
  });

  // Owner, 11/27/2026: on the event day there is no hourly limit, and "the
  // event day" is the host's own: the zone her phone reports, sent with the device.
  test('on: sends her phone\'s time zone beside the device', async () => {
    const d = load();
    const { env } = makeEnv();
    env.timeZone = () => 'America/Chicago';
    const log = [];
    expect(await d.turnOnPush('BKey_x', { env, fetchImpl: keyFetch(200, log) })).toEqual({ ok: true });
    expect(log[0].body.tz).toBe('America/Chicago');
  });

  test('denied or dismissed: nothing is subscribed and the reason comes back', async () => {
    const d = load();
    const a = makeEnv({ answer: 'denied' });
    expect(await d.turnOnPush('BKey_x', { env: a.env, fetchImpl: keyFetch() })).toEqual({ ok: false, reason: 'denied' });
    const b = makeEnv({ answer: 'default' });
    expect(await d.turnOnPush('BKey_x', { env: b.env, fetchImpl: keyFetch() })).toEqual({ ok: false, reason: 'dismissed' });
    expect(a.calls.subscribe).toHaveLength(0);
    expect(b.calls.subscribe).toHaveLength(0);
  });

  test('a refused save leaves no subscription that looks like "on"', async () => {
    const d = load();
    const { env, calls } = makeEnv();
    const refuse = async (url) => (url.endsWith('/subscribe') ? { ok: false, status: 409 } : { ok: true });
    expect(await d.turnOnPush('BKey_x', { env, fetchImpl: refuse })).toEqual({ ok: false, reason: 'failed' });
    expect(calls.unsubscribed).toBe(1);
  });

  test('no worker in time: says so', async () => {
    const d = load();
    const { env } = makeEnv();
    env.navigator.serviceWorker.ready = new Promise(() => {});
    expect(await d.turnOnPush('BKey_x', { env, fetchImpl: keyFetch(), timeoutMs: 5 })).toEqual({ ok: false, reason: 'no-worker' });
  });

  test('off: the server is told which device, and the browser drops it even if the server is down', async () => {
    const d = load();
    const a = makeEnv({ permission: 'granted', existing: true });
    const log = [];
    await d.turnOffPush({ env: a.env, fetchImpl: keyFetch(200, log) });
    expect(log).toEqual([{ url: `${API}/api/push/subscribe`, method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
      body: { endpoint: 'https://fcm.googleapis.com/fcm/send/device-one' } }]);
    expect(a.calls.unsubscribed).toBe(1);
    const b = makeEnv({ permission: 'granted', existing: true });
    await d.turnOffPush({ env: b.env, fetchImpl: async () => { throw new TypeError('offline'); } });
    expect(b.calls.unsubscribed).toBe(1);
  });
});

describe('signing out takes the device with it (shared computers)', () => {
  test('the device is dropped on the server and in the browser, before the sign-out', async () => {
    const d = load();
    const { env, calls } = makeEnv({ permission: 'granted', existing: true });
    const order = [];
    const log = [];
    const fetchImpl = async (url, init) => { order.push('server-delete'); return keyFetch(200, log)(url, init); };
    await d.signOutThisDevice(async () => { order.push('signOut'); }, { env, fetchImpl });
    expect(order).toEqual(['server-delete', 'signOut']);
    expect(log[0].headers.Authorization).toBe('Bearer t');
    expect(calls.unsubscribed).toBe(1);
  });

  test('a failure dropping the device never blocks the sign-out', async () => {
    const d = load();
    const { env } = makeEnv({ permission: 'granted', existing: true });
    let out = false;
    await d.signOutThisDevice(async () => { out = true; }, { env, fetchImpl: async () => { throw new TypeError('offline'); } });
    expect(out).toBe(true);
    const bare = { navigator: {} };
    let out2 = false;
    await d.signOutThisDevice(async () => { out2 = true; }, { env: bare, fetchImpl: keyFetch() });
    expect(out2).toBe(true);
  });
});

// ── the words ──────────────────────────────────────────────────────────────

describe('the line under the row', () => {
  test('denied says how to re-allow, in one line', () => {
    const d = load();
    const line = d.pushLine({ permission: 'denied' });
    expect(line).toMatch(/set Notifications to Allow/);
    expect(line).not.toMatch(/\n/);
    expect(d.pushLine({ outcome: 'denied' })).toBe(line);
  });

  test('off and on say what it does, and that it never carries anyone\'s words', () => {
    const d = load();
    expect(d.pushLine({ on: false })).toMatch(/never what they wrote/);
    expect(d.pushLine({ on: true })).toMatch(/At most one an hour for each event/);
    expect(d.PUSH_LABEL).toBe('Notifications on this device');
  });

  test('no promise of Add to Home Screen anywhere', () => {
    const d = load();
    const all = ['denied', 'dismissed', 'no-worker', 'failed', null].map((outcome) => d.pushLine({ outcome })).join(' ');
    expect(all).not.toMatch(/home screen/i);
  });
});
