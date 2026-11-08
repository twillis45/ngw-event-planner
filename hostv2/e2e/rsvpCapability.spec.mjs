import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const EVENT = {
  id: 'cust-rsvp-capability', rsvpCode: 'public-rsvp-capability-code',
  name: 'RSVP capability birthday', type: 'Birthday Party', date: '2027-06-19',
  guestEstimate: 25, guestMode: 'list', guests: [{ id: 'guest-1', name: 'Denise' }], vendors: [], budget: [], timeline: [],
};
const API = 'https://e2e-mock.invalid';
const boot = async (page, status = 404) => {
  await page.addInitScript(event => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([event]));
    localStorage.setItem('ngw-hostv2-last-event', event.id);
    window.__rsvpShares = []; window.__rsvpCopies = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__rsvpShares.push(data); } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__rsvpCopies.push(text); } } });
  }, EVENT);
  await page.route(API + '/api/public/invite/**', route => status === 0
    ? route.abort('failed')
    : route.fulfill({ status, json: status === 200 ? { ok: true, event: EVENT } : { detail: 'invite not found' } }));
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests');
};
const shareButton = page => page.getByRole('button', { name: /Check and share link/i }).first();

test('a configured service cannot share an unpublished event through native share or clipboard', async ({ page }, testInfo) => {
  await boot(page);
  await shareButton(page).click();
  await expect(page.locator('.toast')).toContainText('Online RSVPs are not available');
  expect(await page.evaluate(() => [window.__rsvpShares.length, window.__rsvpCopies.length])).toEqual([0, 0]);
  await expect.poll(() => page.locator('.toast').evaluate(el => Number(getComputedStyle(el).opacity))).toBe(1);
  const overflow = await page.locator('.sheet button').evaluateAll(buttons => buttons.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent));
  expect(overflow).toEqual([]);
  await page.screenshot({ path: `test-results/rsvp-unpublished-${testInfo.project.name || '390'}.png`, fullPage: true });
});

test('an unpublished event cannot produce a guest QR', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /Check and show QR/i }).first().click();
  await expect(page.locator('.toast')).toContainText('Online RSVPs are not available');
  await expect(page.getByAltText(/QR code for the/)).toHaveCount(0);
});

test('a plain invitation remains useful without an unverified URL', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Copy the invite', exact: true }).first().click();
  await expect(page.locator('.sheet')).toContainText('Your invite');
  await expect(page.locator('.sheet')).not.toContainText('?rsvp=');
});

test('public lookup uncertainty blocks sharing with a retry explanation', async ({ page }) => {
  await boot(page, 0);
  await shareButton(page).click();
  await expect(page.locator('.toast')).toContainText('Couldn’t verify this RSVP link');
  expect(await page.evaluate(() => window.__rsvpShares.length)).toBe(0);
});

test('a matching public event may be shared without changing local onboarding', async ({ page }, testInfo) => {
  await boot(page, 200);
  await shareButton(page).click();
  await expect.poll(() => page.evaluate(() => window.__rsvpShares.length)).toBe(1);
  const current = new URL(page.url());
  const appUrl = process.env.REACT_APP_PUBLIC_APP_URL || current.origin + current.pathname;
  expect(await page.evaluate(() => window.__rsvpShares[0].url)).toBe(appUrl + '?rsvp=' + EVENT.rsvpCode);
  await page.screenshot({ path: `test-results/rsvp-verified-${testInfo.project.name || '390'}.png`, fullPage: true });
});


test('a local preview cannot forward an unpublished invite to another device', async ({ page }) => {
  await boot(page);
  await page.goto('?rsvp=' + EVENT.rsvpCode);
  await expect(page.getByRole('button', { name: 'Forward this invite', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Forward this invite', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('not verified for sharing');
  expect(await page.evaluate(() => window.__rsvpShares.length)).toBe(0);
});

test('a verified event also supports clipboard and a guest QR', async ({ page }) => {
  await boot(page, 200);
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); });
  await shareButton(page).click();
  await expect.poll(() => page.evaluate(() => window.__rsvpCopies.length)).toBe(1);
  expect(await page.evaluate(() => window.__rsvpCopies[0])).toContain('?rsvp=' + EVENT.rsvpCode);
  await page.getByRole('button', { name: /Check and show QR/i }).first().click();
  await expect(page.getByAltText(/QR code for the/)).toBeVisible();
});


// THE LINK ALONE (live smoke test, 11/8/2026). On Android the share sheet's
// Copy took the whole "You're invited… RSVP here: <link>" message; pasted into
// a browser it became a search. With the share sheet available (this boot
// stubs navigator.share), "Copy the link" must still copy exactly the link and
// open no share sheet.
test('Copy the link copies only the verified link, even where a share sheet exists', async ({ page }) => {
  await boot(page, 200);
  await page.getByRole('button', { name: 'Copy the link', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => window.__rsvpCopies.length)).toBe(1);
  const current = new URL(page.url());
  const appUrl = process.env.REACT_APP_PUBLIC_APP_URL || current.origin + current.pathname;
  expect(await page.evaluate(() => window.__rsvpCopies[0])).toBe(appUrl + '?rsvp=' + EVENT.rsvpCode);
  expect(await page.evaluate(() => window.__rsvpShares.length)).toBe(0);
});

test('Copy the link refuses an unpublished event, like every other share', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Copy the link', exact: true }).first().click();
  await expect(page.locator('.toast')).toContainText('Online RSVPs are not available');
  expect(await page.evaluate(() => window.__rsvpCopies.length)).toBe(0);
});

test('an unacknowledged API reply stays queued and never celebrates delivery', async ({ page }) => {
  await boot(page, 200);
  await page.route(API + '/api/public/rsvp/**', route => route.fulfill({ status: 200, json: { ok: false } }));
  await page.goto('?rsvp=' + EVENT.rsvpCode);
  await expect(page.getByLabel(/Your name/i).first()).toBeVisible();
  await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
  await page.getByLabel(/Your name/i).first().fill('E2E queued guest');
  await page.getByRole('button', { name: /Send my reply/i }).click();
  await expect(page.locator('.inv2-ask')).toContainText('not delivered');
  await expect(page.locator('.inv2-ask')).not.toContainText('You’re in');
  const hit = await page.evaluate(() => (window.__NGW_TRACK__ || []).find(row => row.event === 'invite_rsvp_submitted'));
  expect(hit).toMatchObject({ delivered: false });
});


test('native sharing requires a configured public web destination', async ({ page }) => {
  await boot(page, 200);
  await page.evaluate(() => { window.Capacitor = { isNativePlatform: () => true }; });
  await shareButton(page).click();
  if (process.env.REACT_APP_PUBLIC_APP_URL) {
    await expect.poll(() => page.evaluate(() => window.__rsvpShares.length)).toBe(1);
    expect(await page.evaluate(() => window.__rsvpShares[0].url)).toBe(process.env.REACT_APP_PUBLIC_APP_URL + '?rsvp=' + EVENT.rsvpCode);
  } else {
    await expect(page.locator('.toast')).toContainText('public link address is missing');
    expect(await page.evaluate(() => [window.__rsvpShares.length, window.__rsvpCopies.length])).toEqual([0, 0]);
  }
});
