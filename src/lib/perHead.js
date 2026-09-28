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
export function hostCounts(event) {
  const v = event && event.hostCounts;
  return v === true || v === false ? v : null;
}

const rawCount = (event) => {
  const ev = event || {};
  const n = Number(ev.guestCount != null ? ev.guestCount : ev.guestEstimate);
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
