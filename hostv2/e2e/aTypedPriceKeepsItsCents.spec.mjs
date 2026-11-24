// ─── A TYPED PRICE KEEPS ITS CENTS (11/16/2026) ──────────────────────────────
// Round 2 fixed the food plan READING a stored $42.50 as $43. Reading the
// shopping list's price box before a live check showed the WRITE rounded too:
// "tune" → type 42.50 → saved Math.round(42.5) = 43. This drives the box.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = { id: 'cust-cents', name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(6),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [] };

test('typing $42.50 for the turkey saves and shows $42.50', async ({ page }) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'The spread & shopping');
  await settled(page);
  const sheet = page.locator('.sheet').last();
  // One food page (owner, 11/24/2026): no Plan/Shop tabs, and the list is always open.
  const row = sheet.locator('.frow', { hasText: /Turkey/ }).first();
  // The Food group may start folded or open; open it only if the row is hidden.
  if (!await row.isVisible().catch(() => false)) {
    await sheet.getByRole('button', { name: /^Food \d+ of \d+ bought/ }).first().click();
    await settled(page);
  }
  // The row opens the item in place (owner, 11/24/2026); "tune" is gone and
  // the price box is the item's "What you paid".
  await row.getByRole('button', { name: /^Open Turkey/ }).click();
  const box = sheet.getByLabel(/^What you paid for Turkey/);
  await box.fill('42.50'); await box.press('Enter');
  await settled(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].foodLocked);
  expect(saved.p_turkey).toBe(42.5);
  // Shown with its cents in the opened item, and on the closed row.
  await expect(sheet.locator('[data-food-open="p_turkey"]')).toContainText('$42.50');
  await sheet.getByRole('button', { name: 'Close Turkey' }).click();
  await expect(row).toContainText('$42.50');
});
