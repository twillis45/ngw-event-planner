// ─── SHARE & INVITE: THE PAGE, THE MESSAGE, THE SEND (owner, 11/24/2026) ────
//
// The owner-approved renders s2-1 to s2-6 ("build it"), the follow-on to the
// invite work:
//   1. The Share & invite card in four steps with one lit button that moves:
//      Get it right (Invite page, Invite message) · Send it (Invite your guest
//      list (N), quiet once everyone is invited, lit again for new guests) ·
//      Share another way (Share the link, Show QR code, Invite text) · After
//      it's out (a fold until something is sent; then Nudge the N who haven't
//      replied, Update everyone, Send the details).
//   2. The invite message: saved (event.inviteMessageDraft), previewed as an
//      email or a text, confirmed before sending, and recorded
//      (event.invitesSentMessage, "What went out").
//   3. No reply link, nothing goes out: the hand-offs and the list sender wait.
//   4. A guest marked told is not invited again.
//   5. The +1's meal and dietary need on the guest editor.
//
// THE HARNESS is the rsvpsync bundle (5277): a fake Supabase session and an API
// base, so the app's own email send renders. Every request is answered here;
// every name and address is made up; nothing leaves the page.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn, settled, sheetSettled, openSectionByName } from './fixtures.mjs';
import { litButtons } from './tripDetailsFixture.mjs';

const BASE = previewUrl(Number(process.env.PW_RSVPSYNC_PORT || 5277));
const PROJECT = 'https://rsvpsync.supabase.co';
const API = 'https://rsvpsync-mock.invalid';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const CODE = 'e2einvitemessage0001';
const T_LOADED = '2026-11-24T12:00:00.000000+00:00';
const SENT = new Date(Date.now() - 2 * 864e5).toISOString();

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'host@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

const MINE = 'It wouldn’t be the same without you. Come hungry, and bring a story from your year.';
const GUESTS = [
  { id: 'g1', name: 'Linda Reyes', email: 'linda@example.test' },
  { id: 'g2', name: 'Aunt Rosa', phone: '(614) 555-0142' },
];
const party = (id, over = {}) => ({
  id, name: 'Mom Linda’s Thanksgiving', type: 'Thanksgiving', date: dateIn(12), createdAt: '2026-11-01T10:00:00.000Z',
  startTime: '15:00', startTimeSource: 'host', venue: 'Dana’s house', venueCity: 'Columbus, OH',
  hostName: 'Dana Reyes', deckLine: MINE,
  rsvpCode: CODE, guestMode: 'list', guestEstimate: 4, guestCountSource: 'host',
  budget: [], vendors: [], timeline: [], guests: GUESTS.map((g) => ({ ...g })), ...over,
});
const sentGuests = () => GUESTS.map((g) => ({ ...g, invitedAt: SENT, invitedVia: g.email ? 'email' : 'text', rsvp: g.id === 'g1' ? 'Yes' : '' }));

/** Boot signed in (or out). `link`: 'ok' | 'down' — the invite link check. */
const boot = async (page, ev, { signedIn = true, link = 'ok' } = {}) => {
  const state = { link, posts: [] };
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/events')) {
      if (req.method() !== 'GET') return json([{ id: ev.id, updated_at: T_LOADED }]);
      return json(signedIn ? [{ id: ev.id, data: ev, updated_at: T_LOADED }] : []);
    }
    return json(url.includes('/auth/v1/') ? {} : []);
  });
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => (state.link === 'ok'
    ? r.fulfill({ status: 200, json: { ok: true, event: { id: ev.id, name: ev.name, type: ev.type, date: ev.date, rsvpCode: CODE, goingCount: 0 } } })
    : r.abort('internetdisconnected')));
  await page.route(`${API}/api/events/${ev.id}/communication/channels/*/messages`, (r) => {
    if (r.request().method() !== 'POST') return r.fulfill({ status: 200, json: [] });
    const body = r.request().postDataJSON();
    state.posts.push(body);
    return r.fulfill({ status: 200, json: { id: `m${state.posts.length}`, metadata: JSON.stringify({ delivery: { status: 'accepted', recipient_email: body.recipient_email } }) } });
  });
  await page.addInitScript(([sess, e, stamp]) => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: () => Promise.resolve() });
    window.addEventListener('click', (x) => {
      const a = x.target && x.target.closest && x.target.closest('a[href^="sms:"]');
      if (a) x.preventDefault();
    }, true);
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    if (sess) localStorage.setItem('sb-rsvpsync-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ ...e, ...(sess ? { _cloudUpdatedAt: stamp } : {}) }]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Dana Reyes' }));
  }, [signedIn ? fakeSession() : null, ev, T_LOADED]);
  await page.goto(BASE + '?elegant=1');
  await settled(page);
  return state;
};

const saved = (page, id) => page.evaluate((x) => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events')).find((e) => e.id === x), id);
const lit = (page) => page.evaluate(litButtons);
const card = (page) => page.locator('[data-share-invite]');
const openGuests = async (page) => {
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  await expect(card(page)).toBeVisible({ timeout: 10_000 });
};
// The card's own lit controls (the guest sheet holds other sections).
const cardLit = (page) => page.evaluate(() => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const want = getComputedStyle(probe).backgroundImage;
  probe.remove();
  const c = document.querySelector('[data-share-invite]');
  return [...c.querySelectorAll('button, a')].filter((e) => e.getClientRects().length && getComputedStyle(e).backgroundImage === want)
    .map((e) => (e.innerText || '').trim());
});
const topSheet = (page) => page.locator('.sheet').last();

test.describe('the Share & invite card', () => {
  test('before sending: four steps, and the one lit button is Invite your guest list', async ({ page }) => {
    await boot(page, party('si-before'));
    await openGuests(page);
    const c = card(page);
    await expect(c.locator('[data-si-step]')).toHaveText([/Get it right/i, /Send it/i, /Share another way/i, /After it.s out/i]);
    await expect(c.locator('[data-si-row="page"]')).toContainText('Invite page');
    await expect(c.locator('[data-si-row="message"]')).toContainText('Invite message');
    await expect.poll(() => cardLit(page)).toEqual(['Invite your guest list (2)']);
    await expect(c.getByRole('button', { name: 'I already sent it another way', exact: true })).toBeVisible();
    for (const t of ['Share the link', 'Show QR code', 'Invite text']) await expect(c.getByRole('button', { name: t, exact: true })).toBeVisible();
    // Step 4 is one quiet fold until something is sent.
    await expect(c.locator('[data-si-after-fold]')).toContainText('After you send');
    await expect(c.getByRole('button', { name: /Nudge the/ })).toHaveCount(0);
    // The old pile is gone.
    for (const t of ['Check and share link', 'Copy the link', 'Check and show QR', 'Copy the invite', 'Draft the guest brief']) {
      await expect(page.getByRole('button', { name: t, exact: true })).toHaveCount(0);
    }
  });

  test('one door, one name: Invite page opens the panel named Invite page, and the guest list has no second door', async ({ page }) => {
    await boot(page, party('si-door'));
    await openGuests(page);
    await expect(page.locator('.sheet').last().getByText('Your invite', { exact: true })).toHaveCount(0);
    await card(page).locator('[data-si-row="page"]').click();
    await expect(page.locator('#sheet-title')).toHaveText('Invite page', { timeout: 10_000 });
  });

  test('after sending: Everyone is invited goes quiet, and the nudge is the lit one', async ({ page }) => {
    await boot(page, party('si-after', {
      invitesSentAt: SENT, guests: sentGuests(),
      invitesSentMessage: { subject: 'You’re invited — Mom Linda’s Thanksgiving', body: 'Come hungry.', voice: 'as-written', at: SENT },
    }));
    await openGuests(page);
    const c = card(page);
    await expect(c.locator('[data-si-row="message"]')).toContainText('see what went out');
    await expect(c.locator('[data-si-send]')).toContainText('Everyone on your list is invited');
    await expect(c.locator('[data-si-tally]')).toContainText('2 invited');
    await expect.poll(() => cardLit(page)).toEqual(['Nudge the 1 who hasn’t replied']);
    await expect(c.getByRole('button', { name: /Send the details/ })).toBeVisible();
    await expect(c.getByRole('button', { name: /Update everyone/ })).toBeVisible();
    await expect(c.getByRole('button', { name: 'Invite text', exact: true })).toHaveCount(0);
  });

  test('a guest added after the invite went out lights it again, and the nudge goes quiet', async ({ page }) => {
    await boot(page, party('si-new', {
      invitesSentAt: SENT, guests: [...sentGuests(), { id: 'g3', name: 'Sam Ortiz', email: 'sam@example.test' }],
    }));
    await openGuests(page);
    await expect.poll(() => cardLit(page)).toEqual(['Invite 1 new guest']);
    await expect(card(page).locator('[data-si-send]')).toContainText('Sam Ortiz was added after your invite went out.');
    await expect(card(page).getByRole('button', { name: 'Nudge the 1 who hasn’t replied' })).toBeVisible();
  });

  test('a guest marked “I sent it myself” is not counted to invite again', async ({ page }) => {
    await boot(page, party('si-told', { guestTold: { g2: { at: SENT, channel: 'sms', attested: true } } }));
    await openGuests(page);
    // Rosa was told, so the invite is out and only Linda is left: one, not two.
    await expect.poll(() => cardLit(page)).toEqual(['Invite 1 new guest']);
    await expect(card(page).locator('[data-si-send]')).toContainText('Linda Reyes was added after your invite went out.');
  });
});

test.describe('the invite message', () => {
  test('Invite message saves a draft: voices, the edit box, a preview as email or text, one lit Save', async ({ page }) => {
    await boot(page, party('si-msg'));
    await openGuests(page);
    await expect(card(page).locator('[data-si-row="message"]')).toContainText('Written from your plan');
    await card(page).locator('[data-si-row="message"]').click();
    await expect(page.locator('#sheet-title')).toHaveText('Invite message', { timeout: 10_000 });
    const sh = topSheet(page);
    const box = sh.getByRole('textbox', { name: 'Edit the draft' });
    // Her page message opens the draft.
    await expect(box).toHaveValue(new RegExp(MINE.slice(0, 30)));
    // No hand-offs here, one lit Save.
    for (const t of ['Share…', 'Copy it', 'Mark it sent — I sent it myself']) await expect(sh.getByRole('button', { name: t, exact: true })).toHaveCount(0);
    await expect(sh.locator('[data-invite-list]')).toHaveCount(0);
    await expect.poll(() => lit(page)).toEqual(['Save draft']);
    // Preview as email: the subject on the envelope.
    const pv = sh.getByRole('radiogroup', { name: 'Preview as' });
    await expect(pv.getByRole('radio', { name: 'Email' })).toHaveAttribute('aria-checked', 'true');
    await expect(sh.locator('[data-preview-email]')).toContainText('You’re invited');
    // As a text: greeted by name (a family title stays with it), no subject, plain punctuation, counted.
    await pv.getByRole('radio', { name: 'Text' }).click();
    const bubble = sh.locator('[data-preview-text]');
    await expect(bubble).toContainText('Hi Aunt Rosa, ');
    await expect(bubble).not.toContainText('’');
    await expect(sh.locator('[data-preview-count]')).toHaveText(/^\d+ characters · sends as \d+ texts?$/);
    // Edit and save.
    await box.fill((await box.inputValue()).replace('Come hungry', 'Come very hungry'));
    await sh.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect.poll(async () => ((await saved(page, 'si-msg')).inviteMessageDraft || {}).edited).toBe(true);
    const d = (await saved(page, 'si-msg')).inviteMessageDraft;
    expect(d.body).toContain('Come very hungry');
    expect(typeof d.savedAt).toBe('string');
    expect(d.line).toBe(MINE);
    await expect(sh.locator('[data-draft-saved]')).toContainText('Draft saved');
    // The quiet way on to the send.
    await sh.getByRole('button', { name: /Ready\? Go to Invite your guest list/ }).click();
    await expect(page.locator('#sheet-title')).toHaveText('Invite your guest list', { timeout: 10_000 });
  });

  test('her saved words come back, and a changed page line is offered, not written over them', async ({ page }) => {
    const body = 'You’re invited — Mom Linda’s Thanksgiving\n\nYou’re invited!\n' + MINE + '\nSee you there.';
    await boot(page, party('si-line', {
      deckLine: 'Bring your appetite and a story.',
      inviteMessageDraft: { body, voice: 'as-written', savedAt: SENT, edited: true, line: MINE },
    }));
    await openGuests(page);
    await expect(card(page).locator('[data-si-row="message"]')).toContainText('Draft saved · edited');
    await card(page).locator('[data-si-row="message"]').click();
    const sh = topSheet(page);
    const box = sh.getByRole('textbox', { name: 'Edit the draft' });
    await expect(box).toHaveValue(/See you there\./);
    await expect(box).toHaveValue(new RegExp(MINE.slice(0, 30)));
    const offer = sh.locator('[data-new-line]');
    await expect(offer).toContainText('Use your new line?');
    await offer.getByRole('button', { name: 'Use your new line', exact: true }).click();
    await expect(box).toHaveValue(/Bring your appetite and a story\./);
    await expect(box).toHaveValue(/See you there\./);
  });

  test('the send confirm: the message folded, who gets what, Send to N by email, then the texts; and a record of what went out', async ({ page }) => {
    const state = await boot(page, party('si-send'));
    await openGuests(page);
    await card(page).getByRole('button', { name: 'Invite your guest list (2)', exact: true }).click();
    await expect(page.locator('#sheet-title')).toHaveText('Invite your guest list', { timeout: 10_000 });
    const sh = topSheet(page);
    const msg = sh.locator('[data-invite-message-fold]');
    await expect(msg).toContainText('Your message');
    await msg.getByRole('button', { name: /Show all/ }).click();
    await expect(sh.locator('[data-invite-message-full]')).toContainText('Come hungry');
    await expect(sh.getByRole('button', { name: 'Edit the message', exact: true })).toBeVisible();
    await expect(sh.locator('[data-invite-who="email"]')).toContainText('Email · 1 guest');
    await expect(sh.locator('[data-invite-who="email"]')).toContainText('Linda Reyes');
    await expect(sh.locator('[data-invite-who="text"]')).toContainText('Text · 1, one at a time');
    await expect(sh.locator('[data-invite-who="text"]')).toContainText('Aunt Rosa');
    await expect.poll(() => lit(page)).toEqual(['Send to 1 by email']);
    await expect(sh.getByRole('button', { name: 'Not yet', exact: true })).toBeVisible();
    await expect(sh.getByRole('button', { name: /Send to one guest instead \(2\)/ })).toBeVisible();
    await sh.getByRole('button', { name: 'Send to 1 by email', exact: true }).click();
    await expect(sh.locator('[data-invite-result]')).toContainText('Emailed 1 guest.');
    expect(state.posts.length).toBe(1);
    expect(state.posts[0].recipient_email).toBe('linda@example.test');
    // Then the text: the body only, greeted by first name, plain punctuation.
    await sh.getByRole('button', { name: 'Then text the other 1', exact: true }).click();
    const one = sh.locator('[data-invite-text-one]');
    const text = decodeURIComponent((await one.getAttribute('href')).split('body=')[1]);
    expect(text.startsWith('Hi Aunt Rosa, ')).toBe(true);
    expect(text).not.toContain('You’re invited —');
    expect(text).not.toMatch(/[’“”—]/);
    expect(text).toContain(`rsvp=${CODE}`);
    await one.click();
    // The record of what went out.
    const ev = await saved(page, 'si-send');
    expect(ev.invitesSentMessage.body).toContain('Come hungry');
    expect(typeof ev.invitesSentMessage.at).toBe('string');
    expect(ev.guests.every((g) => g.invitedAt)).toBe(true);
  });

  test('“What went out”: read only, the time, the words, each guest with how and where they stand, and Update everyone', async ({ page }) => {
    await boot(page, party('si-record', {
      invitesSentAt: SENT, guests: sentGuests(),
      invitesSentMessage: { subject: 'You’re invited — Mom Linda’s Thanksgiving', body: 'You’re invited!\nCome hungry.', voice: 'as-written', at: SENT },
    }));
    await openGuests(page);
    await card(page).locator('[data-si-row="message"]').click();
    await expect(page.locator('#sheet-title')).toHaveText('What went out', { timeout: 10_000 });
    const sh = topSheet(page);
    await expect(sh).toContainText('Read only. This is what your guests have.');
    await expect(sh.locator('[data-sent-at]')).toContainText(/^Sent [A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2} · \d{1,2}:\d{2} [AP]M/);
    await expect(sh.locator('[data-sent-words]')).toContainText('Come hungry.');
    await expect(sh.getByRole('textbox')).toHaveCount(0);
    await expect(sh.locator('[data-sent-guest="g1"]')).toContainText('Email');
    await expect(sh.locator('[data-sent-guest="g1"]')).toContainText('Replied yes');
    await expect(sh.locator('[data-sent-guest="g2"]')).toContainText('Text, by you');
    await expect(sh.locator('[data-sent-guest="g2"]')).toContainText('Invited');
    await expect(sh).toContainText('To change something guests already have, use Update everyone.');
    await sh.getByRole('button', { name: 'Update everyone', exact: true }).click();
    await expect(page.locator('#sheet-title')).toHaveText('Update to everyone', { timeout: 10_000 });
  });
});

test.describe('no reply link, nothing goes out', () => {
  test('the list send waits, the words can still be saved, and Try again brings the link', async ({ page }) => {
    const state = await boot(page, party('si-nolink'), { link: 'down' });
    await openGuests(page);
    await card(page).locator('[data-si-row="message"]').click();
    const sh = topSheet(page);
    const warn = sh.locator('[data-link-not-ready]');
    await expect(warn).toContainText('Your reply link isn’t ready.', { timeout: 15_000 });
    await expect(warn).toContainText('Nothing can go out without it.');
    await expect(sh.getByRole('textbox', { name: 'Edit the draft' })).toHaveValue(/\[your reply link goes here\]/);
    await expect(sh.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
    state.link = 'ok';
    await warn.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(warn).toHaveCount(0, { timeout: 15_000 });
    await expect(sh.getByRole('textbox', { name: 'Edit the draft' })).toHaveValue(new RegExp(`rsvp=${CODE}`));
  });

  test('Invite text: every hand-off is disabled until the link is there', async ({ page }) => {
    await boot(page, party('si-nolink-text'), { link: 'down' });
    await openGuests(page);
    await card(page).getByRole('button', { name: 'Invite text', exact: true }).click();
    const sh = topSheet(page);
    await expect(sh.locator('[data-link-not-ready]')).toBeVisible({ timeout: 15_000 });
    for (const t of ['Share…', 'Copy it']) await expect(sh.getByRole('button', { name: t, exact: true })).toBeDisabled();
    await expect(sh.getByRole('link', { name: 'Text it', exact: true })).toHaveCount(0);
    await expect(sh.getByRole('button', { name: 'Text it', exact: true })).toBeDisabled();
  });

  test('the send confirm waits for the link too', async ({ page }) => {
    await boot(page, party('si-nolink-send'), { link: 'down' });
    await openGuests(page);
    await card(page).getByRole('button', { name: 'Invite your guest list (2)', exact: true }).click();
    const sh = topSheet(page);
    await expect(sh.locator('[data-link-not-ready]')).toBeVisible({ timeout: 15_000 });
    await expect(sh.getByRole('button', { name: 'Send to 1 by email', exact: true })).toBeDisabled();
    await expect(sh.getByRole('button', { name: 'Then text the other 1', exact: true })).toBeDisabled();
  });

  test('the details draft carries the link, so it waits too', async ({ page }) => {
    await boot(page, party('si-nolink-details', { invitesSentAt: SENT, guests: sentGuests() }), { link: 'down' });
    await openGuests(page);
    await card(page).getByRole('button', { name: /Send the details/ }).click();
    const sh = topSheet(page);
    await expect(sh.locator('[data-link-not-ready]')).toBeVisible({ timeout: 15_000 });
    await expect(sh.getByRole('button', { name: 'Copy it', exact: true })).toBeDisabled();
  });
});

test('the +1’s meal and dietary need are shown and edited on the guest editor', async ({ page }) => {
  await boot(page, party('si-plus', { guests: [{ id: 'g1', name: 'Linda Reyes', email: 'linda@example.test', plusOne: 'Pat Reyes', plusOneMeal: 'Vegetarian', plusOneNeeds: 'No nuts' }] }));
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  await page.locator('.sheet').last().getByRole('button', { name: /Linda Reyes/ }).first().click();
  const plus = page.locator('[data-ged-person="plusone"]');
  await expect(plus.getByLabel('Meal for Pat Reyes')).toHaveValue('Vegetarian');
  await expect(plus.getByLabel('Dietary needs for Pat Reyes')).toHaveValue('No nuts');
  await plus.getByLabel('Meal for Pat Reyes').selectOption('Vegan');
  await plus.getByLabel('Dietary needs for Pat Reyes').fill('No nuts, no dairy');
  await expect.poll(async () => (await saved(page, 'si-plus')).guests[0].plusOneNeeds).toBe('No nuts, no dairy');
  expect((await saved(page, 'si-plus')).guests[0].plusOneMeal).toBe('Vegan');
});
