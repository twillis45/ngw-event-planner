// ─── TABLES SEAT PEOPLE, EVEN WITHOUT NAMES ──────────────────────────────────
//
// Owner approved 11/18/2026. "Who sits where" opens only once guests say yes,
// so a Friendsgiving planned by headcount never learned whether 15 people fit,
// and its table count was the buffet table (1). Space, seats & helpers now says
// how many tables of 8 the headcount needs, and the ± sets the host's number.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'e2e-seats', name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(10), startTime: '16:00',
    venue: "Vida's", venueCity: 'Baltimore', venueState: 'MD', guestMode: 'count', guestEstimate: 15, guestCountSource: 'host',
    guests: [], vendors: [], budget: [], timeline: [],
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, /Space/);
  await settled(page);
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].tables);

test('15 guests, no names: about 2 tables of 8, and the ± sets her own number', async ({ page }) => {
  await boot(page);
  const line = page.locator('[data-seat-check]');
  await expect(line).toContainText('About 2 tables of 8 for 15 guests');
  await line.getByRole('button', { name: 'One more table' }).click();
  await expect(line).toContainText('3 tables — your number, for 15 guests.');
  expect(await stored(page)).toBe(3);
});
