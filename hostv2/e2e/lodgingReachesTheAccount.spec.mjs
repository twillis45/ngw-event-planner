// ─── LODGING REACHES THE ACCOUNT (G10, 11/12/2026) ──────────────────────────
//
// The cockpit (`?demo=lodging`) is its own page with one write path, `patch`,
// and that path wrote THIS BROWSER only. A signed-in host's shortlist and pick
// reached the account only if some later edit in the shell happened to save
// the event.
//
// It was worse than late. The shell's sign-in pull treats an event with a
// success stamp and nothing queued as SYNCED, and a SYNCED event whose account
// copy differs is "someone else's later write" — so the next signed-in load
// replaced the lodging work with the account copy that never had it, and
// announced it as "a newer version from your account". Test 1 walks exactly
// that: cockpit edit, then back to the plan.
//
// THE HARNESS is crossDeviceSync's and aRefusedSaveIsNotCalledSaved's: the
// synctest bundle on 5244 (a fake Supabase project), a fabricated session in
// localStorage, every REST call answered here. The account is STATEFUL — a
// write that lands is what the next read returns — because the overwrite this
// file guards against is a read-after-write question.
//
// THE CHANGE IS A REAL PASTE: two Google Hotels cards into the paste box,
// "Add 2 to the shortlist" — the same no-network path lodgingCockpit.spec uses
// for its no-photo test, so nothing here depends on the unfurl backend.
//
// RUN: cd hostv2 && npm run e2e:build
//      npx playwright test e2e/lodgingReachesTheAccount.spec.mjs --retries=0
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(Number(process.env.PW_SYNCTEST_PORT || 5244));
const PROJECT = 'https://synctest.supabase.co';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const EVENT_ID = 'ev-lodging-probe';
const SAMPLE_ID = 'cust-demo-santafe';

const T1 = '2026-11-12T10:00:00.000Z';   // the version this device loaded
const T2 = '2026-11-12T11:00:00.000Z';   // a newer write from elsewhere

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

// A destination event of the host's own — a town, dates, a party, no places yet.
const hostEvent = () => ({
  id: EVENT_ID, name: 'Lake Weekend', type: 'Birthday',
  date: '2028-06-17', endDate: '2028-06-21', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', guestCount: 10, totalBudget: 4800,
  lodgingOptions: [], budget: [], vendors: [], guests: [],
  createdAt: '2026-11-01T10:00:00.000Z',
});

const HOTELS = [
  '<div>https://www.google.com/travel/search?q=hotels</div>',
  '<a href="/aclk?adurl=x"><img src="https://lh3.googleusercontent.com/a"/>',
  '<span>Inn of the Turquoise Bear</span><span>$212</span><span>4.9/5</span>',
  '<span>(242)</span><span>4-star hotel</span></a>',
  '<a href="/aclk?adurl=y"><img src="https://lh3.googleusercontent.com/b"/>',
  '<span>La Fonda on the Plaza</span><span>$257</span><span>4.5/5</span>',
  '<span>(2.9K)</span><span>4-star hotel</span></a>',
].join('');

/**
 * Answer the fake project. `mode` is what the account does with a write:
 *   'ok'       — it lands; the next read returns it
 *   'conflict' — the conditional UPDATE matches nothing; the probe says T2
 *   'offline'  — the request never arrives
 * `seed`: which event the device starts with (null = an empty store).
 * `signedIn`: whether a session is in storage.
 */
const install = async (page, { mode = 'ok', seed = hostEvent(), signedIn = true } = {}) => {
  const cloud = new Map();
  if (seed) cloud.set(seed.id, { data: seed, updated_at: T1 });
  const writes = [];
  let n = 0;
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/studio_settings')) return json([]);
    if (url.includes('/auth/v1/')) return json({});
    if (url.includes('/rest/v1/events')) {
      if (req.method() === 'GET') {
        if (/select=updated_at(&|$)/.test(url)) return json(mode === 'conflict' ? { updated_at: T2 } : null);
        return json([...cloud].map(([id, r]) => ({ id, data: r.data, updated_at: r.updated_at })));
      }
      let body = null;
      try { body = req.postDataJSON(); } catch { body = null; }
      const row = Array.isArray(body) ? body[0] : body;
      const id = (row && row.id) || (decodeURIComponent(url).match(/id=eq\.([^&]+)/) || [])[1];
      writes.push({ method: req.method(), url, id, data: row && row.data });
      if (mode === 'offline') return route.abort('internetdisconnected');
      if (mode === 'conflict' && req.method() === 'PATCH') return json([]);
      const stamp = `2026-11-12T12:00:${String(++n).padStart(2, '0')}.000Z`;
      cloud.set(id, { data: row && row.data, updated_at: stamp });
      return json([{ id, updated_at: stamp }]);
    }
    return json([]);
  });

  await page.addInitScript(([sess, local, evId]) => {
    if (sess) localStorage.setItem('sb-synctest-auth-token', JSON.stringify(sess));
    // Seed ONCE: an init script re-runs on every navigation, and re-seeding
    // would put the original copy back over what the test is measuring.
    if (local && !localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([local]));
      localStorage.setItem('ngw-hostv2-last-event', evId);
    }
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    window.__toastsSeen = [];
    setInterval(() => {
      const t = ((document.querySelector('div.toast') || {}).innerText || '').replace(/\s+/g, ' ').trim();
      if (t && !window.__toastsSeen.includes(t)) window.__toastsSeen.push(t);
    }, 80);
  }, [signedIn ? fakeSession() : null, seed, seed && seed.id]);
  return { writes, cloud };
};

// The plan, booted and hydrated: the sign-in pull stamps the event synced at
// T1 — the state every signed-in host's device is in before opening lodging.
const bootShell = async (page) => {
  await page.goto(BASE + '?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(2000);
};

const openCockpit = async (page) => {
  await page.goto(BASE + '?demo=lodging');
  await expect(page.locator('.lc-h1')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(500);   // the session read
};

const addTwoHotels = async (page) => {
  await page.locator('textarea').fill(HOTELS);
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
  const add = page.getByRole('button', { name: /Add \d+ to the shortlist|Add it/i });
  await add.first().click({ timeout: 10000 });
  await expect(page.locator('.lc-h1')).toHaveText(/2 places/i, { timeout: 10000 });
  await page.waitForTimeout(1500);   // the write, and the refusal probe if any
};

const stored = (page, id) => page.evaluate((evId) => {
  const list = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]');
  const ev = list.find((e) => e && e.id === evId) || {};
  return { options: (ev.lodgingOptions || []).length, toasts: window.__toastsSeen || [] };
}, id);

const lodgingWrites = (writes, id) => writes.filter((w) => w.id === id && w.data && Array.isArray(w.data.lodgingOptions) && w.data.lodgingOptions.length > 0);
const STATUS = '.lc-savestate';

test.describe('lodging reaches the account', () => {
  test('a signed-in shortlist is saved to the account, and the next load keeps it', async ({ page }) => {
    const { writes, cloud } = await install(page, { mode: 'ok' });
    await bootShell(page);
    await openCockpit(page);
    await addTwoHotels(page);

    const sent = lodgingWrites(writes, EVENT_ID);
    expect(sent.length, `no write carried the shortlist — writes seen: ${JSON.stringify(writes.map((w) => [w.method, w.id]))}`).toBeGreaterThan(0);
    // The shell's conditional path, not a blind upsert: it loaded T1.
    expect(sent[0].method).toBe('PATCH');
    expect(decodeURIComponent(sent[0].url)).toMatch(/updated_at=lte\./);
    expect((cloud.get(EVENT_ID).data.lodgingOptions || []).length).toBe(2);
    await expect(page.locator(STATUS)).toHaveText(/^Synced$/);

    // The overwrite this closes: back to the plan, the sign-in pull runs again.
    await page.getByRole('button', { name: /The rest of the plan/i }).click();
    await bootShell(page);
    const s = await stored(page, EVENT_ID);
    expect(s.options, 'the account copy replaced the lodging work on the next load').toBe(2);
    expect(s.toasts.filter((t) => /newer version from your account/i.test(t))).toHaveLength(0);
  });

  test('a refused save is shown as not saved', async ({ page }) => {
    // The device loaded T1; another device has since written T2.
    const { writes } = await install(page, { mode: 'conflict', seed: { ...hostEvent(), _cloudUpdatedAt: T1 } });
    await openCockpit(page);
    await addTwoHotels(page);
    expect(lodgingWrites(writes, EVENT_ID).length, 'premise: the save was attempted').toBeGreaterThan(0);
    const line = page.locator(STATUS);
    await expect(line).toHaveText(/Changed somewhere else — your edit is on this device only/);
    await expect(line).not.toHaveText(/^Synced$/);
    expect((await stored(page, EVENT_ID)).options, 'the refused edit was lost from this device').toBe(2);
  });

  test('a save that cannot get through is shown as waiting, not saved', async ({ page }) => {
    const { writes } = await install(page, { mode: 'offline', seed: { ...hostEvent(), _cloudUpdatedAt: T1 } });
    await openCockpit(page);
    await addTwoHotels(page);
    expect(lodgingWrites(writes, EVENT_ID).length, 'premise: the save was attempted').toBeGreaterThan(0);
    await expect(page.locator(STATUS)).toHaveText(/Couldn’t sync — will retry/);
    const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-cache-pending') || '[]'));
    expect(pending.some((op) => op && op.id === 'ev-lodging-probe'), 'the failed save was not queued for retry').toBe(true);
  });

  test('the Santa Fe example is never saved to the account', async ({ page }) => {
    const { writes } = await install(page, { mode: 'ok', seed: null });
    await openCockpit(page);
    await page.getByRole('button', { name: /Load the Santa Fe example/i }).click();
    await expect(page.locator('.lc-eyebrow')).toContainText(/EXAMPLE/);
    await page.waitForTimeout(500);
    await addTwoHotels(page);
    expect((await stored(page, SAMPLE_ID)).options, 'premise: the example changed on this device').toBe(2);
    expect(writes.filter((w) => w.id === SAMPLE_ID), 'the example was sent to the account').toHaveLength(0);
    await expect(page.locator(STATUS)).toHaveText(/^Saved on this device only\.$/);
  });

  test('signed out: the change stays on this device, and says so', async ({ page }) => {
    const { writes } = await install(page, { mode: 'ok', signedIn: false });
    await openCockpit(page);
    await addTwoHotels(page);
    expect((await stored(page, EVENT_ID)).options).toBe(2);
    expect(writes, 'a signed-out change was sent to an account').toHaveLength(0);
    await expect(page.locator(STATUS)).toHaveText(/^Saved on this device only\.$/);
  });
});
