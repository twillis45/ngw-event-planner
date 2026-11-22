// ─── WHAT IS OWED IS SAID (audit 2 lane C P1-3, P1-9, P1-10, P1-4) ───────────
//
// P1-3  A payment due TODAY was silent: the raiser skipped `od >= 0`, so the
//       day a balance came due the board said nothing, and the next day it was
//       "1 day ago".
// P1-9  The wedding's After said "all clear" above "Settle up… $12,000 unpaid".
// P1-10 "Still owed" named the first after-task, not what is actually owed.
// P1-4  A trip's After counted from its first day.
// Every clock is fixed.
import { SURFACES } from '../surfaceRegistry';
import { afterOwed } from '../afterOwed';

beforeEach(() => { jest.useFakeTimers('modern'); });
afterEach(() => { jest.useRealTimers(); });
const at = (y, mo, d, h = 10) => jest.setSystemTime(new Date(y, mo - 1, d, h));
const payments = SURFACES.find((s) => s.id === 'vendor-payments');

const VENDOR = { id: 'v1', name: 'Bluemont Vineyard', category: 'Venue', status: 'Confirmed', cost: 12000, depositAmt: 4000, depositPaid: true, balancePaid: false, contractSigned: true };
const WEDDING = {
  id: 'aud-wedding', name: 'Maya & Jordan’s Wedding', type: 'Wedding', date: '2027-10-16',
  startTime: '16:00', venue: 'Bluemont Vineyard', venueCity: 'Bluemont, VA', guestMode: 'count', guestCount: 150,
  totalBudget: 45000, budget: [], guests: [], timeline: [], vendors: [{ ...VENDOR, payDueDate: '2027-09-16' }],
};

describe('a payment due today (P1-3)', () => {
  test('is raised the day it comes due, and says so', () => {
    at(2027, 9, 16);
    const raised = payments.raise(WEDDING);
    expect(raised).toHaveLength(1);
    expect(raised[0].why).toMatch(/due today/i);
  });
  test('is not raised before its day (unchanged)', () => {
    at(2027, 9, 10);
    expect(payments.raise(WEDDING)).toHaveLength(0);
  });
});

describe('After names what is owed', () => {
  test('an unpaid balance is owed, and it leads (P1-9, P1-10)', () => {
    at(2027, 10, 17);
    const o = afterOwed(WEDDING);
    expect(o.clear).toBe(false);
    expect(o.owedCount).toBeGreaterThanOrEqual(1);
    expect(o.line).toMatch(/still owed — settle up with Bluemont Vineyard/i);
    expect(o.line).not.toMatch(/Nothing needs you/);
  });

  test('with the balance paid and nothing due yet, it says what comes after', () => {
    at(2027, 10, 17);
    const ev = { ...WEDDING, vendors: [{ ...VENDOR, balancePaid: true }] };
    const o = afterOwed(ev);
    expect(o.owedCount).toBe(0);
    expect(o.line).toMatch(/come after — the first is/);
  });

  test('a trip counts from its last day (P1-4)', () => {
    const trip = { id: 't', type: 'Group Trip', name: 'Girls Trip', date: '2027-05-13', endDate: '2027-05-16',
      isDestination: true, guestMode: 'count', guestCount: 8, budget: [], vendors: [], guests: [], timeline: [] };
    at(2027, 5, 17);
    expect(afterOwed(trip).agoN).toBe(1);
    expect(afterOwed(trip).line).toMatch(/yesterday/);
  });
});
