// Owner, 11/19/2026: "Build the invite email batch and text queue." The invite
// was one link the host handed out by hand; the app's own email send went to
// one person per tap. Now the invite goes to every guest who has not declined
// and has not been invited yet: by email where the guest has a good address
// (one email each, through the same guarded route as every other send), else
// into a one-at-a-time text queue. Nobody is invited twice.
import { inviteRecipients, sendInviteEmails, markInvited, smsHref, inviteSubjectAndBody, inviteContacts } from '../inviteBatch';

const G = [
  { id: 'a', name: 'Maya Chen', email: 'maya@example.test', phone: '(410) 555-0101' },
  { id: 'b', name: 'Jordan', phone: '410-555-0102' },
  { id: 'c', name: 'Sam', email: 'sam@example.test', rsvp: 'No' },
  { id: 'd', name: 'Ana', email: 'not-an-address', phone: '' },
  { id: 'e', name: 'Lee', email: 'lee@example.test', invitedAt: '2026-11-18T10:00:00Z', invitedVia: 'email' },
  { id: 'f', name: '', email: 'nameless@example.test' },
  { id: 'g', name: 'Rae', email: 'RAE@example.test ' },
];

test('email where the address is good, a text where there is only a phone, nobody twice', () => {
  const r = inviteRecipients(G);
  expect(r.email.map((x) => x.id)).toEqual(['a', 'f', 'g']);   // Maya has both: email, once
  expect(r.email.find((x) => x.id === 'g').email).toBe('RAE@example.test');
  expect(r.text.map((x) => x.id)).toEqual(['b']);
  expect(r.unreachable.map((x) => x.id)).toEqual(['d']);       // a malformed address, no phone
  expect(r.alreadyInvited).toBe(1);                            // Lee
  // Sam declined: in no list at all
  expect([...r.email, ...r.text, ...r.unreachable].some((x) => x.id === 'c')).toBe(false);
});

test('each guest gets their own email, and each result is kept', async () => {
  const sent = [];
  const send = async (g) => { sent.push(g.email); return g.id === 'f' ? { ok: false, error: 'bounced' } : { ok: true }; };
  const progress = [];
  const out = await sendInviteEmails(inviteRecipients(G).email, send, (n, total) => progress.push(`${n}/${total}`));
  expect(sent).toEqual(['maya@example.test', 'nameless@example.test', 'RAE@example.test']);
  expect(out.sent.map((x) => x.id)).toEqual(['a', 'g']);
  expect(out.failed).toEqual([{ id: 'f', name: '', email: 'nameless@example.test', error: 'bounced' }]);
  expect(out.notTried).toEqual([]);
  expect(progress).toEqual(['1/3', '2/3', '3/3']);
});

test('the daily limit stops the run, and the rest are left for tomorrow, untried', async () => {
  let n = 0;
  const send = async () => (++n === 2 ? { ok: false, capped: true, error: 'limit' } : { ok: true });
  const out = await sendInviteEmails(inviteRecipients(G).email, send);
  expect(out.sent.map((x) => x.id)).toEqual(['a']);
  expect(out.capped).toBe(true);
  expect(out.failed).toEqual([]);                              // capped is not a failure of that guest
  expect(out.notTried.map((x) => x.id)).toEqual(['f', 'g']);
});

test('a send that throws is that guest failing, not the run', async () => {
  const send = async (g) => { if (g.id === 'a') throw new Error('network'); return { ok: true }; };
  const out = await sendInviteEmails(inviteRecipients(G).email, send);
  expect(out.failed.map((x) => [x.id, x.error])).toEqual([['a', 'network']]);
  expect(out.sent.map((x) => x.id)).toEqual(['f', 'g']);
});

test('a sent invite is written on the guest, so the next batch skips them', () => {
  const at = '2026-11-19T15:00:00.000Z';
  const next = markInvited(G, [{ id: 'a' }, { id: 'g' }], 'email', at);
  expect(next.find((g) => g.id === 'a')).toMatchObject({ invitedAt: at, invitedVia: 'email' });
  expect(next.find((g) => g.id === 'b').invitedAt).toBeUndefined();
  expect(inviteRecipients(next).email.map((x) => x.id)).toEqual(['f']);
  expect(markInvited(G, [], 'email', at)).toBe(G);             // nothing sent: nothing rewritten
});

test('a text opens to that one guest, greeted by first name', () => {
  const href = smsHref({ name: 'Jordan Ellis', phone: '(410) 555-0102' }, 'You’re invited.\nTap to reply: https://x.test/r');
  expect(href.startsWith('sms:+?') || href.startsWith('sms:4105550102?')).toBe(true);
  expect(decodeURIComponent(href.split('body=')[1])).toBe('Hi Jordan, You’re invited.\nTap to reply: https://x.test/r');
});

test('the email subject is not said twice at the top of its own body', () => {
  const { subject, body } = inviteSubjectAndBody('You’re invited — Vida’s Friendsgiving\n\n🍂 Come eat with us\n\nTap to reply: https://x.test/r', 'You’re invited — Vida’s Friendsgiving');
  expect(subject).toBe('You’re invited — Vida’s Friendsgiving');
  expect(body).toBe('🍂 Come eat with us\n\nTap to reply: https://x.test/r');
  // a host who rewrote the top line keeps every word they wrote
  expect(inviteSubjectAndBody('Hey all!\n\nCome by.', 'You’re invited — X').body).toBe('Hey all!\n\nCome by.');
});

// Owner, 11/19/2026: "Host needs to be able to send both email and text to
// individual guests." Beside the batch, every guest who has not declined is
// listed with each way they can be reached, so the host can email one, text
// one, or both, and see how each was already invited.

test('each guest is listed with every way they can be reached, and how they were invited', () => {
  const rows = inviteContacts(G);
  expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'd', 'e', 'f', 'g']);   // Sam declined
  const maya = rows.find((r) => r.id === 'a');
  expect(maya).toMatchObject({ email: 'maya@example.test', phone: '4105550101' });   // both: both offered
  expect(rows.find((r) => r.id === 'b')).toMatchObject({ email: '', phone: '4105550102' });
  expect(rows.find((r) => r.id === 'd')).toMatchObject({ email: '', phone: '' });     // nothing usable
  expect(rows.find((r) => r.id === 'e').invitedVia).toBe('email');
});

test('sending one way and then the other keeps both on the guest', () => {
  const at1 = '2026-11-19T15:00:00.000Z'; const at2 = '2026-11-19T15:05:00.000Z';
  let next = markInvited(G, [{ id: 'a' }], 'email', at1);
  next = markInvited(next, [{ id: 'a' }], 'text', at2);
  const maya = next.find((g) => g.id === 'a');
  expect(maya.invitedVia).toBe('email+text');
  expect(maya.invitedAt).toBe(at1);                          // the first invite stays the first
  expect(inviteContacts(next).find((r) => r.id === 'a').invitedVia).toBe('email+text');
});
