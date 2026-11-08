// ─── THE SECOND DEVICE'S EDITS WERE PINNED FOREVER (live smoke test, 11/8/2026) ─
//
// The owner changed the guest count 6 → 8 on a laptop, saw it on the phone,
// then set it back to 6 on the phone ("Synced"). The laptop kept showing 8.
//
// On the device where an event ARRIVED from the account, it lived only in
// memory (hydratedEvents), and patchEvent saved every edit to it as a local
// override (LS_PATCH) laid over the account copy on every load. The override
// was uploaded, but it was never cleared, so each reload put the laptop's old 8
// back on top of the account's newer 6. Any field this device once changed was
// frozen against every later edit from anywhere else.
//
// Now the first edit makes the event this device's own (the custom store, no
// override), so the queue rule every device already follows applies: a newer
// account copy wins unless this device has an edit it hasn't uploaded.
//
// On the synctest bundle (5244), signed in against a fake project; every
// request is answered below and nothing leaves the machine.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(5244);
const PROJECT = 'https://synctest.supabase.co';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const ID = 'ev-from-the-phone';
const session = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' },
});
const gameNight = (guestEstimate) => ({ id: ID, name: 'My Game Night', type: 'Game Night', date: '2027-03-06',
  createdAt: '2026-11-07T10:00:00.000Z', guestMode: 'count', guestEstimate, guestCountSource: 'host', budget: [], vendors: [], guests: [] });

// The account copy, as the other device last saved it. Tests change it between loads.
let cloud;
let version;

const install = async (page) => {
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request(); const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/events')) {
      if (req.method() !== 'GET') {             // this device's save lands
        const body = req.postDataJSON();
        const row = Array.isArray(body) ? body[0] : body;
        if (row && row.data) cloud = row.data;
        version = '2026-11-08T12:00:0' + (Number(version.slice(-1)) + 1) + '.000000+00:00';
        return json([{ id: ID, updated_at: version }]);
      }
      return json([{ id: ID, data: cloud, updated_at: version }]);
    }
    if (url.includes('/auth/v1/')) return json({});
    return json([]);
  });
  await page.addInitScript((sess) => {
    if (sessionStorage.getItem('__booted')) return;   // a reload keeps what the app wrote
    sessionStorage.setItem('__booted', '1');
    localStorage.setItem('sb-synctest-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, session());
};

const boot = async (page) => {
  await page.goto(BASE + '?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(2500);   // past the account pull
};

const shownGuests = async (page) => {
  await page.locator('button', { hasText: 'planned around' }).first().click();
  await expect(page.locator('#sheet-title')).toBeVisible();
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const m = text.match(/Your people (\d+)/);
  if (!m) throw new Error('guest count not found in: ' + text.slice(0, 300));
  const n = Number(m[1]);
  await page.getByRole('button', { name: /^(Close|Back)$/ }).first().click();
  return n;
};

test('an event that came from the account still takes the account\'s later edits', async ({ page }) => {
  cloud = gameNight(6);
  version = '2026-11-08T12:00:00.000000+00:00';
  await install(page);
  await boot(page);

  // PREMISE: this device is showing the account's event, which it never had locally.
  await expect(page.getByText('MY GAME NIGHT', { exact: false }).first()).toBeVisible();
  expect(await shownGuests(page)).toBe(6);

  // The laptop's edit: 6 → 7. It is saved to the account.
  await page.locator('button', { hasText: 'planned around' }).first().click();
  await page.getByRole('button', { name: 'More guests' }).first().click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /^(Close|Back)$/ }).first().click();
  expect(cloud.guestEstimate, 'the edit should reach the account').toBe(7);

  // The phone sets it to 9 and saves. The laptop reloads.
  cloud = gameNight(9);
  version = '2026-11-08T12:05:00.000000+00:00';
  await page.reload();
  await boot(page);

  expect(await shownGuests(page), 'the laptop kept its own old edit over the account\'s newer copy').toBe(9);
  const stuck = await page.evaluate((id) => localStorage.getItem('ngw-hostv2-patch-' + id), ID);
  expect(stuck).toBeNull();
});
