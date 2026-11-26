// ─── ONE RAIN PLAN ON THE DAY ────────────────────────────────────────────────
// Single-source audit, 11/18/2026: the day-of "Rain / heat plan" row was its
// own tick (event.safetyChecked.weather) while the rain section and readiness
// read event.rainPlan. A saved plan now confirms the row, and with none saved
// the row opens the rain editor instead of storing a second answer.
import { test, expect, settled, dateIn, goToStage } from './fixtures.mjs';

const boot = async (page, extra) => {
  await page.addInitScript(([e]) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    if (!localStorage.getItem('ngw-hostv2-custom-events')) localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
  }, [{ id: 'rain-day', type: 'Cookout', name: 'Cookout', date: dateIn(10), guestCount: 30, guests: [], vendors: [], budget: [], timeline: [], ...extra }]);
  await page.goto('?elegant=1');
  await settled(page);
  await goToStage(page, 'The Day');
  await settled(page);
  return page.locator('.dayof-card [data-dayof-item="weather"]');
};

test('a saved rain plan confirms the day-of rain row', async ({ page }) => {
  const row = await boot(page, { rainPlan: 'Into the garage' });
  await page.locator('.dayof-card [data-dayof-done]').click();
  await expect(row).toHaveClass(/\bgot\b/);
});

test('with no plan, the rain row opens the rain editor instead of ticking', async ({ page }) => {
  const row = await boot(page, {});
  await expect(row).not.toHaveClass(/\bgot\b/);
  await row.click();
  await expect(page.locator('#sheet-title')).toHaveText(/If it rains/i);
  const ticked = await page.evaluate(() => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].safetyChecked || {}).weather);
  expect(ticked).toBeFalsy();
});
