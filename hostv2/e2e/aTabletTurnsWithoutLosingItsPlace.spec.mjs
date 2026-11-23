// ─── A TABLET TURNS WITHOUT LOSING ITS PLACE (owner, 11/22/2026) ───────────────
// "Is flipping from landscape to tall iPad working." Every other spec pins one
// orientation; none turned the device mid-session. This one rotates an iPad
// (touch) landscape → portrait → landscape on the board, then again with a
// section sheet open, and measures what a host would notice: no sideways scroll,
// nothing past the right edge, the board's question still on screen, and an open
// sheet still open and inside the screen. Measured on 11/22 against live
// 27b4f740: 0/0/✓ at every step.
import { test, expect } from '@playwright/test';
import { settled } from './fixtures.mjs';

const L = { width: 1194, height: 834 };
const P = { width: 834, height: 1194 };

const measure = (page) => page.evaluate(() => {
  const de = document.documentElement;
  const h2 = document.querySelector('h2');
  const sheet = document.querySelector('[role="dialog"]');
  const sr = sheet && sheet.getBoundingClientRect();
  const past = [...document.querySelectorAll('body *')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1; }).length;
  return {
    sideScroll: de.scrollWidth > innerWidth + 1, past,
    heroOnScreen: !!h2 && h2.getBoundingClientRect().top < innerHeight,
    sheetOpen: !!sheet,
    sheetFits: !sr || (sr.left >= -1 && sr.right <= innerWidth + 1 && sr.top >= -1),
  };
});

test.use({ viewport: L, hasTouch: true, isMobile: true });

test('an iPad turned with the board, and again with a sheet open, keeps everything on screen', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
  });
  await page.goto('./?elegant=1');
  await expect(page.locator('h2').first()).toBeVisible({ timeout: 20_000 });
  // Measured once the entrance motion is done: the board slides in from the
  // right, so a frame mid-slide is past the edge by design.
  await settled(page); await page.waitForTimeout(1200);

  for (const [vp, where] of [[L, 'landscape'], [P, 'portrait'], [L, 'landscape again']]) {
    await page.setViewportSize(vp); await settled(page); await page.waitForTimeout(1200);
    const m = await measure(page);
    expect(m.sideScroll, `${where}: sideways scroll`).toBe(false);
    expect(m.past, `${where}: elements past the right edge`).toBe(0);
    expect(m.heroOnScreen, `${where}: the board's question is on screen`).toBe(true);
  }

  const tap = (re) => page.evaluate((s) => {
    const el = [...document.querySelectorAll('button,a,[role="button"]')].find((x) => new RegExp(s).test((x.innerText || '').trim()));
    if (el) el.click(); return !!el;
  }, re.source);
  await tap(/^Menu$/); await page.waitForTimeout(400);
  expect(await tap(/^Guests/)).toBe(true);
  await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 10_000 });

  for (const [vp, where] of [[P, 'sheet, portrait'], [L, 'sheet, landscape']]) {
    await page.setViewportSize(vp); await settled(page); await page.waitForTimeout(1200);
    const m = await measure(page);
    expect(m.sheetOpen, `${where}: the sheet stays open`).toBe(true);
    expect(m.sheetFits, `${where}: the sheet is inside the screen`).toBe(true);
    expect(m.sideScroll, `${where}: sideways scroll`).toBe(false);
  }
});
