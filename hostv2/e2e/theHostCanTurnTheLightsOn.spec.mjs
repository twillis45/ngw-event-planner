// A MECHANISM IS NOT A FEATURE.
//
// Light mode shipped 2026-09-28 and the only way to reach it was to type
// ?theme=light into the address bar. No control existed anywhere in the app,
// which the host found by asking where the switch was.
//
// The row lives in You & settings, beside Sound. NOT under "Make it yours" —
// that surface is the meaning of the EVENT, and a display setting is not part
// of a host's story about their day.
//
// The case worth writing this file for is the LAST one. currentTheme() reads
// the query string before the stored key, which is right for a shared link
// and wrong the instant there is a control: the only way a host can be in
// light today is with ?theme=light still in the address bar, so their very
// first tap happens under a parameter that outranks it. Without the URL being
// cleared the toggle appears to work and silently undoes itself on reload —
// the kind of defect that reads as "the app forgot my setting".
import { test, expect, settled } from './fixtures.mjs';

const lum = (c) => {
  const m = c.match(/[\d.]+/g).map(Number);
  const f = m.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const pageLum = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor).then(lum);

const seed = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-toggle', name: '50th at Disneyland', type: 'Birthday',
      date: '2027-11-06', endDate: '2027-11-11', isDestination: true,
      venueCity: 'Anaheim', state: 'CA', guestMode: 'count', guestCount: 16,
      totalBudget: 12000, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-toggle');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
};

// Two real routes, not a fallback hack: the wide layout puts an account
// control in the header, and the phone reaches the same sheet through Menu ->
// You & settings. Measured, not assumed — `.wm-you` is in the DOM at 390 but
// renders to nothing there, so a test that only knew the header selector
// would resolve an element and then time out clicking it.
const openSettings = async (page) => {
  const header = page.locator('[aria-label="You and settings"]').first();
  if (await header.count() && await header.isVisible()) {
    await header.click();
  } else {
    await page.locator('[aria-label="Menu"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('.navrow', { hasText: 'You & settings' }).first().click();
  }
  await page.waitForTimeout(800);
};

const row = (page) => page.locator('.later-row', { hasText: 'Light mode' }).first();

test('the switch is in You & settings, and it is a real control', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  await openSettings(page);

  const btn = row(page).locator('button');
  await expect(btn).toHaveCount(1);
  // It says which way it will go, not just where it stands.
  await expect(btn).toHaveText(/Off — tap for light/);
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  expect(await pageLum(page)).toBeLessThan(0.2);
});

test('tapping it paints the page, and tapping it back undoes that', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  await openSettings(page);

  await row(page).locator('button').click();
  await page.waitForTimeout(400);
  expect(await pageLum(page)).toBeGreaterThan(0.7);
  await expect(row(page).locator('button')).toHaveText(/On — tap for dark/);
  await expect(row(page).locator('button')).toHaveAttribute('aria-pressed', 'true');

  await row(page).locator('button').click();
  await page.waitForTimeout(400);
  expect(await pageLum(page)).toBeLessThan(0.2);
});

test('the choice survives a reload', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  await openSettings(page);
  await row(page).locator('button').click();
  await page.waitForTimeout(400);

  await page.reload();
  await page.waitForTimeout(1500);
  expect(await pageLum(page)).toBeGreaterThan(0.7);
});

test('turning it OFF from a ?theme=light link stays off after a reload', async ({ page }) => {
  // The one that fails without clearing the query string: the host arrives by
  // the only route that exists today, taps the control, and the parameter
  // they arrived on outranks the choice they just made.
  await seed(page);
  await page.goto('?elegant=1&theme=light');
  await settled(page);
  expect(await pageLum(page)).toBeGreaterThan(0.7);

  await openSettings(page);
  await row(page).locator('button').click();
  await page.waitForTimeout(400);
  expect(await pageLum(page)).toBeLessThan(0.2);

  // The parameter is gone from the bar, so nothing can hand the old answer back.
  expect(page.url()).not.toMatch(/theme=/);
  await page.reload();
  await page.waitForTimeout(1500);
  expect(await pageLum(page), 'a stale ?theme= in the URL took the choice back').toBeLessThan(0.2);
});
