// ─── THREE LAYERS OF A PRICE, ON THE SCREEN A HOST ACTUALLY USES ─────────────
//
// Host directive 2026-09-23: build the three layers.
//
//   STORE     a real shelf price from a store the host picked (Kroger's API,
//             one endpoint for Fred Meyer / Ralphs / Harris Teeter / Fry's /
//             QFC / Smith's / Dillons / Pick 'n Save / Ruler too).
//   REGIONAL  the authored band moved by a BLS factor — four census regions,
//             the finest geography BLS publishes for food.
//   NATIONAL  the band as authored.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2. The unit tests in
// src/lib/__tests__/threeLayersOfPrice.test.js prove the ORDER; only a browser
// proves a host can see it.
//
// ── THIS FILE TESTS ONE OF TWO BUILDS, AND SAYS WHICH ────────────────────────
// Layer 2 needs a backend: `isStorePricesConfigured()` reads the baked
// REACT_APP_API_BASE_URL. The repo's `npm run build` bakes none, so CI serves an
// UNCONFIGURED bundle, and a local `vite build --mode development` (which loads
// .env.development) serves a configured one.
//
// So this spec detects which bundle it is on, prints it, and asserts what is
// true of THAT bundle:
//
//   unconfigured — the offer must be ABSENT. No button promising a store the
//                  build cannot reach. This is the branch CI runs, and it is a
//                  real guard: it is exactly how a dead promise would ship.
//   configured   — the whole feature is driven: picker, ZIP prefill, store
//                  choice, per-row shelf price, the coverage sentence, and the
//                  three honest failures.
//
// It is NOT a skip. Both branches assert. But be clear about what CI proves:
// CI proves the unconfigured build stays silent. The configured path is proved
// on a desk, by running:
//
//   cd hostv2 && npx vite build --mode development \
//     && npx playwright test --config playwright.config.mjs e2e/threeLayersOfPrice.spec.mjs
//
// Measured 2026-09-23, all 7 viewport projects green on the configured build.
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

// Is layer 2 reachable in the bundle under test? Read from the running app, not
// from the environment of the process running the test — those are different
// machines' worth of state, and only one of them is what a host loads.
const storeLayerOffered = (page) => page.evaluate(() => [...document.querySelectorAll('button')]
  .some((x) => /Check store prices/i.test(x.innerText || '')));

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || x.textContent || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}, src);

const labels = (page) => page.evaluate(() => [...document.querySelectorAll('button,[role="button"],a')]
  .map((x) => (x.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));

const bodyText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

const openList = async (page, venueCity) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((vc) => {
    const ev = {
      id: 'e2e-3l', name: 'The Cookout', type: 'The Cookout',
      date: '2027-06-17', venueCity: vc,
      guestMode: 'count', guestCount: 20, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
      // The host makes the potato salad herself, so its "…ingredients" basket
      // is on her list to price: the family's dishes are not priced at her
      // store (one record for who brings, 11/21/2026).
      foodOwner: { p_potato_salad: false },
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-3l');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, venueCity);
  await page.goto('?elegant=1');
  await settled(page);
  // WAITING ON THE SHEET, NOT ON A NUMBER. These were waitForTimeout(1600)
  // twice — 3.2s of guess per test, in a file with sixteen such calls. The
  // sleep was not even measuring the right thing: `settled` answers "the app
  // booted", and what happens after these taps is a SHEET opening.
  await tapText(page, "what you.?re serving|\\? · \\d+ open");   // the food call by its own question (cohesion F2)
  await sheetSettled(page);
  // The menu door opens the spread on Plan while the menu is open (owner's
  // iPad, 11/21/2026); the list is on Shop.
  await tapText(page, '^Shop$');
  await sheetSettled(page);
  await tapText(page, 'The list[\\s\\S]*item');
  await sheetSettled(page);
};

test('(premise) the list really opened — and the bundle says whether layer 2 is reachable', async ({ page }) => {
  // Without this the tests below could pass over a screen that never rendered.
  await openList(page, '21014');
  const t = await bodyText(page);
  expect(t).toMatch(/THE LIST/i);
  expect(t).toMatch(/Copy the shopping list/i);
  console.log('BUNDLE:', (await storeLayerOffered(page)) ? 'CONFIGURED (layer 2 reachable)' : 'UNCONFIGURED (CI default)');
});

test('UNCONFIGURED BUILD PROMISES NOTHING — no button for a store it cannot reach', async ({ page }) => {
  // The branch CI runs. A dead promise is the failure this guards: the offer
  // must not render at all when no backend is baked, rather than rendering and
  // failing on tap.
  await openList(page, '21014');
  test.skip(await storeLayerOffered(page), 'configured bundle — the feature tests below cover it');
  const t = await bodyText(page);
  expect(t).not.toMatch(/Check store prices/i);
  expect(t).not.toMatch(/priced at your store/i);
});

test('CONFIGURED BUILD OFFERS IT, and says what it will and will not do', async ({ page }) => {
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle — covered by the test above');
  // ── THE CAVEATS MOVED INTO THE PICKER, 2026-09-26 ────────────────────────
  // They used to run four lines above the groceries for every host, including
  // every host who never taps. The rule they serve — state the limit BEFORE
  // the host does the work — is satisfied better beside the ZIP field than
  // above a list, because the work IS typing a ZIP. So this test follows them
  // one tap in rather than dropping an assertion: every string it guarded is
  // still guarded, and still guarded BEFORE any lookup runs.
  await tapText(page, 'Check store prices');
  await page.waitForTimeout(400);
  const t = await bodyText(page);
  expect(t).toMatch(/beside your estimate, never instead of it/i);
  // ── THE LIMIT IS STATED BEFORE THE HOST DOES THE WORK ────────────────────
  // Probed live 2026-09-23: four of nine mid-Atlantic ZIPs return no store at
  // all, Bel Air among them. An accurate empty result still reads as a broken
  // feature when nothing warned it was possible, so the offer names the chain
  // family and the regional limit up front.
  expect(t).toMatch(/Coverage is regional — there may be none near you/);
  expect(t).toMatch(/Harris Teeter/);        // the family, named, not implied
});

test('PICKER: opens with the venue ZIP prefilled', async ({ page }) => {
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle');
  await tapText(page, 'Check store prices');
  await page.waitForTimeout(400);
  const zip = await page.evaluate(() => {
    const i = document.querySelector('input[aria-label="ZIP code or town to find a store near"]');
    return i ? i.value : 'NO INPUT';
  });
  console.log('PREFILLED ZIP:', zip);
  expect(zip).toBe('21014');
});

test('HAPPY PATH: a store is picked, the sheet says what it reached, the row shows the shelf price', async ({ page }) => {
  await page.route('**/api/shopping/kroger/locations**', r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ configured: true, locations: [
      { locationId: '01400943', name: 'Harris Teeter — Bel Air', address: '5 Bel Air S Pkwy' },
    ] }),
  }));
  await page.route('**/api/shopping/kroger/search-list', async (r) => {
    const sent = JSON.parse(r.request().postData() || '{}');
    const names = (sent.items || []).map(i => i.name);
    // Price exactly two lines, whichever the plan sent, so the coverage note is
    // a real count and not a number this stub chose.
    const results = names.map((name, i) => (i < 2
      ? { name, matched: true, price: 18.49, promoPrice: i === 0 ? 14.99 : 0, size: '12 pk' }
      : { name, matched: false }));
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, results }) });
  });
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle');
  await tapText(page, 'Check store prices');
  await page.waitForTimeout(300);
  await tapText(page, 'Find stores');
  await page.waitForTimeout(800);
  const l1 = await labels(page);
  console.log('STORES OFFERED:', JSON.stringify(l1.filter(x => /Harris|use/i.test(x))));
  await tapText(page, 'Harris Teeter');
  await page.waitForTimeout(1200);
  // THE GROUPS ARE COLLAPSED BY DEFAULT — the per-row price does not exist in
  // the DOM until a shelf is opened. First run of this spec asserted over the
  // closed list and failed on the row while the summary passed, which is the
  // right way round.
  const opened = await page.evaluate(() => {
    const h = [...document.querySelectorAll('.fg-head')].find(x => /^F\s*Food/i.test((x.innerText || '').trim()));
    if (!h) return null; h.click(); return (h.innerText || '').replace(/\s+/g, ' ').slice(0, 60);
  });
  console.log('OPENED SHELF:', opened);
  await page.waitForTimeout(800);
  const t = await bodyText(page);
  console.log('AFTER PICK >>>', t.slice(t.indexOf('Harris Teeter') - 200, t.indexOf('Harris Teeter') + 700));
  expect(t).toMatch(/Harris Teeter — Bel Air/);
  expect(t).toMatch(/2 of \d+ lines priced at your store; the rest are averages\./);
  expect(t).toMatch(/\$14\.99/);
  expect(t).toMatch(/12 pk/);
  // The sale and what it was, in the opened item ("On sale, was $18.49").
  expect(await openedPricedText(page, 'Harris Teeter — Bel Air:')).toMatch(/on sale, was \$18\.49/i);
  // THE TWO SENTENCES ABOUT ONE SET OF NUMBERS. The hero and the list must not
  // disagree: before priceNote() composed them, the hero read "these are
  // national average prices" two inches above "2 of 22 lines priced at your
  // store". Both true; together, misleading.
  const heroSaysStore = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.grounding')]
      .find(x => /national average prices|adjusted for/i.test(x.innerText || ''));
    return el ? (el.innerText || '').replace(/\s+/g, ' ') : 'NO HERO NOTE';
  });
  console.log('HERO NOTE:', heroSaysStore);
  // 18, not 22: the family's dishes are not hers to price (11/21/2026).
  // Batch 4 (owner, 11/24/2026): The Cookout's combined lines split into one line per product: 18 -> 43 lines.
  expect(heroSaysStore).toMatch(/2 of 43 lines priced at your store/);
});

test('HONEST FAILURE: no keys on the backend says so, and does not invent a price', async ({ page }) => {
  await page.route('**/api/shopping/kroger/locations**', r => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ configured: false }),
  }));
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle');
  await tapText(page, 'Check store prices');
  await page.waitForTimeout(300);
  await tapText(page, 'Find stores');
  await page.waitForTimeout(900);
  const t = await bodyText(page);
  console.log('NO KEYS >>>', t.slice(Math.max(0, t.indexOf('switched on') - 200), t.indexOf('switched on') + 120));
  expect(t).toMatch(/Store pricing is not switched on for this deployment\./);
  expect(t).not.toMatch(/\$\d+\.\d\d/);
});

test('NO STORE NEARBY: named, not a spinner that stops', async ({ page }) => {
  await page.route('**/api/shopping/kroger/locations**', r => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, locations: [] }),
  }));
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle');
  await tapText(page, 'Check store prices');
  await page.waitForTimeout(300);
  await tapText(page, 'Find stores');
  await page.waitForTimeout(900);
  const t = await bodyText(page);
  // COPY CHANGED 2026-09-24: "Kroger and its sister stores" put Kroger
  // ALONGSIDE the others, so a host with no Kroger nearby would not learn that
  // their Harris Teeter is one. The short form is now the ownership adjective.
  // "near there" since 11/18/2026: the box takes a town as well as a ZIP.
  expect(t).toMatch(/No Kroger-owned store near there/);
  expect(t).toMatch(/coverage is regional, and plenty of the map has none\. The estimate stands\./);
});

// ─── THE UNIT MAP, ON THE SCREEN ─────────────────────────────────────────────
//
// A shelf price only becomes a number a host can add up when the plan's units
// and the store's package can be reconciled. `src/lib/knowledge/storeUnitMap.js`
// is that reconciliation and it answers "no" for 428 of the corpus's 491 lines,
// so BOTH outcomes have to be visible here: the total where there is one, and
// the unchanged reference where there is not.
test('A LINE TOTAL, WITH ITS ARITHMETIC — and a reference where the units do not reconcile', async ({ page }) => {
  await page.route('**/api/shopping/kroger/locations**', r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ configured: true, locations: [
      { locationId: '01400943', name: 'Harris Teeter — Bel Air', address: '5 Bel Air S Pkwy' },
    ] }),
  }));
  await page.route('**/api/shopping/kroger/search-list', async (r) => {
    const sent = JSON.parse(r.request().postData() || '{}');
    // Priced BY NAME, matching whatever the plan actually sent, so this stub
    // cannot quietly invent a line the corpus does not contain.
    const results = (sent.items || []).map((i) => {
      const n = String(i.name || '');
      // On the unit map, sold by the bag: 4.29 bags rounds up to 5, and the
      // rounding is the part a host most needs to see.
      if (/^ice\b/i.test(n)) return { name: n, matched: true, price: 2.99, size: '7 lb', soldBy: 'UNIT' };
      // On the map, sold by weight: no rounding, you pay for what you need.
      if (/\brib/i.test(n)) return { name: n, matched: true, price: 4.99, size: '1 lb', soldBy: 'WEIGHT' };
      // A real price on a line the map refuses. "…ingredients" is the corpus's
      // own word for a basket — 9.2 lbs of "Baked mac & cheese ingredients" is
      // pasta AND cheese AND milk AND butter — and it is the single most
      // reliable refusal signal in the allowlist. Must stay a reference.
      if (/ingredients$/i.test(n)) return { name: n, matched: true, price: 9.99, size: '8 oz', soldBy: 'UNIT' };
      return { name: n, matched: false };
    });
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, results }) });
  });
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle');
  await tapText(page, 'Check store prices');
  await page.waitForTimeout(300);
  await tapText(page, 'Find stores');
  await page.waitForTimeout(800);
  await tapText(page, 'Harris Teeter');
  await page.waitForTimeout(1200);
  // Open every shelf — Ice is in Supplies, the proteins are in Food, and a
  // collapsed group renders no rows at all. The first run of the happy-path
  // test above asserted over a closed list and failed on the row while the
  // summary passed, which is the right way round.
  const shelves = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('.fg-head')];
    heads.forEach((h) => h.click());
    return heads.map((h) => (h.innerText || '').replace(/\s+/g, ' ').slice(0, 40));
  });
  console.log('SHELVES OPENED:', JSON.stringify(shelves));
  await page.waitForTimeout(900);
  // The arithmetic is in each priced line's opened item; the reference price
  // ($9.99 · 8 oz) is on the closed row.
  const t = (await bodyText(page)) + ' || ' + (await openedPricedText(page, 'Harris Teeter — Bel Air:'));

  // THE ROUNDING, DISCLOSED. You cannot buy 4.29 bags of ice.
  const ice = /(\d+) × 7 lb at \$2\.99 = \$[\d.]+ — covers ([\d.]+), you take home ([\d.]+) lbs/.exec(t);
  console.log('ICE MATH:', ice && ice[0]);
  expect(ice).toBeTruthy();
  expect(Number(ice[3])).toBeGreaterThanOrEqual(Number(ice[2]));   // enough, and it says by how much
  expect(Number(ice[3])).toBe(Number(ice[1]) * 7);                 // the stated maths reproduces itself

  // SOLD BY WEIGHT: no rounding clause at all, because nothing was rounded.
  const ribs = /([\d.]+) lbs at \$4\.99 per 1 lb = \$([\d.]+)\./.exec(t);
  console.log('RIBS MATH:', ribs && ribs[0]);
  expect(ribs).toBeTruthy();
  expect(Number(ribs[2])).toBeCloseTo(Number(ribs[1]) * 4.99, 1);
  expect(ribs[0]).not.toMatch(/covers/);

  // AND THE REFUSAL, which is the common case: a real $9.99 shelf price on a
  // basket line, shown as a reference and never multiplied into a total.
  expect(t).toMatch(/ingredients[\s\S]{0,120}\$9\.99 · 8 oz/);
  expect(t).not.toMatch(/× 8 oz at \$9\.99/);

  // The summary counts the two achievements apart.
  //
  // SELECTOR WIDENED 2026-09-24, after this went red on a product that was
  // right. It took the FIRST `.grounding` matching /priced at your store/ and
  // asserted the coverage sentence on it. Commit 7a33cce0 then added a second
  // element matching that same phrase — the hero's store subtotal, "$78 of it
  // priced at your store · 2 of 22 lines" — which sorts earlier in the DOM. The
  // test started reading the hero and reporting the coverage note missing.
  //
  // Both lines legitimately say "priced at your store": one is the money, one
  // is the reconciliation. So the assertion is now against ALL of them — the
  // claim was always "the sheet says this somewhere", never "this exact
  // element does".
  const notes = await page.evaluate(() =>
    [...document.querySelectorAll('.grounding')]
      .map(x => (x.innerText || '').replace(/\s+/g, ' '))
      .filter(t => /priced at your store/i.test(t)));
  console.log('COVERAGE NOTES:', JSON.stringify(notes));
  expect(notes.length, 'no element mentions the store subtotal at all').toBeGreaterThan(0);
  expect(notes.join(' || ')).toMatch(/convert to a line total/);
});

// ─── A TOWN, NOT ONLY A ZIP (owner, 11/18/2026) ─────────────────────────────
// "Zip input should also take city state and use the other city state lookup
// list we use in the app." The box is the app's CityField; a picked "City, ST"
// is placed by the geocoder WITH ITS STATE, then stores are found near it.
test('TOWN: a town picked from the list finds stores near it, with its state enforced', async ({ page }) => {
  const asked = { geo: null, loc: null };
  await page.route('**/api/weather/geocode**', (r) => {
    asked.geo = r.request().url();
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, result: { lat: 38.803384, lon: -76.9896507, name: 'Oxon Hill', state: 'Maryland' } }) });
  });
  await page.route('**/api/shopping/kroger/locations**', (r) => {
    asked.loc = r.request().url();
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, locations: [
      { locationId: '09700398', name: 'Harris Teeter - Old Town Alexandria', address: '735 N Saint Asaph St' },
    ] }) });
  });
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle');
  await tapText(page, 'Check store prices');
  const box = page.locator('input[aria-label="ZIP code or town to find a store near"]');
  await box.fill('Oxon Hi');
  await page.getByRole('button', { name: 'Oxon Hill, MD' }).first().click();   // from the app's own city list
  await expect(box).toHaveValue('Oxon Hill, MD');
  await page.locator('[data-find-stores]').click();
  await expect(page.getByText('Harris Teeter - Old Town Alexandria')).toBeVisible();
  expect(asked.geo).toMatch(/q=Oxon%20Hill%2C%20MD%2C%20US&state=MD/);
  expect(asked.loc).toMatch(/lat=38\.803384&lon=-76\.9896507/);
});

// THE WAIT IS VISIBLE (owner, 11/18/2026: "I need the looking notification to
// be more attention grabbing. Pulsing or something"). Both waits — finding
// stores, then checking prices at the one picked — show one pulsing status
// line that names what it is doing. The routes are held open so the line can
// be read mid-wait; releasing them must clear it.
test('WAITING: a pulsing status line names the store search, then the price check', async ({ page }) => {
  let releaseLoc; const locHeld = new Promise((r) => { releaseLoc = r; });
  let releasePrices; const pricesHeld = new Promise((r) => { releasePrices = r; });
  await page.route('**/api/shopping/kroger/locations**', async (r) => {
    await locHeld;
    await r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ configured: true, locations: [{ locationId: '01400943', name: 'Harris Teeter — Bel Air', address: '5 Bel Air S Pkwy' }] }) });
  });
  await page.route('**/api/shopping/kroger/search-list', async (r) => {
    await pricesHeld;
    const names = (JSON.parse(r.request().postData() || '{}').items || []).map(i => i.name);
    await r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ configured: true, results: names.map((name) => ({ name, matched: false })) }) });
  });
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'store layer not configured in this bundle');
  await tapText(page, 'Check store prices');
  await page.waitForTimeout(300);
  await tapText(page, 'Find stores');

  const busy = page.locator('[data-store-busy]');
  await expect(busy).toBeVisible();
  await expect(busy).toHaveAttribute('role', 'status');
  await expect(busy).toContainText(/Looking for stores near 21014/);
  const pulse = await busy.locator('.store-busy-dot').evaluate((el) => getComputedStyle(el).animationName);
  expect(pulse).toBe('storeping');

  releaseLoc();
  await expect(busy).toHaveCount(0);
  await tapText(page, 'Harris Teeter');
  await expect(busy).toBeVisible();
  await expect(busy).toContainText(/Checking \d+ prices? at Harris Teeter — Bel Air/);

  releasePrices();
  await expect(busy).toHaveCount(0);
});
