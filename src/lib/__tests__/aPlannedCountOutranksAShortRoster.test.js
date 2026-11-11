// Stage-4 P1 finding N1 (11/11/2026, 390px): a ROSTER event with 40 planned
// guests and 6 named guests read 40 on the Board, "likely 2–5 on the day" on
// Guests, "sized for 2–5 guests" on Money, and "Sized for 40 guests" in Ask.
//
// The rule is sizingGuests' own: "An explicit estimate that EXCEEDS a roster
// still wins (the host told us to expect more)." So the size of the event is
// the planned 40 until the roster catches up to it; the reply band (2–5) is a
// reply status, never the size. sizingRange is the one label every "sized
// for" surface reads, so it must say what sizingGuests sizes to.
import { attendanceBand, attendanceBandLabel, sizingGuests, sizingRange, eventSizing, playbookFoodPlan } from '../playbooks';

const sixNamed = [
  { id: 'a', name: 'Ana', rsvp: 'Yes' }, { id: 'b', name: 'Ben', rsvp: 'Yes' },
  { id: 'c', name: 'Cy', rsvp: 'No' }, { id: 'd', name: 'Di', rsvp: 'Maybe' },
  { id: 'e', name: 'Ed', rsvp: '' }, { id: 'f', name: 'Flo', rsvp: 'Pending' },
];
const base = { id: 'n1', type: 'birthday', date: '2026-12-20', guestCount: 40 };

describe('a planned count outranks a short roster (N1)', () => {
  test('roster mode, 40 planned, 6 named: sized for 40, not for the replies', () => {
    const ev = { ...base, guests: sixNamed };
    // The reply status is unchanged — it is still true that 2–5 have a live answer.
    expect(attendanceBandLabel(attendanceBand(ev))).toBe('2–5');
    expect(sizingGuests(ev)).toBe(40);
    const sr = sizingRange(ev);
    expect(sr).toMatchObject({ label: '40', low: 40, high: 40, spread: false, plannedOverRoster: true });
    // No reply-grounded floor exists under a number nobody has replied to.
    expect(eventSizing(ev).floor).toBe(40);
    const fp = playbookFoodPlan(ev);
    expect(fp.guests).toBe(40);
    expect(fp.bandLow).toBe(40);
  });

  test('roster caught up to the plan: the reply band is the size', () => {
    // 45 named, 5 declined: everyone who hasn't said no (40) now covers the plan.
    const guests = Array.from({ length: 45 }, (_, i) => ({ id: 'g' + i, name: 'G' + i, rsvp: i < 25 ? 'Yes' : i < 30 ? 'No' : '' }));
    const ev = { ...base, guests };
    const band = attendanceBand(ev);
    const sr = sizingRange(ev);
    expect(sr.plannedOverRoster).toBe(false);
    expect(sr.label).toBe(attendanceBandLabel(band));
    expect(sr.label).toBe('25–40');
    expect(sr.high).toBe(sizingGuests(ev));
  });

  test('count mode: the attendance-shift band is the size, unchanged', () => {
    const ev = { ...base, guestMode: 'count', guests: sixNamed };
    const band = attendanceBand(ev);
    const sr = sizingRange(ev);
    expect(sr.plannedOverRoster).toBe(false);
    expect(sr.spread).toBe(true);
    expect(sr.label).toBe(attendanceBandLabel(band));
    expect(sr.high).toBe(sizingGuests(ev));
  });

  test('no headcount signal at all: nothing to say', () => {
    expect(sizingRange({ id: 'z', type: 'birthday' })).toBeNull();
    expect(sizingRange(null)).toBeNull();
  });

  test('every roster case: the label\'s top is what the plan buys for', () => {
    for (const n of [1, 5, 6, 7, 40]) {
      const ev = { ...base, guestCount: n, guests: sixNamed };
      expect(sizingRange(ev).high).toBe(sizingGuests(ev));
    }
  });
});
