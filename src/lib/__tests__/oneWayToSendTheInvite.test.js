// ONE WAY TO SEND THE INVITE (owner, 11/25/2026: "Use the hostv2 sign-in for
// sending in hostv4"). Both shells send the invite the same way, so the steps
// that leave the device live here: the reply link (checked against the public
// page a guest opens), the email to one guest (with every refusal in words),
// and what a send records on the plan.
jest.mock('../api/rsvp', () => ({ checkRsvpCapability: jest.fn() }));
jest.mock('../commApi', () => ({ commApi: { createMessage: jest.fn() } }));
jest.mock('../publicAppUrl', () => ({ publicAppUrl: () => 'https://example.test/app/' }));

const { checkRsvpCapability } = require('../api/rsvp');
const { commApi } = require('../commApi');
const { replyLinkUrl, replyLinkFor, emailInviteTo, invitesReachedEdit, inviteSentFields } = require('../inviteSend');

const ev = { id: 'cust-1', rsvpCode: 'abcdefghijklmnop12', name: 'Rosa’s 40th', guests: [{ id: 'g1', name: 'Ada', rsvp: '' }, { id: 'g2', name: 'Bo', rsvp: '' }] };
beforeEach(() => { checkRsvpCapability.mockReset(); commApi.createMessage.mockReset(); });

test('the reply link is the public page with the plan’s code', () => {
  expect(replyLinkUrl(ev)).toBe('https://example.test/app/?rsvp=abcdefghijklmnop12');
  expect(replyLinkUrl({ id: 'x y' })).toBe('https://example.test/app/?rsvp=x%20y');
});

test('no published plan, no link, and the reason', async () => {
  checkRsvpCapability.mockResolvedValue({ ready: false, reason: 'unpublished' });
  await expect(replyLinkFor(ev)).resolves.toEqual({ url: '', reason: 'unpublished' });
  checkRsvpCapability.mockResolvedValue({ ready: true, code: ev.rsvpCode });
  await expect(replyLinkFor(ev)).resolves.toEqual({ url: 'https://example.test/app/?rsvp=abcdefghijklmnop12', reason: null });
});

test('one guest’s email: the invite, from the host, replies to the host', async () => {
  commApi.createMessage.mockResolvedValue({ metadata: { delivery: { status: 'accepted' } } });
  const r = await emailInviteTo(ev, { id: 'g1', name: 'Ada', email: 'ada@example.test' }, { subject: 'You’re invited', body: 'Come!', hostName: 'Rosa', replyTo: 'rosa@example.test', cardVersion: 3 });
  expect(r).toEqual({ ok: true });
  expect(commApi.createMessage).toHaveBeenCalledWith('cust-1', 'CLIENT', {
    invite_card_version: 3, message_type: 'standard', author_role: 'planner', author_name: 'Rosa',
    body: 'Come!', deliver_email: true, invite: true, recipient_email: 'ada@example.test', recipient_name: 'Ada', subject: 'You’re invited', reply_to: 'rosa@example.test',
  });
});

test('without a card version or a reply address, neither is sent; the host name falls back', async () => {
  commApi.createMessage.mockResolvedValue({ metadata: { delivery: { status: 'accepted' } } });
  await emailInviteTo(ev, { id: 'g1', email: 'ada@example.test' }, { subject: 's', body: 'b' });
  const msg = commApi.createMessage.mock.calls[0][2];
  expect('invite_card_version' in msg).toBe(false);
  expect('reply_to' in msg).toBe(false);
  expect(msg.author_name).toBe('Your host');
  expect(msg.recipient_name).toBeUndefined();
});

test('every refusal is said in words', async () => {
  const cases = [
    ['POST /x → 429', { ok: false, capped: true }],
    ['POST /x → 403', { ok: false, error: 'not saved to your account yet' }],
    ['POST /x → 410', { ok: false, error: 'they asked not to get emails about this event — text them instead' }],
    ['POST /x → 422', { ok: false, error: 'the saved copy of your event is missing the day, time or place — give it a moment to save, then try again' }],
    ['boom', { ok: false, error: 'request failed' }],
  ];
  for (const [m, want] of cases) {
    commApi.createMessage.mockRejectedValueOnce(new Error(m));
    await expect(emailInviteTo(ev, { email: 'a@b.test' }, { subject: 's', body: 'b' })).resolves.toEqual(want);
  }
  commApi.createMessage.mockResolvedValueOnce({ metadata: { delivery: { status: 'failed', error: 'bounced' } } });
  await expect(emailInviteTo(ev, { email: 'a@b.test' }, { subject: 's', body: 'b' })).resolves.toEqual({ ok: false, error: 'bounced' });
  commApi.createMessage.mockResolvedValueOnce({});
  await expect(emailInviteTo(ev, { email: 'a@b.test' }, { subject: 's', body: 'b' })).resolves.toEqual({ ok: false, error: 'no delivery confirmation' });
});

test('reaching guests writes it on each, stamps the first send, and keeps what went out', () => {
  const snap = { subject: 's', body: 'b', voice: 'as-written', at: '2026-11-25T18:00:00.000Z' };
  const r = invitesReachedEdit(ev, [{ id: 'g1' }], 'email', '2026-11-25T18:00:00.000Z', snap);
  expect(r.patch.guests[0]).toEqual({ id: 'g1', name: 'Ada', rsvp: '', invitedAt: '2026-11-25T18:00:00.000Z', invitedVia: 'email' });
  expect(r.patch.guests[1]).toEqual(ev.guests[1]);
  expect(r.patch.invitesSentAt).toBe('2026-11-25T18:00:00.000Z');
  expect(r.patch.invitesSentMessage).toBe(snap);
  expect(r.msg).toBe(null);
  // A second send keeps the first send's date.
  expect('invitesSentAt' in invitesReachedEdit({ ...ev, invitesSentAt: 'earlier' }, [{ id: 'g2' }], 'text', 'now', snap).patch).toBe(false);
  // Nobody reached: no record of what went out.
  expect('invitesSentMessage' in invitesReachedEdit(ev, [], 'email', 'now', snap).patch).toBe(false);
});

test('sent another way: the first send is stamped and what went out kept; a copy is not a send', () => {
  const snap = { body: 'b' };
  expect(inviteSentFields(ev, 'other', snap, 'now')).toEqual({ invitesSentAt: 'now', invitesSentMessage: snap });
  expect(inviteSentFields({ ...ev, invitesSentAt: 'earlier' }, 'other', snap, 'now')).toEqual({ invitesSentMessage: snap });
  expect(inviteSentFields(ev, 'copy', snap, 'now')).toEqual({});
});
