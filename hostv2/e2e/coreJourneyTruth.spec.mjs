import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const base = (over = {}) => ({ id: 'c5-event', type: 'Birthday', name: 'Core journeys', date: dateIn(80), guestMode: 'count', guestCount: 40, guestCountSource: 'host', totalBudget: 5000, venue: 'Community Hall', venueKind: 'venue', venueCity: 'Baltimore', venueState: 'MD', startTime: '17:00', startTimeSource: 'derived', startTimeBasis: 'rule-of-thumb', guests: [], vendors: [], budget: [], timeline: [], ...over });
const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    if (!localStorage.getItem('ngw-hostv2-custom-events')) localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0]);

test('a Then start-time row opens a real time editor', async ({ page }, testInfo) => {
  await boot(page, base());
  const row = page.locator('.then-fold .ef-row').filter({ hasText: /start time/i }).first();
  await expect(row).toBeVisible();
  await row.click();
  if (await page.locator('.srail-row').count()) await page.locator('.cpane-cta').click();
  await expect(page.getByRole('dialog', { name: 'Date & time' })).toBeVisible();
  await expect(page.getByRole('dialog').locator('input[type="time"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('then-date-editor.png'), fullPage: true });
});

test('a Then accessibility question focuses its own answer and persists the answer', async ({ page }, testInfo) => {
  await boot(page, base({ accessNeeds: [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }] }));
  const row = page.locator('.then-fold .ef-row').filter({ hasText: /step-free/i }).first();
  await expect(row).toBeVisible();
  await row.click();
  if (await page.locator('.srail-row').count()) await page.locator('.cpane-cta').click();
  const answer = page.locator('#place-question-venue-step-free');
  await expect(answer.getByRole('button', { name: 'Yes', exact: true })).toBeFocused();
  await expect(answer.getByRole('button', { name: 'Yes', exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('then-place-answer.png'), fullPage: true });
  await answer.getByRole('button', { name: 'Yes', exact: true }).click();
  expect((await saved(page)).venueStepFree).toBe(true);
});

test('one Yes produces one confirmed, while the planning headcount remains 40', async ({ page }) => {
  await boot(page, base({ guests: [{ id: 'carol', name: 'Aunt Carol', rsvp: '' }] }));
  await openSectionByName(page, 'Guests');
  await page.locator('.grow > button[aria-expanded]').first().click();
  await page.getByRole('radio', { name: 'Yes', exact: true }).click();
  await expect(page.getByText(/Aunt Carol → Yes — 1 confirmed/)).toBeVisible();
  expect((await saved(page)).guestCount).toBe(40);
});

test('the phone directory can change an already-set venue using the existing editor', async ({ page }) => {
  await boot(page, base());
  await openSectionByName(page, 'Venue');
  const sheet = page.getByRole('dialog', { name: 'Venue', exact: true });
  await sheet.getByRole('textbox', { name: 'Venue', exact: true }).fill('New Community Center');
  await sheet.getByRole('button', { name: 'Save', exact: true }).first().click();
  expect((await saved(page)).venue).toBe('New Community Center');
});

test('the horizon does not tell a destination host to wait past a real lodging deadline', async ({ page }, testInfo) => {
  const deadline = dateIn(10);
  await boot(page, base({ date: dateIn(240), isDestination: true, guestMode: 'roster', guests: [{ id: 'carol', name: 'Aunt Carol', rsvp: 'Yes', travel: { lodging: { status: 'not_started' } } }], lodging: { hotelName: 'Group Hotel', deadline } }));
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/the rest can wait till/i);
  const label = new Date(deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  await expect(page.getByText(new RegExp('next dated work: ' + label, 'i')).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('plan-horizon.png'), fullPage: true });
});
