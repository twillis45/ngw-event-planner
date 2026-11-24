// ─── THE TAG WHERE GUESTS LOOK (owner, 11/16/2026) ──────────────────────────
// With the host's tag on, it sits inside the white QR card (so a screenshot or
// printout carries it) and rides into the guest's calendar entry. With it off,
// neither shows anything.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const TAG = '#VidasFriendsgiving2026';
const EVENT = {
  id: 'cust-tag-probe', rsvpCode: 'public-tag-probe-code-01', name: 'Vida’s Friendsgiving', type: 'Friendsgiving',
  date: '2027-11-20', startTime: '16:00', guestEstimate: 12, guestMode: 'list', guests: [{ id: 'g1', name: 'Ana' }],
  vendors: [], budget: [], timeline: [], hashtag: TAG,
};

const host = async (page, ev) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
  }, ev);
  await page.route(API + '/api/public/invite/**', (r) => r.fulfill({ status: 200, json: { ok: true, event: ev } }));
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests');
  await page.getByRole('button', { name: 'Show QR code', exact: true }).first().click();
  await expect(page.getByAltText(/QR code for the/)).toBeVisible();
};

test('the QR card carries the tag inside the white card', async ({ page }) => {
  await host(page, EVENT);
  const tag = page.locator('[data-qr-hashtag]');
  await expect(tag).toHaveText(TAG);
  // Inside the white card, under the code — a screenshot of the card includes it.
  const inCard = await tag.evaluate((n) => getComputedStyle(n.parentElement).backgroundColor);
  expect(inCard).toBe('rgb(255, 255, 255)');
});

test('with no tag, the QR card is just the code', async ({ page }) => {
  await host(page, { ...EVENT, hashtag: '' });
  await expect(page.locator('[data-qr-hashtag]')).toHaveCount(0);
});

const guest = async (page, ev) => {
  await page.route(API + '/**', (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route(API + '/api/public/invite/' + ev.rsvpCode, (r) => r.fulfill({ status: 200, json: { ok: true, event: ev } }));
  await page.route(API + '/api/public/invite/' + ev.rsvpCode + '/opened', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.route(API + '/api/public/rsvp/' + ev.rsvpCode, (r) => r.fulfill({ status: 200, json: { ok: true, submitted_at: '2026-11-16T12:00:00Z' } }));
  await page.goto('?rsvp=' + ev.rsvpCode);
  // The calendar links appear once she has replied Yes.
  await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Ana Ruiz');
  await page.getByRole('button', { name: /^Send my reply$/ }).click();
  await expect(page.getByRole('link', { name: 'Add to Google Calendar' })).toBeAttached();
};

test('the guest’s calendar entry carries the tag', async ({ page }) => {
  await guest(page, EVENT);
  const g = await page.getByRole('link', { name: 'Add to Google Calendar' }).getAttribute('href');
  expect(new URL(g).searchParams.get('details')).toBe(`Sharing photos from the day? Tag them ${TAG}.`);
  const ics = decodeURIComponent((await page.getByRole('link', { name: 'Add to Apple Calendar' }).getAttribute('href')).split(',').slice(1).join(','));
  expect(ics).toContain(`DESCRIPTION:Sharing photos from the day? Tag them ${TAG}.`);
});

test('with no tag, the calendar entry has no description', async ({ page }) => {
  await guest(page, { ...EVENT, hashtag: '' });
  const g = await page.getByRole('link', { name: 'Add to Google Calendar' }).getAttribute('href');
  expect(new URL(g).searchParams.get('details')).toBe(null);
  const ics = decodeURIComponent((await page.getByRole('link', { name: 'Add to Apple Calendar' }).getAttribute('href')).split(',').slice(1).join(','));
  expect(ics).not.toContain('DESCRIPTION');
});
