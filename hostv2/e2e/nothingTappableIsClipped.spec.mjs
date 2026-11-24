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
    const bad = await page.evaluate((ring) => {
      const out = [];
      const hero = document.querySelector('.escreen.on .hero-card') || document.querySelector('.hero .hero-card');
      if (!hero) return ['no hero card'];
      const btns = [...hero.querySelectorAll('button')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden');
      if (!btns.length) return ['no hero buttons'];
      for (const b of btns) {
        const r = b.getBoundingClientRect();
        for (let a = b.parentElement; a && a !== document.body; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (s.overflowX === 'visible') continue;
          const ar = a.getBoundingClientRect();
          if (r.left - ar.left < ring || ar.right - r.right < ring) {
            out.push(`"${(b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 24)}" clipped by .${String(a.className).split(' ')[0]} (overflow-x ${s.overflowX}; ${Math.round(r.left - ar.left)}px left, ${Math.round(ar.right - r.right)}px right)`);
          }
          if (a.classList.contains('escreen')) break;
        }
      }
      return out;
    }, RING);
    expect(bad, 'buttons whose ring a clipping ancestor would cut').toEqual([]);
    await ctx.close();
  });
}
