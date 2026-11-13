// ─── A FAILED BRIEF MINT MAKES NO LINK (stage 9 work order #13, S9-5 B) ──────
//
// With the brief API configured, a failed mint used to fall through to the
// legacy frozen snapshot — the whole brief encoded in the link, no server. The
// host believed a live brief had gone out, one that updates and takes
// confirmations; it did neither, and the server's 402 pass gate was bypassed.
//
// The board's check: "a test with mint returning 500 asserts no legacy URL is
// produced, an error is shown, and an event is emitted." That is the first test.
// The others pin the two named failures (402, 401) to their next step, and a
// positive control proves the flow mints a live link on this bundle at all —
// without it, "no link appeared" would also pass on a screen that never got as
// far as asking.
//
// On the passgate bundle (5266): the brief API is configured there and billing
// is live, so the client gate is the real one. Every request to its API host
// is answered below.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const API = 'https://passgate-mock.invalid';
const MINT = API + '/api/events/*/vendor-brief-links';
const CODE = 'abcdefghij1234567890xy';
const EVENT = { id: 'cust-brief-mint', name: 'Backyard Birthday', type: 'Birthday Party', date: dateIn(40),
  guestEstimate: 20, guestMode: 'count', guestCountSource: 'host', passRequired: false, passReasons: [],
  budget: [], guests: [], timeline: [], vendors: [{ id: 'v-dj', name: 'Spin Cycle', category: 'DJ' }] };

const track = (page, name) => page.evaluate((n) => (window.__NGW_TRACK__ || []).filter((r) => r.event === n), name);

const boot = async (page, mint) => {
  const calls = { mint: 0 };
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.route(API + '/**', (route) => route.fulfill({ status: 200, json: {} }));
  await page.route(API + '/api/capabilities', (route) => route.fulfill({ status: 200, json: { stripe_configured: true, stripe_can_honour_purchases: true } }));
  await page.route(API + '/api/stripe/pass**', (route) => route.fulfill({ status: 200, json: { event_id: EVENT.id, held: false } }));
  await page.route(MINT, (route) => { calls.mint += 1; return route.fulfill(mint); });
  await page.goto(previewUrl(Number(process.env.PW_PASSGATE_PORT || 5266)) + '?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  // The share button lives inside the card's fold; open the card first.
  await page.locator('.vcard', { hasText: 'Spin Cycle' }).first().evaluate((c) => c.click());
  await page.getByRole('button', { name: 'Share the vendor brief', exact: true }).click();
  return calls;
};

// Whatever the panel shows, it must not be a vendor link of either kind.
const noLinkMade = async (page) => {
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show QR', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.body.innerText.includes('?vendor='))).toBe(false);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]'));
  expect(stored[0].briefSharedVendorIds || [], 'a failed mint was recorded as a brief sent').toEqual([]);
};

test('(control) a mint that succeeds shows a live short link, not the snapshot', async ({ page }) => {
  const calls = await boot(page, { status: 200, json: { ok: true, code: CODE } });
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();
  await expect(page.getByText('?vendor=' + CODE)).toBeVisible();
  expect(calls.mint).toBe(1);
  expect(await track(page, 'brief_mint_failed')).toEqual([]);
});

test('a mint that returns 500 makes no legacy link, shows the error, and emits an event', async ({ page }) => {
  const calls = await boot(page, { status: 500, json: { detail: 'could not mint brief link' } });
  const alert = page.getByRole('alert').filter({ hasText: 'Couldn’t create the brief link. Try again.' });
  await expect(alert).toBeVisible();
  await noLinkMade(page);
  expect(calls.mint, 'an HTTP 500 is the server’s answer and is not silently retried').toBe(1);
  await expect.poll(async () => (await track(page, 'brief_mint_failed')).length).toBe(1);
  const [row] = await track(page, 'brief_mint_failed');
  expect(row).toMatchObject({ where: 'hostv2.vendor-brief', reason: 'failed', status_class: '5xx' });
  expect(JSON.stringify(row)).not.toMatch(/cust-brief-mint|Spin Cycle|Backyard/);
  // The one next step is a real retry: it asks the server again.
  await alert.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect.poll(() => calls.mint).toBe(2);
  await expect(alert).toBeVisible();
  await noLinkMade(page);
  await expect.poll(async () => (await track(page, 'brief_mint_failed')).length).toBe(2);
});

test('a 402 says the brief takes the pass and opens the pass sheet — no link', async ({ page }) => {
  await boot(page, { status: 402, json: { detail: { reason: 'pass-required', detail: 'Sharing this brief takes the One-Event Pass.' } } });
  const alert = page.getByRole('alert').filter({ hasText: 'Sharing this brief takes the One-Event Pass.' });
  await expect(alert).toBeVisible();
  await noLinkMade(page);
  await expect.poll(async () => (await track(page, 'brief_mint_failed')).length).toBe(1);
  expect((await track(page, 'brief_mint_failed'))[0]).toMatchObject({ reason: 'pass-required', status_class: '4xx' });
  await alert.getByRole('button', { name: 'See the One-Event Pass', exact: true }).click();
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
});

test('a 401 says to sign in and leads there — no link', async ({ page }) => {
  await boot(page, { status: 401, json: { detail: 'Planner authentication required' } });
  const alert = page.getByRole('alert').filter({ hasText: 'not signed in on this browser' });
  await expect(alert).toBeVisible();
  await noLinkMade(page);
  await expect.poll(async () => (await track(page, 'brief_mint_failed')).length).toBe(1);
  expect((await track(page, 'brief_mint_failed'))[0]).toMatchObject({ reason: 'signed-out', status_class: '4xx' });
  await alert.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('#sheet-title')).toHaveText('You & settings');
});
