// ─── THE FOOD ASK SAYS ITSELF ONCE, AND SAYS WHAT IT ASKS (audit 2 lane A P2) ──
//
// P2-2: the generic cook / cater / potluck ask printed "How you handle the food
// shapes both the budget and your day-of workload." twice, one above the other.
// P2-1: "Decide the menu." headlined food asks that are not about the menu —
// The Cookout's grill master among them. The headline is the call's own question.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const seed = (type, id, extra) => ({
  id, name: 'Food ' + type, type, date: dateIn(70),
  guestMode: 'count', guestCount: 12, guestCountSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  startTime: '18:00', startTimeSource: 'host', totalBudget: 60000,
  budget: [], vendors: [], guests: [], timeline: [], createdAt: new Date().toISOString(),
  ...extra,
});
const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1&noanalytics=1');
  await settled(page);
  await page.locator('.escreen.on h2.ask').first().waitFor();
};
// Walk the hero until it shows the food ask (a decopt row naming a food option).
const toFoodAsk = async (page, re) => {
  for (let k = 0; k < 8; k++) {
    const hero = page.locator('.escreen.on').first();
    if (await hero.locator('.decopt').filter({ hasText: re }).count()) return hero;
    const pick = hero.locator('.decopt.pick');
    if (await pick.count()) { await pick.first().click(); await page.waitForTimeout(600); continue; }
    const mini = hero.locator('button.mini').filter({ hasText: /^use /i });
    if (await mini.count()) { await mini.first().click(); await page.waitForTimeout(600); continue; }
    const opt = hero.locator('.decopt');
    if (await opt.count()) { await opt.first().click(); await page.waitForTimeout(600); continue; }
    break;
  }
  return null;
};

test('the generic food ask says its reason once', async ({ page }) => {
  await boot(page, seed('Client Dinner', 'ev-food-once'));
  const hero = await toFoodAsk(page, /We’ll cook it/);
  expect(hero, 'the generic food ask reached the hero').not.toBeNull();
  const text = await hero.innerText();
  expect(text.split('How you handle the food shapes').length - 1).toBeLessThanOrEqual(1);
});

test('the grill-master ask is headlined by its own question', async ({ page }) => {
  await boot(page, seed('The Cookout', 'ev-food-grill'));
  const hero = await toFoodAsk(page, /grill/i);
  expect(hero, 'the grill-master ask reached the hero').not.toBeNull();
  await expect(hero.locator('h2.ask')).not.toHaveText(/^Decide the menu\.?$/);
});
