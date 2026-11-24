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

// ─── THE PRODUCT IS IN THE OPENED ITEM (ux-food, owner 11/24/2026) ───────────
// The closed row keeps the store and its shelf price; the store's product name
// moved into the item a row tap opens. So the bar lines are read the way a host
// reaches them: open each one, read it, close it.
const openedBarText = async (page) => {
  const ids = await page.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    return [...document.querySelectorAll('.frow[data-food-row]')]
      .filter((r) => rx.test(r.querySelector('.f-name')?.innerText || ''))
      .map((r) => r.getAttribute('data-food-row'));
  }, BOOZE.source);
  const out = [];
  for (const id of ids) {
    await page.locator(`.frow[data-food-row="${id}"] .f-body`).first().click();
    const open = page.locator(`[data-food-open="${id}"]`).first();
    await open.waitFor();
    out.push((await open.innerText()).replace(/\s+/g, ' '));
    await open.locator('.fo-close').click();
    await page.locator(`.frow[data-food-row="${id}"]`).first().waitFor();
  }
  return { ids, text: out.join(' || ') };
};

// Where the note sits: inside the Drinks group, under its head and above its
// first row (the shopping row redesign wrapped the rows in .fg-items).
const notePlace = (page) => page.evaluate(() => {
  const notes = [...document.querySelectorAll('[data-no-alcohol-note]')];
  const n = notes[0];
  const group = n && n.closest('.fgroup');
  const head = group && group.querySelector('.fg-head');
  const firstRow = group && group.querySelector('.frow[data-food-row]');
  const before = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
  return {
    count: notes.length,
    group: head ? (head.innerText || '').replace(/\s+/g, ' ').trim() : null,
    underHead: before(head, n),
    aboveFirstRow: before(n, firstRow),
  };
});

test('a store with no bar: the note shows once, and the ginger beer is not priced', async ({ page }) => {
  const t = await openPriced(page, 'Main Root Ginger Beer');
  test.skip(t === null, 'unconfigured bundle — no store layer to drive');
  expect(t).toMatch(NOTE);
  expect(t.match(/This store doesn't sell beer or wine/g)).toHaveLength(1);
  // The note renders above the drinks: in the Drinks group, under its head,
  // above its first row.
  const place = await notePlace(page);
  expect(place.count).toBe(1);
  expect(place.group).toMatch(/^Dr\s*Drinks/);
  expect(place.underHead).toBe(true);
  expect(place.aboveFirstRow).toBe(true);
  expect(t).not.toMatch(/Main Root Ginger Beer/);
  // Nor in the opened bar lines, where a matched product would be named.
  const bar = await openedBarText(page);
  expect(bar.ids.length).toBeGreaterThan(0);
  expect(bar.text).not.toMatch(/Main Root Ginger Beer/);
  // The store did answer: the groceries are priced.
  expect(t).toMatch(/lines priced at your store/);
});

test('a store with a bar: no note, and the beer is priced (control)', async ({ page }) => {
  const t = await openPriced(page, 'Samuel Adams Winter Break Seasonal Variety Beer');
  test.skip(t === null, 'unconfigured bundle');
  expect(t).not.toMatch(/This store doesn't sell beer or wine/);
  expect((await notePlace(page)).count).toBe(0);
  expect((await openedBarText(page)).text).toMatch(/Samuel Adams Winter Break/);
});
