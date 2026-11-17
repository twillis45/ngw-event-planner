// ─── WHERE EVERYONE STAYS KNOWS WHERE THE PARTY IS (owner, 11/16/2026) ───────
//
// "Make sure workflow is not confusing to hosts. Venue is related to where
// everyone stays." The 40-host lodging run: the stay screen never named the
// venue it held (11 of 12 trip hosts), the hotel search looked across the whole
// town, and a host whose party WAS at a hotel had to search for the hotel she
// had already named. Now the stay screen names the party and changes it, the
// hotel door searches near it, a party hotel is one tap (as the plan, never as
// booked), and the Venue sheet names and opens the stay.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const trip = (venue) => ({
  id: 'stay-party', name: 'Jordan’s 50th Birthday', type: 'Birthday', date: '2027-06-11', endDate: '2027-06-13',
  isDestination: true, venueCity: 'Anaheim', venueState: 'CA', guestMode: 'count', guestEstimate: 60, guestCountSource: 'host',
  passPurchased: true, budget: [], vendors: [], guests: [], timeline: [], ...(venue ? { venue, venueKind: 'venue' } : {}),
});
const seed = async (page, ev) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.setViewportSize({ width: 390, height: 844 });
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0] || {});

test('the stay screen names the party, changes it, and searches hotels near it', async ({ page }) => {
  await seed(page, trip('House of Blues Anaheim'));
  await page.goto('./?demo=lodging');
  const line = page.locator('[data-stay-party]');
  await expect(line).toContainText('The party: House of Blues Anaheim · Anaheim, CA');
  await expect(line.getByRole('button', { name: 'Change the venue' })).toBeVisible();
  const hotels = page.locator('a[href*="google.com/travel"]').first();
  expect(decodeURIComponent(await hotels.getAttribute('href'))).toContain('q=hotels near House of Blues Anaheim, Anaheim, CA');
  // Not a hotel: no "stay at the party" offer.
  await expect(page.locator('[data-stay-party-hotel]')).toHaveCount(0);
});

test('a party at a hotel: staying there is one tap, as the plan — never as booked', async ({ page }) => {
  await seed(page, trip('Hotel Fera'));
  await page.goto('./?demo=lodging');
  const tap = page.locator('[data-stay-party-hotel]');
  await expect(tap).toHaveText('Guests stay at Hotel Fera too');
  await tap.click();
  await page.waitForTimeout(800);
  const e = await stored(page);
  expect(e.lodging && e.lodging.hotelName).toBe('Hotel Fera');
  expect(e.lodging && e.lodging.from).toBe('the plan, not booked yet');
  await expect(page.locator('.lc-h1')).not.toHaveText(/on the books/i);
  await expect(page.locator('[data-stay-party-hotel]')).toHaveCount(0);
  // Not "Go find some places." — she just said where (owner: not confusing).
  await expect(page.locator('.lc-h1')).toHaveText(/You have a pick/i);
  await expect(page.locator('[data-stay-planned]')).toContainText('Everyone stays at Hotel Fera — the plan, not booked yet.');
  await page.getByRole('button', { name: 'The rooms are held' }).click();
  await expect(page.locator('.lc-h1')).toHaveText(/on the books/i);
  expect((await stored(page)).lodging.from).toBe('typed off the confirmation');
});

test('the Venue sheet names the stay and opens it', async ({ page }) => {
  await seed(page, trip('House of Blues Anaheim'));
  await page.goto('./?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Venue');
  const line = page.locator('[data-venue-stay]');
  await expect(line).toContainText('Where everyone stays: not picked yet');
  // No dangling separator when the button wraps at 390px (live, 11/17/2026).
  expect(await line.innerText()).not.toContain('·');
  await line.getByRole('button', { name: 'Find places near the party' }).click();
  await expect(page).toHaveURL(/demo=lodging/);
  await expect(page.locator('[data-stay-party]')).toContainText('House of Blues Anaheim');
});

// Call 1 (owner-approved 11/16/2026): a hotel's own site cannot be read; it can
// be kept. The dead end becomes "Save it as the place", and the link stays.
test('a hotel site that cannot be read can be saved as the place, with its link', async ({ page }) => {
  await seed(page, trip('House of Blues Anaheim'));
  await page.route('**/api/lodging/unfurl**', (r) => r.fulfill({ json: { ok: false } }));
  await page.goto('./?demo=lodging');
  const link = 'https://www.marriott.com/en-us/hotels/laxah-anaheim-marriott/overview/';
  await page.locator('textarea').first().fill(link);
  await page.getByRole('button', { name: /Read what I pasted/i }).click();
  await expect(page.locator('[data-stay-save-link]')).toBeVisible({ timeout: 15000 });
  await page.getByLabel('Where everyone is staying').fill('Anaheim Marriott');
  await page.getByRole('button', { name: 'That’s the plan, not booked' }).click();
  await page.waitForTimeout(800);
  const e = await stored(page);
  expect([e.lodging.hotelName, e.lodging.url, e.lodging.from]).toEqual(['Anaheim Marriott', link, 'the plan, not booked yet']);
  await expect(page.locator('[data-stay-planned]')).toContainText('Everyone stays at Anaheim Marriott');
});
