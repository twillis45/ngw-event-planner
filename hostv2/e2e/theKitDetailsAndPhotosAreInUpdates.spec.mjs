// ─── THE DAY'S DETAILS AND GUESTS' PHOTOS IN THE KIT (G2c-2b step 5b; owner,
// 11/28/2026: "Approved, go with your recommendations"; UX_12 §8a, render
// screen 5) ─────────────────────────────────────────────────────────────────
// "Send the day's details" opens in the kit, not the old sheet: the guest brief
// written from the plan, every hand-off waiting for the checked reply link.
// "Photos from guests" shows from the event day with how many wait for her.
// The API is mocked at the e2e bundle's fake host (harness as in
// theKitUpdateIsWrittenFromThePlan); nothing real is contacted. Made-up names.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const ID = 'gk-upd';
const EV = {
  id: ID, name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), startTime: '15:00', startTimeSource: 'host', venue: 'Pine Street Commons', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: dateIn(10), invitesSentAt: '2026-11-24T15:00:00.000Z',
  vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g0', name: 'Rosa Lane', email: 'rosa@example.com', rsvp: 'Yes', invitedAt: '2026-11-24T15:00:00.000Z', invitedVia: 'email' }],
};
const PHOTOS = [{ id: 'p1', status: 'pending' }, { id: 'p2', status: 'pending' }, { id: 'p3', status: 'approved' }];
const SENT = { emails: [{ id: 'm1', created_at: '2026-11-24T15:00:00.000Z',
  delivery: { intent: 'invite', subject: 'You’re invited — Thanksgiving at ours', recipient_email: 'rosa@example.com', status: 'delivered' } }] };

const boot = async (page, w = 390, h = 844, ev = EV) => {
  await page.setViewportSize({ width: w, height: h });
  const posts = [];
  await page.route(`${API}/api/events/${ID}/announcements`, (r) => {
    if (r.request().method() === 'POST') {
      const body = r.request().postDataJSON().body; posts.push(body);
      return r.fulfill({ status: 200, json: { ok: true, announcement: { id: 'a1', body, created_at: '2026-11-28T15:00:00Z', removed: false }, emailing: 0, limits: { today: 1, total: 1, per_day: 3, per_event: 20 } } });
    }
    return r.fulfill({ status: 200, json: { ok: true, announcements: [], email_guests: 0, limits: { today: 0, total: 0, per_day: 3, per_event: 20 } } });
  });
  await page.route(`${API}/api/events/${ID}/guest-threads`, (r) => r.fulfill({ status: 200, json: [] }));
  await page.route(`${API}/api/events/${ID}/invite-opens`, (r) => r.fulfill({ status: 200, json: { guests: [], days: [] } }));
  await page.route(`${API}/api/events/${ID}/communication/sent`, (r) => r.fulfill({ status: 200, json: SENT }));
  await page.route(`${API}/api/events/${ID}/guest-photos`, (r) => r.fulfill({ status: 200, json: { photos: PHOTOS } }));
  await page.addInitScript(([e, id]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-hostv2-sync-stamps', JSON.stringify({ [id]: new Date().toISOString() }));
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Vida Ramos' }));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, [ev, ID]);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await page.locator('[data-guests-kit] [data-step="updates"]').click();
  const view = page.locator('[data-guests-kit="updates"]');
  await expect(view).toBeVisible();
  return { view, posts };
};


test('send the day’s details opens in the kit, written from the plan; signed out, nothing can go yet', async ({ page }) => {
  const { view } = await boot(page);
  await view.locator('[data-send-details]').click();
  const sheet = page.getByRole('dialog', { name: 'Send the day’s details' });
  await expect(sheet).toBeVisible();
  await expect(page.locator('.sheet #sheet-title')).toHaveCount(0);            // not the old Guests sheet
  await expect(sheet.locator('[data-details]')).toHaveValue(/Pine Street Commons, Springfield, VA/);       // the plan's own facts
  await expect(sheet.locator('[data-details]')).toHaveValue(/\[your reply link goes here\]/);   // the link's place held
  await expect(sheet.getByRole('button', { name: 'Sign in' })).toBeVisible();   // the reply link needs the account
  await expect(sheet.locator('[data-details-copy]')).toBeDisabled();
  await expect(sheet.locator('[data-details-text]')).toBeDisabled();
});

for (const [w, h] of [[390, 844], [1194, 834]])
test(`from the event day, photos from guests shows how many wait — ${w}x${h}`, async ({ page }) => {
  const { view } = await boot(page, w, h, { ...EV, date: dateIn(0) });
  await expect(view.locator('[data-photos-waiting]')).toContainText('Photos from guests');
  await expect(view.locator('[data-photos-waiting]')).toContainText('2 waiting');
});

test('before the event day there is no photos row', async ({ page }) => {
  const { view } = await boot(page);
  await expect(view.locator('[data-send-details]')).toBeVisible();
  await expect(view.locator('[data-photos-waiting]')).toHaveCount(0);
});
