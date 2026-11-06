import { test, expect, settled, dateIn } from './fixtures.mjs';

const EVENT = { id: 'cust-restore-counts', name: 'Current saved event', type: 'Cookout', date: dateIn(45), guestEstimate: 20, vendors: [], guests: [], budget: [], timeline: [] };
const restored = { ...EVENT, name: 'Restored older event' };
const upload = page => page.locator('input[type=file][accept="application/json,.json"]').setInputFiles({ name: 'my-events.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'ngw-event-export', version: 1, events: [restored] })) });
const boot = async page => {
  await page.addInitScript(event => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([event]));
    localStorage.setItem('ngw-hostv2-last-event', event.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  const rail = page.locator('.srail-row', { hasText: 'You & settings' });
  if (await rail.count()) await rail.first().click();
  else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('You & settings', { exact: false }).first().click();
  }
  await expect(page.getByRole('button', { name: 'Restore from a file', exact: true })).toBeVisible();
};

test('an all-skipped restore reports zero changes and offers explicit replacement', async ({ page }, testInfo) => {
  await boot(page);
  await upload(page);
  await expect(page.locator('.toast')).toContainText('0 added · 0 updated · 1 kept');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].name)).toBe(EVENT.name);
  await page.screenshot({ path: `test-results/restore-kept-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Replace matching events', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('0 added · 1 updated · 0 kept');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].name)).toBe(restored.name);
});

test('a rejected restore does not claim events returned', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'ngw-hostv2-custom-events') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await upload(page);
  await expect(page.locator('.toast')).toContainText('Nothing was restored');
  await expect(page.locator('.toast')).not.toContainText('Your events are back');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].name)).toBe(EVENT.name);
});
