// ─── THE RAIL IS THE LIST (cohesion F4, F5, #46, #47; owner 11/24/2026) ──────
//
// UX_11 rule 8 (one door, one name) and rule 9 (44 px). Measured on the Wanda
// sample before the change: every section sheet showed "‹ Sections" beside the
// rail (1024 and wider) as a third door to the list, after the rail itself and
// ☰. On touch it measured 67×16, and "Close" 64×28.
//
// Now: where the rail is up, "‹ Sections" goes (the rail is the list; ☰
// stays). Where there is no rail (390, 834) it stays, 44 px tall. Close is
// 44 px tall everywhere. The rail's "Narrow" says what she will see: "Icons
// only" (F5).
import { test, expect } from '@playwright/test';
import { settled, openSectionByName, sheetSettled } from './fixtures.mjs';

const SIZES = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];

const boot = async (browser, [w, h, touch]) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
  const page = await ctx.newPage();
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', 'light');
  });
  await page.goto('./?elegant=1&noanalytics=1&theme=light');
  await settled(page);
  await page.waitForTimeout(700);
  return { ctx, page };
};
const box = (loc) => loc.evaluate((e) => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; });

for (const vp of SIZES) {
  test(`${vp[0]}x${vp[1]}: a section sheet has one way to the list, and its controls clear 44 px`, async ({ browser }) => {
    test.setTimeout(60_000);
    const { ctx, page } = await boot(browser, vp);
    const railUp = (await page.locator('.srail').count()) > 0;
    expect(railUp, 'the rail is up from 1024').toBe(vp[0] >= 1024);
    await openSectionByName(page, 'Your money');
    await sheetSettled(page);
    await expect(page.locator('#sheet-title')).toHaveText('Your money');
    const back = page.locator('.sheet .sheet-back');
    if (railUp) {
      await expect(back, 'no "‹ Sections" beside the rail').toHaveCount(0);
    } else {
      await expect(back).toHaveCount(1);
      const b = await box(back);
      expect(b.h, `"‹ Sections" is ${b.w}×${b.h}`).toBeGreaterThanOrEqual(44);
      expect(b.w).toBeGreaterThanOrEqual(44);
    }
    const x = await box(page.locator('.sheet .sheet-head .sheet-x'));
    expect(x.h, `Close is ${x.w}×${x.h}`).toBeGreaterThanOrEqual(44);
    expect(x.w).toBeGreaterThanOrEqual(44);
    if (railUp) {
      // F5: the rail's collapse switch says what she will see.
      const min = page.locator('.srail .srail-min');
      await expect(min.locator('.srail-l')).toHaveText('Icons only');
      await expect(min).toHaveAttribute('aria-label', 'Icons only');
      await expect(page.locator('.srail')).not.toContainText('Narrow');
    }
    await ctx.close();
  });
}
