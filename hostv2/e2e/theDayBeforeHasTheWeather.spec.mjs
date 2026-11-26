// ─── THE DAY BEFORE HAS THE WEATHER ─────────────────────────────────────────
// Owner, 11/26/2026: "Yes add the day-before weather heads-up". The arrivals
// heads-up showed on Plan's pill and on The Day itself, which is too late to
// clear a spot by the door or warn guests. The day-before plan now carries
// tomorrow's forecast: the line, the arrival check (the same tick The Day
// reads), and the note to guests. Live forecast mocked; no request leaves.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const ISO = dateIn(1);
const EV = { id: 'db-wx', name: 'Rainy Thanksgiving', type: 'Thanksgiving', date: ISO, startTime: '15:00', startTimeSource: 'host',
  createdAt: new Date(Date.now() - 20 * 864e5).toISOString(), venue: 'Home', venueCity: 'Washington', venueState: 'DC', indoorOutdoor: 'indoor',
  guestMode: 'count', guestCount: 12, guests: [], vendors: [], budget: [], timeline: [] };

const boot = async (page, sky, mode) => {
  const noon = new Date(ISO + 'T12:00:00');
  if (!sky) await page.route('**/api/weather/**', (r) => r.fulfill({ status: 503, body: '' }));
  else await page.route('**/api/weather/geocode**', (r) => r.fulfill({ json: { result: { lat: 38.9, lon: -77.03 } } }));
  if (sky) await page.route('**/api/weather/onecall**', (r) => r.fulfill({ json: { timezone_offset: -noon.getTimezoneOffset() * 60, hourly: [],
    daily: [{ dt: Math.floor(noon.getTime() / 1000), ...sky }] } }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=' + mode);
  await settled(page);
};

const RAIN = { pop: 1, weather: [{ main: 'Rain', description: 'moderate rain', icon: '10d' }], temp: { min: 48, max: 54 } };

for (const mode of ['1', '0']) {
  test(`elegant=${mode}: rain tomorrow rides in the day-before plan, tick and note included`, async ({ page }) => {
    await boot(page, RAIN, mode);
    const card = page.locator('.day-node [data-day-weather="rain"]');
    await expect(card).toBeVisible();
    await expect(card.locator('[data-day-weather-title]')).toHaveText('Tomorrow’s weather');
    await expect(card).toContainText('Moderate rain · 48°–54°F · 100% chance of rain or snow');
    const check = card.locator('[data-wx-check="wx-coats"]');
    await check.click();
    await expect(check).toHaveClass(/got/);
    await card.locator('[data-wx-day-note]').click();
    await expect(page.locator('.sheet').last()).toContainText('Leave a little extra time to get here, and bring an umbrella.');
  });
}

test('no forecast: the day-before plan has no weather card', async ({ page }) => {
  await boot(page, null, '0');
  await expect(page.locator('.day-node')).toBeVisible();
  await expect(page.locator('.day-node [data-day-weather]')).toHaveCount(0);
});
