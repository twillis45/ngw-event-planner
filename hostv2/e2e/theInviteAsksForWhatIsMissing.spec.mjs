// ─── THE INVITE ASKS FOR WHAT IS MISSING FIRST (owner, 11/19/2026) ───────────
// "Before sending invites app should verify if the important info is included."
// An invite needs the day, the hour the HOST set, and the place. With any of them
// missing, "Invite your guest list" opens "Before your invite goes out" instead
// of the draft: nothing to send until each is added there. Then "Write the
// invite" writes it with them.
//
// Runs on the gold07 bundle (port 5255), the build with an RSVP API, which
// writing the invite needs (the link in it is verified first).
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn } from './fixtures.mjs';

const BASE = previewUrl(5255);
const API = 'https://gold07-mock.invalid';
const CODE = 'e2einvitecheck00001';

// The app proposed 4:00 PM (derived); the host never said where.
const EVENT = {
  id: 'e2e-invite-check', name: 'Vida’s Friendsgiving', type: 'Friendsgiving',
  date: dateIn(12), createdAt: new Date().toISOString(),
  startTime: '16:00', startTimeSource: 'derived', startTimeWhy: 'A late-afternoon meal.',
  rsvpCode: CODE, guestMode: 'list', guestEstimate: 6, guestCountSource: 'host',
  budget: [], vendors: [], timeline: [],
  guests: [{ id: 'g1', name: 'Maya Chen', email: 'maya@example.test' }],
};

test('a missing place and an unconfirmed time are asked for before the invite is written', async ({ page }) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, json: [] }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({
    status: 200, json: { ok: true, event: { id: EVENT.id, name: EVENT.name, type: EVENT.type, date: EVENT.date, rsvpCode: CODE, goingCount: 0 } },
  }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
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
  expect(await tap(/^Invite your guest list \(\d+\)$/)).toBe(true);

  const check = page.locator('[data-invite-check]');
  await expect(check).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#sheet-title')).toHaveText('Before your invite goes out');
  await expect(check.locator('[data-invite-check-item="date"]')).toHaveAttribute('data-ok', '1');
  await expect(check.locator('[data-invite-check-item="time"]')).toHaveAttribute('data-ok', '0');
  await expect(check.locator('[data-invite-check-item="place"]')).toHaveAttribute('data-ok', '0');
  const go = check.locator('[data-invite-check-go]');
  await expect(go).toBeDisabled();
  await expect(page.getByLabel('Edit the draft')).toHaveCount(0);        // no draft to send yet
  await expect(page.locator('[data-invite-list]')).toHaveCount(0);       // no batch either
  // Only a place will do: parking the venue or writing an inquiry gives guests none.
  await expect(check.getByRole('button', { name: /I’ll sort this|Write my venue inquiry/ })).toHaveCount(0);

  await check.getByRole('button', { name: 'that’s right' }).click();
  await expect(check.locator('[data-invite-check-item="time"]')).toHaveAttribute('data-ok', '1');
  await expect(go).toBeDisabled();                                       // the place is still missing

  await check.getByLabel('Venue').fill('Vida’s place');
  await check.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(check.locator('[data-invite-check-item="place"]')).toHaveAttribute('data-ok', '1');
  // At her place a guest needs a street (six root causes, cause 6: one outward
  // guard, lib/outwardReady): the check asks for it before the invite.
  await expect(check.locator('[data-invite-check-item="address"]')).toHaveAttribute('data-ok', '0');
  await expect(go).toBeDisabled();
  await check.locator('[data-outward-address]').getByLabel('Venue').fill('Vida’s place, 12 Pine Street, Springfield, IL');
  await check.locator('[data-outward-address]').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(go).toBeEnabled();

  await go.click();
  // The send confirm (owner, 11/24/2026: render s2-4): the message folded, the
  // list under it. Unfolded, it carries the hour and the place just given.
  await expect(page.locator('[data-invite-list]')).toBeVisible({ timeout: 10_000 });
  await page.locator('[data-invite-message-fold]').getByRole('button', { name: /Show all/ }).click();
  const t = await page.locator('[data-invite-message-full]').innerText();
  expect(t).toContain('4:00 PM');
  expect(t).toContain('Vida’s place');
});

test('a complete invite skips the check', async ({ page }) => {
  const ready = { ...EVENT, id: 'e2e-invite-ready', startTimeSource: 'host', venue: 'Vida’s place' };
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, json: [] }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({
    status: 200, json: { ok: true, event: { id: ready.id, name: ready.name, type: ready.type, date: ready.date, rsvpCode: CODE, goingCount: 0 } },
  }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ready);
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
  expect(await tap(/^Invite your guest list \(\d+\)$/)).toBe(true);
  await expect(page.locator('[data-invite-list]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-invite-check]')).toHaveCount(0);
});
