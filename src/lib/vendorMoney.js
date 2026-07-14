// ─── vendorMoney — the ONE vendor money model ────────────────────────────────
//
// Extracted from App.js (2241-2243), where it was defined inside the component
// module and therefore unreachable from any lib. That is precisely why
// hostSpending() — the host-facing "budget single source" — contains ZERO vendor
// terms: the helpers it needed were locked in a file it cannot import. The
// PLANNER budget views used them; no HOST surface could.
//
// Two bugs are fixed by moving them here:
//
// 1. VOCABULARY DRIFT THAT LOSES MONEY. App.js's committed check was
//      STAGES.indexOf(v.status) >= 2, STAGES = [Considering, Quoted, Contracted,
//      Deposit Paid, Confirmed]
//    — which has no 'Booked' and no 'Paid', both of which workstreams.js
//    documents as live legacy synonyms and V2 explicitly writes. A vendor stored
//    as 'Booked' or 'Paid' returned indexOf === -1 → NOT committed → their cost
//    silently dropped out of Total Committed, Balance Due, and every payment
//    alert. Money vanished from the ledger because two files disagreed on a word.
//    This module reads the SAME canonical status sets as workstreams.js.
//
// 2. The host budget being blind to vendor money at all (see hostSpending).
//
// The math itself is unchanged from App.js and is deliberately conservative:
// an unpaid deposit means you still owe the FULL cost.

import { isVendorBooked } from './workstreams';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Is this vendor's money real yet? Committed = the host is on the hook for it.
 * Booked (Contracted / Deposit Paid / Confirmed / Booked / Paid) means the cost
 * is owed. 'Considering' and 'Quoted' are not money yet — they are shopping.
 */
export function vendorIsCommitted(vendor) {
  return isVendorBooked(vendor);
}

/** What the host has actually paid this vendor so far. */
export function vendorPaid(vendor) {
  if (!vendor) return 0;
  if (vendor.balancePaid) return num(vendor.cost);
  // An unpaid deposit is not a partial payment — nothing has left the account.
  return vendor.depositPaid ? num(vendor.depositAmt) : 0;
}

/** What the host still owes this vendor. Never negative. */
export function vendorBalance(vendor) {
  if (!vendor) return 0;
  return Math.max(0, num(vendor.cost) - vendorPaid(vendor));
}

/**
 * Total still owed across every COMMITTED vendor on the event.
 * This is the number the host budget was missing entirely.
 */
export function vendorOutstanding(event) {
  const vendors = (event && Array.isArray(event.vendors)) ? event.vendors : [];
  return vendors
    .filter(v => v && vendorIsCommitted(v))
    .reduce((sum, v) => sum + vendorBalance(v), 0);
}

/** Total committed vendor cost (paid + still owed). */
export function vendorCommittedCost(event) {
  const vendors = (event && Array.isArray(event.vendors)) ? event.vendors : [];
  return vendors
    .filter(v => v && vendorIsCommitted(v))
    .reduce((sum, v) => sum + num(v.cost), 0);
}
