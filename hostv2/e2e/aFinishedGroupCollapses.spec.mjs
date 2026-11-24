// ─── FINISHED GROUPS COLLAPSE, ONE RULE (owner-approved renders 8 and 8b,
// 11/24/2026) ────────────────────────────────────────────────────────────────
//
// When every item in a group is done, the group shrinks to one compact green
// row ("✓ Food · all 10 bought") with a chevron to reopen it, and no progress
// bar. When every group is done, the whole list shrinks to "✓ All 27 bought"
// with a quiet "Show the list" link. One shared component does it for the
// shopping groups, the Bringing list, the checklist and the decided calls.
// Reopening holds for the browser session only, and writes nothing to the plan.
import { test, expect, settled, dateIn, openSectionByName, sheetSettled, openAllPhases } from './fixtures.mjs';

const ALL_SET = {
  hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts',
  turkey_method: 'Roasted in the oven',
  dietary_table: 'Nobody — the traditional menu works for everyone',
  service_style: 'Sit-down — everyone at the table',
  serve_time: 'Late afternoon, around 4 or 5',
  overnight_guests: 'No — everyone is local',
};
const NAMED = Object.fromEntries(['p_potatoes', 'p_cranberry', 'p_green_beans', 'p_sweet_potatoes', 'p_mac', 'p_corn',
  'p_roast_veg', 'p_pies'].map((k, i) => [k, 'Guest ' + (i + 1)]));
const seed = (id, extra) => ({
  id, name: 'Our Thanksgiving', type: 'Thanksgiving Hosting', date: dateIn(20), startTime: '16:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
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
// The shopping list, on whichever layout this build has (tabs, or one page).
const openShopList = async (page) => {
  await openSectionByName(page, /spread/i);
  await sheetSettled(page);
  const shop = sheet(page).locator('.fmodes [role="tab"]', { hasText: 'Shop' });
  if (await shop.count()) { await shop.click(); await page.waitForTimeout(300); }
  const listRow = sheet(page).locator('button.fstat', { hasText: 'The list' });
  if (await listRow.count()) { await listRow.click(); await page.waitForTimeout(300); }
  await expect(sheet(page).locator('.fgroup').first()).toBeVisible();
};
const checkOffGroup = async (page, g) => {
  const grp = sheet(page).locator('.fgroup', { has: page.locator('.fg-label', { hasText: new RegExp('^' + g) }) }).first();
  if (!(await grp.locator('.fg-items .frow').count())) await grp.locator('.fg-head').click();
  await grp.getByRole('button', { name: /^Check off all \d+/ }).click();
  await page.waitForTimeout(300);
};
const groupCount = (page, g) => sheet(page).locator('.fgroup', { has: page.locator('.fg-label', { hasText: new RegExp('^' + g) }) }).count();
const stored = (page) => page.evaluate(() => localStorage.getItem('ngw-hostv2-custom-events'));

test('a finished shopping group shrinks to one green row, and reopens for the session', async ({ page }) => {
  await boot(page, seed('e2e-fold-shop', {}));
  await openShopList(page);
  await checkOffGroup(page, 'Food');
  const row = sheet(page).locator('[data-done-fold]', { hasText: /Food · all \d+ bought/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText('✓');
  expect(await groupCount(page, 'Food')).toBe(0);
  // No progress bar on the compact row, and it is green.
  expect(await row.locator('.fg-track').count()).toBe(0);
  const [c, ok] = await row.evaluate((el) => {
    const s = document.createElement('span'); s.style.color = 'var(--ok)'; document.body.appendChild(s);
    const ok = getComputedStyle(s).color; s.remove(); return [getComputedStyle(el).color, ok];
  });
  expect(c).toBe(ok);
  // The other groups are untouched.
  expect(await groupCount(page, 'Drinks')).toBe(1);

  // Reopen: the group is back with its lines, and nothing was written to the plan.
  const before = await stored(page);
  await row.click();
  await expect(sheet(page).locator('.fgroup', { has: page.locator('.fg-label', { hasText: /^Food/ }) })).toBeVisible();
  expect(await sheet(page).locator('[data-done-fold]', { hasText: /Food · all/ }).count()).toBe(0);
  expect(await stored(page)).toBe(before);
  // It stays open for the session: close the sheet and come back.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await openShopList(page);
  expect(await groupCount(page, 'Food')).toBe(1);
  // A new session starts collapsed again.
  await page.evaluate(() => { const keep = sessionStorage.getItem('seeded'); sessionStorage.clear(); sessionStorage.setItem('seeded', keep); });
  await page.reload();
  await settled(page);
  await openShopList(page).catch(() => {});
  await expect(sheet(page).locator('[data-done-fold]', { hasText: /Food · all \d+ bought/ })).toBeVisible();
});

test('every group bought: the whole list shrinks to "All N bought" with a quiet "Show the list"', async ({ page }) => {
  await boot(page, seed('e2e-fold-all', { foodOwner: NAMED }));
  await openShopList(page);
  const labels = await sheet(page).locator('.fgroup:not([data-brought-group]) .fg-label').evaluateAll((els) => els.map((e) => e.firstChild.textContent.trim()));
  expect(labels.length).toBeGreaterThan(1);
  for (const g of labels) await checkOffGroup(page, g);
  const all = sheet(page).locator('[data-done-all]');
  await expect(all).toBeVisible();
  await expect(all).toContainText(/✓\s*All \d+ bought/);
  const total = Number((await all.innerText()).match(/All (\d+) bought/)[1]);
  await expect(page.locator('.ftotal')).toContainText(`${total} of ${total} bought`);
  expect(await sheet(page).locator('.fgroup:not([data-brought-group])').count()).toBe(0);
  await all.getByRole('button', { name: 'Show the list' }).click();
  await expect(sheet(page).locator('[data-done-all]')).toHaveCount(0);
  // The list is back, each finished group as its compact row.
  await expect(sheet(page).locator('[data-done-fold]', { hasText: / · all \d+ bought/ })).toHaveCount(labels.length);
});

test('the Bringing list: everyone named shrinks it to one green row', async ({ page }) => {
  await boot(page, seed('e2e-fold-bring', { foodOwner: NAMED }));
  await openSectionByName(page, /spread/i);
  await sheetSettled(page);
  const tab = sheet(page).locator('.fmodes [role="tab"]', { hasText: 'Bringing' });
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(300); }
  const row = sheet(page).locator('[data-done-fold]', { hasText: /Bringing · all 8 spoken for/ });
  await expect(row).toBeVisible();
  // The dishes others bring are behind it; the host's own dishes stay listed.
  for (const id of Object.keys(NAMED)) expect(await sheet(page).locator(`[data-bringer-row="${id}"]`).count(), id).toBe(0);
  await row.click();
  await expect(sheet(page).locator('[data-bringer-row="p_potatoes"]')).toBeVisible();
});

const TASKS = (doneN, n = 4) => Array.from({ length: n }, (_, i) => ({ id: 't' + i, task: 'Step ' + (i + 1), week: '', done: i < doneN, owner: '' }));

test('the checklist: done steps fold to one green row; all done, the list shrinks to "All N done"', async ({ page }) => {
  await boot(page, seed('e2e-fold-tasks', { timeline: TASKS(2) }));
  await openSectionByName(page, /checklist/i);
  await sheetSettled(page);
  const fold = sheet(page).locator('[data-done-fold]', { hasText: /2 done/ });
  await expect(fold).toBeVisible();
  await expect(fold).toContainText('✓');
  // Check the rest off (the plan adds its own steps to these four): the whole
  // list shrinks.
  const all = sheet(page).locator('[data-done-all]');
  for (let k = 0; k < 80 && !(await all.count()); k++) {
    const live = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].timeline.filter((t) => t && !t.retired && !t.done).length);
    if (!live) break;
    // Check off the step up next (cohesion batch D: the first open step sits
    // on the Up next card), else a step the plan already handled (its own check).
    const up = sheet(page).locator('[data-up-next] [data-step-checkoff], [data-up-next] [data-up-next-go]:text-is("Check it off")');
    if (await up.count()) await up.first().click();
    else { await openAllPhases(page); await sheet(page).locator('[data-step-check]').first().click(); }
    await page.waitForTimeout(150);
  }
  await expect(all).toBeVisible();
  const n = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].timeline.filter((t) => t && !t.retired).length);
  await expect(all).toContainText(new RegExp(`✓\\s*All ${n} done`));
  await all.getByRole('button', { name: 'Show the list' }).click();
  await expect(sheet(page).locator('.frow', { hasText: 'Step 1' })).toBeVisible();
});

test('Calls to make: the decided calls fold to one green row, and reopen to change one', async ({ page }) => {
  await boot(page, seed('e2e-fold-calls', {}));
  await openSectionByName(page, /Calls to make/i);
  await sheetSettled(page);
  const fold = sheet(page).locator('[data-done-fold]', { hasText: /Settled · all \d+ decided/ });
  await expect(fold).toBeVisible();
  expect(await sheet(page).locator('button.settled-card').count()).toBe(0);
  await fold.click();
  await expect(sheet(page).locator('button.settled-card').first()).toBeVisible();
});

// ─── IT FOLDS EVERY TIME IT FINISHES (owner, 11/24/2026, a live report) ─────
// Reopening a finished group held for the whole session, so once she had
// looked inside, unchecking a line and checking it again left "Uncheck all 21"
// and the lines on screen. And a line's tune panel kept its group open after
// the last line was checked off. A reopen now lasts only while the group stays
// finished, and finishing a group folds it, whatever was open inside it.
const foodGroup = (page) => sheet(page).locator('.fgroup', { has: page.locator('.fg-label', { hasText: /^Food/ }) });
const foodFold = (page) => sheet(page).locator('[data-done-fold]', { hasText: /Food · all \d+ bought/ });

test('reopened, then unchecked and checked again: the group folds again', async ({ page }) => {
  await boot(page, seed('e2e-fold-again', {}));
  await openShopList(page);
  await checkOffGroup(page, 'Food');
  await foodFold(page).click();
  await expect(foodGroup(page)).toBeVisible();
  const first = foodGroup(page).locator('.fg-items .frow .fcheck').first();
  await first.click(); await page.waitForTimeout(200);
  await expect(foodGroup(page), 'unchecked: the group is open, not done').toBeVisible();
  await first.click(); await page.waitForTimeout(300);
  await expect(foodFold(page), 'finished again: it folds again').toBeVisible();
  expect(await groupCount(page, 'Food')).toBe(0);
  expect(await sheet(page).locator('[data-food-open]').count(), 'the opened item closed with its group').toBe(0);
});

// The tune panel became the opened item (owner, 11/24/2026): the same rule
// holds for an item opened in place.
test('a line opened in place: finishing the group still folds it', async ({ page }) => {
  await boot(page, seed('e2e-fold-tune', {}));
  await openShopList(page);
  const g = foodGroup(page);
  if (!(await g.locator('.fg-items .frow').count())) await g.locator('.fg-head').click();
  await g.locator('.fg-items .frow .f-body').first().click();
  await expect(g.locator('[data-food-open]')).toHaveCount(1);
  await page.waitForTimeout(300);
  await checkOffGroup(page, 'Food');
  await expect(foodFold(page)).toBeVisible();
  expect(await groupCount(page, 'Food')).toBe(0);
  expect(await sheet(page).locator('[data-food-open]').count(), 'the opened item closed with its group').toBe(0);
});
