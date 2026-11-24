// Owner, 11/24/2026 (follow-on item 4): "Invite your guest list (N)" must never
// re-invite a guest the host marked "I sent it myself". One rule for who has been
// invited: the batch's `invitedAt`, or the host's told record (lib/guestTold,
// recordTold) — the same rule the nudge reads (replyNudge.wasInvited).
import { inviteRecipients } from '../inviteBatch';
import { recordTold } from '../guestTold';
import { wasInvited } from '../replyNudge';

const G = [
  { id: 'a', name: 'Maya Chen', email: 'maya@example.test' },
  { id: 'b', name: 'Jordan Fox', phone: '410-555-0102' },
  { id: 'c', name: 'Rae Kim', email: 'rae@example.test' },
];

test('a guest marked told is not in the email list or the text queue', () => {
  let told = recordTold({}, 'a', 'message', '2026-11-20T10:00:00Z');
  told = recordTold(told, 'b', 'sms', '2026-11-20T10:00:00Z');
  const r = inviteRecipients(G, told);
  expect(r.email.map((x) => x.id)).toEqual(['c']);
  expect(r.text).toEqual([]);
  expect(r.alreadyInvited).toBe(2);
});

test('the count on the button agrees with the nudge rule (one rule)', () => {
  const told = recordTold({}, 'c', 'message', '2026-11-20T10:00:00Z');
  const event = { guests: G, guestTold: told };
  const r = inviteRecipients(event.guests, event.guestTold);
  const listed = new Set([...r.email, ...r.text].map((x) => x.id));
  for (const g of G) expect(listed.has(g.id)).toBe(!wasInvited(event, g));
});

test('no told map reads as nobody told', () => {
  expect(inviteRecipients(G).email.length + inviteRecipients(G).text.length).toBe(3);
  expect(inviteRecipients(G, null).alreadyInvited).toBe(0);
});

// A text greets a guest by what she calls them (owner, 11/24/2026): "Hi Aunt
// Rosa," never "Hi Aunt,".
import { greetingName, smsHref } from '../inviteBatch';
test('a family title stays with the name it belongs to', () => {
  expect(greetingName('Aunt Rosa')).toBe('Aunt Rosa');
  expect(greetingName('Linda Reyes')).toBe('Linda');
  expect(greetingName('Aunt')).toBe('Aunt');
  expect(decodeURIComponent(smsHref({ name: 'Aunt Rosa', phone: '614-555-0142' }, 'Come.').split('body=')[1])).toBe('Hi Aunt Rosa, Come.');
});
