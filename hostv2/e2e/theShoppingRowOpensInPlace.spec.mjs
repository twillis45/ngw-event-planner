// ─── THE SHOPPING ROW OPENS IN PLACE (owner, 11/24/2026: "build it") ─────────
//
// The food list's row redesign, renders f-1 to f-4:
//   1. the check is its own big target and only checks; the rest of the row
//      opens the item;
//   2. the opened item scrolls to the top and reads as three labeled groups,
//      Amount, Price and Where to buy, with one lit "Mark … bought" and Skip
//      alone at the bottom;
//   3. the host's price says what it is: "est." or "you paid";
//   4. a store run can be "I'm at <the store you priced>";
//   5. diet tags are plain English;
//   6. a Bringing dish takes a typed name with a lit Save.
//
// No real store is called: the Kroger routes are stubbed, with a made-up store.
import { test, expect, settled, dateIn, openSectionByName, sheetSettled } from './fixtures.mjs';

const ALL_SET = {
  hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts',
  turkey_method: 'Roasted in the oven',
  dietary_table: 'Nobody — the traditional menu works for everyone',
  service_style: 'Sit-down — everyone at the table',
  serve_time: 'Late afternoon, around 4 or 5',
  overnight_guests: 'No — everyone is local',
  // Chip diets flag lines without counting anyone (playbooks chipDiets).
  dietary: ['Pescatarian', 'Dairy-free'],
};
const seed = (id, extra) => ({
  id, name: 'Our Thanksgiving', type: 'Thanksgiving Hosting', date: dateIn(20), startTime: '16:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Bel Air, MD 21014', venueCity: '21014',
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host', totalBudget: 60000,
  guests: Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'Yes' })),
  budget: [], vendors: [], timeline: [], createdAt: new Date().toISOString(),
  foodChoices: ALL_SET,
  ...extra,
});
const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};
const sheet = (page) => page.locator('.sheet').last();
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
const foodGroup = (page) => sheet(page).locator('.fgroup', { has: page.locator('.fg-label', { hasText: /^Food/ }) }).first();
const openShopList = async (page) => {
  await openSectionByName(page, /spread/i);
  await sheetSettled(page);
  const g = foodGroup(page);
  await expect(g).toBeVisible();
  if (!(await g.locator('[data-food-row]').count())) await g.locator('.fg-head').click();
  await expect(g.locator('[data-food-row="p_turkey"]')).toBeVisible();
};
const turkeyRow = (page) => sheet(page).locator('.frow[data-food-row="p_turkey"]');
const turkeyOpen = (page) => sheet(page).locator('[data-food-open="p_turkey"]');

test('the check is its own big target, and it checks without opening', async ({ page }) => {
  await boot(page, seed('e2e-row-check', {}));
  await openShopList(page);
  const check = turkeyRow(page).getByRole('button', { name: /^Mark Turkey bought$/ });
  const box = await check.boundingBox();
  expect(box.width, 'the check target is at least 48px wide').toBeGreaterThanOrEqual(48);
  expect(box.height, 'the check target is at least 48px tall').toBeGreaterThanOrEqual(48);
  await check.click();
  await page.waitForTimeout(300);
  expect((await stored(page)).foodGot.p_turkey).toBe(true);
  await expect(turkeyRow(page)).toHaveClass(/\bgot\b/);
  await expect(sheet(page).locator('[data-food-open]')).toHaveCount(0);
  // No "tune" or "more" left on any row.
  expect(await foodGroup(page).getByRole('button', { name: /^(tune|more)$/ }).count()).toBe(0);
});

test('a row tap opens the item in place: three groups, scrolled to the top', async ({ page }) => {
  // Under reduced motion the scroll is instant, so it is measured at once.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page, seed('e2e-row-open', {}));
  await openShopList(page);
  await turkeyRow(page).getByRole('button', { name: /^Open Turkey/ }).click();
  const open = turkeyOpen(page);
  await expect(open).toBeVisible();
  const heads = await open.locator('[data-fo-sec] h3').evaluateAll((els) => els.map((e) => e.firstChild.textContent.trim()));
  expect(heads).toEqual(['Amount', 'Price', 'Where to buy']);
  await expect(open.locator('[data-fo-sec="amount"]')).toContainText(/1\.5 lb a guest · 12 guests/);
  await expect(open.getByRole('button', { name: 'Mark Turkey bought' }).last()).toBeVisible();
  await expect(open.getByRole('button', { name: /^Low end · \$\d+/ })).toBeVisible();
  await expect(open.getByRole('button', { name: /^High end · \$\d+/ })).toBeVisible();
  // The tune panel's pieces are all still here.
  await expect(open.getByRole('button', { name: /^Grocery$/ })).toBeVisible();
  await expect(open.getByRole('button', { name: /^Less Turkey$/ })).toBeVisible();
  // Near the top of the sheet's scroll area, under nothing but the sheet head.
  const near = await open.evaluate((el) => {
    let s = el.parentElement;
    while (s && !(s.scrollHeight > s.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
    const top = s ? s.getBoundingClientRect().top : 0;
    return Math.round(el.getBoundingClientRect().top - Math.max(0, top));
  });
  expect(near, `the opened item sits ${near}px below the top of its scroller`).toBeGreaterThanOrEqual(-2);
  expect(near).toBeLessThan(140);
  // The lit button checks it off, same writer as the box.
  await open.locator('.fo-foot').getByRole('button', { name: 'Mark Turkey bought' }).click();
  await page.waitForTimeout(300);
  expect((await stored(page)).foodGot.p_turkey).toBe(true);
});

test('Skip is the last control in the item, and the skipped row restores on a tap', async ({ page }) => {
  await boot(page, seed('e2e-row-skip', {}));
  await openShopList(page);
  // Skip is off the closed row.
  expect(await foodGroup(page).getByRole('button', { name: /^skip it$/i }).count()).toBe(0);
  await turkeyRow(page).getByRole('button', { name: /^Open Turkey/ }).click();
  const names = await turkeyOpen(page).locator('button').evaluateAll((bs) => bs.map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()));
  expect(names[names.length - 1]).toBe('Skip Turkey');
  await turkeyOpen(page).getByRole('button', { name: 'Skip Turkey' }).click();
  await page.waitForTimeout(300);
  expect((await stored(page)).foodSkip.p_turkey).toBe(true);
  await expect(turkeyRow(page)).toHaveClass(/\bskipped\b/);
  await expect(turkeyRow(page)).toContainText('skipped — tap to restore');
  await turkeyRow(page).locator('.f-body').click();
  await page.waitForTimeout(300);
  expect(((await stored(page)).foodSkip || {}).p_turkey).toBeFalsy();
  await expect(turkeyRow(page)).not.toHaveClass(/\bskipped\b/);
});

test('the price says what it is: "est." until she types what she paid, then "you paid"', async ({ page }) => {
  await boot(page, seed('e2e-row-paid', {}));
  await openShopList(page);
  await expect(turkeyRow(page).locator('.f-price')).toContainText(/\$\d+–\$\d+\s*est\./);
  await expect(foodGroup(page).locator('.fg-sub')).toContainText(/\$\d+–\$\d+ est\.$/);
  // The rate stays on the closed row (aRateIsNotFree).
  await expect(turkeyRow(page).locator('.v-meta').first()).toContainText(/\$[\d.]+–\$[\d.]+\/lb/);
  await turkeyRow(page).getByRole('button', { name: /^Open Turkey/ }).click();
  const box = turkeyOpen(page).getByLabel('What you paid for Turkey');
  await box.fill('42.50'); await box.press('Enter');
  await settled(page);
  const ev = await stored(page);
  expect(ev.foodLocked.p_turkey).toBe(42.5);
  expect(ev.foodReal.p_turkey).toBe(true);
  // "back to estimate" is still reachable in the item.
  await expect(turkeyOpen(page).getByRole('button', { name: /back to the estimate/i })).toBeVisible();
  await turkeyOpen(page).getByRole('button', { name: 'Close Turkey' }).click();
  await expect(turkeyRow(page).locator('.f-price')).toContainText(/\$42\.50\s*you paid/);
});

const stubStore = (page) => Promise.all([
  page.route('**/api/shopping/kroger/locations**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ configured: true, locations: [
      { locationId: '99000001', name: 'Elm Market — Springfield', address: '1 Elm St, Bel Air, MD 21014' },
    ] }),
  })),
  page.route('**/api/shopping/kroger/search-list', async (r) => {
    const sent = JSON.parse(r.request().postData() || '{}');
    const results = (sent.items || []).map((i) => {
      if (i.purchaseId === 'p_turkey') return { name: i.name, matched: true, price: 2.49, promoPrice: 1.49, size: '1 lb', soldBy: 'WEIGHT', description: 'Elm Market Frozen Whole Turkey' };
      if (i.purchaseId === 'p_rolls') return { name: i.name, matched: true, price: 2.79, size: '12 ct', soldBy: 'UNIT', description: 'Elm Market Dinner Rolls 12 ct' };
      return { name: i.name, matched: false };
    });
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, results }) });
  }),
]);

test('a store run by the priced store\'s name: "I\'m at Elm Market — Springfield"', async ({ page }) => {
  await stubStore(page);
  await boot(page, seed('e2e-row-run', {}));
  await openShopList(page);
  await sheet(page).getByRole('button', { name: /Check store prices/ }).click();
  await sheet(page).getByRole('button', { name: /^Find stores$/ }).click();
  await sheet(page).getByRole('button', { name: /Elm Market — Springfield/ }).first().click();
  await sheetSettled(page);
  const chip = sheet(page).locator('.chiprail .chip', { hasText: /Elm Market — Springfield/ });
  await expect(chip).toHaveText('Elm Market — Springfield');
  await chip.click();
  await expect(chip).toHaveText('I’m at Elm Market — Springfield');
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  const g = foodGroup(page);
  await expect(g.getByRole('button', { name: /^Check off all \d+ here$/ })).toBeVisible();
  // The turkey leads with the store's product and its shelf price.
  const row = g.locator('.frow[data-food-row="p_turkey"]');
  await expect(row.locator('.r-prod')).toHaveText('Elm Market Frozen Whole Turkey');
  await expect(row.locator('.f-price')).toContainText('$1.49');
  const cb = await row.getByRole('button', { name: /^Mark Turkey bought$/ }).boundingBox();
  expect(Math.min(cb.width, cb.height), 'a 64px check in the store').toBeGreaterThanOrEqual(64);
  // A line with no shelf price at this store falls back to the estimate.
  // (Any such line: the plan's combined lines are being split, so no id.)
  const noShelf = g.locator('.frow[data-food-row]', { hasText: 'no shelf price here' }).first();
  await expect(noShelf).toBeVisible();
  await expect(noShelf.locator('.f-price')).toContainText('est.');
  // The store-type chips read "I'm at <type>" too, when pressed.
  const grocery = sheet(page).locator('.chiprail .chip', { hasText: /^(I’m at )?Grocery$/ });
  await expect(grocery).toHaveText('Grocery');
  await grocery.click();
  await expect(grocery).toHaveText('I’m at Grocery');
  await expect(chip).toHaveText('Elm Market — Springfield');
});

test('diet tags are plain English, on the list and on Bringing', async ({ page }) => {
  await boot(page, seed('e2e-row-diet', {}));
  await openShopList(page);
  await expect(turkeyRow(page).locator('.f-name .tag').first()).toHaveText('Not pescatarian');
  const bring = sheet(page).locator('[data-bringer-row="p_mac"]');
  await expect(bring).toContainText('Has dairy');
  expect(await sheet(page).locator('.tag', { hasText: /not pesc\.|^dairy$/ }).count()).toBe(0);
});

test('Bringing: a typed name gets a lit Save; "Not serving it" sits alone at the bottom', async ({ page }) => {
  await boot(page, seed('e2e-row-bring', {}));
  await openSectionByName(page, /spread/i);
  await sheetSettled(page);
  await sheet(page).locator('[data-bringer-row="p_mac"]').click();
  const card = sheet(page).locator('[data-bringer-row="p_mac"]');
  await expect(card.getByText('Who is bringing it?')).toBeVisible();
  await card.getByLabel(/Who is bringing/).selectOption({ label: 'Someone not on the list…' });
  await card.locator('[data-bringer-text]').fill('Ruth Kim');
  const save = card.getByRole('button', { name: 'Save — Ruth Kim brings it' });
  await expect(save).toBeVisible();
  await expect(save).toHaveClass(/\bcta\b/);
  const names = await card.locator('button').evaluateAll((bs) => bs.map((b) => (b.innerText || '').trim()));
  expect(names[names.length - 1]).toBe('Not serving it');
  await save.click();
  await page.waitForTimeout(300);
  expect((await stored(page)).foodOwner.p_mac).toBe('Ruth Kim');
  await expect(sheet(page).locator('[data-bringer-row="p_mac"]')).toContainText('Ruth Kim');
});
