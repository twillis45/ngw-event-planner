// Event OS — Playbook Reader (Sprint 55C-1).
//
// A minimal, deterministic reader over playbook data. It does NOT rank,
// persist, or own state — it is a PURE producer of dated, quantity-resolved
// operational task CANDIDATES that the EXISTING next-action cascade
// (selectEventNextAction / selectStudioCommand) ranks and renders. No new
// engine, no new runtime, no new UI.
//
// ESM-only (per the prod-bundle lesson — no CJS module.exports in src/).

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
import { expectedFromPlanned, attendanceShift } from '../attendanceModel';
import { SOURCING_TIERS, DEFAULT_SOURCING, sourcingTier, sourcingFactor, isProteinItem, canonicalProteinPrice, nonProteinFactor, extraSupplyStores, canonicalSubstitutes } from '../sourcing';
import { resolveEffectiveItem } from '../effectiveItem'; // FOOD-2A: read-only normalized projection of `list`

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
  const pending = list.filter((g) => {
    const r = String((g && g.rsvp) || '').trim().toLowerCase();
    return r === 'maybe' || r === '';
  }).length;
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
export function attendanceBand(event) {
  if (!event) return { applicable: false, band: false };
  const list = Array.isArray(event.guests) ? event.guests : [];
  const roster = event.guestMode !== 'count' && list.length > 0;
  const norm = (g) => String((g && g.rsvp) || '').trim().toLowerCase();
  if (roster) {
    let confirmed = 0, maybe = 0, pending = 0, declined = 0;
    for (const g of list) {
      const r = norm(g);
      if (r === 'yes' || r === 'attending' || r === 'accepted') confirmed++;
      else if (r === 'maybe') maybe++;
      else if (r === 'no' || r === 'declined' || r === 'regret' || r === 'regrets') declined++;
      else pending++; // '' / unknown → not yet replied
    }
    const low = confirmed;
    const high = confirmed + maybe + pending; // everyone who hasn't said no
    const out = maybe + pending;
    const band = high > low; // a real range only when replies are still outstanding
    const because = band
      ? `${confirmed} confirmed · ${out} ${out === 1 ? 'reply' : 'replies'} still out`
      : `${confirmed} confirmed`;
    return {
      applicable: high > 0,
      basis: 'rsvp', band,
      low, high, planning: high,
      confirmed, maybe, pending, declined, invited: list.length,
      because,
    };
  }
  // Count / estimate — no RSVP signal yet, so the researched attendance-shift model
  // fills the gap: a planned number rarely lands exactly, so we surface the typical
  // band around it (down for no-shows, up for plus-ones/walk-ins), keyed to how this
  // kind of event behaves. Real RSVPs (the branch above) always trump this.
  const n = Number(event.guestCount) || Number(event.guestEstimate) || list.length || 0;
  if (n <= 0) return { applicable: false, band: false };
  // A LOCKED final count the host has committed isn't an estimate — honor it exactly
  // (no modeled spread on a number they've finalized).
  const locked = event.guestCountLocked === true || event.headcountLocked === true;
  const exp = locked ? null : expectedFromPlanned(n, event.type, getPlaybook(event.type));
  if (!exp || exp.low >= exp.high) {
    return {
      applicable: true, basis: 'count', band: false,
      low: n, high: n, planning: n,
      confirmed: n, maybe: 0, pending: 0, declined: 0, invited: n,
      planned: n, because: '',
    };
  }
  return {
    applicable: true, basis: 'estimate', band: true,
    low: exp.low, high: exp.high, planning: exp.high,
    confirmed: 0, maybe: 0, pending: 0, declined: 0, invited: n,
    planned: n, shift: attendanceShift(event.type, getPlaybook(event.type)),
    because: `Planned for ${n} · ${exp.low}–${exp.high} typically show`,
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
  return (dec && dec.default) || null;
}
export function choiceShown(event, whenChoice) {
  if (!whenChoice || !whenChoice.id) return true;
  const v = choicePickFor(event, whenChoice.id);
  return v == null ? true : (Array.isArray(whenChoice.in) ? whenChoice.in : []).includes(v);
}

// Day offset from a task's `when` token: 'T-10d' → -10, 'T0' → 0, 'T0 -0:30' → 0
// (the intra-day hours are ignored — only the day phase matters here). null if absent.
function taskOffsetDays(when) {
  const m = /^T(-?\d+)/.exec(String(when || '').trim());
  return m ? parseInt(m[1], 10) : null;
}
// A calm, honest phase label for a task's relative date — no fake calendar dates,
// no OVERDUE pill (these labels are intentionally NOT in ChecklistGenerator's
// PHASE_OFFSET map, so the host never gets a "behind" verdict on the plan view).
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

  const rows = [];
  for (const t of playbook.tasks) {
    if (!t || !t.id || !t.label) continue;
    // Choice gate — a task tagged whenChoice appears only for the matching pick.
    if (!choiceShown(event, t.whenChoice)) continue;
    const offset = taskOffsetDays(t.when); // days relative to event (≤ 0 = before)
    const dueInDays = offset == null ? null : dte + offset;
    const eventDay = offset != null && offset >= 0;
    rows.push({
      id: `pbt-${event.id}-${t.id}`,
      task: t.label,
      // 'event-day' buckets a T0 task under THE DAY tab; everything else is planning.
      category: eventDay ? 'event-day' : 'planning',
      phase: t.phase || 'planning',
      week: taskPhaseLabel(offset),
      owner: '', // a solo host owns everything — no owner chip clutter
      dueInDays,
      provenance: { source: `${playbook.type} playbook`, taskId: t.id },
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
export function playbookTasks(event, asOf) {
  if (!event) return [];
  const playbook = getPlaybook(event.type);
  if (!playbook || !Array.isArray(playbook.purchases)) return [];
  const dte = daysToEvent(event.date, asOf);
  if (dte === null) return [];

  const guests = guestCountOf(event, playbook);
  const gc = guestCountResolved(event);
  const di = dietaryResolved(event);
  // Already bought (checked off) or swapped out → no longer a task, so clearing the
  // CTA (buying the item) advances the next-step to the next thing.
  const got  = (event.foodGot  && typeof event.foodGot  === 'object') ? event.foodGot  : {};
  const skip = (event.foodSkip && typeof event.foodSkip === 'object') ? event.foodSkip : {};
  const tasks = [];

  for (const p of playbook.purchases) {
    if (got[p.id] || skip[p.id]) continue; // done / swapped out → advance past it
    const offset = buyOffsetDays(p.buyAt);
    if (offset === null) continue;
    const dueInDays = dte + offset;
    // Window gate — eligible only today..WINDOW_LEAD ahead; never past-due.
    if (dueInDays < 0 || dueInDays > WINDOW_LEAD) continue;
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
      primaryCta: 'Take me to it',
      // Deep-link: land on the food plan AND target this exact line (foodFocus = the
      // purchase id, same id the food-plan list uses) so the host can price/check it.
      primaryRoute: { eventId: event.id, tab: 'Planning', foodFocus: p.id },
      eventId: event.id,
      owner: 'host',
      provenance: { source: `${playbook.type} playbook`, buyAt: p.buyAt },
    });
  }

  // Rank: soonest-due first, then essential. The cascade takes [0]; this is the
  // reader's only ordering — it never competes with the runtime's priority math.
  tasks.sort(
    (a, b) =>
      a.dueInDays - b.dueInDays || Number(b.essential) - Number(a.essential),
  );
  return tasks;
}

// The single top operational candidate for an event (or null).
export function topPlaybookTask(event, asOf) {
  const list = playbookTasks(event, asOf);
  return list.length ? list[0] : null;
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
      ? `${gc.pending} guest${gc.pending === 1 ? '' : 's'} still pending — chase the maybes, then buy to the locked count.`
      : 'Add a final guest count so every quantity is sized before you shop.';
    return {
      id: `pb-decision-${event.id}-guestCount`,
      kind: 'decision',
      category: 'decision',
      decision: 'guestCount',
      title: 'Confirm final guest count',
      consequence: `Food, drinks, ice, and rentals all scale from headcount. ${pendingMsg}`,
      level: 'attention',
      primaryCta: gc.reason === 'pending-rsvps' ? 'Chase RSVPs' : 'Set guest count',
      primaryRoute: { eventId: event.id, tab: 'Guests' },
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
        ? { eventId: event.id, tab: 'Planning' }
        : { eventId: event.id, tab: 'Guests' },
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
const ROS_ANCHOR_HOUR = { morning: 10, afternoon: 15, evening: 18 };
// kind → segment type; both 'cooking' (Dinner Party) and 'preparation' (others).
const ROS_SCHEDULE_KINDS = [
  { key: 'cooking', segType: 'event' },
  { key: 'preparation', segType: 'event' },
  { key: 'setup', segType: 'prep' },
  { key: 'cleanup', segType: 'prep' },
];

// A day-of `when` token → minutes offset from the anchor. null for pre-day /
// non-clock tokens (T-1d, T-3d, 'during', 'ongoing') so they're skipped.
function rosWhenOffset(when) {
  const w = String(when || '').trim();
  if (/^T-\d+d/i.test(w)) return null;          // pre-day shopping/prep
  if (/during|ongoing/i.test(w)) return null;   // not a point in time
  if (/guests?\s*arrive/i.test(w)) return 0;    // at the anchor
  const m = /^T0\s*([+-])\s*(\d+)(?::(\d+))?\s*h?/i.exec(w);
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    const h = parseInt(m[2], 10);
    const min = m[3] != null ? parseInt(m[3], 10) : 0;
    return sign * (m[3] != null ? h * 60 + min : h * 60);
  }
  if (/^T0\b/i.test(w)) return 0;               // bare T0 → anchor
  return null;
}

const rosPad2 = (n) => String(((n % 24) + 24) % 24).padStart(2, '0');

export function playbookRunOfShow(event) {
  if (!event) return null;
  const playbook = getPlaybook(event.type);
  if (!playbook || !playbook.schedules) return null;
  const tod = String(event.timeOfDay || '').toLowerCase();
  const base = ROS_ANCHOR_HOUR[tod] != null ? ROS_ANCHOR_HOUR[tod] : ROS_ANCHOR_HOUR.afternoon;
  const baseMin = base * 60;

  const rows = [];
  let seq = 0;
  for (const kind of ROS_SCHEDULE_KINDS) {
    const list = Array.isArray(playbook.schedules[kind.key]) ? playbook.schedules[kind.key] : [];
    for (const entry of list) {
      const off = rosWhenOffset(entry.when);
      if (off === null) continue;
      const total = baseMin + off;
      rows.push({
        id: `pb-ros-${event.id}-${kind.key}-${seq++}`,
        time: `${rosPad2(Math.floor(total / 60))}:${String(((total % 60) + 60) % 60).padStart(2, '0')}`,
        _min: total,
        segment: entry.what,
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
  if (!rows.length) return null;
  // Anchor a "Guests arrive" hero segment unless an entry already lands there.
  if (!rows.some((r) => r._min === baseMin)) {
    rows.push({
      id: `pb-ros-${event.id}-arrival`, time: `${rosPad2(base)}:00`, _min: baseMin,
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
  if (stored.length) return stored;
  return playbookRunOfShow(event) || [];
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
  const guests = guestCountOf(event, playbook);
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
    const qty = (short in qtyOv) ? Math.max(0, Math.round(Number(qtyOv[short]) || 0)) : baseQty;
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
  return { guests, items, groups, summary, because, sizing, sizingWhy, costLow, costHigh, hasCost: costed.length > 0, costedCount: costed.length, itemCount: items.length, lockedTotal, lockedCount: lockedItems.length };
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
      let dueDate = null;
      if (event.date) {
        const d = new Date(event.date + 'T00:00:00');
        d.setDate(d.getDate() - m.offsetDays);
        dueDate = d.toISOString().slice(0, 10);
      }
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
  let s = String(label || '').trim().replace(/\?+\s*$/, '');
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
  return d.toISOString().slice(0, 10);
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

export function playbookDecisionBoard(event, asOf) {
  const empty = { open: [], locked: [], headcount: null };
  if (!event) return empty;

  const dte = daysToEvent(event.date, asOf); // null when no date
  const open = [];
  const locked = [];

  const dateSet = !!String(event.date || '').trim() && !/^(tbd|tba)$/i.test(String(event.date).trim());
  const hasVenue = !!String(event.venue || '').trim() && !/^(tbd|tba)$/i.test(String(event.venue).trim());
  const gc = guestCountResolved(event);
  const band = attendanceBand(event);
  const di = dietaryResolved(event);

  // ── Foundation facts ───────────────────────────────────────────────────────
  // Date — the anchor everything counts down from. Locked when set; otherwise the
  // one foundation we DO surface as open (a venue is optional for home hosting, so
  // an unset venue is never nagged — it only appears once settled).
  if (dateSet) {
    locked.push({ id: 'date', label: 'Date', status: 'locked', because: friendlyDate(event.date), dueDate: event.date, daysOut: dte, route: { eventId: event.id, tab: 'Event Details', focusField: 'event-date' } });
  } else {
    open.push({ id: 'date', label: 'Lock the date', status: 'ready', because: 'Everything counts down from the date.', dueDate: null, daysOut: null, route: { eventId: event.id, tab: 'Event Details', focusField: 'event-date' } });
  }
  if (hasVenue) {
    locked.push({ id: 'venue', label: 'Venue', status: 'locked', because: String(event.venue).trim(), dueDate: null, daysOut: null, route: { eventId: event.id, tab: 'Event Details' } });
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
    locked.push({ id: 'headcount', label: 'Headcount', status: 'locked', because: `${n} ${n === 1 ? 'guest' : 'guests'}`, dueDate: null, daysOut: null, route: { eventId: event.id, tab: 'Guests' } });
  } else if (out > 0) {
    headcount = {
      confirmed: band.confirmed,
      outstanding: out,
      invited: band.invited,
      planning: band.planning,
      label: attendanceBandLabel(band),
      because: `${band.confirmed} confirmed · ${out} still out of ${band.invited} invited`,
      route: { eventId: event.id, tab: 'Guests' },
    };
  } else {
    open.push({ id: 'headcount', label: 'Lock your guest count', status: 'ready', because: 'Food, drinks, and seating all size from your headcount.', dueDate: null, daysOut: null, route: { eventId: event.id, tab: 'Guests' } });
  }

  // ── Playbook decisions ─────────────────────────────────────────────────────
  const pb = getPlaybook(event.type);
  const decisions = (pb && Array.isArray(pb.decisions)) ? pb.decisions : [];
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

  for (const d of decisions) {
    if (!d || !d.label) continue;
    const offset = buyOffsetDays(d.when); // 'T-21d' → -21 ; null when no `when`
    const daysOut = (dte !== null && offset !== null) ? dte + offset : null;
    const dueDate = decisionDueDate(dateSet ? event.date : null, offset);
    // Only a menu/sourcing choice has a real Plan-tab destination (the FoodPlan "Your
    // choices" card focuses it). A non-menu decision (venue, theme, music, seating…) has
    // no anchor, so it gets NO route — the board renders it as a calm "still open" prompt
    // instead of a tappable row whose arrow would lead nowhere.
    const route = isMenuDecision(d) ? { eventId: event.id, tab: 'Planning', foodFocus: d.id } : null;

    if (isLocked(d)) {
      const val = picks[d.id] || (isDietaryDecision(d) ? 'Collected' : (d.default || 'Set'));
      locked.push({ id: d.id, label: decisionShortLabel(d.label), status: 'locked', because: String(val), dueDate, daysOut, route });
      continue;
    }

    const deps = Array.isArray(d.dependsOn) ? d.dependsOn : [];
    const unmet = deps.filter((x) => !depMet(x));
    let status; let because;
    if (daysOut !== null && daysOut < 0) {
      status = 'overdue';
      const od = Math.abs(daysOut);
      because = `Was due ${od} ${od === 1 ? 'day' : 'days'} ago.`;
    } else if (unmet.length) {
      status = 'waiting';
      const nouns = unmet.map((x) => decisionDepNoun(x, decisions));
      because = nouns.length ? `Waiting on ${joinNouns(nouns)}.` : 'Waiting on an earlier choice.';
    } else {
      status = 'ready';
      because = daysOut === null ? 'Ready when you are.'
        : daysOut <= 0 ? 'Good to lock today.'
          : `Good to lock — about ${daysOut} ${daysOut === 1 ? 'day' : 'days'} out.`;
    }
    open.push({ id: d.id, label: decisionShortLabel(d.label), status, because, dueDate, daysOut, route });
  }

  // Calmest-first ordering: overdue, then ready (soonest due), then waiting.
  const STATUS_RANK = { overdue: 0, ready: 1, waiting: 2 };
  open.sort((a, b) => (STATUS_RANK[a.status] - STATUS_RANK[b.status])
    || ((a.daysOut == null ? 9999 : a.daysOut) - (b.daysOut == null ? 9999 : b.daysOut)));

  return { open, locked, headcount };
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
  // plan-to ceiling for quantities, and the band floor/ratio so the $ range spans the
  // expected-attendance band, not just price. Same source the supplies + budget read.
  const sizing = eventSizing(event, playbook);
  const guests = sizing.ceiling;
  const _guestsLow = sizing.floor;
  const hcLowRatio = sizing.lowRatio;
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
  // Channel factor: proteins use the deep meat factor (unless they have a tier range);
  // non-protein food + drinks use the modest Costco bulk factor (produce/dairy/staples).
  const srcFactorFor = (p) => {
    if (p.category !== 'food' && p.category !== 'beverage') return 1;
    if (isProteinItem(p.item)) return srcTierRange(p) ? 1 : srcFactor;
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

  // The grounded shopping list, scaled by guest count, grouped + costed.
  const list = playbook.purchases
    .filter((p) => (p.category === 'food' || p.category === 'beverage') && purchaseShown(p) && regionShown(p) && hostBuysIt(p))
    .map((p) => {
      // In-place swap chosen for this line (event.foodSwap[id] = the alternative's name).
      const swappedName = (p.id in swapMap && String(swapMap[p.id] || '').trim()) ? String(swapMap[p.id]).trim() : null;
      // If the chosen alternative carries its OWN price/qty data, the line RE-PRICES to it
      // (BLS-adjusted via pf below). A plain string alternative keeps the original cost.
      const swapAlt = (swappedName && Array.isArray(p.alternatives))
        ? p.alternatives.map(normalizeAlternative).find((a) => a.name === swappedName) : null;
      const effPerGuest = (swapAlt && swapAlt.qtyPerGuest != null) ? swapAlt.qtyPerGuest : p.qtyPerGuest;
      const pForQty = (effPerGuest !== p.qtyPerGuest) ? { ...p, qtyPerGuest: effPerGuest } : p;
      const baseQty = resolveQuantity(pForQty, guests);
      // 64-#3 — host quantity override (event.foodQty[id]); flows straight into the
      // cost so changing "15 lbs" to "20 lbs" moves the food total + the budget.
      const qOver = (p.id in qtyMap) ? Math.max(0, Number(qtyMap[p.id]) || 0) : null;
      let qty = qOver != null ? qOver : baseQty;
      const _tierRange = swapAlt ? null : srcTierRange(p);
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
      // Global buyable-unit guardrail — if an author left this in a non-buyable
      // serving unit (e.g. "40 slices" of cake), convert to whole purchasable units
      // (cakes/pizzas/loaves/pies) and scale the per-unit cost so the TOTAL is
      // unchanged. No-op (null) for everything already modeled in buyable units.
      const buyable = normalizeBuyable(p.item, qty, p.unit, uLow, uHigh);
      const unit = buyable ? shortUnit(buyable.unit, buyable.qty) : shortUnit(p.unit, qty);
      if (buyable) { qty = buyable.qty; uLow = buyable.uLow; uHigh = buyable.uHigh; }
      const units = qty == null ? 1 : qty;
      // Does this line scale with headcount? per-guest or per-N items do; flat items and
      // host-overridden quantities don't. Only scaling lines pull their LOW dollar down
      // to the attendance-band floor (the $ range then reflects "if fewer show").
      const _scales = qOver == null && (typeof effPerGuest === 'number' || (typeof p.qtyFlat === 'number' && typeof p.qtyPer === 'number'));
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
        basis: buyable ? '' : quantityBasis(p),
        qtyOverridden: qOver != null, baseQty,
        low: Math.round(units * uLow * pf * (_scales ? hcLowRatio : 1)), high: Math.round(units * uHigh * pf),
        // lowFull = the un-compounded low (price-low at the plan-to qty). The headline
        // total uses `low` (compounded to the band floor) so the $ range reflects the
        // guest band; PER-GUEST uses lowFull so cost-per-head stays a stable price range
        // and doesn't shrink just because the band's floor is lower.
        lowFull: Math.round(units * uLow * pf),
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
        id: a.id, group: 'Food', item: a.name, short: a.name,
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
  const dietCounts = (event.dietCounts && typeof event.dietCounts === 'object') ? event.dietCounts : {};
  const dietCnt = (k) => Math.max(0, Math.round(Number(dietCounts[k]) || 0));
  const vegN = dietCnt('Vegetarian') + dietCnt('Vegan');
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
    const need = String((g && g.needs) || '').toLowerCase();
    if (!need) continue;
    if (/\bvegan\b/.test(need)) rosterDiets.add('Vegan');
    if (/\bveg(etarian|gie)?\b/.test(need) && !/\bvegan\b/.test(need)) rosterDiets.add('Vegetarian');
    if (/gluten/.test(need)) rosterDiets.add('Gluten-free');
    if (/\bnut\b|peanut|tree ?nut|almond|cashew|walnut|pecan/.test(need)) rosterDiets.add('Nut allergy');
    if (/dairy|lactose/.test(need)) rosterDiets.add('Dairy-free');
    if (/shellfish|shrimp|crab|lobster|clam|oyster|mussel|scallop|prawn/.test(need)) rosterDiets.add('Shellfish');
    if (/halal/.test(need)) rosterDiets.add('Halal');
    if (/kosher/.test(need)) rosterDiets.add('Kosher');
    if (/pescatarian/.test(need)) rosterDiets.add('Pescatarian');
    if (/no alcohol|alcohol-free|sober|non-?alcoholic/.test(need)) rosterDiets.add('Alcohol-free');
  }
  const activeDiets = [...new Set([...specialDiets.map((d) => d.diet), ...rosterDiets])];
  if (activeDiets.length) {
    for (const it of list) {
      const flags = itemDietaryFlags(it.item || it.short, activeDiets);
      if (flags.length) it.dietFlags = flags;
    }
  }

  // Essential NON-food supplies (kraft-paper table cover, propane, safety kit…) —
  // folded into the list as their own "Supplies" group so they get the EXACT same
  // row functions as food (lock-before-checkoff, qty edit, skip/swap, per-unit,
  // where-links, alternatives). Kept OUT of the food $ total below; surfaced as
  // their own budget line. Same map shape as the food rows above.
  for (const p of playbook.purchases) {
    if (p.category === 'food' || p.category === 'beverage') continue;
    if (!p.essential || !p.buyAt || !purchaseShown(p) || !regionShown(p)) continue;
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
    });
  }

  // A locked cost is fixed — it collapses the item's range to one committed number.
  const eff = (i, k) => (i.locked != null ? i.locked : i[k]);
  const isFood = (i) => i.group !== 'Supplies';   // supplies are a separate $ line
  // Skipped (swapped-out) items leave every total. Food totals exclude Supplies.
  const sum = (k) => list.filter((i) => !i.skipped && isFood(i)).reduce((s, i) => s + eff(i, k), 0);
  // Price-low at the plan-to qty (NOT compounded to the band floor) — the basis for a
  // stable per-guest figure, so cost-per-head reads as a price range, not a number that
  // dips because the band's low headcount is smaller.
  const effFull = (i) => (i.locked != null ? i.locked : (i.lowFull != null ? i.lowFull : i.low));
  const sumLowFull = list.filter((i) => !i.skipped && isFood(i)).reduce((s, i) => s + effFull(i), 0);
  const lockedTotal = list.filter((i) => !i.skipped && isFood(i) && i.locked != null).reduce((s, i) => s + i.locked, 0);
  const lockedCount = list.filter((i) => !i.skipped && isFood(i) && i.locked != null).length;
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
    // Cost PER HEAD — divide each end by the headcount it was sized to (low total ÷
    // band floor, high total ÷ ceiling) so the per-guest figure stays a real price
    // range, not a number warped by the headcount band.
    // Per-guest derives from the food total at each END of the band ÷ that end's
    // headcount, so per-guest × count ties back to the headline total (low ÷ floor,
    // high ÷ ceiling). A real range from foodLow/foodHigh, consistent with the total.
    perGuestLow: _guestsLow > 0 ? Math.round(sum('low') / _guestsLow) : 0,
    perGuestHigh: guests > 0 ? Math.round(sum('high') / guests) : 0,
    bandLow: _guestsLow, bandHigh: guests,
    spentLow: Math.max(0, Math.round(gotSum('low') / 5) * 5),
    spentHigh: Math.max(0, Math.round(gotSum('high') / 5) * 5),
    boughtCount,
    itemCount: list.filter((i) => !i.skipped && isFood(i)).length,
    lockedTotal: Math.max(0, Math.round(lockedTotal)),
    lockedCount,
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
