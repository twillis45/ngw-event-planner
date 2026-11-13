// ─── THE PASS ON THE COMMAND BOARD (owner decision, 11/9/2026) ───────────────
//
// On an event that needs the One-Event Pass (stamped pass-required at
// creation: a destination or multi-day event), the event's main screen
// said nothing. The host learned only on opening a locked sheet, and the buy
// itself lived two taps deep in You & settings.
//
// First it sat above "Where you stand", which on a phone is below the whole
// to-do list. Now (owner's second decision, same night) a quiet pill sits in
// the FIRST SCREEN of such an event and opens the pass sheet, and the Jump to
// menu carries a One-Event Pass row on every event, saying the truth for that
// event. A free event shows no pill: the ruled free tier never nags.
//
// Model H (owner ruling 11/13/2026): there is no "next event" door any more,
// so an event stamped under it alone is a free event and gets no pill.
//
// On the passgate bundle (5266, or PW_PASSGATE_PORT), the only one with billing
// live; every request to its API host is answered below.
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
  await page.goto(previewUrl(Number(process.env.PW_PASSGATE_PORT || 5266)) + '?elegant=1');
  await settled(page);
};

const openJumpTo = async (page) => {
  await page.locator('[aria-label="Menu"]').first().click();
  await expect(page.locator('#sheet-title')).toHaveText('Jump to');
};

test('a destination event that needs the pass says so in its first screen, and opens the pass', async ({ page }) => {
  await boot(page, ev({ isDestination: true, passRequired: true, passReasons: ['destination'] }));
  const pill = page.locator('.pass-status-needed');
  await expect(pill).toBeVisible();
  await expect(pill).toContainText(LINE);
  expect(await pill.getAttribute('aria-label')).toContain('where everyone stays');
  // In the first screen without scrolling, and never off the side of it.
  const fit = await pill.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, right: r.right, vh: window.innerHeight, vw: window.innerWidth, scrolled: window.scrollY };
  });
  expect(fit.scrolled).toBe(0);
  expect(fit.bottom, 'the pass pill is below the first screen').toBeLessThanOrEqual(fit.vh);
  expect(fit.right, 'the pass pill overflows sideways').toBeLessThanOrEqual(fit.vw + 1);
  await pill.click();
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
  await expect(page.getByRole('button', { name: 'Get the pass — $39', exact: true })).toBeVisible();
});

test('an event stamped only as a "next event" (Model D) shows no pill: it is free under Model H', async ({ page }) => {
  await boot(page, ev({ passRequired: true, passReasons: ['additional-event'] }));
  // PREMISE: the board rendered, so the missing pill is not a missing screen.
  await expect(page.getByText(/Lake House Weekend/i).first()).toBeVisible();
  await expect(page.locator('.pass-status')).toHaveCount(0);
  await openJumpTo(page);
  await expect(page.locator('.nav-pass')).toContainText('$39 · one event');
  await expect(page.locator('.nav-pass')).not.toContainText('needs it');
});

test('a free event shows no pass pill, and Jump to still reaches the pass', async ({ page }) => {
  await boot(page, ev({ passRequired: false, passReasons: [] }));
  // PREMISE: the board rendered.
  await expect(page.getByText(/Lake House Weekend/i).first()).toBeVisible();
  await expect(page.locator('.pass-status')).toHaveCount(0);
  await openJumpTo(page);
  const row = page.locator('.nav-pass');
  await expect(row).toContainText('The One-Event Pass');
  await expect(row).toContainText('$39 · one event');
  await row.click();
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
});

test('Jump to says when this event needs the pass', async ({ page }) => {
  await boot(page, ev({ isDestination: true, passRequired: true, passReasons: ['destination'] }));
  await openJumpTo(page);
  await expect(page.locator('.nav-pass')).toContainText('$39 · this event needs it');
});

test('once bought, the first screen is quiet and Jump to says the event has it', async ({ page }) => {
  await boot(page, ev({ isDestination: true, passRequired: true, passReasons: ['destination'] }), { held: true });
  await expect(page.getByText(/Lake House Weekend/i).first()).toBeVisible();
  await expect(page.locator('.pass-status-needed')).toHaveCount(0);
  await openJumpTo(page);
  await expect(page.locator('.nav-pass')).toContainText('this event has it');
});
