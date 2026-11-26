// ─── SNOW AND ICE HEADS-UP ──────────────────────────────────────────────────
// Owner, 11/18/2026: "Yes add the snow and ice heads-up." An indoor event had
// no weather alert at all (the pill was outdoor-only, built around a rain
// plan). Now snow, sleet / freezing rain or thunderstorms at 30%+ on the
// event day raise a guest-travel heads-up in the same weather pill, with a
// drafted note to guests and no rain-plan prompt. Rain alone does not.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const ISO = dateIn(3);
const EV = { id: 'cust-snow', name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: ISO, startTime: '16:00', startTimeSource: 'host',
  createdAt: new Date(Date.now() - 20 * 864e5).toISOString(), venue: 'Vida’s place', venueCity: 'Oxon Hill', venueState: 'MD', indoorOutdoor: 'indoor',
  guestMode: 'count', guestCount: 15, guests: [], vendors: [], budget: [], timeline: [] };

const boot = async (page, sky) => {
  const noon = new Date(ISO + 'T12:00:00');
  await page.route('**/api/weather/geocode**', (r) => r.fulfill({ json: { result: { lat: 38.8, lon: -76.98 } } }));
  await page.route('**/api/weather/onecall**', (r) => r.fulfill({ json: { timezone_offset: -noon.getTimezoneOffset() * 60, hourly: [],
    daily: [{ dt: Math.floor(noon.getTime() / 1000), ...sky }] } }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
};

const SNOW = { pop: 0.6, weather: [{ main: 'Snow', description: 'snow', icon: '13d' }], temp: { min: 25, max: 33 } };

test('indoor snow: a guest-travel heads-up with a drafted note, no rain plan', async ({ page }) => {
  await boot(page, SNOW);
  const pill = page.locator('[data-wx-travel="snow"]');
  await expect(pill).toBeVisible();
  await expect(pill).toContainText(/Snow forecast for \w+ \(your event day\), 60% chance — guests may need extra time to get there/);
  await expect(pill.locator('[data-wx-glyph="snow"]')).toHaveCount(1);
  await pill.locator('.wxpill-head').click();
  await expect(pill.getByRole('button', { name: /rain backup|Review the backup/i })).toHaveCount(0);
  await pill.locator('[data-wx-travel-note]').click();
  await expect(page.locator('.sheet').last()).toContainText('the forecast shows snow. Leave a little extra time to get here and take it slow on the roads.');
});

test('indoor ice reads as ice', async ({ page }) => {
  await boot(page, { ...SNOW, weather: [{ main: 'Rain', description: 'freezing rain', icon: '13d' }] });
  await expect(page.locator('[data-wx-travel="ice"]')).toContainText(/Sleet or freezing rain forecast/);
});

// Owner, 11/26/2026: "Yes build the weather line and rain actions". Rain at
// 30%+ now raises the arrivals heads-up too (wet coats, extra time, a note);
// still no rain-plan prompt indoors. Light rain under 30% stays quiet.
test('indoor rain: an arrivals heads-up with a drafted note, no rain plan', async ({ page }) => {
  await boot(page, { pop: 0.8, weather: [{ main: 'Rain', description: 'moderate rain', icon: '10d' }], temp: { min: 48, max: 57 } });
  const pill = page.locator('[data-wx-travel="rain"]');
  await expect(pill).toContainText(/Rain forecast for \w+ \(your event day\), 80% chance — guests may need extra time to get there/);
  await pill.locator('.wxpill-head').click();
  await expect(pill.getByRole('button', { name: /rain backup|Review the backup/i })).toHaveCount(0);
  await pill.locator('[data-wx-travel-note]').click();
  await expect(page.locator('.sheet').last()).toContainText('the forecast shows rain. Leave a little extra time to get here, and bring an umbrella.');
});

test('indoor light rain under 30% raises no heads-up', async ({ page }) => {
  await boot(page, { pop: 0.2, weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }], temp: { min: 41, max: 44 } });
  await page.waitForTimeout(1500);
  await expect(page.locator('.wxpill')).toHaveCount(0);
});
