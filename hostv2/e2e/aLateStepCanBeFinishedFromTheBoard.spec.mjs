// ─── A LATE STEP CAN BE FINISHED FROM THE BOARD ──────────────────────────────
//
// Owner report, 11/18/2026: "Can't get past this screen after completing the
// invite info." The board's top card read "Send the invite … past its window"
// and its one button said "Decide". Every overdue checklist step becomes a
// board "decision" (CommandCenter tier 2), and "Decide" routed to the Decisions
// tab — which in hostv2 opens "Calls to make — All settled. Nothing waiting on
// you." The card had no tick, so the host went round the same loop forever.
//
// Now the card's button goes where the step is done (checklistRouteFor), and a
// "Mark done" on the card ticks the step itself.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const STEP_ID = 'pbt-e2e-late-t_invite';
const INVITE = 'Send the invite with date, time, and a one-line "what we are playing"; ask for a rough RSVP to size food/seats';
const ALL_FOOD = { game_type: 'Board games', food_model: 'Host provides snacks', drinks: 'Beer/wine/soda only', sourcing: 'cook' };
const GOT = Object.fromEntries(['p_batch', 'p_beer_wine', 'p_board', 'p_cups_plates', 'p_dessert', 'p_dips', 'p_ice',
  'p_napkins', 'p_salsa', 'p_scorepad', 'p_snacks', 'p_soda', 'p_trash'].map((k) => [k, true]));

const openBoard = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'e2e-late', name: 'My Game Night', type: 'Game Night', date: dateIn(4),
    createdAt: new Date(Date.now() - 6 * 864e5).toISOString(),
    venue: 'Home', venueKind: 'home', venueConfirmed: true, venueCity: 'Baltimore', venueState: 'MD', startTime: '19:00',
    guestMode: 'count', guestEstimate: 8, guestCountSource: 'host', vendors: [], guests: [],
    dietaryNoted: true, foodChoices: ALL_FOOD, foodGot: GOT, totalBudget: 400, budget: [], rainPlan: 'Indoors',
    timeline: [{ id: STEP_ID, task: INVITE, leadDays: -7, week: '1 week out', done: false, owner: '', category: 'planning', phase: 'guest' }],
  });
  await page.goto('?elegant=1');
  await settled(page);
  return page.locator(`[id="card-decision:${STEP_ID}"]`);
};

test('(premise) the late invite step is the board\'s card', async ({ page }) => {
  const card = await openBoard(page);
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(/Send the invite/i);
});

test('THE FIX: its button goes where the invite is sent, not to an empty "Calls to make"', async ({ page }) => {
  const card = await openBoard(page);
  const cta = card.locator('.cta');
  await expect(cta).not.toHaveText(/^Decide$/i);
  await cta.click();
  await expect(page.getByText(/I already sent it/i).first()).toBeVisible();
  await expect(page.getByText(/All settled\. Nothing waiting on you/i)).toHaveCount(0);
});

test('THE FIX: "Mark done" on the card ticks the step and the board moves on', async ({ page }) => {
  const card = await openBoard(page);
  await card.locator('[data-mark-step-done]').click();
  await expect(card).toHaveCount(0);
  const done = await page.evaluate((id) => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].timeline || [])
    .find((t) => t.id === id)?.done, STEP_ID);
  expect(done).toBe(true);
});

// A TICK RECORDS WHAT IT STANDS FOR (owner, 11/18/2026): ticking the invite
// step is the same fact as "I already sent it", so the guest list stops asking.
test('ticking the invite step tells the guest list it went out', async ({ page }) => {
  const card = await openBoard(page);
  await card.locator('[data-mark-step-done]').click();
  await expect(card).toHaveCount(0);
  const sent = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].invitesSentAt);
  expect(sent).toBeTruthy();
  await openSectionByName(page, 'Guests');
  await expect(page.locator('.sheet').last()).toBeVisible();
  await expect(page.locator('[data-invite-sent]')).toHaveCount(0);
});

test('(premise) before the tick, the guest list does offer "I already sent it"', async ({ page }) => {
  await openBoard(page);
  await openSectionByName(page, 'Guests');
  await expect(page.locator('[data-invite-sent]').first()).toBeVisible();
});
