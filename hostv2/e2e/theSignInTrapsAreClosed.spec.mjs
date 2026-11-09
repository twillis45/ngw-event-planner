// ─── THE TWO SIGN-IN TRAPS FROM THE LIVE SMOKE TEST (11/7/2026) ────────────
//
// 1. THE WRONG BROWSER. Sign-in was a link only. A link tapped in a mail app
//    opens that app's own browser, which has none of the host's plan, so the
//    owner signed in and their Game Night "vanished". The same email now
//    carries a code, typed into the browser that already has the plan.
//
// 2. THE DELETED PLAN CAME BACK. "Delete my account" left every local copy on
//    the device, and the next sign-in uploaded them into the new account. The
//    same upload put one person's synced events into another person's account
//    on a shared device. Now an event this device already synced to an account
//    is never uploaded to a different one, and deleting the account removes
//    its events from the device while plans saved only here stay.
//
// On the rsvpsync bundle (5277), the one built with BOTH a fake Supabase
// project and an API base, so the deletion route exists. Every request to
// either is answered below; nothing leaves the machine.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(5277);
const PROJECT = 'https://rsvpsync.supabase.co';
const API = 'https://rsvpsync-mock.invalid';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const USER = { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' };
const session = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999, user: USER,
});
const ev = (id, name) => ({ id, name, type: 'Game Night', date: '2027-03-06', createdAt: '2026-11-01T10:00:00.000Z',
  guestMode: 'count', guestEstimate: 6, guestCountSource: 'host', budget: [], vendors: [], guests: [] });

const install = async (page, { signedIn, locals, stamped = [], cloud = [], failUploads = [], cache = [] }) => {
  const calls = { writes: [], verify: [], deleted: 0 };
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request(); const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/events')) {
      if (req.method() !== 'GET') {
        const body = req.postData() || ''; calls.writes.push(body);
        // A plan whose upload fails stays "saved only on this device".
        if (failUploads.some((id) => body.includes(id))) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"down"}' });
        return json([{ id: 'x', updated_at: '2026-11-07T12:00:00.000000+00:00' }]);
      }
      return json(cloud.map((e) => ({ id: e.id, data: e, updated_at: '2026-11-07T12:00:00.000000+00:00' })));
    }
    if (url.includes('/auth/v1/otp')) return json({});
    if (url.includes('/auth/v1/verify')) { calls.verify.push(req.postDataJSON()); return json(session()); }
    if (url.includes('/auth/v1/')) return json({});
    return json([]);
  });
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    if (req.url().endsWith('/api/account') && req.method() === 'DELETE') {
      calls.deleted += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deleted: true, retained_categories: [] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.addInitScript(([sess, list, ids, cached]) => {
    window.__toasts = [];
    new MutationObserver(() => {
      document.querySelectorAll('[role=status]').forEach((n) => {
        const x = (n.innerText || '').trim();
        if (x && window.__toasts[window.__toasts.length - 1] !== x) window.__toasts.push(x);
      });
    }).observe(document, { subtree: true, childList: true, characterData: true });
    if (sessionStorage.getItem('__booted')) return; // a reload keeps what the app wrote
    sessionStorage.setItem('__booted', '1');
    if (sess) localStorage.setItem('sb-rsvpsync-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify(list));
    localStorage.setItem('ngw-hostv2-last-event', list[0].id);
    const stamps = {}; ids.forEach((id) => { stamps[id] = '2026-11-06T12:00:00.000Z'; });
    localStorage.setItem('ngw-hostv2-sync-stamps', JSON.stringify(stamps));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    if (cached.length) localStorage.setItem('ngw-events', JSON.stringify(cached));
  }, [signedIn ? session() : null, locals, stamped, cache]);
  return calls;
};

const boot = async (page) => {
  await page.goto(BASE + '?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
};

const openSettings = async (page) => {
  const header = page.locator('[aria-label="You and settings"]').first();
  if (await header.count() && await header.isVisible()) await header.click();
  else {
    await page.locator('[aria-label="Menu"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('.navrow', { hasText: 'You & settings' }).first().click();
  }
  await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
};

const localIds = (page) => page.evaluate(() => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events')) || []).map((e) => e.id));

test('signing in never uploads an event this device synced to another account', async ({ page }) => {
  const calls = await install(page, {
    signedIn: true,
    locals: [ev('ev-other-account', 'Old Game Night'), ev('ev-built-signed-out', 'New Brunch')],
    stamped: ['ev-other-account'],
    cloud: [],
  });
  await boot(page);
  await page.waitForTimeout(3500);
  const sent = calls.writes.join('\n');
  // PREMISE: the upload ran at all, so "not uploaded" below is a real claim.
  expect(sent, 'the never-synced plan should move into the account').toContain('ev-built-signed-out');
  expect(sent, 'a plan synced to a different account was uploaded into this one').not.toContain('ev-other-account');
});

test('the code from the email signs in this browser, and the plan stays', async ({ page }) => {
  const calls = await install(page, { signedIn: false, locals: [ev('ev-mine', 'My Game Night')] });
  await boot(page);
  await openSettings(page);
  await page.getByLabel('Email for sign-in link').fill('harness@example.invalid');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  const code = page.getByLabel('Sign-in code from the email');
  await expect(code).toBeVisible();
  await code.fill('482 913');
  await page.getByRole('button', { name: 'Sign in with the code' }).click();
  await expect(page.getByText('Signed in as', { exact: false })).toBeVisible({ timeout: 8000 });
  expect(calls.verify[0]).toMatchObject({ email: 'harness@example.invalid', token: '482913', type: 'email' });
  expect(await localIds(page)).toContain('ev-mine');
});

test('deleting the account takes its events off this device, and keeps device-only plans', async ({ page }) => {
  const calls = await install(page, {
    signedIn: true,
    locals: [ev('ev-in-account', 'Account Game Night'), ev('ev-device-only', 'Device Brunch')],
    stamped: ['ev-in-account'],
    cloud: [ev('ev-in-account', 'Account Game Night')],
    failUploads: ['ev-device-only'],
  });
  await boot(page);
  await page.waitForTimeout(2500);
  await openSettings(page);
  await page.getByRole('button', { name: 'Delete my account…' }).click();
  await page.getByLabel('Type DELETE to confirm account deletion').fill('DELETE');
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__toasts.join(' | '))).toContain('Your account is deleted, with its events.');
  expect(calls.deleted).toBe(1);
  expect(await localIds(page)).toEqual(['ev-device-only']);
  const stamps = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-sync-stamps') || '{}'));
  expect(Object.keys(stamps)).not.toContain('ev-in-account');
  // And after a reload the deleted event does not come back.
  await page.reload();
  await page.waitForTimeout(2000);
  expect(await localIds(page)).toEqual(['ev-device-only']);
});

// THE CACHE BROUGHT IT BACK (live smoke test, 11/9/2026). After a real
// deletion the owner's event still showed: the app also keeps every event it
// loaded from the account in 'ngw-events', and that cache is read back on
// every boot. The account's copies must leave it too.
test('a deleted account\'s events do not come back from the account cache', async ({ page }) => {
  const calls = await install(page, {
    signedIn: true,
    locals: [ev('ev-device-only', 'Device Brunch')],
    stamped: ['ev-cached-account'],
    cache: [ev('ev-cached-account', 'Cached Account Night')],
    cloud: [ev('ev-cached-account', 'Cached Account Night')],
    failUploads: ['ev-device-only'],
  });
  await boot(page);
  await page.waitForTimeout(2500);
  await openSettings(page);
  await page.getByRole('button', { name: 'Delete my account…' }).click();
  await page.getByLabel('Type DELETE to confirm account deletion').fill('DELETE');
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__toasts.join(' | '))).toContain('Your account is deleted, with its events.');
  expect(calls.deleted).toBe(1);
  await page.waitForTimeout(4000);   // past the reload that follows a deletion
  const cachedIds = await page.evaluate(() => (JSON.parse(localStorage.getItem('ngw-events') || '[]')).map((e) => e && e.id));
  expect(cachedIds, 'the account cache still holds the deleted account\'s event').not.toContain('ev-cached-account');
  await page.reload();
  await page.waitForTimeout(2000);
  expect(await page.locator('body').innerText()).not.toMatch(/Cached Account Night/i);
});
