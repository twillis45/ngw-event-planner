// The Messages view's words and merge (owner, 11/20/2026). Pure: lib/messageTimeline.
// Times are rendered in a pinned zone so CI's Pacific/Midway and Kiritimati runs agree.
import {
  buildMessageTimeline, emailStatus, handoffStatus, helperAskTitle, groupsPresent, filterTimeline,
  EMPTY_LINE, SIGNED_OUT_NOTE,
} from '../messageTimeline';
import { recordHandoff, recordEmailSend } from '../sendLedger';

const opts = { timeZone: 'America/New_York' };
const EVENT = {
  id: 'ev1',
  guests: [{ id: 'g1', name: 'Maya Chen', email: 'Maya@example.test' }, { id: 'g2', name: 'Jordan Ellis' }],
  vendors: [{ id: 'v1', name: 'Rosa’s Catering', email: 'rosa@example.test' }],
};
const email = (id, minute, delivery) => ({ id, created_at: `2026-11-20T15:${String(minute).padStart(2, '0')}:00Z`, delivery });

describe('emailStatus speaks the server’s vocabulary, and never more', () => {
  test.each([
    ['email-delivered', 'Delivered', 'ok'],
    ['email-opened', 'Delivered — opened', 'ok'],
    ['accepted', 'Queued — the mail service took it; no delivery report yet', 'muted'],
    ['email-accepted', 'Queued — the mail service took it; no delivery report yet', 'muted'],
    ['email-deferred', 'Delayed — the mail service is still trying', 'warn'],
    ['email-bounced', 'Bounced — it didn’t reach them', 'danger'],
    ['email-complained', 'Marked as spam', 'danger'],
    ['failed', 'Didn’t go out — nothing was sent', 'danger'],
  ])('%s → %s', (status, text, tone) => {
    expect(emailStatus({ status })).toEqual({ text, tone });
  });

  test('an unknown or missing status is "No delivery report", not a guess', () => {
    expect(emailStatus({ status: 'email-teleported' }).text).toBe('No delivery report');
    expect(emailStatus({}).text).toBe('No delivery report');
    expect(emailStatus(null).text).toBe('No delivery report');
  });
});

describe('a handoff is never "Sent"', () => {
  test('it is "Handed off <how>", host-attested', () => {
    const led = recordHandoff({}, 'Your invite', 'sms', '2026-11-20T15:00:00Z');
    expect(handoffStatus(led['Your invite'])).toEqual({ text: 'Handed off by text', tone: 'attested' });
  });

  test('no line in the whole timeline says Sent for a handoff', () => {
    let ledger = recordHandoff({}, 'Your invite', 'sms', '2026-11-20T15:00:00Z', { kind: 'guests' });
    ledger = recordHandoff(ledger, 'Note to Rosa', 'whatsapp', '2026-11-20T15:01:00Z', { kind: 'vendor', id: 'v1' });
    ledger = recordHandoff(ledger, helperAskTitle('Jordan Ellis'), 'share', '2026-11-20T15:02:00Z', { kind: 'helper', id: 'g2' });
    const { entries } = buildMessageTimeline({ event: { ...EVENT, sendLedger: ledger }, server: { status: 'signed-out' }, opts });
    expect(entries).toHaveLength(3);
    for (const e of entries) expect(`${e.status} ${(e.detail || []).join(' ')}`).not.toMatch(/\bsent\b/i);
  });
});

describe('buildMessageTimeline', () => {
  const ledger = recordHandoff({}, 'You’re invited', 'sms', '2026-11-20T15:05:00Z', { kind: 'guests' });
  const server = {
    status: 'ok',
    emails: [
      email('m2', 20, { intent: 'email', status: 'email-bounced', recipient_email: 'rosa@example.test', subject: 'Can you do 3pm?' }),
      email('m1', 10, { intent: 'email', status: 'email-delivered', recipient_email: 'maya@example.test', recipient_name: 'Maya Chen', subject: 'You’re invited', kind: 'invite' }),
      email('m0', 1, { intent: 'email', status: 'accepted', recipient_email: 'maya@example.test' }),
    ],
    cohosts: null,
  };

  test('one timeline, newest first: a bounced vendor note, a delivered invite, a text handoff', () => {
    const { entries, note, empty } = buildMessageTimeline({ event: { ...EVENT, sendLedger: ledger }, server, opts });
    expect(note).toBeNull();
    expect(empty).toBe(false);
    expect(entries.map((e) => [e.who, e.what, e.how, e.status, e.group])).toEqual([
      ['Rosa’s Catering', 'Can you do 3pm?', 'by email', 'Bounced — it didn’t reach them', 'vendors'],
      ['Maya Chen', 'You’re invited', 'by email', 'Delivered', 'guests'],
      ['Your guests', 'You’re invited', 'by text', 'Handed off by text', 'guests'],
      ['Maya Chen', 'An email (its subject wasn’t kept)', 'by email', 'Queued — the mail service took it; no delivery report yet', 'guests'],
    ]);
    expect(entries[0].when).toBe('Nov 20, 10:20 AM');
  });

  test('signed in, the device’s own copy of a server email is not shown twice', () => {
    const led = recordEmailSend({}, 'Note to Rosa', 'accepted', { at: '2026-11-20T15:20:00Z', to: 'rosa@example.test' });
    const { entries } = buildMessageTimeline({ event: { ...EVENT, sendLedger: led }, server, opts });
    expect(entries.filter((e) => e.source === 'device')).toHaveLength(0);
  });

  test('signed out: only this device’s records, and the note says server email comes after sign-in', () => {
    const led = recordEmailSend(ledger, 'Note to Rosa', 'accepted', { at: '2026-11-20T15:20:00Z', to: 'rosa@example.test' });
    const r = buildMessageTimeline({ event: { ...EVENT, sendLedger: led }, server: { status: 'signed-out' }, opts });
    expect(r.note).toBe(SIGNED_OUT_NOTE);
    expect(r.entries.every((e) => e.source === 'device')).toBe(true);
    expect(r.entries.map((e) => e.status)).toEqual(['Accepted by the mail service', 'Handed off by text']);
  });

  test('signed out with nothing on the device never claims nothing was sent', () => {
    const r = buildMessageTimeline({ event: EVENT, server: { status: 'signed-out' }, opts });
    expect(r.entries).toEqual([]);
    expect(r.empty).toBe(false);
    expect(r.note).toBe(SIGNED_OUT_NOTE);
  });

  test('empty only when every source answered', () => {
    expect(buildMessageTimeline({ event: EVENT, server: { status: 'ok', emails: [], cohosts: [] } }).empty).toBe(true);
    expect(buildMessageTimeline({ event: EVENT, server: { status: 'unavailable' } }).empty).toBe(false);
    // Cohesion G #27 (owner, 11/24/2026): the empty line says what will be listed.
    expect(EMPTY_LINE).toBe('When you send the invite, a nudge or an update, it’s listed here: what went out, to whom, and when.');
    // No note points "below" at a list that may not be there.
    expect(SIGNED_OUT_NOTE).not.toMatch(/below/i);
  });

  test('a handoff with no known recipient names nobody', () => {
    const led = recordHandoff({}, 'Day-before details', 'copy', '2026-11-20T15:00:00Z');
    const [e] = buildMessageTimeline({ event: { ...EVENT, sendLedger: led }, server: { status: 'signed-out' } }).entries;
    expect(e.who).toBeNull();
    expect(e.status).toBe('Handed off copied to send');
    expect(e.group).toBe('other');
  });
});

describe('co-host invites', () => {
  const server = {
    status: 'ok',
    emails: [
      email('c3', 40, { intent: 'cohost_invite', status: 'email-delivered', recipient_email: 'gone@example.test', subject: 'You’re invited to co-host X' }),
      email('c2', 30, { intent: 'cohost_invite', status: 'accepted', recipient_email: 'pending@example.test', subject: 'You’re invited to co-host X' }),
      email('c1', 20, { intent: 'cohost_invite', status: 'email-delivered', recipient_email: 'cohost@example.test', subject: 'You’re invited to co-host X' }),
    ],
    cohosts: [
      { email: 'cohost@example.test', invited_at: '2026-11-20T15:20:00Z', joined_at: '2026-11-20T16:00:00Z' },
      { email: 'pending@example.test', invited_at: '2026-11-20T15:30:00Z', joined_at: null },
      { email: 'old@example.test', invited_at: '2026-11-19T15:30:00Z', joined_at: null },
    ],
  };

  test('joined, pending, an invite with no email record, and one no longer a co-host', () => {
    const { entries } = buildMessageTimeline({ event: EVENT, server, opts });
    const by = Object.fromEntries(entries.map((e) => [e.who, e]));
    expect(entries.every((e) => e.group === 'cohosts')).toBe(true);
    expect(by['cohost@example.test']).toMatchObject({ what: 'Co-host invite', how: 'by email', status: 'Joined',
      detail: ['Joined Nov 20, 11:00 AM', 'Invite email: Delivered'] });
    expect(by['pending@example.test']).toMatchObject({ status: 'Invited — not signed in yet',
      detail: ['Invite email: Queued — the mail service took it; no delivery report yet'] });
    // Invited before invites were recorded: the row says so by having no "how".
    expect(by['old@example.test']).toMatchObject({ how: null, status: 'Invited — not signed in yet', detail: [] });
    expect(by['gone@example.test']).toMatchObject({ status: 'No longer a co-host', detail: ['Invite email: Delivered'] });
  });

  test('a co-host reading (no list) still sees the invite emails, as emails', () => {
    const { entries } = buildMessageTimeline({ event: EVENT, server: { ...server, cohosts: null }, opts });
    expect(entries.map((e) => [e.group, e.what, e.status])[0]).toEqual(['cohosts', 'You’re invited to co-host X', 'Delivered']);
  });
});

describe('helper asks', () => {
  const helpers = [{ id: 'g2', name: 'Jordan Ellis' }, { id: 'helper-sam', name: 'Sam' }, { id: 'helper-lee', name: 'Lee' }];
  const ledger = recordHandoff({}, helperAskTitle('Jordan Ellis'), 'sms', '2026-11-20T15:00:00Z', { kind: 'helper', id: 'g2' });
  const answers = [
    { helper_key: 'g2', state: 'confirmed', note: null, submitted_at: '2026-11-20T16:00:00Z', updated_at: null },
    { helper_key: 'helper-sam', state: 'declined', note: 'Out of town', submitted_at: '2026-11-20T17:00:00Z', updated_at: null },
  ];
  const event = { ...EVENT, sendLedger: ledger, helperLinkIds: ['g2', 'helper-sam', 'helper-lee'] };

  test('the ask from the handoff, the answer from the server, in the board’s words', () => {
    const { entries } = buildMessageTimeline({ event, server: { status: 'ok', emails: [], cohosts: [] }, helpers, helperAnswers: answers, opts });
    const by = Object.fromEntries(entries.map((e) => [e.who, e]));
    expect(by['Jordan Ellis']).toMatchObject({ group: 'helpers', what: 'Jordan Ellis’s job', how: 'by text',
      status: 'Handed off by text', detail: ['Jordan said yes · Nov 20, 11:00 AM'], detailTone: 'ok' });
    // A link made before handoffs were recorded: no send is claimed.
    expect(by.Sam).toMatchObject({ how: 'by link', status: 'Link made — no send recorded',
      detail: ['Sam can’t do it — “Out of town” · Nov 20, 12:00 PM'], detailTone: 'warn' });
    expect(by.Lee).toMatchObject({ status: 'Link made — no send recorded', detail: [] });
    expect(entries.map((e) => e.who)).toEqual(['Sam', 'Jordan Ellis', 'Lee']);   // newest activity first
  });
});

describe('the filter', () => {
  test('All, then only groups that have something; filtering keeps order', () => {
    const entries = [{ group: 'vendors' }, { group: 'guests' }, { group: 'other' }, { group: 'guests' }];
    expect(groupsPresent(entries).map(([k]) => k)).toEqual(['all', 'guests', 'vendors']);
    expect(filterTimeline(entries, 'guests')).toEqual([entries[1], entries[3]]);
    expect(filterTimeline(entries, 'all')).toBe(entries);
  });
});

describe('the helper email the app sent (owner, 11/20/2026)', () => {
  test('it is filed under Helpers, by name, with the server’s own status', () => {
    const server = { status: 'ok', cohosts: null, emails: [email('h1', 5, {
      intent: 'email', kind: 'helper', recipient_email: 'Maya@example.test', recipient_name: 'Maya Chen',
      subject: 'Your job for My Friendsgiving', status: 'accepted' })] };
    const { entries } = buildMessageTimeline({ event: EVENT, server, opts });
    const e = entries.find((x) => x.key === 'email-h1');
    expect(e).toMatchObject({ group: 'helpers', who: 'Maya Chen', what: 'Your job for My Friendsgiving', how: 'by email' });
    expect(e.status).toBe('Queued — the mail service took it; no delivery report yet');
  });
});
