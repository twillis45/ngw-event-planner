// ─── ONE RECORD FOR WHO BRINGS EACH DISH (owner's iPad, 11/21/2026) ─────────
//
// Owner report, a Thanksgiving where the guests bring the sides: "When going
// from hero to food decide when to go to plan vs shopping tab. Items need place
// to assign helpers and linked to other places that reference the same in app.
// Bringing doesn't update when the other screens update the assigned bringing
// information. Single sources not duplicative sources."
//
// On his screen the same sides read as "skipped — tap to restore" on Shop, as a
// "Your friends" chip beside "skip it" on Shop, and as "friends are bringing"
// on Bringing; Shop counted them in "0 of 8 bought" and "Check off all 8".
//
// `event.foodOwner` is the one record. A name set on Bringing is on Shop and
// Plan; a name set on Shop is on Bringing; a brought dish is neither bought nor
// skipped; and the spread opens on the tab the work is on.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const ALL_SET = {
  hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts',
  turkey_method: 'Roasted in the oven',
  dietary_table: 'Nobody — the traditional menu works for everyone',
  service_style: 'Sit-down — everyone at the table',
  serve_time: 'Late afternoon, around 4 or 5',
  overnight_guests: 'No — everyone is local',
};
const seed = (id, extra) => ({
  id, name: 'Our Thanksgiving', type: 'Thanksgiving Hosting', date: dateIn(10), startTime: '16:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host', totalBudget: 60000,
  guests: [
    { id: 'g1', name: 'Jordan Pike', rsvp: 'Yes' },
    { id: 'g2', name: 'Ana Reyes', rsvp: 'Yes' },
    ...Array.from({ length: 10 }, (_, i) => ({ id: 'gx' + i, name: 'Guest ' + (i + 1), rsvp: 'Yes' })),
  ],
  budget: [], vendors: [], timeline: [], createdAt: new Date().toISOString(),
  snoozed: { 'decision:dietary': dateIn(4) },
  ...extra,
});
const boot = async (page, ev, route = '?elegant=1') => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto(route);
  await settled(page);
};
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
const sheet = (page) => page.locator('.sheet').last();
const tab = (page, name) => page.getByRole('tab', { name });
const selectedTab = (page) => page.locator('.fmodes [role="tab"][aria-selected="true"]').first().innerText();
const openTab = async (page, name) => { await tab(page, name).first().click(); await settled(page); };
const broughtGroup = (page) => sheet(page).locator('[data-brought-group]');
const openBroughtGroup = async (page) => {
  const g = broughtGroup(page);
  await expect(g).toBeVisible();
  if (!(await g.evaluate((el) => el.classList.contains('open')))) await g.locator('.fg-head').click();
  await expect(g.locator('.fstat').first()).toBeVisible();
};
// The Shop list sits behind "The list" drill-in row.
const openShopList = async (page) => {
  const row = sheet(page).locator('.fstat', { hasText: 'The list' }).first();
  if (await row.count()) { await row.click(); await settled(page); }
};

test('a name set on Bringing is on Shop and on Plan', async ({ page }) => {
  await boot(page, seed('e2e-bring-1', { foodChoices: ALL_SET }));
  await openSectionByName(page, /spread/i);
  await settled(page);
  await openTab(page, /^Bringing · \d+$/);
  const n = Number((await tab(page, /^Bringing · \d+$/).first().innerText()).match(/\d+/)[0]);
  await sheet(page).locator('.fstat', { hasText: 'Mac and cheese' }).first().click();
  // The picker offers the guest list.
  await sheet(page).getByLabel(/Who is bringing/).selectOption('Jordan Pike');
  await expect.poll(async () => (await saved(page)).foodOwner || {}).toEqual({ p_mac: 'Jordan Pike' });
  await expect(sheet(page).locator('[data-bringer-row="p_mac"]')).toContainText('Jordan Pike');

  await openTab(page, 'Shop');
  await openShopList(page);
  await openBroughtGroup(page);
  await expect(broughtGroup(page).locator('.fg-label')).toHaveText(`Your guests are bringing (${n})`);
  await expect(broughtGroup(page).locator('[data-bringer-row="p_mac"]')).toContainText('Jordan Pike');
  await expect(broughtGroup(page).locator('.fg-sub')).toContainText(`1 of ${n} named`);
  // Close the list (the bar's Done) before the Plan tab: an open drill-in
  // stays open across tabs.
  await page.locator('.ftotal').getByRole('button', { name: 'Done' }).click();

  await openTab(page, 'Plan');
  await expect(sheet(page).locator('[data-plan-bringing]')).toContainText(`1 of ${n} named`);
  await sheet(page).locator('[data-plan-bringing]').click();
  await settled(page);
  expect(await selectedTab(page)).toMatch(/^Bringing/);
});

test('a name set on Shop is on Bringing, and on the guest\'s row', async ({ page }) => {
  await boot(page, seed('e2e-bring-2', { foodChoices: ALL_SET }));
  await openSectionByName(page, /spread/i);
  await settled(page);
  expect(await selectedTab(page)).toBe('Shop');
  await openShopList(page);
  await openBroughtGroup(page);
  const beans = broughtGroup(page).locator('[data-bringer-row="p_green_beans"]');
  await expect(beans).toContainText('Add a name');
  await beans.click();
  await broughtGroup(page).getByLabel(/Who is bringing/).selectOption('Ana Reyes');
  await expect.poll(async () => ((await saved(page)).foodOwner || {}).p_green_beans).toBe('Ana Reyes');
  await expect(broughtGroup(page).locator('[data-bringer-row="p_green_beans"]')).toContainText('Ana Reyes');

  await openTab(page, /^Bringing · \d+$/);
  await expect(sheet(page).locator('[data-bringer-row="p_green_beans"]')).toContainText('Ana Reyes');

  // The guest list reads the same record: her row names the dish.
  // The door reads "Guests & invite" since 11/24/2026 (owner); was /^Guests$/.
  await openSectionByName(page, /^Guests & invite$|Guest list|People/);
  await settled(page);
  await page.locator('.rrow', { hasText: 'Ana Reyes' }).locator('.grow button').first().click();
  await expect(page.locator('.gdetail').first()).toContainText('Helping with: Green beans');
});

test('a brought dish is not bought, not skipped, and not in the counts; an old "skip" that meant brought is undone', async ({ page }) => {
  // The owner's data: three sides the guests bring, skipped before brought
  // dishes existed, and one of the host's own lines really skipped.
  await boot(page, seed('e2e-bring-3', {
    foodChoices: ALL_SET,
    foodSkip: { p_potatoes: true, p_sweet_potatoes: true, p_rolls: true },
  }));
  await expect.poll(async () => (await saved(page)).foodSkip).toEqual({ p_rolls: true });
  await openSectionByName(page, /spread/i);
  await settled(page);
  await openShopList(page);
  const food = sheet(page).locator('.fgroup', { has: page.locator('.fg-label', { hasText: /^Food/ }) }).first();
  if (!(await food.evaluate((el) => el.classList.contains('open')))) await food.locator('.fg-head').click();
  // None of the guests' dishes is on the host's shelf, struck through or not.
  for (const dish of ['Potatoes', 'Sweet potatoes', 'Green beans', 'Mac and cheese', 'Cranberry']) {
    await expect(food.locator('.frow', { hasText: dish })).toHaveCount(0);
  }
  // The host's own skip stays a skip, and the rolls' butter (its own line since
  // the 11/23/2026 split, part of the rolls) is skipped with them.
  await expect(food.locator('.frow.skipped', { hasText: 'Dinner rolls' })).toHaveCount(1);
  await expect(food.locator('.frow.skipped', { hasText: 'Butter for the rolls' })).toHaveCount(1);
  // "N of M bought" and "Check off all M" count what she buys, and only that.
  const active = await food.locator('.frow:not(.skipped)').count();
  await expect(food.locator('.fg-sub')).toHaveText(new RegExp(`^0 of ${active} bought`));
  await expect(food.getByRole('button', { name: `Check off all ${active}` })).toBeVisible();
  // The pinned bar matches the shelves: every host line, none of the guests'.
  const shelves = await sheet(page).locator('.fgroup:not([data-brought-group]) .frow:not(.skipped)').count();
  const allOpen = await sheet(page).locator('.fgroup:not([data-brought-group]):not(.open)').count();
  if (allOpen === 0) await expect(page.locator('.ftotal').first()).toContainText(`0 of ${shelves} bought`);
  // And they are all on Bringing, unskipped.
  await openTab(page, /^Bringing · \d+$/);
  for (const id of ['p_potatoes', 'p_sweet_potatoes']) await expect(sheet(page).locator(`[data-bringer-row="${id}"]`)).toBeVisible();
});

test('"I\'ll make it myself" puts a guest\'s dish on the host\'s list; "Hand it back" returns it', async ({ page }) => {
  await boot(page, seed('e2e-bring-4', { foodChoices: ALL_SET }));
  await openSectionByName(page, /spread/i);
  await settled(page);
  await openTab(page, /^Bringing · \d+$/);
  await sheet(page).locator('[data-bringer-row="p_corn"]').click();
  await sheet(page).getByRole('button', { name: 'I’ll make it myself' }).click();
  await expect.poll(async () => ((await saved(page)).foodOwner || {}).p_corn).toBe(false);
  await expect(sheet(page).locator('.fstat', { hasText: 'Corn' }).filter({ hasText: 'Hand it back' })).toBeVisible();
  await sheet(page).locator('.fstat', { hasText: 'Corn' }).filter({ hasText: 'Hand it back' }).click();
  await expect.poll(async () => 'p_corn' in ((await saved(page)).foodOwner || {})).toBe(false);
});

// ── THE SPREAD OPENS ON THE TAB THE WORK IS ON ─────────────────────────────
test('menu questions open: the hero\'s spread link opens Plan', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  const { turkey_method: _t, dietary_table: _d, ...open } = ALL_SET;
  await boot(page, seed('e2e-bring-5', { date: dateIn(6), foodChoices: open }));
  const link = page.locator('.hero .hero-card').first().locator('button.spread-link');
  await expect(link).toBeVisible();
  await link.click();
  await settled(page);
  expect(await selectedTab(page)).toBe('Plan');
  await expect(sheet(page).locator('.fstat', { hasText: 'Your choices' })).toContainText(/\d+ open/);
});

test('menu set, buying left: the board row says "bought" and opens Shop', async ({ page }) => {
  await boot(page, seed('e2e-bring-6', { foodChoices: ALL_SET }), '?elegant=0');
  const row = page.locator('.qidx-row', { hasText: 'The spread & shopping' });
  await expect(row).toContainText(/food & drinks · 0 of \d+ bought/);
  await row.click();
  await settled(page);
  expect(await selectedTab(page)).toBe('Shop');
});

test('menu open: the board row names the menu and opens Plan', async ({ page }) => {
  const { turkey_method: _t, ...open } = ALL_SET;
  await boot(page, seed('e2e-bring-7', { foodChoices: open }), '?elegant=0');
  const row = page.locator('.qidx-row', { hasText: 'The spread & shopping' });
  await expect(row).toContainText(/the menu · \d+ to decide/);
  await row.click();
  await settled(page);
  expect(await selectedTab(page)).toBe('Plan');
});

test('menu set, everything bought, a guest\'s dish unnamed: the spread opens on Bringing', async ({ page }) => {
  await boot(page, seed('e2e-bring-8', { foodChoices: ALL_SET }));
  // Tick off everything she buys, from her own Shop list.
  await openSectionByName(page, /spread/i);
  await settled(page);
  await openShopList(page);
  const closed = sheet(page).locator('.fgroup:not([data-brought-group]):not(.open) .fg-head');
  while (await closed.count()) await closed.first().click();
  const checkAll = sheet(page).getByRole('button', { name: /^Check off all \d+/ });
  while (await checkAll.count()) { await checkAll.first().click(); await settled(page); }
  await expect.poll(async () => page.locator('.ftotal').first().innerText()).toMatch(/all bought|(\d+) of \1 bought/);
  await page.keyboard.press('Escape');
  await settled(page);
  // Any door from the board with no row in it: the search palette's entry.
  await page.keyboard.press('Control+k');
  await page.locator('.palette-row', { hasText: 'The spread & shopping' }).first().click();
  await settled(page);
  expect(await selectedTab(page)).toMatch(/^Bringing/);
});
