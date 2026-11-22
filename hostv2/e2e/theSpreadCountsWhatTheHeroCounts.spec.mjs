// ─── THE SPREAD COUNTS WHAT THE HERO COUNTS (Wanda audit P0-13, P1-14) ───────
//
// On the Wanda sample (ev-x-wanda, 11/22/2026):
//   - the guest rows say Vegetarian and Gluten-free, and the Plan tab read
//     "Dietary needs · none yet" while the hero asked "Who has a food allergy?";
//   - "That's everyone — noted" answered "the menu is good to go." with menu
//     calls still open.
// One dietary reader (dietCountsFor) now feeds every one of those lines.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__seeded')) return;
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    sessionStorage.setItem('__seeded', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
};

const openPlan = async (page) => {
  await openSectionByName(page, 'The spread & shopping');
  const sheet = page.locator('.sheet').last();
  const plan = sheet.locator('.fmode', { hasText: /^Plan$/ });
  if (await plan.count()) await plan.first().click();
  await settled(page);
  return sheet;
};

test('the guest rows’ needs are known on the Plan and on the board', async ({ page }) => {
  await boot(page);
  await expect(page.getByRole('main')).not.toContainText('Who has a food allergy?');
  const sheet = await openPlan(page);
  const diet = sheet.locator('.fstat', { hasText: 'Dietary needs' }).first();
  await expect(diet).not.toContainText('none yet');
  await expect(diet).toContainText('2 flagged');
});

test('noting the needs does not call the menu good to go while calls are open', async ({ page }) => {
  await boot(page);
  const sheet = await openPlan(page);
  await sheet.locator('.fstat', { hasText: 'Dietary needs' }).first().click();
  // The steppers start from the guest rows, not from zero.
  const veg = sheet.locator('.line', { hasText: /^Vegetarian/ }).first();
  await expect(veg).toContainText('1');
  await sheet.getByRole('button', { name: 'That’s everyone — noted' }).click();
  const toast = page.locator('.toast').first();
  await expect(toast).toContainText('Dietary needs noted');
  await expect(toast).not.toContainText('good to go');
  await expect(toast).toContainText('still open');
});
