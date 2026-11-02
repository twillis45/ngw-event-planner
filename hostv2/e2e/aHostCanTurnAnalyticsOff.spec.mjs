// The visible analytics opt-out (owner ruling 2026-11-02, option A). Until then
// the only way out was ?noanalytics=1 in the address bar. The Settings row must
// write the key src/lib/analytics.js honors, say plainly what is (not) sent,
// survive a reload, and turn back on. Red-proofed against the shell without
// the row (nothing to press).
import { test, expect } from './fixtures.mjs';

const KEY = 'ngw-analytics-optout';

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

const openSettings = async (page) => {
  const header = page.locator('[aria-label="You and settings"]').first();
  if (await header.count() && await header.isVisible()) await header.click();
  else {
    await page.locator('[aria-label="Menu"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('.navrow', { hasText: 'You & settings' }).first().click();
  }
  await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
};

const row = (page) => page.locator('.later-row', { hasText: 'Help improve the app' }).first();

test('a host can turn analytics off from Settings, and it stays off', async ({ page }) => {
  await boot(page);
  await openSettings(page);
  await expect(row(page)).toContainText('never your guests');
  await row(page).getByRole('button', { name: /On — tap to turn off/ }).click();
  await expect(row(page)).toContainText('Nothing about how you use the app is sent');
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('1');

  await page.reload();
  await openSettings(page);
  await expect(row(page).getByRole('button', { name: /Off — tap to turn on/ }), 'the choice did not survive a reload').toBeVisible();

  await row(page).getByRole('button', { name: /Off — tap to turn on/ }).click();
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe(null);
});
