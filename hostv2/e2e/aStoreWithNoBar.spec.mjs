// ─── THE STORE PRICED THE GROCERIES AND NOT ONE BOTTLE ───────────────────────
//
// Probed live 2026-11-24 at a Baltimore store, where Maryland keeps most chain
// grocers from selling beer and wine. It answered "beer" with Ginger Beer and
// "red wine" with Red Cooking Wine, and the list priced the bar with them.
// src/lib/__tests__/aStoreWithNoBar.test.js proves the check and the note;
// only a browser proves the Shop tab shows it, once, above the drinks.
//
// Owner, 11/24/2026: option A (word check) now; note wording approved.
import { test, expect, settled, sheetSettled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || x.textContent || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}, src);

const bodyText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

const storeLayerOffered = (page) => page.evaluate(() => [...document.querySelectorAll('button')]
  .some((x) => /Check store prices/i.test(x.innerText || '')));

const BOOZE = /\b(beer|wine|seltzer|bubbly|champagne)\b/i;

// Every grocery line gets a plain, believable product; every line that names
// beer or wine gets what the dry store sent back (or real wine, for the control).
const priceWith = (page, barProduct) => Promise.all([
  page.route('**/api/shopping/kroger/locations**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ configured: true, locations: [
      { locationId: '09700376', name: 'Harris Teeter — Test Store', address: '1 Test Way' },
    ] }),
  })),
  page.route('**/api/shopping/kroger/search-list', async (r) => {
    const sent = JSON.parse(r.request().postData() || '{}');
    const results = (sent.items || []).map((i) => ({
      name: i.name, matched: true, price: 6.49, size: '1 ct', soldBy: 'UNIT',
      description: BOOZE.test(i.name) ? barProduct : 'Fresh Grocery Item',
    }));
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, results }) });
  }),
]);

const openPriced = async (page, barProduct) => {
  await priceWith(page, barProduct);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-nobar', name: 'The Cookout', type: 'The Cookout',
      date: '2027-06-17', venueCity: '21230',
      guestMode: 'count', guestCount: 20, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-nobar');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, "what you.?re serving");
  await sheetSettled(page);
  // The list sits behind the Shop tab now (it used to be one tap from the
  // food sheet); without this tap the store button is never found and every
  // test here skipped as "unconfigured".
  await tapText(page, '^Shop$');
  await sheetSettled(page);
  await tapText(page, 'The list[\\s\\S]*item');
  await sheetSettled(page);
  if (!(await storeLayerOffered(page))) return null;      // unconfigured bundle
  await tapText(page, 'Check store prices');
  await page.waitForTimeout(300);
  await tapText(page, 'Find stores');
  await page.waitForTimeout(900);
  await tapText(page, 'Harris Teeter');
  await sheetSettled(page);
  await page.evaluate(() => [...document.querySelectorAll('.fg-head')].forEach((h) => h.click()));
  await page.waitForTimeout(700);
  await settled(page);
  return bodyText(page);
};

const NOTE = /This store doesn't sell beer or wine\. The bar is priced at the (regional average|national average|regional and national averages)\. Buy it at a liquor store\./;

test('a store with no bar: the note shows once, and the ginger beer is not priced', async ({ page }) => {
  const t = await openPriced(page, 'Main Root Ginger Beer');
  test.skip(t === null, 'unconfigured bundle — no store layer to drive');
  expect(t).toMatch(NOTE);
  expect(t.match(/This store doesn't sell beer or wine/g)).toHaveLength(1);
  expect(t).not.toMatch(/Main Root Ginger Beer/);
  // The store did answer: the groceries are priced.
  expect(t).toMatch(/lines priced at your store/);
});

test('a store with a bar: no note, and the beer is priced (control)', async ({ page }) => {
  const t = await openPriced(page, 'Samuel Adams Winter Break Seasonal Variety Beer');
  test.skip(t === null, 'unconfigured bundle');
  expect(t).not.toMatch(/This store doesn't sell beer or wine/);
  expect(t).toMatch(/Samuel Adams Winter Break/);
});
