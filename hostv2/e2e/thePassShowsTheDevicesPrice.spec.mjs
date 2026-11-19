// ─── THE PASS SHOWS THIS DEVICE'S PRICE, AND CHECKOUT CHARGES IT (G86) ──────
//
// Owner approval 11/19/2026: "a $49 test (second Stripe price)". The backend
// reports the test through /api/capabilities; the browser computes its own
// price from that and its stored key (lib/passPrice), and the checkout sends
// the key so the server charges the same price (stripe_payments.pass_price_for,
// held to the same vectors as the browser).
//
// Driven in the rendered app: a device seeded into a bucket INSIDE the share
// reads $49 on the sheet, the refund line, the buy button and a door, and its
// checkout request carries its key. With the test off, the same device reads
// $39 everywhere. On the passgate bundle (5266), the only one with billing
// live; every request to its API host is answered below.
import { readFileSync } from 'node:fs';
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const API = 'https://passgate-mock.invalid';
const VECTORS = JSON.parse(readFileSync(new URL('../../backend/tests/pass_price_vectors.json', import.meta.url), 'utf8'));
const TEST = { cents: 4900, share: 50 };
// The same rule, the same file: a key the server puts in the test arm at 50%.
const IN_TEST = VECTORS.keys.find((r) => r.variant === 'test' && r.bucket < TEST.share).key;
const IN_CONTROL = VECTORS.keys.find((r) => r.variant === 'control').key;

const ev = () => ({ id: 'cust-price-test', name: 'Lake House Weekend', type: 'Birthday Party', date: dateIn(60), endDate: dateIn(62),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [],
  isDestination: true, costSharing: { mode: 'self-pay' }, passRequired: true, passReasons: ['destination'] });

const CAPS = { stripe_configured: true, stripe_can_honour_purchases: true, pass_sales_paused: false };

const boot = async (page, { priceTest, key }) => {
  await page.addInitScript(([e, k]) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-pass-price-key', k);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, [ev(), key]);
  await page.route(API + '/**', (route) => route.fulfill({ status: 200, json: {} }));
  await page.route(API + '/api/capabilities', (route) => route.fulfill({ status: 200, json: { ...CAPS, pass_price_test: priceTest } }));
  await page.route(API + '/api/stripe/pass**', (route) => route.fulfill({ status: 200, json: { event_id: 'cust-price-test', held: false } }));
  await page.goto(previewUrl(Number(process.env.PW_PASSGATE_PORT || 5266)) + '?elegant=1');
  await settled(page);
};

const openSheet = async (page) => {
  await page.locator('.pass-status-needed').click();
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
};

const sheet = (page) => page.locator('.sheet').last();

test('test on, a device in the test arm: the sheet, the refund rule and the buy button say $49', async ({ page }) => {
  await boot(page, { priceTest: TEST, key: IN_TEST });
  await expect(page.locator('.pass-status-needed')).toHaveText(/^This event takes the One-Event Pass — \$49/);
  await openSheet(page);
  await expect(page.locator('[data-pass-price]')).toHaveText('$49');
  await expect(page.locator('[data-before-paying]')).toContainText('Pay $49 once');
  await expect(page.locator('[data-refund-rule]')).toContainText('get all $49 back');
  await expect(page.getByRole('button', { name: 'Get the pass — $49', exact: true })).toBeVisible();
  await expect(sheet(page).getByText(/\$39/)).toHaveCount(0);
});

test('test on, a device in the test arm: a door says $49, and checkout sends the device key', async ({ page }) => {
  await boot(page, { priceTest: TEST, key: IN_TEST });
  await openSectionByName(page, 'Who pays for what');
  await sheet(page).getByRole('button', { name: 'See the One-Event Pass — $49', exact: true }).click();
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
  const posted = page.waitForRequest((r) => r.url() === API + '/api/stripe/create-pass-session');
  await page.route(API + '/api/stripe/create-pass-session', (route) => route.fulfill({ status: 500, json: { detail: 'stub' } }));
  await page.getByRole('button', { name: 'Get the pass — $49', exact: true }).click();
  const body = (await posted).postDataJSON();
  expect(body.price_key).toBe(IN_TEST);
  for (const k of ['amount_cents', 'amount', 'price', 'price_cents', 'unit_amount']) expect(body).not.toHaveProperty(k);
});

test('test on, a device in the control arm: $39', async ({ page }) => {
  await boot(page, { priceTest: TEST, key: IN_CONTROL });
  await openSheet(page);
  await expect(page.locator('[data-pass-price]')).toHaveText('$39');
  await expect(page.getByRole('button', { name: 'Get the pass — $39', exact: true })).toBeVisible();
});

test('test off: the same test-arm device reads $39 on the sheet and the door', async ({ page }) => {
  await boot(page, { priceTest: null, key: IN_TEST });
  await expect(page.locator('.pass-status-needed')).toHaveText(/^This event takes the One-Event Pass — \$39/);
  await openSectionByName(page, 'Who pays for what');
  await sheet(page).getByRole('button', { name: 'See the One-Event Pass — $39', exact: true }).click();
  await expect(page.locator('#sheet-title')).toHaveText('The One-Event Pass');
  await expect(page.locator('[data-pass-price]')).toHaveText('$39');
  await expect(page.locator('[data-refund-rule]')).toContainText('get all $39 back');
  await expect(page.getByRole('button', { name: 'Get the pass — $39', exact: true })).toBeVisible();
  await expect(sheet(page).getByText(/\$49/)).toHaveCount(0);
});
