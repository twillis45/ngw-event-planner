// ─── THE LOWER BOARD READS AS ROWS (cohesion #40, F6, #16, #48; owner 11/24/2026) ──
//
// #40 (UX_11 rules 2 and 5): on the phone and the desktop, "Who's confirmed"
// printed "Still waiting: Semper Catering Co., Gold Standard …", 12 names in one
// paragraph, none of them tappable. The tall iPad already had the list: two
// groups (Vendors · N not confirmed, Helpers & tasks · N not confirmed), each
// row routing (›). That list is used at every width now, and every row routes.
// F6: on the phone each group shows 3 rows, then "+N more", which opens the
// rest in place.
// #16: on desktop "Worth having a plan for" sat in hero column 2 (x=676, 363px
// at 1440) beside an empty band; alone, it spans hero columns 1–2.
// #48: the Where you stand line is "4 of 7 handled. Food, vendors and 1 more
// still need you.", not the engine's "Active planning · … — Your plan is moving."
import { test, expect } from '@playwright/test';
import { settled } from './fixtures.mjs';

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

for (const vp of [[390, 844, true], [834, 1194, true], [1440, 900, false]]) {
  test(`${vp[0]}x${vp[1]}: Who's confirmed is the grouped list, and every row routes`, async ({ browser }) => {
    test.setTimeout(60_000);
    const { ctx, page } = await boot(browser, vp);
    const block = page.locator('[data-who-confirmed]');
    await block.scrollIntoViewIfNeeded();
    await expect(block.locator('[data-who-waiting]'), 'no run-on sentence').toHaveCount(0);
    for (const k of ['vendors', 'helpers']) {
      const g = block.locator(`[data-who-group="${k}"]`);
      await expect(g).toHaveCount(1);
      const count = Number((await g.locator('[data-who-count]').innerText()).match(/\d+/)[0]);
      const shown = await g.locator('[data-who-row]').count();
      const more = g.locator('[data-who-more]');
      if (vp[0] < 600 && count > 3) {
        // F6: three rows, then "+N more".
        expect(shown, `${k}: three rows on the phone`).toBe(3);
        await expect(more).toHaveText(`+${count - 3} more`);
        expect((await more.boundingBox()).height).toBeGreaterThanOrEqual(44);
        await more.click();
        await expect(g.locator('[data-who-row]')).toHaveCount(count);
        await expect(more).toHaveCount(0);
      } else {
        expect(shown, `${k}: every row`).toBe(count);
        await expect(more).toHaveCount(0);
      }
      // Every row is a button (it routes), none a dead line.
      const dead = await g.locator('[data-who-row]').evaluateAll((rows) => rows.filter((r) => r.tagName !== 'BUTTON').map((r) => r.innerText.slice(0, 40)));
      expect(dead, `${k}: rows that do not route`).toEqual([]);
    }
    // A vendor row opens that vendor.
    await block.locator('[data-who-group="vendors"] [data-who-row]').first().click();
    await expect(page.locator('#sheet-title')).toHaveText('People you’re hiring');
    await ctx.close();
  });
}

test('1440x900: "Worth having a plan for" spans the hero, and Where you stand says the short line', async ({ browser }) => {
  test.setTimeout(60_000);
  const { ctx, page } = await boot(browser, [1440, 900, false]);
  const geo = await page.evaluate(() => {
    const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width) }; };
    const hero = document.querySelector('.hero.elegant');
    const cs = getComputedStyle(hero);
    return { watch: r('.hero.elegant > .ef-watch'), hero: r('.hero.elegant'), card: r('.hero.elegant > .bento'), gap: parseFloat(cs.columnGap) || 0 };
  });
  // Columns 1–2 of the hero grid: from the hero's left edge to the gap before
  // the Where you stand card (the render: x=273, 765 px at 1440).
  expect(geo.watch.x, '#16 starts at the hero').toBe(geo.hero.x);
  expect(Math.abs(geo.watch.x + geo.watch.w + geo.gap - geo.card.x), '#16 reaches the card column').toBeLessThanOrEqual(1);
  await expect(page.locator('.tile-a p.v-meta')).toHaveText('4 of 7 handled. Food, vendors and 1 more still need you.');
  await ctx.close();
});
