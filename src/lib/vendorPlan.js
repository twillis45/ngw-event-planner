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

import { getPlaybook } from './playbooks';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt = (n) => '$' + Math.round(Math.abs(n)).toLocaleString();

// buildVendorPlan(event, { metroFactor, metroLabel, rush }) → { relevant, categories, ... }
// `rush` is the object returned by lib/vendorEstimator's getRushFactor(event.date).
export function buildVendorPlan(event, opts = {}) {
  const ev = event || {};
  const playbook = getPlaybook(ev.type);
  const categories = (playbook && Array.isArray(playbook.vendors)) ? playbook.vendors.filter(Boolean) : [];
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
      altToDIY: cat.altToDIY || null,
      costUnit: perGuest ? 'per guest' : 'flat',
      baseRange: Array.isArray(cat.costRange) ? cat.costRange : null,
      estimateLow,
      estimateHigh,
      estimateCopy,
      hasRealCost,
      realCost: hasRealCost ? num(match.cost) : null,
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
