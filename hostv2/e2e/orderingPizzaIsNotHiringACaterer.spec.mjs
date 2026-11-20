// ─── ORDERING PIZZA IS NOT HIRING A CATERER (50-host sweep, 11/20/2026) ──────
// A birthday host answered the hero's food question with its own pick, "Order
// pizza/trays". The plan's parts all read handled, and the hero asked "Book your
// catering / food. You chose “Order pizza/trays” for the food; a caterer is not
// booked yet." Ordering is not hiring. Unit proof:
// src/lib/__tests__/orderingPizzaIsNotHiringACaterer.test.js.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const EV = {
  id: 'E2E_pizza', name: 'Maya’s 40th', type: 'Birthday', date: dateIn(30),
  guestMode: 'count', guestEstimate: 20, guestCountSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  startTime: '18:00', startTimeSource: 'host', totalBudget: 9000,
  budget: [], vendors: [], timeline: [], guests: [],
};

test('settling "Order pizza/trays" in the hero does not turn the hero into a caterer booking', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  const hero = page.locator('.hero').first();
  // PREMISE: the hero is on the food question, offering pizza/trays as its pick.
  await expect(hero.locator('button').filter({ hasText: 'Order pizza/trays' }).first()).toBeVisible();
  await hero.locator('button').filter({ hasText: 'Order pizza/trays' }).first().click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].foodChoices.food_style)).toBe('Order pizza/trays');
  await page.waitForTimeout(500);
  expect(await hero.innerText()).not.toMatch(/book your cater|a caterer is not booked/i);
  await page.reload();
  await settled(page);
  expect(await page.locator('.hero').first().innerText()).not.toMatch(/book your cater|a caterer is not booked/i);
});
