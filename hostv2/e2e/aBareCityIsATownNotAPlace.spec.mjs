// ─── A BARE CITY IS A TOWN, NOT A PLACE (cohesion G4, owner 11/24/2026) ──────
//
// Measured on a made-up plan with no venue: typing "Springfield, VA" in the
// Venue box and pressing Save stored `venue: "Springfield, VA"` with no
// venueCity/venueState, so the invite, family and vendor pages printed a city
// as the place to go, and "City noted" never happened. Now a typed venue that
// is only a town (or a ZIP) is saved as the town, the place's name stays empty,
// and the toast says "Springfield, VA noted. Add the place's name when you have
// it." A real place name is still saved as the place (the control).
import { test, expect } from '@playwright/test';
import { settled, openSectionByName, sheetSettled } from './fixtures.mjs';

const OWN = { id: 'g-bare-city', name: 'Rosa’s 40th', type: 'Birthday', date: '2027-04-17', guests: [], vendors: [], budget: [], timeline: [] };
const boot = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, OWN);
  await page.goto('./?elegant=1&noanalytics=1');
  await settled(page);
  await openSectionByName(page, 'Venue');
  await sheetSettled(page);
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
const save = async (page, text) => {
  const sheet = page.locator('.sheet').last();
  await sheet.getByLabel('The place’s name or street address').fill(text);
  await sheet.getByRole('button', { name: 'Save', exact: true }).first().click();
};

test('"Springfield, VA" typed as the venue is saved as the town, and the name is left to ask', async ({ page }) => {
  await boot(page);
  await save(page, 'Springfield, VA');
  await expect(page.locator('.toast')).toContainText('Springfield, VA noted. Add the place’s name when you have it.');
  await expect.poll(async () => { const e = await stored(page); return [e.venueCity, e.venueState, String(e.venue || '')]; }).toEqual(['Springfield', 'VA', '']);
});

test('a ZIP alone is the town too', async ({ page }) => {
  await boot(page);
  await save(page, '22150');
  await expect(page.locator('.toast')).toContainText('22150 noted.');
  await expect.poll(async () => { const e = await stored(page); return [e.venueZip, String(e.venue || '')]; }).toEqual(['22150', '']);
});

test('a place name is still the place (control)', async ({ page }) => {
  await boot(page);
  await save(page, 'Elm Court Hall');
  await expect.poll(async () => (await stored(page)).venue).toBe('Elm Court Hall');
});
