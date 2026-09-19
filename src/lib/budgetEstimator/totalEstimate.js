// ─── Budget total estimate ─────────────────────────────────────────────────
// Sprint 60.Y. Extracted from BudgetEstimateHint so the per-head total range is
// a single source of truth — the hint, the intake "typical setup" checklist,
// and any future surface all compute the same planning total. Planning
// estimates only; never a quote or contract.

import { getDatePremium, getTimeOfDayFactor } from '../estimatorFactors.js';
import { budgetFamilyForType } from './confidence.js';
import { getCategoryShares } from './categoryShares.js';
import { getPlaybook } from '../playbooks';
import { moneyProvenanceFor } from './moneyProvenance.js';

// A type's OWN authored per-head band, when it has one and PER_HEAD_BY_TYPE
// does not. Every playbook carries `meta.perGuestCost` (grounded to that
// specific type — Fish Fry $8-18, Crab Feast $25-60, etc.), but ~20
// home-hosted types (The Cookout, Fish Fry, Sunday Dinner, Housewarming...)
// have no entry in PER_HEAD_BY_TYPE at all, so every one of them fell to the
// single flat $30-120/head `home_hosted` family default regardless of how
// different their real costs are — a Fish Fry could show a "Typical" 3-6x
// its own playbook's number. Deliberately NOT applied where PER_HEAD_BY_TYPE
// already has an explicit entry: several of those (Wedding, Birthday,
// Reunion...) have a DIFFERENT, independently-sourced perGuestCost on their
// own playbook that disagrees with the curated table — reconciling those is
// a real pricing-research call, not a missing-data bug, and out of scope
// here. This only fills the actual gap.
// ─── WHAT THE PLAYBOOK'S OWN ROSTER SAYS THIS CANNOT COST LESS THAN ──────────
//
// A per-head model multiplies a band by a headcount. That is the wrong shape for
// an event whose costs are FLAT and whose guest count is one or two. MEASURED
// 2026-09-19 — Surprise Proposal's own vendor roster declares two REQUIRED rows,
// both `costUnit: 'flat'`: a hidden photographer ($250-800) and a jeweller
// ($1,500-8,000, "ring + resize + insurance"). Required floor $1,750. The
// estimate for its own typical headcount of one guest: **$100-300**.
//
//   Surprise Proposal @1    required floor $1,750   estimate ceiling $300    5.8x
//   Conference @50          required floor $47,000  estimate ceiling $20,000 2.4x
//
// The playbook contradicts its own estimate, using nothing but data it authored.
//
// THIS REPORTS THE CONTRADICTION AND DOES NOT RESOLVE IT, deliberately. The two
// available remedies are both product calls: REFUSE (return null, which this
// function already does for a missing type or count, and which matches the
// house rule that a figure nobody can stand behind is withheld rather than
// repaired) or FLOOR the estimate at the roster sum (which gives the host a
// number, but one built from vendor ranges that carry no provenance of their
// own — see moneyProvenance.js#vendor.playbookCostRange). Picking between them
// changes what a host sees, so it is named on the result instead, the same way
// `costFactorApplied` carries a factor's basis out to whoever renders it.
//
// COUNTED FROM `required: true` ONLY, and at the caller's real headcount, so an
// optional videographer never inflates the floor and a per-guest row scales the
// way the vendor plan scales it.
function requiredVendorFloor(type, guests) {
  try {
    const pb = getPlaybook(type);
    const rows = (pb && Array.isArray(pb.vendors) ? pb.vendors : [])
      .filter((v) => v && v.required === true && Array.isArray(v.costRange) && v.costRange.length === 2);
    if (!rows.length) return null;
    const sum = rows.reduce((acc, v) => {
      const perGuest = String(v.costUnit || '').trim().toLowerCase() === 'per guest';
      const n = Number(v.costRange[0]);
      return acc + (Number.isFinite(n) ? n * (perGuest ? Math.max(1, guests) : 1) : 0);
    }, 0);
    return sum > 0 ? Math.round(sum) : null;
  } catch (_e) { return null; }
}

function playbookPerHead(type) {
  try {
    const pb = getPlaybook(type);
    const c = pb && pb.meta && pb.meta.perGuestCost;
    if (c && Number(c.low) > 0 && Number(c.high) > 0) return { low: Number(c.low), high: Number(c.high) };
  } catch (_e) { /* no playbook for this type — fall through */ }
  return null;
}

// Per-event-type per-head bands. Reflect commonly cited US bands.
//
// PROVENANCE: still `estimate`. A 2026-09-18 research pass reached ONE of these
// 17 rows: The Knot 2026 Real Weddings Study (10,474 US couples) puts the
// average cost per wedding guest at $292, which falls inside the Wedding row's
// $200–500 while sitting 19.9% BELOW that row's midpoint. One published mean
// does not ground a band, and it says nothing at all about the other 16 rows —
// so the table is unchanged and still ungrounded. This table becomes the number
// a host is shown first and largest; a surface must ask `moneyDisclosure`
// before rendering any figure derived from it. Read
// moneyProvenance.js#budget.perHeadByType before editing any number here.
export const PER_HEAD_BY_TYPE = {
  Wedding:             { low: 200, high: 500 },
  'Vow Renewal':       { low: 150, high: 400 },
  Quinceañera:         { low: 150, high: 400 },
  'Engagement Party':  { low: 100, high: 300 },
  'Bridal Shower':     { low:  80, high: 250 },
  'Baby Shower':       { low:  50, high: 180 },
  Birthday:            { low:  60, high: 250 },
  'Sweet 16':          { low: 100, high: 350 },
  'Retirement Party':  { low:  80, high: 250 },
  Reunion:             { low:  60, high: 200 },
  Graduation:          { low:  50, high: 180 },
  Conference:          { low: 150, high: 400 },
  'Corporate Retreat': { low: 200, high: 500 },
  'Corporate Event':   { low: 150, high: 400 },
  Gala:                { low: 250, high: 600 },
  'Fundraiser / Gala': { low: 250, high: 600 },
  'Networking Event':  { low:  60, high: 200 },
};

// Sprint 53 engine hardening — family-level fallback so EVERY supported type
// resolves to an explicit OR a family band (no silent flat generic). ~19 of the
// 24 canonical types (Elopement, Anniversary, Holiday Party, Board Meeting,
// Product Launch, Team Retreat, Town Hall, Training, Award Ceremony, Client
// Dinner, Wellness Retreat, Dinner Party, Housewarming, Get-Together, etc.)
// previously fell through to { low:100, high:250 }. Family bands close that gap.
export const PER_HEAD_BY_FAMILY = {
  home_hosted:  { low:  30, high: 120 },  // potluck-to-catered home gatherings
  host_driven:  { low:  60, high: 250 },  // showers, birthdays, graduations
  full_service: { low: 200, high: 500 },  // weddings, quinces, galas
  corporate:    { low: 150, high: 400 },  // conferences, launches, retreats
  travel_led:   { low: 200, high: 600 },  // destination / wellness retreats
};

// ─── Provenance markers ─────────────────────────────────────────────────────
// The provenance FIELD these tables never had. Records live in
// moneyProvenance.js (one-way import, no cycle); they are re-exported here so
// an editor changing a band sees the marker in the same file as the number,
// and so a reader can ask what backs it without knowing where the registry is.
//
// All three are currently tier 'estimate' with EMPTY sources, which means
// `isGroundedMoneyFactor` returns false for every one of them. That is the
// honest state, not a TODO that was skipped: no source was attached because
// none was researched, and inventing one would be worse than the silence.
export const PER_HEAD_BY_TYPE_PROVENANCE   = moneyProvenanceFor('budget.perHeadByType');
export const PER_HEAD_BY_FAMILY_PROVENANCE = moneyProvenanceFor('budget.perHeadByFamily');
export const PER_HEAD_FALLBACK_PROVENANCE  = moneyProvenanceFor('budget.perHeadFallback');

/**
 * Planning-grade total budget range for an event.
 * Returns { lowTotal, highTotal, destinationAdjusted } rounded to the nearest
 * $100, or null when type/guests are missing (can't estimate without them).
 *
 * DESTINATION-3 (budget) — `isDestination` fixes the silent override: an
 * explicit per-type band (e.g. Birthday $60–250) used to win outright, so a
 * DESTINATION birthday reflected none of its real cost drivers (lodging,
 * flights, multi-day scope) even though the travel_led family band already
 * encodes them. When the host set event.isDestination and the base type is
 * not itself travel_led, we blend the band TOWARD travel_led by element-wise
 * max — every output number already exists in the tables above (no invented
 * figures), a destination event is never estimated below the travel-led
 * floor, and a type that already exceeds it (e.g. Gala) is left alone.
 * `destinationAdjusted` tells the surface whether the blend actually moved
 * the band, so copy can disclose it honestly.
 */
export function estimateTotalRange({ type, guestCount, date = null, timeOfDay = 'afternoon', metroFactor = 1, isDestination = false, nights = 0 }) {
  const guests = Math.max(0, Number(guestCount) || 0);
  if (!type || guests < 1) return null;
  // PROVENANCE TRACKING (added with moneyProvenance.js). Records WHICH unsourced
  // constant tables actually built this figure, so a surface can ask
  // `moneyDisclosure(result.provenanceKeys)` instead of guessing. Collected as
  // the existing branches run — no branch is added, reordered or re-evaluated,
  // and nothing here is read back by the math. Only factors that actually MOVED
  // the number are recorded: a 1.0 multiplier changed no dollar, so it is not a
  // contributor to what the host is being shown.
  const provenanceKeys = [];
  const cite = (k) => { if (!provenanceKeys.includes(k)) provenanceKeys.push(k); };
  // OWN-PROPERTY LOOKUPS ONLY (2026-09-18). A plain `TABLE[type]` walks the
  // prototype chain, so an event type literally named '__proto__',
  // 'constructor' or 'toString' returned Object.prototype — a truthy object
  // with no `.low` or `.high`. The estimator then emitted lowTotal: NaN,
  // highTotal: NaN AND cited 'budget.perHeadByType' as the table that built
  // them. A false provenance attribution on a figure that is not a figure is
  // the exact defect this module exists to prevent, so it is fixed at the
  // lookup rather than patched downstream. `moneyProvenanceFor` already guards
  // itself the same way. No real event type is affected: every one of the 17
  // named rows is an own property, so every shipped estimate is unchanged.
  const own = (table, key) => (
    Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined
  );
  let ph = own(PER_HEAD_BY_TYPE, type);
  if (ph) cite('budget.perHeadByType');
  if (!ph) { ph = playbookPerHead(type); if (ph) cite('budget.playbookPerGuestCost'); }
  if (!ph) { ph = own(PER_HEAD_BY_FAMILY, budgetFamilyForType(type)); if (ph) cite('budget.perHeadByFamily'); }
  // REFUSAL (2026-09-18). This branch used to invent `{ low: 100, high: 250 }` —
  // an unsourced last-resort band for an event the engine cannot place at all.
  // It was measured UNREACHABLE (intakeFamilyFor answers 'host_driven' for
  // anything it cannot resolve, so PER_HEAD_BY_FAMILY always answers first), and
  // an unreachable invented figure is still an invented figure sitting in the
  // lookup chain: the day someone makes the family resolver strict, it becomes
  // the silent answer to a question we cannot answer.
  //
  // Deleting the literal alone was not available — `ph` is dereferenced below,
  // so removing the assignment would crash instead of declining. Returning null
  // removes the figure AND keeps a defined behaviour, on a contract this
  // function already has: it returns null when type or guestCount is missing, so
  // every caller has always handled null on this path. "We don't have a band for
  // this" is true; "$100–250 per head" for an unrecognised event was not.
  // See moneyProvenance.js#budget.perHeadFallback for the full reasoning.
  if (!ph) return null;
  let destinationAdjusted = false;
  if (isDestination && budgetFamilyForType(type) !== 'travel_led') {
    const tl = PER_HEAD_BY_FAMILY.travel_led;
    const blended = { low: Math.max(ph.low, tl.low), high: Math.max(ph.high, tl.high) };
    destinationAdjusted = blended.low !== ph.low || blended.high !== ph.high;
    ph = blended;
    if (destinationAdjusted) cite('budget.perHeadByFamily');
  }
  const tod = getTimeOfDayFactor(timeOfDay);
  const datePrem = getDatePremium(date, type);
  if ((tod.multiplier || 1) !== 1) cite('factors.timeOfDay');
  if ((metroFactor || 1) !== 1) cite('vendor.metroMarkets');
  for (const c of (datePrem.components || [])) {
    if (c.key === 'dow') cite('factors.dowPremium');
    else if (c.key === 'holiday') cite('factors.usHolidays');
    else if (c.key === 'season') cite('factors.peakWeddingSeason');
  }
  if (datePrem.cappedAtCap) cite('factors.datePremiumCap');
  const factor = (metroFactor || 1) * (tod.multiplier || 1) * (datePrem.multiplier || 1);
  let low = ph.low * guests * factor;
  let high = ph.high * guests * factor;
  // NIGHTS TERM (P1 "cost duration term", 2026-07-27): each extra event day
  // adds the type's own CATERING share of the base day — the exact claim the
  // estimator's copy has shipped since 7bfa25f5 ("adds food and drinks for
  // each extra day"), now computed from the same tables it always cited
  // (per-head band × the type's catering share band). No invented figures.
  // Venue/vendor lines are NOT re-multiplied (bookings usually span the stay),
  // and when the destination blend already moved the band to travel_led —
  // whose comment says it encodes multi-day scope — the term stays OFF so a
  // destination weekend is never double-counted. `nightsAdjusted` tells the
  // surface whether the math actually moved, so copy can say "includes" only
  // when it does.
  const extraDays = Math.max(0, Math.min(13, Math.round(Number(nights) || 0)));
  let nightsAdjusted = false;
  if (extraDays > 0 && !destinationAdjusted && budgetFamilyForType(type) !== 'travel_led') {
    const cat = (getCategoryShares(type) || {}).catering;
    if (cat && cat.min > 0) {
      low  += low  * cat.min * extraDays;
      high += high * cat.max * extraDays;
      nightsAdjusted = true;
      cite('budget.categoryShares');
    }
  }
  const lowTotal = Math.round(low / 100) * 100;
  const highTotal = Math.round(high / 100) * 100;
  // The playbook's own required-vendor floor, and whether this estimate sits
  // below it. Reported, never applied — see requiredVendorFloor's own note for
  // why the remedy is a product call and not a constant to pick here.
  const vendorFloor = requiredVendorFloor(type, guests);
  return {
    lowTotal,
    highTotal,
    destinationAdjusted,
    nightsAdjusted,
    // The constants this particular figure was built from. Pass straight to
    // `moneyDisclosure` — today it always answers mustMark:true, because not
    // one of them is grounded.
    provenanceKeys,
    requiredVendorFloor: vendorFloor,
    belowRequiredVendors: vendorFloor != null && highTotal < vendorFloor,
  };
}
