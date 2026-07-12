// ─── vendorPlan — honest, explainable vendor-category cost estimates ──────────
//
// Every event-type playbook (playbooks/data/*.js) already authors a real vendor
// category list with a costRange and costUnit ('flat' | 'per guest') — e.g.
// Photographer [200, 600] flat, Catering [15, 40] per guest. Until now nothing
// read it: no engine, no UI, in either app. This is a thin domain helper over
// that authored data plus the metro/rush cost factors (lib/vendorEstimator.js)
// — Vendor Intelligence owns it; no separate engine, same pattern as crabPlan.
//
// HARD RULES (same doctrine as crabPlan / budgetCopy):
//   - no invented per-vendor quotes — the range comes from the playbook's own
//     authored costRange, scaled only by factors that carry their own
//     explanation string
//   - once a host enters a real cost on a booked vendor, that REPLACES the
//     estimate for that category — an estimate never outranks a real number
//   - every multiplier applied is named in `factorsApplied` so the UI can
//     always answer "why is this more/less expensive than the base range"

import { getPlaybook, resolveAnsweredCopy, DESTINATION_VENDOR_CATEGORIES } from './playbooks';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt = (n) => '$' + Math.round(Math.abs(n)).toLocaleString();

// buildVendorPlan(event, { metroFactor, metroLabel, rush }) → { relevant, categories, ... }
// `rush` is the object returned by lib/vendorEstimator's getRushFactor(event.date).
export function buildVendorPlan(event, opts = {}) {
  const ev = event || {};
  const playbook = getPlaybook(ev.type);
  const base = (playbook && Array.isArray(playbook.vendors)) ? playbook.vendors.filter(Boolean) : [];
  // DESTINATION-1: additive on top of whatever base playbook is active — never
  // gated on type, only on the host-set isDestination modifier (same
  // architecture as the decisions/tasks injection in playbooks/index.js).
  // Skips a category the base roster already covers by KEYWORD, not exact
  // string match — a travel-tagged playbook like Team Retreat already has its
  // own "Lodging / room block" / "Transport (flights / shuttle / transfers)"
  // worded differently than the generic destination additions, and those
  // should win rather than duplicate.
  const DEST_KEYWORDS = { 'Lodging / Concierge': /lodging/i, 'Transport': /transport/i, 'Childcare / Kids’ Program': /childcare|kids.{0,4}program/i };
  const baseHasKeyword = (re) => base.some((c) => c && re.test(c.category || ''));
  const categories = ev.isDestination
    ? [...base, ...DESTINATION_VENDOR_CATEGORIES.filter((c) => !baseHasKeyword(DEST_KEYWORDS[c.category]))]
    : base;
  if (!categories.length) return { relevant: false, categories: [] };

  const guests = num(ev.guestCount) || num(ev.guestEstimate)
    || (Array.isArray(ev.guests) ? ev.guests.filter(g => g && /^y/i.test(String(g.rsvp || ''))).length : 0);

  const booked = Array.isArray(ev.vendors) ? ev.vendors.filter(Boolean) : [];

  const metroFactor = num(opts.metroFactor) > 0 ? num(opts.metroFactor) : 1;
  const metroLabel = opts.metroLabel || null;
  const rush = opts.rush || { multiplier: 1, label: null, explanation: null };
  const rushFactor = num(rush.multiplier) > 0 ? num(rush.multiplier) : 1;

  const rows = categories.map((cat) => {
    const match = booked.find(v => v && String(v.category || '').trim().toLowerCase() === String(cat.category || '').trim().toLowerCase());
    const hasRealCost = !!(match && num(match.cost) > 0);

    const perGuest = String(cat.costUnit || '').trim().toLowerCase() === 'per guest';
    const unitMultiplier = perGuest ? Math.max(guests, 1) : 1;

    const factorsApplied = [];
    if (metroFactor !== 1) {
      factorsApplied.push({
        key: 'metro',
        label: metroLabel ? `${metroLabel} market` : 'Market adjustment',
        delta: metroFactor,
        explanation: `${metroLabel || 'Your market'} typically runs ${metroFactor > 1 ? 'above' : 'below'} the national baseline used for this range (${metroFactor > 1 ? '+' : ''}${Math.round((metroFactor - 1) * 100)}%).`,
      });
    }
    if (rushFactor !== 1 && rush.label) {
      factorsApplied.push({
        key: 'rush',
        label: `Timeline · ${rush.label}`,
        delta: rushFactor,
        explanation: rush.explanation,
      });
    }

    let estimateLow = null;
    let estimateHigh = null;
    if (Array.isArray(cat.costRange) && cat.costRange.length === 2) {
      const [lo, hi] = cat.costRange;
      estimateLow = Math.round(num(lo) * unitMultiplier * metroFactor * rushFactor);
      estimateHigh = Math.round(num(hi) * unitMultiplier * metroFactor * rushFactor);
    }

    let estimateCopy = null;
    if (hasRealCost) {
      estimateCopy = `${fmt(match.cost)} — from your quote.`;
    } else if (estimateLow != null && estimateHigh != null) {
      const rangeStr = estimateLow === estimateHigh ? `about ${fmt(estimateLow)}` : `about ${fmt(estimateLow)}–${fmt(estimateHigh)}`;
      estimateCopy = perGuest
        ? `${rangeStr}, before your quotes come in — ${fmt(cat.costRange[0])}–${fmt(cat.costRange[1])}/guest at national baseline.`
        : `${rangeStr}, before your quotes come in.`;
    }

    return {
      category: cat.category,
      required: !!cat.required,
      when: cat.when || null,
      altToDIY: resolveAnsweredCopy(cat.altToDIY, cat.copyByAnswer, ev) || null,
      costUnit: perGuest ? 'per guest' : 'flat',
      baseRange: Array.isArray(cat.costRange) ? cat.costRange : null,
      estimateLow,
      estimateHigh,
      estimateCopy,
      hasRealCost,
      realCost: hasRealCost ? num(match.cost) : null,
      // NOT the same concept as isVendorBooked()/BOOKED_STATUSES, despite the
      // shared name — this deliberately means "a vendor is assigned to this
      // category at all" (gating whether to still suggest hiring one), not
      // "the vendor's status is confirmed." Verified against
      // vendorPlan.test.js #9: an assigned-but-unpriced vendor is meant to
      // retire the suggestion — a per-screen audit flagged this as a
      // vocabulary collision with the other two "booked" definitions, but
      // unifying it broke that test's explicit, commented intent. Keeping
      // `!!match` and documenting the distinction instead of changing it.
      booked: !!match,
      vendorId: match ? match.id : null,
      vendorName: match ? match.name : null,
      factorsApplied,
    };
  });

  return {
    relevant: true,
    categories: rows,
    metroFactor,
    metroLabel,
    rushLabel: rush.label || null,
    rushExplanation: rush.explanation || null,
  };
}
