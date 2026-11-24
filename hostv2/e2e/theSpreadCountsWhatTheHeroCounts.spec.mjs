// ─── THE SPREAD COUNTS WHAT THE HERO COUNTS (Wanda audit P0-12, P0-13, P1-14) ─
//
// On the Wanda sample (ev-x-wanda, 11/22/2026):
//   - the Plan tab read "Your choices · 4 open" under a hero reading "1 open",
//     and its list asked "At home, a restaurant, or the workplace?" for the
//     booked VFW hall that Calls to make lists as settled;
//   - the guest rows say Vegetarian and Gluten-free, and the Plan tab read
//     "Dietary needs · none yet" while the hero asked "Who has a food allergy?";
//   - "That's everyone — noted" answered "the menu is good to go." with menu
//     calls still open.
// One count (menuChoicesTally) and one dietary reader (dietCountsFor) now
// feed every one of those lines.
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
  // One food page (owner, 11/24/2026): no Plan tab; Your choices is on the page.
  await settled(page);
  return sheet;
};

test('the Plan does not re-ask the booked hall, and counts like the hero', async ({ page }) => {
  await boot(page);
  const sheet = await openPlan(page);
  // The menu's row in Your choices (it was the "Your choices" row on the Plan tab).
  const row = sheet.locator('[data-food-section="choices"] .fstat', { hasText: 'Menu' }).first();
  await expect(row).toBeVisible();
  const value = ((await row.innerText()) || '').replace(/\s+/g, ' ');
  // Four authored menu calls, one settled by the booked hall: never "4 open".
  expect(value).not.toMatch(/\b4 open\b/);
  await row.click();
  await expect(sheet).toContainText('How is the food handled?');
  await expect(sheet).not.toContainText('At home, a restaurant, or the workplace?');
});

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
