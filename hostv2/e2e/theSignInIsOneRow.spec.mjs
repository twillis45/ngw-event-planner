// ─── THE SIGN-IN IS ONE ROW, THE SAME SIZE IN BOTH THEMES (ruling 25) ───────
//
// Owner ruling 25, 11/21/2026 ("W1 and s2. Make sure the other theme matches
// s2 dimensions"): the prompt that offers to keep a plan made on this device is
// ONE row — "Not saved yet.", a primary "Sign in to save" (owner, 11/23/2026), and a ✕
// that does exactly what "Not now" did. Every target is 44x44, and the row has
// the same box in dark and light. It replaced two equal gray buttons with no
// primary.
//
// On the synctest harness (a fake Supabase project; signed out), at 390, 768
// and 1280, in both themes.
//
// RUN: PW_SYNCTEST_PORT=<port> npx playwright test e2e/theSignInIsOneRow.spec.mjs
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(Number(process.env.PW_SYNCTEST_PORT || 5244));
const PROJECT = 'https://synctest.supabase.co';

// A plan on this device that never reached an account: the one the ask is for.
const OLDER = {
  id: 'cust-older-brunch', rsvpCode: 'older-brunch-code', name: 'Sunday Brunch', type: 'Brunch',
  date: '2027-04-11', createdAt: '2026-10-01T10:00:00.000Z', guestMode: 'count', guestEstimate: 10,
  guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [],
};

const boot = async (page, theme, { width, height }) => {
  await page.setViewportSize({ width, height });
  await page.route(`${PROJECT}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json',
    body: route.request().url().includes('/auth/v1/') ? '{}' : '[]' }));
  await page.addInitScript(([e, th]) => {
    if (sessionStorage.getItem('__booted')) return; sessionStorage.setItem('__booted', '1');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', th);
  }, [OLDER, theme]);
  await page.goto(BASE + '?elegant=1');
  await expect(page.locator('[data-keep-ask]')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(400);
};

// The row's own box, each control's box, and how many lines the row takes.
const geometry = (page) => page.locator('[data-keep-ask]').evaluate((row) => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const btns = [...row.querySelectorAll('button')];
  return {
    row: box(row),
    text: (row.innerText || '').replace(/\s+/g, ' ').trim(),
    buttons: btns.map((b) => ({ name: b.getAttribute('aria-label') || b.innerText.trim(), cls: b.className, ...box(b),
      bg: getComputedStyle(b).backgroundImage })),
    // One row: every child's vertical middle sits inside every other child's box.
    mids: [...row.children].map((c) => { const r = c.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 }; }),
  };
});

const SIZES = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];

test.describe('the sign-in is one row', () => {
  for (const size of SIZES) {
    test(`one row, a lit Sign in and a 44x44 ✕, the same box in dark and light (${size.width})`, async ({ browser }) => {
      const seen = {};
      for (const theme of ['dark', 'light']) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await boot(page, theme, size);
        const g = await geometry(page);
        // Owner ruling 11/23/2026: the line is the state, the button names the act.
        expect(g.text).toBe('Not saved yet. Sign in to save ✕');
        // One row: every child shares the same horizontal band.
        for (const a of g.mids) for (const b of g.mids) {
          expect(a.mid, `${theme}: a child of the row sits on another line`).toBeGreaterThan(b.top);
          expect(a.mid).toBeLessThan(b.bottom);
        }
        expect(g.buttons.map((b) => b.name)).toEqual(['Sign in to save', 'Dismiss']);
        // Sign in is the primary: the .cta, lit with --cta-grad. The ✕ is not.
        expect(g.buttons[0].cls).toMatch(/\bcta\b/);
        expect(g.buttons[0].bg).toMatch(/gradient/);
        expect(g.buttons[1].cls).not.toMatch(/\bcta\b/);
        for (const b of g.buttons) {
          expect(b.w, `${theme}: ${b.name} is at least 44 wide`).toBeGreaterThanOrEqual(44);
          expect(b.h, `${theme}: ${b.name} is at least 44 tall`).toBeGreaterThanOrEqual(44);
        }
        seen[theme] = g;
        await ctx.close();
      }
      // Identical box dimensions in both themes: the row and each control.
      const r = (g) => ({ w: Math.round(g.row.w * 10) / 10, h: Math.round(g.row.h * 10) / 10,
        b: g.buttons.map((b) => [Math.round(b.w * 10) / 10, Math.round(b.h * 10) / 10, Math.round((b.x - g.row.x) * 10) / 10]) });
      expect(r(seen.light), 'the light row has the dark row\'s dimensions').toEqual(r(seen.dark));
    });
  }

  test('the ✕ does what "Not now" did: the ask closes, nothing is sent, and it does not come back', async ({ page }) => {
    await boot(page, 'light', SIZES[0]);
    const before = await page.evaluate(() => (window.__NGW_TRACK__ || []).length);
    await page.locator('[data-keep-ask]').getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator('[data-keep-ask]')).toHaveCount(0);
    // No sign-in opened, no analytics event (Not now sent none).
    await expect(page.locator('#sheet-title')).toHaveCount(0);
    expect(await page.evaluate(() => (window.__NGW_TRACK__ || []).length)).toBe(before);
    // Recorded once: a reload does not ask again.
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-keep-ask]')).toHaveCount(0);
  });

  test('Sign in still opens the sign-in, with the keep line', async ({ page }) => {
    await boot(page, 'dark', SIZES[0]);
    await page.locator('[data-keep-ask]').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
    await expect(page.locator('[data-keep-signin]')).toHaveText('Make a free account to keep your plan and send your invite.');
  });
});
