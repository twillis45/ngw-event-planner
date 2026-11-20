// ─── THE SERVICE WORKER SOURCE, WHICH IS NOT HAND-MAINTAINED ───────────────
//
// This is a TEMPLATE. `vitePluginOfflineShell` fills __PRECACHE__ and
// __BUILD_ID__ from the assets vite actually emitted, so the precache list
// can never drift from the bundle — the 2026-08-16 board's first condition
// for ever revisiting a worker ("a build-time precache manifest").
//
// Exported as a string rather than written to public/ so it is unit-testable
// and so nothing ships that the build did not generate.
export const SW_TEMPLATE = `/* GENERATED — edit src/offline/swTemplate.js, not this file. */
const BUILD = '__BUILD_ID__';
const CACHE = 'ngw-shell-' + BUILD;
const PRECACHE = __PRECACHE__;
const KILL_URL = '__BASE__sw-kill.txt';

// ── WHY NAVIGATION IS NETWORK-FIRST, AND WHY THAT IS THE WHOLE SAFETY CASE ──
// The board that banned the last worker was persuaded by an asymmetry: an app
// with no worker fails in the aisle and is fine on the next online load, while
// a broken worker "fails everywhere, for everyone, until each person clears
// site data — which no host will ever do".
//
// Network-first for navigation removes the second half. The cache can only
// ever answer when the network did not, so a bad cached shell cannot
// out-rank a working network, and one good deploy reaches every host on their
// next load with signal. The failure stays bounded by construction rather
// than by our confidence in this file.
// ── THE PAGE'S KILL REACHES THE WORKER FIRST (11/16/2026) ──────────────────
// ?nosw=1 unregisters this worker and deletes its caches, but an unregistered
// worker keeps serving the page that is already open, and its fetch handler
// used to re-create the cache 300-450 ms after the delete (measured; the kill
// left a cache behind about half the time). So the page tells it first and
// waits for the answer: from then on this worker answers nothing and never
// opens a cache. The check and the open sit in one synchronous step, so an
// open that began before the flag is queued ahead of the page's delete.
let KILLED = false;
self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'ngw-kill') return;
  KILLED = true;
  if (e.ports && e.ports[0]) e.ports[0].postMessage('killed');
});

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Individually, so ONE 404 cannot fail the whole install and leave a
    // worker registered with an empty cache — which is worse than no worker.
    await Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})));
    // No skipWaiting: a new worker taking over mid-session can hand a
    // half-swapped set of chunks to a running app. It activates on the next
    // load, which is the tested update path.
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // THE KILL SWITCH. Publishing sw-kill.txt containing "kill" at the site
    // root disables every installed worker on its next activation: caches
    // dropped, registration removed, hosts back to plain network with no
    // action from them. A worker that cannot be recalled is the thing the
    // Liability seat objected to.
    try {
      const r = await fetch(KILL_URL, { cache: 'no-store' });
      if (r && r.ok && /kill/i.test(await r.text())) {
        await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
        await self.registration.unregister();
        return;
      }
    } catch (_) { /* offline, or no kill file: carry on */ }
    // Drop every cache from an older build. The update path is: new build ->
    // new BUILD id -> new cache name -> old one deleted here.
    await Promise.all((await caches.keys())
      .filter((k) => k.startsWith('ngw-shell-') && k !== CACHE)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (KILLED) return;              // killed: the browser goes to the network itself
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ── THE SHELL, NEVER THE DATA ──────────────────────────────────────────
  // Anything that could be a host's plan or a priced answer is left alone
  // entirely: an API response served from cache is a stale number wearing a
  // fresh number's clothes, which is the failure this repo spends most of
  // its gates preventing. Only the built shell is cached.
  if (/\\/(api|unfurl|results)\\//.test(url.pathname)) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (_) {
        if (KILLED) return Response.error();
        const c = await caches.open(CACHE);
        return (await c.match('__SHELL__')) || Response.error();
      }
    })());
    return;
  }

  // Built assets are content-hashed, so a cache hit is the same bytes the
  // network would return. Cache-first here is safe in a way it is not for
  // navigation.
  if (PRECACHE.includes(url.pathname)) {
    e.respondWith((async () => {
      if (KILLED) return fetch(req);
      const c = await caches.open(CACHE);
      const hit = await c.match(url.pathname);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) c.put(url.pathname, res.clone());
        return res;
      } catch (_) { return Response.error(); }
    })());
  }
});

// ── DEVICE NOTIFICATIONS (owner decision "B", 11/20/2026) ───────────────────
// Two handlers and nothing else: they cache nothing, fetch nothing and change
// none of the above. The server (backend host_alerts) decides when to send;
// this only shows it. A killed worker shows nothing, and ?nosw=1 or
// sw-kill.txt unregister the worker, which ends its push subscription with it.
//
// NOT ON THE DEVICE IN USE: when a window of this app is visible, the host is
// looking at it already, so nothing is shown.
self.addEventListener('push', (e) => {
  if (KILLED) return;
  let d = null;
  try { d = e.data ? e.data.json() : null; } catch (_) { d = null; }
  if (!d || typeof d.title !== 'string' || !d.title) return;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === 'visible')) return;
    await self.registration.showNotification(d.title.slice(0, 120), {
      body: typeof d.body === 'string' ? d.body.slice(0, 120) : '',
      tag: typeof d.tag === 'string' ? d.tag.slice(0, 80) : undefined,
    });
  })());
});

// A tap opens the app, or brings forward the window that already has it. The
// address is this worker's own scope, never one carried in the push.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const home = self.registration.scope;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.find((w) => typeof w.url === 'string' && w.url.indexOf(home) === 0);
    if (open && typeof open.focus === 'function') return open.focus();
    return self.clients.openWindow(home);
  })());
});
`;
