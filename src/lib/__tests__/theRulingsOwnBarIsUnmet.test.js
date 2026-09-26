// ─── THE 2026-08-17 RULING'S BAR FOR DONE IS NOW MET ─────────────────────────
//
// THIS FILE USED TO RECORD A FAILURE. From 2026-09-19 to 2026-09-23 it asserted,
// as a measured fact, that the Ranking floor ruling's own bar was unmet on the
// shipping path: a dead certificate 27 days late (4.90) outranked a vendor
// reconfirm whose window closed in three days (0.00), which was the ruling's own
// re-derived case, and it did not invert.
//
// It was written to fail the moment anyone implemented the missing axis — "so
// whoever adds it is forced through the packet rather than past it." That is
// what happened on 2026-09-23. The file now records the decision instead, and
// keeps every negative control it had, because those are what prove the fix did
// not buy the first direction by selling the second.
//
// ── WHAT WAS MISSING, AND WHY IT WAS NOT A TUNING PROBLEM ───────────────────
//
// `latenessBoost` pays for being PAST a window. Nothing paid for a window ABOUT
// TO CLOSE AND NOT REOPEN — the half of Rafanelli's ruling sentence that was
// never implemented:
//
//   "A certificate 29 days late is a known, chronic problem the host has
//    probably already worked around. A vendor reconfirm due tomorrow closes a
//    window that will not reopen. RANK THE CLOSING WINDOW."
//
// Every retuning candidate was measured and every one failed: option A alone
// (2.00) still lost to 4.90, and dropping the lateness floor bought the
// inversion only by breaking FOUR ruled guards — each of which IS the ruling's
// other direction. The model was missing a term.
//
// ── THE DECISION (2026-09-23, owner's standing delegation) ──────────────────
//
// Packet option 2 — add the axis — with the packet's own objection to it fixed
// rather than overridden. That objection was real:
//
//   "The predicate as written is a DATE window, not a closing-window predicate;
//    it does not know the difference between 'this cannot be done later' and
//    'this happens to be due soon.'"
//
// A trial `leadDays === 0 && 0 <= dueInDays <= 3` turned this file's own
// negative control red, because a synthetic scheduled gate-holder sits in the
// same date window. So the term is paid on a DECLARED `closingWindow`, not an
// inferred one: a raise knows whether its window reopens, and the scorer cannot
// see that from two dates. The synthetic gate-holder declares nothing and is
// untouched — the control below still passes on its own terms.
//
// See docs/audits/2026-09-23_CLOSING_WINDOW_RULING.md.
import { eventPlan, actionConsequence, latenessBoost } from '../../CommandCenter';
import { SURFACES } from '../surfaceRegistry';
import { addDaysISO } from '../dateChips';

// LOCAL calendar days, never toISOString(). The engine under test is local
// throughout (`dates.getToday` uses setHours(0,0,0,0)), so a UTC-derived
// fixture date is off by one whenever the two calendars disagree — 8pm to
// midnight Eastern, and all day in most of the eastern hemisphere. This suite
// failed exactly there and nowhere else. Reproduce with TZ=Pacific/Midway.
const iso = (d) => addDaysISO(null, d);
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

  test('THE BAR: the re-derived case now inverts', () => {
    const coi = find(/insurance/i);
    const reconfirm = find(/Reconfirm/i);
    expect(reconfirm.total).toBeGreaterThan(coi.total);
    expect(reconfirm.rank).toBeLessThan(coi.rank);
    // The exact numbers, so a change to either side fails here and says so —
    // the same pinning this file did when it recorded the failure.
    expect(`reconfirm ${reconfirm.total.toFixed(2)} / coi ${coi.total.toFixed(2)}`)
      .toBe('reconfirm 5.50 / coi 4.90');
  });

  test('WHY IT NOW SCORES: the raise declares the window it has always known', () => {
    // The gap was never the dates — the raise emitted both of them all along.
    // It emitted no CONSEQUENCE, so actionConsequence returned 0.
    const raise = (SURFACES || []).find((s) => s && s.id === 'vendor-reconfirm');
    expect(raise).toBeTruthy();
    const emitted = raise.raise(EV())[0];
    expect(emitted.dueInDays).toBe(3);
    expect(emitted.leadDays).toBe(0);
    // Declared, not inferred. This is the whole design.
    expect(emitted.closingWindow).toBe(true);
    expect(emitted.gateHolder).toBe(true);
    expect(emitted.unlocks).toBe(0);
    // 2 (gate-holder) + 0 (unlocks) + 3.5 (closing window) = 5.50
    expect(find(/Reconfirm/i).c).toBeCloseTo(5.5, 5);
  });

  test('IT IS DECLARED, NOT A DATE WINDOW — the packet’s own objection, answered', () => {
    // A date predicate would have swept up every ordinary day-of chore sitting
    // in the same window. "Buy day-of emergency kit" is due TODAY, leadDays 0,
    // and declares nothing — so it earns nothing. If this ever changes, the
    // term has stopped being a closing-window term and become a due-soon term.
    const kit = find(/emergency kit/i);
    expect(kit).toBeTruthy();
    expect(kit.due).toBe(0);
    expect(kit.c).toBe(0);
  });

  test('the term is bounded BELOW the lateness floor, on purpose', () => {
    // 3.5 against a floor of 4. A closing window that declares nothing else
    // still loses to a genuinely late item — the ruling's other direction, held
    // by arithmetic rather than by hope.
    const closingOnly = { dueInDays: 2, leadDays: 0, closingWindow: true };
    const barelyLate = { dueInDays: -1, leadDays: 0 };
    expect(actionConsequence(closingOnly)).toBeCloseTo(3.5, 5);
    expect(actionConsequence(barelyLate) + latenessBoost(barelyLate))
      .toBeGreaterThan(actionConsequence(closingOnly) + latenessBoost(closingOnly));
  });

  test('and it only pays while the window is ACTUALLY closing', () => {
    // Declared but far out earns nothing — a reconfirm-shaped row 40 days away
    // is an ordinary scheduled row. Past due, the lateness term takes over and
    // this one stops, so the two never stack.
    expect(actionConsequence({ dueInDays: 40, leadDays: 0, closingWindow: true })).toBe(0);
    expect(actionConsequence({ dueInDays: -1, leadDays: 0, closingWindow: true })).toBe(0);
    expect(actionConsequence({ dueInDays: 7, leadDays: 0, closingWindow: true })).toBeCloseTo(3.5, 5);
  });

  test('NEGATIVE CONTROL: the ruling’s OTHER direction still holds', () => {
    // "a late critical item still outranks a scheduled one of higher raw
    // consequence." This is the control the date-predicate trial turned red —
    // the synthetic gate-holder sits at dueInDays 3, leadDays 0, in the same
    // window, and declares no closing window. It must stay untouched.
    const lateTrifle = { dueInDays: -6, leadDays: 0 };
    const scheduledGate = { dueInDays: 3, leadDays: 0, gateHolder: true, unlocks: 2 };
    expect(actionConsequence(scheduledGate)).toBe(4);          // NOT 7.5
    expect(actionConsequence(lateTrifle) + latenessBoost(lateTrifle))
      .toBeGreaterThan(actionConsequence(scheduledGate) + latenessBoost(scheduledGate));
  });

  test('NEGATIVE CONTROL: the lateness constants the ruling fixed did NOT move', () => {
    // The whole argument for adding a term rather than retuning is that the
    // retunes broke four ruled guards. If this fix quietly moved a lateness
    // constant after all, it bought the bar the way the packet said it must not.
    const barelyLate = { dueInDays: -1, leadDays: 0 };
    const veryLate = { dueInDays: -365, leadDays: 0 };
    expect(latenessBoost(barelyLate)).toBeCloseTo(4 + (1 / 14) * 0.9, 5);  // floor 4
    expect(latenessBoost(veryLate)).toBeCloseTo(4.9, 5);                    // ceiling 4.9
    expect(latenessBoost({ dueInDays: 1, leadDays: 0 })).toBe(0);           // not late, no boost
  });

  test('NEGATIVE CONTROL: the late certificate is still VISIBLE as late', () => {
    // Both the Liability & Trust Reviewer and "Grandmother" ruled that whatever
    // moves down must still read as late. Demotion is not permission to stop
    // saying so — it is rank 5 now, and it still carries its own lateness.
    const coi = find(/insurance/i);
    expect(coi).toBeTruthy();
    expect(coi.due).toBeLessThan(0);
    expect(latenessBoost({ dueInDays: coi.due, leadDays: 0 })).toBeCloseTo(4.9, 1);
  });
});
