// ─── EVERY WIDE BOARD SAYS WHOSE EVENT IT IS AND OFFERS THE FOUR STAGES ──────
// Owner, 11/24/2026: "Tablet and full desktop don't have the create plan the
// day section of menu. Wide and desktop iPad don't have name of event in
// header." Measured live that day: the stage switcher (Create · Plan · The Day
// · After) was on screen only on the phone, the 11" upright iPad (its bar) and
// the 13" upright iPad (its rail); every landscape and desktop width had it
// only inside the ☰ menu. The title block was missing at 1000-1279, and on
// desktop it showed only in some hero states. Now every board with a rail
// shows the four stages in the rail, and every non-phone board wears the title
// with the event's name, whatever the hero is doing.
import { test, expect } from '@playwright/test';
import { settled, dateIn } from './fixtures.mjs';

// Real iPad landscape widths (mini 1133, Air/10th 1180, Pro 11 1194, Pro 13 1366)
// plus desktops. Below 1024 in landscape (split-screen) the board keeps the ☰
// menu; that band is batch F's (navigation), noted 11/24/2026.
const WIDE = [[1133, 744, true], [1180, 820, true], [1194, 834, true], [1366, 1024, true], [1440, 900, false], [1920, 1080, false]];
const ev = (id, days) => ({ id, name: 'Rosa’s Harvest Dinner', type: 'Thanksgiving Hosting', date: dateIn(days), startTime: '16:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield', venueState: 'VA',
  guestMode: 'count', guestCount: 5, guestEstimate: 5, guestCountSource: 'host', totalBudget: 300, budget: [], vendors: [], guests: [], timeline: [] });

const boot = async (browser, [w, h, touch], e, path = './?elegant=1&noanalytics=1') => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
  const page = await ctx.newPage();
  await page.addInitScript((x) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([x])); localStorage.setItem('ngw-hostv2-last-event', x.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, e);
  await page.goto(path);
  await settled(page);
  await page.waitForTimeout(900);
  return { ctx, page };
};
const shown = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').length, sel);

for (const vp of WIDE) {
  test(`${vp[0]}x${vp[1]}: the rail offers Create · Plan · The Day · After, and the board names the event`, async ({ browser }) => {
    test.setTimeout(60_000);
    const { ctx, page } = await boot(browser, vp, ev('ev-wide-' + vp[0], 20));
    expect(await shown(page, '.srail [data-rail-stage]'), 'the four stages in the rail').toBe(4);
    await expect(page.locator('.srail [data-rail-stage="plan"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('[data-tt-title] .tt-name').first()).toHaveText('Rosa’s Harvest Dinner');
    // A stage tap works from the rail.
    await page.locator('.srail [data-rail-stage="day"]').click();
    await expect(page.locator('.srail [data-rail-stage="day"]')).toHaveAttribute('aria-current', 'page');
    await ctx.close();
  });
}

test('1440x900: the title stays whatever the hero is doing (a sheet opened and closed, a decision made)', async ({ browser }) => {
  test.setTimeout(60_000);
  const { ctx, page } = await boot(browser, WIDE[4], ev('ev-wide-states', 20));
  await expect(page.locator('[data-tt-title] .tt-name').first()).toHaveText('Rosa’s Harvest Dinner');
  await page.locator('.srail [data-rail-stage="after"]').click(); await page.waitForTimeout(500);
  await page.locator('.srail [data-rail-stage="plan"]').click(); await page.waitForTimeout(800);
  await expect(page.locator('[data-tt-title] .tt-name').first()).toHaveText('Rosa’s Harvest Dinner');
  await ctx.close();
});
