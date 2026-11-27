// ─── A VENDOR CAN BE MARKED HERE ─────────────────────────────────────────────
// Owner, 11/26/2026: "Yes add They're here to hostv2". The day's alerts call a
// booked vendor late ten minutes after their arrival time until their
// arrivalStatus says 'arrived', and no hostv2 screen wrote that field, so
// "Bay Catering hasn't arrived" could not be cleared. The alert now carries
// "They're here" (lib/dayOfEdits vendorArrivalEdit, the write hostv4's Vendors
// today makes): one tap, saved, and the alert is gone.
import { test, expect, settled, goToStage } from './fixtures.mjs';

const DAY = '2026-11-26';
test('a late vendor’s alert: "They’re here" marks them arrived and the alert clears', async ({ page }) => {
  await page.clock.setFixedTime(new Date(DAY + 'T10:00:00'));
  await page.addInitScript((date) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'vendor-here');
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: 'vendor-here', type: 'Thanksgiving', name: 'Vendor probe', date, startTime: '15:00', startTimeSource: 'host', guestCount: 12,
        guests: [], budget: [], timeline: [],
        vendors: [{ id: 'v1', name: 'Bay Catering', category: 'Catering', status: 'Booked', bookingStatus: 'Booked', arrivalTime: '09:30' }],
      }]));
    }
  }, DAY);
  await page.goto('?elegant=1');
  await settled(page);
  await goToStage(page, 'The Day');
  await settled(page);
  const alert = page.locator('[data-day-alert="ov-v1"]');
  await expect(alert).toContainText('Bay Catering hasn\'t arrived');
  await alert.locator('[data-vendor-here]').click();
  await settled(page);
  await expect(page.locator('[data-day-alert="ov-v1"]')).toHaveCount(0);
  const status = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].vendors[0].arrivalStatus);
  expect(status).toBe('arrived');
});
