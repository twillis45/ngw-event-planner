import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const base = (over = {}) => ({ id: 'c5-event', type: 'Birthday', name: 'Core journeys', date: dateIn(80), guestMode: 'count', guestCount: 40, guestCountSource: 'host', totalBudget: 5000, venue: 'Community Hall', venueKind: 'venue', venueCity: 'Baltimore', venueState: 'MD', startTime: '17:00', startTimeSource: 'derived', startTimeBasis: 'rule-of-thumb', guests: [], vendors: [], budget: [], timeline: [], ...over });
const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    if (!localStorage.getItem('ngw-hostv2-custom-events')) localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0]);

test('a vendor can be removed from this event and restored with the existing Undo', async ({ page }, testInfo) => {
  await boot(page, base({ vendors: [{ id: 'v-c5', category: 'DJ', name: 'DJ Sample', status: 'Considering' }] }));
  await openSectionByName(page, 'People you’re hiring');
  await page.locator('.vcard[data-vid="v-c5"] .vc-head').click();
  const remove = page.getByRole('button', { name: 'Remove vendor DJ Sample', exact: true });
  await expect(remove).toBeVisible();
  if (page.viewportSize().width <= 480) expect((await remove.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.locator('.vcard[data-vid="v-c5"]').evaluate(el => Promise.allSettled(el.getAnimations({ subtree: true }).map(a => a.finished)));
  await remove.scrollIntoViewIfNeeded();
  await expect(remove).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('vendor-remove-control.png') });
  await remove.click({ timeout: 5000 });
  expect((await saved(page)).vendors).toEqual([]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await saved(page)).vendors).toEqual([expect.objectContaining({ id: 'v-c5', name: 'DJ Sample' })]);
});
