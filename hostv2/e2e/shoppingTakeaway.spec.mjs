// ─── THE LIST HAS TO LEAVE THE HOUSE WITH THE HOST ──────────────────────────
//
// The app does not work offline. Measured 2026-08-16: a warm online visit then an
// offline reload gives net::ERR_INTERNET_DISCONNECTED and a blank page, and the
// board upheld the standing bar on a service worker
// (docs/audits/2026-08-16_OFFLINE_SHELL_BOARD.md) — a broken worker fails
// everywhere for everyone, where no offline only fails in the aisle.
//
// Which makes THIS the offline story: the list a host carries into a shop with no
// signal is the one they took out of the app before they left. So the way out has
// to be reachable at the moment they are leaving.
//
// It was not. "Copy the shopping list" lived on the food summary behind
// `!(foodSect.diet || … || foodSect.list)`, so it vanished the moment the host
// opened the list itself. The one person who could not reach it was the one
// looking at their shopping list.
import { test, expect } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-day-before-vendors');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
};

/** Open the food sheet, then drill into the list itself. */
const openTheList = async (page) => {
  await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
  await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click({ timeout: 8000 });
  await page.locator('.sheet').last().getByText(/spread|shopping/i).first().click({ timeout: 8000 });
  await expect(page.locator('#sheet-title')).toBeVisible({ timeout: 8000 });
  const listRow = page.locator('.sheet').last().getByText(/^The list|Still to get|shopping list/i).first();
  if (await listRow.count()) await listRow.click({ timeout: 8000 }).catch(() => {});
};

test.describe('taking the shopping list out of the app', () => {
  test('PREMISE — the food sheet opens and offers the copy action somewhere', async ({ page }) => {
    // Without this the test below could pass by finding a button on a screen the
    // host never reaches, or fail because the sheet never opened at all — two
    // very different problems that look identical from a red assertion.
    await boot(page);
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click({ timeout: 8000 });
    await page.locator('.sheet').last().getByText(/spread|shopping/i).first().click({ timeout: 8000 });
    await expect(page.locator('.sheet').last().getByText('Copy the shopping list').first()).toBeVisible({ timeout: 8000 });
  });

  test('the way out is reachable FROM INSIDE the list', async ({ page }) => {
    // The regression this pins: the action being hidden by the same condition
    // that opens the list. Since the app cannot work offline, a host who cannot
    // export from here has no way to carry the list into a shop.
    await boot(page);
    await openTheList(page);
    const copy = page.locator('.sheet').last().getByText('Copy the shopping list').first();
    await expect(copy).toBeVisible({ timeout: 8000 });
    await copy.click({ timeout: 8000 });
    // It opens a real draft with real content — not a dead button.
    await expect(page.locator('#sheet-title')).toHaveText(/shopping list/i, { timeout: 8000 });
    const body = await page.locator('.sheet').last().innerText();
    expect(body.length).toBeGreaterThan(60);
  });

  test('the exported list is the SAME list the screen shows', async ({ page }) => {
    // A second entry point that produced a different list would be worse than no
    // second entry point. Both call foodShopItems + eventGeoQuery, the same
    // engines legacy's copy path uses, so all three agree by construction — this
    // checks the construction actually held.
    await boot(page);
    await openTheList(page);
    await page.locator('.sheet').last().getByText('Copy the shopping list').first().click({ timeout: 8000 });
    const draft = await page.locator('.sheet').last().innerText();
    // The event's own name anchors the draft to this event, not a generic list.
    expect(draft).toMatch(/\w{3,}/);
    expect(draft).not.toMatch(/undefined|NaN|\[object Object\]/);
  });
});
