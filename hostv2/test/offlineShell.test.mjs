// ─── A WORKER THAT CAN BE TAKEN BACK ───────────────────────────────────────
//
// The 2026-08-16 offline-shell board upheld the ban on a hand-rolled service
// worker and named exactly what a revisit must carry: "a build-time precache
// manifest, a tested update path, and a kill switch". This file is the
// evidence for all three, plus the one property the whole safety case rests
// on.
//
// ── WHY THE BAN WAS LIFTED, AND WHAT DID NOT CHANGE ────────────────────────
//
// That board's strongest argument was #4: "This pipeline has already shipped
// stale bundles… adding a caching layer on top of a pipeline with a KNOWN
// staleness fault makes a transient failure permanent."
//
// Verified 2026-09-27 and that fault is gone — and was already gone when the
// board sat. Nothing prebuilt is tracked (no hostv2/dist, no public/hostv2 in
// git), the laptop gh-pages flow and pages.yml were deleted 2026-08-03, and
// pages-from-source.yml builds from source in CI and FAILS if the artifact is
// not stamped with GITHUB_SHA. The workflow landed 2026-07-30; the board was
// 2026-08-16.
//
// What did NOT change is Don Norman's asymmetry, and it is answered by
// construction rather than by confidence: navigation is NETWORK-FIRST, so a
// cached shell can only ever answer when the network did not. A bad cache
// cannot out-rank a working network, and one good deploy reaches every host
// on their next load with signal.
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { precacheFor } from '../src/offline/vitePluginOfflineShell.mjs';
import { SW_TEMPLATE } from '../src/offline/swTemplate.js';
import { markSignal, lastSignalAt, lastSignalNote } from '../src/offline/lastSignal.js';
import {
  registerOfflineShell, disableOfflineShell, offlineShellKilled,
} from '../src/offline/register.js';

const BASE = '/ngw-event-planner/hostv2/';

describe('CONDITION 1 — the precache manifest is built, not written', () => {
  const emitted = [
    'index.html', 'assets/index-abc123.js', 'assets/HostShellV2-def456.js',
    'assets/index-777.css', 'assets/font-9.woff2', 'crab-hero.png',
    'assets/data-chunk.json', 'stats.txt',
  ];

  test('it takes the shell and leaves anything that is not', () => {
    const { urls } = precacheFor(emitted, BASE);
    expect(urls).toContain(`${BASE}assets/HostShellV2-def456.js`);
    expect(urls).toContain(`${BASE}assets/index-777.css`);
    expect(urls).toContain(`${BASE}assets/font-9.woff2`);
    expect(urls).toContain(`${BASE}crab-hero.png`);
    // A .json in the bundle is data, and data is never precached.
    expect(urls.join(' ')).not.toMatch(/data-chunk\.json/);
    expect(urls.join(' ')).not.toMatch(/stats\.txt/);
  });

  test('the navigation fallback is always in it', () => {
    // Everything else can be missing and the worker still degrades to
    // nothing. Without index.html an offline navigation has no answer, which
    // is the entire feature.
    expect(precacheFor(emitted, BASE).urls).toContain(`${BASE}index.html`);
    expect(precacheFor(['assets/only.js'], BASE).urls).toContain(`${BASE}index.html`);
  });

  test('CONDITION 2 — the build id IS the manifest, which is the update path', () => {
    // Same bundle, same id: a rebuild that changed nothing must not churn
    // every host's cache. Different bundle, different id: a new cache name,
    // and the activate handler drops the old one.
    const a = precacheFor(emitted, BASE);
    const b = precacheFor([...emitted].reverse(), BASE);
    expect(b.buildId).toBe(a.buildId);

    const changed = precacheFor(
      emitted.map((f) => (f === 'assets/HostShellV2-def456.js' ? 'assets/HostShellV2-999999.js' : f)),
      BASE,
    );
    expect(changed.buildId).not.toBe(a.buildId);
    expect(a.buildId).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('THE SAFETY CASE — navigation is network-first', () => {
  test('the worker tries the network before the cache, for navigations', () => {
    // Asserted on the source because this is the property the ban was lifted
    // on, and it must not be quietly inverted later by someone optimising
    // for speed. A cache-first navigation is the failure Norman described.
    const nav = SW_TEMPLATE.slice(SW_TEMPLATE.indexOf("req.mode === 'navigate'"));
    const tryFetch = nav.indexOf('await fetch(req)');
    const tryCache = nav.indexOf('caches.open');
    expect(tryFetch).toBeGreaterThan(-1);
    expect(tryCache).toBeGreaterThan(tryFetch);
  });

  test('CONDITION 3 — the worker carries its own kill switch', () => {
    expect(SW_TEMPLATE).toContain('sw-kill.txt');
    expect(SW_TEMPLATE).toContain('self.registration.unregister()');
    // …and it checks before it does anything else on activate, so a killed
    // worker never claims clients.
    const act = SW_TEMPLATE.slice(SW_TEMPLATE.indexOf("addEventListener('activate'"));
    expect(act.indexOf('KILL_URL')).toBeLessThan(act.indexOf('clients.claim'));
  });

  test('it never caches anything that could be a plan or a price', () => {
    expect(SW_TEMPLATE).toMatch(/\(api\|unfurl\|results\)/);
    // No skipWaiting CALL: a worker taking over mid-session can hand a
    // running app a half-swapped set of chunks. Matched on the invocation,
    // not the word — the template explains in a comment why it is absent,
    // and the first version of this test failed on its own explanation.
    expect(SW_TEMPLATE).not.toMatch(/\bself\.skipWaiting\s*\(/);
    expect(SW_TEMPLATE).not.toMatch(/[^.\w]skipWaiting\s*\(/);
  });

  test('one bad asset cannot fail the whole install', () => {
    // An install that rejects leaves a registration with an empty cache,
    // which is strictly worse than no worker.
    expect(SW_TEMPLATE).toMatch(/c\.add\(u\)\.catch/);
  });
});

describe('IT CANNOT REACH THE FROZEN CRA SHELL', () => {
  test('the worker ships INSIDE the hostv2 bundle, so its scope stops there', () => {
    // A service worker's default scope is the directory it is served from.
    // sw.js is emitted into the hostv2 bundle, so it controls
    // /ngw-event-planner/hostv2/ and CANNOT control /ngw-event-planner/ —
    // where the frozen CRA shell and the public vendor-brief page live.
    //
    // This matters more than it looks. A worker with site-root scope would
    // start caching a shell that is under an A1 freeze and that a vendor
    // opens from an emailed link, and the 2026-07-28 board's original
    // objection to the CRA manifest was precisely that an install would
    // "have launched the FROZEN App.js shell".
    const { urls } = precacheFor(['index.html', 'assets/a.js'], BASE);
    for (const u of urls) expect(u.startsWith(BASE)).toBe(true);
    // …and nothing in the precache reaches above the bundle.
    expect(urls.some((u) => /\/ngw-event-planner\/[^h]/.test(u))).toBe(false);
  });

  test('the KILL file is the one thing read from above it, and it is not cached', () => {
    // sw-kill.txt lives at the site root on purpose: one file disables every
    // worker under it. It is fetched no-store so a cached "not killed" can
    // never outlive the decision to kill.
    expect(SW_TEMPLATE).toContain("cache: 'no-store'");
  });
});

describe('THE PAGE-SIDE KILL SWITCH, which works when the worker does not', () => {
  let store; let unregistered; let deleted;
  beforeEach(() => {
    store = {};
    unregistered = 0;
    deleted = [];
    global.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    };
    global.caches = {
      keys: async () => ['ngw-shell-old', 'other'],
      delete: async (k) => { deleted.push(k); return true; },
    };
    global.navigator = {
      serviceWorker: {
        getRegistrations: async () => [{ unregister: async () => { unregistered += 1; return true; } }],
        register: vi.fn(async () => ({})),
      },
    };
  });

  const loc = (search, protocol = 'https:', hostname = 'example.com') => ({ search, protocol, hostname });

  test('?nosw=1 tears everything down and does NOT register', async () => {
    // The URL a host can be read over the phone. It runs from the
    // network-loaded page, so it works even when the worker is serving a
    // broken shell — which is possible precisely because navigation is
    // network-first.
    const r = await registerOfflineShell('/sw.js', loc('?nosw=1'));
    expect(r).toBe('killed');
    expect(unregistered).toBe(1);
    expect(deleted.length).toBeGreaterThan(0);
    expect(global.navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  test('and it STAYS off on the next visit, without the parameter', async () => {
    await registerOfflineShell('/sw.js', loc('?nosw=1'));
    expect(offlineShellKilled()).toBe(true);
    const again = await registerOfflineShell('/sw.js', loc(''));
    expect(again).toBe('killed');
    expect(global.navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  test('otherwise it registers, but only where a worker can actually install', async () => {
    expect(await registerOfflineShell('/sw.js', loc(''))).toBe('registered');
    store = {};
    expect(await registerOfflineShell('/sw.js', loc('', 'http:', 'example.com'))).toBe('skipped');
    store = {};
    expect(await registerOfflineShell('/sw.js', loc('', 'http:', 'localhost'))).toBe('registered');
  });

  test('a registration that throws is never a host-facing error', async () => {
    global.navigator.serviceWorker.register = vi.fn(async () => { throw new Error('nope'); });
    expect(await registerOfflineShell('/sw.js', loc(''))).toBe('skipped');
  });

  test('disabling twice is safe', async () => {
    await disableOfflineShell();
    await disableOfflineShell();
    expect(unregistered).toBe(2);
  });
});

describe('WHEN THIS SCREEN LAST HAD SIGNAL', () => {
  beforeEach(() => {
    const store = {};
    global.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    };
  });

  test('never having recorded one is not "just now"', () => {
    // The shell can now open with no network at all, including on a device
    // that has never had one. A missing record must read as missing.
    expect(lastSignalAt()).toBeNull();
    expect(lastSignalNote()).toBeNull();
  });

  test('it says how long ago, in words that degrade upward', () => {
    const t = Date.UTC(2027, 5, 1, 12, 0, 0);
    expect(lastSignalNote(t, t + 30 * 1000)).toMatch(/a moment ago/);
    expect(lastSignalNote(t, t + 20 * 60000)).toBe('Last updated 20 minutes ago.');
    expect(lastSignalNote(t, t + 3 * 3600000)).toBe('Last updated 3 hours ago.');
    expect(lastSignalNote(t, t + 26 * 3600000)).toBe('Last updated 1 day ago.');
    expect(lastSignalNote(t, t + 9 * 86400000)).toBe('Last updated 1 week ago.');
  });

  test('a clock that moved backwards says nothing rather than something silly', () => {
    const t = Date.UTC(2027, 5, 1, 12, 0, 0);
    expect(lastSignalNote(t, t - 60000)).toBeNull();
  });

  test('registering records the signal, and a KILLED worker still does', async () => {
    global.caches = { keys: async () => [], delete: async () => true };
    global.navigator = {
      serviceWorker: { getRegistrations: async () => [], register: vi.fn(async () => ({})) },
    };
    await registerOfflineShell('/sw.js', { search: '?nosw=1', protocol: 'https:', hostname: 'x.com' });
    // The timestamp is about the PAGE reaching the network, not about the
    // worker. A host who turned the worker off still deserves an honest one.
    expect(lastSignalAt()).not.toBeNull();
  });

  test('storage that throws is survivable', () => {
    global.localStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(() => markSignal()).not.toThrow();
    expect(lastSignalAt()).toBeNull();
  });
});

describe('THE VENDOR REDIRECT STAYS AHEAD OF THE REGISTRATION', () => {
  test('a vendor opening a brief link is never given a worker', () => {
    // Board order, 2026-09-27: "pin the vendor-redirect ordering — it is
    // currently correct by accident of statement order, and nothing protects
    // it." This is the protection.
    //
    // ?vendor=TOKEN sends the visitor one directory UP, to the frozen CRA's
    // brief page, which is outside this bundle's scope. The redirect is a
    // synchronous location.replace at module-eval time; the registration is
    // in a `load` listener at the foot of the file, which the replace
    // pre-empts. Reorder them and a vendor starts installing a worker for an
    // app they are not using.
    const src = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
    const redirect = src.indexOf('window.location.replace(briefUrl)');
    const register = src.indexOf('registerOfflineShell(');
    expect(redirect).toBeGreaterThan(-1);
    expect(register).toBeGreaterThan(redirect);
    // …and the registration is deferred to `load`, not run at module scope.
    const tail = src.slice(register - 400, register);
    expect(tail).toMatch(/addEventListener\('load'/);
  });
});

describe('IT ONLY SAYS "CLOSE AND REOPEN" WHEN A WORKER IS ACTUALLY WAITING', () => {
  // The e2e drive (e2e/closeItAndOpenItAgain.spec.mjs) proves the LINE; this
  // proves the TRIGGER. Neither is the whole thing: a real second worker
  // version cannot be installed under Playwright, because the browser's
  // update check does not pass through request routing — measured, 0
  // interceptions of sw.js.
  const fakeReg = () => {
    const listeners = {};
    return {
      waiting: null,
      installing: null,
      addEventListener: (k, fn) => { (listeners[k] ||= []).push(fn); },
      fire: (k) => (listeners[k] || []).forEach((fn) => fn()),
    };
  };
  const fakeWorker = () => {
    const listeners = {};
    return {
      state: 'installing',
      addEventListener: (k, fn) => { (listeners[k] ||= []).push(fn); },
      become: function (state) { this.state = state; (listeners.statechange || []).forEach((fn) => fn()); },
    };
  };

  let nav;
  beforeEach(() => {
    nav = { serviceWorker: { controller: {}, register: vi.fn(), getRegistrations: vi.fn(async () => []) } };
    globalThis.navigator = nav;
  });

  // watchForWaitingWorker is module-private on purpose — it is reached the way
  // the app reaches it, through registerOfflineShell.
  const register = async (reg, onWaiting) => {
    nav.serviceWorker.register = vi.fn(async () => reg);
    const { registerOfflineShell } = await import('../src/offline/register.js');
    return registerOfflineShell('sw.js', { protocol: 'https:', hostname: 'x.test', search: '' }, onWaiting);
  };

  test('a worker already waiting at registration is announced', async () => {
    const reg = fakeReg();
    reg.waiting = {};
    const onWaiting = vi.fn();
    await register(reg, onWaiting);
    expect(onWaiting).toHaveBeenCalledTimes(1);
  });

  test('a worker that finishes installing later is announced then', async () => {
    const reg = fakeReg();
    const onWaiting = vi.fn();
    await register(reg, onWaiting);
    expect(onWaiting).not.toHaveBeenCalled();

    const next = fakeWorker();
    reg.installing = next;
    reg.fire('updatefound');
    next.become('installing');           // not yet
    expect(onWaiting).not.toHaveBeenCalled();
    next.become('installed');            // now
    expect(onWaiting).toHaveBeenCalledTimes(1);
  });

  test('A FIRST INSTALL IS SILENT: no controller means nothing is being replaced', async () => {
    // This is the gate that keeps the line honest. On a first visit a worker
    // installs and waits for the next load too — but it is not replacing an
    // app the host is looking at, so "close it and open it again" would be a
    // meaningless instruction.
    nav.serviceWorker.controller = null;
    const reg = fakeReg();
    reg.waiting = {};
    const onWaiting = vi.fn();
    await register(reg, onWaiting);
    expect(onWaiting).not.toHaveBeenCalled();
  });
});
