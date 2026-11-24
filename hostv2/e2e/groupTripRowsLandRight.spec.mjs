// ─── FOUR GROUP TRIP ROWS LAND WHERE THE WORK IS (11/21/2026) ────────────────
//
// "Book the place" opened the add-a-vendor field; "Reserve the group dinners"
// opened the Space list ("table"); "Send a short list of house norms" opened
// People you're hiring ("rental"); "search the listing's address" opened Your
// money ("pay"). Each now lands where that work is done: the stay, the
// bookings, Updates to everyone, the stay. The rules were fixed, not the rows.
// Jest twin (with the neighbors that must not move):
// src/lib/__tests__/groupTripRowsLandRight.test.js.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const ID = 'e2e-trip-routes';
const ROWS = {
  book: 'Book the place: check its cancellation policy before you pay, and pay by credit card through the booking site, never by wire transfer, gift card, or a payment app',
  listing: 'Before you pay, search the listing\'s address with the owner\'s name. If other ads show the same address under a different name, it is probably a scam',
  dinners: 'Reserve the group dinners. A table for the whole group needs a booking',
  norms: 'Send a short list of house norms, including the booking site\'s rule against parties at a rental',
};
const EVENT = {
  id: ID, name: 'Nashville Weekend', type: 'Group Trip', date: dateIn(40), endDate: dateIn(42),
  createdAt: new Date(Date.now() - 60 * 864e5).toISOString(),
  venue: 'Nashville, TN', venueCity: 'Nashville', venueState: 'TN',
  guestMode: 'list', guestEstimate: 4, guestCountSource: 'host', guests: [{ id: 'g1', name: 'Ana Ruiz' }],
  vendors: [], budget: [], foodChoices: {},
  timeline: Object.entries(ROWS).map(([k, task]) => ({ id: `pbt-${ID}-${k}`, task, leadDays: 35, week: '5 weeks out', done: false, owner: '', category: 'planning', phase: 'logistics' })),
};

const tapRow = async (page, task, label) => {
  await page.route(`${API}/api/events/${ID}/announcements`, (r) => r.fulfill({ status: 200,
    json: { ok: true, announcements: [], email_guests: 0, limits: { today: 0, total: 0, per_day: 3, per_event: 20 } } }));
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  // The row's own button: the one under the row whose lead is this step.
  const sheet = page.locator('.sheet').last();
  const lead = task.split(/:| — |; | \(|\. /)[0];
  const btn = sheet.locator('.frow', { hasText: lead }).locator('xpath=following-sibling::*[1]').locator('button[data-row-action]');
  await expect(btn).toHaveText(`${label} →`);
  await btn.click();
};
const atTheStay = (page) => expect.poll(async () => /[?&]demo=lodging\b/.test(page.url())
  || (await page.locator('#sheet-title').allInnerTexts()).includes('Travel & where everyone stays'), { timeout: 15_000 }).toBe(true);

test('"Book the place" opens Where everyone stays', async ({ page }) => {
  await tapRow(page, ROWS.book, 'Open where everyone stays');
  await atTheStay(page);
});

test('"search the listing\'s address" opens Where everyone stays', async ({ page }) => {
  await tapRow(page, ROWS.listing, 'Open where everyone stays');
  await atTheStay(page);
});

test('"Reserve the group dinners" opens People you’re hiring, not the Space list', async ({ page }) => {
  await tapRow(page, ROWS.dinners, 'Line them up');
  await sheetSettled(page);
  await expect(page.locator('.sheet').last().locator('#sheet-title')).toHaveText('People you’re hiring');
});

test('"Send a short list of house norms" opens Updates to everyone on the Guest list', async ({ page }) => {
  await tapRow(page, ROWS.norms, 'Open updates to everyone');
  await sheetSettled(page);
  const box = page.locator('.sheet').last().locator('[data-host-updates]');
  await expect(box).toBeVisible();
  await expect(box.getByRole('textbox', { name: 'Your update to every guest' })).toBeInViewport();
});
