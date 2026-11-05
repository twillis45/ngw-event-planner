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
import { roundCurrency } from './currency';
import { normalizeCategory } from './vendorAccountability/playbooks.js';

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

const categoryLabel = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Explicit budget links win. An alias is a match only when it identifies one row category. */
export function vendorBudgetCategory(vendor, rows = []) {
  const label = vendor.budgetCategory || vendor.category || vendor.name || vendor.id;
  const exact = rows.find(r => categoryLabel(r.category) === categoryLabel(label));
  if (exact || vendor.budgetCategory) return exact ? exact.category : label;
  const key = normalizeCategory(label);
  const matches = [...new Set(rows.filter(r => key !== 'other' && normalizeCategory(r.category) === key).map(r => r.category))];
  return matches.length === 1 ? matches[0] : key !== 'other' && matches.length === 0 ? key : label;
}

/** One owner per category, derived on read. Forecasts never become commitments. */
export function moneyCategories(event, estimates = []) {
  const rows = (Array.isArray(event.budget) ? event.budget : []).filter(Boolean);
  const groups = new Map();
  const group = (label) => {
    const key = categoryLabel(label);
    if (!groups.has(key)) groups.set(key, { label, rows: [], vendors: [], estimates: [] });
    return groups.get(key);
  };
  rows.forEach((r, i) => group(r.category || `Budget entry ${i + 1}`).rows.push(r));
  (Array.isArray(event.vendors) ? event.vendors : []).filter(v => v && (vendorIsCommitted(v) || vendorPaid(v) > 0)).forEach(v => {
    group(vendorBudgetCategory(v, rows)).vendors.push(v);
  });
  estimates.forEach(e => {
    const exact = groups.get(categoryLabel(e.label));
    const matches = [...groups.values()].filter(g => normalizeCategory(e.label) !== 'other'
      && normalizeCategory(g.label) === normalizeCategory(e.label));
    (exact || (matches.length > 0 ? matches[0] : group(e.label))).estimates.push(e);
  });
  return [...groups.values()].map(g => {
    const allocated = g.rows.reduce((s, r) => s + num(r.budgeted), 0);
    const actual = g.rows.reduce((s, r) => s + num(r.actual), 0);
    const contract = g.vendors.filter(vendorIsCommitted).reduce((s, v) => s + num(v.cost), 0);
    const paid = g.vendors.reduce((s, v) => s + vendorPaid(v), 0);
    const bought = g.estimates.reduce((s, e) => s + num(e.spent), 0);
    const estimate = g.estimates.reduce((s, e) => s + num(e.expected), 0);
    const source = contract > 0 || (!g.rows.length && g.vendors.length) ? 'vendor' : g.rows.length ? 'budget' : 'estimate';
    // An allocation owns the forecast, not the shopping receipt. Unpriced
    // bookings cannot replace known payments with an invented zero.
    const spent = Math.max(0, source === 'vendor' && contract > 0 ? paid : actual, bought, paid);
    const committed = Math.max(contract, spent);
    const expected = Math.max(committed, contract > 0 ? contract : g.rows.length ? allocated : estimate);
    return { label: g.label, source, expected: roundCurrency(expected), committed: roundCurrency(committed), spent: roundCurrency(spent),
      spentEstimated: bought > Math.max(contract > 0 ? paid : actual, paid)
        ? Math.min(spent, Math.max(0, g.estimates.reduce((s, e) => s + num(e.spentEstimated), 0))) : 0,
      budgetRowIds: g.rows.map(r => r.id), vendorIds: g.vendors.map(v => v.id),
      discrepancy: (contract > 0 && g.rows.length > 0 && actual !== paid) || (bought > 0 && ((contract > 0 && bought !== paid) || (actual > 0 && bought !== actual)))
        ? { budgetActual: actual, vendorPaid: paid, shoppingPaid: bought } : null };
  });
}

/** Build a payment edit for patchEvent; contracted payments belong to vendor records. */
export function budgetPaymentPatch(event, rowId, amount, newCategory) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a payment greater than $0.');
  const existing = (event.budget || []).find(r => r.id === rowId);
  const label = String(newCategory || '').trim();
  if (!existing && (!rowId || !label)) throw new Error('Choose a budget entry or enter a category.');
  const rows = existing ? event.budget : [...(event.budget || []), { id: rowId, category: label, budgeted: 0, actual: 0 }];
  const category = moneyCategories({ ...event, budget: rows }).find(c => c.budgetRowIds.includes(rowId));
  if (category && category.source === 'vendor') throw new Error('Record this payment on the vendor.');
  return { budget: rows.map(r => r.id === rowId
    ? { ...r, actual: roundCurrency(num(r.actual) + n) } : r) };
}
