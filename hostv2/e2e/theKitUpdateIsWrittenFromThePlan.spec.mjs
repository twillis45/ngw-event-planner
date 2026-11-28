// ─── UPDATES AND QUESTIONS IN THE KIT (G2c-2b step 5a; owner, 11/28/2026:
// "Approved, go with your recommendations"; UX_12 §8a, render screen 5) ──────
// The update starts written from the plan (the old sheet's "Update everyone"
// draft), with Post, Copy and Text it. A blank the plan couldn't fill keeps all
// three off and says which. "Everything that went out" lists what the app sent
// to guests (the old Messages view's guest rows), read only.
// The API is mocked at the e2e bundle's fake host; nothing real is contacted.
// Made-up names only.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const ID = 'gk-upd';
const EV = {
  id: ID, name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), startTime: '15:00', startTimeSource: 'host', venue: 'Pine Street Commons', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', rsvpDeadline: dateIn(10), invitesSentAt: '2026-11-24T15:00:00.000Z',
  vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g0', name: 'Rosa Lane', email: 'rosa@example.com', rsvp: 'Yes', invitedAt: '2026-11-24T15:00:00.000Z', invitedVia: 'email' }],
};
const SENT = { emails: [{ id: 'm1', created_at: '2026-11-24T15:00:00.000Z',
  delivery: { intent: 'invite', subject: 'You’re invited — Thanksgiving at ours', recipient_email: 'rosa@example.com', status: 'delivered' } }] };

const boot = async (page, w = 390, h = 844) => {
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
  await page.addInitScript(([e, id]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-hostv2-sync-stamps', JSON.stringify({ [id]: new Date().toISOString() }));
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Vida Ramos' }));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, [EV, ID]);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await page.locator('[data-guests-kit] [data-step="updates"]').click();
  const view = page.locator('[data-guests-kit="updates"]');
  await expect(view).toBeVisible();
  return { view, posts };
};

for (const [w, h] of [[390, 844], [1194, 834]])
test(`the update starts from the plan; its blank keeps Post, Copy and Text off — ${w}x${h}`, async ({ page }) => {
  const { view } = await boot(page, w, h);
  const box = view.getByRole('textbox', { name: 'Your update to every guest' });
  await expect(box).toHaveValue(/a quick event update for Thanksgiving at ours/);
  await expect(box).toHaveValue(/— Vida Ramos$/);
  await expect(view.locator('[data-update-from-plan]')).toHaveText('Written from your plan. Edit it.');
  await expect(view.locator('[data-update-blank]')).toHaveText('Fill in [Add the update here] first, or take it out.');
  await expect(view.locator('[data-update-post]')).toBeDisabled();
  await expect(view.locator('[data-update-copy]')).toBeDisabled();
  await expect(view.locator('[data-update-text]')).toBeDisabled();
});

test('filled in, it posts her words, and Text it carries them with no recipient', async ({ page }) => {
  const { view, posts } = await boot(page);
  const box = view.getByRole('textbox', { name: 'Your update to every guest' });
  const filled = (await box.inputValue()).replace('[Add the update here]', 'Parking is on Elm St after 2.');
  await box.fill(filled);
  await expect(view.locator('[data-update-from-plan]')).toHaveCount(0);
  await expect(view.locator('[data-update-blank]')).toHaveCount(0);
  await expect(view.locator('[data-update-text]')).toHaveAttribute('href', 'sms:?&body=' + encodeURIComponent(filled));
  await view.locator('[data-update-post]').click();
  await expect.poll(() => posts).toEqual([filled]);
});

test('everything that went out lists what the app sent to guests, with its status', async ({ page }) => {
  const { view } = await boot(page);
  const out = view.locator('[data-went-out]');
  await expect(out.locator('[data-went="email-m1"]')).toContainText('You’re invited — Thanksgiving at ours');
  await expect(out.locator('[data-went="email-m1"]')).toContainText('by email');
});
