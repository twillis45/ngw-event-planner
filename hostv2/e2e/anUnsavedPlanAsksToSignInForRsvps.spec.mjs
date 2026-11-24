// ─── AN UNSAVED PLAN ASKS TO BE SAVED FOR ONLINE RSVPS (owner, 11/24/2026) ───
//
// Signed out, a plan that lives only on this device has no public invite, so
// the RSVP check refuses its link. It said "Online RSVPs are not available for
// this event.", which reads as a dead end. It says instead: "Sign in to save
// this plan, then guests can RSVP online." with a "Sign in to save" button
// that opens the same sign-in the "Not saved yet" row opens.
//
// On the rsvpsync bundle (accounts and an RSVP API configured, every request
// answered here). Signed in, or with no accounts at all, the old line stands
// (rsvpCapability.spec.mjs).
import { test, expect, settled, sheetSettled, openSectionByName } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(Number(process.env.PW_RSVPSYNC_PORT || 5277));
const PROJECT = 'https://rsvpsync.supabase.co';
const API = 'https://rsvpsync-mock.invalid';

// Complete enough to invite (day, host-set hour, place), and never saved.
const EVENT = {
  id: 'cust-unsaved-rsvp', name: 'Sunday Brunch', type: 'Brunch', date: '2027-06-19',
  createdAt: '2026-11-20T10:00:00.000Z', startTime: '11:00', startTimeSource: 'host', venue: 'Denise’s place',
  guestMode: 'list', guestEstimate: 8, guests: [{ id: 'g1', name: 'Denise' }], vendors: [], budget: [], timeline: [],
};

const boot = async (page) => {
  await page.route(`${PROJECT}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"invite not found"}' }));
  await page.addInitScript((e) => {
    window.__rsvpShares = []; window.__rsvpCopies = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__rsvpShares.push(d); } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__rsvpCopies.push(t); } } });
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto(BASE + '?elegant=1');
  await settled(page);
};

test('signed out and unsaved: the RSVP check asks her to sign in and save, and its button opens sign-in', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  await page.getByRole('button', { name: 'Share the link', exact: true }).first().click();
  const toast = page.locator('.toast');
  await expect(toast).toContainText('Sign in to save this plan, then guests can RSVP online.');
  await expect(toast).not.toContainText('Online RSVPs are not available');
  expect(await page.evaluate(() => [window.__rsvpShares.length, window.__rsvpCopies.length])).toEqual([0, 0]);
  await toast.getByRole('button', { name: 'Sign in to save', exact: true }).click();
  // The same sign-in the "Not saved yet" row opens: keep this plan, by email.
  await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
  await expect(page.locator('[data-keep-signin]')).toBeVisible();
  await expect(page.locator('input[aria-label="Email for sign-in link"]')).toBeVisible();
});

test('the "Not saved yet" row opens that same sign-in', async ({ page }) => {
  await boot(page);
  const row = page.locator('[data-keep-ask]');
  await expect(row).toContainText('Not saved yet.');
  await row.getByRole('button', { name: 'Sign in to save', exact: true }).click();
  await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
  await expect(page.locator('[data-keep-signin]')).toBeVisible();
});
