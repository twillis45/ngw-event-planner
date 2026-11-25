// ─── THE TRIP DETAILS POST TO EVERYONE'S INVITE (owner pick, 11/21/2026) ─────
//
// "Post to everyone's invite" on the trip details draft reuses Updates to
// everyone (HostUpdates' one post path): every guest's invite, an email to the
// guests who asked, the 3-a-day and 20-per-event caps, a second tap before an
// email. It shows only when signed in, on a saved trip, with travelers on the
// list, and then it is the sheet's one lit button. It reports only what the
// server says: a refused post is an error, never "Posted".
//
// THE HARNESS is the rsvpsync bundle (5277): a fake Supabase session and an
// API base. Every request is answered here. Everything is synthetic.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { settled, sheetSettled, openSectionByName, checklistStepAction } from './fixtures.mjs';
import { tripEvent, litButtons } from './tripDetailsFixture.mjs';

const BASE = previewUrl(Number(process.env.PW_RSVPSYNC_PORT || 5277));
const PROJECT = 'https://rsvpsync.supabase.co';
const API = 'https://rsvpsync-mock.invalid';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const ID = 'ev-trip-post';
const T_LOADED = '2026-11-21T12:00:00.000000+00:00';

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'host@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

/** Boot signed in on the trip; `post` is how the server answers a post. */
const boot = async (page, { ev = tripEvent(ID), emailGuests = 2, today = 0, post = 200 } = {}) => {
  const posts = [];
  const limits = () => ({ today, total: today, per_day: 3, per_event: 20 });
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/events')) {
      if (req.method() !== 'GET') return json([{ id: ID, updated_at: T_LOADED }]);
      return json([{ id: ID, data: ev, updated_at: T_LOADED }]);
    }
    return json(url.includes('/auth/v1/') ? {} : []);
  });
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${API}/api/events/${ID}/announcements`, (r) => {
    if (r.request().method() === 'POST') {
      posts.push(r.request().postDataJSON().body);
      if (post !== 200) return r.fulfill({ status: post, json: { detail: 'server error' } });
      today += 1;
      return r.fulfill({ status: 200, json: { ok: true, announcement: { id: 'a1', body: posts[0] }, emailing: emailGuests, limits: limits() } });
    }
    return r.fulfill({ status: 200, json: { ok: true, announcements: [], email_guests: emailGuests, limits: limits() } });
  });
  await page.addInitScript(([sess, e, stamp]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('sb-rsvpsync-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ ...e, _cloudUpdatedAt: stamp }]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Vida Ramos' }));
  }, [fakeSession(), ev, T_LOADED]);
  await page.goto(BASE + '?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await (await checklistStepAction(page, 'Draft the trip details')).click();
  await sheetSettled(page);
  return { sheet: page.locator('.sheet').last(), posts };
};

test('signed in with travelers listed, it posts the reviewed words, asking first before an email', async ({ page }) => {
  const { sheet, posts } = await boot(page);
  const btn = sheet.locator('[data-post-invite-btn]');
  await expect(btn).toHaveText('Post to everyone’s invite');
  await expect(sheet.locator('[data-post-invite-reach]')).toHaveText('It shows on every guest’s invite, and the 2 guests who asked for email get it by email.');
  // The one lit button on the sheet.
  expect(await page.evaluate(litButtons)).toEqual(['Post to everyone’s invite']);
  const body = await sheet.getByRole('textbox', { name: 'Edit the draft' }).inputValue();
  await btn.click();
  expect(posts).toEqual([]);                                  // the first tap only asks
  await expect(btn).toHaveText('Post and email 2 guests');
  await expect(sheet).toContainText('An email can’t be taken back once it’s sent.');
  await btn.click();
  await expect(sheet.locator('[data-post-invite-status]')).toHaveText('Posted — it’s on every invite, and 2 guests get it by email.');
  expect(posts).toEqual([body.trim()]);
  await expect(sheet.locator('[data-post-invite-left]')).toHaveText('2 of 3 left today · 19 of 20 left for this event');
  // The post is the trip details sent (11/21/2026): the sheet says it was
  // posted, and the checklist step is done by the plan.
  await expect(sheet).toContainText('Posted on everyone’s invite');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  const row = page.locator('.sheet').last().locator('.frow').filter({ hasText: 'Send everyone the trip details' });
  await expect(row).toContainText('your plan did this');
});

test('a refused post says so and never claims it posted', async ({ page }) => {
  const { sheet, posts } = await boot(page, { emailGuests: 0, post: 500 });
  await sheet.locator('[data-post-invite-btn]').click();
  await expect(sheet.getByRole('alert')).toHaveText('That didn’t post. Try again.');
  await expect(sheet.locator('[data-post-invite-status]')).toHaveCount(0);
  expect(posts.length).toBe(1);
});

test('at the daily cap the button is replaced by the reason', async ({ page }) => {
  const { sheet } = await boot(page, { today: 3 });
  await expect(sheet.locator('[data-post-invite-limit]')).toHaveText('You’ve posted 3 updates in the last day — you can post again tomorrow.');
  await expect(sheet.locator('[data-post-invite-btn]')).toHaveCount(0);
});

test('with no travelers on the list, one line says why and nothing is offered', async ({ page }) => {
  const { sheet } = await boot(page, { ev: tripEvent(ID, { guests: [] }) });
  await expect(sheet.locator('[data-post-invite-why]')).toHaveText('Add the travelers to your guest list to post this on everyone’s invite.');
  await expect(sheet.locator('[data-post-invite-btn]')).toHaveCount(0);
});
