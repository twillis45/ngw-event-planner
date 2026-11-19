// A REPLY SENT WITH NO SIGNAL (WebKit critical journey, 11/19/2026). The host
// has no iPhone, so the WebKit gate is the stand-in for a guest answering on
// Safari in a dead zone. The honest behavior: while offline the reply is held
// on the phone and the guest is told it will send; it is never shown as
// delivered; when the connection returns it is sent exactly once and the page
// then confirms.
//
// The reply route answers by the test's own network flag, not by trusting each
// engine's offline emulation to stop a routed request: a route that still
// fulfilled while "offline" would make the held state unreachable in one
// engine and not the other. Every wait is on a state, never a timer.
import { test, expect } from './fixtures.mjs';

const EVENT = {
  id: 'cust-offline-reply', rsvpCode: 'public-offline-reply-code',
  name: 'Offline reply birthday', type: 'Birthday Party', date: '2027-06-19',
  startTime: '16:00', startTimeSource: 'host', venue: 'Denise’s place',
  guestEstimate: 25, guestMode: 'list', guests: [{ id: 'guest-1', name: 'Denise' }], vendors: [], budget: [], timeline: [],
};
const API = 'https://e2e-mock.invalid';
const OUTBOX = 'ngw-rsvp-queue-' + EVENT.id;

test('a reply sent offline is held, never called delivered, and sends once when the signal returns', async ({ page, context }) => {
  await page.addInitScript(event => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([event]));
  }, EVENT);
  await page.route(API + '/api/public/invite/**', route => route.fulfill({ status: 200, json: { ok: true, event: EVENT } }));
  let offline = false;
  const delivered = [];
  await page.route(API + '/api/public/rsvp/**', route => {
    const req = route.request();
    if (req.method() !== 'POST' || !req.url().endsWith('/api/public/rsvp/' + EVENT.rsvpCode)) return route.fallback();
    if (offline) return route.abort('internetdisconnected');
    delivered.push(req.postDataJSON());
    return route.fulfill({ status: 200, json: { ok: true, submitted_at: new Date().toISOString() } });
  });

  await page.goto('?rsvp=' + EVENT.rsvpCode);
  await expect(page.getByLabel(/Your name/i).first()).toBeVisible();

  offline = true;
  await context.setOffline(true);
  await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
  await page.getByLabel(/Your name/i).first().fill('E2E offline guest');
  await page.getByRole('button', { name: /Send my reply/i }).click();

  // Held, and said so — never celebrated.
  const ask = page.locator('.inv2-ask');
  await expect(ask).toContainText('not delivered');
  await expect(ask).toContainText('We’ll retry when the connection returns');
  await expect(ask).not.toContainText('You’re in');
  const hit = await page.evaluate(() => (window.__NGW_TRACK__ || []).find(row => row.event === 'invite_rsvp_submitted'));
  expect(hit).toMatchObject({ delivered: false });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]').length, OUTBOX)).toBe(1);
  expect(delivered).toHaveLength(0);

  // The signal returns: the held reply goes out, and the page confirms it.
  offline = false;
  await context.setOffline(false);
  await expect.poll(() => delivered.length).toBe(1);
  expect(delivered[0]).toMatchObject({ name: 'E2E offline guest', rsvp: 'Yes' });
  await expect(ask).toContainText('You’re in');
  await expect(ask).not.toContainText('not delivered');
  // Once: the outbox is empty, so no later flush has anything left to resend.
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), OUTBOX)).toBeNull();
  expect(delivered).toHaveLength(1);
});
