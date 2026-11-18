// ─── ADD SEVERAL ITEMS AT ONCE ───────────────────────────────────────────────
//
// Owner, 11/18/2026: "Allow more than one at a time for add item under shop."
// The form took one name and closed. It now takes one item per line (typed or
// pasted), adds them all, and stays open, cleared, for the next one.
import { test, expect, settled, sheetSettled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const re = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')].find((b) => re.test(b.innerText || '') && b.getBoundingClientRect().height > 0);
  if (el) el.click();
  return !!el;
}, src);

const openShop = async (page) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-add', name: 'The Cookout', type: 'The Cookout', date: '2027-06-17', venueCity: '21014',
      guestMode: 'count', guestCount: 20, totalBudget: 1200, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-add');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'what you.?re serving');
  await sheetSettled(page);
  await tapText(page, 'The list[\\s\\S]*item');
  await sheetSettled(page);
  await page.getByRole('button', { name: /Add an item you/ }).first().click();
};
const added = (page) => page.evaluate(() => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].foodAdd || []).map((a) => a.name));

test('three lines pasted become three items, and the form stays open for more', async ({ page }) => {
  await openShop(page);
  const box = page.getByRole('textbox', { name: 'Items to add, one per line' });
  await box.fill('Paper towels\nCornhole set\nSunscreen');
  await expect(page.locator('[data-food-add-commit]')).toHaveText('Add 3 to the plan');
  await page.locator('[data-food-add-commit]').click();
  await expect.poll(() => added(page)).toEqual(['Paper towels', 'Cornhole set', 'Sunscreen']);
  await expect(box).toBeVisible();
  await expect(box).toHaveValue('');
  await expect(box).toBeFocused();
  // …and the next one goes straight in with Enter.
  await box.fill('Bug spray');
  await box.press('Enter');
  await expect.poll(() => added(page)).toEqual(['Paper towels', 'Cornhole set', 'Sunscreen', 'Bug spray']);
  await expect(box).toHaveValue('');
});

test('a repeated line is added once, and a blank line is skipped', async ({ page }) => {
  await openShop(page);
  await page.getByRole('textbox', { name: 'Items to add, one per line' }).fill('Lawn chairs\n\nlawn chairs\nCitronella candles');
  await page.locator('[data-food-add-commit]').click();
  await expect.poll(() => added(page)).toEqual(['Lawn chairs', 'Citronella candles']);
});
