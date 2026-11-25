import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const EVENT = {
  id: 'cust-rsvp-capability', rsvpCode: 'public-rsvp-capability-code',
  name: 'RSVP capability birthday', type: 'Birthday Party', date: '2027-06-19',
  // A complete invite (day, host-set hour, place): the invite check (inviteGaps) stands aside.
  startTime: '16:00', startTimeSource: 'host', venue: 'Denise’s place',
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
// One link action (owner, 11/24/2026): "Share the link" shares, or copies where
// there is no share sheet; QR is "Show QR code". Both check the link first.
const shareButton = page => page.getByRole('button', { name: 'Share the link', exact: true }).first();
const qrButton = page => page.getByRole('button', { name: 'Show QR code', exact: true }).first();

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
  await qrButton(page).click();
  await expect(page.locator('.toast')).toContainText('Online RSVPs are not available');
  await expect(page.getByAltText(/QR code for the/)).toHaveCount(0);
});

// NO REPLY LINK, NOTHING GOES OUT (owner, 11/24/2026; was "a plain invitation
// remains useful"): the invite opens with the link's place held and every
// hand-off waits for it; the words can still be edited.
test('an invitation without a verified reply link cannot go out', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Invite text', exact: true }).first().click();
  const sheet = page.locator('.sheet').last();
  await expect(sheet.locator('[data-link-not-ready]')).toContainText('Your reply link isn’t ready.');
  await expect(sheet).not.toContainText('?rsvp=');
  await expect(sheet.getByRole('button', { name: 'Copy it', exact: true })).toBeDisabled();
  await expect(sheet.getByRole('textbox', { name: 'Edit the draft' })).toBeEditable();
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
  await qrButton(page).click();
  await expect(page.getByAltText(/QR code for the/)).toBeVisible();
});


// THE LINK ALONE (live smoke test, 11/8/2026), ONE ACTION (owner, 11/24/2026).
// "Copy the link" was merged into "Share the link", which copies where there is
// no share sheet. What it copies is still exactly the verified link, never the
// "You're invited… RSVP here: <link>" message that pasted into a browser as a
// search on Android.
test('with no share sheet, Share the link copies only the verified link', async ({ page }) => {
  await boot(page, 200);
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); });
  await shareButton(page).click();
  await expect.poll(() => page.evaluate(() => window.__rsvpCopies.length)).toBe(1);
  const current = new URL(page.url());
  const appUrl = process.env.REACT_APP_PUBLIC_APP_URL || current.origin + current.pathname;
  expect(await page.evaluate(() => window.__rsvpCopies[0])).toBe(appUrl + '?rsvp=' + EVENT.rsvpCode);
  expect(await page.evaluate(() => window.__rsvpShares.length)).toBe(0);
  await expect(page.getByRole('button', { name: 'Copy the link', exact: true })).toHaveCount(0);
});

test('with no share sheet, Share the link refuses an unpublished event, like every other share', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); });
  await shareButton(page).click();
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

// THE CHECK IS SHOWN, AND RUNS ONCE (attention audit, 11/18/2026). Each share
// button first asks the server whether the RSVP link works — up to 8 seconds —
// and nothing on screen said so, so a host tapped again and again. While the
// check runs, a busy notice names it, and a second tap starts no second check.
test('while the link is checked, a busy notice says so, and a second tap does nothing', async ({ page }) => {
  let release; const held = new Promise((r) => { release = r; });
  let asked = 0;
  await page.addInitScript(event => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([event]));
    localStorage.setItem('ngw-hostv2-last-event', event.id);
    window.__rsvpShares = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__rsvpShares.push(data); } });
  }, EVENT);
  await page.route(API + '/api/public/invite/**', async (route) => {
    asked += 1; await held;
    await route.fulfill({ status: 200, json: { ok: true, event: EVENT } });
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests');
  await shareButton(page).click();
  const notice = page.locator('.toast');
  await expect(notice).toContainText('Checking your invite link');
  await expect(notice.locator('[data-toast-busy]')).toHaveCount(1);
  await shareButton(page).click();
  await page.waitForTimeout(400);
  expect(asked).toBe(1);
  release();
  await expect(notice.locator('[data-toast-busy]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__rsvpShares.length)).toBe(1);
});
