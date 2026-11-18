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
  // …and from a keyboard, Ctrl/Cmd+Return adds what's typed. (Amended
  // 11/18/2026: plain Return used to add, which a phone keyboard, with no
  // Shift, turned into "one item at a time". Return is now a new line.)
  await box.fill('Bug spray');
  await box.press('Control+Enter');
  await expect.poll(() => added(page)).toEqual(['Paper towels', 'Cornhole set', 'Sunscreen', 'Bug spray']);
  await expect(box).toHaveValue('');
});

// Owner, 11/18/2026: "Still can't add multiple to list of item additions." On a
// phone the only way to start a second line is Return, and Return added the
// first item and cleared the box. Typed the way a phone types it, key by key:
test('typed item by item with Return, the way a phone does it, they all go in', async ({ page }) => {
  await openShop(page);
  const box = page.getByRole('textbox', { name: 'Items to add, one per line' });
  await box.click();
  await page.keyboard.type('Ice');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Charcoal');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Paper plates');
  await expect(box).toHaveValue('Ice\nCharcoal\nPaper plates');
  await expect.poll(() => added(page)).toEqual([]);   // Return added nothing on its own
  await expect(page.locator('[data-food-add-commit]')).toHaveText('Add 3 to the plan');
  await page.locator('[data-food-add-commit]').click();
  await expect.poll(() => added(page)).toEqual(['Ice', 'Charcoal', 'Paper plates']);
});

test('a repeated line is added once, and a blank line is skipped', async ({ page }) => {
  await openShop(page);
  await page.getByRole('textbox', { name: 'Items to add, one per line' }).fill('Lawn chairs\n\nlawn chairs\nCitronella candles');
  await page.locator('[data-food-add-commit]').click();
  await expect.poll(() => added(page)).toEqual(['Lawn chairs', 'Citronella candles']);
});
