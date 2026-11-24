// ─── A SECOND PARTY IS FREE TO PLAN (Model H, owner ruling 11/13/2026) ───────
//
// "Go with H for now." Under Model D a host's second event of their own was
// stamped pass-required at creation (door 3, "any event after the first") and
// its very first vendor brief took the $39 pass. Model H removes that door:
// every event is free to plan, with one vendor-brief loop, and the pass is for
// a second vendor on the event or a destination/multi-day event. Board record:
// BOARD_2026-11-12.md, Model H and both follow-ups. Engine: src/lib/passGate.js.
//
// What this pins, on the passgate bundle (billing live):
//   · a second event created through the real creation screen, with a first
//     event of the host's own already there, is stamped free, the creation
//     screen says planning is free, and the board shows no pass pill;
//   · an event already stamped under door 3 ALONE (Model D) is free: no pill,
//     and its first vendor brief is minted;
//   · a destination stamp still locks (the control — without it, "no pill"
//     would also pass on a bundle where the pill never renders);
//   · the pass sheet leads with the before-paying line and no "Your next events".
//
// Same harness as passSalesPausedSaysPaused.spec.mjs; every request to the
// bundle's API host is answered below. Port: 5266, or PW_PASSGATE_PORT.
import { test, expect, settled, dateIn, openSectionByName, openJumpTo, passRow, goToStage } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const API = 'https://passgate-mock.invalid';
const BASE = previewUrl(Number(process.env.PW_PASSGATE_PORT || 5266));
const CODE = 'abcdefghij1234567890xy';
// 11/15/2026 (consumer panel): trip wording only on a trip. A party's sheet
// drops "and get trip tools" and the destination-toolkit perk; a trip keeps both.
const BEFORE_PAYING = 'Planning stays free. Pay $39 once to send the details to all your vendors, not just the first.';
const BEFORE_PAYING_TRIP = 'Planning stays free. Pay $39 once to send the details to all your vendors, not just the first, and get trip tools.';

// A place a vendor can find: since 11/23/2026 (six root causes, cause 6) a
// brief does not go out without one (lib/outwardReady).
const ev = (id, name, over = {}) => ({ id, name, type: 'Birthday Party', date: dateIn(60),
  venue: 'The Loft', venueKind: 'venue', venueCity: 'Bowie', venueState: 'MD',
  guestEstimate: 20, guestMode: 'count', guestCountSource: 'host',
  budget: [], guests: [], timeline: [], vendors: [], briefSharedVendorIds: [], ...over });

// The host's first event: theirs, free, and its one free brief already spent.
const FIRST = ev('cust-first-party', 'First Backyard Party', {
  passRequired: false, passReasons: [],
  vendors: [{ id: 'v-grill', name: 'Smoke Signal BBQ', category: 'Catering' }], briefSharedVendorIds: ['v-grill'] });

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]'));

const boot = async (page, events, last) => {
  const calls = { mint: 0 };
  await page.addInitScript(([evs, id]) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify(evs));
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, [events, last]);
  await page.route(API + '/**', (route) => route.fulfill({ status: 200, json: {} }));
  await page.route(API + '/api/capabilities', (route) => route.fulfill({ status: 200, json: { stripe_configured: true, stripe_can_honour_purchases: true } }));
  await page.route(API + '/api/stripe/pass**', (route) => route.fulfill({ status: 200, json: { held: false } }));
  await page.route(API + '/api/events/*/vendor-brief-links', (route) => { calls.mint += 1; return route.fulfill({ status: 200, json: { ok: true, code: CODE } }); });
  await page.goto(BASE + '?elegant=1');
  await settled(page);
  return calls;
};


test('a second event of her own is stamped free at creation, and the creation screen says so', async ({ page }) => {
  await boot(page, [FIRST], FIRST.id);
  // PREMISE: we are on her first event, so the next one is truly her second.
  await expect(page.getByText(/First Backyard Party/i).first()).toBeVisible();
  await openJumpTo(page);
  await goToStage(page, 'Create');
  await page.getByPlaceholder(/crab feast/i).first().fill('Game night at my place for 10 people on Friday');
  // The blunt disclosure, before any work is invested.
  await expect(page.getByText(/^Planning this event is free, including sending the details to one vendor \(that takes a free account\)\./)).toBeVisible();
  expect(await page.evaluate(() => document.body.innerText)).not.toMatch(/your next event|first event already had the free run/i);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect.poll(async () => (await stored(page)).length, { timeout: 15000 }).toBe(2);
  const second = (await stored(page)).find((e) => e.id !== FIRST.id);
  expect(second.id.startsWith('cust-'), 'the new event is the host’s own, not a sample').toBe(true);
  expect(second.passRequired).toBe(false);
  expect(second.passReasons).toEqual([]);
  // And her board for it carries no pass pill.
  await settled(page);
  await expect(page.locator('.pass-status')).toHaveCount(0);
});

test('an event stamped under door 3 alone is free: no pill, and its first vendor brief is made', async ({ page }) => {
  const SECOND = ev('cust-second-party', 'Second Backyard Party', {
    passRequired: true, passReasons: ['additional-event'],
    vendors: [{ id: 'v-dj', name: 'Spin Cycle', category: 'DJ' }] });
  const calls = await boot(page, [FIRST, SECOND], SECOND.id);
  await expect(page.getByText(/Second Backyard Party/i).first()).toBeVisible();
  await expect(page.locator('.pass-status')).toHaveCount(0);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  await page.locator('.vcard', { hasText: 'Spin Cycle' }).first().evaluate((c) => c.click());
  // 11/15/2026: the button's words changed to "Send {name} the details" (owner + host
  // board ruling); it is the same gated mint, so only the selector moved.
  await page.getByRole('button', { name: 'Send Spin Cycle the details', exact: true }).click();
  // The live link was minted; the pass sheet did not open in its place.
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();
  expect(calls.mint).toBe(1);
  await expect(page.locator('#sheet-title')).not.toHaveText('The One-Event Pass');
  const saved = (await stored(page)).find((e) => e.id === SECOND.id);
  expect(saved.briefSharedVendorIds).toEqual(['v-dj']);
  // Grandfather: the old stamp is left as stored, never rewritten.
  expect(saved.passReasons).toEqual(['additional-event']);
});

test('(control) a destination stamp still locks: the pill shows on the board', async ({ page }) => {
  const TRIP = ev('cust-trip-party', 'Lake House Weekend', { isDestination: true, passRequired: true, passReasons: ['destination'] });
  await boot(page, [FIRST, TRIP], TRIP.id);
  await expect(page.locator('.pass-status-needed')).toBeVisible();
});

test('the pass sheet leads with the before-paying line, and sells no "next events"', async ({ page }) => {
  await boot(page, [FIRST], FIRST.id);
  await openJumpTo(page);
  await passRow(page).click();
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
  await expect(page.locator('[data-before-paying]')).toHaveText(BEFORE_PAYING);
  await expect(page.getByText('Your next events')).toHaveCount(0);
  await expect(page.getByText(/first event/i)).toHaveCount(0);
  // The perks the ruling keeps, and the standing no-vendor-fees commitment.
  await expect(page.getByText('Send every vendor the details', { exact: true })).toBeVisible();
  await expect(page.getByText('One event, one price', { exact: true })).toBeVisible();
  await expect(page.getByText(/Your vendors pay us nothing/)).toBeVisible();
  // A backyard party is not a trip: nothing on the sheet sells trip tools.
  await expect(page.getByText('The full destination toolkit', { exact: true })).toHaveCount(0);
  expect(await page.locator('.sheet').innerText()).not.toMatch(/\btrips?\b|destination/i);
});

test('on a trip, the pass sheet still sells the destination toolkit', async ({ page }) => {
  const TRIP = ev('cust-trip-party', 'Lake House Weekend', { isDestination: true, passRequired: true, passReasons: ['destination'] });
  await boot(page, [FIRST, TRIP], TRIP.id);
  await openJumpTo(page);
  await passRow(page).click();
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
  await expect(page.locator('[data-before-paying]')).toHaveText(BEFORE_PAYING_TRIP);
  await expect(page.getByText('The full destination toolkit', { exact: true })).toBeVisible();
});
