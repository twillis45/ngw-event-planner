// ─── THE NUDGE GOES TO THE ONES WHO HAVEN'T ANSWERED (owner ruling, 11/20/2026)
//
// "Approve as written." One action, "Nudge the N who haven't answered": guests
// whose invite went out and who have not replied, minus anyone nudged in the
// last 3 days. Email goes from the app, one per guest, through the guarded
// message route; the 40-a-day cap stops the run and the sheet says the rest go
// tomorrow. Guests with only a phone go into the one-at-a-time text queue, and
// a tap there is the host's word, never "sent". The rules are pinned in jest
// (src/lib/__tests__/replyNudge.test.js); this drives the shipped sheet.
//
// THE HARNESS is the rsvpsync bundle (5277): a fake Supabase session AND an
// API base, the one bundle where the app may email. Every request is answered
// here. Everything is synthetic.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn, settled, sheetSettled, openSectionByName } from './fixtures.mjs';

const BASE = previewUrl(Number(process.env.PW_RSVPSYNC_PORT || 5277));
const PROJECT = 'https://rsvpsync.supabase.co';
const API = 'https://rsvpsync-mock.invalid';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const EVENT_ID = 'ev-nudge-batch';
const CODE = 'e2enudgebatch00001';   // the RSVP link check needs 16+ characters
const T_LOADED = '2026-11-20T12:00:00.000000+00:00';

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'host@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

const daysAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d.toISOString(); };
const SENT = daysAgo(9);

const event = () => ({
  id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'Friendsgiving',
  date: dateIn(12), createdAt: '2026-11-01T10:00:00.000Z',
  startTime: '16:00', startTimeSource: 'host', venue: 'Vida’s place',
  rsvpCode: CODE, rsvpDeadline: dateIn(2),
  guestMode: 'list', guestEstimate: 6, guestCountSource: 'host', budget: [], vendors: [], timeline: [],
  guests: [
    { id: 'g1', name: 'Maya Chen', email: 'maya@example.test', invitedAt: SENT, invitedVia: 'email' },
    { id: 'g2', name: 'Jordan Ellis', phone: '(410) 555-0102', invitedAt: SENT, invitedVia: 'text' },
    { id: 'g3', name: 'Sam Ortiz', email: 'sam@example.test', invitedAt: SENT, invitedVia: 'email', rsvp: 'Yes' },
    { id: 'g4', name: 'Ana Ruiz', email: 'ana@example.test', invitedAt: SENT, invitedVia: 'email', nudgedAt: daysAgo(1), nudgedVia: 'email' },
    { id: 'g5', name: 'Lee Park', email: 'lee@example.test', invitedAt: SENT, invitedVia: 'email' },
    { id: 'g6', name: 'Rae Kim', email: 'rae@example.test' },   // never invited
  ],
});

/** Boot signed in. `answers` is what the message route says to each email, in order. */
const boot = async (page, answers, ev = event()) => {
  const posts = [];
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/events')) {
      if (req.method() !== 'GET') return json([{ id: EVENT_ID, updated_at: T_LOADED }]);
      return json([{ id: EVENT_ID, data: ev, updated_at: T_LOADED }]);
    }
    return json(url.includes('/auth/v1/') ? {} : []);
  });
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({
    status: 200, json: { ok: true, event: { id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: dateIn(12), rsvpCode: CODE, goingCount: 1 } },
  }));
  await page.route(`${API}/api/events/${EVENT_ID}/communication/channels/*/messages`, (r) => {
    if (r.request().method() !== 'POST') return r.fulfill({ status: 200, json: [] });
    const body = r.request().postDataJSON();
    posts.push(body);
    const a = answers[posts.length - 1] || answers[answers.length - 1];
    if (a === 429) return r.fulfill({ status: 429, json: { detail: 'This event has sent its email for today.' } });
    return r.fulfill({ status: 200, json: { id: `m${posts.length}`, metadata: JSON.stringify({ delivery: { status: 'accepted', recipient_email: body.recipient_email } }) } });
  });
  // The server's report, read by the guest row through the Messages view's read.
  await page.route(`${API}/api/events/${EVENT_ID}/communication/sent`, (r) => r.fulfill({
    status: 200, json: { emails: posts.map((p, i) => ({ id: `m${i + 1}`, created_at: new Date().toISOString(),
      delivery: { intent: 'email', status: 'email-delivered', recipient_email: p.recipient_email, subject: p.subject } })), cohosts: [] },
  }));
  await page.addInitScript(([sess, ev, stamp]) => {
    // An sms: link would leave the page; the handler on it is what is measured.
    window.addEventListener('click', (e) => {
      const a = e.target && e.target.closest && e.target.closest('a[href^="sms:"]');
      if (a) e.preventDefault();
    }, true);
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('sb-rsvpsync-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ ...ev, _cloudUpdatedAt: stamp }]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [fakeSession(), ev, T_LOADED]);
  await page.goto(BASE + '?elegant=1');
  await settled(page);
  return posts;
};

const saved = (page) => page.evaluate((id) => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events')).find((e) => e.id === id), EVENT_ID);

const openTheNudge = async (page) => {
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  // Maya, Jordan and Lee: invited, unanswered, not nudged lately. Sam answered,
  // Ana was nudged yesterday, Rae was never invited.
  await page.getByRole('button', { name: 'Nudge the 3 who haven’t replied', exact: true }).first().click();
  const block = page.locator('[data-nudge-list]');
  await expect(block).toBeVisible({ timeout: 15_000 });
  return block;
};

test('the batch emails the unanswered, skips the recently nudged, and texts go into the queue', async ({ page }) => {
  const posts = await boot(page, [200, 200]);
  const block = await openTheNudge(page);
  await expect(block).toContainText('Nudge the 3 who haven’t replied');
  await expect(block).toContainText('Skipped 1 guest nudged in the last 3 days.');

  await block.getByRole('button', { name: 'Email the nudge to 2 guests', exact: true }).click();
  await block.getByRole('button', { name: 'Send 2 emails', exact: true }).click();
  await expect(block.locator('[data-nudge-result]')).toHaveText('Emailed 2 guests — delivery shows in Messages.');

  // One email per guest, through the message route, with the reviewed words
  // and the checked RSVP link. Nobody answered, recent, or uninvited.
  expect(posts.map((p) => p.recipient_email)).toEqual(['maya@example.test', 'lee@example.test']);
  for (const p of posts) {
    expect(p.deliver_email).toBe(true);
    expect(p.subject).toMatch(/nudge/i);
    expect(p.body).toContain(`rsvp=${CODE}`);
  }

  // The text queue: Jordan has only a phone.
  await block.getByRole('button', { name: 'Text the nudge to 1 guest, one at a time', exact: true }).click();
  await expect(block.locator('[data-nudge-text-queue]')).toContainText('1 of 1: Jordan Ellis');
  const one = block.getByRole('link', { name: 'Text Jordan Ellis', exact: true });
  const href = await one.getAttribute('href');
  expect(href.startsWith('sms:4105550102?&body=')).toBe(true);
  expect(decodeURIComponent(href.split('body=')[1]).startsWith('Hi Jordan, just a friendly nudge')).toBe(true);
  await one.click();
  await expect(block).toContainText('That’s everyone with only a phone number.');

  // Counted (owner, 11/20/2026: the six events), from the dev tap: one
  // nudge_sent for the run with counts only, one nudge_text_sent per text.
  const tapped = await page.evaluate(() => (window.__NGW_TRACK__ || []).filter((t) => /^nudge_/.test(t.event)));
  expect(tapped).toEqual([
    { event: 'nudge_sent', emailed: 2, email_failed: 0, capped: false, texts_queued: 1, skipped_recent: 1 },
    { event: 'nudge_text_sent' },
  ]);

  const ev = await saved(page);
  const by = Object.fromEntries(ev.guests.map((g) => [g.id, g]));
  expect(by.g1.nudgedVia).toBe('email');
  expect(by.g5.nudgedVia).toBe('email');
  expect(by.g2.nudgedVia).toBe('text');
  expect(by.g3.nudgedAt).toBeUndefined();
  expect(by.g4.nudgedAt).toBe(event().guests[3].nudgedAt);   // untouched
  expect(by.g6.nudgedAt).toBeUndefined();

  // Each row says when and how; a text is the host's word, never "sent".
  await page.keyboard.press('Escape');
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  await expect(page.locator('[data-guest-nudged="g1"]')).toHaveText(/^Nudged [A-Z][a-z]{2} \d{1,2} · emailed — Delivered$/, { timeout: 10_000 });
  const jordan = page.locator('[data-guest-nudged="g2"]');
  await expect(jordan).toHaveText(/^Nudged [A-Z][a-z]{2} \d{1,2} · texted by you$/);
  await expect(jordan).not.toContainText(/sent/i);
  await expect(page.locator('[data-guest-nudged="g6"]')).toHaveCount(0);
});

test('a capped answer stops the run, and the sheet says the rest go tomorrow', async ({ page }) => {
  const posts = await boot(page, [200, 429]);
  const block = await openTheNudge(page);
  await block.getByRole('button', { name: 'Email the nudge to 2 guests', exact: true }).click();
  await block.getByRole('button', { name: 'Send 2 emails', exact: true }).click();
  await expect(block.locator('[data-nudge-result]'))
    .toHaveText('Emailed 1 guest — delivery shows in Messages. This event has sent its email for today. The other 1 go tomorrow — tap this again then.');
  expect(posts.map((p) => p.recipient_email)).toEqual(['maya@example.test', 'lee@example.test']);
  const ev = await saved(page);
  expect(ev.guests.find((g) => g.id === 'g1').nudgedVia).toBe('email');
  expect(ev.guests.find((g) => g.id === 'g5').nudgedAt).toBeUndefined();   // capped: not nudged
  expect(await page.evaluate(() => (window.__NGW_TRACK__ || []).filter((t) => t.event === 'nudge_sent')))
    .toEqual([{ event: 'nudge_sent', emailed: 1, email_failed: 0, capped: true, texts_queued: 1, skipped_recent: 1 }]);
});

test('the board asks 3 days before the host’s reply-by date, and its row opens the nudge', async ({ page }) => {
  const posts = await boot(page, [200]);
  // The compact "Then, in order" row keeps the title's lead (the board trims
  // an em-dash tail on every row); the full title is the item's own.
  const row = page.getByRole('button', { name: /^3 haven’t replied\b/ }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
  // On a wide canvas a row selects, and its pane carries the full title and
  // the button; on a phone the row itself opens the nudge.
  const pane = page.getByRole('complementary', { name: 'Selected item' });
  if (await pane.count()) {
    await expect(pane.getByRole('heading', { name: /^3 haven’t replied — replies due [A-Z][a-z]+day$/ })).toBeVisible();
    await pane.getByRole('button', { name: /^3 haven’t replied — replies due [A-Z][a-z]+day$/ }).click();
  }
  const block = page.locator('[data-nudge-list]');
  await expect(block).toBeVisible({ timeout: 15_000 });
  await expect(block).toContainText('Nudge the 3 who haven’t replied');
  expect(posts).toEqual([]);   // opening it sent nothing
});

test('with no reply-by date set, the chase step is the prompt, and tapping it opens the nudge', async ({ page }) => {
  // 11/23/2026: a step finds its button by its declared id (part 1 of the
  // six-cause fix), so the chase step sits on a type whose playbook declares
  // it. Friendsgiving has no t_rsvp_chase; Dinner Party does (target 'chase').
  const ev = { ...event(), type: 'Dinner Party', rsvpDeadline: undefined,
    timeline: [{ id: 't_rsvp_chase', task: 'Chase non-responders; lock the count', week: 'This week', done: false }] };
  const posts = await boot(page, [200], ev);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  // The step's row button, which wears the navigation arrow.
  await page.getByRole('dialog', { name: 'Your checklist' }).getByRole('button', { name: /^Open the nudge\b/ }).first().click();
  const block = page.locator('[data-nudge-list]');
  await expect(block).toBeVisible({ timeout: 15_000 });
  await expect(block).toContainText('Nudge the 3 who haven’t replied');
  expect(posts).toEqual([]);   // opening it sent nothing
});
