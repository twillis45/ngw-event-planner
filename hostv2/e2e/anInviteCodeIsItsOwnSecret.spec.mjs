// ─── AN INVITE CODE IS ITS OWN SECRET ────────────────────────────────────────
//
// Gold run (11/5/2026): HostV2 set rsvpCode to the event id, whose random part
// is about 31 bits — and the invite link is the only gate on the public invite
// and RSVP endpoints, which return the street address. A "Run it again" copy
// also kept its source's code, so one link stood for two events (the server
// resolves a code to ONE). Both now mint a 22-character token.
import { test, expect } from './fixtures.mjs';

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]'));
const TOKEN = /^[A-Za-z0-9]{22}$/;

test('a created event gets a 22-character invite code, not its id', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill('Game night at my place for 10 people on Friday');
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect.poll(async () => (await stored(page)).length, { timeout: 15000 }).toBeGreaterThan(0);
  const [ev] = await stored(page);
  expect(ev.rsvpCode).toMatch(TOKEN);
  expect(ev.rsvpCode).not.toBe(ev.id);
});

test('a "Run it again" copy gets its own invite code', async ({ page }) => {
  const SRC = 'SourceInviteCode123456';
  await page.addInitScript((code) => {
    if (localStorage.getItem('ngw-hostv2-last-event') !== null) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-past', rsvpCode: code, name: 'Last year’s feast', type: 'Get-Together', date: '2025-06-01',
      guestMode: 'count', guestCount: 20, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-past');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, SRC);
  await page.goto('?elegant=1');
  await page.locator('.ev-eyebrow').first().click();
  await page.locator('.navrow', { hasText: 'This event' }).first().click();
  await expect(page.getByRole('heading', { name: 'Your events' })).toBeVisible({ timeout: 15000 });
  await page.locator('.runagain').first().click();
  await expect.poll(async () => (await stored(page)).length).toBe(2);
  const [src, copy] = await stored(page);
  expect(src.rsvpCode).toBe(SRC);
  expect(copy.rsvpCode).toMatch(TOKEN);
  expect(copy.rsvpCode).not.toBe(SRC);
});
