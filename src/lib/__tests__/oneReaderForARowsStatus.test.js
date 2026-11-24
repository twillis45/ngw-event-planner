// ─── SETTLED = GREEN, ONE RULE (owner, 11/24/2026) ──────────────────────────
// lib/rowStatus is the one reader every sheet row's status value asks.
import { rowStatus, sourcingSettled, ROW_STATUSES } from '../rowStatus';

test('three answers, and overdue wins over settled', () => {
  expect(ROW_STATUSES).toEqual(['settled', 'open', 'overdue']);
  expect(rowStatus({ settled: true })).toBe('settled');
  expect(rowStatus({})).toBe('open');
  expect(rowStatus()).toBe('open');
  expect(rowStatus({ overdue: true })).toBe('overdue');
  expect(rowStatus({ settled: true, overdue: true })).toBe('overdue');
});

test('sourcing is settled only when the host picked a tier', () => {
  expect(sourcingSettled({})).toBe(false);
  expect(sourcingSettled({ sourcing: '' })).toBe(false);
  expect(sourcingSettled({ sourcing: 'grocery' })).toBe(true);
  expect(sourcingSettled(null)).toBe(false);
});
