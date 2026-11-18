// ─── THE VENDOR PRICE HINT COUNTS THE GUEST LIST ────────────────────────────
//
// Single-source audit 11/18/2026, #11. A caterer's card shows how it prices
// ("$50/head"). The hint read `guestCount || guestEstimate` and skipped the
// guest list, so a host who had only typed in names got no per-head figure,
// while every other surface counted those names (guestCountFor).
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

test('a list-only event shows the caterer per head', async ({ page }) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'e2e-vhint', name: 'List Only', type: 'Birthday', date: dateIn(30), startTime: '18:00',
    venue: 'Home', venueKind: 'home', venueCity: 'Baltimore', venueState: 'MD',
    guests: Array.from({ length: 10 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'pending' })),
    vendors: [{ id: 'v1', name: 'Charm City Catering', category: 'Catering', cost: 500, status: 'booked' }],
    budget: [], timeline: [],
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, /hiring/i);
  await settled(page);
  await expect(page.locator('.vc-cat', { hasText: /Catering/ }).first()).toContainText('$50/head');
});
