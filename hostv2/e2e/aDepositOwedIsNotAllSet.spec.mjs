// ─── A DEPOSIT OWED IS NOT "ALL SET" (hero-clears sweep, 11/20/2026) ─────────
//
// A vendor locked in on the status ladder with a recorded deposit not yet paid:
// the board index kept Vendors open ("Follow up with Night Shift DJ") — right,
// money is still owed — while the vendor sheet's hero said "Everyone's locked
// in — confirms, times, and paperwork all set." Two surfaces, one vendor,
// opposite answers. And nothing in this app could clear it: no control wrote
// `depositPaid`, so the part could never close however much the host did.
//
// One predicate now (lib/workstreams: vendorDepositOwed / isVendorSettled)
// read by the plan part and the sheet hero alike, and a way to say it is paid.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const EV = {
  id: 'E2E_deposit_owed', name: 'Game night', type: 'Game Night', date: dateIn(30),
  guestMode: 'count', guestEstimate: 12, guestCountSource: 'host',
  venue: 'Home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  startTime: '18:00', startTimeSource: 'host', totalBudget: 5000,
  budget: [], timeline: [], guests: [],
  vendors: [{ id: 'v1', name: 'Night Shift DJ', category: 'DJ', status: 'Confirmed', cost: 600, depositAmt: 200, depositPaid: false, contractSigned: true }],
};

const boot = async (page) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
};
const vendorsPart = (page) => page.locator('[aria-label^="Vendors — "]').first().getAttribute('aria-label');
const openVendors = async (page) => {
  await page.locator('.srail-row', { hasText: 'People you’re hiring' }).first().click();
  await page.locator('.sheet').last().waitFor({ state: 'visible' });
};

test('the vendor sheet does not call an owed deposit "all set"', async ({ page }) => {
  await boot(page);
  // PREMISE: the board knows money is owed.
  expect(await vendorsPart(page)).toMatch(/still open/);
  await openVendors(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet).not.toContainText(/paperwork all set/i);
  await expect(sheet).toContainText(/deposit/i);
});

test('marking the deposit paid closes the part and the hero moves on', async ({ page }) => {
  await boot(page);
  await openVendors(page);
  const sheet = page.locator('.sheet').last();
  const card = page.locator('.vcard[data-vid="v1"]');
  await card.locator('.vc-head').click();
  await card.getByRole('button', { name: 'Mark deposit paid', exact: true }).click();
  await expect(sheet).toContainText(/paperwork all set/i);
  await page.keyboard.press('Escape');
  await expect.poll(() => vendorsPart(page)).toMatch(/handled/);
  const ask = await page.locator('.hero h2.ask').first().innerText().catch(() => '');
  expect(ask).not.toMatch(/follow up with night shift dj|night shift dj/i);
  await page.reload();
  await settled(page);
  expect(await vendorsPart(page)).toMatch(/handled/);
});
