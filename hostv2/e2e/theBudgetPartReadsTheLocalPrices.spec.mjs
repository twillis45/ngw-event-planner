// ─── THE BUDGET PART READS THE LOCAL PRICES (hero-clears sweep, 11/20/2026) ───
//
// The budget sheet prices the host's bought food at her REGION's prices (the
// food-prices factor and its per-item factors). The plan's Budget part — the
// board index and the hero's "Known costs are $N over your budget" — priced
// the same lines at the national baseline (hostSpending at factor 1). Where
// local prices run below national, a host inside her number read "left to
// spend" on the sheet while the hero kept telling her she was over.
//
// Built here the way a host gets there: the shelves checked off in the
// sheet, the region's factor from the price service (mocked), and a budget
// set between the national and the local total.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const EV = {
  id: 'E2E_local_prices', name: 'Maya’s 40th', type: 'Birthday', date: dateIn(30),
  guestMode: 'count', guestEstimate: 40, guestCountSource: 'host',
  venue: 'Lakeside Hall', venueAddress: '12 Oak St, Austin, TX 78701', venueCity: 'Austin, TX', venueState: 'TX',
  startTime: '18:00', startTimeSource: 'host',
  budget: [], vendors: [], timeline: [], guests: [],
  foodChoices: { food_style: 'Order pizza/trays', alcohol: 'No alcohol', theme: 'Casual / no theme', cake: 'Order a cake' },
};

const mockPrices = (page, factor) => page.route('https://e2e-mock.invalid/api/food-prices**', (route) => route.fulfill({
  status: 200,
  json: { factor, region: 'south', region_label: 'South', month: '2026-10', source: 'BLS Average Price', basis: 'regional', items_used: 7, basket: [1, 2, 3, 4, 5, 6, 7], item_factors: {} },
}));

const boot = async (page, ev) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};
// The board's own Budget tile: "$N spoken for · $M spent" once a budget is set.
const spokenFor = async (page) => {
  const tile = page.getByRole('button', { name: /^Budget \$[\d,]+ .*spoken for/ }).first();
  await tile.waitFor({ state: 'visible' });
  const m = /\$([\d,]+) spoken for/i.exec((await tile.getAttribute('aria-label')) || (await tile.innerText()));
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

test('a host inside her number at local prices is not told she is over', async ({ browser }) => {
  // 1 · Check every shelf off in the sheet, at national prices; read the total.
  const a = await browser.newPage();
  await mockPrices(a, 1);
  await boot(a, { ...EV, totalBudget: 999999 });
  await a.locator('.srail-row', { hasText: 'The spread & shopping' }).first().click();
  const sheet = a.locator('.sheet').last();
  // One food page (owner, 11/24/2026): no Shop tab, and the list is always open.
  // One food page (owner, 11/24/2026): no Shop tab, and the list is always open.
  for (let k = 0; k < 8; k++) {
    const all = sheet.getByRole('button', { name: /^Check off all/ });
    if (await all.count()) { await all.first().click(); continue; }
    const shut = sheet.locator('.fgroup:not(.open) .fg-head').filter({ hasNotText: /all \d+ bought/ });
    if (!(await shut.count())) break;
    await shut.first().click();
  }
  await a.keyboard.press('Escape');
  const national = await spokenFor(a);
  const foodGot = await a.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].foodGot);
  await a.close();
  expect(national).toBeGreaterThan(100);

  // 2 · The same plan where local prices run at 60% of national.
  const b = await browser.newPage();
  await mockPrices(b, 0.6);
  await boot(b, { ...EV, foodGot, totalBudget: 999999 });
  const local = await spokenFor(b);
  expect(local).toBeLessThan(national);
  await b.close();

  // 3 · Her budget sits between the two. Locally she is inside it.
  const budget = Math.round((national + local) / 2);
  const c = await browser.newPage();
  await mockPrices(c, 0.6);
  await boot(c, { ...EV, foodGot, totalBudget: budget });
  await expect.poll(() => spokenFor(c)).toBe(local);
  const part = await c.locator('[aria-label^="Budget — "]').first().getAttribute('aria-label');
  const hero = await c.locator('.hero').first().innerText();
  expect(hero).not.toMatch(/over your budget/i);
  expect(part).toMatch(/handled/);
  await c.close();
});
