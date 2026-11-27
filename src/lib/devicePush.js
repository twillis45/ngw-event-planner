// ─── DEVICE NOTIFICATIONS: TURNING THEM ON AND OFF FOR THIS BROWSER ──────────
//
// Owner decision "B", 11/20/2026: desktop browsers and Android Chrome now;
// iPhone and iPad later (they need a manifest a past board rejected). The row
// is "Notifications on this device" in You & settings
// (hostv2/src/DeviceNotificationsRow.jsx); this file holds everything it does,
// so it can be tested without a browser.
//
// WHAT THE HOST GETS is exactly what the host alert email already covers
// (backend host_alerts.py): a guest replied or asked a question, a vendor
// answered a brief. Who answered and what kind of answer, never what they
// wrote; at most one an hour for each event; off for one event from its guest
// list. None arrives while the app is on screen (the worker's push handler).
//
// RULES
//  · PERMISSION IS ASKED FOR ONLY IN turnOnPush, which only the row's tap
//    calls. loadPushRow reads; it never asks. A prompt on load is how a site
//    gets "Block" for good.
//  · THE ROW IS SHOWN ONLY WHERE IT CAN WORK: signed in, the browser able
//    (notifyDelivery.pushSupport: not an iPhone or iPad), the offline worker
//    not killed on this device, and the server holding a VAPID key (its 503
//    hides the row). Anywhere else there is no row, and so no promise.
//  · OFF IS TRUE EVEN IF THE SERVER IS UNREACHABLE: the browser's own
//    subscription is dropped, so nothing can arrive, and the server deletes
//    its row the first time the push service answers 410.
import { plannerAuthHeaders } from './commApi';
import { pushSupport } from './notifyDelivery';

// Read at call time, so a test can set it; a function body, as in commApi.
function apiBase() { return process.env.REACT_APP_API_BASE_URL; }
const defaultEnv = () => (typeof window !== 'undefined' ? window : {});
const defaultFetch = (...a) => fetch(...a);

export const PUSH_LABEL = 'Notifications on this device';

/** The one line under the row. PURE. */
export function pushLine({ on, permission, outcome } = {}) {
  if (permission === 'denied' || outcome === 'denied') {
    return 'To allow them, open site settings (tap the icon by the address) and set Notifications to Allow.';
  }
  if (outcome === 'dismissed') return 'Your browser didn’t turn them on. Tap again and choose Allow.';
  if (outcome === 'no-worker') return 'This device couldn’t set them up. Reload the app and try again.';
  if (outcome === 'failed') return 'Couldn’t turn them on for this device. Try again in a moment.';
  if (on) return 'On. At most one an hour for each event, none while the app is on screen. Turn an event off from its guest list.';
  return 'A ping when a guest replies or asks, or a vendor answers your brief. It says who, never what they wrote.';
}

/** The server's VAPID public key, or null (not configured: 503, unreachable, no API). */
export async function fetchPushKey(fetchImpl = defaultFetch) {
  const base = apiBase();
  if (!base) return null;
  try {
    const r = await fetchImpl(`${base}/api/push/public-key`);
    if (!r || !r.ok) return null;
    const j = await r.json();
    return j && typeof j.key === 'string' && j.key ? j.key : null;
  } catch {
    return null;
  }
}

async function currentSubscription(env) {
  try {
    const reg = await env.navigator.serviceWorker.getRegistration();
    return reg && reg.pushManager ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
}

/**
 * What the row should show. NEVER asks for permission.
 * Returns `{ show: false, reason }` or `{ show: true, key, permission, on }`.
 */
export async function loadPushRow({ signedIn, swKilled = false, env = defaultEnv(), fetchImpl = defaultFetch } = {}) {
  if (!signedIn) return { show: false, reason: 'signed-out' };
  const can = pushSupport(env);
  if (!can.ok) return { show: false, reason: can.reason };
  if (swKilled) return { show: false, reason: 'worker-off' };
  const key = await fetchPushKey(fetchImpl);
  if (!key) return { show: false, reason: 'server-off' };
  const permission = String((env.Notification && env.Notification.permission) || 'default');
  const sub = permission === 'granted' ? await currentSubscription(env) : null;
  return { show: true, key, permission, on: Boolean(sub) };
}

/** base64url → bytes, for `applicationServerKey`. */
export function keyBytes(b64url) {
  const s = String(b64url || '').replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function readyWithin(sw, ms) {
  let t;
  try {
    return await Promise.race([sw.ready, new Promise((r) => { t = setTimeout(() => r(null), ms); })]);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function headers() {
  return { 'Content-Type': 'application/json', ...(await plannerAuthHeaders()) };
}

/**
 * The host tapped the row on. The ONLY place permission is requested.
 * `{ ok: true }` or `{ ok: false, reason: 'denied' | 'dismissed' | 'no-worker' | 'failed' }`.
 */
/** The phone's IANA time zone, or undefined when the browser will not say. */
export function phoneZone(env) {
  try {
    if (env && typeof env.timeZone === 'function') return env.timeZone() || undefined;
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export async function turnOnPush(key, { env = defaultEnv(), fetchImpl = defaultFetch, timeoutMs = 10000 } = {}) {
  let permission;
  try {
    permission = await env.Notification.requestPermission();
  } catch {
    permission = env.Notification && env.Notification.permission;
  }
  if (permission === 'denied') return { ok: false, reason: 'denied' };
  if (permission !== 'granted') return { ok: false, reason: 'dismissed' };

  const reg = await readyWithin(env.navigator.serviceWorker, timeoutMs);
  if (!reg || !reg.pushManager) return { ok: false, reason: 'no-worker' };

  let sub;
  try {
    sub = (await reg.pushManager.getSubscription())
      || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  } catch {
    return { ok: false, reason: 'failed' };
  }
  const json = (sub && typeof sub.toJSON === 'function' ? sub.toJSON() : sub) || {};
  const keys = json.keys || {};
  try {
    const r = await fetchImpl(`${apiBase()}/api/push/subscribe`, {
      method: 'POST',
      headers: await headers(),
      // Her phone's time zone decides which day is the event day for alerts
      // (owner, 11/27/2026); the server keeps it only if it is a real zone.
      body: JSON.stringify({ endpoint: json.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, tz: phoneZone(env) }),
    });
    if (!r || !r.ok) throw new Error('refused');
  } catch {
    // The server does not have it, so nothing would ever arrive: say so, and
    // leave no subscription behind that looks like "on".
    try { await sub.unsubscribe(); } catch { /* already gone */ }
    return { ok: false, reason: 'failed' };
  }
  return { ok: true };
}

/** The host tapped the row off. Always ends with nothing able to arrive here. */
export async function turnOffPush({ env = defaultEnv(), fetchImpl = defaultFetch } = {}) {
  const sub = await currentSubscription(env);
  if (!sub) return { ok: true };
  try {
    await fetchImpl(`${apiBase()}/api/push/subscribe`, {
      method: 'DELETE',
      headers: await headers(),
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch { /* the push service's 410 removes the server's row later */ }
  try { await sub.unsubscribe(); } catch { /* already gone */ }
  return { ok: true };
}

/**
 * Sign out, and take this device's notifications with the account. On a shared
 * computer the next person must never see the last host's alerts (guest names).
 * The device is dropped FIRST, while the request can still prove whose row it
 * is. turnOffPush never throws, so a failure there never blocks the sign-out:
 * the browser side is dropped regardless, and the push service's 410 clears
 * the server's row on the next alert.
 */
export async function signOutThisDevice(signOut, opts = {}) {
  await turnOffPush(opts);
  return signOut();
}
