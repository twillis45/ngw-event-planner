// ─── DECIDE THE MENU BEFORE THE SHOP ─────────────────────────────────────────
// Owner, 11/18/2026, on a live Friendsgiving three days out, created from
// "Friendsgiving this Saturday at 4 pm at Vida's for 15": the board led with
// "Get the food. · The remaining items · 11 left · Open the list" while "Decide
// what you're serving · 4 open" waited below. "Why does the CTA go to shop and
// not plan first." The shopping list is built from those menu choices; until
// they are made, deciding them is the step the shop is waiting on.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const md = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${m}/${d}`; };

test('created three days out, the board leads with the menu, not the shop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(`Friendsgiving on ${md(dateIn(3))} at 4 pm at Vida's for 15`);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click({ timeout: 30000 });
  await settled(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));
  expect(saved.date).toBe(dateIn(3));                       // premise: the event is three days out
  expect((saved.timeline || []).length).toBeGreaterThan(0); // premise: the checklist (with its shop step) was drafted
  const top = page.locator('h2').first();
  await expect(top).not.toHaveText(/Get the food/i);
  await expect(top).toHaveText(/menu|serving/i);
});
