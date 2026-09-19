// ─── THE 2026-08-17 RULING'S BAR FOR DONE IS NOT MET ON THE SHIPPING PATH ────
//
// THIS FILE CHANGES NOTHING. It records a measured fact about the ranking
// constants, the way deadlinesThatContradictTheirSource.test.js records one
// about the deadlines: "a FACT about them, not a change to them. If a future
// pass decides to move them, it should fail here first and say so."
//
// THE RULING (docs/audits/2026-08-17_RANKING_FLOOR_BOARD.md) closed with a bar:
//
//   "Bar for done: the re-derived case inverts (reconfirm above the dead COI),
//    AND a late critical item still outranks a scheduled one of higher raw
//    consequence. Both directions, or the fix is half a fix."
//
// The second direction holds. THE FIRST DOES NOT. MEASURED on a wedding three
// days out, everything booked, the shipping board:
//
//   3. Ask Ironwood about insurance.     c=0.00  l=4.90  tot=4.90  due=-27
//   6. Reconfirm Ironwood for the day    c=0.00  l=0.00  tot=0.00  due=+3
//
// That IS the ruling's own re-derived case — a dead certificate against a vendor
// reconfirm whose window closes — and it did not invert. The ruling's arithmetic
// assumed the reconfirm scored 7.0 ("gate-holder, unlocks 3, score 300"). The
// shipping `vendor-reconfirm` raise (surfaceRegistry.js#vendor-reconfirm) emits
// severity, title, why, route, key, dueInDays and leadDays — and NO consequence
// signal at all, so `actionConsequence` returns 0.00. The fix was calibrated
// against a row the corpus does not produce.
//
// AND IT CANNOT BE REACHED BY RETUNING. Measured, candidate by candidate:
//
//   A  gateHolder:true, unlocks:0 on the reconfirm   -> 2.00  still loses to 4.90
//   B  drop latenessBoost's floor 4 -> 2.5 / 1.5     -> breaks FOUR ruled guards
//   A+B at floor 1.5                                  -> 2.00 vs 2.40, still loses
//   A+B at floor 1.0                                  -> 2.00 vs 1.90, INVERTS —
//                                                        and breaks the same four
//
// The four, by name, and every one of them is the ruling's other direction:
//   · "both directions, or it is half a fix › a barely-late trivial item still
//      leads a scheduled gate-holder"
//   · "lateness is bounded BELOW a real gate › but a 6-day-late trifle STILL
//      outranks an ordinary scheduled gate-holder"
//   · "lateness is bounded BELOW a real gate › the boost ceiling sits in the gap
//      between those two gates"
//   · "rule 4 — ranked for consequence › genuine lateness still leads"
//
// SO THE MODEL IS MISSING A TERM, NOT MIS-TUNED. `latenessBoost` rewards being
// PAST a window. Nothing in the scoreboard rewards a window that is ABOUT TO
// CLOSE AND WILL NOT REOPEN — which is the thing the ruling's own event bench
// named in the sentence that decided its direction:
//
//   Rafanelli, ruling seat: "A certificate 29 days late is a known, chronic
//   problem the host has probably already worked around. A vendor reconfirm due
//   tomorrow closes a window that will not reopen. RANK THE CLOSING WINDOW."
//
// The lateness half of that sentence was implemented. The closing-window half
// was not, and a reconfirm at due=+3 with leadDays=0 scores zero on both axes.
//
// WHY THIS IS NOT FIXED HERE. Adding an axis to a boarded scoreboard is a board
// decision, and the sibling ruling that would be the obvious precedent
// (2026-08-17_VENDOR_CONSEQUENCE_RULING.md, which let the unbooked-vendor raise
// declare `gateHolder: true, unlocks: 0`) bounds itself in rule 3 to "required:
// true, past `when`, genuinely unmatched" — and a reconfirm vendor is BOOKED.
// Extending a ruling's scope is the board's to do, not this pass's.
import { eventPlan, actionConsequence, latenessBoost } from '../../CommandCenter';
import { SURFACES } from '../surfaceRegistry';

const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
// The ruling's own case, rebuilt: a plan three days out with its vendors booked,
// a stale certificate ask, and the reconfirm window open.
const EV = () => ({
  id: 'e', name: 'Probe', type: 'Wedding', date: iso(3),
  startTime: '3:00 PM', startTimeSource: 'host',
  guestMode: 'count', guestCount: 80, guests: [], totalBudget: 40000,
  venue: 'The Ironwood Room, Silver Spring, MD', venueCity: 'Silver Spring', state: 'MD',
  vendors: [
    { id: 'v1', name: 'Ironwood', category: 'Venue', status: 'Confirmed', cost: 12000 },
    { id: 'v2', name: 'Fired Up', category: 'Catering', status: 'Confirmed', cost: 9000 },
  ],
  budget: [{ category: 'Venue', budgeted: 12000 }],
});
const rows = () => (eventPlan(EV()).nextActions || []).map((a, i) => ({
  rank: i + 1,
  title: String(a.title || a.id || ''),
  total: actionConsequence(a) + latenessBoost(a),
  c: actionConsequence(a),
  due: a.dueInDays,
}));
const find = (re) => rows().find((r) => re.test(r.title));

describe('the ranking ruling’s bar for done, measured', () => {
  test('(premise) the ruling’s own two rows are both on this board', () => {
    // Without both, every assertion below is about a board that does not exist.
    expect(find(/insurance/i)).toBeTruthy();
    expect(find(/Reconfirm/i)).toBeTruthy();
  });

  test('THE FACT: the re-derived case still does not invert', () => {
    const coi = find(/insurance/i);
    const reconfirm = find(/Reconfirm/i);
    // The ruling asked for the reconfirm to lead. It does not, and by a margin
    // that no single constant closes.
    expect(coi.total).toBeGreaterThan(reconfirm.total);
    expect(coi.rank).toBeLessThan(reconfirm.rank);
    // The exact numbers, so a change to either side fails here and says so.
    expect(`coi ${coi.total.toFixed(2)} / reconfirm ${reconfirm.total.toFixed(2)}`)
      .toBe('coi 4.90 / reconfirm 0.00');
  });

  test('WHY: the reconfirm raise declares no consequence at all', () => {
    // The ruling's arithmetic assumed 7.0 for this row. The raise that produces
    // it emits no consequence field, so actionConsequence returns 0.
    expect(find(/Reconfirm/i).c).toBe(0);
    const raise = (SURFACES || []).find((s) => s && s.id === 'vendor-reconfirm');
    expect(raise).toBeTruthy();
    const emitted = raise.raise(EV())[0];
    expect(emitted).toBeTruthy();
    expect(emitted.gateHolder).toBeUndefined();
    expect(emitted.unlocks).toBeUndefined();
    expect(emitted.priorityScore).toBeUndefined();
    // …while it DOES know the window it is in, which is the signal nothing reads.
    expect(emitted.dueInDays).toBe(3);
    expect(emitted.leadDays).toBe(0);
  });

  test('the closing window scores zero on BOTH axes, which is the gap', () => {
    // latenessBoost pays for being PAST a window; a window about to close and
    // not reopen earns nothing from either term. That is the missing axis, and
    // naming it is the point of this file.
    const reconfirm = (eventPlan(EV()).nextActions || []).find((a) => /Reconfirm/i.test(a.title || ''));
    expect(latenessBoost(reconfirm)).toBe(0);
    expect(actionConsequence(reconfirm)).toBe(0);
    expect(reconfirm.dueInDays).toBeGreaterThan(0);   // not late — closing
    expect(reconfirm.leadDays).toBe(0);               // and it closes AT the event
  });

  test('NEGATIVE CONTROL: the ruling’s OTHER direction does hold', () => {
    // "a late critical item still outranks a scheduled one of higher raw
    // consequence." If this ever fails, the scoreboard has a second problem and
    // the one recorded above is no longer the whole story.
    const lateTrifle = { dueInDays: -6, leadDays: 0 };
    const scheduledGate = { dueInDays: 3, leadDays: 0, gateHolder: true, unlocks: 2 };
    expect(actionConsequence(lateTrifle) + latenessBoost(lateTrifle))
      .toBeGreaterThan(actionConsequence(scheduledGate) + latenessBoost(scheduledGate));
  });

  test('NEGATIVE CONTROL: nothing in this file changed a constant', () => {
    // A recording test that quietly retunes what it measures is worthless. The
    // two numbers the ruling fixed are asserted here so this file cannot become
    // the place a change hides.
    const barelyLate = { dueInDays: -1, leadDays: 0 };
    const veryLate = { dueInDays: -365, leadDays: 0 };
    expect(latenessBoost(barelyLate)).toBeCloseTo(4 + (1 / 14) * 0.9, 5);  // floor 4
    expect(latenessBoost(veryLate)).toBeCloseTo(4.9, 5);                    // ceiling 4.9
    expect(latenessBoost({ dueInDays: 1, leadDays: 0 })).toBe(0);           // not late, no boost
  });
});
