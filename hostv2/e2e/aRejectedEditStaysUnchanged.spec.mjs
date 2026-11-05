import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'cust-save-proof', name: 'Save truth cookout', type: 'Cookout', date: dateIn(45),
  guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
  venueCity: 'Annapolis', state: 'MD', totalBudget: 4000,
  budget: [], vendors: [], guests: [], timeline: [],
};
const boot = async (page, fail) => {
  await page.addInitScript(event => {
    if (!localStorage.getItem('ngw-hostv2-custom-events')) localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([event]));
    localStorage.setItem('ngw-hostv2-last-event', event.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1&people=1');
  await settled(page);
  await openSectionByName(page, 'Guests');
  // Inject after boot: a failed edit, rather than a failed initial seed.
  await page.evaluate(fail => {
    window.__saveProofFailures = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (fail && key === 'ngw-hostv2-custom-events') {
        window.__saveProofFailures++;
        throw new DOMException('Full', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  }, fail);
};

test('a rejected local edit leaves the question unanswered and never celebrates', async ({ page }) => {
  await boot(page, true);
  await page.getByRole('button', { name: 'Plan for 40', exact: true }).click();
  await expect(page.locator('.save-failed')).toBeVisible();
  expect(await page.evaluate(() => window.__saveProofFailures)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Plan for 40', exact: true })).toBeVisible();
  await expect(page.locator('.rmsg')).toHaveCount(0);
  await expect(page.locator('.toast')).not.toContainText('Planning around 40');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
  expect(saved.guestCountSource).toBe('playbook-typical');
});

test('a durable local edit settles the same question and survives a reload', async ({ page }) => {
  await boot(page, false);
  await page.getByRole('button', { name: 'Plan for 40', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Plan for 40', exact: true })).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
  expect(saved.guestCountSource).toBe('host');
  await page.reload();
  await settled(page);
  await openSectionByName(page, 'Guests');
  await expect(page.getByRole('button', { name: 'Plan for 40', exact: true })).toHaveCount(0);
});

test('a failed One Move payment keeps the action and offers no success receipt', async ({ page }) => {
  const id = 'ev-x-retirement-party';
  await page.addInitScript(id => {
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, id);
  await page.goto('?elegant=1');
  await settled(page);
  const paid = page.getByRole('button', { name: 'Mark as paid', exact: true }).first();
  await expect(paid).toBeVisible();
  await page.evaluate(id => {
    window.__saveProofFailures = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'ngw-hostv2-patch-' + id) {
        window.__saveProofFailures++;
        throw new DOMException('Full', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  }, id);
  await paid.click();
  await expect(page.locator('.save-failed')).toBeVisible();
  expect(await page.evaluate(() => window.__saveProofFailures)).toBeGreaterThan(0);
  await expect(paid).toBeVisible();
  await expect(page.locator('.rmsg')).toHaveCount(0);
  await expect(page.locator('.toast')).not.toContainText('balance marked paid');
  await page.screenshot({ path: 'test-results/c6-rejected-payment.png', fullPage: true });
});
