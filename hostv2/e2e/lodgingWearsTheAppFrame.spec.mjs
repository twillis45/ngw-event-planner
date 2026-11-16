// ─── WHERE EVERYONE STAYS WEARS THE APP'S FRAME (owner, 11/16/2026) ──────────
//
// "Wide screen and desktop lodging screens viewport don't match the rest of the
// app." Measured on the live site: at 1440 and 1920 every section sat in the
// rail frame, while the lodging cockpit (?demo=lodging, a page of its own) wore
// the old 1280-wide phone bezel. Its empty state also fell into the 190px step
// column: the headline wrapped a word per line and the two buttons overlapped.
// This measures both pages' frames at both widths and holds them equal.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const frame = (page) => page.evaluate(() => {
  const el = document.querySelector('.stagewrap');
  const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
  const app = getComputedStyle(el.querySelector('.app'));
  return { x: Math.round(r.left), w: Math.round(r.width), radius: cs.borderTopLeftRadius,
    border: cs.borderTopWidth + ' ' + cs.borderTopStyle, appRadius: app.borderTopLeftRadius, appRing: app.boxShadow !== 'none' };
});

// Desktop windows only: a phone-emulated project at these widths is not a desktop.
test.skip(({ isMobile }) => isMobile);

for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  test(`at ${w}px, lodging sits in the same frame as a section`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.addInitScript(() => {
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    });
    await page.goto('./?elegant=1');
    await settled(page);
    await openSectionByName(page, 'Your checklist');
    await settled(page);
    const section = await frame(page);

    await page.goto('./?demo=lodging');
    await settled(page);
    const empty = await frame(page);
    expect(empty).toEqual(section);
    // The empty state reads across the page, not down a 190px column.
    const main = await page.locator('.lc-main').first().boundingBox();
    expect(main.width).toBeGreaterThan(400);
    const a = await page.getByRole('button', { name: /Load the Santa Fe example/ }).boundingBox();
    const o = await page.getByRole('link', { name: /Open the planner/ }).boundingBox();
    const b = { left: o.x, top: o.y }; a.right = a.x + a.width; a.bottom = a.y + a.height;
    expect(a.right <= b.left || a.bottom <= b.top, 'the two start buttons overlap').toBe(true);

    await page.getByRole('button', { name: /Load the Santa Fe example/ }).click();
    await settled(page);
    expect(await frame(page)).toEqual(section);
  });
}
