// ─── THE START TIME: TWO EDITORS, ONE STORE (owner 11/22/2026, "Both can edit") ─
//
// The run of show's "guests arrive" time and Date & time's start time are one
// fact, `event.startTime`. Both must edit it, and each must show what the
// other wrote. Before this, the run of show's row vanished the moment the day
// went on her clock, so once she had set the hour only Date & time could move
// it. The one setter (lib/eventDates eventStartTimePatch) and the census that
// fails a second writer are in jest (eventDatesAreOneSource.test.js).
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || x.textContent || '').trim()));
  if (el) el.click();
  return !!el;
}, src);
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0]);

const boot = async (page) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const ev = {
      id: 'e2e-start', name: 'Mom’s 60th', type: 'Birthday', date: '2027-06-12',
      venueCity: 'Atlanta', state: 'GA', guestMode: 'count', guestCount: 20, totalBudget: 2000,
      startTime: '15:00', startTimeSource: 'derived', budget: [], vendors: [], guests: [],
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-start');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
};
const openRunOfShow = async (page) => {
  await tapText(page, '^The Day$');
  await page.waitForTimeout(1200);
  await settled(page);
  await tapText(page, '^Full agenda$');
  await page.waitForTimeout(800);
  await settled(page);
  return rosTime(page);
};
// The run of show's own row, not the Date & time sheet's field of the same name.
const rosTime = (page) => page.locator('.later-row').getByLabel('What time guests arrive');
const openDateAndTime = async (page) => {
  await tapText(page, '^(The )?Plan$');
  await settled(page);
  await openSectionByName(page, 'Space, seats');
  await settled(page);
  await page.locator('.sheet').last().getByRole('button', { name: /dates in Date & time/ }).click();
  await settled(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet.locator('#sheet-title')).toHaveText('Date & time');
  return sheet.getByLabel('What time guests arrive');
};

test('the run of show and Date & time both edit the one start time', async ({ page }) => {
  test.setTimeout(120000);
  await boot(page);

  // The run of show sets it…
  let ros = await openRunOfShow(page);
  await ros.fill('18:00');
  await settled(page);
  expect(await saved(page)).toMatchObject({ startTime: '18:00', startTimeSource: 'host' });

  // …and, with the day now on her clock, can still move it.
  ros = rosTime(page);
  await expect(ros).toHaveValue('18:00');
  await ros.fill('19:30');
  await settled(page);
  expect((await saved(page)).startTime).toBe('19:30');

  // Date & time shows what the run of show wrote, and edits the same field.
  const dt = await openDateAndTime(page);
  await expect(dt).toHaveValue('19:30');
  await dt.fill('17:00');
  await settled(page);
  expect(await saved(page)).toMatchObject({ startTime: '17:00', startTimeSource: 'host' });
  await page.keyboard.press('Escape');
  await settled(page);

  // And the run of show reads it back.
  await expect(await openRunOfShow(page)).toHaveValue('17:00');
});
