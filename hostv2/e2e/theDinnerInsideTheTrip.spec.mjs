// ─── THE DINNER INSIDE THE TRIP (owner decision 11/21/2026, "B with A's money") ─
//
// Driven through the REAL creation flow on the owner's exact Santa Fe sentence.
// A destination multi-day event with a celebration carries the dinner as its
// own planned moment: a board card whose button asks the night (Jun 15
// suggested), a dinner sheet that only links out, the meals around it day by
// day in Your days, and the Spread's money in two layers. The night pick is the
// one source for which day the dinner is: Your days and the invite read it.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const SANTA_FE = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, about 30 people flying in for 3 nights, dinner at an adobe courtyard, she uses a walker and the altitude is hard on her";
const GROUP_TRIP = 'Girls trip to Nashville for 8 people flying in June 4 2027 for 3 nights';
const API = 'https://e2e-mock.invalid';

const create = async (page, sentence, { card = true, theme = null } = {}) => {
  await page.route(API + '/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript(() => {
    try { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); sessionStorage.setItem('seeded', '1'); } } catch { /* fresh */ }
  });
  await page.goto('?elegant=1' + (theme ? '&theme=' + theme : ''));
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(sentence);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await settled(page);
  if (card) await expect(page.locator('[data-trip-card]')).toBeAttached({ timeout: 15_000 });
};
const sheet = (page) => page.locator('.sheet').last();
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0]);
const openDinner = async (page) => {
  const go = page.locator('[data-dinner-go]');
  await go.scrollIntoViewIfNeeded();
  await settled(page);
  await go.click();
  await expect(page.locator('#sheet-title')).toHaveText('Mom’s 80th dinner');
};
const pickNight = async (page, re) => {
  await sheet(page).getByRole('radio', { name: re }).click();
  await settled(page);
};
const openPlanTab = async (page) => {
  await openSectionByName(page, 'The spread');
  await sheet(page).getByRole('tab', { name: /^Plan$/ }).first().click();
  await page.waitForTimeout(400);
};
const planMeals = async (page) => {
  await openSectionByName(page, 'Your days');
  await expect(page.locator('#sheet-title')).toHaveText('Your days');
  const meals = sheet(page).locator('[data-trip-meals]');
  await meals.scrollIntoViewIfNeeded();
  await meals.getByRole('radio', { name: /A group dinner each night/ }).click();
  await settled(page);
  await meals.getByRole('button', { name: 'A house we rent' }).click();
  await settled(page);
  return meals;
};

test('the board carries the dinner as its own card, and its button asks the night with Jun 15 suggested', async ({ page }) => {
  await create(page, SANTA_FE);
  const card = page.locator('[data-dinner-card]');
  await expect(card).toContainText('Mom’s 80th dinner');
  await expect(card).toContainText('0 of 6 set');
  await expect(card).toContainText('Night not picked');
  await expect(card).toContainText('an adobe courtyard');
  await expect(page.locator('[data-dinner-go]')).toHaveText('Pick the night of the dinner');
  // The board's Your days row opens Your days, its own sheet.
  await page.locator('[data-trip-days]').click();
  await expect(page.locator('#sheet-title')).toHaveText('Your days');
  await expect(sheet(page).locator('[data-meals-count]')).toHaveText('0 of 7');
  await expect(sheet(page).locator('[data-days-dinner]')).toContainText('Mom’s 80th dinner');
  await page.keyboard.press('Escape');
  await settled(page);
  await openDinner(page);
  await expect(sheet(page).getByText('Which night is the dinner?')).toBeVisible();
  await expect(sheet(page).getByRole('radio', { name: /Tue, Jun 15 — suggested/ })).toBeVisible();
  await expect(sheet(page).getByText(/late flights land on arrival night/)).toBeVisible();
  // The day everyone leaves is not a dinner night.
  await expect(sheet(page).getByRole('radio', { name: /Thu, Jun 17/ })).toHaveCount(0);
});

test('picking the night moves the dinner in Your days and on the invite', async ({ page, context }) => {
  await create(page, SANTA_FE);
  await openDinner(page);
  await pickNight(page, /Wed, Jun 16/);
  await expect(page.locator('#sheet-title')).toHaveText('Mom’s 80th dinner');
  await expect(sheet(page).locator('[data-dinner-night]')).toBeAttached();
  // The dinner sheet's own link opens Your days, its own sheet.
  await sheet(page).locator('[data-dinner-sheet] .trip-link').click();
  await expect(page.locator('#sheet-title')).toHaveText('Your days');
  const row = sheet(page).locator('[data-itin-celebration]');
  await row.scrollIntoViewIfNeeded();
  await expect(row).toContainText('Wednesday evening');
  await expect(row).toContainText('Mom’s 80th dinner');
  await expect(sheet(page).getByText(/The main event/)).toHaveCount(0);

  // The invite reads the same pick.
  const ev = await stored(page);
  expect(ev.celebration.night).toBe('2027-06-16');
  const guest = await context.newPage();
  await guest.route(API + '/**', (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await guest.route(API + '/api/public/invite/' + ev.rsvpCode, (r) => r.fulfill({ status: 200, json: { ok: true, event: ev } }));
  await guest.goto('?rsvp=' + ev.rsvpCode);
  await expect(guest.getByText('The plan', { exact: true })).toBeVisible({ timeout: 15_000 });
  const plan = guest.locator('.inv2-val', { hasText: 'Mom’s 80th dinner' });
  await expect(plan).toContainText('Wednesday');
  await expect(plan).toContainText('evening — Mom’s 80th dinner');
});

test('the dinner sheet only links out, and shows the step-free check', async ({ page }) => {
  await create(page, SANTA_FE);
  await openDinner(page);
  const parts = sheet(page).locator('[data-dinner-parts]');
  await expect(parts.locator('[data-stepfree-check]')).toContainText('You said “she uses a walker”: a step-free path to the adobe courtyard');
  await expect(parts.locator('[data-part="place"]')).toContainText('You wrote “an adobe courtyard” — which one?');
  // No editor of its own: nothing to type and no lit button.
  await expect(sheet(page).locator('input, textarea, select')).toHaveCount(0);
  const lit = await sheet(page).evaluate((root) => {
    const probe = document.createElement('div'); probe.style.backgroundImage = 'var(--cta-grad)';
    document.body.appendChild(probe); const g = getComputedStyle(probe).backgroundImage; probe.remove();
    return [...root.querySelectorAll('button')].filter((b) => getComputedStyle(b).backgroundImage === g).length;
  });
  expect(lit, 'the dinner sheet lights nothing: it only links out').toBe(0);
  const goes = { place: 'Venue', seats: 'Who sits where', food: 'The spread & shopping', drinks: 'The spread & shopping', cake: 'The spread & shopping' };
  for (const [part, title] of Object.entries(goes)) {
    const t = page.locator('#sheet-title');
    if (!(await t.count()) || !(await t.innerText()).includes('80th dinner')) await openDinner(page);
    await sheet(page).locator(`[data-part="${part}"]`).click();
    await expect(page.locator('#sheet-title')).toHaveText(title);
    await page.keyboard.press('Escape');
    await settled(page);
  }
});

test('the Spread shows "The celebration" and "Around it" with one calculation', async ({ page }) => {
  await create(page, SANTA_FE);
  await planMeals(page);
  await openPlanTab(page);
  const layers = sheet(page).locator('[data-trip-layers="spread"]');
  await expect(layers).toBeVisible();
  // The celebration is priced by the Spread's own estimate (the hero above it).
  await page.waitForTimeout(1200); // the hero's number ticks into place
  const text = await sheet(page).innerText();
  const m = text.match(/(\$[\d,]+–\$[\d,]+)\s*estimate, all in/);
  expect(m, 'the Spread hero reads a range').toBeTruthy();
  m[0] = m[1];
  const cel = layers.locator('[data-layer="celebration"]');
  await expect(cel).toContainText('Mom’s 80th dinner');
  await expect(cel).toContainText(m[0]);
  await expect(layers.locator('[data-trip-total]')).toHaveText(m[0]);
  const around = layers.locator('[data-layer="around"]');
  await expect(around).toContainText('7 meals · 1 out together · 4 at the house · 2 on your own');
  await expect(around).toContainText('$0 to you');
  await expect(layers.locator('[data-around-rows]')).toContainText('needs a price source');

  // You cover the meals out: one dinner for 30 at $25–$75 a head joins the total.
  await openSectionByName(page, 'Your days');
  const meals = sheet(page).locator('[data-trip-meals]');
  await meals.getByRole('radio', { name: /You cover them/ }).scrollIntoViewIfNeeded();
  await meals.getByRole('radio', { name: /You cover them/ }).click();
  await settled(page);
  await openPlanTab(page);
  const nums = m[0].replace(/[$,]/g, '').split('–').map(Number);
  const want = `$${(nums[0] + 750).toLocaleString('en-US')}–$${(nums[1] + 2250).toLocaleString('en-US')}`;
  await expect(sheet(page).locator('[data-trip-total]')).toHaveText(want);
  await expect(sheet(page).locator('[data-layer="around"]')).toContainText('$750–$2,250 to you');
});

test('"decided" on the Spread counts food decisions only', async ({ page }) => {
  await create(page, SANTA_FE, { card: false });
  await openPlanTab(page);
  await expect(sheet(page).locator('.sheet-foot')).toContainText(/0 of 2 decided/);
  await sheet(page).getByRole('button', { name: /Your choices/ }).click();
  await expect(sheet(page).getByText('How are guests staying?')).toHaveCount(0);
});

test('nothing known is re-asked, and the kitchen is asked once', async ({ page }) => {
  await create(page, SANTA_FE);
  await openDinner(page);
  const dinner = await sheet(page).innerText();
  for (const re of [/how many guests/i, /what date/i, /which city/i, /where is (the|it)/i, /what time/i, /does anyone need/i]) {
    expect(dinner, `the dinner sheet re-asks ${re}`).not.toMatch(re);
  }
  expect(dinner).toMatch(/30 guests/);
  expect(dinner).toMatch(/an adobe courtyard/);
  expect(dinner).toMatch(/evening/);
  const meals = await planMeals(page);
  await expect(meals.locator('[data-kitchen-ask]')).toHaveCount(0);
  const ev = await stored(page);
  expect(ev.foodChoices.dest_lodging).toBe('A host-arranged Airbnb');
  const days = await meals.innerText();
  for (const re of [/how many guests/i, /what date/i, /where is/i]) expect(days).not.toMatch(re);
  // Your days reads the dates and never edits them.
  await expect(sheet(page).locator('input[type="date"], .day-crud')).toHaveCount(0);
  // One home: Space has a summary row, not a second editor of the days.
  await openSectionByName(page, 'Space, seats');
  await expect(sheet(page).locator('[data-trip-meals], #days-plan')).toHaveCount(0);
  await expect(sheet(page).locator('[data-space-days]')).toContainText('4 days · open');
});

test('a Group Trip has no single celebration: it shows only the trip meals', async ({ page }) => {
  await create(page, GROUP_TRIP);
  await expect(page.locator('[data-dinner-card]')).toHaveCount(0);
  await expect(page.locator('[data-trip-days]')).toContainText('meals on the trip');
  await openSectionByName(page, 'Your days');
  const meals = sheet(page).locator('[data-trip-meals]');
  await meals.scrollIntoViewIfNeeded();
  await expect(page.locator('#sheet-title')).toHaveText('Your days');
  await expect(sheet(page).locator('[data-meals-count]')).toHaveText('0 of 8');
  await expect(sheet(page)).toContainText('meals planned on the trip');
  await expect(meals.locator('[data-days-dinner]')).toHaveCount(0);
});

// Moved from dayCrud.spec.mjs when the dates branch removed Space's day
// controls (and that spec with them): Space keeps one read-only row for the
// days, it opens Your days, and a single-day event has none.
test('Space\'s "Your days" row opens the sheet, with no day controls; a single-day event has no row', async ({ page }) => {
  await create(page, SANTA_FE);
  await openSectionByName(page, 'Space, seats');
  await settled(page);
  const row = sheet(page).locator('[data-space-days]');
  await row.scrollIntoViewIfNeeded();
  await expect(row).toContainText('Your days');
  await expect(row).toContainText('4 days · open');
  await expect(sheet(page).locator('.day-crud')).toHaveCount(0);
  await row.click();
  await expect(page.locator('#sheet-title')).toHaveText('Your days');
  await expect(sheet(page).locator('.day-crud')).toHaveCount(0);
});

test('a single-day event has no "Your days" row in Space', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'my-crab-feast');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Space, seats');
  await settled(page);
  await expect(sheet(page).locator('[data-space-dates]')).toBeVisible();
  await expect(page.locator('[data-space-days]')).toHaveCount(0);
});

for (const theme of ['light', 'dark']) {
  test(`Your days lights at most one button, and its controls clear the tap floor — ${theme}`, async ({ page }) => {
    await create(page, SANTA_FE, { theme });
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(theme);
    await planMeals(page);
    const r = await sheet(page).evaluate((root) => {
      const probe = document.createElement('div'); probe.style.backgroundImage = 'var(--cta-grad)';
      document.body.appendChild(probe); const g = getComputedStyle(probe).backgroundImage; probe.remove();
      const lit = [...root.querySelectorAll('button')].filter((b) => b.getClientRects().length && getComputedStyle(b).backgroundImage === g).length;
      const small = [...root.querySelectorAll('[data-days-sheet] .meal-seg, [data-days-sheet] .optrow, [data-days-sheet] .trip-link, [data-days-sheet] .meal-cel, [data-days-sheet] .trip-card-link')]
        .map((b) => b.getBoundingClientRect()).filter((b) => b.height && b.height < 44).length;
      return { lit, small };
    });
    expect(r.lit, 'lit buttons in Your days').toBeLessThanOrEqual(1);
    expect(r.small, 'Your days controls under 44px tall').toBe(0);
  });
}
