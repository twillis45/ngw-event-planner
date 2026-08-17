// ─── WHY A MONEY DEADLINE DOES NOT REASON AS "MONEY" ────────────────────────
//
// This file records a fix that was PROPOSED, BUILT AND REVERTED on 2026-08-17,
// so the next person does not spend the same hour on it.
//
// THE OBSERVATION that started it: a money deadline renders `data-reason="time"`
// ("due in 4 days"), not money. actionReason's MONEY branch sits at priority 2,
// above `time` at 3, and needs `route.moneyKey`, which this raiser does not set.
// Attaching it looks like a one-field win.
//
// IT BUYS NOTHING AND IT CAN LIE. Measured, both halves:
//
//   1. The titles already state the deadline, so `addsBeyondTitle` correctly
//      drops a reason that merely repeats it:
//
//        installment  title "Next payment due in 4 days"     reason null
//        headcount    title "Final headcount due in 4 days"  reason null
//        refund       title "Refund window closes in 4 days" reason "due in 4 days"
//
//      With moneyKey attached, `installment` still measured null — the money
//      text "payment due in 4 days" is a subset of its own title. A bare row is
//      the honest default here, not a gap.
//
//   2. Only ONE of the three kinds is a payment. `refund` is a deadline to
//      CANCEL by; `headcount` is a number. Keying those would put "payment due
//      in 4 days" on a row where no payment is owed.
//
// So the raiser stays without `moneyKey`, and this file asserts the behavior
// that makes that correct — not the change, which no longer exists.
import { raiseAll } from '../surfaceRegistry';
import { getActionReason } from '../actionReason';
import { moneyDatesFor } from '../moneyDates';

const isoIn = (days) => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const EV = (moneyDates) => ({
  id: 'ev-md', type: 'Family Reunion', date: isoIn(40),
  venue: 'The Lodge', guestMode: 'count', guestCount: 30, totalBudget: 8000,
  frontedAmount: 1800, moneyDates,
});

const KINDS = [
  ['refund', { refundDeadline: isoIn(4) }],
  ['installment', { installmentDue: isoIn(4) }],
  ['headcount', { headcountDue: isoIn(4) }],
];

const mdRaise = (event) => raiseAll(event).find((r) => r.surface === 'money-dates');
const reasonFor = (event) => {
  const a = mdRaise(event);
  if (!a) return null;
  return getActionReason(a, { event, moneyRows: (moneyDatesFor(event) || {}).rows || null });
};

describe('a money deadline reasons honestly, or stays quiet', () => {
  test('PREMISE — every row kind really produces a raise with a title', () => {
    for (const [name, md] of KINDS) {
      const a = mdRaise(EV(md));
      expect(a).toBeTruthy();
      expect(a.title).toMatch(/in 4 days/);
      expect(name).toBeTruthy();
    }
  });

  test('NO KIND EVER CLAIMS A PAYMENT THAT IS NOT OWED', () => {
    // The assertion that matters. A refund window is a deadline to cancel by and
    // a headcount is a number; neither is a bill. If someone attaches moneyKey to
    // all three to "promote" them, this fails.
    for (const [name, md] of KINDS) {
      const r = reasonFor(EV(md));
      if (r && name !== 'installment') expect(r.text).not.toMatch(/payment/i);
    }
  });

  test('a reason never merely repeats its own title', () => {
    // Why attaching moneyKey is inert: the titles already carry the deadline, so
    // the dedup drops anything that restates it.
    for (const [, md] of KINDS) {
      const a = mdRaise(EV(md));
      const r = reasonFor(EV(md));
      if (!r) continue;
      const title = a.title.toLowerCase();
      // `length > 2`, mirroring actionReason's own addsBeyondTitle. Written as
      // `> 3` first, which failed on the refund row: its reason adds exactly
      // "due" — three characters — so a stricter filter than the code's own
      // called correct behavior a violation.
      const words = r.text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      expect(words.some((w) => !title.includes(w))).toBe(true);
    }
  });

  test('a bare row is the honest default, not a gap', () => {
    // installment and headcount say everything in the title. Recorded as an
    // assertion so a future "every row must have a reason" rule has to argue
    // with a measurement rather than an impression.
    expect(reasonFor(EV({ installmentDue: isoIn(4) }))).toBeNull();
    expect(reasonFor(EV({ headcountDue: isoIn(4) }))).toBeNull();
  });

  test('and every kind carries dueInDays, so nearness reaches the ranker', () => {
    // The fix that WAS real, from the same session — without it these rows had
    // no reason at all and could not rank by nearness.
    for (const [, md] of KINDS) {
      expect(mdRaise(EV(md)).dueInDays).toBe(4);
    }
  });
});
