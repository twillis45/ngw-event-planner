// ─── THE WELCOME IS FULL-BLEED ON A TABLET (owner, Safari on iPad, 11/22/2026) ─
// The first screen a new host meets drew as an inset panel with darker bands
// on both sides, while the board one tap later fills the screen. The cause is
// the tablet measure `.content{ max-width:720px }` (640–1279, min-height 700),
// which is meant for reading surfaces and also caught `.content.welcome`, the
// surface that paints the carbon atmosphere. Its words are already held to a
// 30rem column by `.content.welcome section`, so the surface itself spans.
import { test, expect } from '@playwright/test';

for (const [name, vp] of [
  ['iPad 11" portrait', { width: 834, height: 1100 }],
  ['iPad 13" portrait', { width: 1032, height: 1290 }],
  ['iPad 11" landscape', { width: 1194, height: 780 }],
  ['small tablet', { width: 768, height: 1024 }],
]) {
  test(`${name}: the welcome surface runs edge to edge`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    });
    await page.goto('./');
    const w = page.locator('.content.welcome');
    await expect(w).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Start my event' })).toBeVisible();
    const m = await page.evaluate(() => {
      const r = document.querySelector('.content.welcome').getBoundingClientRect();
      const s = document.querySelector('.content.welcome section').getBoundingClientRect();
      return { left: r.left, right: r.right, iw: document.documentElement.clientWidth, sectionW: s.width };
    });
    expect(m.left, 'left edge').toBeLessThanOrEqual(1);
    expect(m.right, 'right edge').toBeGreaterThanOrEqual(m.iw - 1);
    // The words keep their column: full-bleed is the surface, not the text.
    expect(m.sectionW).toBeLessThanOrEqual(30 * 16 + 1);
    await ctx.close();
  });
}
