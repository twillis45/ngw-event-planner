// ─── THE INVITE GOES TO THE WHOLE LIST (owner, 11/19/2026) ──────────────────
// "Build the invite email batch and text queue." Guests now offers "Invite your
// guest list (N)": the reviewed invite draft, then one email per guest with a
// good address and, for guests with only a phone, one prefilled text at a time.
// Declined guests and guests already invited are never counted.
//
// WHAT THIS CAN AND CANNOT SEE. It runs on the gold07 bundle (port 5255, mock
// API), the one build with an RSVP API, which opening the invite needs. No e2e
// bundle has both a signed-in session and the email API, so the EMAIL send is
// proved in jest (src/lib/__tests__/theInviteGoesToTheWholeList.test.js) against
// the same lib this screen calls; here the signed-out note is what renders.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn } from './fixtures.mjs';

const BASE = previewUrl(5255);
const API = 'https://gold07-mock.invalid';
const EVENT_ID = 'e2e-invite-list';
const CODE = 'e2einvitelist000001';   // checkRsvpCapability needs 16+ characters

const hostEvent = () => ({
  id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'Friendsgiving',
  date: dateIn(12), createdAt: new Date().toISOString(),
  // A complete invite (day, host-set hour, place): the invite check (inviteGaps) stands aside.
  startTime: '16:00', startTimeSource: 'host', venue: 'Vida’s place',
  rsvpCode: CODE, guestMode: 'list', guestEstimate: 6, guestCountSource: 'host',
  budget: [], vendors: [], timeline: [],
  guests: [
    { id: 'g1', name: 'Maya Chen', email: 'maya@example.test', phone: '(410) 555-0101' },
    { id: 'g2', name: 'Jordan Ellis', phone: '(410) 555-0102' },
    { id: 'g3', name: 'Sam', email: 'sam@example.test', rsvp: 'No' },
    { id: 'g4', name: 'Lee', email: 'lee@example.test', invitedAt: '2026-11-18T10:00:00.000Z', invitedVia: 'email' },
  ],
});

test('the guest list is invited: email where it can go, one text at a time where it cannot', async ({ page }) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, json: [] }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({
    status: 200, json: { ok: true, event: { id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: dateIn(12), rsvpCode: CODE, goingCount: 0 } },
  }));
  await page.addInitScript((e) => {
    // An sms: link would leave the page; the handler on it is what is measured.
    window.addEventListener('click', (ev) => {
      const a = ev.target && ev.target.closest && ev.target.closest('a[href^="sms:"]');
      if (a) ev.preventDefault();
    }, true);
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, hostEvent());
  await page.goto(`${BASE}?elegant=1`);
  await page.waitForFunction(() => (document.querySelector('.app')?.innerText || '').trim().length > 120, null, { timeout: 20_000 });

  const tap = (re) => page.evaluate((s) => {
    const el = [...document.querySelectorAll('button,[role="button"],a')].filter((x) => new RegExp(s).test((x.innerText || '').trim())).pop();
    if (el) el.click();
    return !!el;
  }, re.source);
  await tap(/^Menu$/); await page.waitForTimeout(400);
  await tap(/^Jump to a section$/); await page.waitForTimeout(400);
  expect(await tap(/^Guests/)).toBe(true);
  await page.waitForTimeout(900);

  // Maya (email) and Jordan (phone only): 2. Sam declined; Lee is already invited,
  // so the invite is out and the two read as new (owner, 11/24/2026: s2-2b).
  expect(await tap(/^Invite 2 new guests$/)).toBe(true);
  const block = page.locator('[data-invite-list]');
  await expect(block).toBeVisible({ timeout: 10_000 });
  await expect(block).toContainText('Sign in to email 1 guest from here.');
  await expect(block).toContainText('1 guest is already invited.');
  await expect(block.locator('[data-invite-email]')).toHaveCount(0);   // signed out: no send control

  await block.locator('[data-invite-texts]').click();
  await expect(block.locator('[data-invite-text-queue]')).toContainText('1 of 1: Jordan Ellis');
  const one = block.locator('[data-invite-text-one]');
  const href = await one.getAttribute('href');
  expect(href.startsWith('sms:4105550102?&body=')).toBe(true);
  const body = decodeURIComponent(href.split('body=')[1]);
  expect(body.startsWith('Hi Jordan, ')).toBe(true);
  expect(body).toContain(`rsvp=${CODE}`);

  await one.click();
  await expect(block).toContainText('That’s everyone with only a phone number.');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
  const jordan = saved.guests.find((g) => g.id === 'g2');
  expect(jordan.invitedVia).toBe('text');
  expect(typeof jordan.invitedAt).toBe('string');
  expect(saved.guests.find((g) => g.id === 'g1').invitedAt).toBeUndefined();   // Maya: still to email
  expect(typeof saved.invitesSentAt).toBe('string');                          // "Send the invite" is credited
  // Analytics (owner, 11/19/2026): the text is counted as an invite sent. On a
  // local preview PostHog never loads; lib/analytics records to its dev tap.
  const sent = await page.evaluate(() => (window.__NGW_TRACK__ || []).filter((t) => t.event === 'invite_sent'));
  expect(sent).toEqual([{ event: 'invite_sent', via: 'text', count: 1 }]);
});

// Owner, 11/19/2026: "check copy for text, each version doesn't change much."
// Each voice is now its own invite; Tighter used to drop the date and place.
const openInvite = async (page, ev, door = 'message') => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, json: [] }));
  await page.route(`${API}/api/public/invite/${ev.rsvpCode}`, (r) => r.fulfill({
    status: 200, json: { ok: true, event: { id: ev.id, name: ev.name, type: ev.type, date: ev.date, rsvpCode: ev.rsvpCode, goingCount: 0 } },
  }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.removeItem('ngw-hostv2-voice');
  }, ev);
  await page.goto(`${BASE}?elegant=1`);
  await page.waitForFunction(() => (document.querySelector('.app')?.innerText || '').trim().length > 120, null, { timeout: 20_000 });
  const tap = (re) => page.evaluate((s) => {
    const el = [...document.querySelectorAll('button,[role="button"],a')].filter((x) => new RegExp(s).test((x.innerText || '').trim())).pop();
    if (el) el.click();
    return !!el;
  }, re.source);
  await tap(/^Menu$/); await page.waitForTimeout(400);
  await tap(/^Jump to a section$/); await page.waitForTimeout(400);
  await tap(/^Guests/); await page.waitForTimeout(900);
  // The words and their voices are the "Invite message" row's (owner,
  // 11/24/2026); the list send is "Invite your guest list", its confirm sheet.
  if (door === 'send') {
    expect(await tap(/^Invite (your guest list \(\d+\)|\d+ new guests?)$/)).toBe(true);
    await expect(page.locator('[data-invite-list]')).toBeVisible({ timeout: 10_000 });
  } else {
    await page.locator('[data-si-row="message"]').click();
    await expect(page.getByLabel('Edit the draft')).toBeVisible({ timeout: 10_000 });
  }
};

test('each voice is its own invite, and none of them drops the day or the place', async ({ page }) => {
  await openInvite(page, hostEvent());
  const box = page.getByLabel('Edit the draft');
  const seen = new Set();
  for (const voice of ['As written', 'Tighter', 'Warmer', 'Playful', 'Formal']) {
    await page.getByRole('radio', { name: voice, exact: true }).click();
    const t = await box.inputValue();
    expect(t, voice).toContain('4:00 PM');
    expect(t, voice).toContain('Vida’s place');
    expect(t, voice).toContain(`rsvp=${CODE}`);
    seen.add(t.split('\n').find((l) => l.trim() && !/^(You’re invited|We’d love|Clear your|Invitation) —/.test(l)));
  }
  expect(seen.size).toBe(5);   // five different openings
});

test('a repast offers no Playful voice', async ({ page }) => {
  await openInvite(page, { ...hostEvent(), id: 'e2e-invite-repast', name: 'Repast for Mr. Lewis', type: 'Repast', honoree: 'Mr. Lewis' });
  await expect(page.getByRole('radio', { name: 'Formal', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Playful', exact: true })).toHaveCount(0);
});

// Owner, 11/19/2026: "Host needs to be able to send both email and text to
// individual guests." Maya has both, so the batch would only email her; her own
// row lets the host text her too, and says how each guest was invited.
test('one guest at a time: text a guest the batch would only email, and see how each was invited', async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('click', (ev) => {
      const a = ev.target && ev.target.closest && ev.target.closest('a[href^="sms:"]');
      if (a) ev.preventDefault();
    }, true);
  });
  await openInvite(page, hostEvent(), 'send');
  const block = page.locator('[data-invite-list]');
  await block.locator('[data-invite-one-open]').click();
  const list = block.locator('[data-invite-one]');
  await expect(list.locator('[data-invite-guest]')).toHaveCount(3);          // Sam declined
  await expect(list.locator('[data-invite-guest="g4"]')).toContainText('Invited by email');
  const maya = list.locator('[data-invite-guest="g1"]');
  await expect(maya).toContainText('Not invited yet');
  const text = maya.locator('[data-invite-one-text]');
  expect((await text.getAttribute('href')).startsWith('sms:4105550101?&body=')).toBe(true);
  await text.click();
  await expect(maya).toContainText('Invited by text');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
  expect(saved.guests.find((g) => g.id === 'g1').invitedVia).toBe('text');
});
