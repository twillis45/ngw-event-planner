// ─── FINISHED CHECKS FOLD AWAY ──────────────────────────────────────────────
// Owner, 11/26/2026, Thanksgiving morning on a phone: "Collapse or remove
// checks as they finish" and "Allow collapsing of section". "Before guests
// arrive" kept every checked row at full height with its whole paragraph, so
// two done items pushed the open ones off the screen. Now: open rows show;
// checked rows fold into one "N done" row (tap to see or reopen them); and the
// whole list can be hidden under its count, remembered on this device.
import { test, expect, settled, goToStage } from './fixtures.mjs';

const DAY = '2026-11-26';
const boot = async (page) => {
  await page.clock.setFixedTime(new Date(DAY + 'T07:30:00'));
  await page.addInitScript((date) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'fold-probe');
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: 'fold-probe', type: 'Thanksgiving', name: 'Fold probe', date,
        startTime: '15:00', startTimeSource: 'host', guestCount: 7,
        guests: [], vendors: [], budget: [], timeline: [],
      }]));
    }
  }, DAY);
  await page.goto('?elegant=1');
  await settled(page);
  await goToStage(page, 'The Day');
  await settled(page);
  return page.locator('.dayof-card');
};
const plain = '.frow:not([data-dayof-item="weather"])';

test('a finished check leaves the list and folds into "done"; it can be reopened', async ({ page }) => {
  const card = await boot(page);
  const rows = card.locator('.frow');
  const before = await rows.count();
  await card.locator(plain).first().click();
  await settled(page);
  await card.locator(plain).first().click();
  await settled(page);
  await expect(rows).toHaveCount(before - 2);
  await expect(card.locator('.frow.got')).toHaveCount(0);
  const fold = card.locator('[data-dayof-done]');
  await expect(fold).toHaveText(/2 done/);
  await fold.click();
  await expect(card.locator('.frow.got')).toHaveCount(2);
  // Reopening one puts it back on the list.
  await card.locator('.frow.got').first().click();
  await settled(page);
  await expect(fold).toHaveText(/1 done/);
  await fold.click();
  await expect(card.locator('.frow.got')).toHaveCount(0);
});

test('the whole list hides under its count, and stays hidden after a reload', async ({ page }) => {
  const card = await boot(page);
  await expect(card.locator('.frow').first()).toBeVisible();
  const toggle = card.locator('[data-dayof-fold]');
  await expect(toggle).toHaveText('Hide the list');
  await toggle.click();
  await expect(card.locator('.frow')).toHaveCount(0);
  await expect(card).toContainText('Before guests arrive');
  await expect(card).toContainText(/0 of \d+/);
  await page.reload();
  await settled(page);
  await goToStage(page, 'The Day');
  await settled(page);
  await expect(page.locator('.dayof-card .frow')).toHaveCount(0);
  await page.locator('.dayof-card [data-dayof-fold]').click();
  await expect(page.locator('.dayof-card .frow').first()).toBeVisible();
});
