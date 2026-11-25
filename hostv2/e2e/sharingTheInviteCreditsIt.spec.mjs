// ─── SHARING THE INVITE CREDITS IT, AND A TIGHT TIMELINE IS NOT LATENESS ─────
//
// Issue #100, D-10, from the owner acceptance run (11/5/2026), on the screen:
//   · after "Check and share link" the checklist still read "Send the invite …
//     5 days past its window" — taskEngine accepts `invitesSentAt` as proof,
//     and nothing in the shell ever wrote it;
//   · on an event created two days out, every row read "past its window" on
//     day 0, though the overdue policy had already forgiven them.
//
// This replaces a jest assertion that read HostShellV2's source to find the
// write (textGateRatchet: a behavior claim belongs here, where it runs).
//
// Runs on the gold07 bundle (port 5255, mock API) — the one build in the suite
// with an RSVP API configured, which the share path needs to offer a link.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn } from './fixtures.mjs';

const BASE = previewUrl(5255);
const API = 'https://gold07-mock.invalid';
const EVENT_ID = 'e2e-invite-credit';
const CODE = 'e2einvitecredit0001';   // checkRsvpCapability needs 16+ characters
const INVITE = 'Send the invite with date, time, and a one-line "what we are playing"';

const hostEvent = () => ({
  // Her own name for it: a bare type is a placeholder the invite asks her to
  // replace (six root causes, cause 6, lib/outwardReady).
  id: EVENT_ID, name: 'Ana’s game night', type: 'Game Night',
  date: dateIn(2), createdAt: new Date().toISOString(),
  rsvpCode: CODE, guestMode: 'list', guestEstimate: 6, guestCountSource: 'host',
  budget: [], vendors: [],
  guests: [{ id: 'g1', name: 'Ana Test' }, { id: 'g2', name: 'Bo Test' }],
  timeline: [{ id: 't_invite', task: INVITE, leadDays: -7, week: '1 week out', done: false, owner: '', category: 'planning', phase: 'guest' }],
});

// Clipboard permissions are a Chromium name; WebKit refuses 'clipboard-write'
// at newPage (WebKit full run, 11/17/2026) and allows writes from a tap anyway.
test.use({ permissions: async ({ browserName }, use) => use(browserName === 'chromium' ? ['clipboard-read', 'clipboard-write'] : []) });

test('copy the invite, say it was sent, and the invite task is credited — with no blame on day 0', async ({ page }) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, json: [] }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({
    status: 200, json: { ok: true, event: { id: EVENT_ID, name: 'Game night', type: 'Game Night', date: dateIn(2), rsvpCode: CODE, goingCount: 0 } },
  }));
  await page.addInitScript((e) => {
    // Desktop Chromium has no share sheet; pin that, so the copy path is the one measured.
    try { delete Navigator.prototype.share; } catch (_e) { /* absent already */ }
    if (sessionStorage.getItem('seeded')) return;   // keep the app's own writes across the reload below
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
  const sheetText = () => page.evaluate(() => (document.querySelector('.sheet:last-of-type')?.innerText || document.body.innerText || '').replace(/\s+/g, ' '));
  const openSection = async (name) => {
    await tap(/^Menu$/); await page.waitForTimeout(400);
    await tap(/^Jump to a section$/); await page.waitForTimeout(400);
    expect(await tap(new RegExp('^' + name))).toBe(true);
    await page.waitForTimeout(900);
  };

  // Day 0, two days out: the invite's window closed before the plan existed.
  await openSection('Your checklist');
  let t = await sheetText();
  expect(t).toContain('Send the invite');
  expect(t).not.toMatch(/past its window/);
  expect(t).toMatch(/due now/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);

  // Share: a copy is not a send, so the host is asked.
  await openSection('Guests');
  expect(await tap(/^Share the link$/)).toBe(true);
  await expect(page.getByRole('button', { name: 'I sent it' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'I sent it' }).click();
  await page.waitForTimeout(800);
  const stored = await page.evaluate((id) => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events')).find((e) => e.id === id), EVENT_ID);
  expect(typeof stored.invitesSentAt).toBe('string');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);

  // The checklist now credits it, and the credit survives a reload.
  await page.reload();
  await page.waitForFunction(() => (document.querySelector('.app')?.innerText || '').trim().length > 120, null, { timeout: 20_000 });
  await openSection('Your checklist');
  t = await sheetText();
  const row = t.slice(t.indexOf('Send the invite'), t.indexOf('Send the invite') + 220);
  expect(row).toMatch(/your plan did this/);
});

// ─── THE INVITE SENT FROM ITS DRAFT IS SENT (owner, live, 11/18/2026) ────────
// "Can't get past this screen after completing the invite info": the board kept
// leading with "Send the invite … past its window". The invite DRAFT ("Copy the
// invite") offers Share, Text it, WhatsApp and "Mark it sent — I sent it myself",
// and every one wrote only the send ledger — while "Send the invite" is credited
// by invitesSentAt alone (taskEngine). Sent, marked, and still asked for.
test('the invite written and sent from its draft credits "Send the invite"', async ({ page }) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, json: [] }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({
    status: 200, json: { ok: true, event: { id: EVENT_ID, name: 'Game night', type: 'Game Night', date: dateIn(2), rsvpCode: CODE, goingCount: 0 } },
  }));
  await page.addInitScript((e) => {
    try { delete Navigator.prototype.share; } catch (_e) { /* absent already */ }
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  // A complete invite (day, host-set hour, place): the invite check (inviteGaps,
  // 11/19/2026) stands aside, and the draft itself is what this test opens.
  }, { ...hostEvent(), startTime: '19:00', startTimeSource: 'host', venue: 'Ana’s place' });
  await page.goto(`${BASE}?elegant=1`);
  await page.waitForFunction(() => (document.querySelector('.app')?.innerText || '').trim().length > 120, null, { timeout: 20_000 });
  const tap = (re) => page.evaluate((s) => {
    const el = [...document.querySelectorAll('button,[role="button"],a')].filter((x) => new RegExp(s).test((x.innerText || x.textContent || '').trim())).pop();
    if (el) el.click();
    return !!el;
  }, re.source);
  const stored = () => page.evaluate((id) => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events')).find((e) => e.id === id), EVENT_ID);
  await tap(/^Menu$/); await page.waitForTimeout(400);
  await tap(/^Jump to a section$/); await page.waitForTimeout(400);
  expect(await tap(/^Guests/)).toBe(true);
  await page.waitForTimeout(900);
  expect(await tap(/^Invite text$/), 'the invite draft is offered').toBe(true);
  await expect(page.getByRole('button', { name: 'Mark it sent — I sent it myself' })).toBeVisible({ timeout: 10_000 });
  expect((await stored()).invitesSentAt || null, '(premise) not credited yet').toBe(null);
  await page.getByRole('button', { name: 'Mark it sent — I sent it myself' }).click();
  await page.waitForTimeout(800);
  expect(typeof (await stored()).invitesSentAt, 'marking the invite sent credits the invite').toBe('string');
});

// A host who sent the invite ANOTHER way (her own text, in person) says so where
// "Open the invite" lands, once, and the board moves on (owner, live, 11/18/2026).
test('"I already sent it" credits the invite, survives a reload, and then goes away', async ({ page }) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, json: [] }));
  await page.addInitScript((e) => {
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
    const el = [...document.querySelectorAll('button,[role="button"],a')].filter((x) => new RegExp(s).test((x.innerText || x.textContent || '').trim())).pop();
    if (el) el.click();
    return !!el;
  }, re.source);
  const openSection = async (name) => {
    await tap(/^Menu$/); await page.waitForTimeout(400);
    await tap(/^Jump to a section$/); await page.waitForTimeout(400);
    expect(await tap(new RegExp('^' + name))).toBe(true);
    await page.waitForTimeout(900);
  };
  await openSection('Guests');
  const sent = page.locator('[data-invite-sent]:visible, .sheet button:has-text("I already sent it")').first();
  await expect(sent).toBeVisible();
  await sent.click();
  await page.waitForTimeout(800);
  const stored = await page.evaluate((id) => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events')).find((e) => e.id === id), EVENT_ID);
  expect(typeof stored.invitesSentAt).toBe('string');
  await expect(page.getByRole('button', { name: 'I already sent it' })).toHaveCount(0);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => (document.querySelector('.app')?.innerText || '').trim().length > 120, null, { timeout: 20_000 });
  await openSection('Your checklist');
  const t = await page.evaluate(() => (document.querySelector('.sheet:last-of-type')?.innerText || document.body.innerText || '').replace(/\s+/g, ' '));
  const row = t.slice(t.indexOf('Send the invite'), t.indexOf('Send the invite') + 220);
  expect(row).toMatch(/your plan did this/);
});
