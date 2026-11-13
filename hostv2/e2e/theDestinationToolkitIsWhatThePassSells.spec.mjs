// ─── THE DESTINATION TOOLKIT IS WHAT THE PASS SELLS (gap H1, 11/12/2026) ────
//
// The $39 pass sheet sells "the full destination toolkit — lodging
// coordination, group travel, and the multi-day program". In code,
// `destinationLocked` was checked on three sheets only, so a buyer paid partly
// for things that were already open: every lodging door left for the cockpit
// (which never asked), and neither the weekend plan nor "Who pays for what"
// asked at all. The owner's review board (11/12) ruled: lock what the pass sells.
//
// This drives the three surfaces in the rendered app — locked with the pass
// door when no pass is held, open when it is, and open on an event stamped free
// (the grandfather rule: only the stamped verdict counts, never live fields).
//
// On the passgate bundle (5266), the only one with billing live; every request
// to its API host is answered below. Same harness as
// passSalesPausedSaysPaused.spec.mjs.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const API = 'https://passgate-mock.invalid';
const DOOR = 'See the One-Event Pass — $39';
// A multi-day destination event with a cost pool set up, so all three doors
// exist: "Travel & where everyone stays", "Your days", "Who pays for what".
const ev = (stamp) => ({ id: 'cust-dest-toolkit', name: 'Lake House Weekend', type: 'Birthday Party', date: dateIn(60), endDate: dateIn(62),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [],
  isDestination: true, costSharing: { mode: 'self-pay' }, ...stamp });
const LOCKED = { passRequired: true, passReasons: ['destination'] };
const FREE = { passRequired: false, passReasons: [] };

const boot = async (page, stamp, { held = false, path = '?elegant=1' } = {}) => {
  const event = ev(stamp);
  await page.addInitScript((e) => {
    // Seed once: the cockpit and the shell are separate page loads, and an
    // init script re-runs on every navigation.
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
      localStorage.setItem('ngw-hostv2-last-event', e.id);
    }
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, event);
  await page.route(API + '/**', (route) => route.fulfill({ status: 200, json: {} }));
  await page.route(API + '/api/capabilities', (route) => route.fulfill({ status: 200,
    json: { stripe_configured: true, stripe_can_honour_purchases: true, pass_sales_paused: false } }));
  await page.route(API + '/api/stripe/pass**', (route) => route.fulfill({ status: 200, json: held
    ? { event_id: event.id, held: true, sku: 'one-event-pass', amount_cents: 3900, currency: 'usd' }
    : { event_id: event.id, held: false } }));
  // A held pass is the SERVER's answer, so wait for it before tapping a door —
  // a tap that beats the answer is a different (and legitimate) state.
  const answered = held ? page.waitForResponse((r) => r.url().startsWith(API + '/api/stripe/pass')) : null;
  await page.goto(previewUrl(5266) + path);
  if (answered) await answered;
};
const bootShell = async (page, stamp, opts) => { await boot(page, stamp, opts); await settled(page); };

const sheet = (page) => page.locator('.sheet').last();
const LODGING_LOCK = /Where everyone stays lives here .* It’s part of the destination toolkit/;
const DAYS_LOCK = /The weekend plan lives here .* It’s part of the destination toolkit/;
const POOL_LOCK = /Who pays for what lives here .* It’s part of the destination toolkit/;

test.describe('no pass held: each surface the pass sells is teased with the pass door', () => {
  test('lodging: the board door opens the locked sheet instead of leaving for the cockpit', async ({ page }) => {
    await bootShell(page, LOCKED);
    await openSectionByName(page, 'Travel & where everyone stays');
    await expect(page.locator('#sheet-title')).toHaveText('Where everyone stays');
    await expect(sheet(page).getByText(LODGING_LOCK)).toBeVisible();
    expect(new URL(page.url()).searchParams.get('demo')).toBeNull();
    await sheet(page).getByRole('button', { name: DOOR, exact: true }).click();
    await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
  });

  test('lodging cockpit, reached by its own URL: the backstop teases it too, and its door opens the pass', async ({ page }) => {
    await boot(page, LOCKED, { path: '?demo=lodging' });
    await expect(page.getByText(LODGING_LOCK)).toBeVisible();
    await expect(page.locator('.lc-rail')).toHaveCount(0);
    await page.getByRole('button', { name: DOOR, exact: true }).click();
    await settled(page);
    await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
    expect(new URL(page.url()).searchParams.get('open')).toBeNull();
  });

  test('the weekend plan: teased in the space sheet, no editor', async ({ page }) => {
    await bootShell(page, LOCKED);
    await openSectionByName(page, 'Your days');
    await expect(page.locator('#sheet-title')).toHaveText('Space, seats & helpers');
    const lock = sheet(page).getByText(DAYS_LOCK);
    await lock.scrollIntoViewIfNeeded();
    await expect(lock).toBeVisible();
    await expect(sheet(page).getByRole('button', { name: 'Use this plan' })).toHaveCount(0);
    // Inward planning stays open: the span controls on the same sheet still work.
    await expect(sheet(page).getByRole('button', { name: 'Add a day to this event' })).toBeVisible();
    await sheet(page).getByRole('button', { name: DOOR, exact: true }).click();
    await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
  });

  test('who pays for what: teased, no pool controls', async ({ page }) => {
    await bootShell(page, LOCKED);
    await openSectionByName(page, 'Who pays for what');
    await expect(page.locator('#sheet-title')).toHaveText('Who pays for what');
    await expect(sheet(page).getByText(POOL_LOCK)).toBeVisible();
    await expect(sheet(page).getByText('How the money works')).toHaveCount(0);
    await sheet(page).getByRole('button', { name: DOOR, exact: true }).click();
    await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
  });
});

// The same three surfaces, open. Run twice: once because the server confirms
// a pass, once because the event was stamped free at creation (grandfathered).
for (const [label, stamp, held] of [['pass held', LOCKED, true], ['stamped free (grandfathered)', FREE, false]]) {
  test.describe(label + ': the toolkit opens normally', () => {
    test('lodging: the door leaves for the cockpit, which opens unlocked', async ({ page }) => {
      await bootShell(page, stamp, { held });
      await openSectionByName(page, 'Travel & where everyone stays');
      await page.waitForURL(/demo=lodging/);
      await expect(page.locator('.lc-rail')).toBeVisible();
      await expect(page.getByText(LODGING_LOCK)).toHaveCount(0);
    });

    test('the weekend plan: the editor is there', async ({ page }) => {
      await bootShell(page, stamp, { held });
      await openSectionByName(page, 'Your days');
      await expect(page.locator('#sheet-title')).toHaveText('Space, seats & helpers');
      const use = sheet(page).getByRole('button', { name: 'Use this plan' });
      await use.scrollIntoViewIfNeeded();
      await expect(use).toBeVisible();
      await expect(sheet(page).getByText(DAYS_LOCK)).toHaveCount(0);
    });

    test('who pays for what: the pool controls are there', async ({ page }) => {
      await bootShell(page, stamp, { held });
      await openSectionByName(page, 'Who pays for what');
      await expect(sheet(page).getByText('How the money works')).toBeVisible();
      await expect(sheet(page).getByText(POOL_LOCK)).toHaveCount(0);
    });
  });
}
