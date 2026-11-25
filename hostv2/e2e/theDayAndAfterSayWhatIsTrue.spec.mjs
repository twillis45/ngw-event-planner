// ─── THE DAY AND AFTER SAY WHAT IS TRUE (audit 2 lane C, time travel) ───────
//
// The page clock is fixed in every test (setFixedTime: timers still run).
//   P0-1 / P1-7  On the day the hero is the run of show and the cue the clock
//                is on — not a planning chore — and 8 AM and 9 PM differ.
//   P0-6 / P1-5  A trip's day 1 and day 3 are the same trip-day hero, and the
//                venue ask does not run through the trip.
//   P0-3 / P0-5 / P1-9 / P1-10  After the date: no "Landed inside" without
//                recorded spend, no permit question, no moment to protect, no
//                open Calls, no "all clear" over an unpaid balance, and the
//                unpaid balance is what "still owed" names.
// Events are the audit's own seeds (audit2/C/scripts/events.js).
import { test, expect, settled, identityLine } from './fixtures.mjs';

const WEDDING = {
  id: 'aud-wedding', name: 'Maya & Jordan’s Wedding', type: 'Wedding', date: '2027-10-16', startTime: '16:00', startTimeSource: 'host',
  venue: 'Bluemont Vineyard', venueCity: 'Bluemont, VA', state: 'VA', guestMode: 'count', guestCount: 150, guestEstimate: 150, totalBudget: 45000,
  budget: [], guests: [], timeline: [], createdAt: '2026-12-20T15:00:00.000Z',
  vendors: [
    { id: 'aud-w-v1', name: 'Bluemont Vineyard', category: 'Venue', budgetCategory: 'Venue', status: 'Confirmed', cost: 12000, depositAmt: 4000, depositPaid: true, balancePaid: false, payDueDate: '2027-09-16', contractSigned: true },
    { id: 'aud-w-v2', name: 'Harvest Table Catering', category: 'Catering', budgetCategory: 'Catering', status: 'Quoted', cost: 14000, depositPaid: false, contractSigned: false },
    { id: 'aud-w-v3', name: 'Lens & Light Photo', category: 'Photography', budgetCategory: 'Photography', status: 'Booked', cost: 4200, depositAmt: 1000, depositPaid: true, balancePaid: false, payDueDate: '2027-10-02', contractSigned: true },
  ],
};
const BIRTHDAY = {
  id: 'aud-bday', name: 'Dana’s 40th Potluck', type: 'Birthday', milestoneBirthday: 40, honoree: 'Dana', date: '2027-06-12', startTime: '15:00', startTimeSource: 'host',
  venue: 'Our backyard', venueCity: 'Silver Spring, MD', state: 'MD', venueKind: 'home', guestMode: 'count', guestCount: 30, guestEstimate: 30, totalBudget: 600,
  foodChoices: { food_style: 'Potluck' }, budget: [], vendors: [], guests: [], timeline: [], createdAt: '2026-08-16T14:00:00.000Z',
};
const TRIP = {
  id: 'aud-trip', name: 'Girls Trip to Nashville', type: 'Group Trip', date: '2027-05-13', endDate: '2027-05-16',
  isDestination: true, venueCity: 'Nashville', state: 'TN', guestMode: 'count', guestCount: 8, guestEstimate: 8, totalBudget: 8000,
  passReasons: ['destination', 'multi-day'], budget: [], vendors: [], guests: [], timeline: [], createdAt: '2026-07-17T14:00:00.000Z',
};

const boot = async (page, ev, when) => {
  await page.clock.setFixedTime(new Date(when));
  await page.addInitScript(([e]) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    if (!localStorage.getItem('ngw-hostv2-custom-events')) localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
  }, [ev]);
  await page.goto('?elegant=1');
  await settled(page);
};
const hero = (page) => page.locator('.hero .hzone').first();
// OWNER RULING 11/23/2026 (b), six root causes cause 4: on a day of the event
// the app opens on The Day. These tests read the plan's hero on that day, so
// they assert the landing first, then step to Plan.
const landsOnTheDayThenPlan = async (page) => {
  await expect(page.locator('button[aria-current="true"]', { hasText: /^The Day$/ }).first()).toBeAttached();
  await page.evaluate(() => { const b = [...document.querySelectorAll('button[aria-current]')].find((x) => x.innerText.trim() === 'Plan'); if (b) b.click(); });
  await settled(page);
};

// Cohesion E (owner E4, 11/24/2026): after the day, her own plan opens on
// After. The "day after" tests read the plan's hero, so they assert that
// landing first, then step to Plan, the same way the event-day tests do.
const landsOnAfterThenPlan = async (page) => {
  await expect(page.locator('button[aria-current="true"]', { hasText: /^After$/ }).first()).toBeAttached();
  await page.evaluate(() => { const b = [...document.querySelectorAll('button[aria-current]')].find((x) => x.innerText.trim() === 'Plan'); if (b) b.click(); });
  await settled(page);
};

test('8 AM on the wedding day: the hero is the run of show, and its first cue', async ({ page }) => {
  await boot(page, WEDDING, '2027-10-16T08:00:00');
  await landsOnTheDayThenPlan(page);
  await expect(hero(page).locator('h2.ask')).toHaveText('It’s today.');
  const cue = hero(page).locator('[data-dayof-cue]');
  await expect(cue).toContainText('Up first');
  await expect(cue).toContainText(/Hair \+ makeup/);
  await expect(hero(page)).not.toContainText(/Send payment|insurance/i);
});

test('9 PM on the wedding day: the cue the clock is on, not the 8 AM one', async ({ page }) => {
  await boot(page, WEDDING, '2027-10-16T21:10:00');
  await landsOnTheDayThenPlan(page);
  const cue = hero(page).locator('[data-dayof-cue]');
  await expect(cue).toContainText('Happening now');
  await expect(cue).toContainText(/send-off/i);
  await expect(cue).not.toContainText(/Hair \+ makeup/);
});

test('a trip’s day 1 and day 3 are the same trip-day hero, with no venue ask', async ({ page }) => {
  await boot(page, TRIP, '2027-05-13T09:00:00');
  await landsOnTheDayThenPlan(page);
  await expect(hero(page).locator('h2.ask')).toHaveText('Day 1 of 4.');
  await expect(identityLine(page)).toContainText('DAY 1 OF 4', { useInnerText: true });
  await expect(page.getByRole('main')).not.toContainText(/Pick the place|Where is the event\?/);

  await page.clock.setFixedTime(new Date('2027-05-15T09:00:00'));
  await page.reload();
  await settled(page);
  await landsOnTheDayThenPlan(page);
  await expect(hero(page).locator('h2.ask')).toHaveText('Day 3 of 4.');
  await expect(page.getByRole('main')).not.toContainText(/Pick the place|Where is the event\?|the basics are all settled/);
});

test('the day after a trip counts from its last day, and is not "the day"', async ({ page }) => {
  await boot(page, TRIP, '2027-05-17T10:00:00');
  await landsOnAfterThenPlan(page);
  await expect(identityLine(page)).toContainText('1 DAY AGO', { useInnerText: true });
  await expect(hero(page).locator('h2.ask')).toHaveText('All 4 days, done.');
  await expect(hero(page)).toContainText('yesterday');
});

test('the day after the wedding: what is owed leads, and nothing calls it all clear', async ({ page }) => {
  await boot(page, WEDDING, '2027-10-17T10:00:00');
  await landsOnAfterThenPlan(page);
  await expect(hero(page)).toContainText(/still owed — settle up with Bluemont Vineyard/i);
  await expect(hero(page)).not.toContainText(/Nothing needs you/);
  const main = page.getByRole('main');
  await expect(main).not.toContainText('all clear');
  await expect(main).not.toContainText(/Does this need a city or park permit/);
  await expect(main).not.toContainText(/Protect the moment/);
  await expect(main).not.toContainText(/Calls to make/);
});

test('the day after a potluck with nothing recorded spent: never "Landed inside"', async ({ page }) => {
  await boot(page, BIRTHDAY, '2027-06-13T10:00:00');
  await landsOnAfterThenPlan(page);
  await expect(hero(page)).not.toContainText(/Landed inside/);
  // Its own plan expects more than the $600 (owner ruling D-03: judged on expected).
  await expect(hero(page)).toContainText(/Expected to land \$[\d,]+ over the \$600 you planned/);
});

test('the day after, nothing recorded and nothing expected over: it says nothing was recorded', async ({ page }) => {
  await boot(page, { ...BIRTHDAY, totalBudget: 5000 }, '2027-06-13T10:00:00');
  await landsOnAfterThenPlan(page);
  await expect(hero(page)).not.toContainText(/Landed inside/);
  await expect(hero(page)).toContainText(/Nothing was recorded as spent against the \$5,000/);
});
