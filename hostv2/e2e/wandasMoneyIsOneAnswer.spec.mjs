// ─── WANDA'S MONEY IS ONE ANSWER (Wanda audit P0-6, P0-15, P2-9; 11/22/2026) ──
//
// The Wanda sample (ev-x-wanda): nine budget lines summing to $5,000, Semper
// Catering Co. quoted at $1,500, an Open Bar line of $700.
//   P0-6   the board said "Budget set · $5,000 · handled" while Your money
//          proposed "A number to plan around $13,600 · Use $13,600".
//   P0-15  the Spread priced catering as a per-guest band beside the quote, and
//          After read "$3,410 of headroom" over "Expected total $5,263 ·
//          against $5,000".
//   P2-9   the money fix said "drop Open Bar" when the drinks call has a
//          cash bar the plan prices for less.
import { test, expect, settled, openSectionByName, goToStage } from './fixtures.mjs';

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
  await expect(sheet).not.toContainText('How much do you want to spend?'); // the proposal's question (11/26/2026)
  await expect(sheet).not.toContainText('$13,600');
});

test('the money fix offers the cash bar before dropping the bar', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'Your money');
  const sheet = page.locator('.sheet').last();
  await expect(sheet).toContainText('A way back under');
  await expect(sheet).not.toContainText('drop “Open Bar”');
  await expect(sheet).toContainText('a cash bar');
});

test('the Spread prices the catering at the quote', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'The spread & shopping');
  const sheet = page.locator('.sheet').last();
  // One food page (owner, 11/24/2026): no Shop tab, and the list is always open.
  await settled(page);
  // One food page (owner, 11/24/2026): no Shop tab, and the list is always open.
  // A quote is one figure, not a band from itself to itself.
  const food = sheet.getByRole('button', { name: /^F?Food.*bought/ }).first();
  await expect(food).toContainText('$1,500');
  await expect(food).not.toContainText('$1,500–$1,500');
  await food.click();
  await expect(sheet).toContainText('Semper Catering Co. quote');
});

test('After says what its expected total says', async ({ page }) => {
  await boot(page);
  await goToStage(page, 'After');
  const main = page.getByRole('main');
  await expect(main).toContainText('Expected total');
  await expect(main).not.toContainText('of headroom');
  await expect(main).toContainText('over the $5,000 plan');
});
