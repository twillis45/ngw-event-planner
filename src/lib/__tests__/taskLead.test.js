// ─── HONEST DUE LANGUAGE ────────────────────────────────────────────────────
//
// `taskDueLabel` turns a lead into a sentence a host reads. Its failure mode is
// not being wrong; it is being exactly right in a way that reads as a defect.
import { taskDueLabel } from '../taskLead';


describe('a window that closed before the host could reach it', () => {
  // Found in a marketing screenshot, which is a bad way to find copy that reads
  // as a bug: a wedding 85 days out showed "280 days past its window" on its
  // budget task. The arithmetic was right -- the playbook authors it at T-365
  // -- and the sentence was useless. Nobody plans a wedding 280 days late.
  const at = (days) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  test('a wedding inside a short runway is not told it is 280 days late', () => {
    const label = taskDueLabel({ leadDays: -365 }, { date: at(85) });
    expect(label).toBe('long past its window');
    expect(label).not.toMatch(/\d/);
  });

  test('but a genuinely late task keeps its exact count', () => {
    // Red-proofs the rule. Collapsing everything to "long past its window"
    // would pass the test above and throw away the number a host can act on.
    // due = daysToEvent + leadDays, so a task is LATE only when the lead is
    // more negative than the runway remaining. My first version used -5 on a
    // 20-day runway, which is a task due in fifteen days, not a late one.
    expect(taskDueLabel({ leadDays: -25 }, { date: at(20) })).toBe('5 days past its window');
    expect(taskDueLabel({ leadDays: -3 }, { date: at(2) })).toBe('1 day past its window');
  });

  test('a task that is late but still countable keeps its number', () => {
    // THE CASE MY FIRST RULE BROKE. `late > daysToEvent` collapsed this to
    // "long past its window" -- a crab pre-order 13 days late on an event
    // tomorrow, which is the single case where the number matters most. An
    // existing test caught it, which is the argument for not deleting old
    // assertions when a new rule disagrees with them.
    expect(taskDueLabel({ leadDays: -14 }, { date: at(1) })).toBe('13 days past its window');
  });

  test('the boundary is stated, and both sides of it hold', () => {
    // 60 days: long enough that a real six-week slip keeps its number, short
    // enough that a playbook-runway artifact loses the spurious digits.
    expect(taskDueLabel({ leadDays: -70 }, { date: at(10) })).toBe('60 days past its window');
    expect(taskDueLabel({ leadDays: -71 }, { date: at(10) })).toBe('long past its window');
  });

  test('nothing else about the label changed', () => {
    expect(taskDueLabel({ leadDays: 0 }, { date: at(0) })).toBe('today');
    expect(taskDueLabel({ leadDays: 0 }, { date: at(1) })).toBe('tomorrow');
    expect(taskDueLabel({ leadDays: 0 }, { date: at(9) })).toBe('in 9 days');
  });
});
