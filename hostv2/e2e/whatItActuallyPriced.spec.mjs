// ─── THE PRICE OF A SHOE INSERT, ON THE LINE FOR FLATBREAD ───────────────────
//
// The match-quality guard was written for `storeLineTotal` and lived only
// there, so it decided the TOTAL and nothing else. The price a host reads was
// rendered from the same match without ever asking. A match the app did not
// believe still published its number; only the arithmetic on top was withheld.
//
// These are real returns from a live Baltimore store, probed 2026-09-23:
//
//   "injera"        → Airplus® Gel Women's Orthotic Insole Shoe Inserts, $8.99
//   "espresso cups" → Private Selection® Espresso Roast Coffee Pods,     $6.99
//   "prosecco"      → Tuscany Candle™ Peach Prosecco Wax Melts,          $3.29
//
// Only the last carries a word the guard can see. So there are two fixes and
// this spec drives both: the guard now decides whether the line has a store
// price at all, AND the store layer prints WHAT it priced — because a heuristic
// catches a familiar way of being wrong, never every way, and a host reading
// "Airplus® Gel Orthotic Shoe Inserts" catches all of them.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2. src/lib/__tests__/threeLayersOfPrice.test.js
// proves the gate; only a browser proves the sheet obeys it.
import { test, expect, settled, sheetSettled } from './fixtures.mjs';

// ─── THE SHELF PRICE'S DETAIL IS IN THE OPENED ITEM (owner, 11/24/2026) ─────
// The row keeps the store, the shelf price, its size and "sale"; the "was"
// price, the arithmetic and the product's name moved into the item, which a
// row tap opens in place. So the detail is read the way a host reaches it:
// open each line the store priced, read it, close it.
const openedPricedText = async (page, store) => {
  const ids = await page.evaluate((s) => [...document.querySelectorAll('.frow[data-food-row]')]
    .filter((r) => (r.innerText || '').includes(s)).map((r) => r.getAttribute('data-food-row')), store);
  const out = [];
  for (const id of ids) {
    await page.locator(`.frow[data-food-row="${id}"] .f-body`).first().click();
    const open = page.locator(`[data-food-open="${id}"]`).first();
    await open.waitFor();
    out.push((await open.innerText()).replace(/\s+/g, ' '));
    await open.locator('.fo-close').click();
    await page.locator(`.frow[data-food-row="${id}"]`).first().waitFor();
  }
  return out.join(' || ');
};

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

// `description` is the whole variable under test, so each run picks one and
// every other field is held identical. Two lines are priced so the coverage
// count is a real count.
const priceEverythingWith = (page, description) => Promise.all([
  page.route('**/api/shopping/kroger/locations**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ configured: true, locations: [
      { locationId: '01400943', name: 'Harris Teeter — Bel Air', address: '5 Bel Air S Pkwy' },
    ] }),
  })),
  page.route('**/api/shopping/kroger/search-list', async (r) => {
    const sent = JSON.parse(r.request().postData() || '{}');
    const results = (sent.items || []).map((i, n) => (n < 2
      ? { name: i.name, matched: true, price: 8.99, size: '1 ct', soldBy: 'UNIT', description }
      : { name: i.name, matched: false }));
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, results }) });
  }),
]);

const openPriced = async (page, description) => {
  await priceEverythingWith(page, description);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-match', name: 'The Cookout', type: 'The Cookout',
      date: '2027-06-17', venueCity: '21014',
      guestMode: 'count', guestCount: 20, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-match');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, "what you.?re serving|\\? · \\d+ open");   // the food call by its own question (cohesion F2)
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
  // The product's name is in the opened item, under its shelf price.
  return (await bodyText(page)) + ' || ' + (await openedPricedText(page, 'Harris Teeter — Bel Air:'));
};

test('(premise) a BELIEVABLE match really does price the sheet', async ({ page }) => {
  // The negative control for everything below. Without it, "no price appeared"
  // would be indistinguishable from "the store layer never ran".
  const t = await openPriced(page, 'Smithfield Extra Tender Pork Back Ribs');
  test.skip(t === null, 'unconfigured bundle — no store layer to drive');
  expect(t).toMatch(/Harris Teeter — Bel Air: \$8\.99/);
  expect(t).toMatch(/2 of \d+ lines priced at your store/);
});

test('IT SAYS WHAT IT PRICED — the product name, under the price', async ({ page }) => {
  const t = await openPriced(page, 'Smithfield Extra Tender Pork Back Ribs');
  test.skip(t === null, 'unconfigured bundle');
  expect(t).toMatch(/Smithfield Extra Tender Pork Back Ribs/);
});

test('A MATCH THE APP DOES NOT BELIEVE PRICES NOTHING — not just no total', async ({ page }) => {
  // Same line, same price, same size. Only the product changed, to the live
  // wax-melt return that started this.
  const t = await openPriced(page, 'Tuscany Candle™ Premium Satin Wax Melts - Peach Prosecco');
  test.skip(t === null, 'unconfigured bundle');
  expect(t).not.toMatch(/Harris Teeter — Bel Air: \$8\.99/);
  expect(t).not.toMatch(/Tuscany Candle/);
  // …and the sheet says so honestly rather than claiming coverage it lost.
  expect(t).not.toMatch(/lines priced at your store/);
});

test('the shoe-insert case is the one the guard CANNOT catch — and the host can', async ({ page }) => {
  // No word in "Airplus® Gel Women's Orthotic Insole Shoe Inserts" is on any
  // blocklist, and none should be. The price stands; the product name beside it
  // is what makes it checkable. This test exists so nobody removes that line
  // believing the heuristic covers it.
  const t = await openPriced(page, "Airplus® Gel Women's Orthotic Insole Shoe Inserts Size 6-10");
  test.skip(t === null, 'unconfigured bundle');
  expect(t).toMatch(/Harris Teeter — Bel Air: \$8\.99/);
  expect(t).toMatch(/Orthotic Insole Shoe Inserts/);
});
