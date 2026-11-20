// ─── THE SEASONAL SENTENCES READ RIGHT (11/20/2026) ──────────────────────────
// Found writing the holiday guides from the live create flow:
//  · "Holiday party …" showed the type chip "Holiday" (the shell cut " Party"
//    off every type name, so a Day Party read "Day").
//  · "New Year's Eve party December 31 for 20" added a chip "For New Year" and
//    named the plan "New Year's New Year's Eve": the parser took the holiday's
//    own possessive for an honoree (lib/smartParseEvent HOLIDAY_POSSESSOR).
import { test, expect } from './fixtures.mjs';

const toCreate = async (page) => {
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
};
const heard = (page) => page.locator('.chips.heard');

test('the type chip carries the type\'s whole name', async ({ page }) => {
  await toCreate(page);
  await page.getByPlaceholder(/crab feast/i).first().fill('Holiday party December 12 for 25');
  await expect(page.getByRole('button', { name: /^Put my plan together$/ })).toBeVisible({ timeout: 20000 });
  await expect(heard(page).getByRole('button', { name: 'Holiday Party', exact: true })).toBeVisible();
});

test('a New Year\'s Eve sentence names no honoree and no doubled name', async ({ page }) => {
  await toCreate(page);
  await page.getByPlaceholder(/crab feast/i).first().fill("New Year's Eve party December 31 for 20");
  await expect(page.getByRole('button', { name: /^Put my plan together$/ })).toBeVisible({ timeout: 20000 });
  await expect(heard(page).getByRole('button', { name: "New Year's Eve Party", exact: true })).toBeVisible();
  await expect(heard(page)).not.toContainText('For New Year');
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click({ timeout: 30000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));
  expect(saved.type).toBe("New Year's Eve Party");
  expect(String(saved.name || '')).not.toMatch(/New Year.s New Year/);
  expect(saved.honoree || null).toBeNull();
});
