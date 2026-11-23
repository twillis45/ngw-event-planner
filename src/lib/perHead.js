// ─── WHO IS IN THE NUMBER, AND WHAT EACH PERSON PAYS ──────────────────────
//
// Host, 2026-09-28: "we need per head to pass to group and identify as host
// in app", and the count is the urgent half — because it changes every
// per-head figure the product shows.
//
// THE AMBIGUITY, MEASURED. The creation chip asks "How many?" and nothing
// else. The strings "including you", "includes you" and "counting you" do not
// appear anywhere in this repo. So `guestCount` is a number of unknown
// composition, and every division by it — the lodging split, the per-head
// band, the food plan's covers — inherits that. Sixteen people splitting a
// house is $263 each; seventeen is $247. Nobody has been asked.
//
// This module does NOT guess. `hostCounts` is a third state and the default
// is "unstated", because a host who has not been asked has not answered, and
// a product that assumes is a product that is wrong half the time silently.
//
// PURE: no I/O, no UI, no storage.

/** Did the host say whether their own number includes them? true | false | null. */
import { guestCountFor } from './guestCountFor';
export function hostCounts(event) {
  const v = event && event.hostCounts;
  return v === true || v === false ? v : null;
}

// guestCountFor, the one reader (owner, 11/21/2026). `guestCount != null`
// read "Reopen the count"'s `guestCount: ''` as zero heads beside an estimate
// of 60.
const rawCount = (event) => {
  const n = Number(guestCountFor(event).count);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

/**
 * headsFor(event) → { heads, hostIncluded, basis, stated }
 *
 * `heads` is how many people are actually there, which is what a per-head
 * division needs. When the host has not said, `heads` is the raw number and
 * `stated` is false — a caller showing money MUST surface that rather than
 * print a figure that looks settled.
 */
export function headsFor(event) {
  const raw = rawCount(event);
  if (raw == null) return { heads: null, hostIncluded: null, basis: 'no count', stated: false };
  const said = hostCounts(event);
  if (said === true) return { heads: raw, hostIncluded: true, basis: 'host is in the count', stated: true };
  if (said === false) return { heads: raw + 1, hostIncluded: false, basis: 'host added to the count', stated: true };
  // Unstated. The raw number is used because inventing a +1 is the same sin
  // as assuming the host is already in it — but the caller is told.
  return { heads: raw, hostIncluded: null, basis: 'nobody said whether you are in this number', stated: false };
}

/**
 * perHeadOf(total, event) → { each, heads, stated, basis } | null
 * Null whenever the division cannot be made honestly.
 */
export function perHeadOf(total, event) {
  const n = Number(total);
  if (!Number.isFinite(n) || n <= 0) return null;
  const { heads, hostIncluded, basis, stated } = headsFor(event);
  if (!heads) return null;
  return { each: Math.round(n / heads), heads, hostIncluded, basis, stated };
}

// ─── ONE DIVISION, ONE WAY OF PRINTING IT (six root causes, cause 3) ────────
// Thanksgiving walkthrough P1-6: the Shop sheet read "$9–$24 a head" and Your
// money read "$6–$17 a head" for the same dinner. Both were right (all in vs
// food and drink), but each surface divided its own total its own way (the
// rounded total, the raw sum, and the Q&A context a third time, unrounded).
// Every per-head figure over a planned headcount now comes from here. Each
// surface keeps the words that say what its figure covers ("estimate, all
// in", "Full food and drink plan", a budget tier) in front of it.

/** A total over the guests, in whole dollars; null when there are no guests. */
export function perHead(total, guests) {
  const g = Number(guests);
  const t = Number(total);
  if (!(g > 0) || !Number.isFinite(t)) return null;
  return Math.round(t / g);
}

/** The low–high pair over the guests; null when there are no guests. */
export function perHeadRange(low, high, guests) {
  const lo = perHead(low, guests);
  const hi = perHead(high, guests);
  return lo == null || hi == null ? null : { low: lo, high: hi };
}

/** "$9–$24 a head". `fmt` is the surface's own money formatter. */
export function perHeadText(range, fmt = (n) => `$${n}`) {
  if (!range) return '';
  const fig = range.low === range.high ? fmt(range.low) : `${fmt(range.low)}–${fmt(range.high)}`;
  return `${fig} a head`;
}
