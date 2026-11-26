// ─── EVERY GENERIC FOOD DOOR ASKS THE ONE RULE (owner's iPad, 11/21/2026) ───
//
// Owner: "When going from hero to food decide when to go to plan vs shopping
// tab." and "Single sources not duplicative sources." #221 made
// lib/foodBringing's foodSheetKind the rule (Plan while a menu question is
// open, Shop while there is buying left, Bringing only when all is bought and a
// brought dish is unnamed) and wired the hero, the board row and the palette.
// The section rail, the Sections list, Your money's Food and Drinks rows, the
// Ask answer and the day-before fallback still opened Shop whatever the menu
// said. Each one is walked here, twice:
//   menu question open          → Plan
//   menu settled, buying left   → Shop
// Doors that name their tab or their line (the tab buttons, a row with a
// dish in it, the Supplies money row that opens its shelf) stay direct and are
// not walked here.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

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
const seed = (id, extra) => ({
  id, name: 'Our Thanksgiving', type: 'Thanksgiving Hosting', date: dateIn(10), startTime: '16:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host', totalBudget: 60000,
  guests: Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'Yes' })),
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
// ONE FOOD PAGE (owner, 11/24/2026): the tabs are gone and the rule now names
// a SECTION of the one page; the door lands with that section in view.
// Plan → Your choices, Shop → the list.
const SECTION = { Plan: 'choices', Shop: 'list', Bringing: 'bringing' };
const landsOn = async (page, want) => {
  await settled(page);
  await expect(page.locator('.sheet').last().locator(`[data-food-section="${SECTION[want]}"]`)).toBeVisible();
  await page.waitForTimeout(300);
  const seen = await page.evaluate((sec) => {
    const sh = [...document.querySelectorAll('.sheet')].pop();
    const body = sh.querySelector('.sheet-body');
    const el = sh.querySelector(`[data-food-section="${sec}"]`);
    const b = body.getBoundingClientRect(); const r = el.getBoundingClientRect();
    return r.top >= b.top - 2 && r.top < b.bottom - 60;
  }, SECTION[want]);
  expect(seen, `${want} (${SECTION[want]}) is in view`).toBe(true);
};

const CASES = [
  { name: 'a menu question open', choices: MENU_OPEN, want: 'Plan' },
  { name: 'the menu settled, buying left', choices: ALL_SET, want: 'Shop' },
];

for (const c of CASES) {
  test.describe(`${c.name}: the door opens ${c.want}`, () => {
    test('the section door (rail, or Jump to a section)', async ({ page }) => {
      await boot(page, seed('e2e-door-sec-' + c.want, { foodChoices: c.choices }));
      await openSectionByName(page, /spread/i);
      await landsOn(page, c.want);
    });

    test('Your money: the Food row and the drinks row', async ({ page }) => {
      await boot(page, seed('e2e-door-money-' + c.want, { foodChoices: c.choices }));
      for (const row of ['Open Food', 'Open Bar / Beverage']) {
        await openSectionByName(page, 'Your money');
        await settled(page);
        await page.locator('.sheet').last().getByRole('button', { name: row, exact: true }).first().click();
        await landsOn(page, c.want);
        await page.keyboard.press('Escape');
        await settled(page);
      }
    });

    test('the answer to "How much food do I need?"', async ({ page }) => {
      await boot(page, seed('e2e-door-ask-' + c.want, { foodChoices: c.choices }));
      await openSectionByName(page, /^Ask No Guesswork/);
      await settled(page);
      await page.getByLabel('Your question').fill('How much food do I need?');
      await page.getByLabel('Your question').press('Enter');
      const go = page.locator('.sheet').last().locator('.brow .actions-row button.mini').first();
      await expect(go).toBeVisible();
      await go.click();
      await landsOn(page, c.want);
    });
  });
}

// The day-before plan's shopping row carries its own route (the first unbought
// line) while there is buying left; only the "Shopping — all in hand" row
// falls back to the keyword door, so this door is walked with everything
// bought: Plan while a question is open, Shop once every brought dish is named.
// The combined lines were split one line per product (owner ruling 11/23/2026),
// so each part the host buys is bought here too. The parts of a brought dish
// (the mash's butter) go with the dish and need no entry.
const BOUGHT = Object.fromEntries(['p_turkey', 'p_stuffing', 'p_gravy', 'p_gravy_thickener', 'p_rolls', 'p_rolls_butter',
  'p_appetizers', 'p_appetizers_crackers', 'p_appetizers_nuts', 'p_appetizers_crudite', 'p_wine_cider', 'p_wine_cider_white', 'p_cider',
  'p_coffee', 'p_coffee_tea', 'p_coffee_whipped', 'p_coffee_icecream', 'p_thermometer', 'p_roasting_kit', 'p_roasting_foil',
  'p_roasting_twine', 'p_leftover_containers', 'p_leftover_bags', 'p_leftover_labels', 'p_cleanup', 'p_cleanup_soap',
  'p_cleanup_towels', 'p_cleanup_detergent'].map((k) => [k, true]));
const NAMED = Object.fromEntries(['p_potatoes', 'p_cranberry', 'p_green_beans', 'p_sweet_potatoes', 'p_mac', 'p_corn',
  'p_roast_veg', 'p_pies'].map((k, i) => [k, 'Guest ' + (i + 1)]));
const GEAR = ['extra chairs + a table leaf or folding table', 'a kids table + chairs',
  'second refrigerator space or a big cooler', 'warming space: a slow cooker or two for holding sides'];
for (const c of [{ name: 'a menu question open', choices: MENU_OPEN, want: 'Plan' }, { name: 'the menu settled', choices: ALL_SET, want: 'Shop' }]) {
  test(`the day before, everything bought, ${c.name}: "Shopping — all in hand" opens ${c.want}`, async ({ page }) => {
    await boot(page, seed('e2e-door-db-' + c.want, {
      date: dateIn(1), foodChoices: c.choices, foodGot: BOUGHT, foodOwner: NAMED,
      capacityOwned: Object.fromEntries(GEAR.map((k) => [k, true])),
    }), '?elegant=0');
    const row = page.locator('.db-row', { hasText: 'Shopping — all in hand' });
    await expect(row).toBeVisible();
    await row.click();
    await landsOn(page, c.want);
  });
}
