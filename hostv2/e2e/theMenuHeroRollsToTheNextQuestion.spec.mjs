// ─── THE MENU HERO ROLLS TO THE NEXT OPEN QUESTION (owner's iPad, 11/21/2026) ──
//
// Owner report, on a Thanksgiving Hosting plan for 12, six days out, with
// "Host cooks the whole meal" picked: the hero read "Decide the menu." over
// "What you're serving · 2 open", then showed only the hosting-model options
// with that pick marked "chosen" — the settled call, not either open one
// ("How is the turkey cooked?", "Who at the table has a dietary need to cook
// for?"). The count named two questions the panel could not answer.
//
// The food item counted openFoodChoices while its panel always offered the
// food-approach decision (lib/decisionND foodDecisionND). It now offers the
// first open question from the same list, names it beside the count, and
// leaves the hero when the list is empty.
//
// The allergy step (and, per playbook, whatever else ranks first) is set
// aside in the seed so the food item is the hero, as it was on the owner's
// screen.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const seed = (type, id, extra) => ({
  id, name: 'Menu ' + type, type, date: dateIn(6),
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host',
  guests: Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'yes' })),
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  startTime: '16:00', startTimeSource: 'host', totalBudget: 60000,
  budget: [], vendors: [], timeline: [], createdAt: new Date().toISOString(),
  ...extra,
});

const boot = async (page, ev, route = '?elegant=1') => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, ev);
  await page.goto(route);
  await settled(page);
};
const heroCard = (page) => page.locator('.hero .hero-card').first();
const heroId = (page) => heroCard(page).getAttribute('id').catch(() => null);
const heroText = (page) => page.locator('.hero').first().innerText().catch(() => '');
// The hero card's heading when it is the food item naming a question: "… · N open".
const menuHeading = async (page) => {
  const h = await heroCard(page).locator('h3').first().innerText({ timeout: 1000 }).catch(() => null);
  return h && / · \d+ open$/.test(h.trim()) ? h.trim() : null;
};
// What the hero rolls to is never the settled approach again, nor a menu ask
// over something else (the dietary note was "Decide the menu." over it).
const expectNoSettledMenu = async (page) => {
  await expect(heroCard(page).locator('.decopt-badge').filter({ hasText: 'chosen' })).toHaveCount(0);
  expect(await page.locator('.hero h2.ask').first().innerText({ timeout: 1000 }).catch(() => '')).not.toMatch(/Decide the menu/);
};
const option = (page, label) => heroCard(page).locator('button.decopt').filter({ hasText: label }).first();
// "Open the spread (N items) ›" under the menu question (owner ruling 3, 11/21/2026).
const expectSpreadLink = async (page) => {
  const link = heroCard(page).locator('button.spread-link');
  await expect(link).toHaveCount(1);
  await expect(link).toBeVisible();
  await expect(link).toHaveText(/^Open the spread \(\d+ items?\) ›$/);
  // The tap floor holds here too (spreadLinkTapFloor measures the editor's copy).
  expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
};

const SET_ASIDE = { 'decision:dietary': dateIn(4) };
// The allergy step, in either of its wordings, once the table has said "nobody".
const NO_ALLERGY_ASK = /Who has a food allergy|Note dietary needs|dietary restrictions/i;

test('Thanksgiving: the turkey, then the table, then the hero moves on', async ({ page }) => {
  await boot(page, seed('Thanksgiving Hosting', 'E2E_menu_tg', {
    snoozed: SET_ASIDE,
    foodChoices: {
      hosting_model: 'Host cooks the whole meal',
      service_style: 'Sit-down — everyone at the table',
      serve_time: 'Late afternoon, around 4 or 5',
      overnight_guests: 'No — everyone is local',
      drinks: 'Wine with dinner, sparkling cider for everyone', // asked since 11/26/2026
    },
  }));
  // PREMISE: the food item is the hero, two questions open.
  expect(await heroId(page)).toBe('card-phase:food');
  const first = await heroText(page);
  expect(first).toMatch(/How is the turkey cooked\? · 2 open/);
  await expect(option(page, 'Roasted in the oven')).toBeVisible();
  await expectSpreadLink(page);
  // The other answers sit one tap down, in the same panel.
  await heroCard(page).locator('button.decopt-disc').filter({ hasText: 'Other ways' }).first().click();
  for (const o of ['Deep-fried outside', 'Smoked', 'Bought fully cooked']) {
    await expect(option(page, o)).toBeVisible();
  }
  // The settled call is not the panel.
  expect(first).not.toMatch(/What you.re serving/);
  await expect(heroCard(page).locator('button.decopt').filter({ hasText: 'Host cooks the whole meal' })).toHaveCount(0);

  await option(page, 'Smoked').click();
  await expect.poll(() => menuHeading(page)).toBe('Who at the table has a dietary need to cook for? · 1 open');
  await expectSpreadLink(page);
  await heroCard(page).locator('button.decopt-disc').filter({ hasText: 'Other ways' }).first().click();
  await option(page, 'Nobody — the traditional menu works for everyone').click();
  // Nothing left to ask about the menu: the food item leaves the hero.
  await expect.poll(() => menuHeading(page)).toBe(null);
  const after = await heroText(page);
  console.log('AFTER THE MENU (Thanksgiving):\n' + after.split('\n').slice(0, 8).join('\n'));
  expect(after).not.toMatch(/How is the turkey cooked|Who at the table has a dietary need|What you.re serving/);
  // "Nobody" counts as noted (owner ruling 1, 11/21/2026): no allergy ask follows.
  expect(after).not.toMatch(NO_ALLERGY_ASK);
  await expectNoSettledMenu(page);
  // Both answers are on the plan, and the menu item stays gone after a reload.
  await page.reload();
  await settled(page);
  expect(await menuHeading(page)).toBe(null);
  expect(await heroText(page)).not.toMatch(/How is the turkey cooked|Who at the table has a dietary need|What you.re serving/);
  expect(await heroText(page)).not.toMatch(NO_ALLERGY_ASK);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].foodChoices);
  expect(saved).toMatchObject({ turkey_method: 'Smoked', dietary_table: 'Nobody — the traditional menu works for everyone' });
});

// THE SPREAD LINK UNDER EVERY MENU QUESTION, ON EVERY ROUTE (owner ruling 3,
// 11/21/2026). The elegant hero (the default) renders the menu question in place
// and had dropped "Open the spread (N items) ›"; the v2 hero (?elegant=0) opens
// the food editor, which kept it. Walk the turkey and the table on both, and the
// link is under each question, and it opens the spread.
for (const route of ['?elegant=1', '?elegant=0']) {
  test(`Thanksgiving (${route}): the spread link sits under every menu question`, async ({ page }) => {
    await boot(page, seed('Thanksgiving Hosting', 'E2E_menu_spread' + route.slice(-1), {
      snoozed: SET_ASIDE,
      foodChoices: {
        hosting_model: 'Host cooks the whole meal',
        service_style: 'Sit-down — everyone at the table',
        serve_time: 'Late afternoon, around 4 or 5',
        overnight_guests: 'No — everyone is local',
        drinks: 'Wine with dinner, sparkling cider for everyone', // asked since 11/26/2026
      },
    }), route);
    expect(await heroId(page)).toBe('card-phase:food');
    // Each question is known by its own lead option (both routes also name it in
    // the heading; the test below holds that).
    for (const [lead, pick] of [['Roasted in the oven', 'Smoked'], ['One or two needs — adjust dishes and label them', 'Nobody — the traditional menu works for everyone']]) {
      await expect(option(page, lead)).toBeVisible();
      await expectSpreadLink(page);
      const disc = heroCard(page).locator('button.decopt-disc').filter({ hasText: 'Other ways' }).first();
      if (await disc.count()) await disc.click();
      await option(page, pick).click();
    }
    // Both answered: no menu question is left on the hero to carry a link.
    await expect(heroCard(page).locator('button.decopt').filter({ hasText: 'One or two needs' })).toHaveCount(0);
  });
}
// THE PLAIN VIEW NAMES THE QUESTION TOO (11/21/2026). With the elegant style
// off the food card's heading read "What you're serving · 2 open" over the
// turkey question. Both routes now head the card with the open question, from
// the same list the count reads (openFoodChoices).
for (const route of ['?elegant=1', '?elegant=0']) {
  test(`Thanksgiving (${route}): the heading names the open menu question`, async ({ page }) => {
    await boot(page, seed('Thanksgiving Hosting', 'E2E_menu_heading' + route.slice(-1), {
      snoozed: SET_ASIDE,
      foodChoices: {
        hosting_model: 'Host cooks the whole meal',
        service_style: 'Sit-down — everyone at the table',
        serve_time: 'Late afternoon, around 4 or 5',
        overnight_guests: 'No — everyone is local',
        drinks: 'Wine with dinner, sparkling cider for everyone', // asked since 11/26/2026
      },
    }), route);
    expect(await heroId(page)).toBe('card-phase:food');
    await expect.poll(() => menuHeading(page)).toBe('How is the turkey cooked? · 2 open');
    const disc = heroCard(page).locator('button.decopt-disc').filter({ hasText: 'Other ways' }).first();
    if (await disc.count()) await disc.click();
    await option(page, 'Smoked').click();
    await expect.poll(() => menuHeading(page)).toBe('Who at the table has a dietary need to cook for? · 1 open');
  });
}
test('the spread link opens the spread', async ({ page }) => {
  await boot(page, seed('Thanksgiving Hosting', 'E2E_menu_spread_open', {
    snoozed: SET_ASIDE, foodChoices: { hosting_model: 'Host cooks the whole meal' },
  }));
  await expectSpreadLink(page);
  await heroCard(page).locator('button.spread-link').click();
  await expect(page.locator('.sheet').first()).toBeVisible();
});

// "NOBODY" COUNTS AS NOTED (owner ruling 1, 11/21/2026). Friendsgiving's table
// question answered "Nobody at this table": the menu is done, and the hero does
// not turn round and ask who has a food allergy.
test('Friendsgiving: "Nobody at this table" ends the menu, and no allergy ask follows', async ({ page }) => {
  await boot(page, seed('Friendsgiving', 'E2E_menu_fg_nobody', {
    snoozed: { 'decision:dietary': dateIn(4), 'top:operational:p_drinks': dateIn(4) },
    foodChoices: {
      hosting_model: 'Potluck — host makes the main, friends each bring an assigned dish',
      main_dish: 'Roast turkey',
      drinks: 'Friends bring a bottle; host covers ice, water, and something alcohol-free',
    },
  }));
  await expect.poll(() => menuHeading(page)).toBe('Who has an allergy or dietary need to plan around? · 1 open');
  const disc = heroCard(page).locator('button.decopt-disc').filter({ hasText: 'Other ways' }).first();
  if (await disc.count()) await disc.click();
  await option(page, 'Nobody at this table').click();
  await expect.poll(() => menuHeading(page)).toBe(null);
  const after = await heroText(page);
  console.log('AFTER "NOBODY" (Friendsgiving):\n' + after.split('\n').slice(0, 8).join('\n'));
  // The receipt names the answer ("…: Nobody at this table — settled."); the ask does not return.
  expect(await page.locator('.hero h2.ask').first().innerText({ timeout: 1000 }).catch(() => '')).not.toMatch(/allerg|dietary/i);
  expect(after).not.toMatch(NO_ALLERGY_ASK);
  await page.reload();
  await settled(page);
  expect(await heroText(page)).not.toMatch(/Who has an allergy or dietary need/);
  expect(await heroText(page)).not.toMatch(NO_ALLERGY_ASK);
});

// Every playbook with more than one menu question had the same panel: once the
// approach was picked, the hero showed it settled. Walk each one: every step
// shows an open question named beside the count, the count falls by one, and
// the hero moves on when it reaches zero.
const OTHERS = [
  ['Friendsgiving', { hosting_model: 'Potluck — host makes the main, friends each bring an assigned dish' },
    { 'decision:dietary': dateIn(4), 'top:operational:p_drinks': dateIn(4) }],
  ['The Cookout', { grill_master: 'Designated grill master (uncle / family pitmaster)' }, {}, { rainPlan: 'The garage, with the door up.' }],
  ['Birthday', { food_style: 'Order pizza/trays' }, SET_ASIDE],
];
for (const [type, picks, snoozed, extra] of OTHERS) {
  test(`${type}: every open menu question is offered in turn, then the hero moves on`, async ({ page }) => {
    await boot(page, seed(type, 'E2E_menu_' + type.replace(/\W/g, ''), { foodChoices: picks, snoozed, ...(extra || {}) }));
    const first = await menuHeading(page);
    expect(first, 'the food item is the hero, naming its question beside the count').toBeTruthy();
    let n = Number(first.match(/· (\d+) open$/)[1]);
    const asked = [];
    for (let h = first; h; h = await menuHeading(page)) {
      // The count falls by one per answer, and the question is always a new one.
      expect(Number(h.match(/· (\d+) open$/)[1])).toBe(n);
      const q = h.replace(/ · \d+ open$/, '');
      expect(asked).not.toContain(q);
      asked.push(q);
      // Never the settled approach under the count.
      await expect(heroCard(page).locator('.decopt-badge').filter({ hasText: 'chosen' })).toHaveCount(0);
      await expectSpreadLink(page);
      await heroCard(page).locator('button.decopt').first().click();
      n -= 1;
      await expect.poll(() => menuHeading(page)).not.toBe(h);
      if (asked.length > 8) break;
    }
    expect(n).toBe(0);
    const after = await heroText(page);
    console.log(`AFTER THE MENU (${type}): asked ${JSON.stringify(asked)}\n` + after.split('\n').slice(0, 8).join('\n'));
    expect(after).not.toMatch(/What you.re serving/);
    for (const q of asked) expect(after).not.toContain(q);
    await expectNoSettledMenu(page);
  });
}
