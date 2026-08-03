// Event OS — Playbook Reader (Sprint 55C-1).
//
// A minimal, deterministic reader over playbook data. It does NOT rank,
// persist, or own state — it is a PURE producer of dated, quantity-resolved
// operational task CANDIDATES that the EXISTING next-action cascade
// (selectEventNextAction / selectStudioCommand) ranks and renders. No new
// engine, no new runtime, no new UI.
//
// ESM-only (per the prod-bundle lesson — no CJS module.exports in src/).

import { rsvpState, rsvpIsSettled } from '../rsvp';
import { ANCHOR_HOUR, parseStartMinutes } from '../eventWhen';
import { spanNights } from '../dates';
import { attendanceAdjustment } from '../hostIntel';
import dinnerParty from './data/dinnerParty';
import birthday from './data/birthday';
import babyShower from './data/babyShower';
import backyardBbq from './data/backyardBbq';
import graduation from './data/graduation';
import watchParty from './data/watchParty';
import gameNight from './data/gameNight';
import housewarming from './data/housewarming';
import bridalShower from './data/bridalShower';
import genderReveal from './data/genderReveal';
import engagementParty from './data/engagementParty';
import anniversary from './data/anniversary';
import holidayParty from './data/holidayParty';
import sweet16 from './data/sweet16';
import retirementParty from './data/retirementParty';
import reunion from './data/reunion';
import bacheloretteParty from './data/bacheloretteParty';
import bachelorParty from './data/bachelorParty';
import vowRenewal from './data/vowRenewal';
import theCookout from './data/theCookout';
import fishFry from './data/fishFry';
import cardParty from './data/cardParty';
import sundayDinner from './data/sundayDinner';
import dayParty from './data/dayParty';
import juneteenthCookout from './data/juneteenthCookout';
import crabFeast from './data/crabFeast';
import crawfishBoil from './data/crawfishBoil';
import lowCountryBoil from './data/lowCountryBoil';
import pupusaGathering from './data/pupusaGathering';
import ethiopianCoffeeCeremony from './data/ethiopianCoffeeCeremony';
import wedding from './data/wedding';
import elopement from './data/elopement';
import quinceanera from './data/quinceanera';
import surpriseProposal from './data/surpriseProposal';
import repast from './data/repast';
import kwanzaaGathering from './data/kwanzaaGathering';
import boardMeeting from './data/boardMeeting';
import conference from './data/conference';
import teamRetreat from './data/teamRetreat';
import { resolveCanonicalType } from '../eventTaxonomyAdapter';
import { audiencePersona } from '../nextActionRenderer';
import { quantityBasis } from '../quantities/quantityBasis';
import { taskSatisfied } from '../taskEngine';
import { expectedFromPlanned, attendanceShift, implausibleGuestNote } from '../attendanceModel';
import { SOURCING_TIERS, DEFAULT_SOURCING, sourcingTier, sourcingFactor, isProteinItem, canonicalProteinPrice, nonProteinFactor, extraSupplyStores, canonicalSubstitutes } from '../sourcing';
import { resolveEffectiveItem } from '../effectiveItem'; // FOOD-2A: read-only normalized projection of `list`
import { buildCrabPlan } from '../crabPlan';
import { isVendorBooked } from '../workstreams';
import { crabsPerPicker, crabsPerBushel } from '../crabServing';
import { kidCount, vegCount, KID_PROTEIN_FACTOR } from '../appetite';
import { getCompressionLevel, getStandardLeadProvenance, isGroundedLead } from '../workflowCompression';
import { effectiveTimingProvenance, isGroundedTiming } from '../knowledge/timingProvenance';
// PHASE 5A-2 — the ONE runtime reader of governed knowledge. Purchase provenance
// only: a published KCR may replace the authored provenance block, and nothing
// else. Values, quantities, costs, decisions and ranking are untouched.
import { effectiveValue } from '../knowledge/knowledgeOverride';
import { isGroundedCulture } from '../knowledge/culturalContext';
import { militaryDecisionsFor, isGroundedMilitary } from '../knowledge/militaryRetirement';
import { destinationContextFor, isGroundedDestination } from '../knowledge/destinationContext';
import { venueFor } from '../venueFor';
import { effectiveAccessibility, isGroundedAccessibility } from '../knowledge/accessibilityContext';
import { isGroundedCost } from '../knowledge/costProvenance';
import { isGroundedItemQty } from '../knowledge/quantityProvenance';
import { effectiveLegal, isGroundedLegal } from '../knowledge/legalContext';
import { effectiveVenue, isGroundedVenue } from '../knowledge/venueContext';
import { effectiveWeather, isGroundedWeather } from '../knowledge/weatherContext';
import { effectiveHuman, isGroundedHuman } from '../knowledge/humanContext';
import { effectiveDietary, isGroundedDietary } from '../knowledge/dietaryContext';
import { effectiveBudget, isGroundedBudget } from '../knowledge/budgetContext';
import { effectiveChildcare, isGroundedChildcare } from '../knowledge/childcareContext';
import { authoredQuestion } from '../askVoice';

// ── Registry ────────────────────────────────────────────────────────────────
// Normalized (case-insensitive) canonical-event-type → playbook. Phase-1 host
// playbooks. backyardBbq is registered under the canonical 'Get-Together' type
// (BBQ / cookout / backyard all resolve there via the taxonomy).
const norm = (s) => String(s || '').trim().toLowerCase();
export const ALL_PLAYBOOKS = [dinnerParty, birthday, babyShower, backyardBbq, graduation, watchParty, gameNight, housewarming, bridalShower, genderReveal, engagementParty, anniversary, holidayParty, sweet16, retirementParty, reunion, bacheloretteParty, bachelorParty, vowRenewal, theCookout, fishFry, cardParty, sundayDinner, dayParty, juneteenthCookout, crabFeast, crawfishBoil, lowCountryBoil, pupusaGathering, ethiopianCoffeeCeremony, wedding, elopement, quinceanera, surpriseProposal, repast, kwanzaaGathering, boardMeeting, conference, teamRetreat];
const REGISTRY = {};
for (const pb of ALL_PLAYBOOKS) REGISTRY[norm(pb.type)] = pb;

// Resolve a raw event type to its playbook. Tries an exact (normalized) match
// first, then falls back to the canonical taxonomy so aliases and free-text
// land correctly ("Birthday Party" → Birthday, "Backyard BBQ"/"cookout" →
// Get-Together, "Graduation Party" → Graduation). Unknown types → null so the
// caller's existing fallback path stays intact.
export function getPlaybook(eventType) {
  if (!eventType) return null;
  const direct = REGISTRY[norm(eventType)];
  if (direct) return direct;
  try {
    const canon = resolveCanonicalType(eventType);
    if (canon && REGISTRY[norm(canon)]) return REGISTRY[norm(canon)];
  } catch (_e) { /* taxonomy resolve is best-effort */ }
  return null;
}

// ── Window model ──────────────────────────────────────────────────────────────
// A purchase's buyAt token ("T-3d" | "T-1d" | "T0") is an offset in days from
// the event date. dueInDays (from `asOf`) = daysToEvent + offset. A purchase is
// ELIGIBLE only inside its shopping window: due today, or up to WINDOW_LEAD days
// ahead. Past its buy date it is dropped (assume handled — the OS doesn't nag).
const WINDOW_LEAD = 2;

function buyOffsetDays(token) {
  const m = /^T(-?\d+)d?$/.exec(String(token || '').trim());
  return m ? parseInt(m[1], 10) : null; // T0 → 0, T-1d → -1, T-3d → -3
}

function guestCountOf(event, playbook) {
  const explicit = Number(event.guestCount) || Number(event.guestEstimate) || 0;
  if (explicit > 0) return explicit;
  const added = (event.guests || []).length;
  if (added > 0) return added;
  return (playbook.meta && playbook.meta.typicalGuests && playbook.meta.typicalGuests.default) || 8;
}

// Buy quantity resolved from guest count. Supports per-guest, per-N, and flat.
function resolveQuantity(p, guests) {
  if (typeof p.qtyPerGuest === 'number') {
    return Math.round(p.qtyPerGuest * guests * 10) / 10; // 1.5 × 12 = 18 (integers stay clean)
  }
  if (typeof p.qtyFlat === 'number' && typeof p.qtyPer === 'number') {
    return Math.ceil(guests / p.qtyPer) * p.qtyFlat;
  }
  if (typeof p.qtyFlat === 'number') return p.qtyFlat;
  return null;
}

// For purchases that carry priceLadder + servingGuide (e.g. crabs sold by the bushel),
// compute the right purchase unit (dozen / half bushel / bushel) from the chosen size
// decision and guest count. Returns null for purchases without this data or when the
// linking decision can't be resolved. adultGuests should be proteinGuests (kids already
// factored), or fall back to raw guest count.
function resolveBulkPurchase(p, decisions, choices, adultGuests) {
  if (!p.priceLadder || !p.servingGuide) return null;
  const affectingDecision = (Array.isArray(decisions) ? decisions : []).find(
    (d) => d && d.ladderKeys && Array.isArray(d.affects) && d.affects.includes(p.id)
  );
  if (!affectingDecision) return null;
  const chosenOption = (choices[affectingDecision.id] != null)
    ? choices[affectingDecision.id]
    : affectingDecision.default;
  const ladderKey = affectingDecision.ladderKeys[chosenOption];
  if (!ladderKey) return null;
  const ladder = p.priceLadder[ladderKey];
  if (!ladder) return null;
  const servingKey = ladder.servingKey || ladderKey;
  // withSides used to be a bare number here and a `|| { withSides: 6 }` literal backed
  // it up — a FIFTH copy of the crab figure, and the fallback was the medium number
  // being applied to whatever size the host actually chose. It now reads the sourced,
  // size-aware table, which returns a published [low, high] range.
  //
  // `p.servingGuide` is passed through as the OVERRIDE (Phase 5E.3). Before that it was
  // read only by the truthiness check at the top of this function, so a published
  // correction to it moved nothing — the numbers came off the frozen module constant.
  // It is now the consumer that makes `servingGuide` genuinely governable, which is
  // what lets an admin correct the crab COUNT: `qtyPerGuest` cannot move a bushel, but
  // crabs-per-picker is the figure the bushel maths is built on.
  const guide = p.servingGuide;
  const crabsPerPerson = crabsPerPicker(servingKey, { guide });
  const guests = Math.max(1, Math.round(adultGuests));
  const totalUnits = Math.ceil(guests * crabsPerPerson);
  // RE-AUDIT (fresh-eyes, 2026-07-14): approxPerBushel used to WIN over the sourced table —
  // and the jumboMale ladder says 48/bushel (the guide's COLOSSAL figure) while the sourced
  // jumbo count is 60. The shopping list computed Jumbo Males at 48/bushel while the crab
  // sheet's defaultCountPerUnit counted 60 — two screens, two jumbo-bushel counts, on the
  // costliest line item. The ONE sourced table (crabServing) wins; the ladder's approx is
  // only the fallback for a servingKey the table doesn't know.
  const perBushel = crabsPerBushel(servingKey, { guide }) || ladder.approxPerBushel || 72;
  const perHalfBushel = Math.round(perBushel / 2);
  if (totalUnits <= 12 && ladder.perDz) {
    return { qty: 1, unit: 'dozen', totalUnits, unitLabel: '1 dozen', price: ladder.perDz };
  }
  if (totalUnits <= 24 && ladder.per2Dz) {
    return { qty: 2, unit: 'dozen', totalUnits, unitLabel: '2 dozen', price: ladder.per2Dz };
  }
  if (totalUnits <= perHalfBushel && ladder.perHalfBushel) {
    return { qty: 1, unit: 'half bushel', totalUnits, unitLabel: '1 half bushel', price: ladder.perHalfBushel };
  }
  const bushels = Math.ceil(totalUnits / perBushel);
  if (!ladder.perBushel) {
    const dz = Math.ceil(totalUnits / 12);
    return { qty: dz, unit: 'dozen', totalUnits, unitLabel: `${dz} dozen`, price: dz * (ladder.perDz || 0) };
  }
  return {
    qty: bushels,
    unit: bushels === 1 ? 'bushel' : 'bushels',
    totalUnits,
    unitLabel: `${bushels} full ${bushels === 1 ? 'bushel' : 'bushels'}`,
    price: bushels * ladder.perBushel,
  };
}

// "Main protein (e.g. ...)" → "Main protein"; "Ice" → "Ice".
function shortItem(item) {
  return String(item || '').split(/[(—–]| - /)[0].trim();
}

// "lb" → "lbs"; "bottle (½ bottle/guest rule)" → "bottles"; "loaf per 4 guests" →
// "loaves" (the per-N belongs to qtyPer, not the unit). Pluralized by qty.
function shortUnit(unit, qty) {
  // strip a parenthetical rule-of-thumb AND a compound "per N guests" tail.
  let u = String(unit || '').split('(')[0].split(/\s+per\s+/i)[0].trim();
  if (!u) return '';
  if (qty !== 1 && !/s$/i.test(u)) {
    if (/(?:x|z|ch|sh)$/i.test(u)) u += 'es';            // batch → batches, box → boxes
    else if (/f$/i.test(u)) u = u.replace(/f$/i, 'ves'); // loaf → loaves
    else u += 's';
  }
  return u;
}

// ── Global buyable-unit guardrail ─────────────────────────────────────────────
// The app must NEVER render a non-buyable "consumption unit" (e.g. "40 slices" of
// cake) regardless of what a playbook author writes. You buy a cake, not a slice;
// a pizza, not a slice. This table maps a whole-purchase good (matched by a
// keyword in the item NAME) to its buyable unit + `per` = servings per unit.
// `normalizeBuyable` is a NO-OP for anything already modeled in buyable units —
// it only fires when the authored unit is a banned serving unit (/^slices?$/).
const BUYABLE_UNITS = [
  { re: /pizza/i, unit: 'pizza', per: 8 },
  { re: /\b(bread|loaf|loaves)\b/i, unit: 'loaf', per: 20 },
  { re: /\b(cake|cheesecake)\b/i, unit: 'cake', per: 13 }, // cupcakes excluded (already buyable each)
  { re: /\bpie\b/i, unit: 'pie', per: 8 },
];

// normalizeBuyable(itemName, qtyServings, rawUnit, uLow, uHigh)
// Returns a correction ONLY when rawUnit is a banned consumption unit (slice/slices)
// AND the item name matches a buyable good. Then it converts the serving count into
// whole purchasable units and scales the per-unit cost range so the TOTAL stays
// consistent (you buy whole units): { qty, unit, uLow: uLow*per, uHigh: uHigh*per }.
// Otherwise returns null (byte-identical behavior — the global safety net is inert
// for correctly-modeled items). Intentionally narrow on 'slice' to avoid over-reach
// on legitimate serving units like 'serving' / 'piece' / 'lb'.
function normalizeBuyable(itemName, qtyServings, rawUnit, uLow, uHigh) {
  const u = String(rawUnit || '').split('(')[0].trim().toLowerCase().replace(/s$/, '');
  if (u !== 'slice') return null; // only the banned consumption unit triggers
  const match = BUYABLE_UNITS.find((b) => b.re.test(String(itemName || '')));
  if (!match) return null;
  const servings = Number(qtyServings) || 0;
  return {
    qty: Math.max(1, Math.ceil(servings / match.per)),
    unit: match.unit,
    uLow: uLow * match.per,
    uHigh: uHigh * match.per,
  };
}

function dueLabel(dueInDays) {
  if (dueInDays <= 0) return 'today';
  if (dueInDays === 1) return 'tomorrow';
  return `in ${dueInDays} days`;
}

// daysToEvent mirroring CommandCenter.daysFrom, but with an injectable `asOf`
// so the reader stays pure + testable.
function daysToEvent(eventDate, asOf) {
  if (!eventDate) return null;
  // Parse asOf as a LOCAL date (mirror CommandCenter.daysFrom). A bare
  // 'YYYY-MM-DD' must get 'T00:00:00' so it is local, not UTC — otherwise it
  // shifts a day in negative-offset timezones.
  let base;
  if (asOf) {
    base = /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? new Date(asOf + 'T00:00:00') : new Date(asOf);
  } else {
    base = new Date();
  }
  base.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(eventDate + 'T00:00:00') - base) / 86400000);
}

// ── Decision-first gating (NGW Product Pattern 001) ───────────────────────────
// Prerequisite decisions outrank dependent actions. A per-guest purchase cannot
// be sized until the final guest count is locked; a food purchase shouldn't be
// bought before dietary/allergies are collected (where the playbook models a
// dietary decision). The gate reads ONLY event state we can actually observe —
// an undetectable decision never hard-blocks (that would hide the action
// forever). This is a filter over authored data, not a new system.

// Exported (Sprint 57J/57K) so presentation readers reuse the SAME resolver —
// no parallel guest-count math. Behavior unchanged.
export function guestCountResolved(event) {
  const n = Number(event.guestCount) || Number(event.guestEstimate) || (event.guests || []).length || 0;
  if (n <= 0) return { resolved: false, pending: 0, reason: 'no-count' };
  const list = event.guests || [];
  // Headcount-only events (a cookout/BBQ you BUDGET for, not an RSVP list): an
  // explicit expected count IS the final number — there's no list to be "pending".
  // The host opted out of a roster, so the count decision is satisfied.
  // `mode` is the engine's determination of HOW the count resolved — the single source
  // every surface keys its copy off (a headcount was never "replied" to; a roster was).
  if (event.guestMode === 'count' && Number(event.guestCount) > 0) return { resolved: true, pending: 0, mode: 'headcount' };
  // A "final" count means no still-pending RSVPs. Only a real guest list can
  // tell us this; an estimate-only event is treated as resolved (we can't see
  // maybes, and we won't block a host who already gave a number).
  // C3 ROOT FIX. This was an explicit two-value allow-list — `r === 'maybe' || r === ''` —
  // so the value the app's OWN importer writes, 'Pending', fell straight through to
  // `resolved: true`. Import a roster nobody has answered and the guest count read as
  // final. Now it reads the ONE canonical vocabulary (rsvpState), where anything that
  // is not an explicit yes/no is still outstanding.
  const pending = list.filter((g) => !rsvpIsSettled(g)).length;
  if (list.length > 0 && pending > 0) return { resolved: false, pending, reason: 'pending-rsvps' };
  return { resolved: true, pending: 0, mode: list.length > 0 ? 'roster' : 'estimate' };
}

// ── Safe-headcount band (Sprint 6x · the #2-fear dissolver) ───────────────────
// attendanceBand(event) → a HONEST range, not a fake-precise point. The single
// number is the one shape that *increases* a host's "will I run short?" fear; a
// band relieves it. PURE READER over the SAME RSVP states guestCountResolved()
// reads — no new guest-count system, no invented probabilities, no no-show
// prediction (that needs a corpus we don't have yet).
//
//   • Roster with outstanding replies → a real range:
//       low  = confirmed (people locked in)
//       high = confirmed + maybe + not-yet-replied (everyone who hasn't said no)
//     `planning` = high, so quantities/seating size to the ceiling — you won't
//     run short. The band is grounded entirely in actual RSVP states.
//   • Locked count / fully-replied roster → ONE number (no fabricated spread).
//     A number the host actually locked is real; banding it would invent data.
//
// Returns { applicable, basis:'rsvp'|'count', band:bool, low, high, planning,
//           confirmed, maybe, pending, declined, invited, because }.
// C3 — the ONE RSVP vocabulary now lives in lib/rsvp (taskEngine needs it too, and
// playbooks already imports taskEngine — importing back would be a cycle).
// Re-exported here so every existing consumer keeps working unchanged.
export { rsvpState, rsvpIsSettled, rsvpHasResponded } from '../rsvp';

export function attendanceBand(event) {
  if (!event) return { applicable: false, band: false };
  const list = Array.isArray(event.guests) ? event.guests : [];
  const roster = event.guestMode !== 'count' && list.length > 0;
  const norm = (g) => String((g && g.rsvp) || '').trim().toLowerCase();
  if (roster) {
    // Each roster row is one invited adult; `g.kids` ("Children in Party") is an
    // ADDITIVE count of kids that adult brings — not a separate row, not a subset
    // of list.length. A declined row's kids never attend either, so they're only
    // summed for rows that haven't said no — the same set low/high already count.
    let confirmed = 0, maybe = 0, pending = 0, declined = 0, kidsConfirmed = 0, kidsOut = 0;
    for (const g of list) {
      // C3: one shared reader (rsvpState) — this loop was already correct, and it is
      // the model the rest of the app now follows rather than re-deriving its own.
      const s = rsvpState(g);
      const gKids = Math.max(0, Math.round(Number(g && g.kids) || 0));
      // A filled plusOne is a real adult riding this row's answer. The UI headers
      // counted them for years while this engine didn't — so the roster said 12
      // and the food sized 10 (audit 2026-07-27). One person, one count, here too.
      const po = String((g && g.plusOne) || '').trim() ? 1 : 0;
      if (s === 'yes') { confirmed += 1 + po; kidsConfirmed += gKids; }
      else if (s === 'maybe') { maybe += 1 + po; kidsOut += gKids; }
      else if (s === 'no') declined++;
      else { pending += 1 + po; kidsOut += gKids; } // '' · 'Pending' · unknown → not yet replied
    }
    const kids = kidsConfirmed + kidsOut; // total kids among everyone who hasn't said no
    const low = confirmed + kidsConfirmed; // only a CONFIRMED row's kids are locked in
    const high = confirmed + maybe + pending + kids; // everyone who hasn't said no, plus the kids they bring
    const out = maybe + pending;
    const band = high > low; // a real range only when replies are still outstanding
    const because = band
      ? `${confirmed} confirmed · ${out} ${out === 1 ? 'reply' : 'replies'} still out`
      : `${confirmed} confirmed`;
    return {
      applicable: high > 0,
      basis: 'rsvp', band,
      low, high, planning: high,
      confirmed, maybe, pending, declined, kids, invited: list.length,
      because,
    };
  }
  // Count / estimate — no RSVP signal yet, so the researched attendance-shift model
  // fills the gap: a planned number rarely lands exactly, so we surface the typical
  // band around it (down for no-shows, up for plus-ones/walk-ins), keyed to how this
  // kind of event behaves. Real RSVPs (the branch above) always trump this.
  const n = Number(event.guestCount) || Number(event.guestEstimate) || list.length || 0;
  if (n <= 0) return { applicable: false, band: false };
  // NO-UPPER-CLAMP-1: never clamps the stored count (a host may genuinely run
  // something this large) — just names an implausible one, honestly. Single source
  // (implausibleGuestNote) shared with expectedFromPlanned, so this reads identically
  // wherever a planned/estimated count is surfaced, not just through this wrapper.
  const _highNote = implausibleGuestNote(n, event.type, getPlaybook(event.type));
  // A LOCKED final count the host has committed isn't an estimate — honor it exactly
  // (no modeled spread on a number they've finalized).
  const locked = event.guestCountLocked === true || event.headcountLocked === true;
  const exp = locked ? null : expectedFromPlanned(n, event.type, getPlaybook(event.type));
  if (!exp || exp.low >= exp.high) {
    return {
      applicable: true, basis: 'count', band: false,
      low: n, high: n, planning: n,
      confirmed: n, maybe: 0, pending: 0, declined: 0, kids: 0, invited: n,
      planned: n, because: _highNote,
    };
  }
  return {
    applicable: true, basis: 'estimate', band: true,
    low: exp.low, high: exp.high, planning: exp.high,
    confirmed: 0, maybe: 0, pending: 0, declined: 0, kids: 0, invited: n,
    planned: n, shift: attendanceShift(event.type, getPlaybook(event.type)),
    because: `Planned for ${n} · ${exp.low}–${exp.high} typically show${_highNote ? ' ' + _highNote : ''}`,
    note: exp.note,
  };
}

// A host-facing "how many to plan for" label built from the band. ONE place so
// the headline, seating, and budget all read identically.
//   band  → "38–44"   ·   single → "40"
export function attendanceBandLabel(band) {
  if (!band || !band.applicable) return null;
  return band.band ? `${band.low}–${band.high}` : String(band.high);
}

// sizingGuests(event, playbook) — the ONE headcount everything prepares for. The single
// source: it reads attendanceBand (a roster's real RSVPs, OR the researched attendance
// shift around a typed count/estimate) and sizes to its plan-to ceiling, so the food
// plan, supplies/rentals, and budget all prepare for the same expected number — never
// the bare invited list, never a flat optimistic count. An explicit estimate that
// EXCEEDS a roster still wins (the host told us to expect more). Falls back to the
// playbook's typical only when there's no signal at all.
export function sizingGuests(event, playbook) {
  if (!event) return 0;
  const pb = playbook || getPlaybook(event.type);
  const explicit = Number(event.guestCount) || Number(event.guestEstimate) || 0;
  const hasRoster = Array.isArray(event.guests) && event.guests.length > 0 && event.guestMode !== 'count';
  const band = attendanceBand(event);
  if (explicit > 0 && hasRoster) return Math.max(explicit, band.applicable ? band.planning : 0);
  if (band.applicable) return band.planning;
  return explicit > 0 ? explicit : guestCountOf(event, pb);
}

// eventSizing(event, playbook) — the ONE place the estimate→cost logic lives. Everything
// that sizes money or quantity reads this, so the attendance band, the plan-to ceiling,
// and the cost FLOOR (used when the band has real spread) are derived once, from one
// source, never recomputed piecemeal in a surface. Returns:
//   { band, ceiling, floor, lowRatio }
//   • ceiling  — plan-to headcount (sizingGuests): what to BUY so you won't run short.
//   • floor    — the band's realistic low headcount (fewer show); == ceiling when there's
//                no real range (a locked/settled count), so cost collapses to price-only.
//   • lowRatio — floor/ceiling: scale a per-guest line's LOW dollar to the band floor, so
//                the $ RANGE spans the expected-attendance band, not just price.
export function eventSizing(event, playbook) {
  const pb = playbook || getPlaybook(event && event.type);
  const band = attendanceBand(event);
  const ceiling = sizingGuests(event, pb);
  const floor = (band.applicable && band.band && band.low > 0 && band.low < ceiling) ? band.low : ceiling;
  const lowRatio = ceiling > 0 ? floor / ceiling : 1;
  return { band, ceiling, floor, lowRatio };
}

// playbookContingencyForWeather(event, wx) — surfaces the ALREADY-AUTHORED contingency
// plan that matches the live weather signal, so a host sees "here's the move" instead
// of a generic "rain plan?" prompt. PURE READER over playbook.contingencies (authored
// in 39/40 playbooks as { id, when, plan }); invents nothing. Returns { id, plan, kind }
// or null. `wx` is the getEventWeatherRisk() result ({ kind:'rain'|'heat'|'cold'|'snow'
// |'mixed', risk:'high'|'medium'|'low'|'clear', ... }).
export function playbookContingencyForWeather(event, wx) {
  if (!event || !wx || !wx.kind || wx.risk === 'clear') return null;
  const pb = getPlaybook(event.type);
  if (!pb || !Array.isArray(pb.contingencies) || !pb.contingencies.length) return null;
  const kind = String(wx.kind).toLowerCase();
  // Heat → the food-safety/ice move; everything wet (rain/snow/cold/mixed) → the
  // cover/indoor move. Match the authored contingency by its plan text AND its `when`
  // risk id, so it works regardless of a playbook's exact risk-id naming.
  const isHeat = kind === 'heat';
  const planRe = isHeat ? /ice|shade|heat|cool|cold|perishable|food.?safe|melt|water/i
                        : /rain|canopy|cover|indoor|garage|tent|umbrella|wet|storm/i;
  const whenRe = isHeat ? /foodsafe|heat|food/i : /weather|rain|storm|cold/i;
  const hit = pb.contingencies.find((c) => c && (planRe.test(c.plan || '') || whenRe.test(c.when || '')));
  return hit ? { id: hit.id, plan: hit.plan, kind } : null;
}

function dietaryResolved(event) {
  // Host explicitly noted allergies (the headcount-mode workflow) → done.
  if (event.dietaryNoted) return { resolved: true, reason: 'noted' };
  // Headcount / locked-count mode: there's no per-guest list to collect from, so the
  // host just NOTES the allergies they know of (free-text) instead of chasing the list.
  if (event.guestMode === 'count') return { resolved: false, reason: 'headcount' };
  const list = event.guests || [];
  if (list.length === 0) return { resolved: true, reason: 'no-list' }; // nothing to collect from — don't block
  const recorded = list.some((g) => {
    const needs = String((g && g.needs) || '').trim();
    const meal = String((g && g.meal) || '').trim();
    return needs || (meal && !/^(standard|—|-|none)$/i.test(meal));
  });
  return { resolved: recorded };
}

function playbookHasDietaryDecision(playbook) {
  return (playbook.decisions || []).some((d) => d.id === 'dietary' || /dietary|allerg/i.test(d.label || ''));
}

// Which prerequisite decision (if any) blocks this purchase. null = not blocked.
function purchaseGate(p, playbook, gc, di) {
  const perGuest = typeof p.qtyPerGuest === 'number' || typeof p.qtyPer === 'number';
  if (perGuest && !gc.resolved) return 'guestCount';
  if (p.category === 'food' && playbookHasDietaryDecision(playbook) && !di.resolved) return 'dietary';
  return null;
}

// ── Shared choice predicates ──────────────────────────────────────────────────
// ONE place the spread, the budget, AND the host task list read the host's
// food/sourcing choices from. A purchase OR a task tagged whenChoice:{id,in:[...]}
// is shown only when the effective pick for that decision is in the set; untagged
// items always show; an unknown pick shows the item (never hide on missing data).
// The effective pick falls back to the decision's authored default so the plan is
// right on first render before the host has touched anything.
export function choicePickFor(event, id) {
  if (!event || !id) return null;
  const picks = (event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices : {};
  if (picks[id]) return picks[id];
  const pb = getPlaybook(event.type);
  const dec = pb && Array.isArray(pb.decisions) ? pb.decisions.find((d) => d.id === id) : null;
  if (dec) return dec.default || null;
  // DESTINATION-4: destination decisions live OUTSIDE the playbook (they're the
  // isDestination modifier's own table, not any type's decisions[]), so the
  // authored-default fallback must look there too — otherwise a whenChoice gate
  // on a dest_* decision reads null and shows the item before any answer.
  // Only consulted when the modifier is actually on.
  // Resolve through the SAME per-row gate the board uses, rather than a second
  // copy of the isDestination test. Once dest_lodging could appear on a local
  // overnight event (a staycation), this branch would have returned null for it
  // and any whenChoice hanging off it would read "unanswered" — the row visible
  // on the board, its dependent item gated on a default that never resolved.
  const dd = destinationDecisionsFor(event, pb).find((d) => d.id === id)
    || militaryDecisionsFor(event).find((d) => d.id === id) || null;
  return (dd && dd.default) || null;
}
export function choiceShown(event, whenChoice) {
  if (!whenChoice || !whenChoice.id) return true;
  const v = choicePickFor(event, whenChoice.id);
  return v == null ? true : (Array.isArray(whenChoice.in) ? whenChoice.in : []).includes(v);
}

// ── TRAVEL MODE — how guests actually arrive ────────────────────────────────
// Host-answered at intake ('drive' | 'fly' | 'mixed'), never inferred from
// distance: the app holds no city coordinates, so any mileage would be invented.
// null means unstated, and unstated is NOT a "no" — silence never removes
// content, it only fails to remove it.
export function travelModeFor(event) {
  const m = event && event.travelMode;
  return (m === 'drive' || m === 'fly' || m === 'mixed') ? m : null;
}

// A task or item tagged `whenMode` appears only for matching arrival modes.
// `{ not: [...] }` drops it for those modes; `{ in: [...] }` keeps it only for
// those. An unstated mode always shows — the same "silence is not a no" rule the
// choice gate uses.
export function modeShown(event, whenMode) {
  if (!whenMode) return true;
  const m = travelModeFor(event);
  if (!m) return true;
  if (Array.isArray(whenMode.not)) return !whenMode.not.includes(m);
  if (Array.isArray(whenMode.in)) return whenMode.in.includes(m);
  return true;
}

// The label the host should read for their arrival mode. Flight vocabulary on a
// road trip is not a cosmetic slip: "who's flying in when" and "airport, hotel,
// transport" describe an event the host is not having, which is the same
// invented-detail failure as a fabricated number. `modeLabel` supplies the
// honest wording per mode; anything unstated keeps the neutral base label.
export function taskLabelFor(event, t) {
  if (!t || !t.modeLabel) return t ? t.label : '';
  const m = travelModeFor(event);
  return (m && t.modeLabel[m]) || t.label;
}

// ── Decision-ANSWERED copy override (never assume an unconfirmed default) ─────
// A schedule/task/vendor entry's instructional text (`what` / `label` / `altToDIY`)
// may carry `copyByAnswer: { [decisionId]: { [answeredValue]: overrideText } }` so
// copy that assumes a specific CHOREOGRAPHY (e.g. retirementParty's Day-of "brief
// the co-conspirator and the lookout" surprise staging) only fires when the host
// actually picked that option. Deliberately distinct from choicePickFor()/
// choiceShown() above (which fall back to the playbook's authored default so
// quantities/visibility render sensibly before any pick is made) — this reads
// ONLY event.foodChoices[decisionId], mirroring the Decisions board's isLocked()
// predicate (picks[d.id], never the default), so an unanswered decision never
// silently reads as though the host chose the default option. No-op (returns
// `base` unchanged) for any entry without `copyByAnswer` — every other
// playbook/entry is unaffected.
export function resolveAnsweredCopy(base, copyByAnswer, event) {
  if (!copyByAnswer) return base;
  const picks = (event && event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices : {};
  for (const decisionId of Object.keys(copyByAnswer)) {
    const answered = picks[decisionId];
    if (answered && copyByAnswer[decisionId][answered] != null) return copyByAnswer[decisionId][answered];
  }
  return base;
}

// ── Food approach: caterer vs the host handling food themselves ───────────────
// THE single-source lever for "is a caterer in scope for this event?" Every caterer
// reference (readiness warnings, vendor suggestions, timeline tips, the reconciliation
// prompt) should read THIS, not re-sniff option strings. The food-approach decision is
// one of a few known ids (sourcing/help/food_style); we only treat a decision as the lever
// if it actually offers a caterer-ish option, then the host "uses a caterer" only when the
// chosen option names one. Returns nulls when the playbook has no such decision (callers
// must NOT gate on a null — never hide a caterer reference on missing data).
// The registry of decision ids that pose the WHOLE-MEAL "who carries the food?"
// question. The wire-proof (decisionWireProof.test.js) enumerates every playbook
// against this list: a new playbook authoring its lever under an unregistered id
// fails the suite with instructions to add it here. Component-level source picks
// (which fish, where to buy crabs, where the injera comes from) deliberately do
// NOT belong here — they choose an ingredient's source, not the meal's owner.
// Order = priority when several coexist: dedicated food decisions outrank
// format/venue framings.
export const FOOD_APPROACH_DECISIONS = [
  // 'help' (a STAFFING decision that merely mentions caterers) must rank AFTER
  // every dedicated food decision: with the old order, help='Fully DIY' silently
  // overrode food_style='Caterer', flipping usesCaterer false and re-adding the
  // food buys the caterer covers (audit F9 — a live-money bug, not board copy).
  'sourcing', 'food_style', 'menu',
  'food_source', 'food_menu', 'food_format', 'food', 'food-model', 'food_model',
  'help', 'grill_master', 'cook', 'format', 'venue',
];
// "Order in" here means the MEAL arrives made (ordered-in trays, takeout) — a
// bare "Order from a market" (buying raw ingredients) must NOT match.
export const CATERER_OPTION_RE = /cater|private chef|\bchef\b|drop-?off|order(ed)?[- ]?in\b|pizza|tray|takeout|take-?out|restaurant/i;
// The community carries the meal (a repast committee, neighbors signing up) — a
// third state beside caterer/host-cooks: the HOST is not buying the food.
// Deliberately NOT bare "potluck": a potluck host still plans and part-buys the
// spread (guest dishes fold in via foodAdd owners), and playbooks that default
// to potluck (Kwanzaa Karamu) author their food lines expecting to exist under
// it — matching it here killed those lists by default (wire-proof, 2026-07-22).
const COMMUNITY_OPTION_RE = /brought by|committee|church|neighbors?|sign.?up/i;
export function foodApproach(event) {
  const pb = getPlaybook(event && event.type);
  const decisions = pb && Array.isArray(pb.decisions) ? pb.decisions : [];
  const picks = (event && event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices : {};
  const nulls = { decisionId: null, pick: null, usesCaterer: null, communityBrings: null, cooking: null };
  const result = (decisionId, pick) => {
    const usesCaterer = CATERER_OPTION_RE.test(String(pick));
    const communityBrings = !usesCaterer && COMMUNITY_OPTION_RE.test(String(pick));
    return { decisionId, pick, usesCaterer, communityBrings, cooking: !usesCaterer && !communityBrings };
  };
  const candidates = FOOD_APPROACH_DECISIONS
    .map((id) => decisions.find((d) => d && d.id === id))
    .filter((d) => d && Array.isArray(d.options) && d.options.some((o) => CATERER_OPTION_RE.test(String(o))));
  // An EXPLICIT host pick on any candidate outranks another candidate's authored
  // default — otherwise a defaulted decision earlier in the list silently vetoes
  // the one the host actually answered.
  for (const dec of candidates) {
    if (picks[dec.id] != null) return result(dec.id, picks[dec.id]);
  }
  for (const dec of candidates) {
    const pick = choicePickFor(event, dec.id);
    if (pick != null) return result(dec.id, pick);
  }
  // No authored lever — honor the shell's generic food answer (foodChoices.sourcing:
  // 'host cooks' | 'caterer' | 'potluck') so the host's food-source choice is never
  // inert on any type (wire-proof contract 2).
  const generic = String(picks.sourcing || '').trim();
  if (generic) return result(null, generic);
  return nulls;
}
// Host has explicitly chosen NOT to use a caterer (cooks/DIY). True only when we can tell.
export const hostIsCooking = (event) => foodApproach(event).usesCaterer === false;
// A caterer IS in scope. True only when we can tell.
export const hostUsesCaterer = (event) => foodApproach(event).usesCaterer === true;

// Day offset from a task's `when` token: 'T-10d' → -10, 'T0' → 0, 'T0 -0:30' → 0
// (the intra-day hours are ignored — only the day phase matters here). null if absent.
function taskOffsetDays(when) {
  const m = /^T(-?\d+)/.exec(String(when || '').trim());
  return m ? parseInt(m[1], 10) : null;
}
// A calm, honest phase label for a task's relative date — no fake calendar dates.
// (2026-07-15: the old note here claimed these labels were "intentionally NOT in
// ChecklistGenerator's PHASE_OFFSET map" to spare the host a behind-verdict — but
// that was the app-wide never-overdue bug wearing a design rationale. The label is
// a LABEL; the due math everywhere now reads the numeric leadDays via lib/taskLead,
// and ChecklistGenerator's dead table is gone.)
function taskPhaseLabel(offset) {
  if (offset == null) return '';
  if (offset >= 0) return 'Day of';
  const d = -offset;
  if (d <= 1) return 'Day before';
  if (d <= 7) return 'Week of';
  if (d <= 14) return '2 weeks out';
  if (d <= 31) return '1 month out';
  return `${Math.round(d / 30)} months out`;
}

// ── DESTINATION-1 — the cross-cutting travel modifier ─────────────────────────
// event.isDestination is a generic, type-independent event field — same
// architecture as kidsCount/dietCounts (playbookFoodPlan reads those regardless
// of which of the 39 playbooks is active). It layers travel content ADDITIVELY
// on top of whatever base type is active, rather than requiring its own type or
// completing the (non-existent) Wellness Retreat playbook. Content here is
// deliberately generic across any occasion — a destination birthday, reunion,
// or anniversary all get the same starting set, editable/removable like any
// other decision or task.
const DESTINATION_DECISIONS = [
  { id: 'dest_lodging', label: 'How are guests staying?', options: ['A room block, no commitment', 'A room block I guarantee fills', 'Guests book on their own', 'A host-arranged Airbnb'], default: 'Guests book on their own', when: 'T-210d', blocks: ['vendors'], optionGates: { 'A room block I guarantee fills': { minGuests: 10 } }, why: 'The no-commitment block is safer — the hotel just holds rooms and releases what doesn’t sell. Guaranteeing a block can get a firmer rate, but you’re on the hook to pay for any rooms that don’t fill.' },
  { id: 'dest_travelmix', label: 'How many guests are traveling in?', options: ['Most guests are local', 'A mix of local and traveling', 'Most guests are traveling'], default: 'A mix of local and traveling', when: 'T-210d', why: 'This is what decides whether lodging, flights, and ground transport need real planning or just a heads-up.' },
  { id: 'dest_transport', label: 'Are you providing group transport?', options: ['Yes, a shuttle or van', 'No, guests self-manage', 'Not sure yet'], default: 'Not sure yet', when: 'T-60d', blocks: ['vendors'], weight: 'high', optionGates: { 'Yes, a shuttle or van': { minGuests: 10 } }, why: 'The late-night ride back from the venue is the single riskiest gap in a destination event — worth deciding early, not day-of.' },
  { id: 'dest_childcare', whenKids: true, label: 'Childcare during the event?', options: ['Hiring childcare', 'A family member is watching kids', 'Kids are part of the event', 'No kids attending'], default: 'Kids are part of the event', when: 'T-90d', why: 'A rotating kids’ program is what actually lets parents be present for toasts and dinner.' },
  // DESTINATION-4: deliberately asks about HEALTH, not age — the research this
  // came from (a meta-analysis on altitude sickness) found no age link at all;
  // heart and lung health is what actually predicts who struggles. The yes-path
  // pacing task (dest_t_health below) fires off this answer via whenChoice.
  { id: 'dest_health', label: 'Any guests with heart or lung conditions?', options: ['Yes', 'No', 'Not sure'], default: 'Not sure', when: 'T-90d', why: 'It’s heart and lung health that struggles with altitude and long, active days — not age by itself. Knowing early lets you pace the schedule instead of scrambling once you’re there.' },
];

// F10 (audit 2026-07-27): a travel-native playbook's OWN lodging decision
// governs — appending the generic twin asked "how are guests staying?" twice
// (Team Retreat 'lodging', Conference 'room_block'). Travel-mix/transport have
// no exact base twins, so only the lodging collision is suppressed.
//
// ── PER-ROW GATING (host ruling: a staycation is a lodging event) ────────────
// One boolean used to admit or refuse all five rows together, so a staycation
// and a fly-in wedding received an identical set. They are not the same event:
//
//   dest_lodging     decided by OVERNIGHT. A staycation is local, nobody travels,
//                    and everyone still sleeps somewhere — the room-block question
//                    is live. This is the row the single flag got most wrong.
//   dest_transport   decided by ARRIVAL. The row's own rationale is "the late-night
//                    ride back from the venue", which needs guests who came from
//                    somewhere. Not a staycation question.
//   dest_travelmix   only sensible when someone is travelling in.
//   dest_health      altitude and long active days — travel-specific.
//   dest_childcare   rides with the travel set (kids ALSO gated by whenKids).
//
// Two new event fields feed this, both ASKED at intake rather than inferred:
// `guestsStayOvernight` and `travelMode` ('drive' | 'fly' | 'mixed'). Distance is
// deliberately not used — the app holds no city coordinates, so any mileage would
// be invented. Absent fields fall back to the old behaviour exactly, so an event
// created before this shipped is byte-identical.
export function destinationDecisionsFor(event, pb) {
  if (!event) return [];
  const isDest = !!event.isDestination;
  // Overnight is TRUE when said, and otherwise inferred only from a real multi-day
  // span — an event running across days has people sleeping somewhere. Undefined
  // stays undefined: on a destination event lodging still shows (unchanged), and on
  // a local single-day event it stays out.
  const spansDays = !!(event.endDate && String(event.endDate).trim() && event.endDate !== event.date);
  const overnight = typeof event.guestsStayOvernight === 'boolean' ? event.guestsStayOvernight : (spansDays || null);
  const mode = event.travelMode || null;

  const baseIds = new Set(((pb && Array.isArray(pb.decisions)) ? pb.decisions : []).map((d) => d && d.id));
  return DESTINATION_DECISIONS.filter((d) => {
    // F10 (audit 2026-07-27): a travel-native playbook's OWN lodging decision
    // governs — appending the generic twin asked "how are guests staying?" twice
    // (Team Retreat 'lodging', Conference 'room_block').
    if (d.id === 'dest_lodging' && (baseIds.has('lodging') || baseIds.has('room_block'))) return false;
    if (d.id === 'dest_lodging') return overnight === true || (isDest && overnight !== false);
    if (!isDest) return false;                 // every remaining row needs travel
    // Nobody flies on a driving trip: the airport-shuttle framing is noise there.
    // 'mixed' and an unstated mode both keep it — silence is not a "no".
    if (d.id === 'dest_transport' && mode === 'drive') return false;
    return true;
  });
}
// DESTINATION-4 — kids-presence predicate (shared). ONE place "are kids actually
// coming?" is read from: the SAME two sources the food plan's portion skew uses —
// a roster's per-guest kids counts (attendanceBand sums them for everyone who
// hasn't said no) in roster mode, the manual event.kidsCount in headcount mode.
// Never inferred from event type; missing data reads as no kids, never a guess.
export function eventHasKids(event) {
  if (!event) return false;
  const rosterMode = Array.isArray(event.guests) && event.guests.length > 0 && event.guestMode !== 'count';
  if (rosterMode) {
    try { return Math.max(0, Math.round(Number(attendanceBand(event).kids) || 0)) > 0; } catch { return false; }
  }
  // F7 reconcile (audit 2026-07-27): the host's ANSWERED "No kids attending"
  // (dest_childcare) beats a stale manual kidsCount stepper — the two kids
  // signals could openly disagree on the board. It never beats roster-summed
  // kids above: guests who SAID they're bringing kids are data, not a guess.
  const answered = (event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices.dest_childcare : null;
  if (answered === 'No kids attending') return false;
  return Math.max(0, Math.round(Number(event.kidsCount) || 0)) > 0;
}
// Vendor categories, same shape as playbook.vendors entries (buildVendorPlan
// reads this shape directly). Deliberately does NOT include flights/airfare —
// guests self-pay for their own travel in the near-universal default (per the
// destination-celebration research), so a host cost line here would invent an
// expense the host isn't actually carrying. Air travel is a tracking concern,
// not a budget line.
export const DESTINATION_VENDOR_CATEGORIES = [
  { category: 'Lodging / Concierge', required: false, altToDIY: 'Guests self-book; share a hotel name and rate instead of negotiating a block', when: 'T-210d', costRange: [800, 4000], costUnit: 'flat' },
  { category: 'Transport', required: false, altToDIY: 'Guests self-manage — rental car or rideshare', when: 'T-60d', costRange: [40, 120], costUnit: 'per guest' },
  { category: 'Childcare / Kids’ Program', required: false, altToDIY: 'A family member watches the kids instead of hired childcare', when: 'T-90d', costRange: [75, 150], costUnit: 'flat' },
];
const DESTINATION_TASKS = [
  // DESTINATION-4: kidsLine rides the same hotel call as the room block — the
  // crib/connecting-room ask is one phone call, not a second task. Appended by
  // playbookChecklist only when kids are actually coming (eventHasKids).
  // CVB UNLOCK (research dossier d19242e2 + spec artifact 8c1a72a7): every US
  // destination city has a visitors bureau funded by hotel tax — free group
  // services almost no host knows exist. Named verified programs: Explore
  // Gwinnett (planning kit, workshops, block sourcing across ~100 hotels),
  // Atlanta CVB (welcome letters, name badges, genealogy charts), Visit
  // Myrtle Beach (dedicated reunion planners). Copy stays at "typically" for
  // unverified cities; completion = the host's own "contacted", never an
  // app-asserted outcome. A courtesy block a CVB sources is the ZERO-risk
  // lodging model — this task deliberately precedes the room-block one.
  { id: 'dest_t_cvb', label: 'Call the destination’s visitors bureau — it’s free (hotel tax pays for it). Ask for: room-block options at 2-3 price points, their group planning kit, welcome bags, and a welcome letter for the program', when: 'T-240d' },
  { id: 'dest_t_lodging', label: 'Confirm the room block or share group hotel options with guests', when: 'T-210d', kidsLine: 'traveling with little kids? Ask about cribs and connecting rooms in the same call (one ask, not two)' },
  // DESTINATION-4: an accessibility WALK, not a checkbox — venues answer "are you
  // accessible?" about the room; the trip fails on everything between the car
  // and the chair. Grounded in accessibility-consultant guidance.
  { id: 'dest_t_access', label: 'Walk the whole guest path, not just the room — door widths, the ground between rooms and the event space, and the distance from parking', when: 'T-90d' },
  // The grid matters on ANY trip — the base label is arrival-neutral so a road
  // trip is not told to track flights it does not have. modeLabel restores the
  // specific wording once the host says how people are getting there.
  { id: 'dest_t_grid', label: 'Build the arrivals/departures grid — who gets in when', when: 'T-60d',
    modeLabel: {
      fly: 'Build the arrivals/departures grid — who’s flying in when',
      drive: 'Build the arrivals/departures grid — who’s driving in when, and roughly how long they’re on the road',
      mixed: 'Build the arrivals/departures grid — who’s flying, who’s driving, and when each lands',
    } },
  // DESTINATION-4: the yes-path of dest_health — appears only when the host
  // ANSWERED yes (whenChoice; the 'Not sure' default keeps it hidden, so an
  // unanswered question never claims a health need). No medical advice beyond
  // "worth a call to their doctor."
  { id: 'dest_t_health', label: 'Pace the schedule for the guests who need it — build in real rest, and if the destination is high-altitude or strenuous, a quick call to their doctor is worth it', when: 'T-60d', whenChoice: { id: 'dest_health', in: ['Yes'] } },
  // whenMode as well as whenChoice: the dest_transport DECISION is dropped for a
  // driving trip, and choiceShown treats an absent pick as "unanswered -> show".
  // Without this gate the board correctly hid the question while the checklist
  // still asked the host to confirm a shuttle plan for a group that is driving.
  { id: 'dest_t_transport', label: 'Confirm the ground-transport plan — shuttle, self-drive, or real rideshare coverage', when: 'T-45d', whenMode: { not: ['drive'] }, whenChoice: { id: 'dest_transport', in: ['Yes, a shuttle or van', 'Not sure yet'] } },
  { id: 'dest_t_info', label: 'Send guests the getting-here info — how to get there, hotel, transport, cutoff dates', when: 'T-30d',
    modeLabel: {
      fly: 'Send guests the getting-here info — airport, hotel, transport, cutoff dates',
      drive: 'Send guests the getting-here info — directions and parking, hotel, cutoff dates',
      mixed: 'Send guests the getting-here info — airport and parking, hotel, transport, cutoff dates',
    } },
  // DESTINATION-4: kids get a real role in the adult event — not the center of
  // it, not parked away from it (Priya Parker's framing). Gated on kids actually
  // coming (whenKids → eventHasKids), never on event type.
  { id: 'dest_t_kidsjob', label: 'Give the kids a real job in the event — welcome-bag duty, the guestbook, a camera to roam with — so they’re part of it, not parked off to the side', when: 'T-14d', whenKids: true },
  { id: 'dest_t_welcome', label: 'Drop welcome bags at the hotel for out-of-town guests', when: 'T-1d' },
];

// ── DESTINATION-5 — the multi-day pacing template ─────────────────────────────
// A destination event isn't one day — guests arrive, celebrate, and leave across
// several. This is the authored arrival / main-event / departure rhythm, exposed
// through the same pure-reader pattern as playbookDayOfChecklist: gated ONLY on
// the host-set isDestination flag (never event type), additive guidance the host
// can ignore, invents nothing about this specific event.
//
// KIDS-CONTENT AUDIT (why the kids lines stay age-generic): the guest data model
// carries kids as COUNTS only — a roster row's g.kids ("Children in Party") and
// the manual event.kidsCount. There is no per-child age, age band, or child row
// anywhere in the model (the invite RSVP form collects a kids count; ages appear
// only in free-text notes, which are never parsed as data). Splitting guidance
// into little kids / school-age / teens would therefore invent ages the host
// never gave us — so kids lines stay age-generic, gated on the same eventHasKids
// predicate as every other kids-conditional line. If per-child ages ever join
// the model, segment here first.
const DESTINATION_PACING = [
  {
    id: 'dest_p_arrival', label: 'Arrival day', focus: 'Keep it easy',
    guidance: 'People land tired and at different times — keep the first night loose. A casual meal guests can drop into whenever they arrive beats anything with a start time, and nothing important should happen tonight: late flights will miss it.',
    kidsLine: 'kids come off a travel day the most worn out — give them room to run around before you expect them at a table',
  },
  {
    id: 'dest_p_main', label: 'Main event day', focus: 'One big thing, a slow morning',
    guidance: 'This is the day everyone came for — keep the morning slow and unscheduled so guests walk into the main event rested, not worn out by a packed lineup of activities before it.',
    kidsLine: 'plan the kids’ downtime too — a rest or pool hour earlier in the day is what gets them (and their parents) through the evening',
    healthLine: 'you said some guests have heart or lung conditions — leave a real rest block between anything active and the main event',
  },
  {
    id: 'dest_p_depart', label: 'Departure day', focus: 'A slow goodbye',
    guidance: 'Checkout times and flights scatter everyone — make the last morning optional. An open breakfast or coffee window people can drift through lets everyone say goodbye without anyone rushing for a plane.',
  },
];
// playbookPacing(event) → { days, count, because } | null. Pure reader over the
// authored template above. A day's kids line joins its guidance only when kids
// are actually coming (eventHasKids — the SAME predicate as the checklist's
// whenKids/kidsLine gates), and the health line only when the host ANSWERED the
// dest_health question Yes (same whenChoice gate as dest_t_health — the
// 'Not sure' default never reads as a health need).
export function playbookPacing(event) {
  if (!event || !event.isDestination) return null;
  const kidsComing = eventHasKids(event);
  const healthYes = choiceShown(event, { id: 'dest_health', in: ['Yes'] });
  const days = DESTINATION_PACING.map((d) => ({
    id: d.id,
    label: d.label,
    focus: d.focus,
    guidance: d.guidance
      + (d.kidsLine && kidsComing ? ` — ${d.kidsLine}` : '')
      + (d.healthLine && healthYes ? ` — ${d.healthLine}` : ''),
  }));
  return {
    days,
    count: days.length,
    because: 'a destination event runs across days — this rhythm keeps guests rested instead of scheduled wall-to-wall',
  };
}

// ── Host checklist projection (food sourcing → the task list) ─────────────────
// playbookChecklist(event, asOf) → ChecklistGenerator-shaped rows[] projecting the
// playbook's authored operational `tasks` into the host "what's left to do" list,
// filtered by the SAME choiceShown() predicate the spread + budget use — so a food/
// sourcing choice reshapes the TASKS, not just the menu. Pure + soonest-due first.
// The row's done-state is intentionally left to effectiveDone() at the render seam
// (single-source task doctrine — derive, don't store).
export function playbookChecklist(event, asOf) {
  if (!event) return [];
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.tasks) || !playbook.tasks.length) return [];
  const dte = daysToEvent(event.date, asOf);
  if (dte === null) return [];

  // Food-approach lever — when the host has explicitly chosen NOT to use a caterer, the
  // "book the caterer / headcount to caterer" tasks are moot. Single source: read foodApproach,
  // never re-sniff the decision here. Only fires when usesCaterer === false (a real decision
  // exists and isn't a caterer); null/undecided leaves every task in place.
  const fa = foodApproach(event);
  const dropCaterer = fa.usesCaterer === false;
  const rows = [];
  // DESTINATION-4: kids-conditional content reads ONE predicate (eventHasKids —
  // roster kids or event.kidsCount, same sources as the food plan's portion skew).
  const kidsComing = eventHasKids(event);
  // DESTINATION-1: generic travel tasks, additive on top of the base playbook's
  // own — never gating on type, only on the host-set isDestination modifier.
  const taskList = event.isDestination ? [...playbook.tasks, ...DESTINATION_TASKS] : playbook.tasks;
  for (const t of taskList) {
    if (!t || !t.id || !t.label) continue;
    // Choice gate — a task tagged whenChoice appears only for the matching pick.
    if (!choiceShown(event, t.whenChoice)) continue;
    // Arrival-mode gate — a task tagged whenMode appears only for matching modes.
    // Needed alongside the choice gate: when a destination DECISION is dropped
    // for a mode, choiceShown sees no pick and treats it as unanswered, so the
    // dependent task would survive the very gate that removed its question.
    if (!modeShown(event, t.whenMode)) continue;
    // Kids gate — a task tagged whenKids appears only when kids are actually coming.
    if (t.whenKids && !kidsComing) continue;
    // Caterer-action gate — drop booking/headcount-to-caterer tasks when the host cooks.
    // Keep decision-framing tasks ("…or confirm the host-cooks plan", "vs a caterer").
    if (dropCaterer && /cater(er|ing)/i.test(t.label) && !/\b(vs|instead|or confirm|host[- ]?cook|diy)\b/i.test(t.label)) continue;
    const offset = taskOffsetDays(t.when); // days relative to event (≤ 0 = before)
    const dueInDays = offset == null ? null : dte + offset;
    const eventDay = offset != null && offset >= 0;
    rows.push({
      id: `pbt-${event.id}-${t.id}`,
      // kidsLine — a sub-line that only exists when kids are coming (the crib/
      // connecting-room ask on the lodging call). Tasks without one are untouched.
      // taskLabelFor picks the arrival-mode wording BEFORE the answered-copy
      // override, so a task can vary by both without either clobbering the other.
      task: resolveAnsweredCopy(taskLabelFor(event, t), t.copyByAnswer, event)
        + (t.kidsLine && kidsComing ? ` — ${t.kidsLine}` : ''),
      // 'event-day' buckets a T0 task under THE DAY tab; everything else is planning.
      category: eventDay ? 'event-day' : 'planning',
      phase: t.phase || 'planning',
      week: taskPhaseLabel(offset),
      // The STABLE lead — days relative to the event, which never decays. `week` is prose
      // and `dueInDays` is a snapshot taken at generation time; persisting either as the
      // source of truth is how "nothing was ever overdue" happened (see lib/taskLead.js).
      leadDays: offset,
      owner: '', // a solo host owns everything — no owner chip clutter
      dueInDays,
      provenance: { source: `${playbook.type} playbook`, taskId: t.id },
    });
  }
  // Food-approach: when the host is using a caterer, surface the one task that choice creates —
  // so the food CHOICE visibly reshapes "what's left" (it was previously inert in the task list;
  // the cook choice already recedes caterer tasks via the dropCaterer gate above). Deduped so a
  // playbook that already authors a caterer task isn't doubled.
  if (fa.usesCaterer === true && !rows.some((r) => /cater/i.test(r.task))) {
    const off = -7;
    rows.push({
      id: `pbt-${event.id}-fa-caterer`,
      task: 'Confirm your caterer and send them the final headcount',
      category: 'planning', phase: 'food', week: taskPhaseLabel(off), owner: '',
      // 2026-07-15: persist the numeric lead like every other row above — this task
      // carried only the prose `week`, so lib/taskLead's readers fell back to the
      // lossy label bucket instead of the authored T-7d lead.
      leadDays: off,
      dueInDays: dte + off,
      provenance: { source: `${playbook.type} playbook`, taskId: 'fa-caterer', derived: 'food-approach' },
    });
  }
  // Soonest-due first; undated tasks sink to the bottom in authored order.
  rows.sort((a, b) => {
    const av = a.dueInDays == null ? Infinity : a.dueInDays;
    const bv = b.dueInDays == null ? Infinity : b.dueInDays;
    return av - bv;
  });
  return rows;
}

// ── Reader ────────────────────────────────────────────────────────────────────
// playbookTasks(event, asOf) → OperationalTask[]  (pure; soonest-due first).
// Purchases blocked by an unresolved prerequisite decision are suppressed.

// ── GOVERNED PURCHASE PROVENANCE (Phase 5A-2) ────────────────────────────────
// The single seam between governed knowledge and the playbook engine. Scope is
// deliberately one field: a purchase's `provenance` block. It never touches
// unitCostRange, qty, costFactors, decisions, ranking or reasoning.
//
// Failure is a no-op by construction: effectiveValue() degrades to the authored
// value, and any throw here falls back to the authored block rather than breaking
// a plan render.
export function purchaseProvenance(playbook, purchase) {
  if (!playbook || !purchase || !purchase.id) return purchase && purchase.provenance;
  try {
    const eff = effectiveValue(playbook, `${purchase.id}.provenance`, null);
    return (eff && eff.value !== undefined) ? eff.value : purchase.provenance;
  } catch (_e) {
    return purchase.provenance;
  }
}
// ─── GOVERNED PURCHASE — the wire from published knowledge to the host ────────
//
// PHASE 5C.10. Until now the ONLY governed read on the host path was the
// provenance block above, and nothing rendered it: hostv2 read `unitCostRange`
// and `qtyPerGuest` straight off the authored playbook, so a published KCR
// changed what Admin's Runtime Preview showed and nothing a host ever saw.
// The bake, the snapshot, the resolver and the lineage all worked; the last
// seam was missing.
//
// This closes it in ONE place. Every host-visible purchase field is resolved
// through effectiveValue (override -> published snapshot -> authored), so the
// downstream sizing, pricing and copy inherit governance without any surface
// having to know governance exists. hostv2 needs no change to get correct
// NUMBERS — only to show the provenance note, which is a separate choice.
//
// SAFE BY CONSTRUCTION: effectiveValue degrades to the authored value when
// nothing is published, so with an empty snapshot this returns the purchase
// unchanged (identity). That is why it can sit on the hot path.
// PHASE 5E.2: `priceLadder` and `servingGuide` join the governed set because they
// have a VERIFIED runtime consumer — resolveBulkPurchase() (index.js:149) reads them
// off the GOVERNED purchase and produces `bulkRecommendation`, the dozen / half
// bushel / bushel figure the host actually buys against.
//
// This is the honest lever for threshold economics. `p_crabs.qtyPerGuest` is refused
// because a per-guest rate cannot move a bushel; the LADDER can, because it is what
// the bushel maths reads. Governing the rule instead of the output.
const GOVERNED_PURCHASE_FIELDS = ['unitCostRange', 'qtyPerGuest', 'qtyFlat', 'provenance',
  'priceLadder', 'servingGuide'];

export function governedPurchase(playbook, purchase) {
  if (!playbook || !purchase || !purchase.id) return purchase;
  let out = purchase;
  for (const field of GOVERNED_PURCHASE_FIELDS) {
    try {
      const eff = effectiveValue(playbook, `${purchase.id}.${field}`, null);
      // Only ADOPT a governed value: 'authored' means nothing is published for
      // this field, and re-assigning it would be a no-op that costs an allocation.
      if (eff && eff.source !== 'authored' && eff.value !== undefined) {
        if (out === purchase) out = { ...purchase };
        out[field] = eff.value;
        // Record WHICH fields governance supplied, so a surface can be honest
        // about the difference between an authored default and a published fact.
        out._governed = [...(out._governed || []), field];
      }
    } catch (_e) { /* a resolver failure must never break the shopping list */ }
  }
  return out;
}


export function playbookTasks(event, asOf) {
  if (!event) return [];
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.purchases)) return [];
  const dte = daysToEvent(event.date, asOf);
  if (dte === null) return [];

  // Size purchases off sizingGuests (the plan-to ceiling the FOOD PLAN uses), not
  // guestCountOf (RSVP-blind, counts declined). A buy-task deep-links to its food row,
  // so both must show the same quantity — "Buy ice 18 lbs" over a 12-lb line was the bug
  // (audit 2026-07-22).
  const guests = sizingGuests(event, playbook);
  const gc = guestCountResolved(event);
  const di = dietaryResolved(event);
  // Already bought (checked off) or swapped out → no longer a task, so clearing the
  // CTA (buying the item) advances the next-step to the next thing.
  const got  = (event.foodGot  && typeof event.foodGot  === 'object') ? event.foodGot  : {};
  const skip = (event.foodSkip && typeof event.foodSkip === 'object') ? event.foodSkip : {};
  // SAME stand-down gate as playbookFoodPlan's list: when someone else carries the
  // meal (caterer or community/committee), food lines are not the host's buys — the
  // task generator was still emitting "Buy 28.5 lbs of chicken" on a repast whose
  // food list had stood down (audit 2026-07-22, W8 follow-through).
  const _tfa = foodApproach(event);
  const _tFoodOffPlate = _tfa.usesCaterer === true || _tfa.communityBrings === true;
  const tasks = [];

  for (const p of playbook.purchases) {
    if (got[p.id] || skip[p.id]) continue; // done / swapped out → advance past it
    if (_tFoodOffPlate && p.category === 'food') continue; // the community/caterer carries it
    const offset = buyOffsetDays(p.buyAt);
    if (offset === null) continue;
    const dueInDays = dte + offset;
    // Window gate — eligible today..WINDOW_LEAD ahead. An OVERDUE buy (past its window) still surfaces
    // while the event is upcoming (dte > 0) — it's recoverable, and silently dropping it is the "nothing
    // needs you / I'm watching" lie. On event day+ (dte <= 0) the day-of run-of-show owns the timeline,
    // so we don't nag past-due there. dueLabel renders overdue calmly as "today" (action-first, no
    // "behind" verdict — the host lens forbids a verdict).
    if (dueInDays > WINDOW_LEAD) continue;
    if (dueInDays < 0 && dte <= 0) continue;
    // Decision-first gate — suppress a purchase whose prerequisite decision
    // (final count / dietary) is unresolved. The decision surfaces instead
    // via topPlaybookDecision().
    if (purchaseGate(p, playbook, gc, di)) continue;

    const qty = resolveQuantity(p, guests);
    const name = shortItem(p.item);
    const unit = shortUnit(p.unit, qty);
    const qtyClause = qty === null ? '' : ` — ${qty}${unit ? ' ' + unit : ''}`;
    const rel = dueLabel(dueInDays);

    tasks.push({
      id: `pb-${event.id}-${p.id}`,
      kind: 'operational',
      category: 'operational',
      phase: p.category || 'shopping',
      item: name,
      // e.g. "Buy ice — 18 lbs today"
      title: `Buy ${name.toLowerCase()}${qtyClause} ${rel}`,
      quantity: qty,
      unit,
      dueInDays,
      dueLabel: rel,
      essential: !!p.essential,
      level: p.essential && dueInDays <= 1 ? 'attention' : 'neutral',
      consequence:
        p.note ||
        `${p.qtyPerGuest != null ? `~${p.qtyPerGuest}/guest × ${guests} guests. ` : ''}A small buy now keeps the day-of calm.`,
      // NAME THE ACT, NOT THE TRIP (host ruling 2026-07-28: CTAs are the action
      // needed). "Take me to it" described the host moving; the list is the object
      // and 'Open the list' is the app's own idiom for this destination.
      primaryCta: 'Open the list',
      // Deep-link: land on the food plan AND target this exact line (foodFocus = the
      // purchase id, same id the food-plan list uses) so the host can price/check it.
      primaryRoute: { eventId: event.id, tab: 'Planning', foodFocus: p.id },
      eventId: event.id,
      owner: 'host',
      provenance: { source: `${playbook.type} playbook`, buyAt: p.buyAt },
      // Wave-2w GROUNDING — is this item's per-guest QUANTITY backed by a real portion/drink
      // source (vs a trade heuristic)? Surfaced so the buy row can show sourced quantities.
      // PHASE 5A-2 — governed provenance, authored fallback. effectiveValue()
      // resolves override -> published snapshot -> authored, in that order; with an
      // empty snapshot and no override it returns the authored block unchanged, so
      // this line is a no-op until governance has published something for this field.
      qtyGrounded: isGroundedItemQty(purchaseProvenance(playbook, p)),
    });
  }

  // Rank: IN-WINDOW items (due today/soon, dueInDays >= 0) lead — a due-today essential must not be
  // buried under stale overdue catch-up. OVERDUE items (< 0) rank AFTER, so they still surface (fixing
  // the silent drop) but only top the list when nothing is due in the current window. Within each group:
  // soonest/most-overdue first, then essential. The cascade takes [0].
  tasks.sort((a, b) => {
    const ao = a.dueInDays < 0 ? 1 : 0, bo = b.dueInDays < 0 ? 1 : 0;
    return ao - bo || a.dueInDays - b.dueInDays || Number(b.essential) - Number(a.essential);
  });
  return tasks;
}

// The single top operational candidate for an event (or null).
export function topPlaybookTask(event, asOf) {
  const list = playbookTasks(event, asOf);
  return list.length ? list[0] : null;
}

// The NEXT operational buy that isn't due yet — the "next turn" preview for a calm state, GPS-style:
// "next up: buy the proteins (18 lb), in 3 days". Looks PAST the actionable window (dueInDays > WINDOW_LEAD)
// so it complements topPlaybookTask (which owns what's due now). Blocked/bought/swapped/undated skipped;
// returns the soonest such buy or null (genuinely nothing ahead ⇒ true "all set").
export function nextUpcomingTask(event, asOf) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.purchases)) return null;
  const dte = daysToEvent(event.date, asOf);
  if (dte === null) return null;
  // Size purchases off sizingGuests (the plan-to ceiling the FOOD PLAN uses), not
  // guestCountOf (RSVP-blind, counts declined). A buy-task deep-links to its food row,
  // so both must show the same quantity — "Buy ice 18 lbs" over a 12-lb line was the bug
  // (audit 2026-07-22).
  const guests = sizingGuests(event, playbook);
  const gc = guestCountResolved(event);
  const di = dietaryResolved(event);
  const got  = (event.foodGot  && typeof event.foodGot  === 'object') ? event.foodGot  : {};
  const skip = (event.foodSkip && typeof event.foodSkip === 'object') ? event.foodSkip : {};
  // Dead-CTA doctrine (2026-07-07): a route must target an item its DESTINATION
  // renders. playbookFoodPlan filters/reshapes purchases by the host's choices,
  // so the preview must only name ids present in that SAME rendered list —
  // otherwise the deep link lands on nothing (Todd's 'See what's next' report).
  let renderedIds = null;
  try {
    const fp = playbookFoodPlan(event);
    if (fp && Array.isArray(fp.list)) renderedIds = new Set(fp.list.filter(x => x && !x.skipped).map(x => x.id));
  } catch { renderedIds = null; }
  let best = null;
  for (const p of playbook.purchases) {
    if (got[p.id] || skip[p.id]) continue;
    if (renderedIds && !renderedIds.has(p.id)) continue; // not on the rendered plan → no route to it
    const offset = buyOffsetDays(p.buyAt);
    if (offset === null) continue;
    const dueInDays = dte + offset;
    if (dueInDays <= WINDOW_LEAD) continue;          // due now/soon → not a "coming up" preview
    if (purchaseGate(p, playbook, gc, di)) continue; // blocked on a prerequisite decision
    if (!best || dueInDays < best.dueInDays) {
      const name = shortItem(p.item);
      const qty = resolveQuantity(p, guests);
      const unit = shortUnit(p.unit, qty);
      const qtyClause = qty === null ? '' : ` (${qty}${unit ? ' ' + unit : ''})`;
      best = { label: `buy ${name.toLowerCase()}${qtyClause}`, dueInDays, dueLabel: dueLabel(dueInDays), essential: !!p.essential, id: p.id, route: { tab: 'Planning', foodFocus: p.id } };
    }
  }
  return best;
}

// The blocking decision that should surface INSTEAD of a purchase (Pattern 001).
// Returns a decision candidate only when a prerequisite decision is unresolved
// AND it actually blocks an in-window purchase — so it never nags about a fuzzy
// count when there is nothing imminent to buy. Priority: a locked guest count is
// the master quantity input, so it surfaces before dietary.
export function topPlaybookDecision(event, asOf) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.purchases)) return null;
  const dte = daysToEvent(event.date, asOf);
  if (dte === null) return null;

  const gc = guestCountResolved(event);
  const di = dietaryResolved(event);
  if (gc.resolved && di.resolved) return null;

  // Only surface a decision that blocks something in the current buy window.
  let blocksCount = false;
  let blocksDietary = false;
  for (const p of playbook.purchases) {
    const offset = buyOffsetDays(p.buyAt);
    if (offset === null) continue;
    const dueInDays = dte + offset;
    if (dueInDays < 0 || dueInDays > WINDOW_LEAD) continue;
    const g = purchaseGate(p, playbook, gc, di);
    if (g === 'guestCount') blocksCount = true;
    if (g === 'dietary') blocksDietary = true;
  }

  // Stage-awareness (Sprint 64 — host next-step ranking): a PLANNED count is enough
  // to shop to when the event is still far out. Only press to LOCK the *final* count
  // (pending RSVPs) once the event is near — otherwise this premature "confirm final
  // guest count" outranks the actual next task (book caterer, buy non-perishables).
  // A genuine 'no-count' still blocks at any range — you can't size anything.
  const FINAL_LOCK_LEAD = 10;
  if (blocksCount && gc.reason === 'pending-rsvps' && dte > FINAL_LOCK_LEAD) {
    blocksCount = false;
  }

  if (blocksCount) {
    const pendingMsg = gc.reason === 'pending-rsvps'
      ? `${gc.pending} guest${gc.pending === 1 ? '' : 's'} still pending — chase the maybes, then buy to the confirmed count.`
      : 'Add a final guest count so every quantity is sized before you shop.';
    return {
      id: `pb-decision-${event.id}-guestCount`,
      kind: 'decision',
      category: 'decision',
      decision: 'guestCount',
      title: 'Confirm final guest count',
      consequence: `Food, drinks, ice, and rentals all scale from headcount. ${pendingMsg}`,
      level: 'attention',
      // ── Q1b, REVIEW BOARD 2026-07-29: THE NUMBER GOES IN THE CTA ──────────
      // Grafted from frame 6 (STAGE), the one pattern the board took from the
      // seven rejected board models: its CTA reads "Set catering to 41", not
      // "Set the count". A button carrying the actual figure is more truthful
      // than a generic verb — the host can see what they are agreeing to before
      // they tap, which is the same propose-don't-ask rule the hero already
      // follows for decisions.
      // The ACT is deliberately unchanged: the pending case still chases, it
      // just says how many. Swapping it to "Set the count to N" would quietly
      // change what the button DOES (settle instead of chase) under cover of a
      // copy graft. The no-count case has no number to carry, so it keeps its
      // plain label rather than inventing one.
      primaryCta: gc.reason === 'pending-rsvps'
        ? (gc.pending > 0 ? `Chase ${gc.pending} ${gc.pending === 1 ? 'maybe' : 'maybes'}` : 'Chase RSVPs')
        : 'Set guest count',
      // Deep-link doctrine: the count decision RESOLVES at the count entry/lock
      // hero (guests-entry anchor), never at the tab top.
      primaryRoute: { eventId: event.id, tab: 'Guests', focusField: 'guests-entry' },
      eventId: event.id,
      owner: 'host',
      provenance: { source: `${playbook.type} playbook`, rule: 'decision-first: count before quantity' },
    };
  }

  if (blocksDietary) {
    return {
      id: `pb-decision-${event.id}-dietary`,
      kind: 'decision',
      category: 'decision',
      decision: 'dietary',
      title: 'Collect dietary restrictions & allergies',
      consequence: 'Lock the menu only after allergies are in — one unflagged allergy is a safety issue, not a courtesy. Collect from your guest list before buying food.',
      level: 'attention',
      primaryCta: 'Collect dietary needs',
      // A host notes allergies inline on the food plan (count-based; guests self-report
      // the rest via RSVP) — routing them to the roster dead-ends on a faces list with
      // no allergy field. A planner collects per-guest on the roster. Route per persona.
      primaryRoute: audiencePersona(event) === 'host'
        ? { eventId: event.id, tab: 'Planning', focusField: 'food-plan' }
        : { eventId: event.id, tab: 'Guests', focusField: 'guest-roster' },
      eventId: event.id,
      owner: 'host',
      provenance: { source: `${playbook.type} playbook`, rule: 'decision-first: dietary before menu/food' },
    };
  }

  return null;
}

// ── Run-of-Show seeding (Sprint 55H-B1) ──────────────────────────────────────
// Surface authored playbook execution intelligence through the EXISTING Event
// Day Schedule (event.ros) — no new engine, surface, or storage (Pattern 006/007).
// Derives a DAY-OF run-of-show from the playbook's authored day-of schedules
// (cooking/preparation/setup/cleanup), anchored on the event's time of day.
// Returns ros-shaped segments tagged { source:'playbook', generated:true,
// playbookType } (Rule 2). Derived at read-time, never persisted, so a playbook
// timing change flows through automatically (Rule 5). Pre-day shopping
// (purchasing, T-1d/T-3d) is intentionally excluded — it's planning, not day-of.
// ONE definition — lib/eventWhen owns "when does this event start?" so the INVITE
// can read the same answer without importing the playbook engine (and without a
// second parser drifting away from this one).
const ROS_ANCHOR_HOUR = ANCHOR_HOUR;
// A precise start time (event.startTime) anchors the run-of-show to the exact minute,
// overriding the coarse timeOfDay bucket. Tolerant of "18:30", "6:30 PM", "7:00 PM".
// Returns minutes-since-midnight, or null when unset/unparseable (→ fall back to bucket).
const parseRosStartMin = parseStartMinutes;   // lib/eventWhen — one parser, shared with the invite
// kind → segment type; both 'cooking' (Dinner Party) and 'preparation' (others).
const ROS_SCHEDULE_KINDS = [
  { key: 'cooking', segType: 'event' },
  { key: 'preparation', segType: 'event' },
  { key: 'setup', segType: 'prep' },
  // THE EVENT ITSELF (host ruling 2026-07-28). Until now the day board covered
  // the hours BEFORE the anchor (setup, 105 authored rows, every one of them
  // pre-anchor) and the hours AFTER it (cleanup, starting T0+4h) — and nothing
  // in between. A reunion host got "arrive early… ice the coolers… stage the
  // games" and then, four hours later, "start consolidating food": no meal, no
  // group photo, no toast, no send-off. `program` is the missing key. Rows sort
  // by their own offset, so a beat lands between setup and cleanup with no new
  // ordering logic.
  { key: 'program', segType: 'event' },
  { key: 'cleanup', segType: 'prep' },
];

// A day-of `when` token → minutes offset from the anchor. null for pre-day /
// non-clock tokens (T-1d, T-3d, 'during', 'ongoing') so they're skipped.
export function rosWhenOffset(when) {
  const w = String(when || '').trim();
  if (/^T-\d+d/i.test(w)) return null;          // pre-day shopping/prep
  if (/during|ongoing/i.test(w)) return null;   // not a point in time
  // POST-EVENT day offsets ("T0 +5d" — the recap/survey follow-up) are NOT
  // day-of cues. The hour parser below used to read "+5d" as "+5h" and land
  // the retreat's day-5 recap FIVE HOURS into day 1 (found by the day-dimension
  // sweep, 2026-07-28). Follow-ups live on the checklist, not the day board.
  if (/^T0\s*[+-]\s*\d+\s*d\b/i.test(w)) return null;
  if (/guests?\s*arrive/i.test(w)) return 0;    // at the anchor
  // THE UNIT SUFFIX IS DATA, NOT DECORATION (day-board audit 2026-07-28).
  // The old pattern was /^T0\s*([+-])\s*(\d+)(?::(\d+))?\s*h?/ — the trailing
  // `h?` was OPTIONAL AND IGNORED, so every authored minute cue was read as
  // hours: 'T0-120m' (two hours before) became 120 HOURS before, and the day
  // board told a host arriving today that setup was "~120h before guests
  // arrive". Ten cues across six playbooks were wrong (reunion's whole setup
  // block, sweet16, board meeting, engagement, gender reveal, retirement).
  // A fractional hour was truncated the same way: 'T0+4.5h' parsed as 4h.
  // Now the suffix decides: `m` = minutes, `h`/bare = hours, `H:MM` = both,
  // and a decimal hour keeps its remainder.
  const m = /^T0\s*([+-])\s*(\d+(?:\.\d+)?)\s*(?::(\d{1,2}))?\s*([hm])?/i.exec(w);
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    const value = parseFloat(m[2]);
    if (!Number.isFinite(value)) return null;
    const colonMin = m[3] != null ? parseInt(m[3], 10) : null;
    const unit = (m[4] || 'h').toLowerCase();
    // 'T0-1:30' — hours and minutes spelled out with a colon.
    if (colonMin != null) return sign * Math.round(value * 60 + colonMin);
    // 'T0-90m' — minutes mean minutes.
    if (unit === 'm') return sign * Math.round(value);
    // 'T0+4.5h' — hours, remainder kept.
    return sign * Math.round(value * 60);
  }
  // PROSE DAY-OF TOKENS (day-model audit 2026-07-28). Some playbooks author the
  // day in words rather than offsets — 'T0 morning', 'T0 after the meal'. The
  // bare-T0 fallback below swallowed every one of them and returned 0, so Sunday
  // Dinner stacked SEVEN distinct moments on the anchor minute: grace, plates,
  // to-go plates, leftovers and the kitchen reset all at once, and the board
  // flagged its own day as seven overlapping moments. Third instance today of
  // one root cause — a token vocabulary the parser only half understood.
  // These are approximations by nature, exactly like the numeric offsets, and
  // they order the day correctly instead of collapsing it.
  const PROSE = [
    [/^T0\s+morning\b/i, -5 * 60],
    [/^T0\s+(pre-meal|before guests)\b/i, -30],
    [/^T0\s+at the table\b/i, 0],
    [/^T0\s+after the meal\b/i, 90],
    [/^T0\s+end of day\b/i, 4 * 60],
  ];
  for (const [re, mins] of PROSE) if (re.test(w)) return mins;
  // NB: 'T0 last day' deliberately falls through to the bare-T0 catch below and
  // returns 0. It is NOT a day-1 cue, but the row has to EXIST before the
  // multi-day pass further down can promote it to the last day (it finds the row
  // by segment text and shifts its day/_min). Returning null here deleted the
  // row outright and broke that promotion — caught by rosDayProof.
  if (/^T0\b/i.test(w)) return 0;               // bare T0 → anchor
  return null;
}

const rosPad2 = (n) => String(((n % 24) + 24) % 24).padStart(2, '0');

// "Day 2 afternoon" → { day: 2, bucket: 'afternoon' } — the multi-day agenda's
// authored vocabulary (P1 ROS day dimension). Bucket optional ("Day 3" alone).
// Returns null for anything else so single-day tokens never mis-parse.
function rosDayToken(when) {
  const m = /^Day\s+(\d{1,2})\b\s*(morning|midday|afternoon|evening|night)?/i.exec(String(when || '').trim());
  if (!m) return null;
  const day = parseInt(m[1], 10);
  if (!(day >= 1 && day <= 14)) return null;
  return { day, bucket: m[2] ? m[2].toLowerCase() : null };
}
// Ordering hour per bucket — ANCHOR_HOUR's own vocabulary plus midday, used
// ONLY to order rows within a day (never printed as a clock).
const ROS_DAY_BUCKET_HOUR = { morning: 10, midday: 12, afternoon: 15, evening: 18, night: 19 };

/**
 * WHAT RUNS ALL THROUGH THE DAY (host directive 2026-07-28: "the checklists and
 * full agenda seem woefully inadequate on details of the day's responsibility
 * to make sure nothing is forgotten or missed throughout the event").
 *
 * The playbooks already author these — 30 rows across 30 event types, one per
 * type — as `when: 'during'` / `'ongoing'`. rosWhenOffset correctly returns null
 * for them (they are not a point in time), and the run-of-show builder then
 * `continue`d past them. So every one was silently discarded and NONE of it ever
 * reached a host. What was being thrown away is not filler:
 *     "Keep the fryer attended at all times"            (fishFry — safety)
 *     "Keep the burner attended at all times"           (lowCountryBoil — safety)
 *     "Point-person keeps water + food flowing and watches the groom"
 *     "Coordinator distributes tip envelopes; collects gifts/cards to a secured spot"
 *     "Log each gift → giver as the bride opens it"
 *     "Keep cold food on ice; bag cans for recycling as you go"
 *
 * A continuous responsibility has no clock BY NATURE, so it can never join the
 * timed spine — it belongs beside it, as a standing band the host can tick off.
 * Same gating as the timed rows (caterer lever, answer-resolved copy), same
 * both-spellings tolerance.
 *
 * @returns {Array<{id,segment,kind,source,generated,playbookType}>} — [] when the
 *          playbook authors none. Never null-per-row, never invented.
 */
export function playbookDuringCues(event) {
  if (!event) return [];
  const playbook = getPlaybook(event.type);
  if (!playbook || !playbook.schedules) return [];
  const cueText = (entry) => (entry && (entry.what != null ? entry.what : entry.do)) || '';
  const dropCatererCue = foodApproach(event).usesCaterer === false;
  const out = [];
  let seq = 0;
  for (const kind of ROS_SCHEDULE_KINDS) {
    const list = Array.isArray(playbook.schedules[kind.key]) ? playbook.schedules[kind.key] : [];
    for (const entry of list) {
      if (!/^(during|ongoing)\b/i.test(String((entry && entry.when) || '').trim())) continue;
      if (dropCatererCue && /cater(er|ing)/i.test(cueText(entry))) continue;
      const segment = resolveAnsweredCopy(cueText(entry), entry.copyByAnswer, event);
      if (!String(segment || '').trim()) continue;
      out.push({
        id: `pb-during-${event.id}-${kind.key}-${seq++}`,
        segment,
        kind: kind.key,
        type: kind.segType,
        owner: 'Host',
        source: 'playbook',
        generated: true,
        playbookType: playbook.type,
      });
    }
  }
  return out;
}

export function playbookRunOfShow(event) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook || !playbook.schedules) return null;
  // ── AN INVENTED CLOCK, SENT TO VENDORS (fixed 2026-07-14) ──────────────────
  // This used to be:
  //     const bucketHour = ROS_ANCHOR_HOUR[tod] != null ? ROS_ANCHOR_HOUR[tod] : ROS_ANCHOR_HOUR.afternoon;
  //     const baseMin = startMin != null ? startMin : bucketHour * 60;
  // Two inventions stacked. With NO start time and NO time-of-day, the entire day silently
  // anchored to 15:00 — a bare constant nobody chose. And with only a coarse bucket, the
  // host said "afternoon" and the app said "3:00 PM", manufacturing a precision they never
  // gave. Those clock strings then printed as plain times (indistinguishable from ones the
  // host typed), were SENT TO VENDORS in the brief (vendorBrief.js), and were frozen into
  // `event.ros` the moment the host edited any single row.
  //
  // eventWhen.js already models this honestly and has since it was written — its own
  // comment says "Rendering '3:00 PM' from 'afternoon' would be inventing a precision they
  // never gave" — and this function simply never called it.
  //
  // The ORDER of a run of show is real knowledge (the playbook authored it, T0±h). The
  // CLOCK is not, unless the host gave us one. So we keep the order and only claim a clock
  // when we have earned it:
  //
  //   anchorSource 'exact'  → the host set a real start time. Clock times, as before.
  //   anchorSource 'bucket' → only "afternoon". We know the shape of the day, not its hours:
  //                           rows carry `time: null` and a relative label ("2h before").
  //   anchorSource null     → we know neither. Same as bucket — relative only.
  //
  // Surfaces then offer the host a grounded do-it-for-me: "You said afternoon — plan around
  // 3:00 PM?" — a PROPOSAL they accept, which writes event.startTime, after which every row
  // is a real time because it descends from a real decision.
  const tod = String(event.timeOfDay || '').toLowerCase();
  const startMin = parseRosStartMin(event.startTime);
  // RE-AUDIT HOLE (2026-07-14, fresh-eyes pass): this used to treat ANY parseable startTime
  // as 'exact' — but a new event now arrives with a DERIVED default (startTimeSource:
  // 'derived', the app's own grounded guess). Counting it as exact meant the Day view printed
  // unlabeled clock times descending from OUR default, the helper brief shipped those hours
  // OUTWARD with no strip (the vendor brief strips; the helper brief did not), and the
  // Day-stage confirm affordance — guarded on rows lacking times — became unreachable. A
  // derived hour anchors the ORDER (it is the best available anchor) but claims no clock
  // until the host confirms it. Same rule as the invitation and the vendor brief.
  const _derived = String(event.startTimeSource || '') === 'derived';
  const anchorSource = (startMin != null && !_derived) ? 'exact' : (ROS_ANCHOR_HOUR[tod] != null || startMin != null ? 'bucket' : null);
  // The bucket's hour is still used to ORDER and to seed the host's proposal — it is just
  // never printed as if it were a fact.
  const bucketHour = ROS_ANCHOR_HOUR[tod] != null ? ROS_ANCHOR_HOUR[tod] : ROS_ANCHOR_HOUR.afternoon;
  const baseMin = startMin != null ? startMin : bucketHour * 60;
  const exact = anchorSource === 'exact';   // derived is never exact — see above

  // "2h before guests arrive" / "at guests arrive" / "1h30m in" — true regardless of clock.
  const relLabel = (off) => {
    if (off === 0) return 'as guests arrive';
    const a = Math.abs(off);
    const h = Math.floor(a / 60); const m = a % 60;
    const span = [h ? `${h}h` : null, m ? `${m}m` : null].filter(Boolean).join(' ');
    return off < 0 ? `${span} before guests arrive` : `${span} in`;
  };

  // ONE CUE, TWO SPELLINGS (day-board audit 2026-07-28). Every playbook but one
  // authors a schedule entry as `what:`; reunion.js authors all 14 of its rows as
  // `do:`. The reader only ever looked at `what`, so EVERY Reunion day-of cue was
  // nameless — the day hero fell back to the placeholder "This moment." and the
  // UP NEXT block rendered its header over nothing (a ghost zone). Accept both
  // spellings so an authoring choice can never blank a cue again; the schedule
  // gate in __tests__/rosWhenUnits proves no entry resolves empty.
  const cueText = (entry) => (entry && (entry.what != null ? entry.what : entry.do)) || '';

  // Food-approach lever — drop "caterer arrives / load-in" day-of cues when the host cooks.
  const dropCatererCue = foodApproach(event).usesCaterer === false;
  const rows = [];
  let seq = 0;
  for (const kind of ROS_SCHEDULE_KINDS) {
    const list = Array.isArray(playbook.schedules[kind.key]) ? playbook.schedules[kind.key] : [];
    for (const entry of list) {
      const off = rosWhenOffset(entry.when);
      if (off === null) continue;
      if (dropCatererCue && /cater(er|ing)/i.test(cueText(entry))) continue;
      const total = baseMin + off;
      rows.push({
        id: `pb-ros-${event.id}-${kind.key}-${seq++}`,
        // A clock only when the host gave us one. Otherwise null — and `rel` carries the
        // knowledge we actually have.
        time: exact ? `${rosPad2(Math.floor(total / 60))}:${String(((total % 60) + 60) % 60).padStart(2, '0')}` : null,
        rel: exact ? null : relLabel(off),
        anchorSource,
        _min: total,
        segment: resolveAnsweredCopy(cueText(entry), entry.copyByAnswer, event),
        location: '',
        type: kind.segType,
        owner: 'Host',
        confirmed: false,
        notes: '',
        source: 'playbook',
        generated: true,
        playbookType: playbook.type,
      });
    }
  }
  // ── MULTI-DAY AGENDA (P1 ROS day dimension, 2026-07-28) ────────────────────
  // schedules.agenda is the playbook's AUTHORED daily program ("Day 2 afternoon
  // — team-building activity…"). It was written for the multi-day types and
  // NEVER READ — rosWhenOffset nulls on a Day token, so the whole program
  // silently vanished (audit 2026-07-26, "prose no engine reads"). Rows carry
  // the day index + the authored bucket VERBATIM: no clock is ever invented
  // (days 2+ have no start times in the model), so `time` stays null and `rel`
  // speaks "Day N · bucket". Order = day, then the bucket's canonical hour —
  // the same anchor vocabulary the single-day rows use, never printed as time.
  const agenda = Array.isArray(playbook.schedules.agenda) ? playbook.schedules.agenda : [];
  for (const entry of agenda) {
    const dt = rosDayToken(entry.when);
    if (!dt) continue;
    const hour = dt.bucket && ROS_DAY_BUCKET_HOUR[dt.bucket] != null ? ROS_DAY_BUCKET_HOUR[dt.bucket] : ROS_DAY_BUCKET_HOUR.afternoon;
    rows.push({
      id: `pb-ros-${event.id}-agenda-${seq++}`,
      time: null,
      rel: dt.bucket ? `Day ${dt.day} · ${dt.bucket}` : `Day ${dt.day}`,
      anchorSource: 'day-bucket',
      day: dt.day,
      _min: (dt.day - 1) * 1440 + hour * 60,
      segment: resolveAnsweredCopy(cueText(entry), entry.copyByAnswer, event),
      location: '', type: 'event', owner: 'Host',
      confirmed: false, notes: '', source: 'playbook', generated: true,
      playbookType: playbook.type,
    });
  }
  // "T0 last day" cues (settle the bill, departures) belong on the LAST day —
  // they used to land at the day-1 anchor (the bare-T0 catch). Only moves when
  // the event actually spans days; single-day output is byte-identical.
  const lastDay = spanNights(event) + 1;
  if (lastDay > 1) {
    for (const kind of ROS_SCHEDULE_KINDS) {
      const list = Array.isArray(playbook.schedules[kind.key]) ? playbook.schedules[kind.key] : [];
      for (const entry of list) {
        if (!/last day/i.test(String(entry.when || ''))) continue;
        const hit = rows.find((r) => r.segment === resolveAnsweredCopy(cueText(entry), entry.copyByAnswer, event) && (r.day || 1) === 1);
        if (hit) { hit.day = lastDay; hit._min += (lastDay - 1) * 1440; hit.rel = hit.time ? hit.rel : `Day ${lastDay}`; }
      }
    }
  }
  if (!rows.length) return null;
  // Anchor a "Guests arrive" hero segment unless an entry already lands there.
  if (!rows.some((r) => r._min === baseMin)) {
    rows.push({
      id: `pb-ros-${event.id}-arrival`,
      time: exact ? `${rosPad2(Math.floor(baseMin / 60))}:${String(baseMin % 60).padStart(2, '0')}` : null,
      rel: exact ? null : relLabel(0),
      anchorSource,
      _min: baseMin,
      segment: 'Guests arrive', location: '', type: 'event', owner: 'Host',
      confirmed: false, notes: '', source: 'playbook', generated: true, playbookType: playbook.type,
    });
  }
  rows.sort((a, b) => a._min - b._min);
  return rows.map(({ _min, ...r }) => r); // drop the sort helper
}

// The run-of-show a surface should show: the user's own schedule if any exists
// (Rule 1: never overwrite manual/imported), otherwise the playbook-derived
// run-of-show (Rule 5). Pure; derived rows are never auto-persisted — once the
// host edits (which seeds + saves them), the saved schedule wins.
export function effectiveRos(event) {
  const stored = event && Array.isArray(event.ros) ? event.ros : [];
  // SINGLE SOURCE OF TRUTH for the run-of-show. The playbook-derived schedule tracks the
  // event's timeOfDay live (anchors 10/15/18), so changing "Where & when" reflows the whole
  // day. A stored ros wins ONLY when the host has genuinely taken ownership in the ROS editor
  // (event.rosEdited), or when the event has no playbook to derive from. Per-cue "done" state
  // is kept SEPARATELY in event.rosDone and overlaid here — marking a cue done must never
  // freeze the schedule into a snapshot that then stops tracking timeOfDay.
  const derived = playbookRunOfShow(event);
  const owned = stored.length && ((event && event.rosEdited) || !derived || !derived.length);
  // See withheldPlaybookBeats() below — the ownership contract is correct, but
  // it is INVISIBLE, and a host looking at her own short sheet cannot tell the
  // difference between "the playbook has nothing" and "the playbook is standing
  // down because I touched this."
  const base = owned ? stored : (derived || stored);
  const doneMap = event && event.rosDone;
  if (!doneMap || !base.length) return base;
  return base.map((r) => (doneMap[r.id] && !r.done ? { ...r, done: true } : r));
}

/**
 * withheldPlaybookBeats(event) → { owned, count, program }
 *
 * WHAT THE OWNERSHIP CONTRACT IS HIDING (found by re-running the day model,
 * 2026-07-29). effectiveRos correctly refuses to overwrite a run of show the
 * host has touched — but silently. Driven live on a host-created BBQ, the Full
 * agenda was four rows with NOTHING during the event, while the playbook held
 * seven program beats it had quietly stood down from. That is correct behaviour
 * that READS as a broken day sheet, and the host has no way to tell the two
 * apart or to ask for the beats.
 *
 * This reports the difference so a surface can say so honestly. It never
 * changes what effectiveRos returns — the contract is unchanged, only visible.
 *   owned  – true when the stored sheet is winning
 *   count  – how many derived rows are standing down
 *   program – how many of those are inside the event window (the ones whose
 *             absence is actually felt: the meal, the photo, the send-off)
 */
export function withheldPlaybookBeats(event) {
  const none = { owned: false, count: 0, program: 0 };
  try {
    const stored = Array.isArray(event && event.ros) ? event.ros : [];
    if (!stored.length) return none;
    const derived = playbookRunOfShow(event) || [];
    const owned = !!((event && event.rosEdited) || !derived.length);
    if (!owned || !derived.length) return none;
    // Only count what the stored sheet does NOT already cover, by moment text —
    // a host who kept the playbook's own rows is not missing them.
    const have = new Set(stored.map((r) => String((r && r.segment) || '').trim().toLowerCase()).filter(Boolean));
    const missing = derived.filter((r) => !have.has(String((r && r.segment) || '').trim().toLowerCase()));
    return { owned: true, count: missing.length, program: missing.filter((r) => r && r.type === 'event').length };
  } catch (_e) { return none; }
}

// classifyRos — determines which Day tab state to render.
// 'timed'   → cues with time strings → green spine + HAPPENING NOW
// 'untimed' → cues exist but none have a time → "Schedule needs times" state
// 'empty'   → no cues → honest empty state
export function classifyRos(cues) {
  if (!Array.isArray(cues) || cues.length === 0) return 'empty';
  return cues.some(r => r && typeof r.time === 'string' && r.time.trim() !== '') ? 'timed' : 'untimed';
}

// ── Capacity requirements (Sprint 55H-B3A · NGW Pattern 009) ──────────────────
// Pure reader: the physical capacity a host LIKELY NEEDS, scaled from the
// playbook's authored rentalsGap by guest count. REQUIREMENTS ONLY — never a
// deficit. No inventory exists, so the system may state "you'll likely need 12
// chairs" but never "you're missing 4 chairs." No parking / restrooms / power /
// accessibility (out of scope; never inferred). null when no rentalsGap.
function shortRental(item) {
  const map = {
    'Dinner plates': 'plates', 'Wine + water glasses': 'glasses', 'Flatware sets': 'flatware',
    'Dining chairs': 'chairs', 'Serving platters + utensils': 'platters', 'Folding tables': 'tables',
    'Coolers': 'coolers', 'Chairs': 'chairs', 'Canopy / tent': 'canopy', 'Pop-up canopy (10x10)': 'canopy',
    'Pop-up canopies (10x10)': 'canopies', 'Pop-up canopies': 'canopies',
    'Serving platters + serving utensils': 'platters', 'Serving platters + drink dispenser': 'platters',
    'Chafing dishes / drink dispensers': 'chafers', 'Dining chairs ': 'chairs',
  };
  if (map[item]) return map[item];
  // Split on parens/slash/em-dash, and a hyphen ONLY when spaced (" - ") — never a
  // hyphen inside a word, or "Pop-up canopies" truncates to "pop".
  return String(item || '').split(/\s*[(/—]\s*|\s+-\s+/)[0].trim().toLowerCase();
}

// ── Supply cost + retail intelligence ─────────────────────────────────────────
// rentalsGap items (chairs, coolers, platters…) carry NO authored cost. Rather than
// invent a number per render or author costs into 40 playbooks, this ONE canonical,
// cited table maps a supply keyword → a typical US per-unit buy/rent range + whether
// it's normally rented (link to local rentals) or bought (link to Amazon/Walmart).
// Matched first→last (specific before general). Provenance: trade-heuristic /
// synthesized — typical national price bands, not a quote. supplyIntel() returns the
// PER-UNIT range; callers multiply by quantity. No match → null (we show no cost,
// never a fabricated one).
// Rental bands VERIFIED against 2025 event-rental cost guides (WeddingWire; eventslv;
// cvlinens; eventbrothersco tents): folding chairs $1.50–3, polyester linens $5–15
// ($20–40 specialty), banquet tables ~$8–12, pop-up canopy ~$45–120 (full event tents
// $100–350+ but the playbooks carry pop-ups). Still per-unit, qty-multiplied downstream.
const SUPPLY_INTEL_SOURCES = ['https://www.weddingwire.com/cost/wedding-rentals', 'https://eventslv.com/cost-to-rent-tables-and-chairs/', 'https://www.cvlinens.com/blogs/styling-tips/how-much-does-it-cost-to-rent-tablecloths', 'https://eventbrothersco.com/tent-rental-cost/'];
const SUPPLY_INTEL = [
  { re: /folding chair|floor cushion|seat cushion|chair/i,                 low: 2,  high: 4,   kind: 'rent', label: 'chairs' },
  { re: /banquet table|folding table|\btable(s)?\b/i,                       low: 8,  high: 12,  kind: 'rent', label: 'tables' },
  { re: /pop-?up canop|canop|\btent\b|shade structure/i,                    low: 45, high: 120, kind: 'rent', label: 'canopy' },
  { re: /chafing|chafer|food warmer|sterno|warming tray/i,                  low: 12, high: 25,  kind: 'rent', label: 'warmers' },
  { re: /speaker|\bp\.?a\.?\b|sound system|bluetooth speaker/i,             low: 25, high: 60,  kind: 'rent', label: 'sound' },
  { re: /beverage tub|drink tub|ice chest|cooler/i,                         low: 18, high: 45,  kind: 'buy',  label: 'cooler' },
  { re: /drink dispenser|beverage dispenser|dispenser/i,                    low: 15, high: 35,  kind: 'buy',  label: 'dispenser' },
  { re: /pitcher|carafe/i,                                                  low: 8,  high: 18,  kind: 'buy',  label: 'pitcher' },
  // Serviceware — china/glassware/flatware a host rents (or already owns). Per-unit
  // rental bands, multiplied by qty downstream. Placed before the platter/serveware
  // rows; none of the earlier rows match "plate"/"glass"/"flatware".
  { re: /dinner plate|salad plate|dessert plate|\bplates?\b/i,              low: 1,  high: 2,   kind: 'rent', label: 'plates' },
  { re: /wine glass|water glass|stemware|tumbler|\bglass(es)?\b/i,          low: 1,  high: 2,   kind: 'rent', label: 'glasses' },
  { re: /flatware|silverware|cutlery/i,                                     low: 1,  high: 2,   kind: 'rent', label: 'flatware' },
  { re: /serving board|charcuterie board|platter|serving tray|\btray\b/i,   low: 8,  high: 20,  kind: 'buy',  label: 'platters' },
  { re: /serving (spoon|utensil)|tongs|ladle|serving set/i,                 low: 6,  high: 14,  kind: 'buy',  label: 'serveware' },
  { re: /small bowl|prep bowl|\bbowls?\b/i,                                 low: 4,  high: 12,  kind: 'buy',  label: 'bowls' },
  { re: /string light|cafe light|fairy light|lantern|candle/i,             low: 12, high: 28,  kind: 'buy',  label: 'lighting' },
  { re: /ice scoop|scoop/i,                                                 low: 5,  high: 12,  kind: 'buy',  label: 'scoop' },
  { re: /linen|tablecloth|table cover|kraft paper|table runner/i,           low: 6,  high: 15,  kind: 'buy',  label: 'linens' },
  { re: /trash|recycling|bin|bus tub|shell bucket/i,                        low: 8,  high: 20,  kind: 'buy',  label: 'cleanup' },
  { re: /heat lamp|patio heater|fan\b/i,                                    low: 30, high: 70,  kind: 'rent', label: 'climate' },
];
export function supplyIntel(name) {
  const s = String(name || '');
  if (!s) return null;
  for (const e of SUPPLY_INTEL) { if (e.re.test(s)) return { low: e.low, high: e.high, kind: e.kind, label: e.label }; }
  return null;
}
// Retail deep links for a supply item — honest product SEARCHES (never a specific
// listing or endorsement). Rent-type items also get a local-rental map search.
export function supplyRetailLinks(name, anchor) {
  const q = encodeURIComponent(String(name || '').replace(/\s*[(/—].*$/, '').trim());
  const intel = supplyIntel(name);
  const links = [
    { label: 'Amazon',  url: `https://www.amazon.com/s?k=${q}` },
    { label: 'Walmart', url: `https://www.walmart.com/search?q=${q}` },
    { label: 'Target',  url: `https://www.target.com/s?searchTerm=${q}` },
  ];
  if (intel && intel.kind === 'rent') {
    const rq = encodeURIComponent(anchor ? `party rental ${intel.label} near ${anchor}` : `party rental ${intel.label}`);
    return { kind: 'rent', rentUrl: `https://www.google.com/maps/search/${rq}`, buy: links };
  }
  return { kind: 'buy', buy: links };
}

// Supply grouping — chairs/tables → SEATING; serviceware (plates/glasses/flatware,
// platters, dispensers…) → SERVICEWARE; everything else → RENTALS & EXTRAS. Derived
// from the item key / supplyIntel().label, never costed here. A pure classifier.
const CAPACITY_GROUPS = ['SEATING', 'SERVICEWARE', 'RENTALS & EXTRAS'];
function capacityGroupFor(key, label) {
  const k = String(label || key || '').toLowerCase();
  if (/chair|table|seat|stool|bench/.test(k)) return 'SEATING';
  if (/plate|glass|flatware|silverware|cutlery|platter|serveware|serving|bowl|dispenser|pitcher|cooler|napkin|\bcup/.test(k)) return 'SERVICEWARE';
  return 'RENTALS & EXTRAS';
}
// One verb per supply, from its supplyIntel kind + owned state. Owned → "Have these";
// rentable → "Rent"; bought → "Delivered"; otherwise a neutral "Get".
function capacityVerbFor(kind, isOwned) {
  if (isOwned) return 'Have these';
  if (kind === 'rent') return 'Rent';
  if (kind === 'buy') return 'Delivered';
  return 'Get';
}
// Honest, engine-DERIVED swap suggestions for a supply (the food plan's per-item
// `alternatives`). Supplies carry no authored alternatives, so these are framed from
// what we actually know — the supplyIntel kind + the group/label — never an invented
// product name or price. Serviceware → disposables (the real cheaper path); seating →
// borrow / BYO; then the rent↔buy framing from the kind. [] when nothing honest applies
// (the row then falls back to its existing rental/retail "options" links). Mirrors food.
function capacitySwaps(label, kind, group) {
  const out = [];
  if (['plates', 'glasses', 'flatware', 'serveware', 'platters', 'bowls'].includes(label) || group === 'SERVICEWARE') {
    out.push('Disposables — skip the rental');
  }
  if (['chairs', 'tables'].includes(label)) {
    out.push('Borrow, or ask guests to bring one');
  }
  if (kind === 'rent') out.push('Buy it if you’ll reuse it');
  else if (kind === 'buy') out.push('Rent or borrow for one-time use');
  return [...new Set(out)];
}

export function playbookCapacity(event) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.rentalsGap) || !playbook.rentalsGap.length) return null;
  // Durable rentals (chairs/tables/glassware) size to the host's actual count, NOT the
  // attendance-shift band — you seat real people, and renting "extra just in case" wastes
  // money. The food plan's own Supplies group (ice/charcoal/plates/cups) is the consumable
  // side and DOES ride the shift (it's sized via sizingGuests in playbookFoodPlan).
  // Durables seat REAL people — a guest who said "No" doesn't need a chair. When there's
  // a roster, count everyone who hasn't declined; else the host's number; else the
  // playbook typical. guestCountOf alone counted declined rows too (audit 2026-07-22).
  const rosterAttending = (Array.isArray(event.guests) && event.guests.length)
    ? event.guests.filter(g => g && g.rsvp !== 'No').length : 0;
  const guests = (Number(event.guestCount) || Number(event.guestEstimate) || 0) || rosterAttending || guestCountOf(event, playbook);
  // Single source of truth (food-engine pattern): the engine merges the host's qty
  // OVERRIDES (event.capacityQty), ADDED items (event.capacityAdd), and OWNED flags
  // (event.capacityOwned, keyed by item key), and attaches per-item cost from the ONE
  // canonical supplyIntel table — the UI only renders + checks off. qty × per-unit
  // range = the line cost; no costing happens in the UI. An OWNED item is "I already
  // have it" → its line cost collapses to $0 (distinct from capacityChecked = got).
  const qtyOv = (event.capacityQty && typeof event.capacityQty === 'object') ? event.capacityQty : {};
  const owned = (event.capacityOwned && typeof event.capacityOwned === 'object') ? event.capacityOwned : {};
  const added = Array.isArray(event.capacityAdd) ? event.capacityAdd.filter((a) => a && a.name) : [];
  // Parity with the food plan (foodSkip / foodLocked):
  //  • capacitySkip[key]   — the host swapped this line out. Kept in the list
  //    (struck-through, reversible) but MARKED skipped so it leaves every total.
  //  • capacityLocked[key] — a committed dollar amount that REPLACES the supplyIntel
  //    range for that line (a fixed cost, not a range). Owned lines ignore a lock
  //    ($0 wins — you wouldn't price something you already have).
  const skip = (event.capacitySkip && typeof event.capacitySkip === 'object') ? event.capacitySkip : {};
  const lockedMap = (event.capacityLocked && typeof event.capacityLocked === 'object') ? event.capacityLocked : {};
  const lockOf = (key, isOwned) => (!isOwned && (key in lockedMap)) ? Math.max(0, Math.round(Number(lockedMap[key]) || 0)) : null;
  const costOf = (name, q, isOwned) => {
    const intel = supplyIntel(name);
    if (isOwned) return { costLow: 0, costHigh: 0, kind: intel ? intel.kind : null, label: intel ? intel.label : null };
    return intel
      ? { costLow: Math.round(intel.low * q), costHigh: Math.round(intel.high * q), kind: intel.kind, label: intel.label }
      : { costLow: null, costHigh: null, kind: null, label: null };
  };
  const items = [];
  for (const r of playbook.rentalsGap) {
    let factor = null, factorType = null;
    // Quantity comes from the ONE canonical source (resolveQuantity) so the
    // explainer/capacity number always matches the food-plan number. The
    // factor/factorType describe the SCALING BASIS only (Sprint 57H reasoning).
    const baseQty = resolveQuantity(r, guests);
    if (typeof r.qtyPerGuest === 'number') { factor = r.qtyPerGuest; factorType = 'perGuest'; }
    else if (typeof r.qtyFlat === 'number' && typeof r.qtyPer === 'number') { factor = r.qtyFlat; factorType = 'perN'; }
    else if (typeof r.qtyFlat === 'number') { factor = r.qtyFlat; factorType = 'flat'; }
    if (baseQty == null || baseQty <= 0) continue;
    const short = shortRental(r.item);
    // WHOLE THINGS ONLY (host report 2026-07-28: "cant have 1.2 tables").
    // resolveQuantity scales a per-guest factor and is SHARED with the food plan,
    // where 2.5 lbs of meat is a real answer — but capacity rows are physical
    // rentals, and 0.7 canopies / 7.2 folding chairs / 1.4 tables are not things
    // you can get. Coverage rounds UP: you need at least the computed amount, so
    // 1.4 tables means 2 tables. The food plan is untouched.
    const qty = (short in qtyOv) ? Math.max(0, Math.round(Number(qtyOv[short]) || 0)) : Math.ceil(baseQty);
    const isOwned = !!owned[short];
    const c = costOf(r.item, qty, isOwned);
    const swaps = capacitySwaps(c.label, c.kind, capacityGroupFor(short, c.label));
    items.push({ key: short, item: r.item, short, name: short, qty, note: r.note || '', factor, factorType, added: false, owned: isOwned, skipped: !!skip[short], locked: lockOf(short, isOwned), group: capacityGroupFor(short, c.label), verb: capacityVerbFor(c.kind, isOwned), ...c, ...(swaps.length ? { alternatives: swaps } : {}) });
  }
  // Host-added supplies — SAME costing path (single source: supplyIntel). An optional
  // host-entered cost overrides the table (collapses the line to one number).
  for (const a of added) {
    const qty = Math.max(0, Math.round(Number(a.qty) || 0));
    const isOwned = !!owned[a.id];
    let c;
    if (isOwned) c = costOf(a.name, qty, true);
    else if (typeof a.cost === 'number' && a.cost > 0) { const intel = supplyIntel(a.name); c = { costLow: Math.round(a.cost), costHigh: Math.round(a.cost), kind: intel ? intel.kind : 'buy', label: intel ? intel.label : null }; }
    else c = costOf(a.name, qty, false);
    items.push({ key: a.id, item: a.name, short: a.name, name: a.name, qty, note: '', factor: null, factorType: null, added: true, owned: isOwned, skipped: !!skip[a.id], locked: lockOf(a.id, isOwned), group: capacityGroupFor(a.name, c.label), verb: capacityVerbFor(c.kind, isOwned), ...c });
  }
  if (!items.length) return null;
  // compact summary, e.g. "12 chairs · 24 plates · 30 glasses · 12 flatware · 4 platters"
  const summary = items.map((i) => `${i.qty} ${i.short}`).join(' · ');
  // Sprint 57H: the "because" — built ONLY from the real factors above. Per-guest
  // items show "N <item> each"; flat items show their count. No inference.
  const perGuest = items.filter((i) => i.factorType === 'perGuest').map((i) => `${i.factor} ${i.short}`);
  const flat = items.filter((i) => i.factorType !== 'perGuest' && !i.added).map((i) => `${i.qty} ${i.short}`);
  let because = '';
  if (perGuest.length) because = `${guests} guests × ${perGuest.join(' · ')} each`;
  if (flat.length) because += `${because ? ' + ' : ''}${flat.join(' · ')} flat`;
  // A locked cost is fixed — it collapses the line's range to one committed number
  // (mirrors the food plan's eff()). Owned lines are already $0 from costOf above.
  const eff = (i, k) => (i.locked != null ? i.locked : i[k]);
  // Grouped sections with per-section subtotals (Figma 1604:2). Owned lines count as $0;
  // SKIPPED (swapped-out) lines leave the subtotal but stay in the group (struck-through);
  // a LOCKED line contributes its committed number instead of the range.
  const groups = CAPACITY_GROUPS.filter((g) => items.some((i) => i.group === g)).map((g) => {
    const gi = items.filter((i) => i.group === g);
    const gc = gi.filter((i) => !i.skipped && i.costLow != null);
    return { group: g, items: gi, costLow: gc.reduce((s, i) => s + eff(i, 'costLow'), 0), costHigh: gc.reduce((s, i) => s + eff(i, 'costHigh'), 0), hasCost: gc.length > 0 };
  });
  // Sizing line + explainer — ONLY from the real factors. Per-table ratio + table count
  // appear when the playbook actually rents tables (most don't); "service for N" always.
  const chairsItem = items.find((i) => i.short === 'chairs');
  const tablesItem = items.find((i) => i.short === 'tables');
  const swPerGuest = items.find((i) => i.factorType === 'perGuest' && i.group === 'SERVICEWARE');
  const sizingParts = [];
  if (chairsItem && tablesItem && tablesItem.qty > 0) {
    const perTable = Math.round(chairsItem.qty / tablesItem.qty);
    if (perTable > 0) sizingParts.push(`about ${perTable} per table`);
    sizingParts.push(`${tablesItem.qty} ${tablesItem.qty === 1 ? 'table' : 'tables'}`);
  }
  sizingParts.push(`service for ${guests}`);
  const sizing = sizingParts.join(' · ');
  const whyBits = [`counts come from your ${guests} ${guests === 1 ? 'guest' : 'guests'}`];
  if (chairsItem || tablesItem) whyBits.push('tables and chairs round up so no one stands');
  if (swPerGuest) whyBits.push('serviceware runs a little over so there’s enough for spills and seconds');
  const sizingWhy = whyBits.join('; ');
  // Cost totals — only from lines we can ground in the canonical table (no fabricated $).
  // Skipped (swapped-out) lines leave every total; locked lines contribute their committed
  // number (eff). Same money rules as the food plan's foodLow/foodHigh + lockedTotal.
  const costed = items.filter((i) => !i.skipped && i.costLow != null);
  const costLow = costed.reduce((s, i) => s + eff(i, 'costLow'), 0);
  const costHigh = costed.reduce((s, i) => s + eff(i, 'costHigh'), 0);
  const lockedItems = costed.filter((i) => i.locked != null);
  const lockedTotal = Math.max(0, Math.round(lockedItems.reduce((s, i) => s + i.locked, 0)));
  // BUDGET WIRING (2026-07-07): what the host has actually GOT (checked off),
  // billed with the same eff() the lines display — so Seating & supplies can
  // finally flow into hostSpending and the Budget tab with zero parallel math.
  const gotMap = (event.capacityChecked && typeof event.capacityChecked === 'object') ? event.capacityChecked : {};
  const boughtItems = costed.filter((i) => gotMap[i.key] || i.owned);
  const boughtLow = Math.max(0, Math.round(boughtItems.reduce((s, i) => s + eff(i, 'costLow'), 0)));
  const boughtHigh = Math.max(0, Math.round(boughtItems.reduce((s, i) => s + eff(i, 'costHigh'), 0)));
  return { guests, items, groups, summary, because, sizing, sizingWhy, costLow, costHigh, hasCost: costed.length > 0, costedCount: costed.length, itemCount: items.length, lockedTotal, lockedCount: lockedItems.length, boughtLow, boughtHigh, boughtCount: boughtItems.length };
}

// ── Infrastructure-check prompts (Sprint 55L · "Event Reality Check") ──────────
// Pure reader: the operational-reality checks a first-time host should confirm
// before event day, DERIVED ONLY from authored playbook signals (risks /
// contingencies / decisions / purchases) + event type. PROMPTS to confirm, never
// deficits — it never infers venue capacity, parking, restroom, or power
// adequacy, and never says "insufficient" (Patterns 009 / POS-P009-R1). Surfaced
// display-only in Planning Health; never enters getEventReadiness (Pattern 010).
export function playbookInfraPrompts(event) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook) return null;

  // Authored-signal haystack: search the playbook's own words, not inference.
  const hay = JSON.stringify([
    playbook.risks || [], playbook.contingencies || [],
    playbook.decisions || [], playbook.purchases || [],
  ]).toLowerCase();
  const has = (re) => re.test(hay);
  const grill = has(/charcoal|propane/);                 // a real grill (fuel purchased)
  const minors = has(/minor/);                           // authored alcohol-for-minors risk
  const alcohol = has(/alcohol|cocktail|\bbar\b|byob/);
  const kids = grill || event.type === 'Birthday';       // kid party or backyard grill/pool

  const prompts = [];
  if (has(/weather|\brain\b|canopy|\bshade\b|\btent\b/))   // \brain\b so "grain" never triggers it
    prompts.push({ key: 'weather', short: 'rain plan', detail: 'Rain / weather plan — where does everyone go if the weather turns?' });
  prompts.push({ key: 'food', short: 'food safety', detail: 'Food safety — keep cold on ice, hot food held, nothing perishable out more than ~2 hours; cook to safe temps.' });
  prompts.push({ key: 'power', short: 'power & outlets', detail: "Power & outlets — plan where music, lights, and warmers plug in; don't overload one circuit." });
  if ((playbook.schedules && Array.isArray(playbook.schedules.cleanup)) || has(/trash|recycling|bus tub/))
    prompts.push({ key: 'trash', short: 'trash station', detail: 'Trash + recycling station — stage bags and a bus tub before guests arrive.' });
  prompts.push({ key: 'emergency', short: 'emergency basics', detail: 'Emergency basics — a first-aid kit on hand; know the nearest ER.' });
  if (grill)
    prompts.push({ key: 'grill', short: 'grill / fire safety', detail: 'Grill / fire safety — keep an extinguisher within reach and never leave the grill unattended.' });
  if (kids)
    prompts.push({ key: 'child', short: 'child supervision', detail: 'Child safety — assign a watcher for the grill, pool, and outlets.' });
  if (minors)
    prompts.push({ key: 'minors', short: 'alcohol & minors', detail: 'Alcohol & minors — keep an adults-only serving area; no self-serve for under-21s.' });
  else if (alcohol)
    prompts.push({ key: 'alcohol', short: 'alcohol plan', detail: 'Alcohol plan — set a cutoff and a ride-home plan.' });

  if (!prompts.length) return null;
  // Sprint 57H: the "because" — built ONLY from the authored signals that fired
  // above (no inference). Food/power/emergency are always-on basics; the rest are
  // the specific risks the playbook flagged.
  const triggered = [];
  if (has(/weather|\brain\b|canopy|\bshade\b|\btent\b/)) triggered.push('a weather/rain risk');
  if (grill) triggered.push('open flame');
  if (minors || alcohol) triggered.push('alcohol service');
  if (kids) triggered.push('kids present');
  const because = `standard ${String(event.type || 'event').toLowerCase()} safety basics`
    + (triggered.length ? ` + ${triggered.join(' + ')} in your plan` : '');
  return { prompts, summary: prompts.map((p) => p.short).join(' · '), because };
}

// ── What-could-go-wrong reader (Sprint — surface authored risk wisdom) ─────────
// Pure reader over the playbook's AUTHORED `risks` array — the operational wisdom
// the pros plan for, that's been computed-but-dark (scanned only as text for the
// infra prompts, never shown). Each authored risk carries a trigger (what goes
// wrong) and a mitigation (the fix). We never infer or invent a risk; we only
// surface what the playbook author wrote, sorted by severity. Types without
// authored risks return null.
const RISK_RANK = { critical: 0, high: 1, med: 2, medium: 2, low: 3 };
// Optional domain scoping — surface only the authored risks relevant to a given
// middle screen (Guests, Budget) by matching the authored id/trigger text. This
// brings the day-of "what could go wrong + the fix" card to the planning screens,
// scoped to what that screen is about. Domains with no matching authored risk
// return null (the card renders nothing — never a fabricated watch-out).
const RISK_DOMAIN_RE = {
  guests: /headcount|rsvp|\bcount\b|capacity|chairs?|seat|dietary|allerg|guest|invite|no-?show/i,
  budget: /budget|\bcost\b|over-?spend|spend|cheap|price|expensive/i,
};
export function playbookRisks(event, domain) {
  if (!event) return null;
  const pb = getPlaybook(event.type);
  if (!pb || !Array.isArray(pb.risks)) return null;
  const dre = domain ? RISK_DOMAIN_RE[domain] : null;
  const items = pb.risks
    .filter((r) => r && r.trigger && r.mitigation)
    .filter((r) => !dre || dre.test(`${r.id || ''} ${r.trigger}`)) // match the trigger/id, not the fix (mitigations mention "guest" generically)
    .map((r) => {
      const sev = String(r.severity || 'med').toLowerCase();
      return { id: r.id, trigger: String(r.trigger).trim(), mitigation: String(r.mitigation).trim(), severity: sev, rank: (sev in RISK_RANK) ? RISK_RANK[sev] : 2 };
    })
    .sort((a, b) => (a.rank - b.rank));
  if (!items.length) return null;
  return { items, count: items.length };
}

// ── Day-of "Before the big day" readiness checklist reader ─────────────────────
// Pure reader over the playbook's AUTHORED `dayOfChecklist` — the safety/readiness
// items the host clears the morning of, type-appropriate (a grill cookout gets
// food-safety + fire + weather; an indoor dinner gets a lighter set). Mirrors the
// playbookRisks reader: never infers or invents an item, only surfaces what the
// playbook author wrote, ordered by severity (high→low). Types that don't author
// their own list fall back to a sensible, universal default so nothing regresses.
//
// Each authored item: { id, label, detail, severity }. The reader normalizes to
// the render/persistence contract the RealityCheckPanel already uses
// (key/short/detail) so confirm-state — event.safetyChecked[key] — survives.
const DAYOF_RANK = { critical: 0, high: 1, med: 2, medium: 2, low: 3 };
// Universal fallback — true for ANY hosted gathering, with no hazard that might
// not apply (no grill/fire, no canopy/weather, no alcohol assumption). Honest
// floor; type playbooks add the specific items their event actually carries.
const DEFAULT_DAYOF_CHECKLIST = [
  { id: 'food', label: 'Food safety', detail: 'Keep cold food cold and hot food hot; nothing perishable sitting out more than ~2 hours. Cook anything to safe internal temps.', severity: 'high' },
  { id: 'cleanup', label: 'Trash + cleanup ready', detail: 'Trash and recycling bags staged, paper towels out, and a spot to swap a full bag before it overflows.', severity: 'med' },
  { id: 'emergency', label: 'Emergency basics', detail: 'First-aid kit on hand; know the nearest ER; phones charged.', severity: 'low' },
];
function normalizeDayOfItems(list) {
  return (Array.isArray(list) ? list : [])
    .filter((it) => it && it.id && it.label)
    .map((it) => {
      const sev = String(it.severity || 'med').toLowerCase();
      return {
        id: String(it.id), key: String(it.id),                 // key === id (persistence + render contract)
        label: String(it.label).trim(), short: String(it.label).trim(),
        detail: String(it.detail || '').trim(), severity: sev,
        rank: (sev in DAYOF_RANK) ? DAYOF_RANK[sev] : 2,
      };
    })
    .sort((a, b) => (a.rank - b.rank));
}
export function playbookDayOfChecklist(event) {
  if (!event) return null;
  const pb = getPlaybook(event.type);
  // Authored list when the type defines one; otherwise the universal default
  // (so an unknown / indoor / un-authored type still gets an honest floor).
  const authored = pb && Array.isArray(pb.dayOfChecklist) ? pb.dayOfChecklist : null;
  const items = normalizeDayOfItems(authored && authored.length ? authored : DEFAULT_DAYOF_CHECKLIST);
  if (!items.length) return null;
  const isDefault = !(authored && authored.length);
  const because = isDefault
    ? `standard ${String(event.type || 'event').toLowerCase()} safety basics`
    : `the things that actually matter for a ${String(event.type || 'event').toLowerCase()}`;
  return { items, count: items.length, isDefault, because };
}

// ── Dated milestones reader — the planning arc as day-of-style dated actions ───
// Pure reader over the authored milestones: each carries a name (the action), an
// owner, and an offsetDays back from the event, which we turn into a real due
// date + a days-out count. This is what lets the middle (planning) screens speak
// the day-of grammar — "what · by when · who" — instead of a bare status word.
// Never invents a date: dueDate/daysOut are null when the event has no date.
export function playbookMilestones(event, asOf) {
  if (!event) return [];
  const pb = getPlaybook(event.type);
  if (!pb || !Array.isArray(pb.milestones)) return [];
  const dte = daysToEvent(event.date, asOf);
  return pb.milestones
    .filter((m) => m && m.category !== 'event' && typeof m.offsetDays === 'number')
    .map((m) => {
      // 2026-07-15: LOCAL-format the due date (decisionDueDate), not toISOString —
      // the UTC slice emitted the previous day east of Greenwich, the same day-shift
      // class the daysUntil convergence killed. decisionDueDate takes a negative
      // offset (days before the event), so the milestone's positive offsetDays flips.
      const dueDate = decisionDueDate(event.date, -m.offsetDays);
      return {
        id: m.id, name: String(m.name || '').trim(), owner: m.owner || 'host',
        category: m.category || 'planning', offsetDays: m.offsetDays,
        daysOut: dte === null ? null : (dte - m.offsetDays),
        dueDate, critical: !!(m.risk && (m.risk.severity === 'high' || m.risk.severity === 'critical')),
      };
    })
    .sort((a, b) => b.offsetDays - a.offsetDays); // chronological — furthest-out first
}

// The next concrete dated step for a home "What needs you" AREA, mapped to the
// authored milestone categories. Prefers the soonest still-upcoming milestone;
// falls back to the most-recent past one, then the earliest if the event has no
// date. null when the area carries no dated milestone (e.g. Heart) or the type
// has no playbook — the caller then keeps the plain status word.
const AREA_MILESTONE_CATEGORIES = {
  Guests: ['guest'], Food: ['food', 'shopping'], 'Your choices': ['food'],
  'The Day': ['setup'], Budget: ['planning'], Venue: ['rental', 'planning'],
};
export function playbookAreaNextStep(event, area, asOf) {
  const cats = AREA_MILESTONE_CATEGORIES[area];
  if (!cats) return null;
  // State-aware: drop a `planning` SETUP milestone whose action is already proven-handled
  // by real event state (taskSatisfied). This stops the stale composite setup string —
  // e.g. "Set date, headcount, menu" (a `planning` milestone that surfaces on the Budget
  // area) — from showing as a "next step" after the host has set the date / added guests /
  // sized the budget. Scoped to `planning` so genuine upcoming guest/food/shopping
  // milestones still surface. Single source: the SAME predicate the next-step engine uses.
  const ms = playbookMilestones(event, asOf)
    .filter((m) => cats.includes(m.category))
    .filter((m) => !(m.category === 'planning' && taskSatisfied(event, { text: m.name })));
  if (!ms.length) return null;
  const dated = ms.filter((m) => m.daysOut !== null);
  let pick;
  if (dated.length) {
    const upcoming = dated.filter((m) => m.daysOut >= 0).sort((a, b) => a.daysOut - b.daysOut);
    pick = upcoming[0] || dated.sort((a, b) => b.daysOut - a.daysOut)[0];
  } else {
    pick = ms[ms.length - 1];
  }
  if (!pick) return null;
  let action = pick.name.split(' (')[0].trim();
  if (action.length > 52) action = action.slice(0, 50).trim() + '…';
  return { action, dueDate: pick.dueDate, daysOut: pick.daysOut, owner: pick.owner, critical: pick.critical };
}

// ── Host "Decisions" board (the calm what's-settled / what's-still-open reader) ─
// Pure reader for the host Decisions surface (Figma 1692:3). Returns the open
// decisions (each with an honest status), the already-settled facts/decisions, and
// the headcount-lock hero data — ALL derived from existing engine state, never
// fabricated. No new state, no parallel generator: it reads guestCountResolved /
// attendanceBand (the SAME RSVP math every host surface uses), dietaryResolved, the
// foundation facts (date/venue), and the playbook's AUTHORED decisions[].
//
// Returns { open:[row], locked:[row], headcount:{...}|null } where a row is
//   { id, label, status:'ready'|'waiting'|'overdue'|'locked', because, dueDate, daysOut, route }.
//   • locked  — host made the pick (event.foodChoices[id]) OR the fact is set
//               (date/venue set, headcount resolved, dietary collected).
//   • overdue — its `when` (T-Nd) deadline is past (daysOut < 0) and not locked.
//   • waiting — blocked on an unmet prerequisite (a dependsOn decision not yet
//               settled, or the final headcount while RSVPs are still out).
//   • ready   — its prerequisites are met; the host just needs to commit.
// `headcount` (the count-lock hero) is present ONLY when RSVPs are genuinely
// outstanding (a roster with replies still out) — never an invented spread.

// Short, calm noun for a decision id used inside a "waiting on …" because line.
// Falls back to the id so an unmapped dependency still reads honestly.
const DECISION_DEP_NOUN = {
  format: 'the format', menu: 'the menu', dietary: 'dietary needs',
  alcohol: 'the drinks plan', seating: 'seating', help: 'whether you bring in help',
  theme: 'the theme', headcount: 'the headcount', count: 'the headcount',
};
function decisionDepNoun(id, decisions) {
  if (DECISION_DEP_NOUN[id]) return DECISION_DEP_NOUN[id];
  const d = (decisions || []).find((x) => x && x.id === id);
  return d ? decisionShortLabel(d.label) : String(id);
}
// "Seated dinner or buffet / family-style?" → trimmed, no trailing '?', capped.
function decisionShortLabel(label) {
  // A trailing parenthetical is guide voice ("game night skews light — people
  // need to think"), never label material — and truncating THROUGH it left an
  // unbalanced "(game night skews ligh…" no display transform could strip
  // (audit 2026-07-22). The rationale still reaches the host via `why`.
  //
  // NEITHER ORDER IS SUFFICIENT — STRIP UNTIL STABLE (2026-07-31).
  // Authored labels come in both shapes, and a fixed order breaks one of them:
  //   "Alcohol? (adult parties)"        — '?' hides BEHIND the parenthetical
  //   "Is this corporate (name tags…)?" — the parenthetical hides behind the '?'
  // Stripping '?' first left the first shape's mark in place, and the render
  // boundary appended a second one: "Alcohol??". Stripping the parenthetical
  // first left the second shape's paren in place, which the host-string lint
  // catches as an unbalanced paren. Looping settles both, and any future label
  // that alternates them, without either strip having to know about the other.
  let s = String(label || '').trim();
  for (let i = 0; i < 4; i++) {
    const before = s;
    s = s.replace(/\s*\([^)]*\)\s*$/, '').replace(/\?+\s*$/, '').trim();
    if (s === before) break;
  }
  if (s.length > 52) s = s.slice(0, 50).trim() + '…';
  return s;
}
function joinNouns(arr) {
  const a = arr.filter(Boolean);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
}
function decisionDueDate(eventDate, offset) {
  if (!eventDate || offset === null) return null;
  const d = new Date(eventDate + 'T00:00:00');
  d.setDate(d.getDate() + offset); // offset is negative (T-21d → -21)
  // LOCAL date, not toISOString (UTC) — east of Greenwich the UTC slice emitted the
  // previous day, the same day-shift class the daysUntil convergence killed.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function friendlyDate(d) {
  if (!d) return '';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  catch { return String(d); }
}

// A playbook decision is a MENU / sourcing CHOICE (vs a logistics, venue, theme, or
// music call) when it carries options AND its id/label/blocks mention food, drink, or
// the spread. This is the SINGLE predicate that (a) lists the decision in the FoodPlan
// "Your choices" card the host can actually act on, and (b) tells the Decisions board it
// has a real Plan-tab destination. Non-menu decisions have NO anchor on the Plan tab, so
// the board must not render a dead arrow for them (it would route to a nonexistent
// food line and do nothing — an affordance that lies). Keep this in lockstep with the
// `choices` filter in playbookFoodPlan — both must use this one function.
const MENU_DECISION_RE = /food|menu|drink|beverage|potluck|cater|spread|bar|dish|fish|fillings?|meat|protein|reveal/;
export function isMenuDecision(d) {
  if (!d || !Array.isArray(d.options) || d.options.length === 0) return false;
  const hay = `${d.id || ''} ${d.label || ''} ${(d.blocks || []).join(' ')}`.toLowerCase();
  return MENU_DECISION_RE.test(hay);
}

// ── Decision priority ordering (DECISION_SCHEMA_SPEC §4.A / §6 · Wave-2a) ──────
// The open board is scored on ALL FOUR priority axes the schema defines, not just
// the deadline: how consequential a decision is (`weight`), whether it locks in
// once committed (`reversibility`), its emotional stakes (`emotionalWeight`), and
// whether it delivers the event's heart moment (`deliversHeartMoment`). A bounded
// aging term lets an ignored overdue decision climb the longer it's neglected.
// Unset axes fall back to a neutral value (nullable-and-additive — an un-authored
// decision keeps a deadline-only position).
//
// KEY PRECEDENCE (documented, highest-ranked first):
//   1. STATUS TIER — banded, with ONE GUARDED crossing:
//        urgent overdue (overdue AND weight:'high')       → TIER 300  (always leads)
//        soft overdue (overdue, weight low/med/unset)      → TIER 200 ┐ these two
//        cross-eligible READY (deliversHeartMoment OR       → TIER 200 ┘ compete on
//          reversibility:'locked') floats UP into the zone            importance+aging
//        ordinary ready                                    → TIER 100
//        waiting (blocked on an earlier choice)            → TIER   0
//      GUARD: a heart / irreversible READY decision may out-rank a LOW/MED overdue
//      decision, but a genuinely urgent (high-weight) overdue ALWAYS wins — the
//      100-point tier gap between 300 and 200 is far larger than the ~15-point
//      importance+aging span, so an urgent overdue can never be crossed.
//   2. IMPORTANCE inside the tier: weight + emotionalWeight + reversibility + heart.
//   3. AGING: overdue decisions gain min(AGING_CAP, daysOverdue × AGING_PER_DAY).
//   4. Soonest-due tiebreak (unchanged).
const TIER_URGENT_OVERDUE = 300;
const TIER_CROSS_ZONE = 200; // soft overdue AND floated cross-eligible ready
const TIER_READY = 100;
const TIER_WAITING = 0;
// Wave-2z — a READY gate-holder (a decision ≥1 sibling is currently WAITING on) leads the rows
// it blocks: settling it unblocks downstream work, so the dependency graph SEQUENCES, not just
// gates. Sized to clear ONE weight tier (each tier ≈ 1.0 point in this lattice), so a med gate
// leads a higher-weight non-gate (food_style over alcohol) — but NOT to leap multiple tiers or
// over a safety row (the gate pass clamps below the ready safety floor, and never demotes a gate
// below its base). Far under the 100 status-tier gap, so overdue always leads.
const GATE_HOLDER_BUMP = 1.5;
const AGING_PER_DAY = 0.25; // effective-rank gained per day past the window…
const AGING_CAP = 6;        // …bounded so age never overpowers a full status tier

const WEIGHT_SCORE = { high: 3, med: 2, low: 1 };
const EMO_SCORE = { high: 2, med: 1, low: 0 };
const REV_SCORE = { locked: 2, costly: 1, reversible: 0 };

// ── Wave-2b · DERIVED importance (kill the flat tie for the 37 un-authored playbooks) ──
// Only 2 of 39 playbooks (crabFeast, retirementParty) author `weight`. Everywhere else
// decisionImportance() returned a flat ~1.5, so all rows tied and the board collapsed to
// a pure due-date sort — ranking "Pick a theme" above "Confirm guest count" and "Collect
// allergies," which no planner does. When a decision has NO authored weight, we DERIVE an
// importance signal from the decision's OWN structure. This is honest derivation from data
// the playbook already carries (blocks / dependsOn / costFactors / its own id+label text),
// NOT invented per-playbook content. Authored weight ALWAYS overrides the derived value, so
// the two flagships are byte-identical to Wave-2a.
const DIETARY_SAFETY_RE = /allerg|dietary|medical|\bsafety\b|epi.?pen|shellfish|\bnut(s|-free|\b)|heart|lung|\bcondition|mobility|\bhealth/i;
// Purely-aesthetic leaf decisions. Deliberately NOT matching bare "style" (would snag
// "Food style"), and guarded below by !hasCost / !dietarySafety so a decision that spends
// money or touches safety is never treated as a leaf even if its label mentions a vibe.
const AESTHETIC_RE = /\btheme\b|\bvibe\b|decor|colou?r|palette|\bmood\b|ambian?ce|aesthetic/i;

// Does any OTHER decision list this decision's id as a prerequisite? A depended-on
// decision gates downstream work, so it ranks up (same signal as an authored `blocks`).
function decisionIsDependedOn(id, decisions) {
  if (!id) return false;
  return (decisions || []).some((o) => o && o.id !== id
    && Array.isArray(o.dependsOn) && o.dependsOn.includes(id));
}
// Does this decision carry money? A costed choice outranks a costless leaf.
function decisionCarriesCost(d) {
  return !!(d && (
    (d.costFactors && typeof d.costFactors === 'object' && Object.keys(d.costFactors).length > 0)
    || d.costViaApproach === true
    || d.costFactorProvenance
  ));
}
// derivedImportanceOf(d, decisions) → { score, reason } for a decision with NO authored
// weight. Mirrors what a seasoned planner surfaces first, from the decision's real shape:
//   • dietary / allergy / safety text  → highest (a planner asks these early)
//   • gates downstream (has blocks[], OR a sibling dependsOn it) → ranks up
//   • carries money (costFactors)       → ranks above a costless leaf
//   • purely-aesthetic leaf (theme/vibe/decor/color, no cost) → LOWEST
//   • otherwise neutral (the prior flat baseline)
// `reason` tags the dominant axis so the rankReason reads as an HONEST derivation.
// Exported for direct unit testing: after the fleet-wide priority-axis authoring (all 39
// playbooks carry weight), this fallback is no longer exercised by a real playbook, so it
// is verified directly with synthetic decisions rather than via a now-authored playbook.
export function derivedImportanceOf(d, decisions) {
  const hay = `${(d && d.id) || ''} ${(d && d.label) || ''}`;
  const dietarySafety = DIETARY_SAFETY_RE.test(hay);
  if (dietarySafety) return { score: 3.5, reason: 'diet' };
  const hasCost = decisionCarriesCost(d);
  const gates = (Array.isArray(d && d.blocks) && d.blocks.length > 0)
    || decisionIsDependedOn(d && d.id, decisions);
  const aesthetic = AESTHETIC_RE.test(hay) && !hasCost;
  if (aesthetic) return { score: 0.75, reason: 'aesthetic' };
  let score = 1.5; // the prior neutral baseline
  let reason = 'neutral';
  if (gates) { score += 1; reason = 'gates'; }
  if (hasCost) { score += 0.75; if (reason === 'neutral') reason = 'cost'; }
  return { score, reason };
}

// importance — the intra-tier consequence score (higher ranks first). Authored weight
// wins; an un-authored row uses its board-time DERIVED weight (row._derivedWeight),
// falling back to the neutral 1.5 only if derivation was never attached. Unset
// emotional/reversibility contribute nothing (they're only authored on the 2 flagships).
function decisionImportance(row) {
  const w = WEIGHT_SCORE[row && row.weight];
  const weightScore = w == null
    ? (typeof (row && row._derivedWeight) === 'number' ? row._derivedWeight : 1.5)
    : w;
  const emo = EMO_SCORE[row && row.emotionalWeight] || 0;
  const rev = REV_SCORE[row && row.reversibility] || 0;
  const heart = row && row.deliversHeartMoment ? 2 : 0;
  return weightScore + emo + rev + heart;
}
function decisionOverdueDays(row) {
  return (row && row.status === 'overdue' && typeof row.daysOut === 'number' && row.daysOut < 0)
    ? -row.daysOut : 0;
}
function decisionAging(row) {
  return Math.min(AGING_CAP, decisionOverdueDays(row) * AGING_PER_DAY);
}
// The floated cross: a READY decision that delivers the heart moment OR is
// irreversible ('locked') rises into the overdue crossing zone (TIER_CROSS_ZONE).
function decisionCrossEligible(row) {
  return !!row && row.status === 'ready'
    && (row.deliversHeartMoment === true || row.reversibility === 'locked');
}
function decisionTier(row) {
  if (!row) return TIER_WAITING;
  if (row.status === 'overdue') return row.weight === 'high' ? TIER_URGENT_OVERDUE : TIER_CROSS_ZONE;
  if (row.status === 'ready') return decisionCrossEligible(row) ? TIER_CROSS_ZONE : TIER_READY;
  return TIER_WAITING; // waiting / anything else sinks
}
// The single ordering key — tier + importance + aging (higher ranks first).
// Wave-2e — intra-cell tiebreak. The importance score is a coarse integer lattice
// (weight 1-3 + emo 0-2 + rev 0-2 + heart 0/2), so rows with the SAME profile collapse
// to one score and previously resolved only by due-date — a calendar sort, not a
// consequence sort (the re-score's residual-tie cap). This adds a tiny continuous term,
// bounded WELL below the smallest importance step (0.25), so it can ONLY reorder exact
// ties, never flip rows that already differ in importance. It ranks a tied row up by real
// structure: how many purchases it drives (`affects`), how many sibling decisions depend
// on it, and whether it moves money — so budget-class calls lead co-equal ones by stakes.
function decisionStructuralTiebreak(row) {
  if (!row) return 0;
  const affects = Array.isArray(row.affects) ? row.affects.length : 0;
  const deps = typeof row._dependedOnCount === 'number' ? row._dependedOnCount : 0;
  const cost = decisionCarriesCost(row) ? 1 : 0;
  return Math.min(0.2, 0.03 * affects + 0.05 * deps + 0.03 * cost);
}
function decisionPriorityScore(row) {
  return decisionTier(row) + decisionImportance(row) + decisionAging(row)
    + decisionStructuralTiebreak(row);
}

// rankReason — the host-facing "why is this here?" line (the Honesty "show your
// work" fix). PREFERS an authored priorityBasis.rationale (the concurrent
// decision-intelligence contract); else derives a friendly reason from the
// dominant scoring axis. Host-voiced only — never planner jargon.
function decisionRankReason(row) {
  if (!row) return '';
  // Wave-2b horizon: a far-future window parked on a long-runway event reads "not yet" —
  // this wins even over an authored rationale, because for a PARKED row the honest headline
  // is its timing, not its stakes (the row still lives in the `deferred` bucket either way).
  if (row.horizon === 'later') return 'Comes up closer to the date.';
  const pb = row && row.priorityBasis;
  if (pb && typeof pb.rationale === 'string' && pb.rationale.trim()) return pb.rationale.trim();
  const od = decisionOverdueDays(row);
  if (row.deliversHeartMoment) return 'The moment your guests will remember.';
  if (od > 0 && row.weight === 'high') return `High-stakes — and ${od} ${od === 1 ? 'day' : 'days'} past its window.`;
  if (od > 0) return `${od} ${od === 1 ? 'day' : 'days'} past its window.`;
  if (row.reversibility === 'locked') return 'Hard to change once it’s set — worth settling early.';
  if (row.weight === 'high') return 'High-stakes — it shapes everything after it.';
  // Wave-2b DERIVED reasons — machine-derived from the decision's own structure. Phrased so
  // they read as derived, never as an authored human rationale (Honesty guardrail: a
  // derived-ranked row must sound derived). Only reached for un-authored rows.
  if (row.importanceBasis === 'derived') {
    if (row._derivedReason === 'diet') return 'Worth settling early — allergies gate the menu.';
    if (row.timeCritical) return 'Its window is open and the runway is short — worth doing now.';
    if (row._derivedReason === 'gates') return 'This decides other choices.';
    if (row._derivedReason === 'cost') return 'This one costs real money.';
    if (row._derivedReason === 'aesthetic') return 'A finishing touch — settle it when you like.';
  }
  if (row.status === 'waiting') return 'Waiting on an earlier choice.';
  if (row.timeCritical) return 'Its window is open and the runway is short — worth doing now.';
  if (typeof row.daysOut === 'number' && row.daysOut >= 0 && row.daysOut <= 7) return 'Due soon.';
  return 'Ready when you are.';
}

// The five priority-tier fields a board row carries through from its source
// decision (all NULLABLE per the spec). Passed onto every decision row so a
// shell / DIFM surface and the ordering below can read them without re-opening
// the playbook. A null source field stays null on the row.
function decisionPriorityFields(d) {
  return {
    weight: d.weight != null ? d.weight : null,
    reversibility: d.reversibility != null ? d.reversibility : null,
    emotionalWeight: d.emotionalWeight != null ? d.emotionalWeight : null,
    difmCapable: d.difmCapable != null ? d.difmCapable : null,
    deliversHeartMoment: d.deliversHeartMoment === true,
    // priorityBasis — the concurrent decision-intelligence contract
    // { rationale, tier, sources? }. Passed through so the ordering's rankReason
    // can PREFER an authored rationale and the UI can render provenance. Null when
    // the source decision doesn't declare one (most today).
    priorityBasis: d.priorityBasis != null ? d.priorityBasis : null,
  };
}

// playbookHostDifficulty(event) → the authored meta.hostDifficulty for the event's
// playbook, or null. First consumer of a field authored on all 40 playbooks and read
// by NOTHING until now (DECISION_SCHEMA_SPEC §4.F / §6.3): this closes the
// authored-but-unread gap so a shell / DIFM surface can finally scale hand-holding
// to how hard the event is. Fuller DIFM-intensity wiring (host experience × capacity)
// is a follow-up — this is the minimal read.
export function playbookHostDifficulty(event) {
  const pb = getPlaybook(event && event.type);
  const hd = pb && pb.meta && pb.meta.hostDifficulty;
  return hd != null ? hd : null;
}

export function playbookDecisionBoard(event, asOf, profile) {
  // heartAtRisk/hostDifficulty added to the empty shape too so the board's return
  // is one consistent shape whether or not there's an event (2026-07-15).
  const empty = { open: [], locked: [], deferred: [], headcount: null, hostDifficulty: null, heartAtRisk: false };
  if (!event) return empty;

  // LEARNING-1 (roadmap #2) — the board reads host MEMORY. `profile` is optional and
  // backward-compatible: every legacy caller passes 2 args ⇒ profile is undefined ⇒
  // attendanceAdjustment returns applied:false ⇒ the board is byte-identical (same
  // guarantee the food plan's read-forward already relies on). attAdj is the SAME gated
  // (Medium+ confidence AND stability), ±25%-clamped, revert-aware reader the food plan
  // trusts (App.js sizingEvent). Its `because` is attached below as SEPARATE, attributed
  // provenance on the headcount row — it NEVER overwrites the host's committed count
  // (the honesty guard a few lines down: the committed number is the plain fact). Cold
  // start (no profile / <3 reconciled events / unstable host) ⇒ applied:false ⇒ no line.
  let attAdj = null;
  try { attAdj = profile ? attendanceAdjustment(profile, event, asOf) : null; } catch { attAdj = null; }
  const headcountMemory = (attAdj && attAdj.applied)
    ? { source: 'attendance-memory', note: attAdj.because, planned: attAdj.planned, suggested: attAdj.suggested, confidence: attAdj.confidence }
    : null;

  const dte = daysToEvent(event.date, asOf); // null when no date
  const open = [];
  const locked = [];

  // ── Wave-2b · HORIZON AWARENESS (wire workflowCompression into the board) ──────
  // The board's order/partition must change with the runway, not stay byte-identical at
  // 3, 30, and 90 days out. Compute the event's compression level ONCE (standard → tight →
  // compressed → rush; null when there's no date or it's past). It gates two behaviours,
  // applied after every row is scored, below:
  //   • LONG runway (standard/tight): a READY decision whose natural window is still far
  //     out (daysOut > DEFER_WINDOW_DAYS) is not active yet — it moves to a `deferred`
  //     ("comes up closer to the date") bucket instead of nagging as an open row.
  //   • SHORT runway (compressed/rush): a READY decision whose window is open/imminent
  //     (daysOut <= TIME_CRITICAL_DAYS) escalates — marked timeCritical and bumped.
  // Overdue and waiting rows are NEVER deferred (they always lead / stay blocked).
  const compressionLevel = (dte !== null && dte >= 0) ? getCompressionLevel(dte, event.type) : null;
  const defersFarWindows = compressionLevel === 'standard' || compressionLevel === 'tight';
  const shortRunway = compressionLevel === 'compressed' || compressionLevel === 'rush';
  const DEFER_WINDOW_DAYS = 30;   // a window opening > 30d out on a long-runway event waits
  const TIME_CRITICAL_DAYS = 7;   // an open/imminent window on a short-runway event escalates
  const TIME_CRITICAL_BUMP = 1.5; // bounded — never crosses a status tier (gap is 100)

  const dateSet = !!String(event.date || '').trim() && !/^(tbd|tba)$/i.test(String(event.date).trim());
  // venueFor: home-with-city counts as venued (audit divergence #2 — the
  // "Lock the venue" foundation task was raised at hosts hosting at home).
  const hasVenue = (() => { const v = venueFor(event); return v.isSet && !/^(tbd|tba)$/i.test(v.name); })();
  const gc = guestCountResolved(event);
  const band = attendanceBand(event);
  const di = dietaryResolved(event);

  // ── Foundation facts ───────────────────────────────────────────────────────
  // Date — the anchor everything counts down from. Locked when set; otherwise the
  // one foundation we DO surface as open (a venue is optional for home hosting, so
  // an unset venue is never nagged — it only appears once settled).
  if (dateSet) {
    locked.push({ id: 'f-date', label: 'Date', status: 'locked', because: friendlyDate(event.date), dueDate: event.date, daysOut: dte, route: { eventId: event.id, tab: 'Event Details', focusField: 'event-date' } });
  } else {
    // Foundation prerequisites carry weight:'high' so the §4.A importance ordering
    // keeps them near the top of their status band (everything sizes off the date /
    // count) rather than sinking below authored decisions that DO declare a weight.
    open.push({ id: 'f-date', label: 'Lock the date', status: 'ready', because: 'Everything counts down from the date.', dueDate: null, daysOut: null, weight: 'high', deliversHeartMoment: false, route: { eventId: event.id, tab: 'Event Details', focusField: 'event-date' } });
  }
  if (hasVenue) {
    // venueFor: displayLine covers the at-home carve-out ("At home in Annapolis")
    // — the raw name was EMPTY for exactly the home-with-city events hasVenue
    // (already constitution-read) admits, leaving a blank because.
    locked.push({ id: 'f-venue', label: 'Venue', status: 'locked', because: venueFor(event).displayLine, dueDate: null, daysOut: null, route: { eventId: event.id, tab: 'Event Details' } });
  }

  // Headcount — the count-lock. A roster with replies still out → the hero (honest
  // confirmed/outstanding/invited math, never a fabricated spread). Resolved → a
  // settled fact. No number at all → an open "set a count" row (can't size anything).
  const out = (band.applicable && band.basis === 'rsvp') ? (band.maybe + band.pending) : 0;
  let headcount = null;
  if (gc.resolved) {
    // The foundation fact is the host's COMMITTED number (what they planned for) —
    // band.planned for a typed count/estimate, band.planning for a settled roster.
    // The attendance SHIFT is a sizing derivation (food/supplies/budget), not a
    // restatement of the fact the host locked, so it never appears here.
    const n = band.planned || (band.applicable ? band.planning : (Number(event.guestCount) || Number(event.guestEstimate) || 0));
    // `grounded` (LEARNING-1) is SEPARATE attributed provenance, not the fact: `because`
    // stays the host's committed count; `grounded` (null unless memory applies) carries
    // "based on your last events, fewer usually came — size for N" for a shell to render.
    locked.push({ id: 'f-headcount', label: 'Headcount', status: 'locked', because: `${n} ${n === 1 ? 'guest' : 'guests'}`, grounded: headcountMemory, dueDate: null, daysOut: null, route: { eventId: event.id, tab: 'Guests' } });
  } else if (out > 0) {
    headcount = {
      confirmed: band.confirmed,
      outstanding: out,
      invited: band.invited,
      planning: band.planning,
      label: attendanceBandLabel(band),
      because: `${band.confirmed} confirmed · ${out} still out of ${band.invited} invited`,
      grounded: headcountMemory,
      route: { eventId: event.id, tab: 'Guests', focusField: 'guests-entry' },
    };
  } else {
    open.push({ id: 'f-headcount', label: 'Lock your guest count', status: 'ready', because: 'Food, drinks, and seating all size from your headcount.', dueDate: null, daysOut: null, weight: 'high', deliversHeartMoment: false, route: { eventId: event.id, tab: 'Guests', focusField: 'guests-entry' } });
  }

  // ── Playbook decisions ─────────────────────────────────────────────────────
  const pb = getPlaybook(event.type);
  // DESTINATION-1: generic travel decisions, additive on top of the base
  // playbook's own — never gating on type, only on the host-set isDestination
  // modifier (same architecture as kids/diet elsewhere in this file).
  const decisions = [
    ...((pb && Array.isArray(pb.decisions)) ? pb.decisions : []),
    ...destinationDecisionsFor(event, pb),
    ...militaryDecisionsFor(event),
  ];
  const picks = (event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices : {};
  const isDietaryDecision = (d) => d.id === 'dietary' || /dietary|allerg/i.test(d.label || '');
  // A decision is locked when the host picked it (foodChoices[id]) OR the underlying
  // fact is settled — dietary uses the SAME predicate the food gate / next-step use.
  const isLocked = (d) => !!picks[d.id] || (isDietaryDecision(d) && di.resolved);
  const lockedIds = new Set(decisions.filter(isLocked).map((d) => d.id));
  // A prerequisite (dependsOn) is met when it's a locked decision, dietary collected,
  // or the headcount resolved. Anything else is treated as still-pending (honest: we
  // only claim "met" from observable state).
  const depMet = (depId) => {
    if (lockedIds.has(depId)) return true;
    if (depId === 'dietary' && di.resolved) return true;
    if (depId === 'headcount' || depId === 'count') return gc.resolved;
    return false;
  };

  // The destination's own choice list (FoodPlan "Your choices") — the ONLY ids
  // a foodFocus route may name (same-source rule).
  const _foodChoiceIds = (() => {
    try { const fp = playbookFoodPlan(event); return new Set(((fp && fp.choices) || []).map((c) => c && c.id).filter(Boolean)); }
    catch { return new Set(); }
  })();
  // ── PRIO Slice-A (roadmap #9): TRANSITIVE dependent count ──────────────────
  // `_dependedOnCount` fed the gate-holder bump + tiebreak with DIRECT dependents only
  // (siblings whose dependsOn names this id). That undercounts a foundational decision:
  // `budget` may have 1 direct dependent (`guestcount`) yet gate the whole
  // guestcount→venue→catering→… chain. Counting the TRANSITIVE closure over the SAME
  // authored dependsOn graph (no invented edges) makes a true root lead the rows it
  // ultimately unblocks. Built once per board; the graph is tiny (≤~15 nodes/playbook).
  const _directDependentsOf = (() => {
    const m = Object.create(null);
    for (const o of decisions) {
      if (o && Array.isArray(o.dependsOn)) {
        for (const dep of o.dependsOn) { (m[dep] || (m[dep] = new Set())).add(o.id); }
      }
    }
    return m;
  })();
  const _transitiveDependentCount = (id) => {
    const seen = new Set();
    const stack = [...(_directDependentsOf[id] || [])];
    while (stack.length) {
      const cur = stack.pop();
      if (cur === id || seen.has(cur)) continue;   // cycle/self guard (authored graph is a DAG, but be safe)
      seen.add(cur);
      for (const nxt of (_directDependentsOf[cur] || [])) if (!seen.has(nxt)) stack.push(nxt);
    }
    return seen.size;
  };
  for (const d of decisions) {
    if (!d || !d.label) continue;
    // ── Coherence gate (audit 2026-07-27): the board finally speaks the same
    // gating vocabulary tasks and purchases always have. Two forms:
    //   whenChoice {id,in}      — show only while the referenced pick (answered
    //                             OR authored default, same as choiceShown
    //                             everywhere else) is in `in`.
    //   standsDownWhen {id,in}  — the inverse blocks[] never had: RETIRE this
    //                             decision once the referenced decision is
    //                             ANSWERED with a pick in `in`. Answered only —
    //                             a default is an assumption, and suppressing a
    //                             real ask on an assumption would hide work.
    // Before this gate, settling "caterer" left potluck-coordination, menus,
    // and pot-sizing decisions live on the board (findings F1–F6).
    if (d.whenChoice && !choiceShown(event, d.whenChoice)) continue;
    if (d.standsDownWhen && d.standsDownWhen.id) {
      const answered = (event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices[d.standsDownWhen.id] : null;
      if (answered != null && (Array.isArray(d.standsDownWhen.in) ? d.standsDownWhen.in : []).includes(answered)) continue;
    }
    // whenKids on a DECISION (F7): a childcare ask has no business on a board
    // with no kids coming — same eventHasKids truth tasks already gate on.
    if (d.whenKids && !eventHasKids(event)) continue;
    const offset = buyOffsetDays(d.when); // 'T-21d' → -21 ; null when no `when`
    const daysOut = (dte !== null && offset !== null) ? dte + offset : null;
    const dueDate = decisionDueDate(dateSet ? event.date : null, offset);
    // Only a menu/sourcing choice has a real Plan-tab destination (the FoodPlan "Your
    // choices" card focuses it). A non-menu decision (venue, theme, music, seating…) has
    // no anchor, so it gets NO route — the board renders it as a calm "still open" prompt
    // instead of a tappable row whose arrow would lead nowhere.
    // Every open decision is ACTIONABLE — tapping takes the host to where they settle it, and because the
    // board re-derives from the plan on every change, updating that field/row moves the row OPEN → LOCKED
    // on its own (single source: foodChoices / dietary / headcount / …). A menu pick settles inline
    // (foodFocus, the "Your choices" card); dietary lives in Guests; vendor/team calls in Vendors;
    // everything else lands on the Plan tab where the host handles it — never a dead, chevron-less prompt.
    const _blocks = (Array.isArray(d.blocks) ? d.blocks : []).join(' ').toLowerCase();
    // Deep-link doctrine: every tappable settle row lands ON the element where it
    // resolves — menu picks settle inline (foodFocus), dietary lands on the food
    // plan's dietary card, vendor calls land on the first vendor still needing
    // the host (else the add button). A decision with NO real destination gets
    // NO route — the board renders it as a calm prompt, never a dead chevron.
    const _firstUndoneVendorRoute = () => {
      const vs = (event.vendors || []).filter((v) => v && String(v.name || '').trim());
      // POP-1C: isVendorBooked is the canonical "is this vendor booked?" predicate
      // (workstreams.js) — this inline regex used to miss 'Deposit Paid' and
      // 'Contracted', wrongly routing the host back to a vendor that's actually
      // booked. Three other call sites were already migrated; this was the one left.
      const undone = vs.find((v) => !isVendorBooked(v)
        || (Number(v.depositAmt) > 0 && !v.depositPaid) || v.coiStatus === 'required');
      const tv = undone || vs[0];
      return tv ? { eventId: event.id, tab: 'Vendors', vendorId: tv.id }
        : { eventId: event.id, tab: 'Vendors', focusField: 'vendor-add' };
    };
    const _hay = `${d.id || ''} ${d.label || ''} ${_blocks}`.toLowerCase();
    // CTA SOURCE-OF-TRUTH (50-scenario audit, 2026-07-07): a foodFocus route is
    // truthful ONLY when the food plan's "Your choices" card actually renders
    // this decision — plan.choices is the destination's own list. Optioned
    // decisions outside it (theme, shade, registry, games…) settle INLINE on
    // the board row itself, so they carry no route (the row is the consumer).
    const _isFoodChoice = _foodChoiceIds.has(d.id);
    const route = (Array.isArray(d.options) && d.options.length > 0 && _isFoodChoice) ? { eventId: event.id, tab: 'Planning', foodFocus: d.id }
      : isDietaryDecision(d) ? { eventId: event.id, tab: 'Planning', focusField: `fp-diet-${event.id}` }
      : /vendor|team|hire|staff/.test(_blocks) ? _firstUndoneVendorRoute()
      // Free-form menu/food decisions (no authored options) resolve on the food
      // plan card — the host locks the menu there, never on a bare tab.
      : /menu|food|dish|course|drink/.test(_hay) ? { eventId: event.id, tab: 'Planning', focusField: 'food-plan' }
      : null;

    const priority = decisionPriorityFields(d);
    // Wave-2b: when the source decision authors no `weight`, derive an importance signal
    // from its own structure (blocks / dependsOn / costFactors / id+label text). Authored
    // weight always wins — the 2 flagships keep `importanceBasis:'authored'` and are
    // untouched. Attached to every decision row so decisionImportance() and the rankReason
    // can read a HONEST derived value instead of collapsing to a flat tie.
    let importanceBasis = 'authored';
    let _derivedWeight = null;
    let _derivedReason = null;
    if (d.weight == null) {
      const dv = derivedImportanceOf(d, decisions);
      importanceBasis = 'derived';
      _derivedWeight = dv.score;
      _derivedReason = dv.reason;
    }
    // Wave-2c-2: the decision's `when` timing provenance — authored if grounded, else the
    // category resolver's real-sourced provenance (venue/invite/rsvp/rentals/etc.), else
    // null (honestly ungrounded). Surfaced on the row so the deadline behind sequencing is
    // sourced where a planning standard applies, and a UI can show WHY / whether it's researched.
    const timingProvenance = effectiveTimingProvenance(d) || null;
    const timingGrounded = isGroundedTiming(timingProvenance);
    // Wave-2e + PRIO Slice-A: how many decisions depend on this one, TRANSITIVELY — the real
    // consequence signal the gate-holder bump + intra-cell tiebreak read to sequence by how
    // much a call unblocks, not just its direct dependents. Authored-edge closure only.
    const _dependedOnCount = _transitiveDependentCount(d.id);
    const _affects = Array.isArray(d.affects) ? d.affects : undefined;
    // Wave-2g: the structured cultural/religious axis — how faith/tradition steers this
    // decision, grounded against a real cited source. Surfaced on the row so a UI can show
    // the tradition + why it's the host's/family's call, and never the app's to default.
    const culturalContext = d.culturalContext || null;
    const culturalGrounded = isGroundedCulture(culturalContext);
    // Military-retirement protocol axis (Army): a decision injected for a military retirement
    // carries a militaryContext grounded to real Army references — a new grounded Coverage axis.
    const militaryContext = d.militaryContext || null;
    const militaryGrounded = isGroundedMilitary(militaryContext);
    // Destination-travel axis: the groundable travel calls (health/altitude, the late-night
    // ride, a room block's attrition) carry a destinationContext grounded to real references.
    const destinationContext = destinationContextFor(d.id);
    const destinationGrounded = isGroundedDestination(destinationContext);
    // Wave-2h: the accessibility axis — venue/seating decisions carry a grounded (ADA /
    // inclusive-seating) consideration, resolved centrally. Surfaced so a UI can show the
    // access guideline that steers the choice.
    const accessibilityContext = effectiveAccessibility(d);
    const accessibilityGrounded = isGroundedAccessibility(accessibilityContext);
    // Wave-2i: whether this decision's cost factors are researched against a real market
    // source (vs a synthesized heuristic) — surfaced so a UI can show sourced pricing.
    const costGrounded = isGroundedCost(d.costFactorProvenance);
    // Wave-2j: the legal/liability axis — an alcohol-service, paid-vendor, or public-space
    // decision carries a grounded (social-host / dram-shop / COI / permit) consideration.
    const legalContext = effectiveLegal(d);
    const legalGrounded = isGroundedLegal(legalContext);
    // Wave-2l: the venue-constraint axis — does the SPACE physically fit and power the event
    // (capacity vs headcount, power load)? Distinct from accessibility's ADA-access slice.
    const venueContext = effectiveVenue(d);
    const venueGrounded = isGroundedVenue(venueContext);
    // Wave-2n: two more grounded axes — weather contingency (outdoor exposure) and the
    // human/relational dimension (whose day it is; guest & family dynamics).
    const weatherContext = effectiveWeather(d);
    const weatherGrounded = isGroundedWeather(weatherContext);
    const humanContext = effectiveHuman(d);
    const humanGrounded = isGroundedHuman(humanContext);
    // Wave-2o: the dietary/allergy safety axis — FDA major-allergen + dietary/religious needs.
    const dietaryContext = effectiveDietary(d);
    const dietaryGrounded = isGroundedDietary(dietaryContext);
    // Wave-2p: budget-authority (who approves the spend) + kids/childcare supervision safety.
    const budgetContext = effectiveBudget(d);
    const budgetGrounded = isGroundedBudget(budgetContext);
    const childcareContext = effectiveChildcare(d);
    const childcareGrounded = isGroundedChildcare(childcareContext);
    const derived = { importanceBasis, _derivedWeight, _derivedReason, timingProvenance, timingGrounded, _dependedOnCount, culturalContext, culturalGrounded, militaryContext, militaryGrounded, destinationContext, destinationGrounded, accessibilityContext, accessibilityGrounded, costGrounded, legalContext, legalGrounded, venueContext, venueGrounded, weatherContext, weatherGrounded, humanContext, humanGrounded, dietaryContext, dietaryGrounded, budgetContext, budgetGrounded, childcareContext, childcareGrounded, ...(_affects ? { affects: _affects } : {}) };
    if (isLocked(d)) {
      const val = picks[d.id] || (isDietaryDecision(d) ? 'Collected' : (d.default || 'Set'));
      locked.push({ id: d.id, label: decisionShortLabel(d.label), ask: authoredQuestion(d.label), status: 'locked', because: String(val), dueDate, daysOut, ...priority, ...derived, route });
      continue;
    }

    const deps = Array.isArray(d.dependsOn) ? d.dependsOn : [];
    const unmet = deps.filter((x) => !depMet(x));
    let status; let because; let assurance = null;
    if (daysOut !== null && daysOut < 0) {
      // OVERDUE-ON-CREATION FIX: a decision is only genuinely "past its easy
      // window" if it was ever REACHABLE — i.e. there was runway between when
      // the host created the event and when the decision's window closed. An
      // event created two days out never had a chance at a 21-day-lead
      // decision, so that's a tight timeline, not the host being late.
      // (event.createdAt exists in the data model; unknown ⇒ assume reachable,
      // preserving prior behavior for legacy events with no timestamp.)
      const runwayAtCreation = event.createdAt ? daysToEvent(event.date, event.createdAt) : null;
      const wasReachable = runwayAtCreation === null
        || (offset !== null && (runwayAtCreation + offset) >= 0);
      const od = Math.abs(daysOut);
      if (wasReachable) {
        status = 'overdue';
        // SAY IT IN A HUMAN UNIT (click-through audit 2026-07-28). A raw day
        // count is right and readable at a few weeks; at 291 it reads as broken
        // data, especially sitting on an event that is still MONTHS away. The
        // fact is unchanged — a long-lead decision (book the venue, set the
        // budget) genuinely has a window that closed long ago — so we keep it
        // and change the unit, rather than hiding the number or capping it.
        because = od >= 60
          ? `Its easy window closed about ${Math.round(od / 30)} months ago.`
          : `Was due ${od} ${od === 1 ? 'day' : 'days'} ago.`;
        // ── THE HERO SAYS WHAT IS TRUE FORWARD; THE SHEET KEEPS THE STATUS ──
        // Board re-sit 2026-07-30. `because` above is a FILING line and stays that
        // way in the Calls-to-make sheet, where a status column is legitimate. It
        // must not be the hero's voice, for two reasons the board proved:
        //  1. IT COLLIDES WITH THE COUNTDOWN. od = lead - daysToEvent, so it exceeds
        //     the eyebrow whenever lead > 2x daysToEvent. At T-6d every authored lead
        //     >= 14 collides -- ~71% of overdue-capable decisions. "6 DAYS" over
        //     "Was due 54 days ago." reads as a date bug, not a caution.
        //  2. IT IS INACCURATE AS WELL AS UNKIND. Nothing stalled. choicePickFor()
        //     (~:505) returns `picks[id] || dec.default`, and the doctrine at ~:534
        //     is explicit that those helpers "fall back to the playbook's authored
        //     default so quantities/visibility render sensibly before any pick is
        //     made". The plan HAS been running -- on our pick, not the host's.
        // Says OUR pick, never "you chose": the same comment draws that line, so an
        // unanswered decision never reads as though the host answered it.
        // No number, so the eyebrow stays the one clock on the screen.
        // NULL when there is no default to have been running on (a genuine either/or,
        // ask-mode) -- the hero then prints nothing rather than a generic reassurance.
        assurance = d.default
          ? (d.reversibility === 'costly'
            ? 'The plan’s been running on our pick — swapping it now costs more than it did.'
            : 'Nothing’s stalled — the plan’s been running on our pick.')
          : null;
      } else {
        // never in the easy window — surface as an open, do-this-first item,
        // NOT a blameworthy "overdue" that inflates the "N past their easy
        // window" count on a brand-new event.
        status = 'ready';
        because = 'A good place to start.';
      }
    } else if (unmet.length) {
      status = 'waiting';
      const nouns = unmet.map((x) => decisionDepNoun(x, decisions));
      because = nouns.length ? `Waiting on ${joinNouns(nouns)}.` : 'Waiting on an earlier choice.';
    } else {
      status = 'ready';
      // Don't print an absurd far-out count ("about 338 days out" on a year-away event). A day-count
      // only reads as sensible inside a real planning window; beyond it, say there's plenty of time.
      because = daysOut === null ? 'Ready when you are.'
        : daysOut <= 0 ? 'Good to lock today.'
          : daysOut > 45 ? 'Ready when you are — plenty of time.'
            : `Good to lock — about ${daysOut} ${daysOut === 1 ? 'day' : 'days'} out.`;
    }
    // `ask` carries the AUTHORED question, derived from d.label — the full
    // authored string, never the short card label. The short label is a display
    // truncation (52 chars, parenthetical peeled) and re-deriving a question from
    // it loses exactly the authored labels this is meant to preserve. One
    // Only a label AUTHORED as a question becomes an ask — authoredQuestion()
    // returns null for a declarative decision NAME, which then falls through to
    // the builder ladder rather than being punctuated into a fake question.
    open.push({ id: d.id, label: decisionShortLabel(d.label), ask: authoredQuestion(d.label), status, because, assurance, dueDate, daysOut, ...priority, ...derived, route });
  }

  // Wave-2a priority ordering (DECISION_SCHEMA_SPEC §4.A/§6). Every open row is
  // scored on ALL FOUR axes + a bounded aging term (see the KEY PRECEDENCE note
  // above), and each carries a host-facing `rankReason` explaining WHY it sits
  // where it does (preferring an authored priorityBasis.rationale). The status
  // band is still the dominant term — but a heart / irreversible READY decision
  // may now float above a LOW/MED overdue one, while a genuinely urgent
  // (high-weight) overdue always leads. Sort DESCENDING by score, soonest-due
  // tiebreak. (Superseded the 2026-07-15 status-primary lexicographic sort, which
  // buried a ready tribute below any overdue admin row and never aged anything.)
  for (const r of open) {
    r.priorityScore = decisionPriorityScore(r);
    // Wave-2b SHORT-runway escalation: a READY decision whose window is open/imminent on a
    // compressed/rush event is time-critical — mark it and bump it (bounded; never crosses a
    // status tier). Overdue/waiting rows are excluded (they already lead / stay blocked).
    if (shortRunway && r.status === 'ready' && typeof r.daysOut === 'number' && r.daysOut <= TIME_CRITICAL_DAYS) {
      r.timeCritical = true;
      r.priorityScore += TIME_CRITICAL_BUMP;
    }
    // Wave-2b LONG-runway deferral: a READY decision whose window is still far out on a
    // standard/tight event isn't active yet — mark it `horizon:'later'` so it partitions
    // into the `deferred` bucket below. Set BEFORE rankReason so the "comes up closer"
    // reason fires. Never defers overdue/waiting, foundation facts (daysOut null), or
    // rows on a short-runway event.
    //
    // Wave-2b.1 ANCHOR EXEMPTION: never defer a decision the engine itself already
    // treats as top-tier — the blunt >30d cliff otherwise buries rows a planner keeps
    // visible from the start. A row anchors (stays ACTIVE even far out) if it is:
    //   • authored HIGH weight (venue-class — the highest-stakes call); or
    //   • a heart moment (never buried — matches the Wave-2a float, which floats hearts
    //     UP; parking one far out would contradict that); or
    //   • an allergy/safety call (DERIVED 'diet' — a planner asks these early).
    // Deliberately NARROW: NOT keyed on reversibility (hard-to-undo ≠ decide-early — a
    // crab order is costly yet placed LATE as prices move with the catch) nor on the
    // derived 'gates' signal (which fires on any `blocks:['food']` CATEGORY tag, not a
    // real downstream-decision dependency — anchoring on it would park nothing). So
    // authored med/low perishable calls (steam, size, where, sides, drinks) still park
    // correctly at their real T-7/T-10 windows; only genuine top-tier rows stay pinned.
    const isAnchor = WEIGHT_SCORE[r.weight] >= 3
      || r.deliversHeartMoment === true
      || r._derivedReason === 'diet';
    if (defersFarWindows && r.status === 'ready' && typeof r.daysOut === 'number'
        && r.daysOut > DEFER_WINDOW_DAYS && !isAnchor) {
      r.horizon = 'later';
    }
    r.rankReason = decisionRankReason(r);
  }
  // Wave-2z DEPENDENCY-DRIVEN ORDERING (safety-guarded): a READY, ACTIVE gate-holder — a decision
  // ≥1 sibling is currently WAITING on (its unmet prerequisite) — leads the rows it blocks, so
  // settling it unblocks downstream, the way a planner opens with "how's the food handled?" before
  // "what drinks?". The +GATE_HOLDER_BUMP clears one full weight tier (a med gate leads a HIGHER-
  // weight non-gate), but is CLAMPED below every ready SAFETY row (allergy/heart/high-stakes) so
  // safety is never buried by a sequencing lift — and never demotes a gate below its own base.
  // Bounded far under the 100 status-tier gap, so overdue/cross-zone still lead outright.
  {
    const activeReady = open.filter((r) => r.status === 'ready' && r.horizon !== 'later');
    const isSafety = (r) => r.deliversHeartMoment === true || r._derivedReason === 'diet' || /dietary|allerg/i.test(`${r.id} ${r.label || ''}`);
    const safetyFloor = Math.min(Infinity, ...activeReady.filter(isSafety).map((r) => r.priorityScore));
    for (const r of activeReady) {
      if (!isSafety(r) && typeof r._dependedOnCount === 'number' && r._dependedOnCount > 0) {
        r.gateHolder = true;
        // Depth (wave-2ab): a gate that unblocks MORE leads one that unblocks fewer — a planner
        // sequences by how much a call frees. Base +1.5 (one weight tier) + a small per-extra-
        // dependent term, capped at +2.5 so a many-dep gate still stays within one tier's reach
        // and below the safety clamp / the 100 status-tier gap.
        const bump = GATE_HOLDER_BUMP + Math.min(1.0, 0.4 * (r._dependedOnCount - 1));
        r.priorityScore = Math.max(r.priorityScore, Math.min(r.priorityScore + bump, safetyFloor - 0.01));
      }
    }
  }
  // HORIZON PARTITION — deferred ("comes up closer") vs the active board. This is the
  // genuine order/partition change vs Wave-2a: at 90 days out a T-5d store-run lands in
  // `deferred`; at 3 days out the same decision is overdue and leads `open`.
  const deferred = open.filter((r) => r.horizon === 'later');
  const active = open.filter((r) => r.horizon !== 'later');
  const byScore = (a, b) => (b.priorityScore - a.priorityScore)
    || ((a.daysOut == null ? 9999 : a.daysOut) - (b.daysOut == null ? 9999 : b.daysOut));
  active.sort(byScore);
  deferred.sort(byScore);

  // heartAtRisk — any UNSETTLED decision that delivers a heart moment, whether it's active
  // or merely deferred (a shell protecting the moment cares either way). Board-scoped by
  // design; CommandCenter's heart nudge is a deliberate follow-up (not wired here).
  const heartAtRisk = active.concat(deferred).some((r) => r.deliversHeartMoment === true);

  // Wave-2c GROUNDING: the horizon partition above is derived from the event's
  // compression level, which reads STANDARD_LEAD_DAYS. Surface the runway's provenance
  // so the timing behind the "comes up closer" deferral is sourced, not a bare guess —
  // a UI can show WHY (and whether it's researched or a heuristic), and the grounding
  // audit can count it. `leadGrounded` is the honest tier flag for this event type.
  const leadProvenance = getStandardLeadProvenance(event.type);
  const leadGrounded = isGroundedLead(event.type);

  // Wave-2m ADAPTIVITY: fit the board to THIS host, not just this event type. Reads two
  // per-host inputs — experience (first-time vs experienced) and capacity (solo vs has-help)
  // — and composes them with the event's authored difficulty to produce a genuinely
  // different board: a first-timer (or a solo host on a hard event) gets HIGH hand-holding —
  // a small starting `focus` set (don't show all N calls at once), every derivable default
  // pre-proposed, and reassurance on; an experienced host on an easy event gets a TERSE
  // board — the full list, nothing pre-proposed, no reassurance. Absent inputs default to
  // the neutral 'standard' (byte-identical to the prior board), so this is additive.
  const hostAdaptation = computeHostAdaptation(
    event.hostExperience || null,
    event.hostCapacity || null,
    playbookHostDifficulty(event),
    active.length,
    Number(event.guestCount || event.guestEstimate || (gc && gc.count) || 0) || 0,
    dte, // Wave-2t3: the RUNWAY (days to event) — the 5th, dominant pacing signal
  );
  // Wave-2r ADAPTIVITY DEPTH — a seasoned planner doesn't just show a nervous first-timer
  // FEWER calls, they SEQUENCE the calls differently. byScore (above) leads with the
  // highest-leverage call, which is what a seasoned host wants — the big levers first. A
  // hand-held host (proposeDerivable) is eased in instead: overdue calls stay pinned so a
  // real deadline is never buried, but among everything else we lead with the lowest-stakes,
  // most-reversible wins to build momentum before the daunting, high-leverage calls. This
  // reorders the WHOLE active board (`open`), not just how many rows show — so the same
  // event genuinely recommends a different ORDER per host. Gated on proposeDerivable, so a
  // neutral/seasoned board is byte-identical to before (additive).
  if (hostAdaptation.proposeDerivable) {
    // Hand-held ordering: overdue stays a pinned block ABOVE the rest (never bury a deadline),
    // but WITHIN each block lead with the lowest-consequence, most-recoverable calls first —
    // for a nervous host, clear the recoverable ones to build momentum and cut panic instead
    // of opening on the highest-stakes call. A seasoned host keeps the leverage-first byScore
    // order (above). Crucially this differentiates the ORDER per host even when the WHOLE board
    // is overdue — where a pure urgency sort collapses to one identical answer for everyone.
    const consequence = (r) => (r.weight === 'high' ? 2 : 0) + (r.deliversHeartMoment ? 1 : 0) + (r.reversibility === 'locked' ? 1 : 0);
    const easeRank = (r) => (r.status === 'overdue' ? 0 : 100) + consequence(r);
    active.sort((a, b) => (easeRank(a) - easeRank(b)) || byScore(a, b));
  }
  // The first-timer's starting set — the few calls to foreground before the rest. A terse
  // board focuses on everything (the whole active list); a hand-held one narrows it.
  const focus = active.slice(0, hostAdaptation.focusCount).map((r) => r.id);

  return {
    open: active, locked, deferred, headcount,
    hostDifficulty: playbookHostDifficulty(event),
    heartAtRisk, leadProvenance, leadGrounded,
    hostExperience: event.hostExperience || null,
    hostCapacity: event.hostCapacity || null,
    hostAdaptation, focus,
    // LEARNING-1 (roadmap #2): one top-level accessor for the attendance-memory
    // provenance (null unless applied), so a shell can render it wherever it shows
    // the headcount without hunting for the f-headcount row vs the RSVP hero. It's the
    // same object attached to those rows' `grounded` field. Cold start ⇒ null ⇒ no line.
    headcountMemory,
  };
}

// Wave-2m — compose the per-host inputs with the event's difficulty into a concrete board
// adaptation. This is the "fits THIS host" lever the adaptivity re-score kept naming: the
// SAME event yields a different board for a nervous first-timer than for a seasoned host.
const HOST_DIFF_BAND = (d) => (/(hard|high|intensive|complex)/i.test(String(d)) ? 'hard'
  : /(easy|low|simple|light)/i.test(String(d)) ? 'easy' : 'moderate');
export function computeHostAdaptation(experience, capacity, difficulty, openCount, guestCount, runwayDays) {
  const band = HOST_DIFF_BAND(difficulty);
  const firstTime = experience === 'first_time' || experience === 'first-time' || experience === 'novice';
  const experienced = experience === 'experienced' || experience === 'seasoned';
  const solo = capacity === 'solo';
  // Event SIZE scales hand-holding independently of the host: a big crowd is more to manage,
  // so a solo host on a large event gets walked through it, and even a seasoned host on a
  // large event doesn't get the terse treatment. Small <20 / medium 20-75 / large >75.
  const n = typeof guestCount === 'number' && guestCount > 0 ? guestCount : null;
  const size = n == null ? 'unknown' : n > 75 ? 'large' : n < 20 ? 'small' : 'medium';
  // Wave-2t3/2t4 THE CLOCK — the 5th, dominant pacing signal a human planner reads: the RUNWAY
  // (days to the event). The cadence ramps MONOTONICALLY with the clock rather than flipping
  // once: rush ≤7d / tight 8–21d / standard 22–120d / relaxed >120d (unknown when no date).
  // Near the deadline everything compresses — surface more per session + a wider first
  // foreground, because dripping a tiny batch would strand a host who must move now; a long
  // runway genuinely relaxes to a gentler drip than the standard middle. Each band differs.
  const runway = typeof runwayDays === 'number' && runwayDays >= 0
    ? (runwayDays <= 7 ? 'rush' : runwayDays <= 21 ? 'tight' : runwayDays > 120 ? 'relaxed' : 'standard')
    : 'unknown';
  // first-foreground size + follow-on-batch adjustment, graduated across the runway (unknown
  // behaves as the standard middle, so a dateless board is byte-identical to before — additive).
  const RUNWAY_FOCUS = { rush: 5, tight: 4, standard: 3, relaxed: 2, unknown: 3 };
  const RUNWAY_BATCH_ADJ = { rush: 2, tight: 1, standard: 0, relaxed: -1, unknown: 0 };
  // EMOTION-STATE (roadmap #5) — OVERWHELM read from BEHAVIOR, not just who the host is. A big
  // pile of still-open calls AND a short runway means the host is underwater no matter how
  // seasoned they are — a human planner reads that state and slows down, shrinks the ask, and
  // reassures. Derived purely from signals already in hand (open count × how close the deadline
  // is); no new input, no fabrication. Requires BOTH a real pile AND real time pressure, so a
  // calm board (few open, OR a long runway) never trips it — every existing scenario stays
  // byte-identical (relaxed/unknown runway can't be overwhelmed here by design).
  const overwhelm = typeof openCount === 'number' && openCount > 0 && (
    (runway === 'rush' && openCount >= 5) ||
    (runway === 'tight' && openCount >= 8) ||
    (runway === 'standard' && openCount >= 14)
  );
  // hand-holding level: high (walk them through), standard (neutral), light (get out of the way).
  let handHolding = 'standard';
  if (firstTime || (solo && band === 'hard') || (solo && size === 'large')) handHolding = 'high';
  else if (experienced && band !== 'hard' && size !== 'large') handHolding = 'light';
  // OVERWHELM never RE-ORDERS the board — safety (dietary/allergy/heart) and overdue must keep
  // leading no matter how underwater the host is, so it deliberately does NOT force handHolding
  // 'high' (which would trigger the ease-in re-sequence). It only (a) stops the terse "get out
  // of the way" treatment — you don't go quiet on someone who's drowning — and (b) drives
  // reassurance + paced chunking below, leaving the leverage/safety ORDER byte-identical.
  if (overwhelm && handHolding === 'light') handHolding = 'standard';
  // the clock widens/narrows a hand-held host's first foreground; a rush shows the most up
  // front, a long runway the least — the clock overrides the gentle default when time is short.
  // OVERWHELM paces even a non-hand-held host: shrink the first foreground to a runway-sized
  // few ("just these first"), same as a hand-held board — but the ORDER stays leverage/safety-
  // first (no ease-in re-sequence, since proposeDerivable below is unchanged).
  const focusCount = (handHolding === 'high' || overwhelm) ? Math.min(RUNWAY_FOCUS[runway], openCount)
    : handHolding === 'light' ? openCount
      : Math.min(5, openCount);
  return {
    experience: experience || 'unknown',
    capacity: capacity || 'unknown',
    difficultyBand: band,
    size,
    runway,
    handHolding,
    focusCount,
    // proposeDerivable drives the board's SEQUENCE (Wave-2r): a hand-held host's active list
    // is re-ordered to lead with low-stakes, reversible wins (ease-in / momentum) instead of
    // the leverage-first order a seasoned host gets. reassure adds the plain-language line;
    // terse suppresses hand-holding copy for a seasoned host on a light board.
    // proposeDerivable stays gated on real host input ONLY — overwhelm never re-orders.
    proposeDerivable: handHolding === 'high',
    reassure: handHolding === 'high' || overwhelm,
    terse: handHolding === 'light',
    // EMOTION-STATE: the raw underwater signal, exposed so a shell can speak to the STATE
    // ("that's a lot with the clock ticking — just these few first") distinctly from the
    // first-timer's gentler reassurance. False on every calm board ⇒ additive.
    overwhelm,
    // Wave-2s PACE — a hand-held host doesn't get the whole list at once; the board is
    // chunked into paced sessions ("start with these few, the rest surface after") sized by
    // focusCount. This adapts the PACE across the runway, not just the order — and it stays
    // differentiated even on a deadline-heavy board (where the order alone collapses to the
    // same urgent-first sequence for everyone): the hand-held host still gets a small first
    // session, the seasoned host gets the full list. batchSize is the session size.
    staged: handHolding === 'high' || overwhelm,
    // batchSize sizes the SUBSEQUENT paced sessions, independent of focusCount (the first,
    // gentlest foreground set): a larger event surfaces slightly larger follow-on batches so
    // a big to-do list doesn't take too many taps to walk, while the first session stays small.
    // The runway compresses/relaxes the follow-on batch monotonically (rush +2 … relaxed −1,
    // floor 2) on top of the size base — pace by WHEN, graduated, not a single cliff (Wave-2t4).
    batchSize: handHolding === 'high'
      ? Math.max(2, (size === 'large' ? 4 : 3) + RUNWAY_BATCH_ADJ[runway])
      : focusCount,
  };
}

// Options accessor for a single menu/sourcing decision, so the Decisions board can
// settle it INLINE (radio divider-rows) without routing the host to the FoodPlan
// "Your choices" mirror. Returns null unless `id` is a genuine menu decision with
// options — the board keeps its route-away behavior for everything else. The
// `chosen` value uses the SAME choicePickFor() fallback the spread/budget/task
// engine uses (explicit pick → authored default), and a pick is applied through the
// SAME single-source path (event.foodChoices[id]) that "Your choices" writes — the
// board never invents a parallel choice store. Shape mirrors playbookFoodPlan's
// `choices` rows: { id, label, options, why, chosen }.
export function playbookDecisionOptions(event, id) {
  if (!event || !id) return null;
  const pb = getPlaybook(event.type);
  // DESTINATION-4: destination decisions settle inline like any other optioned
  // decision — same additive composition as playbookDecisionBoard, gated only on
  // the host-set isDestination modifier. (Before this, a dest_* board row had
  // options the host could never actually pick from on the board.)
  const decisions = [
    ...((pb && Array.isArray(pb.decisions)) ? pb.decisions : []),
    ...destinationDecisionsFor(event, pb),
    ...militaryDecisionsFor(event),
  ];
  const d = decisions.find((x) => x && x.id === id);
  // HOST-AUDIT-1: ANY playbook decision with authored options settles inline on
  // the What-to-settle board (seating layout, hiring help — not just menu picks).
  // Inline settle IS the deepest link: zero navigation, resolves where it's read.
  if (!d || !Array.isArray(d.options) || d.options.length === 0) return null;
  // optionGates (audit 2026-07-27, F8/C): per-option pruning a prior answer makes
  // possible — keyed by option string like optionNotes. Forms: whenChoice
  // (show only while), standsDownWhen (hide once ANSWERED mooting), minGuests
  // (a guaranteed room block or a shuttle is absurd for a 6-person dinner).
  // The host's OWN chosen option is never hidden — an answer outranks a gate.
  const chosenPick = choicePickFor(event, d.id);
  const gates = (d.optionGates && typeof d.optionGates === 'object') ? d.optionGates : null;
  const gatedOptions = (Array.isArray(d.options) ? d.options : []).filter((o) => {
    if (o === chosenPick) return true;
    const g = gates && gates[o];
    if (!g) return true;
    if (g.whenChoice && !choiceShown(event, g.whenChoice)) return false;
    if (g.standsDownWhen && g.standsDownWhen.id) {
      const a = (event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices[g.standsDownWhen.id] : null;
      if (a != null && (Array.isArray(g.standsDownWhen.in) ? g.standsDownWhen.in : []).includes(a)) return false;
    }
    if (g.minGuests) {
      const n = Number(event.guestCount) || Number(event.guestEstimate) || 0;
      if (n && n < g.minGuests) return false;
    }
    return true;
  });
  if (gatedOptions.length === 0) return null;
  return {
    id: d.id,
    label: d.label,
    options: gatedOptions,
    why: d.why || '',
    chosen: choicePickFor(event, d.id),
    // AUTHORED per-option intelligence (optional, playbook-by-playbook): the
    // distinguishing tradeoff per option, the engine's default pick, and WHY that
    // default is the safe call. Surfaced so the hero can show grounded option notes
    // + a real "why this pick" — never invented at render time. Absent ⇒ names only.
    optionNotes: (d.optionNotes && typeof d.optionNotes === 'object') ? d.optionNotes : null,
    default: d.default || null,
    defaultWhy: d.defaultWhy || d.why || '',
  };
}

// ── Typical-setup budget categories (engine-derived) ──────────────────────────
// Roll the playbook's real purchases up into a handful of budget categories,
// each with a low/high $ range computed from actual quantity × unit-cost — NOT a
// percentage of an abstract total. This feeds the intake "Typical setup — what
// to expect" checklist so it reflects what the event ACTUALLY needs (a Dinner
// Party has no venue line; it has food, drinks, flowers, rentals, supplies,
// cleanup at grounded amounts). Types without a playbook return null so the
// caller falls back to the share-based estimate.
const PURCHASE_CATEGORY_TO_BUDGET = {
  food:      { key: 'pb_food',      label: 'Food & groceries' },
  beverage:  { key: 'pb_beverage',  label: 'Drinks & bar' },
  decor:     { key: 'pb_decor',     label: 'Flowers & decor' },
  rental:    { key: 'pb_rental',    label: 'Linens & rentals' },
  logistics: { key: 'pb_logistics', label: 'Paper goods & supplies' },
  cleanup:   { key: 'pb_cleanup',   label: 'Cleanup supplies' },
};
const PURCHASE_CATEGORY_ORDER = ['food', 'beverage', 'decor', 'rental', 'logistics', 'cleanup'];

export function playbookBudgetCategories(eventType, guestCount) {
  const playbook = getPlaybook(eventType);
  if (!playbook || !Array.isArray(playbook.purchases)) return null;
  const guests = Math.max(
    1,
    Number(guestCount) || (playbook.meta && playbook.meta.typicalGuests && playbook.meta.typicalGuests.default) || 8,
  );

  const groups = new Map();
  for (const p of playbook.purchases) {
    const map = PURCHASE_CATEGORY_TO_BUDGET[p.category];
    if (!map) continue;
    const qty = resolveQuantity(p, guests);
    const units = qty == null ? 1 : qty;
    const [uLow, uHigh] = Array.isArray(p.unitCostRange) ? p.unitCostRange : [0, 0];
    if (!groups.has(p.category)) {
      groups.set(p.category, { key: map.key, label: map.label, low: 0, high: 0, essential: false });
    }
    const g = groups.get(p.category);
    g.low += units * uLow;
    g.high += units * uHigh;
    if (p.essential) g.essential = true;
  }

  const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
  return PURCHASE_CATEGORY_ORDER.filter((k) => groups.has(k)).map((k) => {
    const g = groups.get(k);
    return { key: g.key, label: g.label, essential: g.essential, low: round5(g.low), high: round5(g.high) };
  });
}

// ── Food / Menu plan (host-facing food intelligence) ──────────────────────────
// Surfaces the playbook's FOOD CHOICES (the menu/drinks/potluck decisions) +
// the grounded shopping list (purchases scaled by guest count, with cost ranges
// + where to buy + the commonly-forgotten flags) + the food budget + the dietary
// gate. Pure reader over authored data — the "make an intelligent food choice"
// surface (FoodPlan) renders this. The host's picks live on event.foodChoices.
const FOOD_GROUP = { food: 'Food', beverage: 'Drinks' };
// Desserts get their own spread group (Figma 1583-3) instead of being lumped into FOOD —
// classified by item name so authors don't need a new category. Still food-cost (isFood).
const DESSERT_RE = /\b(cake|cupcakes?|cobbler|pies?|brownies?|pudding|trifle|ice cream|gelato|cheesecake|desserts?|tarts?|do(?:ugh)?nuts?|banana pudding|sweet potato pie)\b/i;
const foodGroupFor = (p) => (p && p.category === 'food' && DESSERT_RE.test(p.item || '')) ? 'Dessert' : FOOD_GROUP[p.category];
// opts.priceFactor (default 1) scales the synthesized national unit-cost ranges to
// the event's local area when a real, current regional factor is supplied by the
// backend (BLS Average Price). opts.priceContext carries { region, month, source }
// so the UI can label it honestly ("adjusted for {region}") — never claim "live"
// without a real factor. With no factor it is a 1.0 no-op (today's behavior).
// Dietary heads-up keyword map. Each NOTED restriction → a name pattern + a short
// label. Honest by framing: this is a "double-check this line" prompt (purchases have
// no allergen data), not a hard claim. Patterns are scoped to avoid the obvious false
// positives (butternut/coconut/nutmeg are NOT nut flags; "meat" alone isn't).
const DIET_KEYWORDS = {
  'Nut allergy':  { re: /\b(peanut|almond|pecan|walnut|cashew|pistachio|hazelnut|praline|nuts?)\b/i, not: /butternut|coconut|nutmeg|doughnut|donut/i, label: 'nuts' },
  'Nut-free':     { re: /\b(peanut|almond|pecan|walnut|cashew|pistachio|hazelnut|praline|nuts?)\b/i, not: /butternut|coconut|nutmeg|doughnut|donut/i, label: 'nuts' },
  'Gluten-free':  { re: /\b(bread|rolls?|buns?|cornbread|crackers?|pasta|noodle|flour|cake|pie|cookie|biscuit|wheat|pretzel|crust|breaded|stuffing|cobbler|pudding|tortilla|bun)\b/i, label: 'gluten' },
  'Dairy-free':   { re: /\b(cheese|butter|cream|milk|yogurt|ranch|custard|ice cream|mac (&|and) cheese)\b/i, label: 'dairy' },
  'Shellfish':    { re: /\b(shrimp|crabs?|lobster|clams?|oysters?|mussels?|scallops?|crawfish|shellfish|prawn)\b/i, label: 'shellfish' },
  // Big-9 allergens newly collected by the redesigned invite — so an item that
  // contains one actually flags it (before, Egg/Soy/Sesame/Fish matched nothing).
  'Fish':         { re: /\b(fish|salmon|tuna|tilapia|catfish|cod|trout|whiting|anchovy|sardine|mahi)\b/i, not: /shellfish/i, label: 'fish' },
  'Soy':          { re: /\b(soy|soya|tofu|edamame|miso|tempeh|tamari|soybean)\b/i, label: 'soy' },
  'Sesame':       { re: /\b(sesame|tahini|hummus)\b/i, label: 'sesame' },
  'Egg':          { re: /\b(eggs?|mayo|mayonnaise|aioli|custard|meringue|quiche|frittata|omelet)\b/i, label: 'egg' },
  'Vegetarian':   { re: /\b(beef|pork|chicken|ribs?|brisket|sausage|bacon|ham|turkey|fish|shrimp|crab|wings?|hot links?|oxtail|seafood|salmon|half-?smoke|meatball|lamb|charcuterie|salami|prosciutto|pepperoni|cured meat)\b/i, label: 'not veg' },
  'Vegan':        { re: /\b(beef|pork|chicken|ribs?|brisket|sausage|bacon|ham|turkey|fish|shrimp|crab|wings?|oxtail|seafood|salmon|cheese|butter|cream|milk|eggs?|honey|yogurt|lamb|charcuterie|salami|prosciutto|pepperoni)\b/i, label: 'not vegan' },
  'Pescatarian':  { re: /\b(beef|pork|chicken|ribs?|brisket|sausage|bacon|ham|turkey|wings?|oxtail|half-?smoke|hot links?|lamb|meatball|charcuterie|salami|prosciutto|pepperoni)\b/i, label: 'not pesc.' },
  'Halal':        { re: /\b(pork|bacon|ham|sausage|hot links?|half-?smoke|wine|beer|liquor|cocktail|spirits?)\b/i, label: 'check halal' },
  'Kosher':       { re: /\b(pork|bacon|ham|shellfish|shrimp|crabs?|lobster|clams?|oysters?)\b/i, label: 'check kosher' },
  'Alcohol-free': { re: /\b(wine|beer|cocktail|spirits?|liquor|champagne|sangria|rum|vodka|whiskey|bourbon|tequila|prosecco|mimosa|cider|seltzer)\b/i, label: 'alcohol' },
};
export function itemDietaryFlags(name, activeDiets) {
  if (!name || !Array.isArray(activeDiets) || !activeDiets.length) return [];
  const n = String(name);
  const out = [];
  for (const diet of activeDiets) {
    const m = DIET_KEYWORDS[diet];
    if (m && m.re.test(n) && !(m.not && m.not.test(n))) out.push(m.label);
  }
  return [...new Set(out)];
}

// normalizeAlternative(alt) — ONE parser for a food-line alternative, so the engine
// (swap re-pricing) and the UI (swap chips) read the same shape. Accepts either a plain
// string ("Pork shoulder — cheaper, slow-smoked") or an authored object
// ({ name, note?, unitCostRange?, qtyPerGuest? }). Strings carry no price → a swap to
// them keeps the original line's cost; objects with unitCostRange RE-PRICE the line.
// Returns { name, note, full, unitCostRange|null, qtyPerGuest|null }.
export function normalizeAlternative(alt) {
  if (alt && typeof alt === 'object') {
    const name = String(alt.name || '').trim();
    return {
      name,
      note: String(alt.note || '').trim(),
      full: alt.note ? `${name} — ${String(alt.note).trim()}` : name,
      unitCostRange: Array.isArray(alt.unitCostRange) ? alt.unitCostRange : null,
      qtyPerGuest: typeof alt.qtyPerGuest === 'number' ? alt.qtyPerGuest : null,
    };
  }
  const s = String(alt || '');
  const name = s.split(/\s[—–]\s|\s*\(/)[0].trim();
  const note = s.slice(name.length).replace(/^\s*[—–(]\s*/, '').replace(/\)\s*$/, '').trim();
  return { name, note, full: s, unitCostRange: null, qtyPerGuest: null };
}

export function playbookFoodPlan(event, opts = {}) {
  if (!event) return null;
  const pf = Number(opts.priceFactor) > 0 ? Number(opts.priceFactor) : 1;
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.purchases)) return null;
  // Size the spread from the ONE engine sizer (eventSizing → attendanceBand): the
  // plan-to ceiling for quantities. Every line — low end and high end — is priced at
  // this SAME ceiling headcount; only the per-unit PRICE varies between them, so the
  // $ range reflects price uncertainty alone, never attendance uncertainty compounded
  // on top of it (that used to multiply the two into a misleadingly wide band — a
  // real host-harm finding). The real attendance spread is still disclosed honestly,
  // just as its own fact (bandLow/bandHigh below), not folded into the dollar figure.
  const sizing = eventSizing(event, playbook);
  const guests = sizing.ceiling;
  const _guestsLow = sizing.floor;
  const gc = guestCountResolved(event);
  // hasRealCount — is the spread sized to a REAL number the host gave us, or to the
  // playbook's guessed typical (~8)? Any explicit count/estimate OR a roster is real;
  // with neither, `guests` came from the fallback and a $ figure would be fabricated.
  // Surfaces (the food panel / The spread) gate their dollar DISPLAY on this so they
  // never show "$X–$Y" for a count the host never entered.
  const hasRealCount = (Number(event.guestCount) || 0) > 0
    || (Number(event.guestEstimate) || 0) > 0
    || (Array.isArray(event.guests) && event.guests.length > 0);
  const picks = (event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices : {};

  // The food/drink CHOICES the host should make (menu style, host-vs-potluck, drinks…).
  // Same predicate the Decisions board uses to decide a decision is actionable here.
  const choices = (playbook.decisions || [])
    .filter(isMenuDecision)
    .map((d) => ({ id: d.id, label: d.label, options: d.options, default: d.default, why: d.why || '', chosen: picks[d.id] || d.default }));

  // Sprint 60F — make the spread REACT to the menu/sourcing choices. A purchase
  // tagged whenChoice:{id,in:[...]} appears only when the effective pick for that
  // decision is in the set; untagged purchases always appear (today's behavior).
  // pickFor falls back to the decision's default so the spread is right on first
  // render; an unknown pick shows the item (never hide on missing data).
  // ONE predicate for the spread, the budget, AND the host task list — reuse the
  // shared choicePickFor/choiceShown so a sourcing choice reshapes purchases + tasks
  // identically (no parallel logic that can drift).
  const pickFor = (id) => choicePickFor(event, id);
  const purchaseShown = (p) => choiceShown(event, p.whenChoice);

  // Make the drinks/bar decision's `blocks` LIVE for BYOB. When the host picks "BYOB" /
  // "guests bring their own", they aren't buying the drink spread — so the beverage lines
  // leave the spread + budget and the cost actually moves (the reported "changed drinks to
  // BYOB and nothing changed" gap). ICE stays: a host still supplies ice even when guests
  // bring drinks. One rule, every event type (any decision whose `blocks` names beverage).
  // The beverage/bar decision (any decision whose `blocks` names beverage).
  const _bevDecision = (playbook.decisions || []).find((d) =>
    Array.isArray(d.blocks) && d.blocks.some((b) => /beverage/.test(String(b))));
  const _bevPick = (_bevDecision ? (pickFor(_bevDecision.id) || '') : '').toLowerCase();
  const _byob = /\b(byob|bring your own|guests bring|everyone brings)\b/.test(_bevPick);
  const hostBuysIt = (p) => !(_byob && p.category === 'beverage' && !/\bice\b/i.test(p.item || ''));

  // Food-approach → budget. When the host chose a CATERER (vs cooking), they aren't buying the
  // homemade FOOD lines — the caterer brings them — so those drop here (mirrors the BYOB rule
  // above), and the food cost becomes a per-guest catering line injected below. Beverages +
  // supplies stay (the host still handles drinks/ice). Cooking/undecided ⇒ no change (byte-identical).
  const _fa = foodApproach(event);
  const _usesCaterer = _fa.usesCaterer === true;
  // The host's food buys stand down when someone ELSE carries the meal — a hired
  // caterer OR the community (repast committee, potluck sign-ups). W8 fix
  // (2026-07-22): a repast family was told to buy 28.5 lbs of chicken the
  // playbook's own note says the committee brings.
  const _foodOffPlate = _usesCaterer || _fa.communityBrings === true;
  const hostCooksIt = (p) => !(_foodOffPlate && p.category === 'food');
  const _catVendor = _usesCaterer ? (playbook.vendors || []).find((v) => v && /cater/i.test(String(v.category)) && /guest/i.test(String(v.costUnit || ''))) : null;
  const _cateringRate = _catVendor && Array.isArray(_catVendor.costRange) ? _catVendor.costRange : (_usesCaterer ? [15, 35] : null);

  // EVERY beverage choice moves the budget, not just BYOB. The drinks/bar pick scales the
  // beverage line cost by a tier factor read from its words: a dry/family spread is cheaper
  // (no alcohol), a full/premium bar costs more, the default is the 1.0 baseline. Ice is
  // exempt (volume-driven, not bar-tier). One engine rule, every event type; an honest
  // estimate adjustment (the spread already shows a range), recomputed live from the choice.
  const beverageFactor = (() => {
    if (!_bevPick) return 1;
    if (/\b(full bar|full cooler|premium|top-shelf|brown liquor|spirits?|whiskey|bourbon|signature cocktail|hired bartender)\b/.test(_bevPick)) return 1.6;
    if (/\b(add a|punch|grown section|cocktail|wine \+|signature)\b/.test(_bevPick)) return 1.25;
    if (/\b(dry|family-friendly|zero-proof|no alcohol|non-alcoholic|kids|light \/|pace-it)\b/.test(_bevPick)) return 0.6;
    return 1;
  })();
  const bevFactorFor = (p) => (p.category === 'beverage' && !/\bice\b/i.test(p.item || '')) ? beverageFactor : 1;

  // GENERAL choice→cost mechanism (single source of truth): any playbook decision can declare, in the
  // DATA, how a chosen option re-prices specific purchase lines — `costFactors: { '<option>': <mult> }`
  // + `affects: ['<purchaseId>', …]`. The engine reads that here and returns a per-line factor; nothing
  // is hardcoded per-playbook. Omitted/default options ⇒ factor 1.0, so baselines + tests don't move.
  // This replaces the beverage/sourcing one-offs conceptually and works for every playbook that opts in.
  const _choices = (event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices : {};
  const _decisions = Array.isArray(playbook && playbook.decisions) ? playbook.decisions : [];
  const choiceFactorFor = (p) => {
    let f = 1;
    for (const d of _decisions) {
      if (!d || !d.costFactors || !Array.isArray(d.affects) || !d.affects.includes(p.id)) continue;
      const picked = _choices[d.id] != null ? _choices[d.id] : d.default;
      const mult = Number(d.costFactors[picked]);
      if (Number.isFinite(mult) && mult > 0) f *= mult;
    }
    return f;
  };

  // Protein SOURCING tier (1597-2) — reshapes the PROTEIN lines' cost (butcher baseline,
  // Costco cheaper, pre-marinated grocery a convenience premium). One factor, same single
  // source the UI's Sourcing card reads. Untagged/non-protein lines are untouched.
  const sourcing = (event.sourcing && sourcingTier(event.sourcing).id) || DEFAULT_SOURCING;
  const srcFactor = sourcingFactor(sourcing);
  // A protein with AUTHORED per-tier prices (sourcingPrices) uses the real researched
  // range for the chosen tier — no factor. Everything else falls back to the typical
  // factor (butcher baseline, Costco cheaper, grocery premium).
  // A protein's tier range: its OWN authored sourcingPrices win; otherwise the shared
  // canonical table fills NON-default tiers (costco/grocery) with researched $/lb. The
  // DEFAULT tier (butcher) is left null on purpose → keeps the playbook's authored base,
  // so default costs/tests don't move; only switching channels pulls real per-tier prices.
  const srcTierRange = (p) => {
    if (!(p.category === 'food' && isProteinItem(p.item))) return null;
    if (p.sourcingPrices && Array.isArray(p.sourcingPrices[sourcing])) return p.sourcingPrices[sourcing];
    if (sourcing === DEFAULT_SOURCING) return null;
    return canonicalProteinPrice(p.item, sourcing);
  };
  // Per-item store pick (event.foodWhere[id] = a chosen store name, written when
  // the host taps a specific store on ONE line — HostShellV2.jsx's per-item
  // "where to buy" chips) is a MORE SPECIFIC signal than the plan-wide sourcing
  // tier: "I'm buying THIS one at Costco" wins over "the whole spread defaults
  // to butcher". Reads the SAME real, cited per-tier prices the tier picker
  // uses (sourcingPrices / canonicalProteinPrice) — never a new number. Was
  // display-only before (found in the 2026-07-11 food-plan audit); non-protein
  // items and unmapped store names stay untouched (no sourced per-store data
  // for produce/hardware — inventing one would be exactly the "invented
  // pricing policy" the foodWhere feature was built to avoid).
  const whereMap = (event.foodWhere && typeof event.foodWhere === 'object') ? event.foodWhere : {};
  const WHERE_TIER_RE = { costco: /costco|warehouse|bulk/i, butcher: /butcher/i, grocery: /grocery/i };
  const perItemStoreRange = (p) => {
    if (!(p.category === 'food' && isProteinItem(p.item))) return null;
    const picked = whereMap[p.id];
    if (!picked) return null;
    const tier = Object.keys(WHERE_TIER_RE).find((t) => WHERE_TIER_RE[t].test(picked));
    if (!tier) return null;
    if (p.sourcingPrices && Array.isArray(p.sourcingPrices[tier])) return p.sourcingPrices[tier];
    return canonicalProteinPrice(p.item, tier);
  };
  // Channel factor: proteins use the deep meat factor (unless they have a tier range);
  // non-protein food + drinks use the modest Costco bulk factor (produce/dairy/staples).
  const srcFactorFor = (p) => {
    if (p.category !== 'food' && p.category !== 'beverage') return 1;
    if (isProteinItem(p.item)) return (perItemStoreRange(p) || srcTierRange(p)) ? 1 : srcFactor;
    return nonProteinFactor(sourcing);
  };
  // Where-to-shop bias — the chosen tier's store leads the protein rows' store chips.
  const SRC_STORE_RE = { costco: /costco|warehouse|bulk/i, butcher: /butcher/i, grocery: /grocery/i };
  const srcStoreFirst = (p) => {
    const w = Array.isArray(p.where) ? [...p.where] : [];
    const re = (p.category === 'food' && isProteinItem(p.item)) ? SRC_STORE_RE[sourcing] : null;
    return re ? w.sort((a, b) => (re.test(b) ? 1 : 0) - (re.test(a) ? 1 : 0)) : w;
  };

  // 64-#5 — region-gated items (whenRegion:['DMV']) commit a LOCAL dish (half-smokes,
  // mumbo sauce) only for events in that region — so localness is on the plate, not a
  // prompt. Region resolves from the metro/state; untagged items always show.
  const eventRegion = (() => {
    const st = String(event.state || '').trim().toUpperCase();
    const mkt = String(event.market || '').trim().toLowerCase();
    if (['DC', 'MD', 'VA'].includes(st) || ['dc', 'dmv'].includes(mkt)) return 'DMV';
    return null;
  })();
  const regionShown = (p) => !p.whenRegion || (eventRegion != null && p.whenRegion.includes(eventRegion));

  // 60I — items the host swapped out / won't buy. Kept in the list (struck-through,
  // reversible) but MARKED skipped so they leave every total — the plan honestly
  // reflects what they're actually getting, without losing the line.
  const skip = (event.foodSkip && typeof event.foodSkip === 'object') ? event.foodSkip : {};

  // 64 — costs the host has LOCKED: event.foodLocked[id] = a committed dollar amount
  // (they picked a source/price). A locked item is a fixed cost, not a range.
  const lockedMap = (event.foodLocked && typeof event.foodLocked === 'object') ? event.foodLocked : {};
  // Host quantity overrides: event.foodQty[id] = a number that replaces the
  // guest-scaled quantity (and recomputes that item's cost from it).
  const qtyMap = (event.foodQty && typeof event.foodQty === 'object') ? event.foodQty : {};
  // In-place SWAP: event.foodSwap[id] = the chosen alternative's NAME. The line keeps its
  // per-guest qty + BLS-adjusted unit cost (so the budget stays real and re-scales with the
  // count + region) and just wears the new name — instead of dropping the line and adding a
  // flat-cost dish. `swappedFrom` carries the original name so the host can revert.
  const swapMap = (event.foodSwap && typeof event.foodSwap === 'object') ? event.foodSwap : {};

  // #16 dietCounts hoisted here (also read below, where the veg main is added) — needed
  // now so PORTION SKEW can net vegetarians/vegans OUT of the protein guest count. Without
  // this, a vegetarian was bought their share of the meat protein (full guest count) AND a
  // separate veg main — a real double-buy, safe-direction but real waste.
  const dietCounts = (event.dietCounts && typeof event.dietCounts === 'object') ? event.dietCounts : {};
  // RE-AUDIT (fresh-eyes, 2026-07-14): this file carried a full PRIVATE copy of the
  // veg/vegan detection — its own dietCounts precedence, its own roster regex — while
  // lib/appetite.js was created as "the one reader" and its header claimed both engines
  // used it. The copies were value-identical, so no numeric bug yet, but identical-today
  // is exactly how the crab tables drifted apart. One reader, for real now.
  const vegN = vegCount(event);

  // PORTION SKEW — appetite-driven food (the PROTEINS) is over-bought when the crowd skews to
  // kids / light eaters / vegetarians. event.kidsCount (default 0 → today's flat math, byte-
  // identical) shifts ONLY the protein lines: a kid/light eater eats ~40% of an adult's protein
  // (a grounded catering heuristic; crab/cookout playbooks already say "fewer for kids" but
  // never sized it). A vegetarian/vegan eats NONE of it — they get the diet-derived veg main
  // instead (below), so they're subtracted in full, not at the kid factor. Sides/drinks are far
  // less appetite-elastic, so they keep the full count. Single source → the food total + budget
  // follow automatically. Never below 1 effective adult-equivalent.
  // A roster's own per-guest `kids` ("Children in Party") is the ground truth once a roster
  // exists — `sizing.band` (attendanceBand) already sums it for non-declined rows, and
  // `guests` above already folds those kids into the ceiling. event.kidsCount is a SEPARATE
  // manual field that only applies in headcount/count mode (no roster to derive it from).
  // Reading whichever one actually applies avoids both legacy's roster-mode gap (kidsCount
  // was never set there) and double-counting against a roster that already has real data.
  const _rosterMode = Array.isArray(event.guests) && event.guests.length > 0 && event.guestMode !== 'count';
  // Shared reader; the attendance band's already-summed kid count is passed through so
  // roster mode doesn't re-sum the roster (appetite.kidCount's bandKids parameter exists
  // for exactly this call site).
  const _kids = kidCount(event, _rosterMode ? (sizing.band && sizing.band.kids) : undefined);
  const proteinGuests = (_kids > 0 || vegN > 0) ? Math.max(1, guests - _kids * (1 - KID_PROTEIN_FACTOR) - vegN) : guests;
  // The appetite-driven mains a kid/light eater eats less of. Plural-tolerant on purpose
  // (matches "crabs", "ribs", "wings") — broader than the sourcing isProteinItem, whose
  // strict word boundaries miss plurals (that's why crabs weren't scaling). Used ONLY for
  // the kid portion-scale, so it can't shift sourcing/pricing behavior.
  const isAppetiteFood = (name) => /(rib|chicken|brisket|sausage|hot ?link|half-?smoke|pork|beef|turkey|seafood|shrimp|prawn|fish|crab|crawfish|lobster|lamb|oxtail|wing|meatball|steak|burger|salmon|bacon|ham|goat|jerk|drumstick|thigh|fillet|filet|whiting|catfish|porg)/i.test(String(name || ''));

  // CRAB-BUDGET-1: when a real, host-priced crab order exists (event.crabPlan
  // with at least one priced line), the dedicated crab-order card owns crab
  // dollars — the spread's own "Blue crabs" line below delegates to those
  // real numbers instead of an independent per-guest market guess, and its
  // dollar contribution is excluded from the food total (see isFood/eff
  // below) so hostSpending's separate crabEstimate/crabBought — which reads
  // the SAME buildCrabPlan total — never double-counts the same real spend.
  // No priced order yet ⇒ falls through to today's market-estimate math
  // unchanged, so a Crab Feast host who hasn't started ordering still sees a
  // real number to plan against.
  const _crabOrder = buildCrabPlan(event);
  const _crabDelegated = !!(_crabOrder && _crabOrder.relevant
    && Array.isArray(_crabOrder.lines) && _crabOrder.lines.length > 0
    && _crabOrder.totalEstimatedCost != null);

  // ── PICKERS SIZE THE SHELLFISH. Not heads. ──────────────────────────────────
  //
  // The app already asks the host how many people actually PICK crabs, stores it
  // (event.crabPlan.crabEatingHeadcount), toasts "Sizing crabs to 10 pickers —
  // kids and light eaters don't drive the count", and its own risk card says
  // "count by ADULT PICKERS, not heads." Then the food plan sized the crab line
  // to the full guest count anyway — and the food plan is what BILLS.
  //
  // Measured on a 24-guest feast where the host said 10 pick: the spread ordered
  // 21 dozen (~252 crabs, $672–$3,948) while the crab card recommended ~90. The
  // biggest line item on the flagship event type, and the app was contradicting
  // itself on one screen.
  //
  // Only fires when the host EXPLICITLY set a picker count — otherwise nothing
  // changes. The clamp ("pickers can't outnumber your guests") is NOT re-derived
  // here: we read the already-clamped number off buildCrabPlan, which owns it.
  // crabPlan OWNS the picker count — it resolves the host's explicit number, else
  // what the GUESTS said on the invite ("Are you picking crabs?"), else the head
  // count — and it owns the "pickers can't outnumber guests" clamp. We read its
  // answer rather than the raw stored field, so a guest's reply reaches the bill.
  // `basis` tells us WHERE the number came from: 'guest-count' means nobody has
  // actually said anything, and sizing to it is just the old head-count behaviour,
  // so we leave it alone.
  const _pickerBasis = (_crabOrder && _crabOrder.guestPickers && _crabOrder.guestPickers.basis) || null;
  const _pickers = (_crabOrder && _crabOrder.relevant
    && (_pickerBasis === 'host' || _pickerBasis === 'guests')
    && Number(_crabOrder.crabEatingHeadcount) > 0)
    ? Number(_crabOrder.crabEatingHeadcount) : null;
  const isShellfish = (name) => /(crab|crawfish|crayfish|shrimp|prawn|lobster|oyster|clam|mussel|shellfish)/i.test(String(name || ''));

  // The grounded shopping list, scaled by guest count, grouped + costed.
  const list = playbook.purchases
    .filter((p) => (p.category === 'food' || p.category === 'beverage') && purchaseShown(p) && regionShown(p) && hostBuysIt(p) && hostCooksIt(p))
    .map((p0) => {
      // PHASE 5C.10 — governance enters here, once, for every host-visible line.
      // Everything below (sizing, pricing, copy) reads the GOVERNED purchase, so a
      // published KCR moves the host's numbers without any surface knowing.
      // Identity when nothing is published.
      const p = governedPurchase(playbook, p0);
      // In-place swap chosen for this line (event.foodSwap[id] = the alternative's name).
      const swappedName = (p.id in swapMap && String(swapMap[p.id] || '').trim()) ? String(swapMap[p.id]).trim() : null;
      // If the chosen alternative carries its OWN price/qty data, the line RE-PRICES to it
      // (BLS-adjusted via pf below). A plain string alternative keeps the original cost.
      const swapAlt = (swappedName && Array.isArray(p.alternatives))
        ? p.alternatives.map(normalizeAlternative).find((a) => a.name === swappedName) : null;
      const effPerGuest = (swapAlt && swapAlt.qtyPerGuest != null) ? swapAlt.qtyPerGuest : p.qtyPerGuest;
      const pForQty = (effPerGuest !== p.qtyPerGuest) ? { ...p, qtyPerGuest: effPerGuest } : p;
      // Proteins size off the appetite-adjusted count (kids at 0.4, vegetarians/vegans at 0
      // — they eat the diet-derived veg main instead); everything else off the full guest
      // count. _kids === 0 && vegN === 0 ⇒ proteinGuests === guests ⇒ no change.
      // Shellfish sizes to the host's declared PICKERS (see above) — a stronger,
      // host-stated signal than the kids/veg appetite adjustment, and the one the
      // rest of the app already claims to be using. Everything else is unchanged.
      const _itemName = swappedName || p.item;
      const _qtyGuests = (_pickers != null && isShellfish(_itemName))
        ? _pickers
        : (((_kids > 0 || vegN > 0) && isAppetiteFood(_itemName)) ? proteinGuests : guests);
      // ── The blue-crab line reads through the crab engine, it does not re-derive ──
      // These two disagreed in production, on one screen: the food row said
      // "12.6 dozens · ¾ dozen/guest × 18 guests" (~151 crabs) while the crab plan
      // said "1 bushel + 1 half-bushel — about 108 crabs · 18 pickers at ~6 each".
      //
      // Both were reading this same playbook — just different fields of it. p_crabs
      // carries a flat `qtyPerGuest: 0.75` (9 crabs a head) AND a `servingGuide`
      // whose entry for the chosen size says 6 with sides. The food row multiplied
      // the flat number; crabPlan read the guide. The guide is the honest one: it is
      // size-aware (bigger crabs, fewer per person) and it discounts kids to ~60% of
      // an adult's share. The flat 0.75 knows neither, and drove a ~40-crab overbuy.
      //
      // So the crab engine OWNS the crab count and this row renders its answer.
      // Deliberately not gated on whether guests answered the picker question — when
      // nobody has, crabPlan still resolves heads to the guest count, so it is the
      // right source either way. Only blue crabs: shrimp and snow-crab lines are not
      // what the plan is about, and a line swapped away from crabs keeps its own math.
      const _crabHeads = Number(_crabOrder && _crabOrder.effectivePickerCount) || 0;
      const _crabPlanQty = (
        _crabOrder && _crabOrder.relevant && !swappedName &&
        (p.id === 'p_crabs' || /blue crab/i.test(String(p.item || ''))) &&
        p.unit === 'dozen' &&
        Number(_crabOrder.targetCrabsPerPerson) > 0 &&
        _crabHeads > 0
      )
        ? Math.round((Number(_crabOrder.targetCrabsPerPerson) * _crabHeads / 12) * 10) / 10
        : null;
      const baseQty = _crabPlanQty != null ? _crabPlanQty : resolveQuantity(pForQty, _qtyGuests);
      // 64-#3 — host quantity override (event.foodQty[id]); flows straight into the
      // cost so changing "15 lbs" to "20 lbs" moves the food total + the budget.
      const qOver = (p.id in qtyMap) ? Math.max(0, Number(qtyMap[p.id]) || 0) : null;
      let qty = qOver != null ? qOver : baseQty;
      const _tierRange = swapAlt ? null : (perItemStoreRange(p) || srcTierRange(p));
      let [uLow, uHigh] = (swapAlt && Array.isArray(swapAlt.unitCostRange))
        ? swapAlt.unitCostRange
        : (_tierRange || (Array.isArray(p.unitCostRange) ? p.unitCostRange : [0, 0]));
      // Beverage tier factor — applied at the unit-cost level so the line total, the per-unit
      // breakdown, and the budget all derive consistently from the drinks choice. Single source.
      const _bev = bevFactorFor(p);
      if (_bev !== 1) { uLow *= _bev; uHigh *= _bev; }
      // Sourcing tier factor — protein lines re-price with how the host is getting them.
      const _src = srcFactorFor(p);
      if (_src !== 1) { uLow *= _src; uHigh *= _src; }
      // General data-driven choice→cost factor — any playbook decision with costFactors/affects re-prices
      // its line here (single source of truth; no per-playbook hardcoding). Default option ⇒ 1.0.
      const _choiceF = choiceFactorFor(p);
      if (_choiceF !== 1) { uLow *= _choiceF; uHigh *= _choiceF; }
      // Global buyable-unit guardrail — if an author left this in a non-buyable
      // serving unit (e.g. "40 slices" of cake), convert to whole purchasable units
      // (cakes/pizzas/loaves/pies) and scale the per-unit cost so the TOTAL is
      // unchanged. No-op (null) for everything already modeled in buyable units.
      const buyable = normalizeBuyable(p.item, qty, p.unit, uLow, uHigh);
      const unit = buyable ? shortUnit(buyable.unit, buyable.qty) : shortUnit(p.unit, qty);
      if (buyable) { qty = buyable.qty; uLow = buyable.uLow; uHigh = buyable.uHigh; }
      const units = qty == null ? 1 : qty;
      // CRAB-BUDGET-1: a real priced order delegates this line's qty/$ to
      // buildCrabPlan's own totals — never both a market guess AND the real
      // order counted toward the food total. A host-set lock on this specific
      // line is a deliberate manual override and wins over delegation (rare;
      // the two mechanisms aren't meant to be used together, but a lock is an
      // explicit choice and must not be silently discarded).
      if (p.id === 'p_crabs' && _crabDelegated && !(p.id in lockedMap)) {
        return {
          id: p.id, group: foodGroupFor(p), item: swappedName || p.item, short: swappedName || shortItem(p.item),
          swappedFrom: swappedName ? shortItem(p.item) : null,
          badge: p.badge || null,
          qty: _crabOrder.totalEstimatedCrabs, unit: 'crabs', essential: !!p.essential, where: srcStoreFirst(p),
          cat: p.category || 'other', buyAt: p.buyAt || null,
          perGuest: null, basis: '',
          qtyOverridden: false, baseQty,
          low: _crabOrder.totalEstimatedCost, high: _crabOrder.totalEstimatedCost,
          units: _crabOrder.totalEstimatedCrabs, unitBase: 'crabs',
          perUnitLow: null, perUnitHigh: null,
          skipped: !!skip[p.id], locked: null,
          note: `Priced by your crab order${_crabOrder.mixedSummary ? ' — ' + _crabOrder.mixedSummary : ''}.`,
          forgotten: false,
          crabDelegated: true, excludeFromFoodTotal: true,
          // Governance, carried to the surface (5C.10).
          provenance: purchaseProvenance(playbook, p0) || null,
          qtyGrounded: isGroundedItemQty(purchaseProvenance(playbook, p0)),
          governedFields: p._governed || [],
        };
      }
      return {
        id: p.id, group: foodGroupFor(p), item: swappedName || p.item, short: swappedName || shortItem(p.item),
        // In-place swap: the line wears the alternative's name but keeps its BLS-derived cost;
        // swappedFrom lets the UI offer a one-tap revert.
        swappedFrom: swappedName ? shortItem(p.item) : null,
        // Authored editorial badge (Figma 1583-3): TRADITION / DAY-OF / YOURS etc. Optional;
        // null when the purchase carries none. DAY-OF is also derived from buyAt at render.
        badge: p.badge || null,
        qty, unit, essential: !!p.essential, where: srcStoreFirst(p),
        // Shopping list v2 — raw category drives aisle order; buyAt drives the day-of section.
        cat: p.category || 'other', buyAt: p.buyAt || null,
        // Board ruling: lead each line with the PER-GUEST rate (the typical amount).
        // Only per-guest-scaled items carry a rate; flat items (1 grill) don't. A
        // converted whole-good has no per-guest serving rate — null it.
        perGuest: (!buyable && typeof effPerGuest === 'number') ? effPerGuest : null,
        // The "because" the quantity was scaled from, read from the authored
        // factor (qtyPerGuest / qtyPer) — never invented. Travels with the line
        // into the shopping-list deliverable so the hand-off shows its reasoning
        // ("12 lbs · ½ lb/guest"). '' when there's no per-person basis or the
        // line was unit-converted (same honesty rule as perGuest above).
        basis: (buyable || _crabPlanQty != null) ? '' : quantityBasis(p),
        // A pre-composed basis sentence, used when the rate×guests template cannot tell
        // the truth. The row renders `basis + ' × N guests'`, and the crab count is not
        // per GUEST — it is per PICKER, at a per-size rate the crab engine owns. Rather
        // than bend the template, the crab line states its own reasoning, in the same
        // words the crab plan uses, so the two screens now read as one number with one
        // explanation. Every other line keeps `basis` untouched.
        // RE-AUDIT: the note used to print targetCrabsPerPerson × crabEatingHeadcount while
        // the QUANTITY was computed from effectivePickerCount (kids/vegetarians discounted) —
        // "4 crabs a picker × 18 pickers" (=72) beside a quantity built from ~15 effective
        // pickers. Shows-its-work means the stated math REPRODUCES the number next to it.
        basisNote: _crabPlanQty != null
          ? (() => {
              const eff = Math.round(Number(_crabHeads) * 10) / 10;
              const raw = Number(_crabOrder.crabEatingHeadcount);
              const who = eff !== raw
                ? `${eff} effective ${eff === 1 ? 'picker' : 'pickers'} (kids and non-shellfish eaters counted lighter, of ${raw})`
                : `${raw} ${raw === 1 ? 'picker' : 'pickers'}`;
              return `${_crabOrder.targetCrabsPerPerson} crabs a picker × ${who} — sized by your crab plan`;
            })()
          : null,
        qtyOverridden: qOver != null, baseQty,
        // DENOMINATORS-2 (7× food-cost band): both ends price the SAME ceiling-sized
        // quantity (`units`) — only uLow vs uHigh differ. Previously `low` also
        // compounded the attendance-band floor ratio on top of the price-low end,
        // multiplying two independent uncertainties (attendance × price) into one
        // misleadingly wide range. The real attendance spread is disclosed on its
        // own (bandLow/bandHigh below), not folded into the dollar figure.
        low: Math.round(units * uLow * pf), high: Math.round(units * uHigh * pf),
        // 60I — the per-unit math behind the line total ("15 lbs × $4–$8/lb"), so a
        // host understands the price, and sees the regional (pf) adjustment in it.
        // When the guardrail converted the line, the per-unit basis is the buyable
        // unit (cake/pizza/…) at its scaled cost — so the "× $/unit" math stays honest.
        units, unitBase: buyable ? buyable.unit : (p.unit || ''),
        perUnitLow: Math.round(uLow * pf * 100) / 100,
        perUnitHigh: Math.round(uHigh * pf * 100) / 100,
        skipped: !!skip[p.id],
        locked: (p.id in lockedMap) ? Math.max(0, Math.round(Number(lockedMap[p.id]) || 0)) : null,
        note: p.note || '', forgotten: /commonly forgotten/i.test(p.note || ''),
        // alternatives: playbook-authored swap suggestions (cheaper/unavailable/dietary).
        // Only present when the purchase carries them; undefined otherwise (no empty array noise).
        // Authored alternatives win; else fall back to the shared canonical substitutes
        // so a swap option appears engine-wide (budget/availability), never an empty array.
        ...((Array.isArray(p.alternatives) && p.alternatives.length > 0)
          ? { alternatives: p.alternatives }
          : (canonicalSubstitutes(p.item).length ? { alternatives: canonicalSubstitutes(p.item) } : {})),
        // Bulk-purchase recommendation: when the playbook authors priceLadder + servingGuide
        // on a purchase (e.g. crabs sold by the bushel), the engine computes the right
        // purchase unit (dozen / half bushel / bushel) from the chosen size decision and
        // adult guest count. The shopping list prefers this over the raw dozen-based qty.
        // null for any purchase without this data — no-op for the rest of the plan.
        // PICKERS: `_qtyGuests` already resolves to the host's declared picker count for
        // shellfish (and to proteinGuests / guests otherwise), so the BUSHEL recommendation
        // sizes off the same basis as the line's quantity. It previously used proteinGuests
        // — so the crab card said "10 pickers" while the bushel maths still said 28 heads.
        ...((resolveBulkPurchase(p, _decisions, _choices, _qtyGuests) != null)
          ? { bulkRecommendation: resolveBulkPurchase(p, _decisions, _choices, _qtyGuests) }
          : {}),
        // Governance, carried to the surface (5C.10). `provenance` is what a host
        // can read; `qtyGrounded` is whether the quantity is sourced; `governedFields`
        // names which numbers came from a published KCR rather than the authored file.
        provenance: purchaseProvenance(playbook, p0) || null,
        qtyGrounded: isGroundedItemQty(purchaseProvenance(playbook, p0)),
        governedFields: p._governed || [],
      };
    });

  // #4 — host-authored dishes (event.foodAdd): "Auntie's potato salad" + who's
  // bringing it. A named line the host commits, closing the remove/add asymmetry
  // (you could swap items out but never add your own). Cost is OPTIONAL: a potluck
  // dish someone else brings is $0 to the host; an entered cost flows into the food
  // total + budget like any other line. Reuses skip (struck-through) + got (checkoff).
  const added = (Array.isArray(event.foodAdd) ? event.foodAdd : [])
    .filter((a) => a && a.name)
    .map((a) => {
      const cost = Math.max(0, Math.round(Number(a.cost) || 0));
      return {
        id: a.id, group: a.group || 'Food', cat: a.cat, item: a.name, short: a.name,
        owner: String(a.owner || '').trim(), qty: null, unit: '', essential: false,
        where: [], qtyOverridden: false, baseQty: null,
        low: cost, high: cost, units: 1, unitBase: '',
        perUnitLow: cost, perUnitHigh: cost,
        skipped: !!skip[a.id], locked: null,
        note: '', forgotten: false, added: true,
      };
    });
  list.push(...added);

  // #16 — special-diet COUNTS drive food + budget. Vegetarians/vegans need a REAL,
  // named main (never a generic "plant-based main" placeholder); size it to their
  // count and let it flow into the totals so the budget reflects it. The dish is
  // playbook-authored (playbook.vegMain) so it's appropriate to the cuisine — e.g.
  // a cookout gets grilled portobello + veggie skewers, a dinner party a mushroom
  // wellington. Falls back to a real, appetizing default, never a placeholder.
  // (dietCounts/dietCnt/vegN are hoisted above, near proteinGuests — same values, no
  // re-declaration here; the protein base already nets these guests out.)
  if (vegN > 0) {
    const vegDish = (typeof playbook.vegMain === 'string' && playbook.vegMain.trim())
      ? playbook.vegMain.trim()
      : 'Stuffed peppers + grilled veg platter';
    list.push({
      id: 'diet-veg', group: 'Food', item: `${vegDish} (for ${vegN} ${vegN === 1 ? 'guest' : 'guests'})`,
      short: `${vegDish} · ${vegN}`, owner: '', qty: vegN, unit: 'servings', essential: true, where: ['Grocery'],
      qtyOverridden: false, baseQty: vegN, perGuest: null,
      low: Math.round(vegN * 6 * pf), high: Math.round(vegN * 12 * pf), units: vegN, unitBase: 'servings',
      perUnitLow: Math.round(6 * pf), perUnitHigh: Math.round(12 * pf),
      skipped: !!skip['diet-veg'], locked: ('diet-veg' in lockedMap) ? Math.max(0, Math.round(Number(lockedMap['diet-veg']) || 0)) : null,
      note: 'So your vegetarian/vegan guests have a real main, not just sides.', forgotten: false, dietDerived: true,
    });
  }
  const specialDiets = Object.entries(dietCounts).filter(([, v]) => Number(v) > 0).map(([diet, count]) => ({ diet, count: Number(count) }));

  // Dietary heads-up per item — when a restriction is NOTED for the event, mark the
  // food whose NAME relates to it so the host knows which lines to double-check. This
  // is honest by framing: purchases carry no allergen data, so it's a "watch this"
  // prompt (keyword-matched), never a hard "contains X" claim. Mutates the list items.
  // Source the active diets from BOTH places a host records them — the dietCounts
  // tallies AND the roster's per-guest `needs` free-text — so each spread item shows
  // its dietary/allergy association no matter where the diet info lives.
  const rosterDiets = new Set();
  for (const g of (Array.isArray(event.guests) ? event.guests : [])) {
    // Read the redesigned invite's STRUCTURED arrays (allergens/diets) AND the
    // guest's meal AND the legacy free-text `needs` — so a diet flags items no
    // matter where it was recorded (structured chip, meal pick, or typed note).
    const structured = [
      ...(Array.isArray(g && g.allergens) ? g.allergens : []),
      ...(Array.isArray(g && g.diets) ? g.diets : []),
    ];
    const need = [String((g && g.needs) || ''), String((g && g.meal) || ''), ...structured].join(' ').toLowerCase();
    if (!need.trim()) continue;
    if (/\bvegan\b/.test(need)) rosterDiets.add('Vegan');
    if (/vegetarian|veggie/.test(need) && !/\bvegan\b/.test(need)) rosterDiets.add('Vegetarian');
    if (/pescatarian/.test(need)) rosterDiets.add('Pescatarian');
    if (/gluten|\bwheat\b/.test(need)) rosterDiets.add('Gluten-free');
    if (/\bnuts?\b|peanut|tree ?nut|almond|cashew|walnut|pecan/.test(need)) rosterDiets.add('Nut allergy');
    if (/dairy|lactose|\bmilk\b/.test(need)) rosterDiets.add('Dairy-free');
    if (/shellfish|shrimp|crab|lobster|clam|oyster|mussel|scallop|prawn/.test(need)) rosterDiets.add('Shellfish');
    if (/\bfish\b/.test(need) && !/shellfish/.test(need)) rosterDiets.add('Fish');
    if (/\bsoya?\b|tofu|edamame/.test(need)) rosterDiets.add('Soy');
    if (/sesame|tahini/.test(need)) rosterDiets.add('Sesame');
    if (/\beggs?\b/.test(need)) rosterDiets.add('Egg');
    if (/halal/.test(need)) rosterDiets.add('Halal');
    if (/kosher/.test(need)) rosterDiets.add('Kosher');
    if (/no alcohol|alcohol-free|sober|non-?alcoholic/.test(need)) rosterDiets.add('Alcohol-free');
  }
  const activeDiets = [...new Set([...specialDiets.map((d) => d.diet), ...rosterDiets])];
  if (activeDiets.length) {
    for (const it of list) {
      const flags = itemDietaryFlags(it.item || it.short, activeDiets);
      if (flags.length) it.dietFlags = flags;
    }
  }

  // Food-approach: caterer chosen → inject the per-guest catering line (the homemade food rows
  // were dropped by hostCooksIt above). Same row shape as a host-added dish, so it flows into the
  // food total, the Food group, and effectiveItems like any other line. pf = regional factor.
  if (_usesCaterer && _cateringRate) {
    const [cgLow, cgHigh] = _cateringRate;
    list.unshift({
      id: 'fa-catering', group: 'Food', short: 'Catering (the food)',
      item: 'Catering — the caterer provides the food', owner: '', qty: guests, unit: 'guest',
      essential: true, where: ['Caterer'], qtyOverridden: false, baseQty: guests,
      low: Math.round(guests * cgLow * pf), high: Math.round(guests * cgHigh * pf),
      units: guests, unitBase: '',
      // Was missing skipped/locked entirely (found in the 2026-07-11 food-plan
      // audit) — the caterer line couldn't be skipped OR have a real price
      // locked in, unlike every other row in this list.
      skipped: !!skip['fa-catering'],
      locked: ('fa-catering' in lockedMap) ? Math.max(0, Math.round(Number(lockedMap['fa-catering']) || 0)) : null,
    });
  }

  // Essential NON-food supplies (kraft-paper table cover, propane, safety kit…) —
  // folded into the list as their own "Supplies" group so they get the EXACT same
  // row functions as food (lock-before-checkoff, qty edit, skip/swap, per-unit,
  // where-links, alternatives). Kept OUT of the food $ total below; surfaced as
  // their own budget line. Same map shape as the food rows above.
  for (const p0 of playbook.purchases) {
    if (p0.category === 'food' || p0.category === 'beverage') continue;
    if (!p0.essential || !p0.buyAt || !purchaseShown(p0) || !regionShown(p0)) continue;
    // GOVERNANCE REACHES SUPPLIES TOO (Phase 5E.4). This loop iterated the AUTHORED
    // purchase while the food loop above resolved through governedPurchase(), so the
    // entire Supplies half of every shopping list was ungoverned: `unitCostRange`,
    // `qtyPerGuest`, `qtyFlat` and `provenance` were all editable, publishable,
    // versioned and approved on a supply line, and changing any of them moved
    // nothing a host saw. Measured across 39 playbooks before the fix: 396 dead
    // field/purchase pairs, every one of them a supply row.
    //
    // The comment below has always claimed these rows get "the EXACT same row
    // functions as food". They did not, and the gap was invisible precisely because
    // the rows LOOK identical on the surface — same qty, same price range, sourced
    // from the authored file instead of the governed one.
    const p = governedPurchase(playbook, p0);
    const baseQty = resolveQuantity(p, guests);
    const qOver = (p.id in qtyMap) ? Math.max(0, Number(qtyMap[p.id]) || 0) : null;
    const qty = qOver != null ? qOver : baseQty;
    let [uLow, uHigh] = Array.isArray(p.unitCostRange) ? p.unitCostRange : [0, 0];
    // Consumable supplies (ice/charcoal/plates/cups/foil/bags) take the modest Costco
    // bulk factor — disposables savings are real but mixed, so ~10%, not a deep cut.
    // Butcher/grocery (default) = base → unchanged. Durable RENTALS live in playbookCapacity
    // and are correctly excluded (a folding chair has no "Costco vs butcher" price).
    const _supSrc = nonProteinFactor(sourcing);
    if (_supSrc !== 1) { uLow *= _supSrc; uHigh *= _supSrc; }
    const units = qty == null ? 1 : qty;
    list.push({
      id: p.id, group: 'Supplies', item: p.item, short: shortItem(p.item),
      qty, unit: shortUnit(p.unit, qty), essential: !!p.essential, where: [...new Set([...(p.where || []), ...extraSupplyStores(p.item)])],
      cat: p.category || 'other', buyAt: p.buyAt || null, perGuest: null, basis: '',
      qtyOverridden: qOver != null, baseQty,
      low: Math.round(units * uLow * pf), high: Math.round(units * uHigh * pf),
      units, unitBase: p.unit || '', perUnitLow: Math.round(uLow * pf * 100) / 100, perUnitHigh: Math.round(uHigh * pf * 100) / 100,
      skipped: !!skip[p.id], locked: (p.id in lockedMap) ? Math.max(0, Math.round(Number(lockedMap[p.id]) || 0)) : null,
      note: p.note || '', forgotten: /commonly forgotten/i.test(p.note || ''), supply: true,
      ...(Array.isArray(p.alternatives) && p.alternatives.length > 0 ? { alternatives: p.alternatives } : {}),
      // Same three governance fields the food rows carry, for the same reason: a
      // host reading a sourced supply quantity should be told it is sourced, and a
      // surface should not have to know whether a line came from the food loop or
      // this one to answer "where did this number come from".
      provenance: purchaseProvenance(playbook, p0) || null,
      qtyGrounded: isGroundedItemQty(purchaseProvenance(playbook, p0)),
      governedFields: p._governed || [],
    });
  }

  // A locked cost is fixed — it collapses the item's range to one committed number.
  // excludeFromFoodTotal (CRAB-BUDGET-1): this line's real $ already lives in a
  // separate total elsewhere (buildCrabPlan/hostSpending) — zero its own
  // contribution here so the food total never double-counts it, while the
  // line's own low/high fields stay real for its own row's display.
  const eff = (i, k) => (i.excludeFromFoodTotal ? 0 : (i.locked != null ? i.locked : i[k]));
  const isFood = (i) => i.group !== 'Supplies';   // supplies are a separate $ line
  // Skipped (swapped-out) items leave every total. Food totals exclude Supplies.
  const sum = (k) => list.filter((i) => !i.skipped && isFood(i)).reduce((s, i) => s + eff(i, k), 0);
  const lockedTotal = list.filter((i) => !i.skipped && isFood(i) && i.locked != null).reduce((s, i) => s + i.locked, 0);
  const lockedCount = list.filter((i) => !i.skipped && isFood(i) && i.locked != null).length;
  // realCount: lines the host PRICED FOR REAL — a typed receipt (event.foodReal)
  // or a host-added line. lockedCount over-counts these because an accepted
  // estimate (Value/Premium/bulk) is also `locked`; realCount is the honest tally.
  const _foodReal = (event.foodReal && typeof event.foodReal === 'object') ? event.foodReal : {};
  const realCount = list.filter((i) => !i.skipped && isFood(i) && (i.added || (i.locked != null && _foodReal[i.id]))).length;
  // Sourcing card data (1597-2): the key protein's BASELINE (factor-1.0) point cost, so
  // the card can show "~$X ribs" under each tier. Only present when the spread has a
  // protein to source. No protein → no card (sides-only events don't get the question).
  const _keyProtein = list.find((i) => !i.skipped && isFood(i) && isProteinItem(i.item));
  const _kpP = _keyProtein ? playbook.purchases.find((p) => p.id === _keyProtein.id) : null;
  const sourcingKey = (_keyProtein && _kpP) ? {
    item: _keyProtein.short || _keyProtein.item,
    // Per-tier point cost for the key protein — authored sourcingPrices when present,
    // otherwise the typical factor off the base range.
    byTier: SOURCING_TIERS.reduce((acc, t) => {
      const range = (_kpP.sourcingPrices && Array.isArray(_kpP.sourcingPrices[t.id]))
        ? _kpP.sourcingPrices[t.id]
        : ((t.id !== DEFAULT_SOURCING && canonicalProteinPrice(_kpP.item, t.id))
          || (Array.isArray(_kpP.unitCostRange) ? _kpP.unitCostRange.map((v) => v * t.factor) : [0, 0]));
      acc[t.id] = Math.round((_keyProtein.units || 1) * ((range[0] + range[1]) / 2) * pf);
      return acc;
    }, {}),
    authored: !!(_kpP.sourcingPrices),
  } : null;
  const di = dietaryResolved(event);
  // 60H — what the host has actually bought (checked off on the shopping list). This
  // is what connects the food plan to the budget: spent updates as items are ticked.
  const got = (event.foodGot && typeof event.foodGot === 'object') ? event.foodGot : {};
  const gotSum = (k) => list.filter((i) => got[i.id] && !i.skipped && isFood(i)).reduce((s, i) => s + eff(i, k), 0);
  const boughtCount = list.filter((i) => got[i.id] && !i.skipped && isFood(i)).length;

  // Supplies — the 'Supplies' group of the list. Derived totals mirror the food
  // ones (eff() so a locked supply is a fixed cost; got tracks check-offs).
  const supItems = list.filter((i) => i.group === 'Supplies' && !i.skipped);
  const supSum = (k) => supItems.reduce((s, i) => s + eff(i, k), 0);
  const supGot = (k) => supItems.filter((i) => got[i.id]).reduce((s, i) => s + eff(i, k), 0);
  const supplies = list.filter((i) => i.group === 'Supplies');

  return {
    type: playbook.type,
    guests,
    guestCountResolved: gc.resolved,
    hasRealCount,
    choices,
    list,
    // FOOD-2A Stage 1 — additive, read-only: the same `list`, projected into the normalized
    // Effective Item shape. `list` above is UNTOUCHED (every existing consumer/test reads it
    // unchanged); this is a parallel view future stages (category defaults, item overrides,
    // already-have flags) attach to without re-plumbing consumers. No math, no behavior change.
    effectiveItems: list.map((i) => resolveEffectiveItem(i, event)),
    supplies,
    suppliesLow: Math.max(0, Math.round(supSum('low') / 5) * 5),
    suppliesHigh: Math.max(0, Math.round(supSum('high') / 5) * 5),
    suppliesSpentLow: Math.max(0, Math.round(supGot('low') / 5) * 5),
    suppliesSpentHigh: Math.max(0, Math.round(supGot('high') / 5) * 5),
    suppliesCount: supItems.length,
    suppliesBought: supItems.filter((s) => got[s.id]).length,
    groups: ['Food', 'Drinks', 'Supplies', 'Dessert'].filter((g) => list.some((i) => i.group === g)),
    // Sourcing card (1597-2): current tier, the tier list, + the key protein's baseline
    // cost so the UI shows each option's re-priced "~$X ribs".
    sourcing,
    sourcingKey,
    sourcingTiers: SOURCING_TIERS,
    foodLow: Math.max(0, Math.round(sum('low') / 5) * 5),
    foodHigh: Math.max(0, Math.round(sum('high') / 5) * 5),
    // Cost PER HEAD — both totals are now priced at the same ceiling headcount (see
    // above), so both ends divide by `guests` too: per-guest × guests ties back
    // exactly to foodLow/foodHigh, and the range is pure price spread, matching them.
    perGuestLow: guests > 0 ? Math.round(sum('low') / guests) : 0,
    perGuestHigh: guests > 0 ? Math.round(sum('high') / guests) : 0,
    // bandLow/bandHigh still disclose the REAL attendance spread (60-86, say) as its
    // own honest fact — separate from the dollar figures above, never compounded in.
    bandLow: _guestsLow, bandHigh: guests,
    spentLow: Math.max(0, Math.round(gotSum('low') / 5) * 5),
    spentHigh: Math.max(0, Math.round(gotSum('high') / 5) * 5),
    boughtCount,
    itemCount: list.filter((i) => !i.skipped && isFood(i)).length,
    lockedTotal: Math.max(0, Math.round(lockedTotal)),
    lockedCount,
    realCount,
    dietaryResolved: di.resolved,
    specialDiets, // [{diet, count}] — drives the plant-based line + the host-facing note
    priceFactor: pf,
    priceContext: pf !== 1 ? (opts.priceContext || null) : null,
  };
}

// playbookHeartMoments(event) — the 3-5 "must-have moment" suggestions for this event
// type. Pure passthrough of the playbook's AUTHORED heartMoments array — invents nothing.
// Returns [] for types without a playbook or without heartMoments.
export function playbookHeartMoments(event) {
  const playbook = getPlaybook(event && event.type);
  return (playbook && playbook.heartMoments) || [];
}

// playbookAbout(type) — the event-type EDUCATION surface, for a host who wants to
// understand what this kind of event is + why its choices matter. Pure passthrough of
// the playbook's AUTHORED knowledge (summary, cultural/historical note, decision whys)
// — invents nothing. Returns null for types without a playbook.
export function playbookAbout(type) {
  const pb = getPlaybook(type);
  if (!pb) return null;
  const summary = String(pb.summary || (pb.meta && pb.meta.summary) || '').trim();
  const note = String((pb.knowledge && pb.knowledge.note) || (pb.meta && pb.meta.note) || '').trim();
  if (!summary && !note) return null;
  return {
    type: pb.type,
    summary,
    note,
    // The decisions that carry real "why it matters" prose — the practical knowledge.
    whys: (pb.decisions || []).filter((d) => d.why).map((d) => ({ label: d.label, why: d.why })),
  };
}

// playbookSetupPreview(type) — the richer "What I'll set up" bridge for the create
// panel. Surfaces the playbook's REAL, named intelligence (its actual milestones,
// food/decision counts, whether it carries a meaning/program element) so the host
// sees the product gets THIS specific day — e.g. for a Juneteenth Cookout: "Plan
// the meaning/program element", "Book Black-owned caterer/baker", "Build the music
// (Black artists across eras)". Honest by construction — it reflects the authored
// playbook, invents nothing. Returns null for types without a playbook.
export function playbookSetupPreview(type) {
  const pb = getPlaybook(type);
  if (!pb) return null;
  const ms = (Array.isArray(pb.milestones) ? pb.milestones : []).filter((m) => m.category !== 'event');
  const purchases = Array.isArray(pb.purchases) ? pb.purchases : [];
  const foodCount = purchases.filter((p) => p.category === 'food' || p.category === 'beverage').length;
  const decisions = Array.isArray(pb.decisions) ? pb.decisions : [];
  const steps = ms.map((m) => ({
    name: m.name,
    owner: m.owner || 'host',
    category: m.category || 'planning',
    daysBefore: typeof m.offsetDays === 'number' ? m.offsetDays : null,
    critical: !!(m.risk && m.risk.severity === 'high'),
  }));
  const hasMeaning = ms.some((m) => /meaning|program|reflect|honor|tribute|toast|reading/i.test(m.name || ''));
  return {
    type: pb.type,
    steps,                       // the real, named plan — the event-specific intelligence
    stepCount: steps.length,
    foodCount,                   // sized food + drink items
    decisionCount: decisions.length,
    hasMeaning,                  // carries a program/reflection element
  };
}

// ── Host-shell V2 accessors (single-point-of-truth rule: surfaces never read
// playbook internals directly — these are the sanctioned readers). ──────────

// The crab playbook's verified reference price ladder (display/reference ONLY —
// buildCrabPlan's cost math still uses host-entered prices exclusively).
export function crabPriceLadder() {
  const pb = getPlaybook('Crab Feast');
  if (!pb) return null;
  // GOVERNED (Phase 5E.4). hostv2 renders these as the reference prices on the crab
  // sheet ("male $72 / female $52"), while the shopping list prices the same crabs
  // through governedPurchase. Scanning the authored playbook here meant a published
  // ladder correction moved one surface and not the other: two host-visible prices
  // for the costliest item on the list, disagreeing, both looking authoritative.
  // That is the exact failure the ownership contract exists to prevent, and it was
  // sitting one function away from the field the contract points admins at.
  const crabs = (pb.purchases || []).find((p) => p && p.id === 'p_crabs');
  if (crabs) {
    const gov = governedPurchase(pb, crabs);
    if (gov && gov.priceLadder) return gov.priceLadder;
  }
  // Fallback for any playbook shape that carries a ladder somewhere else.
  const scan = (o, depth) => {
    if (!o || typeof o !== 'object' || depth > 6) return null;
    if (o.priceLadder) return o.priceLadder;
    for (const v of Object.values(o)) { const r = scan(v, depth + 1); if (r) return r; }
    return null;
  };
  return scan(pb, 0);
}

// Which purchase lines does an UNMADE menu decision re-price? Map of
// itemId → decision label, for decisions the host hasn't explicitly picked.
export function playbookOpenDecisionAffects(event) {
  const pb = getPlaybook(event && event.type);
  if (!pb) return {};
  const picks = (event && event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices : {};
  const m = {};
  (pb.decisions || []).forEach((d) => {
    if (d && Array.isArray(d.affects) && !(d.id in picks)) d.affects.forEach((id) => { m[id] = d.label; });
  });
  return m;
}

// The playbook's researched typical guest count (seeding/defaulting only).
export function playbookTypicalGuests(type) {
  const pb = getPlaybook(type);
  return (pb && pb.meta && pb.meta.typicalGuests && pb.meta.typicalGuests.default) || null;
}
