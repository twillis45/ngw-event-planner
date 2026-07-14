// C3 — 'Pending' IS NOT A REPLY.
//
// guestCountResolved decided whether the guest count was FINAL, and it counted a
// guest as still-pending only if rsvp was 'maybe' or '' — an explicit two-value
// allow-list. But 'Pending' is the exact string the app's OWN importer writes:
// csvParsers maps blank / "no response" / "awaiting" / "invited" → 'Pending' for
// every supported platform.
//
// So a host could import a roster nobody had answered, and the count read RESOLVED
// → the Guests area went green ✓ → which helped satisfy `allProgDone` → which
// printed "You're all set for {event}. Everything that needs you is done."
//
// Eighty people had never been asked.
//
// attendanceBand always had this right (anything unrecognised falls to `pending`).
// Both now read ONE vocabulary: rsvpState().

import { guestCountResolved, attendanceBand, rsvpState, rsvpIsSettled } from '../playbooks';

const roster = (rsvps) => ({
  id: 'e-c3', type: 'Retirement Party', date: '2026-09-01',
  guestMode: 'list',
  guests: rsvps.map((r, i) => ({ id: `g${i}`, name: `Guest ${i}`, rsvp: r })),
});

test('rsvpState: anything that is not an explicit yes/no is still outstanding', () => {
  expect(rsvpState({ rsvp: 'Yes' })).toBe('yes');
  expect(rsvpState({ rsvp: 'attending' })).toBe('yes');
  expect(rsvpState({ rsvp: 'No' })).toBe('no');
  expect(rsvpState({ rsvp: 'declined' })).toBe('no');
  expect(rsvpState({ rsvp: 'Maybe' })).toBe('maybe');
  expect(rsvpState({ rsvp: 'Pending' })).toBe('pending');   // ← the value the app writes
  expect(rsvpState({ rsvp: '' })).toBe('pending');
  expect(rsvpState({ rsvp: 'no response' })).toBe('pending');
  expect(rsvpState({})).toBe('pending');

  expect(rsvpIsSettled({ rsvp: 'Pending' })).toBe(false);
  expect(rsvpIsSettled({ rsvp: 'Maybe' })).toBe(false);
  expect(rsvpIsSettled({ rsvp: 'Yes' })).toBe(true);
  expect(rsvpIsSettled({ rsvp: 'No' })).toBe(true);
});

// THE REGRESSION. This is the imported-roster case, verbatim.
test('an imported roster of "Pending" guests is NOT a resolved count', () => {
  const ev = roster(Array(80).fill('Pending'));   // 80 people, nobody has replied
  const gc = guestCountResolved(ev);

  expect(gc.resolved).toBe(false);                // was TRUE — the bug
  expect(gc.pending).toBe(80);
  expect(gc.reason).toBe('pending-rsvps');
});

test('blank and Maybe still count as outstanding (the old allow-list was not wrong, just incomplete)', () => {
  const ev = roster(['Yes', 'Yes', '', 'Maybe']);
  const gc = guestCountResolved(ev);
  expect(gc.resolved).toBe(false);
  expect(gc.pending).toBe(2);
});

test('a DECLINE is an answer — it does not hold the count open', () => {
  const ev = roster(['Yes', 'Yes', 'No', 'declined']);
  const gc = guestCountResolved(ev);
  expect(gc.resolved).toBe(true);                 // everyone answered; the count is real
  expect(gc.pending).toBe(0);
});

test('the count resolves once everyone has actually answered', () => {
  const ev = roster(['Yes', 'No', 'Yes']);
  expect(guestCountResolved(ev).resolved).toBe(true);
});

test('attendanceBand and guestCountResolved cannot disagree about "Pending" any more', () => {
  const ev = roster(['Yes', 'Pending', 'Pending']);
  const band = attendanceBand(ev);
  const gc = guestCountResolved(ev);

  expect(band.pending).toBe(2);          // attendanceBand always knew
  expect(gc.pending).toBe(2);            // now guestCountResolved agrees
  expect(gc.resolved).toBe(false);
  expect(band.because).toMatch(/2 replies still out/);
});
