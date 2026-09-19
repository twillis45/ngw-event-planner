// ─── CAN THIS BROWSER ACTUALLY DELIVER A NOTIFICATION? ───────────────────────
//
// `typeof Notification !== 'undefined'` answers a DIFFERENT QUESTION than "will
// the host get a ping", and the gap between those two questions is where a
// promise to a host goes to die.
//
// MEASURED against the platform record, 2026-09-19:
//
//   surface                        `Notification` exposed?   `new Notification()`
//   ─────────────────────────────────────────────────────────────────────────
//   Desktop Safari / Chrome / FF   yes                       WORKS
//   iOS Safari TAB                 NO — ReferenceError       n/a
//   iOS Home Screen web app        yes (16.4+, needs a       THROWS
//                                  manifest with a
//                                  non-default `display`)
//   Chrome Android                 yes                       THROWS TypeError
//   Samsung Internet               yes                       THROWS TypeError
//   Opera Android                  yes                       THROWS TypeError
//
// So on EVERY mobile browser the constructor either is not reachable or throws.
// MDN states it plainly: "This constructor throws a TypeError when called in
// nearly all mobile browsers … Instead, you need to register a service worker
// and use ServiceWorkerRegistration.showNotification()."
//
// THE ONLY MOBILE DELIVERY PATH IS A SERVICE WORKER, and hostv2 registers none
// (no manifest.json, no service worker — measured). So today, on the surface
// this product declares as its flagship (mobile-first, 390px), a notification
// cannot be delivered at all.
//
// WHY THIS MODULE EXISTS RATHER THAN A WIDER FIX. Making it work is the PWA
// track — manifest, service worker, VAPID keys, a push endpoint, subscription
// rows — and push subscriptions are user data, which pulls in the Supabase RLS
// row that is already open on the stage-5 security checklist. That is a
// sequencing decision, not a bug fix. What IS a bug is promising a host a ping
// and then swallowing the failure: `deliverNotification` reports what happened
// instead of throwing into a bare catch, so a caller can stop claiming to watch
// something it cannot watch.
//
// ON THE INSTALL HINT THAT IS NOT OFFERED HERE. "Detect iOS and tell the host to
// Add to Home Screen" is the standard advice and it would be FALSE for this
// build: with no manifest, iOS saves the site as a Home Screen *bookmark* that
// reopens in the browser — and even installed, the constructor throws and there
// is no service worker to fall back to. An install hint becomes honest on the
// day the manifest and the worker ship, and not before.

export const DELIVERY = {
  /** A notification was actually shown. */
  DELIVERED: 'delivered',
  /** `Notification` is not exposed at all — an iOS Safari tab is the live case. */
  NO_API: 'no-api',
  /** The host has not granted permission (or has denied it). */
  NOT_PERMITTED: 'not-permitted',
  /** The API exists, permission is granted, and every delivery path failed. */
  NO_CHANNEL: 'no-channel',
};

/** `'granted' | 'denied' | 'default' | null` — null when the API is absent. */
export function notificationPermission() {
  try {
    if (typeof Notification === 'undefined') return null;
    const p = Notification.permission;
    return typeof p === 'string' ? p : null;
  } catch (_e) {
    return null;
  }
}

/** True only for a browser that exposes the API at all. Says nothing about delivery. */
export function notificationApiPresent() {
  return notificationPermission() !== null;
}

// The active service worker registration, or null — never a pending promise that
// hangs. `navigator.serviceWorker.ready` waits forever when nothing is ever
// registered, which is exactly this app's situation, so it is not used.
async function activeRegistration() {
  try {
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : null;
    if (!sw || !sw.controller || typeof sw.getRegistration !== 'function') return null;
    const reg = await sw.getRegistration();
    return reg && typeof reg.showNotification === 'function' ? reg : null;
  } catch (_e) {
    return null;
  }
}

/**
 * Show a notification and SAY WHAT HAPPENED.
 *
 * Returns `{ delivered, outcome, channel, error }` — never throws, and never
 * reports success it did not achieve. `channel` is `'service-worker'` or
 * `'constructor'` when something was shown, otherwise null.
 *
 * Order matters: the persistent (service-worker) path is tried FIRST because it
 * is the only one that works on a phone. The constructor is the desktop
 * fallback, not the default.
 */
export async function deliverNotification(title, options = {}, opts = {}) {
  const perm = notificationPermission();
  if (perm === null) return { delivered: false, outcome: DELIVERY.NO_API, channel: null, error: null };
  if (perm !== 'granted') return { delivered: false, outcome: DELIVERY.NOT_PERMITTED, channel: null, error: null };

  const reg = opts.registration !== undefined ? opts.registration : await activeRegistration();
  if (reg && typeof reg.showNotification === 'function') {
    try {
      await reg.showNotification(String(title == null ? '' : title), options || {});
      return { delivered: true, outcome: DELIVERY.DELIVERED, channel: 'service-worker', error: null };
    } catch (_e) { /* fall through to the constructor */ }
  }

  try {
    // eslint-disable-next-line no-new
    new Notification(String(title == null ? '' : title), options || {});
    return { delivered: true, outcome: DELIVERY.DELIVERED, channel: 'constructor', error: null };
  } catch (e) {
    return {
      delivered: false,
      outcome: DELIVERY.NO_CHANNEL,
      channel: null,
      error: String((e && e.message) || e || 'unknown'),
    };
  }
}

/**
 * One sentence a host can act on, for an outcome that is not a delivery. Returns
 * null when something WAS delivered — there is nothing to say.
 *
 * Deliberately does not tell an iOS host to Add to Home Screen: see the header.
 */
export function deliveryExcuse(outcome) {
  switch (outcome) {
    case DELIVERY.NO_API:
      return 'This browser won’t hand out notifications — the weather pill here stays your watch.';
    case DELIVERY.NOT_PERMITTED:
      return 'Notifications are switched off for this site — the weather pill here still keeps watch.';
    case DELIVERY.NO_CHANNEL:
      return 'Your phone won’t take a notification from a web page yet, so this can’t page you — the weather pill here keeps watch instead.';
    default:
      return null;
  }
}
