// ─── THE GRANDMOTHER SEAT'S ONE CONDITION ─────────────────────────────────
//
// She declined to block the offline shell — "if it does not work in the shop
// I would just have written a list on paper before I left. That is not the
// app failing me." She attached a single condition instead, and it is about
// the side effect rather than the feature:
//
//   "If the app opened and showed me my plan and I did not know it was old —
//    that would be worse than it not opening."
//
// Today no signal means a blank screen: ugly, and HONEST, because she can
// see something is wrong. Once the shell is cached, no signal means her plan
// opens looking completely normal and nothing distinguishes a live render
// from one served out of a week-old cache. The feature that helps her in the
// aisle is the one that can quietly lie to her.
//
// Her closing words are why this file is an e2e and not a unit test:
// "Do not tell me it is there because it is in a test." lastSignal had
// passing unit tests and rendered NOWHERE for the whole day it existed.
import { test, expect } from './fixtures.mjs';

const seed = async (page, signalAgeMs) => {
  await page.addInitScript((age) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-sig', name: 'Signal test', type: 'Birthday', date: '2027-06-17',
      venueCity: 'Annapolis', state: 'MD', guestMode: 'count', guestCount: 12,
      totalBudget: 2000, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-sig');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await page.waitForSelector('.app', { timeout: 20000 });
  // THE AGE IS SET AFTER THE LOAD, ON PURPOSE. Seeding it in an init script
  // does not survive: the load itself reaches the network and markSignal()
  // correctly stamps it to now. That is the product being right, and the
  // first version of this file mistook it for the notice being wrong —
  // every seeded age came back as "a moment ago".
  await page.evaluate((age) => {
    if (age === null) localStorage.removeItem('ngw-last-signal');
    else localStorage.setItem('ngw-last-signal', String(Date.now() - age));
  }, signalAgeMs);
};

const notice = (page) => page.locator('.no-signal');

test('ONLINE it says nothing at all', async ({ page }) => {
  // A permanent "last updated" line is noise on the 99% of loads that are
  // live, and noise is how a real notice gets ignored.
  await seed(page, 20 * 60000);
  await expect(notice(page)).toHaveCount(0);
});

test('OFFLINE she is told the plan is saved, and HOW OLD it is', async ({ page, context }) => {
  await seed(page, 20 * 60000);
  await context.setOffline(true);
  await expect(notice(page)).toBeVisible({ timeout: 10000 });
  const txt = await notice(page).innerText();
  expect(txt).toMatch(/No signal/i);
  expect(txt).toMatch(/showing your saved plan/i);
  // The age is the point. "Offline" alone does not tell her the numbers on
  // screen are from last Tuesday.
  expect(txt).toMatch(/Last updated 20 minutes ago/);
  await context.setOffline(false);
});

test('a device that has NEVER been online does not invent a time', async ({ page, context }) => {
  // null is not "just now". The shell can open on a device with no record at
  // all, and saying nothing about it would be the same silence this notice
  // exists to break.
  await seed(page, null);
  await context.setOffline(true);
  await expect(notice(page)).toBeVisible({ timeout: 10000 });
  const txt = await notice(page).innerText();
  expect(txt).toMatch(/has not been online yet/i);
  expect(txt).not.toMatch(/Last updated/);
  await context.setOffline(false);
});

test('the phrase coarsens with real age', async ({ page, context }) => {
  await seed(page, 19 * 24 * 3600 * 1000);
  await context.setOffline(true);
  await expect(notice(page)).toContainText(/Last updated 2 weeks ago/, { timeout: 10000 });
  await context.setOffline(false);
});

test('coming back online clears it AND re-stamps the signal', async ({ page, context }) => {
  await seed(page, 20 * 60000);
  await context.setOffline(true);
  await expect(notice(page)).toBeVisible({ timeout: 10000 });
  await context.setOffline(false);
  await expect(notice(page)).toHaveCount(0, { timeout: 10000 });
  // …and the timestamp moved, so the NEXT offline sit measures from now.
  const fresh = await page.evaluate(
    () => Date.now() - Number(localStorage.getItem('ngw-last-signal')) < 10000,
  );
  expect(fresh).toBe(true);
});
