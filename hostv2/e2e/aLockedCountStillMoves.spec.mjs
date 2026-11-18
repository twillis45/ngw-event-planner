// ─── A LOCKED GUEST COUNT STILL MOVES WHEN THE HOST MOVES IT ─────────────────
//
// Single-source audit, 11/18/2026 (High). The stepper wrote only guestEstimate,
// and every reader (guestCountFor) prefers the locked guestCount. After "Lock
// 40 in", every −/+ toasted "Planning around 41 now" while the number on
// screen stayed 40 and the plan never changed. The host's own edit now moves
// the lock with it.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

test('after the count is locked, + still changes the number the plan uses', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'e2e-lock', name: 'Birthday', type: 'Birthday', date: dateIn(20),
    guestMode: 'count', guestEstimate: 30, guestCount: 40, guestCountSource: 'host', budget: [], vendors: [], guests: [],
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests');
  await page.locator('[aria-label="More guests"]').first().click();
  await expect.poll(() => page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0];
    return Number(e.guestCount) || Number(e.guestEstimate);
  })).toBe(41);
  await expect(page.locator('.sheet').last()).toContainText('41');
});
