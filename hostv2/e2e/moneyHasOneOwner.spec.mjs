import { test, expect, settled, openSectionByName } from './fixtures.mjs';
const seed = {
  id: 'rc-money', name: 'Money truth', type: 'Dinner Party', date: '2027-06-12',
  totalBudget: 5000, guestCount: 12, guestMode: 'count', guests: [],
  budget: [{ id: 'food', category: 'Food', budgeted: 3000, actual: 3000 }, { id: 'flowers', category: 'Flowers', budgeted: 500, actual: 100 }],
  vendors: [{ id: 'caterer', name: 'Real Caterer', category: 'Catering', budgetCategory: 'Food', status: 'Contracted', cost: 3000, depositPaid: true, depositAmt: 500 }],
};
const boot = async page => {
  await page.addInitScript(ev => {
    if (localStorage.getItem('rc-money-seeded')) return;
    localStorage.clear();
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('rc-money-seeded', '1');
  }, seed);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your money');
};
test('money shows owned commitments, separate expectations, and conflicting records', async ({ page }, testInfo) => {
  await boot(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet).toContainText('$3,100 spoken for');
  await expect(sheet).toContainText('$600 actually spent');
  await expect(sheet).toContainText('Expected costs');
  await expect(sheet).toContainText('Food: budget entry $3,000; vendor payments $500');
  await expect(sheet).not.toContainText('Over by');
  await page.screenshot({ path: testInfo.outputPath('money-truth.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('a manual payment changes spent, persists, and has Undo', async ({ page }) => {
  await boot(page);
  const sheet = page.locator('.sheet').last();
  await sheet.getByRole('button', { name: 'Log a payment' }).click();
  await sheet.getByLabel('Budget entry').selectOption('flowers');
  await sheet.getByLabel('Payment amount').fill('-1');
  await sheet.getByRole('button', { name: 'Record payment' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].budget.find(r => r.id === 'flowers').actual)).toBe(100);
  await sheet.getByLabel('Payment amount').fill('25.50');
  await sheet.getByRole('button', { name: 'Record payment' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].budget.find(r => r.id === 'flowers').actual)).toBe(125.5);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].budget.find(r => r.id === 'flowers').actual)).toBe(100);
  await sheet.getByRole('button', { name: 'Log a payment' }).click();
  await sheet.getByLabel('Budget entry').selectOption('flowers');
  await sheet.getByLabel('Payment amount').fill('25.50');
  for (const control of await sheet.locator('form button, form input, form select').all()) {
    const box = await control.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  }
  await sheet.getByRole('button', { name: 'Record payment' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].budget.find(r => r.id === 'flowers').actual)).toBe(125.5);
  await page.reload();
  await settled(page);
  await openSectionByName(page, 'Your money');
  await expect(sheet).toContainText('$625.50 actually spent');
});


test('the audited default sample keeps its contract total when the caterer is paid', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-retirement-party');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await expect(page.locator('body')).toContainText('Margaret');
  await expect(page.locator('body')).not.toContainText('Known costs are $3,027 over');
  await openSectionByName(page, 'Your money');
  await expect(page.locator('.sheet').last()).toContainText('$10,210 spoken for');
  await expect(page.locator('.sheet').last()).toContainText('$4,660 actually spent');
  await expect(page.locator('.sheet').last()).toContainText('$13,561 expected in total');
  await page.screenshot({ path: testInfo.outputPath('sample-before-payment.png'), fullPage: true });
  await page.getByRole('button', { name: 'Review vendor payments' }).click();
  const card = page.locator('.vcard').filter({ hasText: 'Hearthstone Catering Co.' });
  await card.locator('.vc-head').click();
  await card.getByRole('button', { name: 'mark paid in full', exact: true }).click();
  await openSectionByName(page, 'Your money');
  await expect(page.locator('.sheet').last()).toContainText('$10,210 spoken for');
  await expect(page.locator('.sheet').last()).toContainText('$7,810 actually spent');
  await expect(page.locator('.sheet').last()).not.toContainText('Over by');
  await page.screenshot({ path: testInfo.outputPath('sample-after-payment.png'), fullPage: true });
});

test('a fresh event can record its first expense', async ({ page }, testInfo) => {
  await page.addInitScript(ev => {
    localStorage.clear();
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ ...ev, budget: [], vendors: [] }]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, seed);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your money');
  const sheet = page.locator('.sheet').last();
  await sheet.getByRole('button', { name: 'Log a payment' }).click();
  await sheet.getByLabel('Payment category').fill('Flowers');
  await sheet.getByLabel('Payment amount').fill('12.50');
  await page.screenshot({ path: testInfo.outputPath('first-payment-form.png'), fullPage: true });
  await sheet.getByRole('button', { name: 'Record payment' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].budget[0].actual)).toBe(12.5);
  await expect(sheet).toContainText('$12.50 actually spent');
});
