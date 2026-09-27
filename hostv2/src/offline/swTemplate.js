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
`;
