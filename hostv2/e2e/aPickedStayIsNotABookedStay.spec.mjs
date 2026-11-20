// ─── A PICKED STAY IS NOT A BOOKED STAY (owner ruling, 11/20/2026) ───────────
//
// A stay counts as done only when it is booked (lodgingIsHeld: a booking code,
// a refund date or an installment on file). A pick or a plan is not done. So:
//   - the board asks to BOOK the picked place by name, not the generic "Sort
//     where everyone stays", and the lodging part stays open until it is;
//   - once the host saves the booking code in the cockpit, the part closes and
//     nothing on the board asks about the stay again;
// Unit proof of the ledger: src/lib/__tests__/aPickedStayIsAskedToBeBooked.test.js.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const TRIP = {
  id: 'E2E_picked_stay', name: 'Santa Fe weekend', type: 'Bachelorette Party', date: dateIn(30),
  guestMode: 'count', guestEstimate: 8, guestCountSource: 'host', isDestination: true,
  venue: 'The Inn on the Plaza', venueAddress: '100 E San Francisco St, Santa Fe, NM', venueCity: 'Santa Fe, NM',
  startTime: '18:00', startTimeSource: 'host', totalBudget: 30000,
  budget: [], vendors: [], timeline: [], guests: [],
  // The shape "Make it the pick" leaves behind: the chosen option, and the
  // stay written from it (stayFromPick) — named, not booked.
  lodgingOptions: [
    { id: 'o1', label: 'La Fonda', status: 'chosen', platform: 'hotel', pricePerNight: 289 },
    { id: 'o2', label: 'Hotel St. Francis', status: 'option', platform: 'hotel', pricePerNight: 219 },
  ],
  lodging: { hotelName: 'La Fonda', from: 'the option you picked' },
};

const boot = async (page, ev) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};
const stayPart = (page) => page.locator('[aria-label^="Where everyone stays — "]').first().getAttribute('aria-label');
const boardText = (page) => page.locator('.app').first().innerText();

test('a picked stay is asked to be booked, by name, until a booking code is on file', async ({ page }) => {
  await boot(page, TRIP);
  expect(await stayPart(page)).toMatch(/still open/);
  const before = await boardText(page);
  expect(before).toMatch(/Book La Fonda/);
  expect(before).not.toMatch(/Sort where everyone stays/i);
  // The host books it and saves the code where the cockpit takes it.
  await page.locator('.srail-row', { hasText: 'Travel & where everyone stays' }).first().click();
  const code = page.getByRole('textbox', { name: 'Booking code' });
  await code.waitFor({ state: 'visible', timeout: 15000 });
  await code.fill('BACH26');
  await page.getByRole('button', { name: 'Save the stay details' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].lodging.code)).toBe('BACH26');
  await page.goto('?elegant=1');
  await settled(page);
  expect(await stayPart(page)).toMatch(/handled/);
  expect(await boardText(page)).not.toMatch(/Book La Fonda|Sort where everyone stays/i);
});

// GUESTS BOOK ON THEIR OWN (owner ruling, 11/20/2026): the stay is done once
// every guest on the roster has a booked room. Until then the board names how
// many still need one; the host marks the last room on the roster and the part
// closes.
test('under a self-book plan the board names who still needs a room, and closes when the last is booked', async ({ page }) => {
  await boot(page, {
    ...TRIP, id: 'E2E_self_book', guestMode: 'list', lodging: undefined, lodgingOptions: [],
    foodChoices: { dest_lodging: 'Guests book on their own' },
    guests: [
      { id: 'g0', name: 'Jordan Avery', rsvp: 'Yes', travel: { lodging: { status: 'booked' } } },
      { id: 'g1', name: 'Riley Park', rsvp: 'Yes', travel: { lodging: { status: 'confirmed' } } },
      { id: 'g2', name: 'Sam Okafor', rsvp: 'Yes' },
    ],
  });
  expect(await stayPart(page)).toMatch(/still open/);
  expect(await boardText(page)).toMatch(/1 guest still needs a room/);
  await page.locator('.srail-row', { hasText: 'Travel & where everyone stays' }).first().click();
  // The roster ("Who's booked a room") lives on the "On the books" step.
  await page.getByRole('button', { name: /On the books/ }).first().click({ timeout: 15000 });
  const sam = page.getByRole('button', { name: /^Sam Okafor — / }).first();
  await sam.waitFor({ state: 'visible', timeout: 15000 });
  await sam.click();
  await expect.poll(() => page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].guests.find((x) => x.id === 'g2');
    return g && g.travel && g.travel.lodging && g.travel.lodging.status;
  })).toBe('booked');
  await page.goto('?elegant=1');
  await settled(page);
  expect(await stayPart(page)).toMatch(/handled/);
  expect(await boardText(page)).not.toMatch(/still needs? a room|Sort where everyone stays/i);
});
