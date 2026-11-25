// ONE EDIT SAVES ONE EVENT (11/25/2026). hostv4 asks its first real question
// (the budget), and its answer must be saved the way hostv2 saves an edit to a
// plan on this device: read the committed list, change that one event, write
// through saveCustomEvents. Both shells call patchSavedEvent, so the rule lives
// once.
import { LS_CUSTOMS, readCustomEvents, patchSavedEvent } from '../customEventStore';

const A = { id: 'cust-a', name: 'Rosa’s 40th Birthday', type: 'Birthday', guestEstimate: 25 };
const B = { id: 'cust-b', name: 'Harvest Dinner', type: 'Dinner Party' };
const seed = (list) => localStorage.setItem(LS_CUSTOMS, JSON.stringify(list));

beforeEach(() => localStorage.clear());

test('changes only the named event, keeps the others, and returns what it saved', () => {
  seed([A, B]);
  const res = patchSavedEvent('cust-a', { totalBudget: 550 });
  expect(res.ok).toBe(true);
  expect(res.saved).toEqual({ ...A, totalBudget: 550 });
  expect(readCustomEvents()).toEqual([{ ...A, totalBudget: 550 }, B]);
});

test('builds on the committed list, not a stale copy the caller holds', () => {
  seed([A, B]);
  patchSavedEvent('cust-a', { totalBudget: 550 });
  patchSavedEvent('cust-a', { guestEstimate: 30 }, { fallback: [A, B] });
  expect(readCustomEvents()[0]).toEqual({ ...A, totalBudget: 550, guestEstimate: 30 });
});

test('falls back to the caller’s list when the store does not hold the event yet', () => {
  seed([B]);
  const res = patchSavedEvent('cust-a', { totalBudget: 400 }, { fallback: [A, B] });
  expect(res.ok).toBe(true);
  expect(readCustomEvents()).toEqual([{ ...A, totalBudget: 400 }, B]);
});

test('an event it cannot find is not saved, and says so', () => {
  seed([B]);
  const res = patchSavedEvent('cust-missing', { totalBudget: 400 });
  expect(res.ok).toBe(false);
  expect(res.reason).toBe('no-such-event');
  expect(res.saved).toBe(null);
  expect(readCustomEvents()).toEqual([B]);
});
