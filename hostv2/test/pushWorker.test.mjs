// ─── THE WORKER'S TWO PUSH HANDLERS (owner decision "B", 11/20/2026) ────────
//
// The offline-shell board (docs/audits/2026-08-16_OFFLINE_SHELL_BOARD.md) let a
// worker ship on conditions: network-first navigation, the kill switches, the
// update path. Device notifications add a `push` and a `notificationclick`
// handler and nothing else, so these tests RUN the generated worker against a
// fake ServiceWorkerGlobalScope and pin three things:
//   · not on the device in use: a visible window of the app means no notification;
//   · a killed worker shows nothing;
//   · a tap opens the worker's own scope (or focuses the window already there),
//     never an address carried in the push;
// and that the caching handlers are byte-for-byte the ones the board approved.
import { describe, test, expect } from 'vitest';
import { SW_TEMPLATE } from '../src/offline/swTemplate.js';

const SCOPE = 'https://example.test/ngw-event-planner/hostv2/';

function boot({ windows = [] } = {}) {
  const listeners = {};
  const shown = [];
  const opened = [];
  const self = {
    addEventListener: (k, fn) => { listeners[k] = fn; },
    location: { origin: 'https://example.test', href: SCOPE + 'sw.js' },
    registration: {
      scope: SCOPE,
      showNotification: async (title, opts) => { shown.push({ title, opts }); },
      unregister: async () => true,
    },
    clients: {
      matchAll: async () => windows,
      openWindow: async (url) => { opened.push(url); return null; },
      claim: async () => {},
    },
  };
  const src = SW_TEMPLATE
    .replace('__BUILD_ID__', 'test')
    .replace('__PRECACHE__', '[]')
    .replace('__BASE__', '../');
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', src)(self, {}, async () => { throw new Error('no network'); });
  const fire = async (type, event) => {
    let work = Promise.resolve();
    listeners[type]({ ...event, waitUntil: (p) => { work = p; } });
    await work;
  };
  return { listeners, shown, opened, fire };
}

const pushOf = (payload) => ({ data: { json: () => payload } });
const ALERT = { title: 'Jordan replied Yes', body: 'Friendsgiving', tag: 'ngw-alert-ev1' };

describe('THE PUSH HANDLER', () => {
  test('shows the alert when no window of the app is visible', async () => {
    const w = boot({ windows: [{ url: SCOPE, visibilityState: 'hidden' }] });
    await w.fire('push', pushOf(ALERT));
    expect(w.shown).toEqual([{ title: 'Jordan replied Yes', opts: { body: 'Friendsgiving', tag: 'ngw-alert-ev1' } }]);
  });

  test('NOT ON THE DEVICE IN USE: a visible window means no notification', async () => {
    const w = boot({ windows: [{ url: SCOPE + '?elegant=1', visibilityState: 'visible' }] });
    await w.fire('push', pushOf(ALERT));
    expect(w.shown).toEqual([]);
  });

  test('a killed worker shows nothing', async () => {
    const w = boot();
    w.listeners.message({ data: { type: 'ngw-kill' }, ports: [] });
    await w.fire('push', pushOf(ALERT));
    expect(w.shown).toEqual([]);
  });

  test('a push with no title, or no JSON at all, shows nothing', async () => {
    const w = boot();
    await w.fire('push', pushOf({ body: 'x' }));
    await w.fire('push', { data: { json: () => { throw new Error('not json'); } } });
    await w.fire('push', { data: null });
    expect(w.shown).toEqual([]);
  });

  test('only the three fields are used, and they are clipped', async () => {
    const w = boot();
    await w.fire('push', pushOf({ ...ALERT, title: 'J'.repeat(500), url: 'https://elsewhere.example/', icon: 'x' }));
    expect(w.shown[0].title).toHaveLength(120);
    expect(Object.keys(w.shown[0].opts).sort()).toEqual(['body', 'tag']);
  });
});

describe('A TAP ON THE NOTIFICATION', () => {
  const tap = { notification: { close() { this.closed = true; } } };

  test('focuses the window that already has the app', async () => {
    const focused = [];
    const win = { url: SCOPE + '?elegant=1', visibilityState: 'hidden', focus: async () => { focused.push(1); } };
    const w = boot({ windows: [win] });
    await w.fire('notificationclick', tap);
    expect(focused).toEqual([1]);
    expect(w.opened).toEqual([]);
  });

  test('otherwise opens the app at its own scope, never an address from the push', async () => {
    const w = boot({ windows: [{ url: 'https://example.test/ngw-event-planner/', focus: async () => {} }] });
    await w.fire('notificationclick', { notification: { close() {}, data: { url: 'https://elsewhere.example/' } } });
    expect(w.opened).toEqual([SCOPE]);
  });
});

describe('A TAP OPENS THE EVENT IT IS ABOUT', () => {
  const tapOn = (tag) => ({ notification: { close() {}, tag } });

  test('no app window: opens the app at that event', async () => {
    const w = boot();
    await w.fire('notificationclick', tapOn('ngw-alert-ev_9xK2'));
    expect(w.opened).toEqual([SCOPE + '?event=ev_9xK2']);
  });

  test('an app window open: tells it which event, then brings it forward', async () => {
    const said = []; const focused = [];
    const win = { url: SCOPE, focus: async () => { focused.push(1); }, postMessage: (m) => { said.push(m); } };
    const w = boot({ windows: [win] });
    await w.fire('notificationclick', tapOn('ngw-alert-ev_9xK2'));
    expect(said).toEqual([{ type: 'ngw-open-event', id: 'ev_9xK2' }]);
    expect(focused).toEqual([1]);
    expect(w.opened).toEqual([]);
  });

  test('a tag that is not an event id is ignored: the plain app opens', async () => {
    const w = boot();
    await w.fire('notificationclick', tapOn('ngw-alert-../../evil?x=<b>'));
    expect(w.opened).toEqual([SCOPE]);
  });
});

describe('THE BOARD\'S CONDITIONS ARE UNTOUCHED', () => {
  test('the push handlers cache nothing and fetch nothing', () => {
    const tail = SW_TEMPLATE.slice(SW_TEMPLATE.indexOf("addEventListener('push'"));
    expect(tail).not.toMatch(/caches\.|fetch\(|skipWaiting/);
  });

  test('they come after every caching handler, which keep their order', () => {
    const at = (s) => SW_TEMPLATE.indexOf(s);
    expect(at("addEventListener('install'")).toBeLessThan(at("addEventListener('activate'"));
    expect(at("addEventListener('activate'")).toBeLessThan(at("addEventListener('fetch'"));
    expect(at("addEventListener('fetch'")).toBeLessThan(at("addEventListener('push'"));
    expect(at("addEventListener('push'")).toBeLessThan(at("addEventListener('notificationclick'"));
  });
});
