// ─── A CO-HOST SEES THEIR OWN ROLE (owner ruling 11/16/2026) ────────────────
// The rules are proven on PostgreSQL (backend/tests/test_event_cohosts_rls.py)
// and the routes in test_cohosts.py. This drives the two screens a browser can
// reach without a real sign-in: a signed-out host is told to keep the plan
// first; an event this device co-hosts (loaded with `_cohostOf`, the host's
// studio) says so, offers Leave, and has no Delete in the events list.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = (page, ev) => page.addInitScript((e) => {
  if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
  localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
  localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
  localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
}, ev);
const BASE_EV = { name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: '2027-11-20', guests: [], vendors: [], budget: [], timeline: [] };

test('a signed-out host is told to keep the plan first, and gets no invite box', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, { ...BASE_EV, id: 'cust-co-host' });
  await page.goto('?elegant=1'); await settled(page);
  await openSectionByName(page, 'Co-hosts');
  const sheet = page.locator('[data-cohosts]');
  await expect(sheet).toHaveAttribute('data-role', 'host');
  await expect(sheet).toContainText('not your other events');
  await expect(sheet.locator('[data-cohosts-signed-out]')).toBeVisible();
  await expect(sheet.locator('[data-cohost-invite]')).toHaveCount(0);
});

test('a co-hosted event says so, offers Leave, and has no Delete', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, { ...BASE_EV, id: 'cust-co-guest', _cohostOf: '10000000-0000-0000-0000-000000000001' });
  await page.goto('?elegant=1'); await settled(page);
  await openSectionByName(page, 'Co-hosts');
  const sheet = page.locator('[data-cohosts]');
  await expect(sheet).toHaveAttribute('data-role', 'cohost');
  await expect(sheet).toContainText('only the host can invite others or delete the event');
  await expect(sheet.getByRole('button', { name: 'Leave this event' })).toBeVisible();
  await expect(sheet.locator('[data-cohost-invite]')).toHaveCount(0);
  // The events list: labeled, and no Delete.
  await page.keyboard.press('Escape');
  await page.locator('[aria-label="Menu"]').first().click();
  await page.locator('button', { hasText: /^This event/ }).first().click();
  await expect(page.locator('[data-cohosting]').first()).toHaveText('Co-hosting');
  await expect(page.getByRole('button', { name: /^Delete Vida’s Friendsgiving$/ })).toHaveCount(0);
});
