// ─── THE HEADER WEARS T2 (owner, 11/27/2026: "T2 applied version is fine") ────
//
// The approved render's header on the phone:
//   Thanksgiving at the Lanes ▾          28px · 700 · tracking −0.02em
//   Thursday, December 17 · 21 days      15px, muted, sentence case, UNDER the name
// It supersedes the 11/23/2026 phone header (date line in capitals above the
// name). Everything the date line carries still rides on it: the "Sample" tag
// and the weather. The desktop header is not part of this decision and stays
// as it was; the last test pins that. Made-up names only.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 't2-head', name: 'Thanksgiving at the Lanes', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(21), startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'count', guestCount: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [],
};

const open = async (page, w, h) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  await expect(page.locator('[data-tt-head]')).toBeVisible();
};

const longDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

test('the phone header: the name, then the date in plain words under it — 390x844', async ({ page }) => {
  await open(page, 390, 844);
  const name = page.locator('[data-tt-title] .tt-name');
  await expect(name).toHaveText('Thanksgiving at the Lanes');
  const n = await name.evaluate((el) => { const cs = getComputedStyle(el); return { fs: cs.fontSize, fw: cs.fontWeight, ls: cs.letterSpacing }; });
  expect(parseFloat(n.fs)).toBe(28);
  expect(n.fw).toBe('700');
  expect(parseFloat(n.ls)).toBeCloseTo(-0.56, 2);   // the −0.02em floor

  const line = page.locator('[data-tt-head] .tt-r1');
  // Sentence case as the host reads it, not capitals.
  const days = await page.locator('[data-tt-urgency]').innerText();
  expect(days).toMatch(/^\d+ days$/);
  await expect(line).toHaveText(`${longDate(EVENT.date)} · ${days}`, { useInnerText: true });
  const l = await line.evaluate((el) => { const cs = getComputedStyle(el); return { fs: cs.fontSize, tt: cs.textTransform, ls: cs.letterSpacing }; });
  expect(parseFloat(l.fs)).toBe(15);
  expect(l.tt).toBe('none');
  expect(parseFloat(l.ls) || 0).toBe(0);

  // Under the name, and the question under both.
  const r = await page.evaluate(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    return { t: b('[data-tt-title]'), d: b('[data-tt-head] .tt-r1'), q: b('h2.ask') };
  });
  expect(r.d.top).toBeGreaterThanOrEqual(r.t.bottom - 1);
  expect(r.d.top - r.t.bottom, 'the date sits close under the name').toBeLessThanOrEqual(8);
  expect(r.q.top).toBeGreaterThan(r.d.bottom);
});

test('the desktop header is not part of this decision — 1440x900', async ({ page }) => {
  await open(page, 1440, 900);
  const line = page.locator('[data-tt-head] .tt-r1');
  await expect(line).toContainText(/\d+ DAYS/, { useInnerText: true });
  const r = await page.evaluate(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    return { t: b('[data-tt-title]'), d: b('[data-tt-head] .tt-r1') };
  });
  expect(r.d.bottom).toBeLessThanOrEqual(r.t.top + 1);
});

// ─── ON A REAL PHONE (live check of ea22a08c, 11/27/2026) ─────────────────────
// With touch, "✎ Rename" rode in the title row and wrapped under the name,
// pushing the date line 58px down: T2's "date close under the name" held only
// without touch, which is what the first test measured. And a rain forecast on
// the date line ran 656px wide, off a 390px screen, cut mid-word ("…100% chanc")
// with no ellipsis.
const touchPhone = async (browser, ev) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const noon = new Date(ev.date + 'T12:00:00');
  await page.route('**/api/weather/geocode**', (r) => r.fulfill({ json: { result: { lat: 47.6, lon: -122.3 } } }));
  await page.route('**/api/weather/onecall**', (r) => r.fulfill({ json: { timezone_offset: -noon.getTimezoneOffset() * 60, hourly: [],
    daily: [{ dt: Math.floor(noon.getTime() / 1000), pop: 1, weather: [{ main: 'Rain', description: 'rain', icon: '10d' }], temp: { min: 41, max: 48 } }] } }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
  await expect(page.locator('[data-tt-head]')).toBeVisible();
  return { ctx, page };
};

test('a touch phone keeps the date close under the name; Rename moves below the date line', async ({ browser }) => {
  const { ctx, page } = await touchPhone(browser, { ...EVENT, id: 't2-touch' });
  const rename = page.locator('[data-tt-head] [data-rename-btn]');
  await expect(rename, 'premise: a touch screen shows ✎ Rename').toBeVisible();
  const r = await page.evaluate(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    return { t: b('[data-tt-title]'), d: b('[data-tt-head] .tt-r1'), n: b('[data-tt-head] [data-rename-btn]') };
  });
  expect(r.d.top - r.t.bottom, 'the date sits close under the name').toBeLessThanOrEqual(8);
  expect(r.d.top).toBeGreaterThanOrEqual(r.t.bottom - 1);
  expect(r.n.top, 'Rename comes after the date line').toBeGreaterThanOrEqual(r.d.bottom - 1);
  expect(r.n.height).toBeGreaterThanOrEqual(44);
  await ctx.close();
});

test('a long forecast on the phone’s date line stays on the screen, with an ellipsis', async ({ browser }) => {
  const { ctx, page } = await touchPhone(browser, { ...EVENT, id: 't2-wx', date: dateIn(3), venueCity: 'Seattle, WA' });
  const wx = page.locator('[data-tt-head] .wxpill');
  await expect(wx, 'premise: the forecast is on the date line').toBeVisible();
  await expect(wx).toContainText(/Rain forecast/);
  const m = await page.evaluate(() => {
    const p = document.querySelector('[data-tt-head] .wxpill').getBoundingClientRect();
    const l = document.querySelector('[data-tt-head] .wx-line');
    return { right: p.right, vw: innerWidth, clipped: l.scrollWidth > l.clientWidth, to: getComputedStyle(l).textOverflow, page: document.documentElement.scrollWidth };
  });
  expect(m.right, 'the pill ends on the screen').toBeLessThanOrEqual(m.vw);
  expect(m.page).toBeLessThanOrEqual(m.vw);
  // When it is cut, it says so: an ellipsis, and the tap opens the whole line.
  if (m.clipped) expect(m.to).toBe('ellipsis');
  await ctx.close();
});
