// C1 — hostSpending() HAD NO VENDOR TERM.
//
// This is the host-facing "budget single source", and until now the string
// "vendor" did not appear anywhere in the file. It summed budget rows + food +
// supplies + capacity + crab. Nothing else.
//
// So on the exact screen where a host decides whether they can afford to spend
// more, the app could tell them they had five figures of headroom they did not
// have:
//
//     ALL SET — you've got about $39,700 left.     (with ~$18,400 owed to vendors)
//
// Perversely, budgetCopy's `unpricedVendorCount` only flags vendors with NO cost —
// so a precisely-priced vendor contributed nothing to `committed` AND suppressed
// the caveat. The more carefully a host priced their vendors, the more invisible
// that money became.
//
// App.js:2241 always defined vendorBalance, with a comment saying every "owed to
// vendors" figure should route through it. The PLANNER views did. No HOST view
// could — the helpers were trapped inside App.js, unreachable from any lib. They
// now live in lib/vendorMoney.

import { hostSpending } from '../hostSpending';

const wedding = (vendors) => ({
  id: 'e-c1', type: 'Wedding', date: '2026-09-01',
  guestMode: 'count', guestCount: 0, guests: [],     // no food money in play — isolate vendors
  totalBudget: 40000,
  budget: [{ id: 'b1', category: 'Venue', budgeted: 500, actual: 300 }],
  vendors,
});

test('money owed to vendors is committed — it is not headroom', () => {
  const ev = wedding([
    { id: 'v1', name: 'Caterer',      status: 'Contracted',  cost: 11200, depositAmt: 3500, depositPaid: true,  balancePaid: false },  // owes 7,700
    { id: 'v2', name: 'Photographer', status: 'Deposit Paid', cost: 6000, depositAmt: 500,  depositPaid: true,  balancePaid: false },  // owes 5,500
    { id: 'v3', name: 'Florist',      status: 'Confirmed',   cost: 2600, depositAmt: 0,    depositPaid: false, balancePaid: false },  // owes 2,600
  ]);
  const m = hostSpending(ev);

  expect(m.vendorOwed).toBe(15800);                 // 7,700 + 5,500 + 2,600

  // Committed includes the full contracts (paid plus owed), plus unrelated spending.
  expect(m.committed).toBe(300 + 19800);

  // the headroom the hero prints
  const left = m.total - m.committed;
  expect(left).toBe(40000 - 20100);                 // $19,900 remains against commitments
  expect(left).toBeLessThan(39700);                 // the number it used to print
});

test('a vendor still being SHOPPED is not money owed — quoted/considering are not commitments', () => {
  const ev = wedding([
    { id: 'v1', name: 'Maybe DJ',  status: 'Quoted',      cost: 2000 },
    { id: 'v2', name: 'Maybe Bar', status: 'Considering', cost: 3000 },
  ]);
  const m = hostSpending(ev);
  expect(m.vendorOwed).toBe(0);                     // shopping is not a bill
  expect(m.committed).toBe(300);
});

test('a fully paid vendor owes nothing and remains spent and committed', () => {
  const ev = wedding([
    { id: 'v1', name: 'Caterer', status: 'Confirmed', cost: 11200, depositAmt: 3500, depositPaid: true, balancePaid: true },
  ]);
  const m = hostSpending(ev);
  expect(m.vendorOwed).toBe(0);
  expect(m.committed).toBe(11500);
  expect(m.spent).toBe(11500);
});

test('an UNPAID deposit means the FULL cost is still owed — a promise is not a payment', () => {
  const ev = wedding([
    { id: 'v1', name: 'Caterer', status: 'Contracted', cost: 11200, depositAmt: 3500, depositPaid: false, balancePaid: false },
  ]);
  expect(hostSpending(ev).vendorOwed).toBe(11200);  // not 11200 - 3500
});

// The vocabulary bug that was LOSING money from the ledger.
test("'Booked' and 'Paid' vendors are counted — App.js's STAGES list omitted both", () => {
  const ev = wedding([
    { id: 'v1', name: 'Booked vendor', status: 'Booked', cost: 4000, depositAmt: 0, depositPaid: false, balancePaid: false },
  ]);
  // Under the old STAGES.indexOf(status) >= 2 check, 'Booked' returned -1 → NOT
  // committed → this $4,000 silently vanished from Total Committed, Balance Due,
  // and every payment alert. V2 actively writes this status.
  expect(hostSpending(ev).vendorOwed).toBe(4000);
});

test('vendor money already PAID is not double-charged as spent', () => {
  // An unrelated venue payment and a catering deposit are distinct expenses.
  // The same-category overlap case is asserted in moneyHasOneOwner.
  const ev = wedding([
    { id: 'v1', name: 'Caterer', status: 'Contracted', cost: 10000, depositAmt: 2000, depositPaid: true, balancePaid: false },
  ]);
  const m = hostSpending(ev);
  expect(m.spent).toBe(2300); // $300 unrelated venue spending plus the $2,000 deposit
  expect(m.vendorOwed).toBe(8000);      // what is genuinely still owed
  expect(m.committed).toBe(10300);
});

test('no vendors → byte-identical to the old behavior', () => {
  const m = hostSpending(wedding([]));
  expect(m.vendorOwed).toBe(0);
  expect(m.committed).toBe(300);
});
