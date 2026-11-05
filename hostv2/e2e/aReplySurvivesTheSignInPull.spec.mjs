// ─── A GUEST'S REPLY SURVIVES THE SIGN-IN PULL ───────────────────────────────
//
// Issue #100, D-7, measured on a real local stack (Supabase + FastAPI) on
// 11/5/2026: a guest replied, the host reloaded, the reply merged ("1 reply
// came in from your invite link") and about 30ms later the sign-in pull adopted
// the account's OLDER copy over it ("Updated with a newer version from your
// account."). On some runs the reply was simply gone. Fixed in 9cb2d042:
//   · a save in flight is not "synced", so the pull leaves it alone;
//   · a pulled copy older than this device's own write is a stale read;
//   · jsonb key order is not a content change.
//
// gold07RsvpCascade covers the reply chain SIGNED OUT, where the pull never
// runs — which is why it stayed green through this defect. This is the signed-
// in half. The race is made deterministic, not hoped for: the cloud pull is
// held 1.2s so it lands after the reply has merged, the order measured live.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn } from './fixtures.mjs';

const BASE = previewUrl(5277);
const PROJECT = 'https://rsvpsync.supabase.co';
const API = 'https://rsvpsync-mock.invalid';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const EVENT_ID = 'ev-reply-survives';
const T_LOADED = '2026-11-05T12:00:00.000000+00:00';   // the version both copies carry at boot
const T_MINE = '2026-11-05T12:00:05.000000+00:00';     // the stamp this device's reply write gets

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

const event = () => ({
  id: EVENT_ID, name: 'Book club', type: 'Get-Together',
  date: dateIn(3), createdAt: '2026-11-01T10:00:00.000Z',
  guestMode: 'list', guestEstimate: 3, guestCountSource: 'host', budget: [], vendors: [],
  guests: [{ id: 'g1', name: 'Nia Clean', rsvp: '' }, { id: 'g2', name: 'Omar Clean', rsvp: '' }, { id: 'g3', name: 'Pia Clean', rsvp: '' }],
});

test('a reply that merged on sign-in is still there after the pull lands', async ({ page }) => {
  const writes = [];
  await page.route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/events')) {
      if (req.method() !== 'GET') {           // this device's reply write lands
        writes.push(req.method());
        return json([{ id: EVENT_ID, updated_at: T_MINE }]);
      }
      // The sign-in pull, holding the OLDER row — no reply in it — and held so
      // it lands after the merge, the order measured on the real stack.
      await new Promise((r) => setTimeout(r, 1200));
      return json([{ id: EVENT_ID, data: event(), updated_at: T_LOADED }]);
    }
    if (url.includes('/auth/v1/')) return json({});
    return json([]);
  });
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${API}/api/events/${EVENT_ID}/rsvps`, (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ guest_name: 'Omar Clean', rsvp: 'Yes', idempotency_key: 'reply-1', submitted_at: new Date().toISOString() }]),
  }));
  await page.addInitScript(([sess, ev, stamp]) => {
    window.__toasts = [];
    new MutationObserver(() => {
      document.querySelectorAll('[role=status]').forEach((n) => {
        const x = (n.innerText || '').trim();
        if (x && window.__toasts[window.__toasts.length - 1] !== x) window.__toasts.push(x);
      });
    }).observe(document, { subtree: true, childList: true, characterData: true });
    localStorage.setItem('sb-rsvpsync-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ ...ev, _cloudUpdatedAt: stamp }]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [fakeSession(), event(), T_LOADED]);

  await page.goto(BASE + '?elegant=1');
  // Past the held pull and its adopt loop, with margin.
  await page.waitForTimeout(5000);

  const omar = await page.evaluate((id) => {
    const ev = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events')).find((e) => e.id === id);
    return (ev.guests.find((g) => g.name === 'Omar Clean') || {}).rsvp;
  }, EVENT_ID);
  const toasts = await page.evaluate(() => window.__toasts);

  // PREMISE: the reply really merged and was really written to the account —
  // otherwise "it survived" would be true of a reply that never arrived.
  expect(toasts.some((t) => /reply came in from your invite link/.test(t)), JSON.stringify(toasts)).toBe(true);
  expect(writes.length).toBeGreaterThan(0);
  // THE CLAIM: the older cloud copy did not replace it, and nothing said it did.
  expect(omar).toBe('Yes');
  expect(toasts.some((t) => /newer version from your account/.test(t)), JSON.stringify(toasts)).toBe(false);
});
