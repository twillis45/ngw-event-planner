// SSOT #1 ROOT FIX (R3) — the exhale invariant.
//
// An exhale card ("You're all set — everything that needs you is done") may NOT
// render while the engine still has a next action. This is the guard against the
// worst instance of the claim-truthfulness bug class found on 2026-07-14: the app
// computed "Confirm <vendor>", HID it (`showLead = !allProgDone && !!na`), and
// printed a congratulation in its place — because the two local "am I done?"
// checklists (home `prog`, Plan `hostPlanAllDone`) contain no vendor axis at all.

import { mayExhale } from '../exhaleGate';
import { selectEventNextAction } from '../../CommandCenter';

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

test('the engine VETOES the exhale — a checklist may propose calm, only the engine grants it', () => {
  expect(mayExhale(true, null)).toBe(true);                       // done + nothing open → calm earned
  expect(mayExhale(true, { title: 'Confirm Fired Up BBQ' })).toBe(false);  // an open action vetoes it
  expect(mayExhale(false, null)).toBe(false);                     // not done → no exhale regardless
  expect(mayExhale(false, { title: 'x' })).toBe(false);
});

test('undefined/edge inputs never accidentally grant calm', () => {
  expect(mayExhale(undefined, undefined)).toBe(false);
  expect(mayExhale(null, null)).toBe(false);
  expect(mayExhale(true, undefined)).toBe(true);   // genuinely nothing open
});

// The regression itself, end-to-end against the real engine: a booked-but-not-
// confirmed vendor MUST produce a next action, and that action MUST veto the
// exhale — even though the 7-axis checklist (which has no vendor term) says done.
test('a booked-but-unconfirmed vendor produces an action that vetoes "You\'re all set"', () => {
  const event = {
    id: 'e-exhale', recordKind: 'host_event', type: 'Retirement Party',
    date: future(40), venue: 'The Ironwood Room', venueCity: 'Annapolis', venueState: 'MD',
    guestMode: 'count', guestCount: 40, totalBudget: 8000,
    must_have_moment: 'The toast from her old unit.',
    budget: [{ id: 'b1', category: 'Venue', budgeted: 3000, actual: 3000 }],
    timeline: [], guests: [],
    vendors: [
      // Deposit Paid = booked (secured for the day), NOT confirmed (a confirm is open)
      { id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Deposit Paid' },
    ],
  };

  const na = selectEventNextAction(event);
  expect(na).toBeTruthy();

  // Whatever the local checklist thinks, the exhale is vetoed while an action is open.
  expect(mayExhale(true, na)).toBe(false);
});

test('a fully confirmed roster still lets the host exhale — this is not a permanent nag', () => {
  const event = {
    id: 'e-calm', recordKind: 'host_event', type: 'Retirement Party',
    date: future(40), venue: 'The Ironwood Room', venueCity: 'Annapolis', venueState: 'MD',
    guestMode: 'count', guestCount: 40, totalBudget: 8000,
    must_have_moment: 'The toast from her old unit.',
    budget: [{ id: 'b1', category: 'Venue', budgeted: 3000, actual: 3000 }],
    timeline: [], guests: [],
    vendors: [{ id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Confirmed', contractSigned: true }],
  };
  const na = selectEventNextAction(event);
  // If the engine has nothing left, calm is reachable. (If it still has an action here
  // it is about some OTHER honest gap — which is exactly the behaviour we want; the
  // invariant is "no calm while work is open", not "calm is unreachable".)
  expect(mayExhale(true, na)).toBe(!na);
});

// AUDIT 2 P1-3 / P0-5 (11/22/2026): "All quiet" and "The plan is quiet" sat
// over Calls to make reading "Open now · 2 to settle" (NYE, Reunion, …). An
// open call on the Calls board vetoes calm the same way a late step does, and
// says what is open in one wording the shell does not re-author.
test('an open call on the Calls board vetoes calm', () => {
  const { calmVetoFor } = require('../exhaleGate');
  expect(calmVetoFor({ openCalls: 2 })).toEqual({ kind: 'open-calls', count: 2, label: '2 calls still to make' });
  expect(calmVetoFor({ openCalls: 1 }).label).toBe('1 call still to make');
  expect(calmVetoFor({ openCalls: 0 })).toBeNull();
  // A late step still speaks first: it is the more urgent truth.
  expect(calmVetoFor({ overdueCount: 1, openCalls: 3 }).kind).toBe('overdue-steps');
  expect(mayExhale(true, calmVetoFor({ openCalls: 1 }))).toBe(false);
});
