// ─── A DATE CHANGE IS UNDONE, NOT CONFIRMED (cohesion G #53, owner 11/24/2026) ──
//
// UX_11 rule 18. Shrinking a trip's dates asked a native confirm ("2 things
// planned after the new last day: … Change the dates anyway? Nothing is
// deleted."). Nothing is deleted, so the change now lands, its toast says what
// falls after the last day ("they're kept"), and Undo puts the dates back.
import { test, expect } from '@playwright/test';
import { settled, sheetSettled, dateIn } from './fixtures.mjs';

const TRIP = { id: 'g-dates', name: 'Lake Weekend', type: 'Group Trip', date: dateIn(40), endDate: dateIn(43),
  createdAt: new Date(Date.now() - 30 * 864e5).toISOString(), venueCity: 'Annapolis', venueState: 'MD',
  guestMode: 'count', guestEstimate: 6, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [],
  itinerary: [{ id: 'i1', date: dateIn(42), title: 'Boat day' }, { id: 'i2', date: dateIn(43), title: 'Brunch before the drive' }] };

test('shrinking the dates asks nothing: the toast says two things now fall after the last day, and Undo puts them back', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  let dialogs = 0;
  page.on('dialog', (d) => { dialogs++; d.dismiss(); });
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, TRIP);
  await page.goto('./?elegant=1&noanalytics=1');
  await settled(page);
  await page.locator('button.chip', { hasText: /^Date & time$/ }).first().click();
  await sheetSettled(page);
  const last = page.locator('.sheet').last().getByLabel('Last day');
  await last.fill(dateIn(41));
  await page.locator('.sheet').last().getByRole('button', { name: 'Move everything to these dates' }).click();
  await expect(page.locator('.toast')).toContainText('Dates changed. 2 things now fall after the last day — they’re kept.');
  expect(dialogs, 'no native confirm').toBe(0);
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0])).endDate).toBe(dateIn(41));
  await page.locator('.toast').getByRole('button', { name: 'Undo' }).click();
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0])).endDate).toBe(dateIn(43));
});
