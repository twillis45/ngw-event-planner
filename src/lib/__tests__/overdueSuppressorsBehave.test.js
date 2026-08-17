// ─── THE FOUR THINGS THAT MAKE A LATE TASK NOT LATE ─────────────────────────
//
// The Over time re-score named the missing piece exactly: the overdue class had
// a TEXTUAL gate (overduePolicyFork — no consumer may derive an overdue state
// from the display bucket) and no BEHAVIOURAL one. Its words: "a guard that
// hostv2's overdue comes from taskIsOverdue ... behavioural (drive a snoozed and
// an unreachable task), not textual."
//
// `taskIsOverdue` is THE overdue policy, and it suppresses on four grounds:
//
//   1. task.done            an explicit checkoff
//   2. effectiveDone        the event's own state proves it handled (booked
//                           venue, paid balance) even if unticked
//   3. snoozedUntil         the host set it aside until a date
//   4. taskWasReachable     the event was created too late to ever hit the lead
//
// Coverage before this file, measured: `leadTimesAreReal` covers 1 and 4 and the
// timing arithmetic. **Nothing anywhere asserted 2 or 3.** snooze.test.js covers
// the snooze MODULE (a raise hides, a raise returns) and never asks
// `taskIsOverdue` about a snoozed task.
//
// Those two are the ones with direct host consequence. A snooze that does not
// suppress overdue is not a snooze — the host sets something aside and the app
// keeps calling it late. And a task the event already proves handled, still
// shouting, is the app arguing with its own data.
import { taskIsOverdue } from '../taskLead';
import { effectiveDone } from '../taskEngine';

const inDays = (n) => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// A T-5d task on an event 2 days out is genuinely late — leadTimesAreReal proves
// this exact pair fires. Every suppressor below is measured against it, so a
// `false` can only come from the suppressor under test.
const LATE_TASK = () => ({ id: 't1', task: 'Pre-order the crabs', leadDays: -5, done: false });
const EV = (over = {}) => ({ id: 'ev-sup', type: 'Crab Feast', date: inDays(2), ...over });

describe('the overdue policy suppresses for the right reasons', () => {
  test('PREMISE — the fixture is genuinely overdue with nothing suppressing it', () => {
    // Without this every assertion below could pass because the task was never
    // late in the first place. This is the check the whole file rests on.
    expect(taskIsOverdue(LATE_TASK(), EV())).toBe(true);
  });

  test('1 — a done task is not overdue', () => {
    expect(taskIsOverdue({ ...LATE_TASK(), done: true }, EV())).toBe(false);
  });

  test('3 — A SNOOZED TASK IS NOT OVERDUE (was untested)', () => {
    // The point of a snooze. Without this, "set aside until Friday" and "you are
    // late" render at the same time and the feature is decorative.
    const snoozed = { ...LATE_TASK(), snoozedUntil: inDays(5) };
    expect(taskIsOverdue(snoozed, EV())).toBe(false);
  });

  test('3b — and it comes BACK when the snooze date has passed', () => {
    // The other half: a snooze must expire on its own. A suppressor that never
    // lifts is a delete, and the host was promised a return.
    const expired = { ...LATE_TASK(), snoozedUntil: inDays(-1) };
    expect(taskIsOverdue(expired, EV())).toBe(true);
  });

  test('2 — a task the EVENT proves handled is not overdue, even unticked', () => {
    // effectiveDone folds the event's own state in. Asserted through the real
    // predicate rather than a hand-built flag, so this cannot pass on a fixture
    // that merely looks satisfied.
    // Written with an if/else fallback first, which would have passed on the
    // trivial branch without saying so. Measured instead: effectiveDone really
    // does fire for this pair (true booked / false unbooked), so both halves are
    // asserted outright and a regression in the inference shows up here.
    const task = { id: 't2', task: 'Book the venue', leadDays: -5, done: false };
    const handled = EV({ venue: 'The Ironwood Room', venueBooked: true });
    const unhandled = EV();

    expect(effectiveDone(handled, task)).toBe(true);
    expect(effectiveDone(unhandled, task)).toBe(false);
    expect(taskIsOverdue(task, handled)).toBe(false);      // proven handled
    expect(taskIsOverdue(task, unhandled)).toBe(true);     // control: still late
  });

  test('4 — a host who booked LATE is not blamed for a window they never had', () => {
    // Reachability. Covered by leadTimesAreReal too; kept here so all four
    // suppressors read in one place as the policy they are.
    // Was `expect(typeof ...).toBe('boolean')`, which is vacuous — it passes for
    // every possible answer. Real arithmetic instead: taskWasReachable compares
    // (runway at creation + lead). Created 1 day ago with the event 2 days out,
    // the runway was 3 days against a T-5d lead: 3 + (-5) < 0, never reachable.
    const lateBooking = EV({ createdAt: inDays(-1) });
    expect(taskIsOverdue(LATE_TASK(), lateBooking)).toBe(false);

    // And a host who HAD the runway is still told — otherwise this suppressor
    // would excuse everyone and the overdue state would be unreachable itself.
    const earlyBooking = EV({ createdAt: inDays(-30) });
    expect(taskIsOverdue(LATE_TASK(), earlyBooking)).toBe(true);
  });

  test('a reader crash never invents an overdue', () => {
    // taskLead:161 catches around effectiveDone precisely because callers pass
    // synthetic events. Junk must answer, not throw, and must not answer "late".
    expect(() => taskIsOverdue(LATE_TASK(), null)).not.toThrow();
    expect(taskIsOverdue(null, EV())).toBe(false);
    expect(taskIsOverdue(undefined, undefined)).toBe(false);
  });
});
