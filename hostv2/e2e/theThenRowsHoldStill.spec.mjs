// ─── THE "THEN, IN ORDER" ROWS HOLD STILL UNLESS THEY REORDER (11/24/2026) ───
//
// theCalendarShowsTheHourAndTheSky:70 failed under load (3 of 40 with busy
// workers): its tap on "Set the start time" focused the row and opened nothing.
// The trace and a probe showed why. Right after the board settled, content
// above the list grew (the hero's lines, the weather landing), the whole list
// moved down, and lib/flipReorder read that as every row travelling: four
// 260ms transform transitions on rows whose order had not changed. A tap in
// that window is mousedown on the row and mouseup beside it, so no click.
// A host's tap can miss the same way.
//
// Positions are now read within the list, so a list that moves as a whole
// animates nothing, and a real reorder still travels (flipReorder.test.js).
// This pins it on the real board, with the weather answering late so the hero
// changes after the rows are on screen.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const ISO = dateIn(3);
const EV = {
  id: 'rows-hold-still', name: 'Jordan’s Friendsgiving', type: 'Friendsgiving', date: ISO,
  createdAt: new Date(Date.now() - 20 * 864e5).toISOString(),
  venue: 'Elm Court Hall', venueCity: 'Springfield', venueState: 'VA', indoorOutdoor: 'indoor',
  guestMode: 'count', guestCount: 15, guests: [], vendors: [], budget: [], timeline: [],
};

test('no Then row travels when nothing reordered', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const noon = new Date(ISO + 'T12:00:00');
  await page.route('**/api/weather/geocode**', (r) => r.fulfill({ json: { result: { lat: 38.78, lon: -77.18 } } }));
  await page.route('**/api/weather/onecall**', async (r) => {
    await new Promise((res) => setTimeout(res, 1200));   // lands after the rows are on screen
    return r.fulfill({ json: { timezone_offset: -noon.getTimezoneOffset() * 60, hourly: [],
      daily: [{ dt: Math.floor(noon.getTime() / 1000), pop: 0.1, weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }], temp: { min: 41, max: 55 } }] } });
  });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  const rows = page.locator('.then-fold .ef-row');
  await expect(rows.first()).toBeVisible();
  const order0 = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-flip')));

  // Watch for 2.5s, through the hero settling and the late weather.
  const travelled = await page.evaluate(() => new Promise((done) => {
    const seen = new Set();
    const t0 = performance.now();
    const tick = () => {
      for (const a of document.getAnimations()) {
        const el = a.effect && a.effect.target;
        if (el && el.classList && el.classList.contains('ef-row') && a.playState === 'running') seen.add(el.getAttribute('data-flip'));
      }
      if (performance.now() - t0 < 2500) requestAnimationFrame(tick); else done([...seen]);
    };
    requestAnimationFrame(tick);
  }));
  const order1 = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-flip')));
  // (premise) the order really did not change, so no row had anywhere to go.
  expect(order1).toEqual(order0);
  expect(travelled).toEqual([]);
});
