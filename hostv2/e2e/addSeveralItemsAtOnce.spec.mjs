// ─── ADD SEVERAL ITEMS AT ONCE ───────────────────────────────────────────────
//
// Owner, 11/18/2026: "Allow more than one at a time for add item under shop."
// The form took one name and closed. It now takes one item per line (typed or
// pasted), adds them all, and stays open, cleared, for the next one.
import { test, expect, settled, sheetSettled, openSectionByName } from './fixtures.mjs';

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
  // By accessible name, not innerText: WebKit's innerText joins this button's
  // pieces without spaces, so a text match found nothing there (full WebKit
  // run 11/19; probe 11/20). The name is what VoiceOver reads. Clicked in the
  // page, as before, so the sticky next-bar over a scrolled row does not catch it.
  await page.getByRole('button', { name: /what you.?re serving|\? · \d+ open/i }).first().evaluate((el) => el.click());
  await sheetSettled(page);
  // One food page (owner, 11/24/2026): no Plan/Shop tabs, and the list is always open.
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

// The 11/18 phone screenshot: scrolled to, the Add button sat UNDER the sheet's
// pinned total bar ("0 of 11 bought"). A control the page scrolls to must land
// where a finger can reach it, not beneath a bar that stays put.
test('scrolled to, the Add button clears the pinned total bar', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const d = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ id: 'e2e-bar', name: 'My Friendsgiving', type: 'Friendsgiving', date: d,
      startTime: '16:00', venue: "Vida's", guestMode: 'list', guestEstimate: 15, guestCountSource: 'host',
      guests: [{ id: 'g1', name: 'Maya', rsvp: 'Yes' }], vendors: [], budget: [], timeline: [] }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-bar');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, /spread/i);
  await settled(page);
  // One food page (owner, 11/24/2026): no Plan/Shop tabs, and the list is always open.
  await page.getByRole('button', { name: /Add an item you/ }).first().click();
  await page.getByRole('textbox', { name: 'Items to add, one per line' }).fill('Ice\nCharcoal');
  const btn = page.locator('[data-food-add-commit]');
  await btn.scrollIntoViewIfNeeded();
  const covered = await btn.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const hit = (y) => { const e = document.elementFromPoint(b.left + b.width / 2, y); return !!e && (e === el || el.contains(e)); };
    return !(hit(b.top + 4) && hit(b.bottom - 4));
  });
  expect(covered, 'the pinned bar covers the Add button').toBe(false);
});
