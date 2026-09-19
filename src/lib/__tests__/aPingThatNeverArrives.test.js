// ─── "YOU'LL GET A PING THE MOMENT THE FORECAST MOVES" — ON NO MOBILE BROWSER ─
//
// The host opts in, gets told they are covered, and then nothing ever arrives.
// The failure was inside a bare `catch {}` whose comment read "notification
// construction can throw on some platforms" — which is true, and which is the
// whole defect: it throws on EVERY platform this product calls its flagship.
//
// MEASURED against the platform record:
//
//   iOS Safari tab              `Notification` is not exposed (ReferenceError)
//   iOS Home Screen web app     constructor THROWS; needs a service worker
//   Chrome / Samsung / Opera    constructor THROWS TypeError
//   Android
//   Desktop                     constructor works
//
// hostv2 registers no service worker and ships no manifest, so the persistent
// path does not exist either. A 390px-first product's only alert channel is
// desktop-only, and said so nowhere.
//
// This file does NOT make notifications work — that is the PWA track, and it
// pulls stage 5's open RLS row in with it because push subscriptions are user
// data. It makes the product stop claiming they work.
//
// THE PRECEDENT IS THIRTY LINES BELOW THE BUG, in the same file:
// "A FAILED SAVE MUST NOT BE SILENT (2026-08-07) … Most of the bare catches in
// this file are correct … This one is different." So is this one. A promise the
// host accepted is the second thing that must not fail silently.
import {
  deliverNotification,
  deliveryExcuse,
  notificationPermission,
  notificationApiPresent,
  DELIVERY,
} from '../notifyDelivery';

const realNotification = global.Notification;
const realNavigator = global.navigator;

// A browser whose constructor works (desktop) or throws (every phone).
const installNotification = ({ permission = 'granted', constructorThrows = false } = {}) => {
  const seen = [];
  function FakeNotification(title, options) {
    if (constructorThrows) throw new TypeError('Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead.');
    seen.push({ title, options });
  }
  FakeNotification.permission = permission;
  FakeNotification.seen = seen;
  global.Notification = FakeNotification;
  return FakeNotification;
};

const removeNotification = () => { delete global.Notification; };

afterEach(() => {
  if (realNotification === undefined) delete global.Notification; else global.Notification = realNotification;
  if (realNavigator !== undefined) global.navigator = realNavigator;
});

describe('a notification that cannot be delivered must not be reported as sent', () => {
  test('(premise) the fake browsers really behave the way the platforms do', () => {
    // Every assertion below is about nothing if the doubles do not model the two
    // real shapes: a desktop constructor that works and a mobile one that throws.
    const ok = installNotification({ constructorThrows: false });
    expect(() => new ok('hi')).not.toThrow();
    const bad = installNotification({ constructorThrows: true });
    expect(() => new bad('hi')).toThrow(TypeError);
  });

  test('THE DEFECT: a throwing constructor is reported, not swallowed', async () => {
    installNotification({ constructorThrows: true });
    const r = await deliverNotification('The sky moved', { body: 'rain at 4' }, { registration: null });
    expect(r.delivered).toBe(false);
    expect(r.outcome).toBe(DELIVERY.NO_CHANNEL);
    expect(r.channel).toBe(null);
    // The reason survives, so a caller can log or show it rather than guess.
    expect(String(r.error)).toMatch(/showNotification/i);
  });

  test('an iOS Safari tab — no API at all — is its own outcome, not a failure', async () => {
    // `Notification` is simply absent there. Collapsing this into NO_CHANNEL
    // would tell the host their phone refused a notification, when in fact the
    // browser never offered the machinery.
    removeNotification();
    expect(notificationApiPresent()).toBe(false);
    expect(notificationPermission()).toBe(null);
    const r = await deliverNotification('x', {}, { registration: null });
    expect(r.outcome).toBe(DELIVERY.NO_API);
    expect(r.delivered).toBe(false);
  });

  test('a denied permission is not a broken channel', async () => {
    installNotification({ permission: 'denied' });
    const r = await deliverNotification('x', {}, { registration: null });
    expect(r.outcome).toBe(DELIVERY.NOT_PERMITTED);
    // …and a host who simply has not been asked yet lands in the same honest place.
    installNotification({ permission: 'default' });
    expect((await deliverNotification('x', {}, { registration: null })).outcome).toBe(DELIVERY.NOT_PERMITTED);
  });

  test('THE ORDER: the service worker is tried FIRST, because it is the only mobile path', async () => {
    // WRITTEN TWICE. The first version paired a THROWING constructor with a
    // working registration — and it passed with the order reversed, because the
    // constructor failed and the code fell through to the worker anyway. A test
    // that cannot fail for the thing it names is the defect this file is about,
    // arriving from inside the test.
    //
    // Pinning order needs a case where BOTH paths would succeed. Only then does
    // "which one ran" mean anything.
    const N = installNotification({ constructorThrows: false });
    const shown = [];
    const reg = { showNotification: (t, o) => { shown.push({ t, o }); return Promise.resolve(); } };
    const r = await deliverNotification('The sky moved', { body: 'rain at 4' }, { registration: reg });
    expect(r.delivered).toBe(true);
    expect(r.channel).toBe('service-worker');
    expect(shown).toHaveLength(1);
    expect(shown[0].t).toBe('The sky moved');
    // …and the constructor never ran. This is the assertion the first version
    // lacked, and the one that fails if the order is ever flipped.
    expect(N.seen).toHaveLength(0);
  });

  test('the constructor still serves desktop, where it is the only path', async () => {
    const N = installNotification({ constructorThrows: false });
    const r = await deliverNotification('The sky moved', { body: 'rain at 4' }, { registration: null });
    expect(r.delivered).toBe(true);
    expect(r.channel).toBe('constructor');
    expect(N.seen).toHaveLength(1);
  });

  test('NEGATIVE CONTROL: a service worker that throws falls back rather than losing the ping', async () => {
    // A registration can exist and still refuse — an expired worker, a revoked
    // permission mid-flight. On desktop the constructor can still deliver, and
    // silently dropping the notification because the preferred path failed would
    // be the same defect one layer up.
    const N = installNotification({ constructorThrows: false });
    const reg = { showNotification: () => Promise.reject(new Error('worker is gone')) };
    const r = await deliverNotification('x', {}, { registration: reg });
    expect(r.delivered).toBe(true);
    expect(r.channel).toBe('constructor');
    expect(N.seen).toHaveLength(1);
  });

  test('NEGATIVE CONTROL: BOTH paths failing reports failure — it never claims a delivery', async () => {
    installNotification({ constructorThrows: true });
    const reg = { showNotification: () => Promise.reject(new Error('worker is gone')) };
    const r = await deliverNotification('x', {}, { registration: reg });
    expect(r.delivered).toBe(false);
    expect(r.outcome).toBe(DELIVERY.NO_CHANNEL);
  });

  test('NEGATIVE CONTROL: it never throws, whatever it is handed', async () => {
    // This function is called from a React effect. If it can throw, the bare
    // catch comes back and so does the bug.
    installNotification({ constructorThrows: true });
    await expect(deliverNotification(null, null, { registration: null })).resolves.toBeTruthy();
    await expect(deliverNotification(undefined, undefined, { registration: {} })).resolves.toBeTruthy();
    removeNotification();
    await expect(deliverNotification('x')).resolves.toBeTruthy();
  });

  test('every non-delivery outcome gives the host a sentence, and a delivery gives none', () => {
    expect(deliveryExcuse(DELIVERY.NO_API)).toMatch(/\S/);
    expect(deliveryExcuse(DELIVERY.NOT_PERMITTED)).toMatch(/\S/);
    expect(deliveryExcuse(DELIVERY.NO_CHANNEL)).toMatch(/\S/);
    expect(deliveryExcuse(DELIVERY.DELIVERED)).toBe(null);
    // …and none of them tells an iOS host to Add to Home Screen, which would be
    // false for this build: with no manifest the site saves as a BOOKMARK, and
    // even installed the constructor throws with no worker behind it. The hint
    // becomes honest the day the manifest and the worker ship.
    for (const o of [DELIVERY.NO_API, DELIVERY.NOT_PERMITTED, DELIVERY.NO_CHANNEL]) {
      expect(String(deliveryExcuse(o))).not.toMatch(/home screen|add to home|install/i);
    }
  });

  test('NEGATIVE CONTROL: the excuse never promises the ping it just failed to send', () => {
    // The original copy said "you'll get a ping the moment the forecast moves."
    // Whatever these sentences become, none of them may say that again.
    for (const o of [DELIVERY.NO_API, DELIVERY.NOT_PERMITTED, DELIVERY.NO_CHANNEL]) {
      expect(String(deliveryExcuse(o))).not.toMatch(/you.ll get|we.ll ping|will ping|notify you/i);
    }
  });
});
