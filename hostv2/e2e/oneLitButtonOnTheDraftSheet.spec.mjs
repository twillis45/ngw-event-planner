// ─── ONE LIT BUTTON ON THE DRAFT SHEET (11/21/2026) ─────────────────────────
//
// UX_05: "Maximum ONE primary button per view section." `oneLitButtonPerSheet`
// walks the sections a host opens from the board; the draft sheet opens from
// inside them, so it was never measured, and it lit up to three at once:
//   • "Your invite": "Share…" beside "Text Riley Park" once the text queue ran,
//     and, signed in, "Email the invite to N" as a third (since 11/24/2026 the
//     list send is its own confirm sheet, with no hand-offs: render s2-4);
//   • the RSVP nudge: the same three;
//   • a vendor's draft: "Share…" beside "Send it to …".
// One primary per state now: the send the app makes itself (the vendor email,
// the list's email) outranks a handoff; while the text queue runs, its
// "Text {name}" is the one, and the email step goes quiet; "Share…" is lit
// only when nothing else is.
//
// navigator.share is mocked: headless Chromium has none, so "Share…" never
// rendered here and could not be counted. "Lit" is oneLitButtonPerSheet's
// measure, a control whose computed background-image IS the resolved
// --cta-grad.
//
// THE HARNESS is the rsvpsync bundle (5277): a fake Supabase session and an
// API base, so the email sends render signed in. Signed out is the same
// bundle with no session. Every request is answered here; all synthetic.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn, settled, sheetSettled, openSectionByName, checklistStepAction } from './fixtures.mjs';
import { litButtons } from './tripDetailsFixture.mjs';

const BASE = previewUrl(Number(process.env.PW_RSVPSYNC_PORT || 5277));
const PROJECT = 'https://rsvpsync.supabase.co';
const API = 'https://rsvpsync-mock.invalid';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const CODE = 'e2eonelitdraft00001';
const T_LOADED = '2026-11-21T12:00:00.000000+00:00';
const SENT = new Date(Date.now() - 9 * 864e5).toISOString();

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'host@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

const party = (id, guests) => ({
  id, name: 'Maya’s 40th Birthday', type: 'Birthday', date: dateIn(12), createdAt: '2026-11-01T10:00:00.000Z',
  startTime: '18:00', startTimeSource: 'host', venue: 'The Ironwood Room', venueCity: 'Annapolis, MD',
  rsvpCode: CODE, rsvpDeadline: dateIn(2), guestMode: 'list', guestEstimate: 4, guestCountSource: 'host',
  budget: [], vendors: [], timeline: [], guests,
});
// To invite: one with an email, one with only a phone.
const TO_INVITE = [
  { id: 'g1', name: 'Jordan Avery', email: 'jordan@example.test' },
  { id: 'g2', name: 'Riley Park', phone: '(410) 555-0102' },
];
// To nudge: invited nine days ago, not answered.
const TO_NUDGE = TO_INVITE.map((g) => ({ ...g, invitedAt: SENT, invitedVia: g.email ? 'email' : 'text' }));

const boot = async (page, ev, { signedIn }) => {
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
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({
    status: 200, json: { ok: true, event: { id: ev.id, name: ev.name, type: ev.type, date: ev.date, rsvpCode: CODE, goingCount: 0 } },
  }));
  await page.addInitScript(([sess, e, stamp]) => {
    // The share sheet: headless Chromium has none, so it is stood in for.
    Object.defineProperty(navigator, 'share', { configurable: true, value: () => Promise.resolve() });
    // An sms: link would leave the page.
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
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Vida Ramos' }));
  }, [signedIn ? fakeSession() : null, ev, T_LOADED]);
  await page.goto(BASE + '?elegant=1');
  await settled(page);
};

const openFromGuests = async (page, name) => {
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  await page.getByRole('button', { name, exact: true }).first().click();
  await sheetSettled(page);
  return page.locator('.sheet').last();
};
const lit = (page) => page.evaluate(litButtons);

// THE SEND CONFIRM (owner, 11/24/2026: render s2-4). "Invite your guest list"
// opens the confirm step: no hand-offs, the list's own send is the one.
test('“Invite your guest list”, signed out: the texts are the one, then the queue takes it', async ({ page }) => {
  await boot(page, party('one-lit-invite-out', TO_INVITE), { signedIn: false });
  const sheet = await openFromGuests(page, 'Invite your guest list (2)');
  await expect(sheet.locator('[data-invite-list]')).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Share…', exact: true })).toHaveCount(0);
  await expect.poll(() => lit(page)).toEqual(['Text 1 guest, one at a time']);
  await sheet.locator('[data-invite-texts]').click();
  await expect(sheet.locator('[data-invite-text-one]')).toHaveText('Text Riley Park');
  await expect.poll(() => lit(page)).toEqual(['Text Riley Park']);
  // The queue done, nothing is left to light.
  await sheet.locator('[data-invite-text-one]').click();
  await expect(sheet).toContainText('That’s everyone with only a phone number.');
  await expect.poll(() => lit(page)).toEqual([]);
});

test('“Invite your guest list”, signed in: the email is the one; the text queue takes it, and the email goes quiet', async ({ page }) => {
  await boot(page, party('one-lit-invite-in', TO_INVITE), { signedIn: true });
  const sheet = await openFromGuests(page, 'Invite your guest list (2)');
  await expect(sheet.locator('[data-invite-email-go]')).toHaveText('Send to 1 by email');
  await expect.poll(() => lit(page)).toEqual(['Send to 1 by email']);
  await sheet.locator('[data-invite-texts]').click();
  await expect(sheet.locator('[data-invite-text-one]')).toBeVisible();
  await expect.poll(() => lit(page)).toEqual(['Text Riley Park']);
  await expect(sheet.locator('[data-invite-email-go]')).toBeVisible();   // quiet, not gone
  await sheet.locator('[data-invite-text-one]').click();
  await expect.poll(() => lit(page)).toEqual(['Send to 1 by email']);
});

test('the RSVP nudge, signed in: the email is the one, then the text queue', async ({ page }) => {
  await boot(page, party('one-lit-nudge-in', TO_NUDGE), { signedIn: true });
  const sheet = await openFromGuests(page, 'Nudge the 2 who haven’t replied');
  await expect(sheet.locator('[data-nudge-email]')).toHaveText('Email the nudge to 1 guest');
  await expect.poll(() => lit(page)).toEqual(['Email the nudge to 1 guest']);
  await sheet.locator('[data-nudge-texts]').click();
  await expect(sheet.locator('[data-nudge-text-one]')).toBeVisible();
  await expect.poll(() => lit(page)).toEqual(['Text Riley Park']);
});

test('the RSVP nudge, signed out: Share… is the one, then the text queue', async ({ page }) => {
  await boot(page, party('one-lit-nudge-out', TO_NUDGE), { signedIn: false });
  const sheet = await openFromGuests(page, 'Nudge the 2 who haven’t replied');
  await expect(sheet.locator('[data-nudge-list]')).toBeVisible();
  await expect.poll(() => lit(page)).toEqual(['Share…']);
  await sheet.locator('[data-nudge-texts]').click();
  await expect.poll(() => lit(page)).toEqual(['Text Riley Park']);
});

test('a vendor’s draft, signed in with their email: “Send it to …” is the one', async ({ page }) => {
  const STEP = 'Confirm every reservation: the place to stay, the dinners, and anything else that is booked';
  const id = 'one-lit-vendor';
  const trip = {
    id, name: 'Nashville Weekend', type: 'Group Trip', date: dateIn(20), endDate: dateIn(22),
    createdAt: new Date(Date.now() - 60 * 864e5).toISOString(),
    venue: 'Nashville, TN', venueCity: 'Nashville', venueState: 'TN',
    guestMode: 'count', guestEstimate: 6, guestCountSource: 'host', guests: [], budget: [], foodChoices: {},
    lodging: { hotelName: 'The Gulch House', from: 'typed off the confirmation' },
    vendors: [{ id: 'v1', name: 'Husk dinner', category: 'Restaurant', status: 'Booked', email: 'events@husk.example' }],
    timeline: [{ id: `pbt-${id}-t_confirm`, task: STEP, leadDays: 10, week: '10 days out', done: false, owner: '', category: 'planning', phase: 'logistics' }],
  };
  await boot(page, trip, { signedIn: true });
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await (await checklistStepAction(page, 'Reconfirm each booking')).click();
  await sheetSettled(page);
  await page.locator('.sheet').last().getByRole('button', { name: 'Read it first' }).first().click();
  await sheetSettled(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet.getByRole('button', { name: 'Send it to events@husk.example', exact: true })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Share…', exact: true })).toBeVisible();
  await expect.poll(() => lit(page)).toEqual(['Send it to events@husk.example']);
});
