// ─── A PLAN FROM THE ACCOUNT CAN BE DELETED ON ANY DEVICE (owner, 11/28/2026) ─
// The live signed-in check found it: on a browser where her plans arrive from
// the account (a second device), the plan list showed Rename and no "Delete this
// event". Delete was offered only for plans first made in that browser. Owner:
// "Yes, fix the delete on synced plans."
//
// Same harness as crossDeviceSync: a fake Supabase project and a fabricated
// session, every request answered here; nothing real is contacted. This browser
// holds no plans of its own; the account holds two. Deleting one asks first,
// names it, sends the account delete, and it stays gone after a reload: from
// the account once it confirms, and, when the account delete fails, because
// the tombstone outranks the account until it confirms. Made-up names only.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { openEventsSheet } from './fixtures.mjs';

const BASE = previewUrl(5244);
const PROJECT = 'https://synctest.supabase.co';
const STUDIO = '11111111-2222-3333-4444-555555555555';

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' },
});
const PLANS = [
  { id: 'ev-acct-keep', name: 'Lane Family Reunion', type: 'Family Reunion', date: '2027-06-12', guestMode: 'count', guestCount: 30, createdAt: '2026-11-01T10:00:00.000Z' },
  { id: 'ev-acct-gone', name: 'Bell Housewarming', type: 'Housewarming', date: '2027-03-06', guestMode: 'count', guestCount: 18, createdAt: '2026-11-02T10:00:00.000Z' },
];

const install = async (page, deletes, { deleteFails = false } = {}) => {
  const gone = new Set();
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request(); const url = req.url();
    const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/events')) {
      if (req.method() === 'DELETE') {
        deletes.push(url);
        if (deleteFails) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"unavailable"}' });
        gone.add(...PLANS.filter((e) => url.includes(e.id)).map((e) => e.id));
        return json([]);
      }
      if (req.method() !== 'GET') return json([]);
      return json(PLANS.filter((e) => !gone.has(e.id)).map((e) => ({ id: e.id, data: e, updated_at: '2026-11-20T12:00:00.000Z' })));
    }
    return json(url.includes('/auth/v1/') ? {} : []);
  });
  await page.addInitScript(([sess, id]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('sb-synctest-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, [fakeSession(), PLANS[0].id]);
};
const boot = async (page) => {
  await page.goto(BASE + '?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
};
const rowNames = (page) => page.locator('.sheet .frow .f-name');

for (const deleteFails of [false, true])
test(`a plan from the account has Delete, asks first, and stays gone after a reload${deleteFails ? ' — even when the account delete fails' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const deletes = [];
  await install(page, deletes, { deleteFails });
  await boot(page);
  await openEventsSheet(page);
  await expect(page.locator('.sheet')).toContainText('synced to your account');
  await expect(rowNames(page).filter({ hasText: 'Bell Housewarming' })).toHaveCount(1);
  // Both of her synced plans offer it, named.
  await expect(page.getByRole('button', { name: 'Delete Lane Family Reunion' })).toBeVisible();
  const del = page.getByRole('button', { name: 'Delete Bell Housewarming' });
  await expect(del).toBeVisible();
  await del.click();
  await expect(page.locator('.sheet .frow-confirm')).toContainText('Delete “Bell Housewarming” for good?');
  await page.getByRole('button', { name: 'Delete Bell Housewarming for good' }).click();
  await expect(rowNames(page).filter({ hasText: 'Bell Housewarming' })).toHaveCount(0);
  await expect(rowNames(page).filter({ hasText: 'Lane Family Reunion' })).toHaveCount(1);
  await expect.poll(() => deletes.some((u) => u.includes('ev-acct-gone'))).toBe(true);
  // Gone from the account, or (its delete failed) held off by the tombstone.
  await page.reload();
  await boot(page);
  await openEventsSheet(page);
  await expect(rowNames(page).filter({ hasText: 'Lane Family Reunion' })).toHaveCount(1);
  await expect(rowNames(page).filter({ hasText: 'Bell Housewarming' })).toHaveCount(0);
});

test('deleting the plan that is open leaves her on her other plan, not a sample', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const deletes = [];
  await install(page, deletes);
  await boot(page);
  await openEventsSheet(page);
  await expect(page.locator('.sheet .tag.plan')).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete Lane Family Reunion' }).click();
  await page.getByRole('button', { name: 'Delete Lane Family Reunion for good' }).click();
  await expect(page.locator('[data-tt-title], .ev-eyebrow').first()).toContainText('Bell Housewarming');
});
