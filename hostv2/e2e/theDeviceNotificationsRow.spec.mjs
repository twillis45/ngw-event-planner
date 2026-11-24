// ─── "NOTIFICATIONS ON THIS DEVICE" (owner decision "B", 11/20/2026) ─────────
//
// Drives the shipped settings row on the signed-in harness (the 5277 rsvpsync
// bundle: a fake Supabase session and an API base; every request answered
// here). Pins, in a real browser:
//   · desktop Chrome: the row is there, and opening the app and the sheet
//     NEVER asks for notification permission; the tap asks once and sends the
//     server exactly the endpoint and keys;
//   · an iPad whose Safari says "Macintosh": no row at all;
//   · the server without VAPID keys (503): no row at all.
// The browser's push service is stubbed (PushManager.subscribe) because a
// headless browser cannot reach one; the rules live in jest (devicePush.test.js)
// and the worker's handlers in vitest (test/pushWorker.test.mjs).
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn, settled, sheetSettled } from './fixtures.mjs';

const BASE = previewUrl(Number(process.env.PW_RSVPSYNC_PORT || 5277));
const PROJECT = 'https://rsvpsync.supabase.co';
const API = 'https://rsvpsync-mock.invalid';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const EVENT_ID = 'ev-device-notify';
const T_LOADED = '2026-11-20T12:00:00.000000+00:00';
const CHROME_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'host@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

const event = () => ({
  id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'Friendsgiving',
  date: dateIn(12), createdAt: '2026-11-01T10:00:00.000Z', venue: 'Vida’s place',
  guestMode: 'list', guestEstimate: 6, guestCountSource: 'host', budget: [], vendors: [], timeline: [], guests: [],
});

const boot = async (page, { keyStatus = 200, touchPoints = 0 } = {}) => {
  const api = [];
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/events')) {
      if (req.method() !== 'GET') return json([{ id: EVENT_ID, updated_at: T_LOADED }]);
      return json([{ id: EVENT_ID, data: event(), updated_at: T_LOADED }]);
    }
    return json(url.includes('/auth/v1/') ? {} : []);
  });
  await page.route(`${API}/**`, (route) => {
    const req = route.request();
    const url = req.url();
    if (url.includes('/api/push/')) {
      api.push({ method: req.method(), path: new URL(url).pathname, body: req.postDataJSON ? (() => { try { return req.postDataJSON(); } catch { return null; } })() : null });
      if (url.endsWith('/api/push/public-key')) {
        return keyStatus === 200
          ? route.fulfill({ status: 200, json: { key: 'BKeyE2eSynthetic' } })
          : route.fulfill({ status: 503, json: { detail: 'Device notifications are not set up on this server.' } });
      }
      return route.fulfill({ status: 200, json: { ok: true } });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.addInitScript(([sess, ev, stamp, touch]) => {
    // What the page asks of the browser, counted. The answer to the prompt is
    // "Allow"; the push service is a stand-in (headless has none to reach).
    window.__askedPermission = 0;
    // Start as a browser that has never been asked. Headless Chromium on CI
    // reports 'denied' out of the box (locally 'default'), which is the
    // blocked state, not the first-visit one this test is about.
    window.__perm = 'default';
    try {
      Object.defineProperty(Notification, 'permission', { configurable: true, get: () => window.__perm });
      Notification.requestPermission = async () => { window.__askedPermission += 1; window.__perm = 'granted'; return 'granted'; };
    } catch { /* no Notification: the row must not show, which the test sees */ }
    const sub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-device',
      toJSON() { return { endpoint: this.endpoint, expirationTime: null, keys: { p256dh: 'BPubE2e', auth: 'SecE2e' } }; },
      unsubscribe: async () => { window.__unsubscribed = true; return true; },
    };
    if (typeof PushManager !== 'undefined') {
      PushManager.prototype.subscribe = async function subscribe() { window.__subscribed = true; return sub; };
      PushManager.prototype.getSubscription = async function getSubscription() { return window.__subscribed && !window.__unsubscribed ? sub : null; };
    }
    if (touch) Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => touch, configurable: true });
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('sb-rsvpsync-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ ...ev, _cloudUpdatedAt: stamp }]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [fakeSession(), event(), T_LOADED, touchPoints]);
  await page.goto(BASE + '?elegant=1');
  await settled(page);
  return api;
};

const openSettings = async (page) => {
  const header = page.locator('[aria-label="You and settings"]').first();
  if (await header.count() && await header.isVisible()) await header.click();
  else {
    await page.locator('[aria-label="Menu"]').first().click();
    await page.locator('.navrow', { hasText: 'You & settings' }).first().click();
  }
  await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
  await sheetSettled(page);
};

const row = (page) => page.locator('[data-device-notifications]');

test.describe('desktop Chrome', () => {
  test.use({ userAgent: CHROME_MAC });

  test('the row is offered, nothing asks on load, and the tap asks once and saves this device', async ({ page }) => {
    const api = await boot(page);
    await openSettings(page);
    await expect(row(page)).toBeVisible({ timeout: 10_000 });
    await expect(row(page)).toContainText('Notifications on this device');
    await expect(row(page)).toContainText('never what they wrote');
    expect(await page.evaluate(() => window.__askedPermission), 'permission was requested before any tap').toBe(0);

    await row(page).getByRole('button', { name: 'Off', exact: true }).click();
    await expect(row(page).getByRole('button', { name: 'On', exact: true })).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => window.__askedPermission)).toBe(1);
    expect(api.filter((c) => c.method === 'POST')).toEqual([{
      method: 'POST', path: '/api/push/subscribe',
      body: { endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-device', keys: { p256dh: 'BPubE2e', auth: 'SecE2e' } },
    }]);

    await row(page).getByRole('button', { name: 'On', exact: true }).click();
    await expect(row(page).getByRole('button', { name: 'Off', exact: true })).toBeVisible();
    expect(api.filter((c) => c.method === 'DELETE')).toEqual([{
      method: 'DELETE', path: '/api/push/subscribe', body: { endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-device' },
    }]);
    expect(await page.evaluate(() => window.__unsubscribed)).toBe(true);
  });

  test('a server without VAPID keys (503): no row at all', async ({ page }) => {
    const api = await boot(page, { keyStatus: 503 });
    await openSettings(page);
    await expect.poll(() => api.filter((c) => c.path === '/api/push/public-key').length, { timeout: 10_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    await expect(row(page)).toHaveCount(0);
    await expect(page.locator('.sheet')).not.toContainText('Notifications on this device');
  });
});

test.describe('an iPad whose Safari says "Macintosh"', () => {
  test.use({ userAgent: SAFARI_MAC });

  test('no row, no promise, and the server is not even asked', async ({ page }) => {
    const api = await boot(page, { touchPoints: 5 });
    await openSettings(page);
    await page.waitForTimeout(800);
    await expect(row(page)).toHaveCount(0);
    await expect(page.locator('.sheet')).not.toContainText('Notifications on this device');
    await expect(page.locator('.sheet')).not.toContainText(/Home Screen/i);
    expect(api).toEqual([]);
    expect(await page.evaluate(() => window.__askedPermission)).toBe(0);
  });
});
