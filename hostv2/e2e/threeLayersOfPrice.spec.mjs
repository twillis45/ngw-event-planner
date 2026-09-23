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
import { test, expect, settled } from './fixtures.mjs';

// Is layer 2 reachable in the bundle under test? Read from the running app, not
// from the environment of the process running the test — those are different
// machines' worth of state, and only one of them is what a host loads.
const storeLayerOffered = (page) => page.evaluate(() => [...document.querySelectorAll('button')]
  .some((x) => /Price this list at a store near you/i.test(x.innerText || '')));

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
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
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-3l');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, venueCity);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, "what you.?re serving");
  await page.waitForTimeout(1600);
  await settled(page);
  await tapText(page, 'The list[\\s\\S]*bought');
  await page.waitForTimeout(1600);
  await settled(page);
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
  expect(t).not.toMatch(/Price this list at a store near you/i);
  expect(t).not.toMatch(/priced at your store/i);
});

test('CONFIGURED BUILD OFFERS IT, and says what it will and will not do', async ({ page }) => {
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle — covered by the test above');
  const t = await bodyText(page);
  expect(t).toMatch(/beside your estimate, never instead of it/i);
});

test('PICKER: opens with the venue ZIP prefilled', async ({ page }) => {
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle');
  await tapText(page, 'Price this list at a store near you');
  await page.waitForTimeout(400);
  const zip = await page.evaluate(() => {
    const i = document.querySelector('input[aria-label="ZIP code to find a store near"]');
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
  await tapText(page, 'Price this list at a store near you');
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
  expect(t).toMatch(/on sale, was \$18\.49/);
  expect(t).toMatch(/12 pk/);
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
  expect(heroSaysStore).toMatch(/2 of 22 lines priced at your store/);
});

test('HONEST FAILURE: no keys on the backend says so, and does not invent a price', async ({ page }) => {
  await page.route('**/api/shopping/kroger/locations**', r => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ configured: false }),
  }));
  await openList(page, '21014');
  test.skip(!(await storeLayerOffered(page)), 'unconfigured bundle');
  await tapText(page, 'Price this list at a store near you');
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
  await tapText(page, 'Price this list at a store near you');
  await page.waitForTimeout(300);
  await tapText(page, 'Find stores');
  await page.waitForTimeout(900);
  const t = await bodyText(page);
  expect(t).toMatch(/No store near that ZIP in this chain’s family\. The estimate stands\./);
});
