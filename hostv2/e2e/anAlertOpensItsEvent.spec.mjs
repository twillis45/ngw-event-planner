// An alert email or device notification links `?event=<id>`. Before 11/20 the
// app opened whichever event the host had open last, which could be another
// one than the alert was about. Now it opens the linked event, if it is the
// host's own, and removes the id from the address bar.
import { test, expect, settled } from './fixtures.mjs';

const ev = (id, name) => ({
  id, name, type: 'Birthday', date: '2027-06-12', venueCity: 'Anaheim', venueState: 'CA',
  guestMode: 'count', guestCount: 60, budget: [], vendors: [], guests: [], timeline: [],
});
const EVS = [ev('cust-alert-a', 'Jordan’s 50th Birthday'), ev('cust-alert-b', 'Ana’s 40th')];

const boot = async (page, query) => {
  await page.addInitScript((evs) => {
    if (sessionStorage.getItem('booted')) return;
    sessionStorage.setItem('booted', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify(evs));
    localStorage.setItem('ngw-hostv2-last-event', evs[0].id);   // last open: A
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVS);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?elegant=1' + query);
  await settled(page);
};
const openEvent = (page) => page.evaluate(() => localStorage.getItem('ngw-hostv2-last-event'));

test('the alert link opens the event it is about, and leaves the address clean', async ({ page }) => {
  await boot(page, '&event=cust-alert-b');
  await expect.poll(() => openEvent(page)).toBe('cust-alert-b');
  await expect(page.locator('body')).toContainText('Ana’s 40th');
  expect(page.url()).not.toContain('event=');
});

test('an id that is not one of the host\'s events changes nothing', async ({ page }) => {
  await boot(page, '&event=someone-elses-event');
  await settled(page);
  expect(await openEvent(page)).toBe('cust-alert-a');
  expect(page.url()).not.toContain('event=');
});
