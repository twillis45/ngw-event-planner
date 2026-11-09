// ─── THE PASS ON THE COMMAND BOARD (owner decision, 11/9/2026) ───────────────
//
// On an event that needs the One-Event Pass (stamped pass-required at
// creation: a destination, multi-day, or next event), the event's main screen
// said nothing. The host learned only on opening a locked sheet, and the buy
// itself lived two taps deep in You & settings.
//
// Now one honest line sits above "Where you stand" on such an event, opens the
// pass sheet, and becomes "This event has the pass" once bought. A free event
// shows nothing: the ruled free tier never nags.
//
// On the passgate bundle (5266), the only one with billing live; every request
// to its API host is answered below.
import { test, expect, settled, dateIn } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const API = 'https://passgate-mock.invalid';
const LINE = 'This event takes the One-Event Pass';
const ev = (over) => ({ id: 'cust-board-pass', name: 'Lake House Weekend', type: 'Birthday Party', date: dateIn(60),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [], ...over });

const boot = async (page, event, { held = false } = {}) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, event);
  await page.route(API + '/**', (route) => route.fulfill({ status: 200, json: {} }));
  await page.route(API + '/api/capabilities', (route) => route.fulfill({ status: 200, json: { stripe_configured: true, stripe_can_honour_purchases: true } }));
  await page.route(API + '/api/stripe/pass**', (route) => route.fulfill({ status: 200, json: held
    ? { event_id: event.id, held: true, sku: 'one-event-pass', amount_cents: 3900, currency: 'usd' }
    : { event_id: event.id, held: false } }));
  await page.goto(previewUrl(5266) + '?elegant=1');
  await settled(page);
};

test('a destination event that needs the pass says so on its main screen, and opens the pass', async ({ page }) => {
  await boot(page, ev({ isDestination: true, passRequired: true, passReasons: ['destination'] }));
  const line = page.locator('.pass-status-needed');
  await expect(line).toBeVisible();
  await expect(line).toContainText(LINE);
  await expect(line).toContainText('where everyone stays');
  // It fits the screen: no sideways overflow at any viewport.
  const overflow = await line.evaluate((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > window.innerWidth + 1);
  expect(overflow, 'the pass line overflows').toBe(false);
  await line.click();
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
  await expect(page.getByRole('button', { name: 'Get the pass — $39', exact: true })).toBeVisible();
});

test('a next event names only what the pass unlocks there', async ({ page }) => {
  await boot(page, ev({ passRequired: true, passReasons: ['additional-event'] }));
  await expect(page.locator('.pass-status-needed')).toContainText('sharing vendor briefs with every vendor');
  await expect(page.locator('.pass-status-needed')).not.toContainText('where everyone stays');
});

test('a free event shows no pass line', async ({ page }) => {
  await boot(page, ev({ passRequired: false, passReasons: [] }));
  // PREMISE: the board rendered.
  await expect(page.getByText(/Lake House Weekend/i).first()).toBeVisible();
  await expect(page.locator('.pass-status')).toHaveCount(0);
});

test('once bought, the line says the event has the pass', async ({ page }) => {
  await boot(page, ev({ isDestination: true, passRequired: true, passReasons: ['destination'] }), { held: true });
  await expect(page.locator('.pass-status-held')).toContainText('This event has the pass');
  await expect(page.locator('.pass-status-needed')).toHaveCount(0);
});
