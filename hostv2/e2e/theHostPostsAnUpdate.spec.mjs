// ─── THE HOST POSTS ONE UPDATE TO EVERYONE (owner, 11/16/2026) ──────────────
//
// "Go with recommendations": an update shows on every guest's invite and is
// emailed once to guests who ticked "email me"; 3 a day, 20 per event.
// Host side: "Updates to everyone" in the Guest list sheet, above the
// questions (no new tab). Posting to guests who will be emailed takes a second
// tap that says so; at the limit the box is replaced by the reason; taking a
// post off the invite says emails already sent stay sent.
// Guest side: "Updates from Vida" on the invite, newest first; nothing at all
// when there are none.
//
// The API is mocked at the e2e bundle's fake host. Everything is synthetic.
import { test, expect, settled, sheetSettled, dateIn } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const EVENT_ID = 'upd-e2e';
const CODE = 'upd-e2e-code-00000001';
const T1 = '11111111-1111-4111-8111-111111111111';
const EVENT = {
  id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'friendsgiving', createdAt: '2026-11-01',
  guestMode: 'list', venue: 'Pine Street Commons', startTime: '16:00', startTimeSource: 'host', hostName: 'Vida Ramos',
  rsvpCode: CODE, guests: [{ id: 'g1', name: 'Ana Ruiz', rsvp: 'Yes' }], vendors: [], budget: [], timeline: [],
};
const THREADS = [{ id: T1, guest_name: 'Ana Ruiz', unanswered: true, blocked: false, created_at: '2026-11-16T20:00:00Z',
  last_author: 'guest', last_body: 'Is there parking?', message_count: 1, email_notices: true }];

test.use({ timezoneId: 'America/New_York' });

const boot = async (page) => {
  await page.addInitScript(([ev, iso]) => {
    localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Vida Ramos' }));
  }, [EVENT, dateIn(10)]);
};

const serveHost = async (page, { today = 0, total = 0, emailGuests = 2, list = [] } = {}) => {
  const calls = { post: [], del: [] };
  const state = { today, total, list: [...list] };
  const view = () => ({ ok: true, announcements: state.list, email_guests: emailGuests,
    limits: { today: state.today, total: state.total, per_day: 3, per_event: 20 } });
  await page.route(`${API}/api/events/${EVENT_ID}/guest-threads`, (r) => r.fulfill({ status: 200, json: THREADS }));
  await page.route(`${API}/api/events/${EVENT_ID}/announcements`, (r) => {
    if (r.request().method() === 'POST') {
      const body = r.request().postDataJSON().body;
      calls.post.push(body);
      state.today += 1; state.total += 1;
      const a = { id: 'a' + state.total, body, created_at: '2026-11-16T23:00:00Z', removed: false };
      state.list.unshift(a);
      return r.fulfill({ status: 200, json: { ok: true, announcement: a, emailing: emailGuests, limits: view().limits } });
    }
    return r.fulfill({ status: 200, json: view() });
  });
  await page.route(`${API}/api/events/${EVENT_ID}/announcements/*`, (r) => {
    const id = r.request().url().split('/').pop();
    calls.del.push(id);
    state.list = state.list.map((a) => (a.id === id ? { ...a, removed: true } : a));
    return r.fulfill({ status: 200, json: { ok: true, announcements: state.list } });
  });
  return calls;
};

const openGuestList = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?elegant=1');
  await settled(page);
  await page.locator('[data-who-questions]').click();
  await sheetSettled(page);
  return page.locator('[data-host-updates]');
};

test('posting to guests who get email takes a second tap that says so, then says who got it', async ({ page }) => {
  await boot(page);
  const calls = await serveHost(page);
  const box = await openGuestList(page);
  await expect(box).toBeVisible();
  await expect(box.locator('[data-updates-reach]')).toHaveText('It shows on every guest’s invite, and the 2 guests who asked for email get it by email.');
  await expect(box.locator('[data-updates-left]')).toHaveText('3 of 3 left today · 20 of 20 left for this event');
  await box.getByRole('textbox', { name: 'Your update to every guest' }).fill('Parking is on Elm after 5.');
  await box.locator('[data-update-post]').click();
  expect(calls.post).toEqual([]);                                   // the first tap only asks
  await expect(box.locator('[data-update-post]')).toHaveText('Post and email 2 guests');
  await expect(box).toContainText('An email can’t be taken back once it’s sent.');
  await box.locator('[data-update-post]').click();
  await expect(box.locator('[data-update-status]')).toHaveText('Posted — it’s on every invite, and 2 guests get it by email.');
  expect(calls.post).toEqual(['Parking is on Elm after 5.']);
  await expect(box.locator('[data-update-list] li')).toHaveCount(1);
  await expect(box.locator('[data-updates-left]')).toHaveText('2 of 3 left today · 19 of 20 left for this event');
  // Taking it off the invite says what it can't undo.
  await box.getByRole('button', { name: 'Take it off the invite' }).click();
  await expect(box.locator('[data-update-status]')).toHaveText('Taken off the invite. Emails already sent stay sent.');
  await expect(box.locator('[data-update-list]')).toHaveCount(0);
  expect(calls.del).toEqual(['a1']);
});

test('with nobody asking for email, one tap posts and the page says nobody is emailed', async ({ page }) => {
  await boot(page);
  const calls = await serveHost(page, { emailGuests: 0 });
  const box = await openGuestList(page);
  await expect(box.locator('[data-updates-reach]')).toHaveText('It shows on every guest’s invite. No guest has asked for email yet, so nobody is emailed.');
  await box.getByRole('textbox', { name: 'Your update to every guest' }).fill('Bring a chair.');
  await box.locator('[data-update-post]').click();
  await expect(box.locator('[data-update-status]')).toHaveText('Posted — it’s on every invite.');
  expect(calls.post).toEqual(['Bring a chair.']);
});

test('at the daily limit the box is replaced by the reason', async ({ page }) => {
  await boot(page);
  await serveHost(page, { today: 3, total: 3 });
  const box = await openGuestList(page);
  await expect(box.locator('[data-updates-limit]')).toHaveText('You’ve posted 3 updates in the last day — you can post again tomorrow.');
  await expect(box.getByRole('textbox', { name: 'Your update to every guest' })).toHaveCount(0);
  await expect(box.locator('[data-updates-left]')).toHaveText('0 of 3 left today · 17 of 20 left for this event');
});

// ── The guest's invite ───────────────────────────────────────────────────────
const serveInvite = async (page, items) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, event: { ...EVENT, hostNames: 'Vida Ramos', date: dateIn(10) } } }));
  await page.route(`${API}/api/public/invite/${CODE}/opened`, (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.route(`${API}/api/public/announcements/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, announcements: items } }));
};

test('the invite shows the host’s updates, newest first', async ({ page }) => {
  await serveInvite(page, [
    { body: 'Doors open at 4.', created_at: '2026-11-16T23:00:00Z' },
    { body: 'Parking is on Elm\nafter 5.', created_at: '2026-11-16T20:00:00Z' },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?rsvp=' + CODE);
  const card = page.locator('[data-guest-updates]');
  await expect(card).toContainText('Updates from Vida');
  await expect(card.locator('[data-guest-update]')).toHaveCount(2);
  await expect(card.locator('[data-guest-update]').first()).toContainText('Doors open at 4.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('no updates: no box at all', async ({ page }) => {
  await serveInvite(page, []);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?rsvp=' + CODE);
  await expect(page.locator('.inv2-label').first()).toBeVisible();
  await expect(page.locator('[data-guest-updates]')).toHaveCount(0);
});
