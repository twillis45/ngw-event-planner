// ─── NOTHING A HOST CAN TAP IS CLIPPED (owner, 11/24/2026, iPad landscape) ───
// "Cta button is being clipped on left": the hero card and its editor slot
// clipped their contents (overflow hidden/clip) while every hero button sits
// flush with their left edge, so the button's keycap edge, its focus ring and
// the attention cue's ring were cut. The earlier patch used overflow-clip-margin,
// which iOS/iPadOS Safari does not support, so it never helped the owner's iPad.
// Rule 9 of UX_11: a horizontal clip must leave room for every ring a tappable
// draws. Measured, not looked at: at every viewport, for every visible button in
// the hero, no ancestor that clips horizontally sits within 12px of its edge.
import { test, expect } from '@playwright/test';
import { settled, dateIn } from './fixtures.mjs';
// The one clip probe (cohesion batch B): the sweep over every sheet uses it too.
import { clippedSideways } from './floorProbes.mjs';

const EV = { id: 'ev-noclip', name: 'Rosa’s Harvest Dinner', type: 'Dinner Party', date: dateIn(24), startTime: '18:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield', venueState: 'VA',
  guestMode: 'count', guestCount: 10, guestEstimate: 10, guestCountSource: 'host', totalBudget: 0, budget: [], vendors: [], guests: [], timeline: [] };
const VIEWS = [
  { name: 'phone', viewport: { width: 390, height: 844 }, touch: true },
  { name: 'ipad-11-portrait', viewport: { width: 834, height: 1194 }, touch: true },
  { name: 'ipad-safari-landscape', viewport: { width: 1000, height: 690 }, touch: true },
  { name: 'ipad-landscape', viewport: { width: 1194, height: 834 }, touch: true },
  { name: 'ipad-13-portrait', viewport: { width: 1024, height: 1366 }, touch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, touch: false },
];
const RING = 12; // the attention cue's pulse reaches 12px out (outline-offset)

for (const v of VIEWS) {
  test(`${v.name}: no hero button's ring is clipped on the left or right`, async ({ browser }) => {
    test.setTimeout(60_000);
    const ctx = await browser.newContext({ viewport: v.viewport, hasTouch: v.touch, isMobile: v.touch && v.viewport.width < 600 });
    const page = await ctx.newPage();
    await page.addInitScript((e) => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    }, EV);
    await page.goto('./?elegant=1&noanalytics=1');
    await settled(page);
    await expect(page.locator('h2.ask').first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);
    // Premises: the hero card is there, and it has buttons to judge.
    const HERO = '.escreen.on .hero-card, .hero .hero-card';
    const n = await page.evaluate((sel) => {
      const h = document.querySelector(sel);
      return h ? [...h.querySelectorAll('button')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden').length : -1;
    }, HERO);
    expect(n, 'premise: a hero card').toBeGreaterThanOrEqual(0);
    expect(n, 'premise: hero buttons to judge').toBeGreaterThan(0);
    const bad = await page.evaluate(clippedSideways, [HERO, RING, { press: 'button', stopAt: '.escreen', firstRoot: true }]);
    expect(bad, 'buttons whose ring a clipping ancestor would cut').toEqual([]);
    await ctx.close();
  });
}
