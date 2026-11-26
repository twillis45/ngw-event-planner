// ─── THE MORNING OF, THE LIST IS THERE ──────────────────────────────────────
//
// #281 put "Before guests arrive" on the live day behind `!eventLive`. But
// eventLive is a CALENDAR test (any day of the event, all day), and the live
// view only renders on such a day — so the card could never show. The source
// test that came with it read the text, not the screen. This drives the screen
// with the clock set: until the time guests arrive (her start time), the list
// is there, even with the turkey already in; once guests are due, the timeline
// leads and the list steps aside.
import { test, expect, settled, goToStage } from './fixtures.mjs';

const DAY = '2026-11-26';
const boot = async (page, at) => {
  await page.clock.setFixedTime(new Date(DAY + 'T' + at));
  await page.addInitScript((date) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'doors-probe');
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: 'doors-probe', type: 'Thanksgiving', name: 'Doors probe', date,
        startTime: '15:00', startTimeSource: 'host', guestCount: 12,
        guests: [], vendors: [], budget: [], timeline: [],
      }]));
    }
  }, DAY);
  await page.goto('?elegant=1');
  await settled(page);
  await goToStage(page, 'The Day');
  await settled(page);
};

test('the morning of, before the doors open: "Before guests arrive" is on the day', async ({ page }) => {
  await boot(page, '07:00:00');
  const card = page.locator('.dayof-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Before guests arrive');
  expect(await card.locator('.frow').count()).toBeGreaterThan(4);
});

test('mid-morning, cooking under way but no guests yet: the list is still there', async ({ page }) => {
  await boot(page, '10:00:00');
  await expect(page.locator('.dayof-card')).toContainText('Before guests arrive');
});

test('once the day is under way, the timeline leads and the list steps aside', async ({ page }) => {
  await boot(page, '18:30:00');
  await expect(page.locator('.dayof-card')).toHaveCount(0);
});
