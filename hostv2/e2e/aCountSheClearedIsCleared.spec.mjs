// ─── A COUNT SHE CLEARED IS CLEARED ──────────────────────────────────────────
//
// Run 2 (11/6/2026, R2-16): "Exact guest count" could not be emptied — an empty
// draft doubled as "not editing", so Backspace snapped the field back to 10 and
// typing appended: deleting 10 to type 15 saved 1015, typing "-5" saved 105.
// Edited here the way a person edits: click, Backspace, type, Enter.
// Rail viewports only, as theCouplesSheSaidReachTheList explains.
import { test, expect } from './fixtures.mjs';

const RAIL = /tablet-land|tablet-tall|desktop|wide/;
const EV = {
  id: 'E2E_clear_count', type: 'Game Night', name: 'Game night', date: '2027-03-12',
  guestMode: 'count', guestEstimate: 10, budget: [], vendors: [], timeline: [], guests: [],
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].guestEstimate);

const open = async (page) => {
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('./');
  const row = page.getByRole('button', { name: /^Guests$/ }).first();
  await row.waitFor({ state: 'visible', timeout: 20000 });
  await row.click();
  const f = page.getByRole('spinbutton', { name: 'Exact guest count' }).last();
  await f.waitFor({ state: 'visible', timeout: 20000 });
  return f;
};

test('deleting 10 and typing 15 saves 15', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  const f = await open(page);
  await f.click();
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(f).toHaveValue('');
  await page.keyboard.type('15');
  await page.keyboard.press('Enter');
  await expect.poll(() => stored(page)).toBe(15);
});

test('clearing the field and leaving it keeps the count she had', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  const f = await open(page);
  await f.click();
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Tab');
  await expect(f).toHaveValue('10');
  expect(await stored(page)).toBe(10);
});
