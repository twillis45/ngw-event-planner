// ─── THE MONEY HAS TO BE THERE AT THE END OF THE AISLE ───────────────────────
//
// Review board, 2026-09-24. 8 of 8 grocery-list leaders keep a running total
// pinned; this sheet carried it in the hero, where it is gone by the third row.
// The in-aisle seat named the cost: the back half of the trip is the half where
// the total matters, and it was absent for all of it.
//
// MEASURED BY SCROLLING, not by asserting a CSS property. `position: sticky`
// silently does nothing inside an ancestor with the wrong overflow, so a test
// that reads the declared value would pass on a bar that does not stick.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-total', name: 'The Cookout', type: 'The Cookout',
      date: '2027-06-17', venueCity: '21014',
      guestMode: 'count', guestCount: 20, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-total');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'The spread & shopping');
  await settled(page);
  await page.locator('.sheet').first().waitFor({ state: 'visible', timeout: 8000 });
  // OPEN THE LIST AND EXPAND THE FOLDS. The collapsed summary does not overflow
  // at 430px, so a scroll test against it is vacuous — measured: the first cut
  // of this spec passed with `position:static`. A host looking at their total
  // mid-shop is looking at the expanded list, which is what this drives.
  const listRow = page.locator('.fstat', { hasText: 'The list' }).first();
  if (await listRow.count()) { await listRow.click(); await settled(page); }
  const folds = page.locator('.fgroup');
  const n = await folds.count();
  for (let i = 0; i < n; i += 1) {
    const f = folds.nth(i);
    if (await f.isVisible()) { await f.click(); await page.waitForTimeout(110); }
  }
  await settled(page);
};

test('(premise) the sheet actually OVERFLOWS — without this the scroll test is vacuous', async ({ page }) => {
  // Learned the hard way: the first cut of this spec passed with
  // `position:static`, because the content fit and there was nothing to scroll.
  // A scroll test on a sheet that does not scroll proves only that the element
  // exists. This premise is the difference.
  await boot(page);
  const m = await page.locator('.sheet').first()
    .evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(m.scroll).toBeGreaterThan(m.client + 80);
  await expect(page.locator('.ftotal')).toBeVisible();
});

test('IT IS PINNED: on screen at the TOP of the list, before any scrolling', async ({ page }) => {
  // The assertion that actually separates sticky from static. Unscrolled, a
  // static footer sits below everything and is off-viewport; a sticky one is
  // already pinned at the bottom edge. Measured, not read off a style rule —
  // `position:sticky` silently does nothing under the wrong ancestor overflow.
  await boot(page);
  const vp = page.viewportSize();
  const box = await page.locator('.ftotal').boundingBox();
  expect(box).toBeTruthy();
  expect(box.y).toBeLessThan(vp.height);
  expect(box.y + box.height).toBeGreaterThan(vp.height * 0.5);
});

test('AND STILL THERE AFTER SCROLLING TO THE END OF THE LIST', async ({ page }) => {
  await boot(page);
  const bar = page.locator('.ftotal');
  const before = (await bar.innerText()).replace(/\s+/g, ' ');
  const sheet = page.locator('.sheet').first();
  await sheet.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(400);
  const vp = page.viewportSize();
  const box = await bar.boundingBox();
  expect(box.y).toBeLessThan(vp.height);
  expect(box.y + box.height).toBeGreaterThan(0);
  expect((await bar.innerText()).replace(/\s+/g, ' ')).toBe(before);
});

test('it never claims a store subtotal it does not have', async ({ page }) => {
  // With no store picked the bar shows the estimate band, not a store figure.
  await boot(page);
  const t = (await page.locator('.ftotal').innerText()).replace(/\s+/g, ' ');
  expect(t).not.toMatch(/priced at your store/i);
  expect(t).toMatch(/estimated/i);
});
