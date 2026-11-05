import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const boot = async (page, type = 'Dinner Party', days = 5) => {
  await page.addInitScript(({ date, type }) => {
    localStorage.clear();
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'chosen-caterer', name: 'Dinner with a caterer', type, date,
      startTime: '18:00', startTimeSource: 'host', venue: 'The dining room', venueCity: 'Baltimore', state: 'MD',
      guestCount: 20, guestMode: 'count', totalBudget: 5000,
      foodChoices: { sourcing: 'caterer' }, vendors: [], guests: [], budget: [], timeline: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'chosen-caterer');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, { date: dateIn(days), type });
  await page.goto('?elegant=1');
  await settled(page);
};

test('a chosen caterer replaces the homemade food and remains an unbooked vendor', async ({ page }, testInfo) => {
  await boot(page);
  await expect(page.getByRole('button', { name: /No catering booked yet/ })).toBeVisible();
  await openSectionByName(page, 'The spread & shopping');
  const sheet = page.locator('.sheet').last();
  await sheet.getByRole('button', { name: /^The list/ }).click();
  await sheet.getByRole('button', { name: /Food.*0 of 1 bought/ }).click();
  const catering = sheet.getByRole('button', { name: /Catering \(the food\)/ });
  await catering.scrollIntoViewIfNeeded();
  await expect(catering).toBeVisible();
  await expect(sheet).not.toContainText('Main protein');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].vendors)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('chosen-caterer.png'), fullPage: true });
});

test('a chosen caterer without an authored role is actionable without a fictional quote or overdue claim', async ({ page }, testInfo) => {
  await boot(page, 'Crab Feast', 45);
  await expect(page.getByRole('main')).toContainText('No catering booked yet');
  await expect(page.getByRole('main')).toContainText('You chose “caterer” for the food');
  await page.getByRole('button', { name: 'Open vendors', exact: true }).click();
  const sheet = page.locator('.sheet').last();
  const role = sheet.getByText('Catering', { exact: true });
  await role.scrollIntoViewIfNeeded();
  await expect(role).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].vendors)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('choice-backed-caterer.png'), fullPage: true });
  await role.locator('..').locator('..').getByRole('button', { name: 'Add', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const vendors = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].vendors;
    return vendors.length === 1 && vendors[0].category === 'Catering'
      && !vendors[0].status && !vendors[0].cost;
  })).toBe(true);
});
