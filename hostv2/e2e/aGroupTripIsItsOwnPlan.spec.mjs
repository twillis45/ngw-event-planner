import { test, expect, settled, openSectionByName, checklistText } from './fixtures.mjs';

// ─── A GROUP TRIP IS ITS OWN PLAN (G61, 11/19/2026) ─────────────────────────
// The plan item's own sentence, typed the way a host types it. In the 40-host
// trip test, 10 hosts had no occasion to pick; "girls trip" became a Wellness
// Retreat on Team Retreat's borrowed corporate playbook. The page clock is
// pinned to 11/19/2026 so "March 6–9" is March 2027 whenever CI runs. Timers
// still run (setFixedTime, not install).
const TEXT = 'Girls trip to Nashville March 6–9 for 8';
const savedEvent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));

test('typed in one sentence, a girls’ trip becomes a multi-day destination plan of its own', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-19T12:00:00'));
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(TEXT);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 25000 });

  const ev = await savedEvent(page);
  expect(ev.type).toBe('Group Trip');
  expect(ev.date).toBe('2027-03-06');
  expect(ev.endDate).toBe('2027-03-09');
  expect(ev.guestEstimate).toBe(8);
  expect(ev.isDestination).toBe(true);
  // Stamped like every other destination, multi-day event (passGate.js, unchanged).
  expect(ev.passReasons).toEqual(expect.arrayContaining(['destination', 'multi-day']));

  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await settled(page);

  // The calls a group-trip organizer makes, in its own words.
  await openSectionByName(page, 'Calls to make');
  const calls = page.locator('.sheet').last();
  await expect(calls).toContainText('How does the money work');
  await expect(calls).toContainText('Are you playing golf');

  // Its steps, in the order the guides give: a firm yes before anything is booked.
  await openSectionByName(page, 'Your checklist');
  // Grouped by when, details inside each step (cohesion batch D): read it all.
  expect(await checklistText(page)).toMatch(/firm yes/i);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
