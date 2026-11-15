import { test, expect, settled, openSectionByName } from './fixtures.mjs';

// ─── A FRIENDSGIVING IS ITS OWN PLAN (11/15/2026) ───────────────────────────
// The owner's test event, typed the way a host types it: a Friendsgiving this
// Saturday at a friend's place for 15. The friend's name is synthetic here (the
// repo is public). The page clock is pinned to Sunday 11/15/2026 so "this
// Saturday" is 11/21/2026 — six days out, the weekend before Thanksgiving —
// whenever CI runs. Timers still run (setFixedTime, not install).
//
// Before this playbook, the same sentence made a Thanksgiving Hosting plan
// with "Jordan" as the person being celebrated.
const TEXT = "Friendsgiving this Saturday at Jordan's for 15 people";
const savedEvent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));

test('typed in one sentence, a Friendsgiving becomes a potluck plan, not a family Thanksgiving', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00'));
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(TEXT);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 25000 });

  const ev = await savedEvent(page);
  expect(ev.type).toBe('Friendsgiving');
  expect(ev.date).toBe('2026-11-21');
  expect(ev.guestEstimate).toBe(15);
  expect(ev.honoree || null).toBe(null);
  expect(ev.isDestination || false).toBe(false);   // a friend's place is not a trip

  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await settled(page);

  // The calls a Friendsgiving host makes, in its own words.
  await openSectionByName(page, 'Calls to make');
  const calls = page.locator('.sheet').last();
  await expect(calls).toContainText('Who cooks what');
  await expect(calls).toContainText('How are drinks handled');
  await expect(calls).not.toContainText('Is anyone staying overnight');   // Thanksgiving Hosting's guest-room question

  // The shopping list: the host's turkey and the basics. Friends' dishes are
  // assigned, so they are not the host's buys.
  await openSectionByName(page, 'The spread & shopping');
  const spread = page.locator('.sheet').last();
  const shopTab = spread.locator('.fmode', { hasText: /^Shop$/ }).first();
  if (await shopTab.count()) { await shopTab.click(); await settled(page); }
  await spread.getByRole('button', { name: /^The list/ }).click();
  await settled(page);
  // The list is grouped; open the Food and Supplies groups to reach the rows.
  for (const group of [/^Food.*bought/, /^Supplies.*bought/]) {
    await spread.getByRole('button', { name: group }).first().click();
    await settled(page);
  }
  await expect(spread).toContainText(/Turkey/);
  await expect(spread).not.toContainText(/Sides you cook/);
  await expect(spread).toContainText(/Dish labels/);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
