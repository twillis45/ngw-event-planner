// ─── THE MESSAGES VIEW TELLS THE TRUTH (owner, 11/20/2026) ───────────────────
//
// "Yes, build the Messages view." One read-only timeline per event: server-
// logged email with its real delivery status, co-host invitations, the host's
// own recorded handoffs, and helper asks with the helper's answer. The words
// are pinned in jest (src/lib/__tests__/messageTimeline.test.js); this drives
// the shipped sheet on the shared e2e bundle, with the API mocked at its fake
// host as theHostAnswersGuestQuestions does. A 200 from the mock stands for a
// signed-in host; a 401 is the server's answer to a signed-out one.
// Everything here is synthetic.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const EVENT_ID = 'msgs-e2e';

const EVENT = {
  id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'Friendsgiving', createdAt: '2026-11-01',
  guestMode: 'list', venue: 'Pine Street Commons', startTime: '16:00', startTimeSource: 'host',
  guestEstimate: 8, guestCountSource: 'host',
  guests: [
    { id: 'g1', name: 'Maya Chen', email: 'maya@example.test' },
    { id: 'g2', name: 'Jordan Ellis', phone: '(410) 555-0102' },
  ],
  vendors: [{ id: 'v1', name: 'Rosa’s Catering', email: 'rosa@example.test' }],
  budget: [],
  // Jordan holds a job, so the helper engine names Jordan a helper (id g2).
  timeline: [{ id: 't1', task: 'Bring the ice', owner: 'Jordan Ellis' }],
};

const LEDGER = {
  // The invite, handed off from the host's own Messages app: host-attested.
  'You’re invited': { status: 'handed_off', attested: true, channel: 'sms', at: '2026-11-20T14:00:00.000Z', about: { kind: 'guests' } },
  // Jordan's job, handed off by text with Jordan's link.
  'Jordan Ellis’s job': { status: 'handed_off', attested: true, channel: 'sms', at: '2026-11-20T13:00:00.000Z', about: { kind: 'helper', id: 'g2' } },
};

const SENT = {
  emails: [
    { id: 'm3', created_at: '2026-11-20T16:00:00Z', delivery: JSON.stringify({ intent: 'email', status: 'email-bounced', recipient_email: 'rosa@example.test', recipient_name: 'Rosa’s Catering', subject: 'Can you do 3pm?' }) },
    { id: 'm2', created_at: '2026-11-20T15:00:00Z', delivery: { intent: 'email', status: 'email-delivered', recipient_email: 'maya@example.test', recipient_name: 'Maya Chen', subject: 'You’re invited to Vida’s Friendsgiving', kind: 'invite' } },
    { id: 'c2', created_at: '2026-11-20T12:30:00Z', delivery: { intent: 'cohost_invite', status: 'accepted', recipient_email: 'pending@example.test', subject: 'You’re invited to co-host Vida’s Friendsgiving' } },
    { id: 'c1', created_at: '2026-11-20T12:00:00Z', delivery: { intent: 'cohost_invite', status: 'email-delivered', recipient_email: 'cohost@example.test', subject: 'You’re invited to co-host Vida’s Friendsgiving' } },
  ],
  cohosts: [
    { email: 'cohost@example.test', invited_at: '2026-11-20T12:00:00Z', joined_at: '2026-11-20T12:45:00Z' },
    { email: 'pending@example.test', invited_at: '2026-11-20T12:30:00Z', joined_at: null },
  ],
};

test.use({ timezoneId: 'America/New_York' });

const boot = async (page, { ev = EVENT, sent = SENT, status = 200, answers = [] } = {}) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 401, json: { detail: 'Sign in' } }));
  await page.route(`${API}/api/events/${ev.id}/communication/sent`, (r) => r.fulfill({ status, json: status === 200 ? sent : { detail: 'Sign in' } }));
  await page.route(`${API}/api/events/${ev.id}/helper-confirmations`, (r) => r.fulfill({ status: 200, json: answers }));
  await page.addInitScript(([e, iso]) => {
    localStorage.setItem('ngw-events', JSON.stringify([{ ...e, date: iso }]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [ev, dateIn(12)]);
  await page.goto('?elegant=1');
  await settled(page);
};

const openMessages = async (page) => {
  await openSectionByName(page, 'Messages');
  await sheetSettled(page);
  await expect(page.locator('#sheet-title')).toHaveText('Messages');
  return page.locator('[data-messages]');
};

const row = (sheet, key) => sheet.locator(`[data-message="${key}"]`);

test('signed in: a delivered invite, a bounced email, a text handoff, co-hosts and a helper’s answer, newest first', async ({ page }) => {
  await boot(page, {
    ev: { ...EVENT, sendLedger: LEDGER, helperLinkIds: ['g2'] },
    answers: [{ helper_key: 'g2', state: 'confirmed', note: null, submitted_at: '2026-11-20T13:30:00Z', updated_at: null }],
  });
  const sheet = await openMessages(page);
  await expect(sheet.locator('[data-messages-list] > li')).toHaveCount(6);

  await expect(row(sheet, 'email-m2')).toContainText('Maya Chen');
  await expect(row(sheet, 'email-m2')).toContainText('You’re invited to Vida’s Friendsgiving · by email · Nov 20, 10:00 AM');
  await expect(row(sheet, 'email-m2').locator('[data-message-status]')).toHaveText('Delivered');

  await expect(row(sheet, 'email-m3')).toContainText('Rosa’s Catering');
  await expect(row(sheet, 'email-m3').locator('[data-message-status]')).toHaveText('Bounced — it didn’t reach them');

  const handoff = row(sheet, 'ledger-You’re invited');
  await expect(handoff).toContainText('Your guests');
  await expect(handoff.locator('[data-message-status]')).toHaveText('Handed off by text');
  await expect(handoff).toHaveAttribute('data-source', 'device');

  await expect(row(sheet, 'cohost-cohost@example.test').locator('[data-message-status]')).toHaveText('Joined');
  await expect(row(sheet, 'cohost-cohost@example.test')).toContainText('Invite email: Delivered');
  await expect(row(sheet, 'cohost-pending@example.test').locator('[data-message-status]')).toHaveText('Invited — not signed in yet');

  const helper = row(sheet, 'helper-g2');
  await expect(helper).toContainText('Jordan Ellis’s job · by text');
  await expect(helper.locator('[data-message-status]')).toHaveText('Handed off by text');
  await expect(helper.locator('[data-message-detail]')).toHaveText('Jordan said yes · Nov 20, 8:30 AM');

  // Newest first.
  const order = await sheet.locator('[data-messages-list] > li').evaluateAll((els) => els.map((e) => e.getAttribute('data-message')));
  expect(order).toEqual(['email-m3', 'email-m2', 'ledger-You’re invited', 'helper-g2', 'cohost-pending@example.test', 'cohost-cohost@example.test']);

  // A handoff never reads as sent; the view offers no resend and no compose.
  for (const k of ['ledger-You’re invited', 'helper-g2']) {
    await expect(row(sheet, k).locator('[data-message-status]')).not.toHaveText(/\bsent\b/i);
  }
  await expect(sheet.locator('textarea, input')).toHaveCount(0);
  await expect(sheet.getByRole('button', { name: /resend|send|reply|compose/i })).toHaveCount(0);

  // Grouping: co-hosts only.
  await sheet.locator('[data-messages-filter="cohosts"]').click();
  await expect(sheet.locator('[data-messages-list] > li')).toHaveCount(2);
  await sheet.locator('[data-messages-filter="helpers"]').click();
  await expect(sheet.locator('[data-messages-list] > li')).toHaveCount(1);
  await sheet.locator('[data-messages-filter="all"]').click();
  await expect(sheet.locator('[data-messages-list] > li')).toHaveCount(6);
});

test('nothing sent yet: the honest line and the guest list, the app’s way to start', async ({ page }) => {
  await boot(page, { sent: { emails: [], cohosts: [] } });
  const sheet = await openMessages(page);
  // The empty state names what will be listed (cohesion G #27, owner 11/24/2026).
  await expect(sheet.locator('[data-messages-empty]')).toContainText('Nothing yet');
  await expect(sheet.locator('[data-messages-empty]')).toContainText('When you send the invite, a nudge or an update, it’s listed here: what went out, to whom, and when.');
  await expect(sheet.locator('[data-messages-note]')).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Open your guest list' }).click();
  await expect(page.locator('#sheet-title')).not.toHaveText('Messages');
});

test('signed out: only this device’s records, with the note — never "nothing sent"', async ({ page }) => {
  await boot(page, { status: 401, ev: { ...EVENT, sendLedger: { 'You’re invited': LEDGER['You’re invited'] } } });
  const sheet = await openMessages(page);
  // Its own row now, never a pointer "below" (cohesion G #27).
  await expect(sheet.locator('[data-messages-note]')).toHaveText(
    'Email historyEmail the app sends for you shows here after you sign in. Anything sent from this device still shows here.');
  await expect(sheet.locator('[data-messages-list] > li')).toHaveCount(1);
  await expect(row(sheet, 'ledger-You’re invited').locator('[data-message-status]')).toHaveText('Handed off by text');
  await expect(sheet.locator('[data-messages-empty]')).toHaveCount(0);
});

test('signed out with nothing on this device: the note, and no empty line', async ({ page }) => {
  await boot(page, { status: 401 });
  const sheet = await openMessages(page);
  await expect(sheet.locator('[data-messages-note]')).toBeVisible();
  await expect(sheet.locator('[data-messages-empty]')).toHaveCount(0);
});

test('a "Reply to …" is never offered as a way into the read-only Messages sheet', async ({ page }) => {
  // An inbound message puts "Reply to an inbound message." in the plan's queue,
  // routed to { tab: 'Communication', commId } with primaryCta 'Reply'
  // (CommandCenter tier 6; the premise is pinned in jest, ctaNamesTheAct). The
  // Messages sheet cannot reply and does not hold inbound messages, so the
  // route stays unroutable — and the board's "Then, in order" list renders only
  // rows resolveRoute can land, so no Reply row is offered here at all. Routing
  // it to the sheet (the dishonest version) puts the row back and fails this.
  const ev = { ...EVENT, id: 'msgs-e2e-route', type: 'Gathering', guests: [], timeline: [], vendors: [], totalBudget: 800,
    commClient: [{ id: 'c1', direction: 'inbound', channel: 'vendor', senderName: 'Rosa', body: 'Can we move to 3pm?', createdAt: new Date().toISOString() }] };
  await boot(page, { ev, sent: { emails: [], cohosts: [] } });
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();   // the board rendered
  await page.waitForTimeout(500);
  await expect(page.getByText('Reply to an inbound message', { exact: false })).toHaveCount(0);
  await expect(page.locator('[data-messages]')).toHaveCount(0);
});
