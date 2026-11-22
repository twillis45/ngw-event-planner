import { test, expect } from './fixtures.mjs';

// Owner ruling 11/22/2026, verbatim: "Resolve to the next one with the date
// shown so she can fix it as well." A bare weekday is its next occurrence; the
// preview chip shows the weekday with the date, the date control changes it,
// and the plan saves it like any typed date. Unit rules:
// src/lib/__tests__/creationAWeekdayIsTheNextOne.test.js. The page clock is
// Sunday 11/22/2026 at noon, so "Saturday" is Sat, Nov 28.
const TEXT = 'Repast for my grandmother after the funeral Saturday at the church fellowship hall, about 100 people';
const savedEvent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));
const start = async (page) => {
  await page.clock.setFixedTime(new Date('2026-11-22T12:00:00'));
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(TEXT);
};

test('"the funeral Saturday" shows Sat, Nov 28, is not listed as dropped, and saves that day', async ({ page }) => {
  await start(page);
  await expect(page.getByRole('button', { name: 'Sat, Nov 28', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/“Saturday”/);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 25000 });
  expect((await savedEvent(page)).date).toBe('2026-11-28');
});

test('she can change the resolved day with the date control, and her day is saved', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Sat, Nov 28', exact: true }).click();
  await page.locator('input[type="date"]').first().fill('2026-12-05');
  await expect(page.getByRole('button', { name: 'Dec 5', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 25000 });
  expect((await savedEvent(page)).date).toBe('2026-12-05');
});
