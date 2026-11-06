// ─── A SENTENCE SURVIVES A RELOAD ────────────────────────────────────────────
//
// Run 3 (11/6/2026, R3-4): reloading mid-typing (iOS reloads a backgrounded
// tab) landed the host on Welcome with the creation box empty.
import { test, expect } from './fixtures.mjs';

const SEED = 'Baby shower for my sister Ana on March 20 2027 for 30 people';

test('the sentence she was typing comes back; once the event exists, it does not', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); sessionStorage.setItem('seeded', '1'); } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByPlaceholder(/crab feast/i).first()).toHaveValue(SEED, { timeout: 15000 });
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').length), { timeout: 15000 }).toBe(1);
  await page.reload();
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => localStorage.getItem('ngw-hostv2-create-draft'))).toBeNull();
  expect(await page.getByPlaceholder(/crab feast/i).count()).toBe(0);
});
