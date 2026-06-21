// Sprint UX-4 — Disclosure Architecture (Stage Intelligence).
//
// A VISIBILITY system, not a planning engine. It removes attention from things that
// haven't earned it yet — smaller Stage-1 interface, faster activation — WITHOUT locks,
// gates, completion thresholds, or any new planning logic. Pure functions; no state, no
// persistence, no migration.
//
// Hard rules (review-board, non-negotiable):
//   1. No locks / unlocks / "complete X before Y". Everything stays reachable.
//   2. Never hide POPULATED content. Data beats stage, always.
//   3. Visibility depends only on: persona · urgency · data presence · family relevance ·
//      date proximity. NEVER on completion %.
//   4. Stage is the WEAKEST signal — reality (the signals above) always overrides it.
//   5. Floor is DORMANT (relocated to the Upcoming Rail, still one tap away). There is no
//      state below Dormant — nothing is ever Hidden / Locked / Disabled.

import { audiencePersona } from './nextActionRenderer';

// ── Visibility enum (the ONLY four states) ────────────────────────────────────
export const VIS = {
  PRIMARY:   'primary',    // urgent — surfaces loudly
  STANDARD:  'standard',   // earned its place in the main flow
  COLLAPSED: 'collapsed',  // shown, compact (on-track / low-signal)
  DORMANT:   'dormant',    // not in the main flow — lives in the Upcoming Rail, reachable
};

const arr = (x) => (Array.isArray(x) ? x : []);
const namedVendors = (e) => arr(e && e.vendors).filter(v => v && (v.name || '').trim()).length;
const guestsN = (e) => arr(e && e.guests).length || Number(e && e.guestCount) || Number(e && e.guestEstimate) || 0;
const docsN = (e) => arr(e && e.documents).length;
const timelineN = (e) => arr(e && e.timeline).length || arr(e && e.ros).length;
const budgetN = (e) => arr(e && e.budget).length;
const hasAnyData = (e) => guestsN(e) > 0 || namedVendors(e) > 0 || timelineN(e) > 0 || budgetN(e) > 0;
// What the HOST has actually done — kit-seeded timeline/budget are scaffolding, not
// progress, so they don't "start" the event for disclosure purposes.
const hostStarted = (e) => guestsN(e) > 0 || namedVendors(e) > 0 || docsN(e) > 0;

function daysTo(e) {
  if (!e || !e.date) return null;
  try {
    const d = new Date(e.date + 'T00:00:00');
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.ceil((d - t) / 86400000);
  } catch (err) { return null; }
}

const isPlanner = (e) => audiencePersona(e) !== 'host'; // planner / operator keep the full cockpit

// ── eventStage(event) — the WEAKEST signal. Derived from date + data presence ONLY
// (never completion %). Informational; the resolver lets reality override it. ───────
export function eventStage(event) {
  if (!event) return 'created';
  const days = daysTo(event);
  if (event.status === 'complete' || event.completed || (days !== null && days < 0)) return 'complete';
  if (days !== null && days === 0) return 'dayof';
  if (days !== null && days <= 14) return 'final';
  if (hasAnyData(event) && days !== null && days <= 45) return 'active';
  if (hasAnyData(event)) return 'early';
  return 'created';
}

// ── Section registry: per-section SIGNALS only (data / urgency / family / date).
// This is configuration, NOT per-surface visibility logic — the visibility DECISION
// lives entirely in the one resolver below. `signals` lets a caller pass derived counts
// (e.g. the Command Center's needs queue) the raw event can't cheaply provide. ───────
const SECTIONS = {
  // Always-earned host essentials — never dormant.
  nextStep: { always: VIS.PRIMARY },
  progress: { always: VIS.STANDARD },
  identity: { always: VIS.STANDARD }, // caller still null-checks the reader; absent ⇒ not rendered
  // Subtraction-eligible operational sections.
  needsYou:       { data: (e, s) => (s.needs || 0) > 0, urgent: (e, s) => (s.criticalNeeds || 0) > 0 },
  decisions:      { data: (e, s) => (s.decisions || 0) > 0, urgent: (e, s) => (s.urgentDecisions || 0) > 0 },
  approvals:      { data: (e, s) => (s.approvals || 0) > 0 },
  requests:       { data: (e, s) => (s.requests || 0) > 0 },
  vendors:        { data: (e) => namedVendors(e) > 0, date: (e) => { const d = daysTo(e); return hostStarted(e) && d !== null && d <= 60; } },
  documents:      { data: (e) => docsN(e) > 0 },
  planningHealth: { data: (e) => hostStarted(e) },
  readinessGrid:  { data: (e) => hostStarted(e) },
  realityCheck:   { data: (e) => hostStarted(e), urgent: (e, s) => (s.criticalNeeds || 0) > 0 },
  capacity:       { data: (e) => guestsN(e) > 0 || namedVendors(e) > 0 },
  nextUp:         { data: (e) => timelineN(e) > 0 },
  foodDrinks:     { family: (e) => guestsN(e) > 0, date: (e) => { const d = daysTo(e); return d !== null && d <= 14; } },
};

// ── THE canonical resolver. Every host-facing section routes through this — there is no
// per-surface visibility logic anywhere else. Priority is fixed (Rule 4): persona >
// urgency > data > family > date > stage. ────────────────────────────────────────────
export function sectionVisibility(section, event, signals) {
  const s = SECTIONS[section];
  const sig = signals || {};
  if (!s) return VIS.STANDARD;                       // unknown section ⇒ never hide
  if (s.always) {
    // planner sees everything; an always-section can still escalate to PRIMARY on urgency
    if (s.urgent && s.urgent(event, sig)) return VIS.PRIMARY;
    return s.always;
  }
  // 1 — Planner persona: full cockpit, NEVER dormant. Urgent ⇒ Primary, else Standard.
  if (isPlanner(event)) return (s.urgent && s.urgent(event, sig)) ? VIS.PRIMARY : VIS.STANDARD;
  // 2 — Urgency wins for hosts too.
  if (s.urgent && s.urgent(event, sig)) return VIS.PRIMARY;
  // 3 — Data presence (Rule 2: populated content is NEVER dormant).
  if (s.data && s.data(event, sig)) return VIS.STANDARD;
  // 4 — Family relevance.
  if (s.family && s.family(event, sig)) return VIS.STANDARD;
  // 5 — Date relevance.
  if (s.date && s.date(event, sig)) return VIS.STANDARD;
  // 6 — Stage floor: nothing to say yet ⇒ Dormant (relocated to the rail, still reachable).
  return VIS.DORMANT;
}

export function isDormant(section, event, signals) {
  return sectionVisibility(section, event, signals) === VIS.DORMANT;
}

// ── Upcoming Rail: the lightweight, reachable home for DORMANT sections. Shows what
// EXISTS without demanding attention — "available later", never a locked/disabled state.
// Empty for planners (they get the full cockpit). Event Day is intentionally excluded —
// Host Home gives it its own prominent surface. ──────────────────────────────────────
// Host-facing copy only (rail is host-only — planners get the full cockpit).
// "Paperwork / Contracts & files" was CRM language a host reads as not-for-me, so
// it's gone; "Vendors" is framed as the people a host actually hires, not a pipeline.
const RAIL = [
  { section: 'vendors',    label: 'Anyone you’re hiring', hint: 'Caterer, photographer, rentals — add them when you have them', route: 'Vendors' },
  { section: 'foodDrinks', label: 'Food & drinks',        hint: 'We’ll help with this once guests are in',                     route: 'Budget' },
];
export function upcomingRail(event, signals) {
  if (isPlanner(event)) return [];
  return RAIL.filter(r => sectionVisibility(r.section, event, signals) === VIS.DORMANT);
}
