// ─── DAY 2 OF A TRIP HAS ITS ALERTS ─────────────────────────────────────────
//
// The live day's alert stack returned nothing unless `days === 0`, and `days`
// counts from event.date — the FIRST day. So on day 2 or 3 of a trip the live
// view ran with no alerts at all, a balance due that very day included. The
// gate is now "an event day" (lib/dayState), the same test the live view uses.
// Drives the screen with the clock set to day 2 of a three-day trip.
import { test, expect, settled, goToStage } from './fixtures.mjs';

const DAY1 = '2027-05-13';
const DAY2 = '2027-05-14';
const DAY3 = '2027-05-15';
const boot = async (page, day, at) => {
  await page.clock.setFixedTime(new Date(day + 'T' + at));
  await page.addInitScript(({ DAY1, DAY2, DAY3 }) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'trip-alerts-probe');
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: 'trip-alerts-probe', type: 'Group Trip', name: 'Trip alerts probe',
        date: DAY1, endDate: DAY3, guestCount: 8,
        rosEdited: true,
        ros: [
          { id: 'r1', day: 1, time: '11:00', segment: 'Check in' },
          { id: 'r2', day: 2, time: '10:00', segment: 'Brunch' },
          { id: 'r3', day: 2, time: '14:00', segment: 'Boat tour' },
          { id: 'r4', day: 3, time: '10:00', segment: 'Check out' },
        ],
        vendors: [{ id: 'vb', name: 'Harbor Boats', category: 'Activities', status: 'Booked', cost: 600, balancePaid: false, payDueDate: DAY2 }],
        guests: [], budget: [], timeline: [],
      }]));
    }
  }, { DAY1, DAY2, DAY3 });
  await page.goto('?elegant=1');
  await settled(page);
  await goToStage(page, 'The Day');
  await settled(page);
};

test('day 2 of a three-day trip: the payment due that day is on the live view', async ({ page }) => {
  await boot(page, DAY2, '09:00:00');
  // The live view of day 2, not the preview: its first cue is day 2's.
  await expect(page.getByRole('heading', { name: 'Brunch', level: 2 })).toBeVisible();
  await expect(page.getByText('Payment due today: Harbor Boats')).toBeVisible();
});
