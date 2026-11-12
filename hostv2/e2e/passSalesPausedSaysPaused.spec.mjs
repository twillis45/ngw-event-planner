// ─── PASS SALES PAUSED: THE SHEET SAYS "PAUSED" (stage 9 work order #9) ──────
//
// The backend's stop-selling lever, PASS_SALES_PAUSED, makes /api/capabilities
// report `stripe_can_honour_purchases: false` and `pass_sales_paused: true`.
// The first alone would hide the buy button and drop the sheet into "Free while
// … is in preview" — untrue on a deployment where billing IS live and only new
// sales are stopped. This pins the copy the host actually reads.
//
// Backend half: backend/tests/test_pass_sales_pause.py. Client lib half:
// src/lib/__tests__/passSalesPaused.test.js.
//
// On the passgate bundle (5266), the only one with billing live; every request
// to its API host is answered below. Same harness as thePassIsOnTheBoard.spec.mjs.
import { test, expect, settled, dateIn } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const API = 'https://passgate-mock.invalid';
const ev = () => ({ id: 'cust-paused-pass', name: 'Lake House Weekend', type: 'Birthday Party', date: dateIn(60),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [],
  isDestination: true, passRequired: true, passReasons: ['destination'] });

const boot = async (page, caps, { held = false } = {}) => {
  const event = ev();
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, event);
  await page.route(API + '/**', (route) => route.fulfill({ status: 200, json: {} }));
  await page.route(API + '/api/capabilities', (route) => route.fulfill({ status: 200, json: caps }));
  await page.route(API + '/api/stripe/pass**', (route) => route.fulfill({ status: 200, json: held
    ? { event_id: event.id, held: true, sku: 'one-event-pass', amount_cents: 3900, currency: 'usd' }
    : { event_id: event.id, held: false } }));
  await page.goto(previewUrl(5266) + '?elegant=1');
  await settled(page);
  // A held pass shows no "needs the pass" pill (by design), so open the sheet
  // from Jump to, the door every event has.
  if (held) {
    await page.locator('[aria-label="Menu"]').first().click();
    await page.locator('.nav-pass').click();
  } else {
    await page.locator('.pass-status-needed').click();
  }
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
};

const PAUSED = { stripe_configured: true, stripe_can_honour_purchases: false, pass_sales_paused: true };

test('paused: the sheet says sales are paused, offers no buy button, and never says "preview"', async ({ page }) => {
  await boot(page, PAUSED);
  await expect(page.getByText('Pass sales are paused right now', { exact: true })).toBeVisible();
  await expect(page.getByText(/Nothing can be charged at the moment\. Questions: events@noguessworksystems\.com/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'events@noguessworksystems.com' })).toHaveAttribute('href', 'mailto:events@noguessworksystems.com');
  await expect(page.getByRole('button', { name: /Get the pass/ })).toHaveCount(0);
  await expect(page.getByText(/in preview/)).toHaveCount(0);
});

test('paused: an event that already holds the pass still says it has the pass', async ({ page }) => {
  await boot(page, PAUSED, { held: true });
  await expect(page.getByText('This event has the pass', { exact: true })).toBeVisible();
  await expect(page.getByText('Pass sales are paused right now')).toHaveCount(0);
});

test('(premise) unpaused, the same bundle offers the buy button', async ({ page }) => {
  await boot(page, { stripe_configured: true, stripe_can_honour_purchases: true, pass_sales_paused: false });
  await expect(page.getByRole('button', { name: 'Get the pass — $39', exact: true })).toBeVisible();
  await expect(page.getByText('Pass sales are paused right now')).toHaveCount(0);
});

// Owner ruling 11/12/2026 (lib/refundRule): the refund rule is read BEFORE the
// money — visible, and above the buy button.
test('on sale: the refund rule sits above the buy button', async ({ page }) => {
  await boot(page, { stripe_configured: true, stripe_can_honour_purchases: true, pass_sales_paused: false });
  const rule = page.locator('[data-refund-rule]');
  const buy = page.getByRole('button', { name: 'Get the pass — $39', exact: true });
  await expect(rule).toHaveText('Changed your mind? Get all $39 back within 14 days if you have not sent a new vendor brief.');
  await rule.scrollIntoViewIfNeeded();
  await expect(rule).toBeVisible();
  const [r, b] = [await rule.boundingBox(), await buy.boundingBox()];
  expect(r.y + r.height).toBeLessThanOrEqual(b.y);
});

test('paused: no refund rule is offered for a sale that cannot happen', async ({ page }) => {
  await boot(page, PAUSED);
  await expect(page.locator('[data-refund-rule]')).toHaveCount(0);
});

test('paused after the sheet loaded: a 503 from checkout gets the paused toast', async ({ page }) => {
  await boot(page, { stripe_configured: true, stripe_can_honour_purchases: true, pass_sales_paused: false });
  await page.route(API + '/api/stripe/create-pass-session', (route) => route.fulfill({ status: 503, json: { detail: 'Pass sales are paused.' } }));
  await page.getByRole('button', { name: 'Get the pass — $39', exact: true }).click();
  await expect(page.getByText(/Pass sales are paused right now\. Nothing was charged\./)).toBeVisible();
});
