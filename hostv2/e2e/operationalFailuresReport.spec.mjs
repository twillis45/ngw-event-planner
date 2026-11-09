import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const EVENT = { id: 'cust-private-reporting', name: 'Private planning notes', type: 'Cookout', date: dateIn(45), venueCity: 'Annapolis', state: 'MD', guestEstimate: 40, guestMode: 'count', guestCountSource: 'playbook-typical', passRequired: true, passReasons: ['destination'], budget: [], vendors: [], guests: [], timeline: [] };
const events = (page, name) => page.evaluate(name => (window.__NGW_TRACK__ || []).filter(row => row.event === name), name);
const seed = async (page, { stale = false, off = false } = {}) => page.addInitScript(({ event, stale, off }) => {
  localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([event]));
  localStorage.setItem('ngw-hostv2-last-event', stale ? 'missing-private-route' : event.id);
  localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
  localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  if (off) localStorage.setItem('ngw-analytics-optout', '1');
}, { event: EVENT, stale, off });
const failSave = async page => {
  await openSectionByName(page, 'Guests');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'ngw-hostv2-custom-events') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Plan for 40', exact: true }).click();
};

test('an actual rejected save reports a class and hashed correlation without event content', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1&people=1');
  await settled(page);
  await failSave(page);
  await expect.poll(async () => (await events(page, 'save_failed')).length).toBeGreaterThan(0);
  const reported = await events(page, 'save_failed');
  expect(reported[0].event_id_hash).toMatch(/^[a-f0-9]{16}$/);
  expect(JSON.stringify(reported)).not.toMatch(/cust-private|Private planning/);
});

test('the same real save refusal honors the existing analytics opt-out', async ({ page }) => {
  await seed(page, { off: true });
  await page.goto('?elegant=1&people=1');
  await settled(page);
  await failSave(page);
  await expect(page.locator('.save-failed')).toBeVisible();
  expect(await events(page, 'save_failed')).toEqual([]);
});

test('a configured provider failure is reported while the fallback remains usable', async ({ page }) => {
  await seed(page);
  await page.route('https://e2e-mock.invalid/api/food-prices**', route => route.fulfill({ status: 503, json: { detail: 'provider unavailable' } }));
  await page.goto('?elegant=1');
  await settled(page);
  await expect.poll(async () => (await events(page, 'provider_failed')).length).toBeGreaterThan(0);
  expect((await events(page, 'provider_failed'))[0]).toMatchObject({ where: 'foodPrices.get', reason: 'http-503' });
});

test('an unresolved event pointer reports route failure and still opens a usable plan', async ({ page }) => {
  await seed(page, { stale: true });
  await page.goto('?elegant=1');
  await settled(page);
  await expect.poll(async () => (await events(page, 'route_failed')).length).toBeGreaterThan(0);
  expect(JSON.stringify(await events(page, 'route_failed'))).not.toContain('missing-private-route');
});

const passBoot = async (page, { verifyFails = false, checkout = { status: 503, json: { detail: 'checkout unavailable' } } } = {}) => {
  await seed(page);
  const api = 'https://passgate-mock.invalid';
  await page.route(api + '/**', route => route.fulfill({ status: 200, json: {} }));
  await page.route(api + '/api/stripe/pass**', route => route.fulfill({ status: verifyFails ? 503 : 200, json: verifyFails ? { detail: 'unavailable' } : { held: false } }));
  await page.route(api + '/api/stripe/create-pass-session', route => route.fulfill(checkout));
  await page.goto(previewUrl(5266) + '?elegant=1');
  await settled(page);
};

test('pass view, checkout intent, and a real checkout failure are counted separately', async ({ page }) => {
  await passBoot(page);
  const rail = page.locator('.srail-row', { hasText: 'You & settings' });
  if (await rail.count()) await rail.first().click();
  else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('You & settings', { exact: false }).first().click();
  }
  await page.getByRole('button', { name: /^The One-Event Pass/ }).first().click();
  await expect.poll(async () => (await events(page, 'pass_sheet_viewed')).length).toBe(1);
  await page.getByRole('button', { name: 'Get the pass — $39', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('Checkout isn’t available');
  await expect.poll(async () => (await events(page, 'pass_checkout_started')).length).toBe(1);
  await expect.poll(async () => (await events(page, 'pass_checkout_failed')).length).toBe(1);
});

// SIGNED OUT (live smoke test, 11/9/2026): the server's real 401 reply to a
// browser with no sign-in. The host was told only "Checkout isn't available
// right now"; now the message says what to do, and offers the way there.
test('a signed-out checkout says to sign in, not that checkout is unavailable', async ({ page }) => {
  await passBoot(page, { checkout: { status: 401, json: { detail: 'Planner authentication required' } } });
  const rail = page.locator('.srail-row', { hasText: 'You & settings' });
  if (await rail.count()) await rail.first().click();
  else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('You & settings', { exact: false }).first().click();
  }
  await page.getByRole('button', { name: /^The One-Event Pass/ }).first().click();
  await page.getByRole('button', { name: 'Get the pass — $39', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('not signed in on this browser');
  await expect(page.locator('.toast')).toContainText('Nothing was charged');
  await page.locator('.toast').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#sheet-title')).toHaveText('You & settings');
});

test('a pass verification failure is visible to support without falsely revoking a pass', async ({ page }) => {
  await passBoot(page, { verifyFails: true });
  await expect.poll(async () => (await events(page, 'pass_verify_failed')).length).toBeGreaterThan(0);
  expect((await events(page, 'pass_verify_failed'))[0]).toMatchObject({ where: 'passEntitlement.refresh', reason: 'request-failed' });
});
