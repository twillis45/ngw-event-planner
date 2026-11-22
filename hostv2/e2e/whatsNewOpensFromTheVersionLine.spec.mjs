// ─── WHAT'S NEW OPENS FROM THE VERSION LINE (owner, 11/22/2026) ──────────────
// The quiet "Version …" line at the foot of You & settings is a button: it
// opens a short, plain list of recent changes in place (src/whatsNew.json),
// with no new tab or sheet, and closes again. It must be a real 44px target.
// The list's content and its guard are pinned in test/whatsNewIsCurrent.test.mjs.
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

test('the version line opens What’s new in place, and closes it', async ({ page }) => {
  await boot(page);
  await openSettings(page);
  const toggle = page.locator('[data-whats-new]');
  await toggle.scrollIntoViewIfNeeded();
  await expect(toggle).toHaveText(/^Version dev · What’s new$/); // an e2e build has no release stamp
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-whats-new-list]')).toHaveCount(0);
  const box = await toggle.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const list = page.locator('[data-whats-new-list]');
  await expect(list).toBeVisible();
  await expect(list).toContainText('Every price says where it comes from');
  await expect(list).toContainText('Nov 22, 2026');
  await expect(page.locator('#sheet-title')).toHaveText('You & settings'); // same sheet, no new surface
  await toggle.click();
  await expect(list).toHaveCount(0);
});
