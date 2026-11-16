// ─── A SHORT LIST SAYS THE PLAN BESIDE IT (11/16/2026) ───────────────────────
// Live, signed in as the demo account: a Friendsgiving typed "for 20", four
// names added. The Guest list read "Your people 4 · on the list — counted,
// never chased" while every other screen planned for 20. A headcount host's
// plan lives in guestEstimate, which that line never read.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = { id: 'cust-shortlist', name: 'Marcus’s Friendsgiving', type: 'Friendsgiving', date: dateIn(6),
  guestEstimate: 20, guestMode: 'count', guestCountSource: 'host', budget: [], vendors: [], timeline: [],
  guests: ['Ana Ruiz', 'Leo Park', 'Mia Chen', 'Sam Lee'].map((name, i) => ({ id: 'g' + i, name, rsvp: '' })) };

test('four names on a plan for 20 says "planning for 20"', async ({ page }) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests');
  await settled(page);
  await expect(page.locator('.sheet').last()).toContainText('planning for 20');
});
