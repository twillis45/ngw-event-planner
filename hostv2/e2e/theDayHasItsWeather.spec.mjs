// ─── THE DAY HAS ITS WEATHER ────────────────────────────────────────────────
// Owner, 11/26/2026, Thanksgiving morning: "How is the Thanksgiving event
// dealing with today's weather". Measured on live: moderate rain at 100% in
// Washington, DC, and an indoor plan showed nothing on The Day (the only
// weather was a Plan-tab pill, and indoor rain raised none). Then: "Yes build
// the weather line and rain actions". The Day now shows the forecast line, and
// for rain a spot for wet coats (a check) and a drafted note to guests.
import { test, expect, settled, goToStage } from './fixtures.mjs';

const DAY = '2026-11-26';
const EV = { id: 'cust-day-wx', name: 'Thanksgiving', type: 'Thanksgiving', date: DAY, startTime: '15:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueCity: 'Washington', venueState: 'DC', guestEstimate: 12, guests: [], vendors: [], budget: [], timeline: [] };

const boot = async (page, sky) => {
  await page.clock.setFixedTime(new Date(DAY + 'T10:40:00'));
  const noon = new Date(DAY + 'T12:00:00');
  await page.route('**/api/weather/geocode**', (r) => r.fulfill({ json: { result: { lat: 38.9, lon: -77.04 } } }));
  await page.route('**/api/weather/onecall**', (r) => r.fulfill({ json: { timezone_offset: -noon.getTimezoneOffset() * 60, hourly: [],
    daily: [{ dt: Math.floor(noon.getTime() / 1000), ...sky }] } }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await goToStage(page, 'The Day');
  await settled(page);
};

test('rain on the day: the line, the wet-coats check, and a note to guests', async ({ page }) => {
  await boot(page, { pop: 1, weather: [{ main: 'Rain', description: 'moderate rain', icon: '10d' }], temp: { min: 48, max: 54 } });
  const card = page.locator('[data-day-weather="rain"]');
  await expect(card).toContainText('Moderate rain · 48°–54°F · 100% chance of rain or snow');
  await card.locator('[data-wx-check="wx-coats"]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].safetyChecked)).toEqual({ 'wx-coats': true });
  await card.locator('[data-wx-day-note]').click();
  await expect(page.locator('.sheet').last()).toContainText('the forecast shows rain. Leave a little extra time to get here, and bring an umbrella.');
});

test('a clear day: the line alone', async ({ page }) => {
  await boot(page, { pop: 0, weather: [{ main: 'Clouds', description: 'few clouds', icon: '02d' }], temp: { min: 34, max: 62 } });
  const card = page.locator('[data-day-weather="clear"]');
  await expect(card).toContainText('Few clouds · 34°–62°F');
  await expect(card.locator('[data-wx-check]')).toHaveCount(0);
});
