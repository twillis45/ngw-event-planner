// ─── WHAT SHE SAID IS WHAT IS SAVED ──────────────────────────────────────────
//
// Run 2 break run (11/6/2026). Five sentences whose creation saved something
// the host never said, dropped something she did, or dead-ended — each with
// nothing on screen. Driven through the host's own creation route.
import { test, expect } from './fixtures.mjs';

const type = async (page, seed) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(seed);
};
const create = async (page) => {
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect.poll(() => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').length; } catch { return 0; } }), { timeout: 15000 }).toBeGreaterThan(0);
  return page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
};

test('R2-1: "from 2-6pm" starts at 2 PM, not 6', async ({ page }) => {
  await type(page, 'Housewarming at my place on 12/5/2027 from 2-6pm, 25 friends');
  const ev = await create(page);
  expect(ev.startTime).toBe('2:00 PM');
});

test('R2-2: "February 30" is not saved as March 2, and the screen says why', async ({ page }) => {
  await type(page, 'Baby shower February 30 2027 for 40 people');
  await expect(page.getByText(/February 30 2027” isn’t a day on the calendar/)).toBeVisible();
  const ev = await create(page);
  expect(ev.date || '').toBe('');
});

test('R2-3: a past date says why the button is off', async ({ page }) => {
  await type(page, 'Graduation party June 3 2025 for 50');
  await expect(page.getByRole('button', { name: /^Put my plan together$/ })).toBeDisabled();
  await expect(page.getByRole('alert').filter({ hasText: /pick a future date/ })).toBeVisible();
});

test('R2-4: a town with no state asks for it, never shows as settled', async ({ page }) => {
  await type(page, 'holiday party for 40 people in Chicago december 12');
  const chip = page.getByRole('button', { name: 'Chicago — which state?' });
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
});

test('R2-5: "for 10000 people" keeps 10000', async ({ page }) => {
  await type(page, 'company holiday party for 10000 people on December 12, 2027, budget $5k');
  const ev = await create(page);
  expect(Number(ev.guestEstimate)).toBe(10000);
});
