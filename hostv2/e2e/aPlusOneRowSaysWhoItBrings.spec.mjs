// ─── A PLUS-ONE ROW SAYS WHO IT BRINGS (Wanda audit P0-8, P0-9) ─────────────
//
// The behavior half of src/lib/__tests__/aPlusOneIsEveryoneTheyBring.test.js
// and vendorCountsAreOneReader.test.js, on the audited event:
//   · Marcus's row reads "+3 (Nia + 2 boys)", never "+1 +3 (Nia + 2 boys)";
//   · the vendor sheet's "Booked so far" counts the seven hired vendors, not
//     the two friends on the list — "3 of 7", the board's own numbers.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
  });
  await page.goto('?elegant=1');
  await settled(page);
};

test('the guest row prints the party as written', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  const sheet = page.locator('.sheet').last();
  await expect(sheet.getByText('+3 (Nia + 2 boys)').first()).toBeVisible();
  expect(await sheet.textContent()).not.toContain('+1 +3');
});

test('"Booked so far" counts hired vendors only', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, /People you/);
  const sheet = page.locator('.sheet').last();
  const hero = sheet.getByText('Booked so far').first().locator('xpath=..');
  await expect(hero).toContainText('3 of 7');
});
