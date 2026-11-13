// ─── TRY FIRST, SIGN IN TO KEEP (owner ruling, 11/12/2026) ───────────────────
//
// Anyone can type a sentence and see the plan without an account. Keeping it
// takes a free account: every saved event belongs to one, and new plans saved
// only on this device are retired. Guests and vendors never sign in.
//
// What this file holds the shell to, on the synctest harness (a fake Supabase
// project on the 5244 bundle, every request answered here):
//   1. signed out, the creation flow and its reveal run, and the step that
//      keeps the plan asks for an account with the review board's line;
//   2. after the code sign-in, the plan is upserted to the account and she
//      lands in it;
//   3. closing the ask keeps nothing on this device — the plan stays on screen
//      in memory (a later sign-in still keeps it), and a reload brings back
//      her sentence, not an event;
//   4. a plan made before this change gets "Sign in to keep this plan" once,
//      and signing in uploads it;
//   5. the guest invite opens with no session and no sign-in ask.
//
// RUN: cd hostv2 && npm run e2e:build
//      npx playwright test e2e/tryFirstSignInToKeep.spec.mjs --retries=0
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(Number(process.env.PW_SYNCTEST_PORT || 5244));
const PROJECT = 'https://synctest.supabase.co';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const USER = { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' };
const session = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999, user: USER,
});
const LINE = 'Make a free account to keep your plan and send your invite.';
const SENTENCE = 'Game night at my place for about 8 friends on March 6, 2027';

// A plan made before accounts were needed: on this device, never in an account.
const older = () => ({
  id: 'cust-older-brunch', rsvpCode: 'older-brunch-code', name: 'Sunday Brunch', type: 'Brunch',
  date: '2027-04-11', createdAt: '2026-10-01T10:00:00.000Z', guestMode: 'count', guestEstimate: 10,
  guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [],
});

const install = async (page, { locals = [] } = {}) => {
  const calls = { writes: [], verify: 0 };
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request(); const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/studio_settings')) return json([]);
    if (url.includes('/rest/v1/events')) {
      if (req.method() === 'GET') return json([]);
      let body = null; try { body = req.postDataJSON(); } catch { body = null; }
      const row = Array.isArray(body) ? body[0] : body;
      calls.writes.push({ method: req.method(), url, id: row && row.id, name: row && row.data && row.data.name });
      return json([{ id: row && row.id, updated_at: '2026-11-13T12:00:00.000Z' }]);
    }
    if (url.includes('/auth/v1/otp')) return json({});
    if (url.includes('/auth/v1/verify')) { calls.verify += 1; return json(session()); }
    if (url.includes('/auth/v1/')) return json({});
    return json([]);
  });
  await page.addInitScript((list) => {
    window.__toasts = [];
    setInterval(() => {
      const t = ((document.querySelector('div.toast') || {}).innerText || '').replace(/\s+/g, ' ').trim();
      if (t && !window.__toasts.includes(t)) window.__toasts.push(t);
    }, 80);
    if (sessionStorage.getItem('__booted')) return;   // a reload keeps what the app wrote
    sessionStorage.setItem('__booted', '1');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    if (list.length) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify(list));
      localStorage.setItem('ngw-hostv2-last-event', list[0].id);
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    }
  }, locals);
  return calls;
};

const boot = async (page, q = '?elegant=1') => {
  await page.goto(BASE + q);
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 80;
  }, null, { timeout: 20000 });
};

const stored = (page) => page.evaluate(() => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]') || []).map((e) => e && e.name));

// A fresh visitor: welcome → her sentence → the reveal, resolved.
const createSignedOut = async (page) => {
  await boot(page);
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SENTENCE);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect(page.locator('.rv-spinewrap.resolved')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('.rv-sname')).toContainText(/Game Night/);
};

// The desktop rail's door (this spec runs at desktop only).
const openSettings = async (page) => {
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'You & settings' }).click();
  await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
};

const signInWithCode = async (page) => {
  await page.getByLabel('Email for sign-in link').fill('harness@example.invalid');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await page.getByLabel('Sign-in code from the email').fill('482913');
  await page.getByRole('button', { name: 'Sign in with the code' }).click();
};

test.describe('try first, sign in to keep', () => {
  test('signed out: the reveal shows, keeping it asks for a free account, and sign-in puts it in the account', async ({ page }) => {
    const calls = await install(page);
    await createSignedOut(page);
    // Seen, not kept: nothing in this device's store, nothing sent.
    expect(await stored(page), 'the plan became a device-only event').toEqual([]);
    await expect(page.locator('.rv-sground')).toContainText('This plan isn’t saved yet.');

    await page.getByRole('button', { name: 'Keep this plan' }).click();
    await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
    await expect(page.locator('[data-keep-signin]')).toHaveText(LINE);
    expect(calls.writes, 'asking wrote something').toHaveLength(0);

    await signInWithCode(page);
    await expect.poll(() => calls.writes.filter((w) => w.name && /Game Night/.test(w.name)).length,
      { timeout: 10000, message: 'the kept plan never reached the account' }).toBeGreaterThan(0);
    const up = calls.writes.find((w) => /Game Night/.test(w.name || ''));
    expect(up.method, 'not an upsert to the events table').toBe('POST');
    expect(decodeURIComponent(up.url)).toMatch(/\/rest\/v1\/events\?.*on_conflict=id/);
    expect(calls.verify).toBe(1);
    // She lands where she was going: the plan, now hers.
    await expect(page.locator('#sheet-title')).toHaveCount(0, { timeout: 8000 });
    expect((await stored(page)).some((n) => /Game Night/.test(n || ''))).toBe(true);
    await expect(page.getByRole('button', { name: 'Keep this plan' })).toHaveCount(0);
    await expect(page.locator('.reveal-stage')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__toasts.join(' | '))).toContain('Your event is on your account now.');
  });

  test('declining keeps nothing on this device, and the plan stays on screen until she signs in', async ({ page }) => {
    const calls = await install(page);
    await createSignedOut(page);
    await page.getByRole('button', { name: 'Check and share invite' }).click();
    await expect(page.locator('[data-keep-signin]')).toHaveText(LINE);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('#sheet-title')).toHaveCount(0);
    // Still on screen, in memory only.
    await expect(page.locator('.rv-sname')).toContainText(/Game Night/);
    expect(await stored(page)).toEqual([]);
    await page.waitForTimeout(1500);
    expect(calls.writes).toHaveLength(0);
    // Signing in later still keeps the plan she saw.
    await page.getByRole('button', { name: 'Keep this plan' }).click();
    await signInWithCode(page);
    await expect.poll(() => calls.writes.filter((w) => /Game Night/.test(w.name || '')).length,
      { timeout: 10000, message: 'the declined plan was lost at the later sign-in' }).toBeGreaterThan(0);
    expect((await stored(page)).some((n) => /Game Night/.test(n || ''))).toBe(true);
  });

  test('a reload after declining finds no event anywhere, and her sentence back in the box', async ({ page }) => {
    const calls = await install(page);
    await createSignedOut(page);
    await page.getByRole('button', { name: 'Keep this plan' }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await page.waitForTimeout(2500);
    expect(await stored(page)).toEqual([]);
    expect(calls.writes).toHaveLength(0);
    await expect(page.getByPlaceholder(/crab feast/i).first()).toHaveValue(SENTENCE);
  });

  test('a plan made before accounts were needed is offered a keep once, and signing in uploads it', async ({ page }) => {
    const calls = await install(page, { locals: [older()] });
    await boot(page);
    const ask = page.locator('[data-keep-ask]');
    await expect(ask).toContainText('Sign in to keep this plan — it saves to your account so it can’t be lost.', { timeout: 8000 });
    // Nothing deleted, nothing sent while signed out.
    expect(await stored(page)).toEqual(['Sunday Brunch']);
    expect(calls.writes).toHaveLength(0);

    // Once per event: a reload does not ask again.
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-keep-ask]')).toHaveCount(0);

    // The sign-in still uploads it through the existing sign-in upload.
    await openSettings(page);
    await signInWithCode(page);
    await expect.poll(() => calls.writes.filter((w) => w.id === 'cust-older-brunch').length,
      { timeout: 10000, message: 'the older plan never reached the account' }).toBeGreaterThan(0);
    expect(await stored(page)).toEqual(['Sunday Brunch']);
  });

  test('the prompt\'s Sign in opens the sign-in with the board\'s line', async ({ page }) => {
    await install(page, { locals: [older()] });
    await boot(page);
    await page.locator('[data-keep-ask]').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
    await expect(page.locator('[data-keep-signin]')).toHaveText(LINE);
    await expect(page.getByLabel('Email for sign-in link')).toBeVisible();
  });

  test('the guest invite opens with no session and never asks anyone to sign in', async ({ page }) => {
    await install(page, { locals: [older()] });
    await page.goto(BASE + '?rsvp=older-brunch-code');
    await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-keep-ask], [data-keep-signin]')).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(/Sign in to keep|free account/i);
  });
});
