// ─── THE DAY TAB, PREPPING A KITCHEN THAT IS NOT THERE ───────────────────────
//
// Screen census (host ask: "check the host is only seeing what they need on
// each screen"). The Day tab on the Santa Fe 80th, room block answered, read:
//
//   "Food safety — ... Cook anything to safe internal temps."
//
// while the food sheet two screens away said "there is no kitchen to cook in"
// and the budget had already stopped pricing groceries for the same reason.
// The engine fix is proved in src/lib/__tests__/cookToTempInARoomWithNoStove;
// this drives it, because jest cannot execute hostv2 and the claim is on a
// screen.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50);
}, src);

const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

const openDay = async (page, pick) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((p) => {
    const ev = {
      id: 'e2e-day', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
      ...(p ? { foodChoices: { dest_lodging: p } } : {}),
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-day');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, pick);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, '^The Day$');
  await page.waitForTimeout(1600);
  await settled(page);
};

test('(premise) The Day really does carry the safety basics', async ({ page }) => {
  // Without this every absence below could just mean the tab never opened.
  await openDay(page, 'A house we rent for everyone');
  const t = await bodyText(page);
  expect(t).toMatch(/Food safety/i);
  expect(t).toMatch(/safe internal temps/i);
});

test('a room block is never told to cook to temperature', async ({ page }) => {
  await openDay(page, 'A room block I guarantee fills');
  const t = await bodyText(page);
  expect(t).not.toMatch(/safe internal temps/i);
  expect(t).not.toMatch(/Cook anything/i);
});

test('the food-safety item is still there, in terms they can act on', async ({ page }) => {
  // The over-correction this guards: deleting food safety from a catered
  // gathering is more dangerous than the wrong instruction was.
  await openDay(page, 'A room block I guarantee fills');
  const t = await bodyText(page);
  expect(t).toMatch(/Food safety/i);
  expect(t).toMatch(/2 hours/i);
  expect(t).toMatch(/caterer brought it/i);
});

test('NEGATIVE CONTROL: an UNTOLD kitchen keeps the cook step', async ({ page }) => {
  await openDay(page, null);
  expect(await bodyText(page)).toMatch(/safe internal temps/i);
});
