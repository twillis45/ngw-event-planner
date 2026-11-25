// ─── A VENUE ADDRESS IS FOUND WHOLE, AND EVERY READER SHOWS IT WHOLE ─────────
//
// Owner report (iPad, live, dark), 11/21/2026:
//   "The venue input for addresses doesn't geocode correctly. Should find city
//    and state with zip. Then on space seats and helpers, the state is not
//    being picked up. Also in invite not picking up all of address."
//
// The Venue input reuses the app's one address lookup (OpenStreetMap Nominatim,
// fetchAddressSuggestions); its response is mocked here as other specs mock
// APIs. A picked suggestion stores street, town, state, ZIP and coordinates, and
// the Venue sheet's "Currently", Space's "Venue / location" and the guest invite
// all read the one line formatVenueAddress composes. When the lookup finds
// nothing, or the network is gone, the typed text is saved and the host is told
// the ZIP was not found; no ZIP or state is ever made up.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const CODE = 'venue-whole-code';
// Made-up address; the owner's shape: a street typed as the venue, her home,
// confirmed, with the town and state known and no ZIP.
const EVENT = {
  id: 'e2e-venue-whole', rsvpCode: CODE, name: 'Game night', type: 'Game Night', date: dateIn(12), time: '19:00',
  recordKind: 'host_event', venue: '100 Example Ln', venueKind: 'home', venueConfirmed: true,
  venueCity: 'Annapolis', venueState: 'MD',
  guestMode: 'count', guestEstimate: 8, guestCountSource: 'host', budget: [], vendors: [], guests: [],
};
const HIT = {
  lat: '38.9700', lon: '-76.4900', name: '', category: 'place', type: 'house',
  display_name: '100, Example Lane, Annapolis, Anne Arundel County, Maryland, 21401, United States',
  address: {
    house_number: '100', road: 'Example Lane', town: 'Annapolis', county: 'Anne Arundel County',
    state: 'Maryland', 'ISO3166-2-lvl4': 'US-MD', postcode: '21401', country: 'United States', country_code: 'us',
  },
};
const WHOLE = '100 Example Lane, Annapolis, MD 21401';

const seed = async (page, lookup) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route('https://nominatim.openstreetmap.org/**', lookup);
  await page.goto('?elegant=1');
  await settled(page);
};

const typeInVenue = async (page, text) => {
  await openSectionByName(page, 'Venue');
  const box = page.locator('.sheet input[data-venue-field]:visible').first();
  await box.click();
  await box.fill('');
  await page.keyboard.type(text, { delay: 5 });
  return box;
};
const saveVenue = (page, box) => box.locator('xpath=../..').getByRole('button', { name: 'Save' }).click();
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0] || {});
const spaceVenueLine = async (page) => {
  await openSectionByName(page, 'Space, seats');
  const sheet = page.locator('.sheet').last();
  await expect(sheet.getByText(/^The place$/i).first()).toBeVisible();
  return (await sheet.textContent()).replace(/\s+/g, ' ');
};
const inviteWhere = async (page) => {
  await page.goto('?rsvp=' + CODE);
  const where = page.locator('[data-invite-where]').first();
  await expect(where).toBeVisible();
  return (await where.textContent()).trim();
};

test('a picked address shows street, city, ST and ZIP on the Venue sheet, Space and the invite', async ({ page }) => {
  test.setTimeout(90000);
  await seed(page, (route) => route.fulfill({ status: 200, json: [HIT] }));
  const box = await typeInVenue(page, '100 Example Ln');
  const sug = page.locator('.sheet [data-venue-suggestion]').first();
  await expect(sug).toHaveText(WHOLE);
  await sug.click();
  await saveVenue(page, box);
  await page.waitForTimeout(600);

  const e = await stored(page);
  expect(e).toMatchObject({
    venueStreet: '100 Example Lane', venueCity: 'Annapolis', venueState: 'MD', venueZip: '21401',
    venueAddress: WHOLE, venueLat: 38.97, venueLon: -76.49,
  });
  const currently = page.locator('.sheet [data-venue-currently]').last();
  await expect(currently).toContainText(`Currently: ${WHOLE}`);
  // The same home, now with its ZIP: her confirmation stands.
  await expect(currently).toContainText('your home, confirmed');

  expect(await spaceVenueLine(page)).toContain(`Set: ${WHOLE}`);
  expect(await inviteWhere(page)).toBe(WHOLE);
});

test('an existing street with a town and no ZIP keeps its state everywhere', async ({ page }) => {
  await seed(page, (route) => route.fulfill({ status: 200, json: [] }));
  expect(await spaceVenueLine(page)).toContain('Set: 100 Example Ln, Annapolis, MD');
  expect(await inviteWhere(page)).toBe('100 Example Ln, Annapolis, MD');
});

for (const [label, lookup] of [
  ['the lookup finds nothing', (route) => route.fulfill({ status: 200, json: [] })],
  ['the host is offline', (route) => route.abort('internetdisconnected')],
]) {
  test(`when ${label}, the typed address is saved and no ZIP is made up`, async ({ page }) => {
    test.setTimeout(90000);
    await seed(page, lookup);
    const box = await typeInVenue(page, '200 Example Ln');
    await page.waitForTimeout(900);   // past the lookup's debounce
    await expect(page.locator('.sheet [data-venue-suggestion]')).toHaveCount(0);
    await saveVenue(page, box);
    await expect(page.locator('.toast').first()).toContainText('Saved as typed — we couldn’t find the ZIP.');
    const e = await stored(page);
    expect(e.venue).toBe('200 Example Ln');
    expect(e.venueZip || '').toBe('');
    await expect(page.locator('.sheet [data-venue-currently]').last()).toContainText('Currently: 200 Example Ln, Annapolis, MD.');
    const space = await spaceVenueLine(page);
    expect(space).toContain('Set: 200 Example Ln, Annapolis, MD');
    expect(space).not.toContain('21401');
  });
}
