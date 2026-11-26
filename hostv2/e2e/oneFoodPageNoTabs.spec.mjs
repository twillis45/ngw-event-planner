// ─── ONE FOOD PAGE, NO TABS (owner-approved renders 9a, 9b, 9c, 11/24/2026) ──
//
// "The spread & shopping" drops its Plan / Bringing / Shop tabs and is one
// scroll, in this order:
//   1. the estimate card;
//   2. "Your choices" (menu, dietary needs, how it's sourced), which shrinks to
//      the two-line green "✓ Choices set" once all three are settled;
//   3. "Bringing", only when someone else brings dishes, with its own collapse;
//   4. the shopping list by group.
// The header and the bottom bar ("N of M bought" / Done) stay. Every door that
// opened 'foodplan', 'bringing' or 'food' lands on its section of the one page.
// One source for each piece: a brought dish is listed once, and the list's
// actions once.
import { test, expect, settled, dateIn, openSectionByName, sheetSettled } from './fixtures.mjs';

const ALL_SET = {
  hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts',
  turkey_method: 'Roasted in the oven',
  dietary_table: 'Nobody — the traditional menu works for everyone',
  drinks: 'Wine with dinner, sparkling cider for everyone', // Thanksgiving asks since 11/26/2026
  service_style: 'Sit-down — everyone at the table',
  serve_time: 'Late afternoon, around 4 or 5',
  overnight_guests: 'No — everyone is local',
};
const { turkey_method: _open, ...MENU_OPEN } = ALL_SET;
const BROUGHT = ['p_potatoes', 'p_cranberry', 'p_green_beans', 'p_sweet_potatoes', 'p_mac', 'p_corn', 'p_roast_veg', 'p_pies'];
const NAMED = Object.fromEntries(BROUGHT.map((k, i) => [k, 'Guest ' + (i + 1)]));
const seed = (id, extra) => ({
  id, name: 'Our Thanksgiving', type: 'Thanksgiving Hosting', date: dateIn(20), startTime: '16:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host', totalBudget: 60000,
  guests: Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'Yes' })),
  budget: [], vendors: [], timeline: [], createdAt: new Date().toISOString(),
  snoozed: { 'decision:dietary': dateIn(4) },
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
const openSpread = async (page) => {
  await openSectionByName(page, /spread/i);
  await sheetSettled(page);
  await page.waitForTimeout(500);
};
const tops = (page) => page.evaluate(() => {
  const sh = [...document.querySelectorAll('.sheet')].pop();
  const y = (el) => (el ? Math.round(el.getBoundingClientRect().top + sh.querySelector('.sheet-body').scrollTop) : null);
  const est = [...sh.querySelectorAll('*')].find((e) => e.childElementCount === 0 && /estimate, all in/.test(e.textContent));
  return {
    estimate: y(est),
    choices: y(sh.querySelector('[data-food-section="choices"]')),
    bringing: y(sh.querySelector('[data-food-section="bringing"]')),
    list: y(sh.querySelector('[data-food-section="list"]')),
  };
});
// Is a section's head inside the scroller's visible band?
const inView = (page, sec) => page.evaluate((s) => {
  const sh = [...document.querySelectorAll('.sheet')].pop();
  const body = sh.querySelector('.sheet-body');
  const el = sh.querySelector(`[data-food-section="${s}"]`);
  if (!el) return false;
  const b = body.getBoundingClientRect(); const r = el.getBoundingClientRect();
  return r.top >= b.top - 2 && r.top < b.bottom - 60;
}, sec);

test('no tabs: one scroll, estimate → Your choices → Bringing → the list, and the bar stays', async ({ page }) => {
  await boot(page, seed('e2e-onepage-order', { foodChoices: MENU_OPEN }));
  await openSpread(page);
  expect(await sheet(page).locator('[role="tab"], .fmodes').count()).toBe(0);
  await expect(sheet(page).locator('#sheet-title')).toHaveText('The spread & shopping');
  const t = await tops(page);
  expect(t.estimate, JSON.stringify(t)).not.toBeNull();
  expect(t.choices).toBeGreaterThan(t.estimate);
  expect(t.bringing).toBeGreaterThan(t.choices);
  expect(t.list).toBeGreaterThan(t.bringing);
  // Your choices names the three things, plainly.
  const labels = await sheet(page).locator('[data-food-section="choices"] .fstat-l').allInnerTexts();
  expect(labels.map((l) => l.trim())).toEqual(['Menu', 'Dietary needs', 'How it’s sourced']);
  // The bar keeps counting what she buys.
  await expect(page.locator('.ftotal')).toContainText(/\d+ of \d+ bought/);
  // One source: the brought dishes are listed once (in Bringing, not again in
  // the list), and the list's actions once.
  expect(await sheet(page).locator('[data-brought-group]').count()).toBe(0);
  expect(await sheet(page).locator('[data-bringer-row="p_potatoes"]').count()).toBe(1);
  expect(await sheet(page).getByRole('button', { name: 'Copy the shopping list', exact: true }).count()).toBe(1);
  expect(await sheet(page).getByRole('button', { name: 'Search Instacart', exact: true }).count()).toBe(1);
});

test('all choices settled: "Your choices" shrinks to the two-line green "Choices set", and reopens', async ({ page }) => {
  await boot(page, seed('e2e-onepage-set', { foodChoices: ALL_SET, dietaryNoted: true, sourcing: 'grocery' }));
  await openSpread(page);
  const set = sheet(page).locator('[data-food-section="choices"] [data-done-fold]');
  await expect(set).toBeVisible();
  await expect(set).toContainText('✓');
  await expect(set).toContainText('Choices set');
  await expect(set.locator('.done-sub')).toBeVisible();
  expect(await sheet(page).locator('[data-food-section="choices"] .fstat').count()).toBe(0);
  await set.click();
  await expect(sheet(page).locator('[data-food-section="choices"] .fstat-l', { hasText: 'Menu' })).toBeVisible();
});

test('no brought dishes, no Bringing section', async ({ page }) => {
  // A birthday at home: nobody else carries a dish.
  await boot(page, seed('e2e-onepage-nobring', { type: 'Birthday Party', name: 'Sam turns 40', foodChoices: {}, snoozed: {} }));
  await openSpread(page);
  expect(await sheet(page).locator('[data-bringer-row]').count()).toBe(0);
  expect(await sheet(page).locator('[data-food-section="bringing"]').count()).toBe(0);
  await expect(sheet(page).locator('[data-food-section="list"]')).toBeVisible();
  expect(await sheet(page).locator('[role="tab"], .fmodes').count()).toBe(0);
});

// Each door's rule (lib/foodBringing foodSheetKind) now names a section.
// Everything she buys, bought (from everyFoodDoorAsksTheRule): with a brought
// dish unnamed the rule says Bringing. Batch 4 split Thanksgiving's "Wine, red
// and white" into two lines, so the white is bought too (the same input change
// everyFoodDoorAsksTheRule took).
const BOUGHT = Object.fromEntries(['p_turkey', 'p_stuffing', 'p_gravy', 'p_gravy_thickener', 'p_rolls', 'p_rolls_butter',
  'p_appetizers', 'p_appetizers_crackers', 'p_appetizers_nuts', 'p_appetizers_crudite', 'p_wine_cider', 'p_wine_cider_white', 'p_cider',
  'p_coffee', 'p_coffee_tea', 'p_coffee_whipped', 'p_coffee_icecream', 'p_thermometer', 'p_roasting_kit', 'p_roasting_foil',
  'p_roasting_twine', 'p_leftover_containers', 'p_leftover_bags', 'p_leftover_labels', 'p_cleanup', 'p_cleanup_soap',
  'p_cleanup_towels', 'p_cleanup_detergent'].map((k) => [k, true]));
test.describe('every door lands on its section', () => {
  test('a menu question open: Your choices', async ({ page }) => {
    await boot(page, seed('e2e-onepage-door-plan', { foodChoices: MENU_OPEN }));
    await openSpread(page);
    expect(await inView(page, 'choices')).toBe(true);
  });
  test('the menu settled, buying left: the list', async ({ page }) => {
    await boot(page, seed('e2e-onepage-door-shop', { foodChoices: ALL_SET, foodOwner: NAMED }));
    await openSpread(page);
    expect(await inView(page, 'list')).toBe(true);
  });
  test('all bought, a brought dish unnamed: Bringing', async ({ page }) => {
    await boot(page, seed('e2e-onepage-door-bring', { foodChoices: ALL_SET, foodGot: BOUGHT }));
    await openSpread(page);
    expect(await inView(page, 'bringing')).toBe(true);
  });
});
