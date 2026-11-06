import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const boot = async page => {
  await page.addInitScript(date => {
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: 'vendor-money', name: 'Vendor money', type: 'Dinner Party', date,
        guestCount: 12, guestMode: 'count', totalBudget: 10000, budget: [], guests: [], timeline: [],
        vendors: [
          { id: 'v-money', name: 'The photographer', category: 'Photography', status: 'Considering', cost: 100 },
          { id: 'v-other', name: 'Another provider', category: 'DJ', status: 'Quoted', cost: 200 },
        ],
      }]));
    }
    localStorage.setItem('ngw-hostv2-last-event', 'vendor-money');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, dateIn(45));
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await page.locator('.vcard[data-vid="v-money"] .vc-head').click();
  return page.locator('.vcard[data-vid="v-money"]').getByLabel('What you agreed to pay', { exact: true });
};
const savedVendor = page => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].vendors[0]);

test('a dollar amount with cents saves unchanged and survives a reload', async ({ page }, testInfo) => {
  const input = await boot(page);
  await input.fill('4800.50');
  await input.press('Enter');
  await expect.poll(async () => (await savedVendor(page)).cost).toBe(4800.5);
  expect((await savedVendor(page)).costAgreed).toBe(true);
  expect((await savedVendor(page)).status).toBe('Considering');
  await expect(page.locator('.toast')).toContainText('$4,800.50');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await savedVendor(page)).cost).toBe(100);
  expect((await savedVendor(page)).costAgreed).toBeUndefined();
  await input.fill('4800.50');
  await input.press('Enter');
  await expect.poll(async () => (await savedVendor(page)).costAgreed).toBe(true);
  await page.reload();
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await page.locator('.vcard[data-vid="v-money"] .vc-head').click();
  const savedInput = page.locator('.vcard[data-vid="v-money"]').getByLabel('What you agreed to pay', { exact: true });
  await expect(savedInput).toHaveValue('4800.5');
  await expect(page.locator('.vcard[data-vid="v-money"] .vc-more')).toHaveCSS('opacity', '1');
  await savedInput.scrollIntoViewIfNeeded();
  await expect(savedInput).toBeInViewport({ ratio: 0.99 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('agreed-cost-cents.png'), fullPage: true });
});

test('focus alone does not agree to a quote, but reentering its amount does', async ({ page }) => {
  const input = await boot(page);
  await input.focus();
  await input.press('Tab');
  expect((await savedVendor(page)).costAgreed).toBeUndefined();
  await input.fill('100.00');
  await input.press('Enter');
  await expect.poll(async () => (await savedVendor(page)).costAgreed).toBe(true);
  expect((await savedVendor(page)).cost).toBe(100);
  expect((await savedVendor(page)).status).toBe('Considering');
  await input.fill('0');
  await input.press('Enter');
  await expect.poll(async () => (await savedVendor(page)).cost).toBe(0);
  expect((await savedVendor(page)).costAgreed).toBe(true);
  await expect(page.locator('.toast')).toContainText('$0.00 agreed');
  await input.fill('');
  await input.press('Enter');
  await expect.poll(async () => (await savedVendor(page)).costAgreed).toBe(false);
  expect((await savedVendor(page)).cost).toBe('');
});

test('a refused agreed-price write retains the draft and never attests or celebrates', async ({ page }) => {
  const input = await boot(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'ngw-hostv2-custom-events') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await input.fill('4800.50');
  await input.press('Enter');
  await expect(page.locator('.save-failed')).toBeVisible();
  await expect(input).toHaveValue('4800.50');
  expect((await savedVendor(page)).cost).toBe(100);
  expect((await savedVendor(page)).costAgreed).toBeUndefined();
  await expect(page.locator('.toast')).not.toContainText('$4,800.50 agreed');
});

test('an invalid draft cannot appear as another provider’s price', async ({ page }) => {
  const input = await boot(page);
  await input.fill('-500');
  await input.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Enter a nonnegative amount');
  await page.locator('.vcard[data-vid="v-other"] .vc-head').click();
  await expect(page.locator('.vcard[data-vid="v-other"]').getByLabel('What you agreed to pay', { exact: true })).toHaveValue('200');
});

for (const raw of ['-500', 'not a price']) {
  test(`invalid vendor cost ${raw} leaves the saved amount alone`, async ({ page }, testInfo) => {
    const input = await boot(page);
    await input.fill(raw);
    await input.press('Enter');
    await expect(page.getByRole('alert')).toContainText('Enter a nonnegative amount');
    expect((await savedVendor(page)).cost).toBe(100);
    await expect(input).toHaveValue(raw);
    await expect(page.locator('.toast').filter({ hasText: 'agreed' })).toHaveCount(0);
    await expect(page.locator('.vcard[data-vid="v-money"] .vc-more')).toHaveCSS('opacity', '1');
    await page.getByRole('alert').scrollIntoViewIfNeeded();
    await expect(page.getByRole('alert')).toBeInViewport({ ratio: 0.99 });
    await page.screenshot({ path: testInfo.outputPath('invalid-vendor-price.png'), fullPage: true });
  });
}
