// ─── "SIGN PLANNER, PHOTOGRAPHER, CATERER, BAND/DJ" NAMES WHO IS LEFT ────────
// (queued from #222)
//
// Wedding's year-out vendor step listed all four even when some were booked,
// and it ticked itself the moment a caterer alone was booked (its "book a year
// out" put it on the booking-verb rule, whose caterer branch answers first).
// It now names only the roles not yet booked, and ticks when all four are.
//
// SINGLE SOURCE: bookings are read from event.vendors through isVendorBooked
// (workstreams), the record and the rule the vendor sheet, the reconfirm sweep
// and every other booking proof read. Nothing is stored on the step.
import { playbookChecklist } from '../playbooks';
import { taskSatisfied } from '../taskEngine';
import { reconcileChecklist } from '../checklistReconcile';

const FULL = 'Sign planner, photographer, caterer, band/DJ (these book a year out)';
const W = (vendors = []) => ({
  id: 'w', name: 'Our wedding', type: 'Wedding', date: '2027-10-09',
  guestMode: 'count', guestEstimate: 120, vendors,
});
const v = (category, status = 'Booked', name = `${category} Co.`) => ({ id: category, name, category, status });
const row = (ev) => playbookChecklist(ev, '2026-11-22').find((r) => r.id === 'pbt-w-t_keyvendors');

describe('the step names only the roles not yet booked', () => {
  test('nothing booked: the full list', () => {
    expect(row(W()).task).toBe(FULL);
    expect(taskSatisfied(W(), row(W()))).toBe(false);
  });
  test('photographer and caterer booked: planner and band/DJ are left', () => {
    const ev = W([v('Photography'), v('Catering')]);
    expect(row(ev).task).toBe('Sign planner, band/DJ (these book a year out)');
    expect(taskSatisfied(ev, row(ev))).toBe(false);
  });
  test('a caterer alone does not tick it', () => {
    const ev = W([v('Catering')]);
    expect(taskSatisfied(ev, row(ev))).toBe(false);
    expect(row(ev).task).toBe('Sign planner, photographer, band/DJ (these book a year out)');
  });
  test('a vendor still being considered is not booked', () => {
    const ev = W([v('Photography', 'Considering'), v('DJ', 'Quoted')]);
    expect(row(ev).task).toBe(FULL);
  });
  test('a band covers band/DJ; a coordinator covers planner', () => {
    const ev = W([v('Live Band'), v('Day-of Coordinator'), v('Photography')]);
    expect(row(ev).task).toBe('Sign caterer (these book a year out)');
  });
});

describe('it ticks when all four are booked', () => {
  test('planner, photographer, caterer and DJ booked', () => {
    const ev = W([v('Wedding Planner'), v('Photography'), v('Catering'), v('DJ', 'Confirmed')]);
    expect(taskSatisfied(ev, row(ev))).toBe(true);
    // Read by its words too, as the checklist's older rows are.
    expect(taskSatisfied(ev, { task: FULL })).toBe(true);
  });
});

test('a stored list follows the bookings: the reconcile relabels the row', () => {
  const before = W();
  const stored = [{ ...row(before), done: false }];
  const after = W([v('Photography'), v('Catering')]);
  const res = reconcileChecklist(stored, playbookChecklist(after, '2026-11-22'));
  expect(res.rows.find((r) => r.id === 'pbt-w-t_keyvendors').task).toBe('Sign planner, band/DJ (these book a year out)');
});
