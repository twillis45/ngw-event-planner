// Three places the app spoke FOR the host, to the host's guests.
//
// The invite is the one surface a stranger judges you by. It must not put words in the
// host's mouth, and a task about chasing people must not retire itself.

import { rsvpDeadlineFor } from '../dates';
import { taskSatisfied } from '../taskEngine';

const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

describe('a reply-by date the host never set is not the host\'s word', () => {
  // rsvpDeadlineFor returns `source:'derived'` with `hard:true` for an invented
  // event.date − 7d. The invite never read `.source`, so a fabricated deadline printed
  // identically to one the host actually chose, and a guest was shown a date nobody
  // committed to. The engine still OFFERS the derived date (it prefills the host's own
  // field, which is fine) — it just labels it honestly, and InviteV2 now renders only
  // `source === 'override'`.
  test('an unset deadline is marked derived, never as the host\'s own', () => {
    const d = rsvpDeadlineFor({ date: iso(30) });
    expect(d.source).toBe('derived');
  });

  test('a host-set deadline is marked as an override — the only kind a guest may be shown', () => {
    const d = rsvpDeadlineFor({ date: iso(30), rsvpDeadline: iso(14) });
    expect(d.source).toBe('override');
    expect(d.iso).toBe(iso(14));
  });

  test('the deadline carries its OWN days, not the event\'s', () => {
    // The invite gated on days-to-EVENT rather than days-to-DEADLINE, so a reply-by date
    // that had already lapsed kept rendering as live urgency. `rsvpBy.days` was computed
    // and never used. It has to be a real, separate number for the fix to work.
    const d = rsvpDeadlineFor({ date: iso(30), rsvpDeadline: iso(-2) });
    expect(d.days).toBeLessThan(0);       // the deadline has passed...
    expect(d.iso).toBe(iso(-2));          // ...while the event is still 30 days out
  });
});

describe('chasing is done when nobody is left to chase', () => {
  const ev = (guests, over = {}) => ({
    id: 'e', type: 'Crab Feast', date: iso(20), guests, guestMode: 'roster', ...over,
  });
  const chase = { task: 'Chase non-responders; lock the count', done: false };

  test('THE REGRESSION: one reply out of forty does NOT retire the chase', () => {
    const guests = [{ name: 'A', rsvp: 'Yes' }, ...Array.from({ length: 39 }, (_, i) => ({ name: 'g' + i, rsvp: 'Pending' }))];
    expect(taskSatisfied(ev(guests), chase)).toBe(false);
  });

  test('it IS done once everyone has answered — yes or no', () => {
    const guests = [{ name: 'A', rsvp: 'Yes' }, { name: 'B', rsvp: 'No' }, { name: 'C', rsvp: 'Yes' }];
    expect(taskSatisfied(ev(guests), chase)).toBe(true);
  });

  test('an empty roster is not a finished chase', () => {
    expect(taskSatisfied(ev([]), chase)).toBe(false);
  });

  test('SENDING, though, IS evidenced by a single reply — you cannot reply to an invite you never got', () => {
    const send = { task: 'Send the invitations', done: false };
    const guests = [{ name: 'A', rsvp: 'Yes' }, { name: 'B', rsvp: 'Pending' }];
    expect(taskSatisfied(ev(guests), send)).toBe(true);
  });
});
