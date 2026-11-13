// ─── THE PROFILE FOLLOWS THE ACCOUNT (G19 + preferences + Ask, 11/12/2026) ──
//
// Owner decisions, 11/12/2026: the app is "try first, sign in to keep", the
// host's preferences follow the account, and Ask history is kept.
//
// G19, the data loss this file was opened for: the sign-in pull loaded the
// account's profile row and replaced this device's copy WHOLESALE. A name or
// area typed while signed out, or saved while the account write failed, was
// deleted at the next sign-in or token refresh, and `saveProfile` swallowed the
// failure and never retried. The fix keeps an "unsent" marker per field until
// the account confirms it, pushes those fields on the next refresh instead of
// taking the account's copy, and retries when the connection comes back.
//
// THE HARNESS is lodgingReachesTheAccount's: the synctest bundle (a fake
// Supabase project), a fabricated session in localStorage, every REST call
// answered here. The account is STATEFUL and shared across browser contexts,
// so a second context is a second device on the same account.
//
// RUN: cd hostv2 && npm run e2e:build
//      npx playwright test e2e/theProfileFollowsTheAccount.spec.mjs --retries=0
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(Number(process.env.PW_SYNCTEST_PORT || 5244));
const PROJECT = 'https://synctest.supabase.co';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const EVENT_ID = 'ev-ask-probe';
const AUTH_KEY = 'sb-synctest-auth-token';

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

const askEvent = () => ({
  id: EVENT_ID, name: 'Ask Probe Party', type: 'Birthday', date: '2028-06-17',
  venueCity: 'Annapolis, MD', guestCount: 24, totalBudget: 2400,
  budget: [], vendors: [], guests: [], timeline: [],
  createdAt: '2026-11-01T10:00:00.000Z',
});

/** One fake account, shared by every page that installs it. */
const makeAccount = ({ profile = null, events = [] } = {}) => ({
  profile,                         // studio_settings.data, or null (no row)
  events: new Map(events.map((e) => [e.id, { data: e, updated_at: '2026-11-12T10:00:00.000Z' }])),
  profileWrites: [],
  settingsMode: 'ok',              // 'ok' | 'fail'
});

const install = async (page, account, { signedIn = true, local = {} } = {}) => {
  let n = 0;
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/studio_settings')) {
      if (req.method() === 'GET') {
        const row = account.profile ? { data: account.profile } : null;
        const single = /vnd\.pgrst\.object/.test(req.headers().accept || '');
        return json(single ? row : (row ? [row] : []));
      }
      let body = null;
      try { body = req.postDataJSON(); } catch { body = null; }
      const row = Array.isArray(body) ? body[0] : body;
      account.profileWrites.push(row && row.data);
      if (account.settingsMode === 'fail') return json({ message: 'boom' }, 500);
      account.profile = row && row.data;
      return json([], 201);
    }
    if (url.includes('/auth/v1/')) return json({});
    if (url.includes('/rest/v1/events')) {
      if (req.method() === 'GET') {
        if (/select=updated_at(&|$)/.test(url)) return json(null);
        return json([...account.events].map(([id, r]) => ({ id, data: r.data, updated_at: r.updated_at })));
      }
      let body = null;
      try { body = req.postDataJSON(); } catch { body = null; }
      const row = Array.isArray(body) ? body[0] : body;
      const id = (row && row.id) || (decodeURIComponent(url).match(/id=eq\.([^&]+)/) || [])[1];
      const stamp = `2026-11-12T12:00:${String(++n).padStart(2, '0')}.000Z`;
      account.events.set(id, { data: row && row.data, updated_at: stamp });
      return json([{ id, updated_at: stamp }]);
    }
    return json([]);
  });
  await page.addInitScript(([sess, seed, authKey]) => {
    // Seed ONCE per context: an init script re-runs on every navigation.
    if (!localStorage.getItem('__seeded')) {
      localStorage.setItem('__seeded', '1');
      if (sess) localStorage.setItem(authKey, JSON.stringify(sess));
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [signedIn ? fakeSession() : null, local, AUTH_KEY]);
};

const settle = async (page, ms = 2000) => {
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(ms);
};

const openSettings = async (page) => {
  await page.goto(BASE + '?elegant=1&open=settings');
  await settle(page);
  await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 15000 });
};

const localProfile = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-profile') || 'null'));

const typeName = async (page, name) => {
  const box = page.getByLabel('Your name');
  await box.fill(name);
  await box.blur();
  await page.waitForTimeout(800);
};

test.describe('G19: a profile edit is not wiped by the account copy', () => {
  test('a name typed while signed out survives signing in', async ({ page }) => {
    const account = makeAccount({ profile: { name: 'Account Name', city: 'Baltimore, MD' } });
    // This device synced the account's profile in an earlier session, then signed out.
    await install(page, account, { signedIn: false, local: { 'ngw-profile': { name: 'Account Name', city: 'Baltimore, MD' } } });
    await openSettings(page);
    await typeName(page, 'Signed Out Edit');
    expect((await localProfile(page)).name, 'premise: the edit is on this device').toBe('Signed Out Edit');
    expect(account.profileWrites, 'premise: signed out, nothing reached the account').toHaveLength(0);

    // Sign in (the session lands in storage), and the sign-in pull runs.
    await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [AUTH_KEY, fakeSession()]);
    await openSettings(page);

    expect((await localProfile(page)).name, 'the account copy replaced the signed-out edit').toBe('Signed Out Edit');
    await expect(page.getByLabel('Your name')).toHaveValue('Signed Out Edit');
    expect(account.profile && account.profile.name, 'the signed-out edit never reached the account').toBe('Signed Out Edit');
    // The account's own fields that this device did not change are kept.
    expect(account.profile.city).toBe('Baltimore, MD');
  });

  test('a name whose account save failed is sent at the next load, not replaced', async ({ page }) => {
    const account = makeAccount({ profile: { name: 'Account Name' } });
    await install(page, account, { local: { 'ngw-profile': { name: 'Account Name' } } });
    await openSettings(page);
    account.settingsMode = 'fail';
    await typeName(page, 'Failed Save Edit');
    expect(account.profileWrites.some((d) => d && d.name === 'Failed Save Edit'), 'premise: the save was attempted').toBe(true);
    expect(account.profile.name, 'premise: the account refused it').toBe('Account Name');

    account.settingsMode = 'ok';
    await openSettings(page);
    expect((await localProfile(page)).name, 'the account copy replaced the unsent edit').toBe('Failed Save Edit');
    expect(account.profile.name, 'the unsent edit was not retried').toBe('Failed Save Edit');
  });

  test('a failed save is retried when the connection comes back', async ({ page }) => {
    const account = makeAccount({ profile: { name: 'Account Name' } });
    await install(page, account, { local: { 'ngw-profile': { name: 'Account Name' } } });
    await openSettings(page);
    account.settingsMode = 'fail';
    await typeName(page, 'Back Online Edit');
    expect(account.profile.name, 'premise: the account refused it').toBe('Account Name');

    account.settingsMode = 'ok';
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(() => account.profile.name, { timeout: 8000, message: 'the unsent edit was not retried on reconnect' }).toBe('Back Online Edit');
  });
});

test.describe('preferences follow the account', () => {
  test('theme, sound, analytics and writing voice set on one device arrive on another', async ({ browser }) => {
    const account = makeAccount({ profile: { name: 'Pref Host' } });

    // ── Device A: set every preference through its own control.
    const a = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pa = await a.newPage();
    await install(pa, account, { local: { 'ngw-hostv2-last-event': 'test-day-before-vendors' } });
    await openSettings(pa);
    const sheet = pa.locator('.sheet').last();
    await sheet.getByRole('button', { name: /Off — tap for light/ }).click();
    await sheet.getByRole('button', { name: /On — tap to mute/ }).click();
    await sheet.getByRole('button', { name: /On — tap to turn off/ }).click();
    await pa.waitForTimeout(800);
    // The writing voice lives on a draft: the shopping list's.
    await pa.keyboard.press('Escape');
    await pa.waitForTimeout(300);
    await pa.locator('.srail-row', { hasText: 'spread' }).first().click();
    await pa.locator('.sheet').last().getByText('Copy the shopping list').first().click({ timeout: 10000 });
    await pa.locator('.sheet').last().getByRole('radio', { name: 'Warmer' }).click();
    await pa.waitForTimeout(1200);
    await expect.poll(() => account.profile && account.profile.draftTone, { timeout: 8000 }).toBe('warmer');
    expect(account.profile).toMatchObject({ theme: 'light', messageSoundMuted: true, analyticsOff: true, draftTone: 'warmer' });
    await a.close();

    // ── Device B: a fresh browser on the same account, nothing set locally.
    const b = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pb = await b.newPage();
    await install(pb, account);
    await openSettings(pb);
    await expect.poll(() => pb.evaluate(() => document.documentElement.getAttribute('data-theme')), { timeout: 8000 }).toBe('light');
    const stored = await pb.evaluate(() => ({
      theme: localStorage.getItem('ngw-theme'),
      voice: localStorage.getItem('ngw-hostv2-voice'),
      muted: localStorage.getItem('ngw-hostv2-muted'),
      optout: localStorage.getItem('ngw-analytics-optout'),
    }));
    expect(stored).toEqual({ theme: 'light', voice: 'warmer', muted: '1', optout: '1' });
    const sb = pb.locator('.sheet').last();
    await expect(sb.getByRole('button', { name: /On — tap for dark/ })).toBeVisible();
    await expect(sb.getByRole('button', { name: /Muted — tap for sound/ })).toBeVisible();
    await expect(sb.getByRole('button', { name: /Off — tap to turn on/ })).toBeVisible();
    await b.close();
  });

  test('an unfinished new-event sentence arrives on another device', async ({ page }) => {
    const text = 'Backyard crab feast for 30 on the Fourth';
    const account = makeAccount({ profile: { name: 'Draft Host', createDraft: { text, at: Date.now() } } });
    await install(page, account);
    await page.goto(BASE + '?elegant=1');
    await settle(page);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-create-draft') || 'null')?.text), { timeout: 8000 }).toBe(text);
  });
});

test.describe('Ask history is kept', () => {
  const openAsk = async (page) => {
    await page.locator('.srail-row', { hasText: 'Ask' }).first().click({ timeout: 10000 });
    await expect(page.getByLabel('Ask a question about your plan')).toBeVisible({ timeout: 8000 });
  };
  const QUESTION = 'How much food do I need?';

  test('an Ask exchange is still there after a reload and on another device', async ({ browser }) => {
    const account = makeAccount({ profile: { name: 'Ask Host' }, events: [askEvent()] });
    const a = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pa = await a.newPage();
    await install(pa, account, { local: { 'ngw-hostv2-custom-events': [askEvent()], 'ngw-hostv2-last-event': EVENT_ID } });
    await pa.goto(BASE + '?elegant=1');
    await settle(pa);
    await openAsk(pa);
    await pa.getByLabel('Ask a question about your plan').fill(QUESTION);
    await pa.getByRole('button', { name: 'Ask', exact: true }).click();
    await pa.waitForTimeout(1500);
    const history = pa.locator('[data-ask-history]');

    // Reload on the same device.
    await pa.goto(BASE + '?elegant=1');
    await settle(pa);
    await openAsk(pa);
    await expect(history, 'the exchange vanished on reload').toContainText(QUESTION);
    const saved = account.events.get(EVENT_ID).data.askHistory || [];
    expect(saved.map((x) => x.q), 'the exchange never reached the account').toContain(QUESTION);
    await a.close();

    // A fresh browser on the same account.
    const b = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pb = await b.newPage();
    await install(pb, account, { local: { 'ngw-hostv2-last-event': EVENT_ID } });
    await pb.goto(BASE + '?elegant=1');
    await settle(pb, 3000);
    await expect.poll(async () => (await pb.locator('.ev-eyebrow').first().innerText()).trim(), { timeout: 10000 }).toMatch(/Ask Probe Party/i);
    await openAsk(pb);
    await expect(pb.locator('[data-ask-history]'), 'the exchange did not follow the account').toContainText(QUESTION);
    await b.close();
  });
});
