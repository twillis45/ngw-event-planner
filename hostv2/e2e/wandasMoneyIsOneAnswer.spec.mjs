// ─── WANDA'S MONEY IS ONE ANSWER (Wanda audit P0-6, 11/22/2026) ──────────────
//
// The Wanda sample (ev-x-wanda): nine budget lines summing to $5,000.
//   P0-6   the board said "Budget set · $5,000 · handled" while Your money
//          proposed "A number to plan around $13,600 · Use $13,600".
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

test('Your money shows the budget her lines set, not a proposal', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'Your money');
  const sheet = page.locator('.sheet').last();
  await expect(sheet).toContainText('Your budget');
  await expect(sheet).toContainText('$5,000');
  await expect(sheet).not.toContainText('A number to plan around');
  await expect(sheet).not.toContainText('$13,600');
});
