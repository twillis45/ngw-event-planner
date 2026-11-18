// ─── THE CALENDAR SHOWS THE HOUR AND THE SKY ────────────────────────────────
// Owner, 11/18/2026: "Calendar should show on day and time of event. And
// weather should be wherever else in the app it's preferred and/or needed."
// The event day sat on its date with no hour, and an indoor event (a
// Friendsgiving at a friend's house) had no forecast anywhere in the app — the
// fetch ran for outdoor events only. Now: the event day shows its start time,
// and every event in the 14-day window gets the day's forecast as plain facts
// in the Calendar and in Date & time. The outdoor alerts (the weather pill,
// the rain plan) stay outdoor-only.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const ISO = dateIn(3);
const EV = (extra) => ({
  id: 'cust-cal-wx', name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: ISO,
  createdAt: new Date(Date.now() - 20 * 864e5).toISOString(),
  venue: 'Vida’s place', venueCity: 'Oxon Hill', venueState: 'MD', indoorOutdoor: 'indoor',
  guestMode: 'count', guestCount: 15, guests: [], vendors: [], budget: [], timeline: [], ...extra,
});

const boot = async (page, ev) => {
  const calls = [];
  const noon = new Date(ISO + 'T12:00:00');
  await page.route('**/api/weather/geocode**', (r) => { calls.push('geocode'); return r.fulfill({ json: { result: { lat: 38.8, lon: -76.98 } } }); });
  await page.route('**/api/weather/onecall**', (r) => { calls.push('onecall'); return r.fulfill({ json: {
    timezone_offset: -noon.getTimezoneOffset() * 60, hourly: [],
    daily: [{ dt: Math.floor(noon.getTime() / 1000), pop: 0.1, weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }], temp: { min: 41.2, max: 55.4 } }],
  } }); });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
  return calls;
};

const eventDayInCalendar = async (page) => {
  await openSectionByName(page, 'Calendar');
  const cal = page.locator('[data-calendar]');
  await expect(cal).toBeVisible();
  await cal.getByRole('button', { name: 'Month', exact: true }).click();
  if (!(await cal.locator(`[data-cal-month] [data-date="${ISO}"]`).count())) await cal.getByRole('button', { name: 'Next month' }).click();
  await cal.locator(`[data-cal-month] [data-date="${ISO}"]`).click();
  return cal.locator('[data-cal-picked] .cal-item.cal-event');
};

test('the event day shows the hour the host set, and an indoor event gets the forecast', async ({ page }) => {
  const calls = await boot(page, EV({ startTime: '16:00', startTimeSource: 'host' }));
  const day = await eventDayInCalendar(page);
  await expect(day.locator('[data-cal-time]')).toHaveText('4:00 PM');
  await expect(day.locator('[data-cal-wx]')).toHaveText('Scattered clouds · 41°–55°F · 10% chance of rain or snow');
  expect(calls).toEqual(expect.arrayContaining(['geocode', 'onecall']));
  // Indoor: the outdoor alert stays off.
  await expect(page.locator('.wxpill')).toHaveCount(0);
});

test('a time the app suggested says so', async ({ page }) => {
  await boot(page, EV({ startTime: '15:00', startTimeSource: 'derived' }));
  const day = await eventDayInCalendar(page);
  await expect(day.locator('[data-cal-time]')).toHaveText('3:00 PM · suggested');
});

test('Date & time shows the forecast for the day', async ({ page }) => {
  await boot(page, EV({}));
  // The door coreJourneyTruth uses: the start-time row of the plan opens Date & time.
  const row = page.locator('.then-fold .ef-row').filter({ hasText: /start time/i }).first();
  await row.click();
  if (await page.locator('.srail-row').count()) await page.locator('.cpane-cta').click();
  const sheet = page.getByRole('dialog', { name: 'Date & time' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-day-forecast]')).toContainText('Scattered clouds · 41°–55°F · 10% chance of rain or snow');
});
