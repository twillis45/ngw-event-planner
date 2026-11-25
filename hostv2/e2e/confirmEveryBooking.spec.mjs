// ─── CONFIRM EVERY BOOKING (owner pick "A: Reconfirm each booking", 11/21/2026) ─
//
// Group Trip's "Confirm every reservation…" had no button. "Reconfirm each
// booking" opens the reconfirm sweep, titled "Confirm every booking", with the
// stay first (its name, its booked state, "Open the stay") and then each
// BOOKED vendor. The bug it fixes: the sweep drafted "just confirming we're all
// set" to vendors still at "Inquired" — in this sheet and in the 0–3-days-out
// banner, which reads the same list. Its subtitle claimed "their arrival time
// and your address" for every note; it now says only what the note carries.
// Jest twin: src/lib/__tests__/confirmEveryBooking.test.js.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName, checklistStepAction } from './fixtures.mjs';

const STEP = 'Confirm every reservation: the place to stay, the dinners, and anything else that is booked';
const trip = (id, days, extra = {}) => ({
  id, name: 'Nashville Weekend', type: 'Group Trip', date: dateIn(days), endDate: dateIn(days + 2),
  createdAt: new Date(Date.now() - 60 * 864e5).toISOString(),
  venue: 'Nashville, TN', venueCity: 'Nashville', venueState: 'TN',
  guestMode: 'count', guestEstimate: 6, guestCountSource: 'host', guests: [], budget: [], foodChoices: {},
  lodging: { hotelName: 'The Gulch House', from: 'typed off the confirmation' },
  vendors: [
    { id: 'v1', name: 'Husk dinner', category: 'Restaurant', status: 'Booked' },
    { id: 'v2', name: 'Biscuit Love brunch', category: 'Restaurant', status: 'Inquired' },
  ],
  timeline: [{ id: `pbt-${id}-t_confirm`, task: STEP, leadDays: 10, week: '10 days out', done: false, owner: '', category: 'planning', phase: 'logistics' }],
  ...extra,
});
const boot = async (page, e) => {
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, e);
  await page.goto('?elegant=1');
  await settled(page);
};
const openFromTheRow = async (page) => {
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await (await checklistStepAction(page, 'Reconfirm each booking')).click();
  await sheetSettled(page);
  return page.locator('.sheet').last();
};

test('the row opens "Confirm every booking": the stay first, then only the booked vendors', async ({ page }) => {
  await boot(page, trip('e2e-confirm-all', 20));
  const sheet = await openFromTheRow(page);
  await expect(sheet.locator('#sheet-title')).toHaveText('Confirm every booking');
  const rows = sheet.locator('.sweep-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toHaveAttribute('data-sweep-stay');
  await expect(rows.first()).toContainText('The Gulch House');
  await expect(rows.first().locator('.sweep-state')).toHaveText('booked');
  await expect(rows.nth(1)).toContainText('Husk dinner');
  await expect(sheet).not.toContainText('Biscuit Love');
  await expect(sheet).toContainText('Each note has your date, plus their arrival time and your place when they’re on file.');
  await expect(sheet).not.toContainText('Each note has their arrival time and your address');
  // The drafts are ready on open: the booked vendor's note can be copied or read.
  await expect(rows.nth(1).getByRole('button', { name: 'Read it first' })).toBeVisible();
});

test('"Open the stay" goes to Where everyone stays', async ({ page }) => {
  await boot(page, trip('e2e-confirm-stay', 20, { lodging: { hotelName: 'Maybe Cabin', from: 'the option you picked' } }));
  const sheet = await openFromTheRow(page);
  const stay = sheet.locator('[data-sweep-stay]');
  await expect(stay.locator('.sweep-state')).toHaveText('not booked yet');
  await stay.getByRole('button', { name: 'Open the stay' }).click();
  // The cockpit is its own page (?demo=lodging); a pass-locked trip opens the lodging sheet.
  await expect.poll(async () => /[?&]demo=lodging\b/.test(page.url())
    || (await page.locator('#sheet-title').allInnerTexts()).includes('Travel & where everyone stays'), { timeout: 15_000 }).toBe(true);
});

test('two days out, the reconfirm banner counts only the booked vendor', async ({ page }) => {
  await boot(page, trip('e2e-confirm-banner', 2));
  const banner = page.locator('.sweepcard');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Husk dinner holds your day');
  await expect(banner).not.toContainText('2 vendors');
  await banner.getByRole('button', { name: 'Draft a reconfirm for each' }).click();
  await sheetSettled(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet.locator('#sheet-title')).toHaveText('Reconfirm your vendors');
  await expect(sheet.locator('[data-sweep-stay]')).toHaveCount(0);
  await expect(sheet.locator('.sweep-row')).toHaveCount(1);
  await expect(sheet).not.toContainText('Biscuit Love');
});
