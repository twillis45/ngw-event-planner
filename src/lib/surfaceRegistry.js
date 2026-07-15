// ─── THE SURFACE REGISTRY ─────────────────────────────────────────────────────
//
// The attention audit's #1 structural finding, and the one it said buys the most:
//
//     "Every new surface starts life invisible and stays invisible until someone
//      remembers to hand-wire a row. That is not a bug; it is a bug FACTORY."
//
// The roll-up was twelve bespoke index rows, each with its own hand-written `attn` boolean.
// Nothing was automatic. So a surface could hold a real problem and the ranked list would
// never mention it — which is exactly why Risks got a row but never a rank, why the vendor
// conflict engine ran and reached nothing, and why the day-of alert stack could not be seen
// from any other stage.
//
// Measured before this file existed: only 2 of 7 attention producers fed the count. A weather
// risk on an outdoor event could not outrank "Plan the food" — not because it ranked low, but
// because it could not ENTER THE LIST AT ALL.
//
// ── The contract ─────────────────────────────────────────────────────────────
// A surface declares what it can raise. One shape, no exceptions:
//
//     { id, label, domain, raise(event) → [{ severity, title, why, route }] }
//
// The ranked list reads raiseAll(); raiseCounts() is exported for badges when they ship —
// it has no runtime consumer yet (re-audit F7). A surface that declares nothing raises
// nothing — visibly, in one place, instead of silently, in twelve.
//
// severity: 'critical' | 'attention'   (steel/ok are not asks; they do not belong in a list
//                                       of things that need you)
//
// ── The rule this file exists to enforce ─────────────────────────────────────
// Adding a surface here WITHOUT a real raise() is the bug it was written to kill. Every
// raiser below reads an engine that already exists and was already correct in isolation —
// none of them are new intelligence. The failure was never the engines. It was that nothing
// composed them.

import { computeDayAlerts } from './dayAlerts';
import { deriveVendorPromiseConflicts } from './vendorAccountability/conflicts';
import { inferPromisesFromVendor } from './vendorAccountability/derive';
import { openArrivalAsks } from './vendorAsks';
import { playbookRisks, playbookDecisionBoard } from './playbooks';
import { daysUntil, isEventDay, isPastEvent } from './dates';
import { buildSeatingPlan } from './seatingPlan';
import { buildTravelPlan } from './travelPlan';
import { deriveHelperResponsibilities, helperStatusLine } from './helperResponsibility';
import { DAY_BEFORE_WINDOW } from './dayBefore';
import { getVendorCOIState, coiNextAction } from './vendorIntelligence';

const notDismissed = (event, map, id) => {
  const st = (event && event[map] && typeof event[map] === 'object') ? event[map] : {};
  return st[id] !== 'dismissed';
};

export const SURFACES = [
  // ── Risks ──────────────────────────────────────────────────────────────────
  // The engine has always run. It reached exactly ONE passive index row ("What could go
  // wrong · N to know about") and never the ranked list — so a weather risk on an outdoor
  // event could not outrank "Plan the food". Only `high` severity raises: a `medium` risk is
  // worth knowing, not worth interrupting for, and inflating the list is how it gets ignored.
  {
    id: 'risks',
    label: 'What could go wrong',
    domain: 'risks',
    route: { tab: 'Risks' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let items = [];
      try { items = (playbookRisks(event) || {}).items || []; } catch (_e) { return []; }
      return items
        .filter((r) => r && r.id && notDismissed(event, 'riskStatus', r.id))
        .filter((r) => String(r.severity || '').toLowerCase() === 'high')
        // A risk record is { id, trigger, severity, mitigation } — it has no `title` and no
        // `description`, and my first pass guessed at both, so every risk rendered as the
        // generic fallback "A risk needs a plan". The TRIGGER is the risk in the host's own
        // terms ("Crabs sell out, wrong size, or price spikes"); the MITIGATION is what to do
        // about it. Reading the record instead of assuming its shape.
        // 'attention', NOT 'critical' (re-audit + host board, 2026-07-14). An authored
        // playbook risk exists from the moment the event is created — raising it 'critical'
        // made every brand-new outdoor event OPEN with "Have a plan for: rain" as its #1,
        // outranking "add your guest list". A worry is not a chore, and a static contingency
        // is not an emergency. 'critical' is reserved for REACTIVE raises: a payment overdue,
        // a vendor who hasn't shown, a same-hour conflict.
        .map((r) => ({
          severity: 'attention',
          title: `Have a plan for: ${r.trigger}`,
          why: r.mitigation || null,
          route: { tab: 'Risks', riskId: r.id },
        }));
    },
  },

  // ── Vendor conflicts ───────────────────────────────────────────────────────
  // Two vendors promising the same hour, a caterer with no kitchen access. The engine
  // computed these and the only consumer was a collapsible bar inside the vendor sheet — a
  // host who never opened that sheet never learned.
  {
    id: 'vendor-conflicts',
    label: 'Between your vendors',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      if (!vendors.length) return [];
      let conflicts = [];
      try {
        const promises = vendors.flatMap((v) => inferPromisesFromVendor(v, event) || []);
        conflicts = deriveVendorPromiseConflicts(event, promises) || [];
      } catch (_e) { return []; }
      // ROW-LEVEL OR NOT AT ALL (house standing rule). The conflict names the vendor it
      // affects — `affectedVendorId`, not `vendorId`; I read the wrong field first and the
      // ctaDeepLinks suite caught it, which is exactly what that suite is for. A raise we
      // cannot route to a specific row is a raise we do not make: a CTA landing on a tab top
      // is the "pure anxiety" failure this registry exists to end, not to industrialise.
      return conflicts
        .filter((c) => c && c.affectedVendorId)
        .map((c) => ({
          severity: String(c.severity || '').toLowerCase() === 'critical' ? 'critical' : 'attention',
          title: c.title || 'Two vendors need the same thing',
          why: c.explanation || c.recommendedAction || null,
          route: { tab: 'Vendors', vendorId: c.affectedVendorId },
        }));
    },
  },

  // ── Vendor arrival times ───────────────────────────────────────────────────
  // The deadline is authored per category and genuinely varies (catering 3 days, a DJ 7).
  // Only the OVERDUE ones raise — a deadline still in the future is a chip on the card, not
  // an interruption.
  {
    id: 'vendor-arrivals',
    label: 'Arrival times',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let asks = [];
      try { asks = openArrivalAsks(event) || []; } catch (_e) { return []; }
      return asks
        .filter((x) => x.ask && x.ask.overdue)
        .map((x) => ({
          severity: 'attention',
          title: `Get ${x.vendor.name}'s arrival time`,
          why: x.ask.why,
          route: { tab: 'Vendors', vendorId: x.vendor.id },
        }));
    },
  },

  // ── T-72h reconfirm sweep ──────────────────────────────────────────────────
  // HostShellV2 computes `reconfirmables` locally (HostShellV2.jsx ~1505) and renders a
  // banner only — a host who never saw the banner never learned, and the ranked list never
  // counted it. Same predicate as the shell: a NAMED vendor, inside the last three days
  // (days 0..3), who hasn't answered yet (`reconfirmed72` truthy = answered, same truthy
  // read as the shell's own skip at ~1635). Informal helpers (`isInformal`) never raise —
  // a friend bringing the cooler is not put through a paid-vendor reconfirm ask
  // (host-appropriate vendor UI rule); the shell banner applies the same filter (~1508).
  {
    id: 'vendor-reconfirm',
    label: 'The reconfirm window',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let days = null;
      try { days = daysUntil(event && event.date); } catch (_e) { return []; }
      if (days == null || days < 0 || days > 3) return [];
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      // The window, in the host's own time words — same ladder as the shell's banner
      // eyebrow (Today / Tomorrow / N days out).
      const when = days === 0 ? 'your event is today'
        : days === 1 ? 'your event is tomorrow'
        : `the event is ${days} days out`;
      return vendors
        .filter((v) => v && v.id && String(v.name || '').trim() && !v.isInformal && !v.reconfirmed72)
        .map((v) => ({
          severity: 'attention',
          title: `Reconfirm ${v.name} for the day`,
          why: `${when} — a quick reconfirm now beats a no-show`,
          route: { tab: 'Vendors', vendorId: v.id },
        }));
    },
  },

  // ── The day itself ─────────────────────────────────────────────────────────
  // computeDayAlerts knows a vendor hasn't shown, that a guest has an allergy the caterer was
  // never told about, that a payment is due today. It was rendered ONLY inside
  // `stage === 'day'`, so it contributed nothing to any count and was invisible from
  // anywhere else in the app. On the day, it IS the list.
  {
    id: 'day-of',
    label: 'The day',
    domain: 'day',
    route: { tab: 'Event Day Schedule' },
    raise(event) {
      if (!isEventDay(event && event.date)) return [];
      let alerts = [];
      try { alerts = computeDayAlerts(event) || []; } catch (_e) { return []; }
      return alerts.map((a) => ({
        severity: a.tier === 'critical' ? 'critical' : 'attention',
        title: a.headline || 'Something needs you today',
        why: a.move || null,
        // Always the Day stage. The old branch emitted a bare {tab:'Vendors'} with no
        // vendorId — the tab-top landing the house rule forbids. On the day, the Day stage
        // IS where these alerts are actionable.
        route: { tab: 'Event Day Schedule' },
      }));
    },
  },

  // ═══ WAVE-5 COVERAGE (2026-07-15) ════════════════════════════════════════════
  // The re-score's finding: four attention producers still bypassed this ledger —
  // hand-wired `attn` booleans on the shell's quiet-index rows (seating, lodging,
  // flights, rides), the day-before helper confirms, overdue board decisions beyond
  // the ladder's one, and the one-slot ladder tiers where two overdue payments
  // produced at most one card anywhere. Every raiser below READS an engine that
  // already exists; none invents a threshold. Where a raise duplicates a ladder
  // tier's copy, the TITLE is the ladder's verbatim — eventPlan's titleKey dedup
  // collapses the two into one card instead of two phrasings of the same debt.

  // ── Seating ────────────────────────────────────────────────────────────────
  // The shell's quiet-index row (HostShellV2 qidx, key 'seating') computes
  // attn: seating.totals.unassigned > 0, gated on seating.hasRoster &&
  // seating.totals.confirmed > 0 — a hand-wired boolean the ranked list never
  // saw. Same engine (buildSeatingPlan), same predicate, mirrored exactly.
  {
    id: 'seating',
    label: 'Who sits where',
    domain: 'guests',
    route: { tab: 'Seating' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let plan = null;
      try { plan = buildSeatingPlan(event); } catch (_e) { return []; }
      if (!plan || !plan.hasRoster) return [];             // headcount events never get invented names to seat
      if (!(plan.totals && plan.totals.confirmed > 0)) return [];
      if (!(plan.totals.unassigned > 0)) return [];
      // ROW-LEVEL OR NOT AT ALL: routeSheet's 'Seating' branch lands on the exact
      // guest row when the route names one (sheet.focus = guestId). The first
      // unassigned guest IS the row where the work starts. No id → no raise.
      const first = (plan.unassigned || []).find((g) => g && g.id != null);
      if (!first) return [];
      const n = plan.totals.unassigned;
      return [{
        severity: 'attention',
        title: n === 1 ? '1 confirmed guest still needs a seat' : `${n} confirmed guests still need seats`,
        why: `${plan.totals.seated} of ${plan.totals.confirmed} confirmed guests are seated`,
        route: { tab: 'Seating', guestId: first.id },
      }];
    },
  },

  // ── Lodging deadline ───────────────────────────────────────────────────────
  // Shell qidx row key 'lodging': attn only when there is BOTH a real gap
  // (lodging.notBookedCount > 0 — roster mode only; the lib returns null in
  // headcount mode rather than claiming 0) AND a real dated obligation
  // (lodging.deadline, an ISO day the host entered). The lib (travelPlan.js
  // buildTravelPlan) carries no urgency logic beyond these two facts, so the
  // shell predicate and the lib agree — no divergence to note.
  {
    id: 'lodging',
    label: 'Where everyone stays',
    domain: 'travel',
    route: { tab: 'Travel' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let travel = null;
      try { travel = buildTravelPlan(event); } catch (_e) { return []; }
      if (!travel || !travel.relevant) return [];          // destination events only — the engine's own gate
      const lg = travel.lodging || {};
      if (!(lg.notBookedCount != null && lg.notBookedCount > 0 && lg.deadline)) return [];
      const total = (lg.roster || []).length;
      const by = (() => {
        try { return new Date(lg.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
        catch (_e) { return lg.deadline; }
      })();
      return [{
        severity: 'attention',
        title: `${lg.notBookedCount} of ${total} haven’t booked a room yet`,
        why: `Rooms need to be booked by ${by}`,
        // The deadline card is the row this raise is about — routeSheet's lodging
        // branch focuses it ('lodging-deadline' → sheet.focus 'deadline').
        route: { tab: 'Travel', focusField: 'lodging-deadline' },
      }];
    },
  },

  // ── Flight conflicts ───────────────────────────────────────────────────────
  // Shell qidx row key 'air': attn when (travel.air.conflicts || []).length > 0.
  // The conflicts come from the lib itself (travelPlan.js: arrives after the
  // event starts / leaves before it ends — only ever claimed from dates it can
  // actually read). One raise per conflict, each routed to that guest's own
  // arrivals-board row (routeSheet /^air/ + guestId).
  {
    id: 'travel-air',
    label: 'Getting here',
    domain: 'travel',
    route: { tab: 'Travel' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let travel = null;
      try { travel = buildTravelPlan(event); } catch (_e) { return []; }
      if (!travel || !travel.relevant) return [];
      const conflicts = (travel.air && travel.air.conflicts) || [];
      return conflicts
        // Row-level or not at all: a conflict without a guestId has no row to land on.
        .filter((c) => c && c.guestId != null)
        .map((c) => ({
          severity: 'attention',
          title: c.type === 'leaves_early'
            ? `${c.name}’s flight leaves before the event ends`
            : `${c.name} lands after the event starts`,
          why: c.copy || null,
          route: { tab: 'Travel', focusField: 'air-board', guestId: c.guestId },
        }));
    },
  },

  // ── Ride gaps ──────────────────────────────────────────────────────────────
  // Shell qidx row key 'ground': attn when travel.rosterMode && ground.unmatched > 0
  // && ground.transportProvided !== true. `unmatched` is the lib's own count
  // (needRide.length − offeredSeats, floor 0) — the gap the HOST closes by
  // introducing riders to drivers or settling group transport, never an
  // auto-assignment. One aggregate raise: the gap is one number, and its row is
  // the riders block ('ground-riders' → sheet.focus 'riders').
  {
    id: 'travel-ground',
    label: 'Getting around',
    domain: 'travel',
    route: { tab: 'Travel' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let travel = null;
      try { travel = buildTravelPlan(event); } catch (_e) { return []; }
      if (!travel || !travel.relevant) return [];
      const gr = travel.ground || {};
      if (!(travel.rosterMode && gr.unmatched > 0 && gr.transportProvided !== true)) return [];
      const seats = gr.offeredSeats || 0;
      return [{
        severity: 'attention',
        title: gr.unmatched === 1
          ? '1 guest still needs a way around'
          : `${gr.unmatched} guests still need a way around`,
        why: `${(gr.needRide || []).length} need a ride · ${seats} seat${seats === 1 ? '' : 's'} offered — introduce riders to drivers, or settle group transport`,
        route: { tab: 'Travel', focusField: 'ground-riders' },
      }];
    },
  },

  // ── Helper confirms ────────────────────────────────────────────────────────
  // dayBefore.js (sections, key 'helpers') derives these from
  // deriveHelperResponsibilities and asks "Confirm X is still bringing Y" — but
  // only ever rendered them inside the day-before plan, so they never raised
  // (dayBefore.js ~155-171). Same engine, same T-window (DAY_BEFORE_WINDOW,
  // days 0..2 — the plan's own applicability gate), same ask copy. Each raise
  // routes to the responsibility's OWN row route (the lib authors it per item:
  // food line, task row, ROS cue, supplies card, informal-vendor row).
  {
    id: 'helpers',
    label: 'People bringing things',
    domain: 'day',
    route: { tab: 'Planning' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let days = null;
      try { days = daysUntil(event && event.date); } catch (_e) { return []; }
      if (days == null || days < DAY_BEFORE_WINDOW.from || days > DAY_BEFORE_WINDOW.to) return [];
      let resp = [];
      try { resp = (deriveHelperResponsibilities(event) || {}).responsibilities || []; } catch (_e) { return []; }
      return resp
        // 'assigned' is the only asking state — confirmed/handled need nothing.
        // Row-level or not at all: the lib's own per-item route is the row.
        .filter((r) => r && r.status === 'assigned' && r.route && r.route.tab)
        .map((r) => ({
          severity: 'attention',
          title: `Confirm ${r.helperName} is still bringing ${r.label}`,
          why: helperStatusLine(r),
          route: r.route,
        }));
    },
  },

  // ── Overdue board decisions ────────────────────────────────────────────────
  // The ladder's board tier (CommandCenter _selectEventNextActionInner, tier 7.8)
  // surfaces ONE overdue decision — `Resolve "${label}".` — and every overdue
  // decision beyond the first raised nothing anywhere. Same board
  // (playbookDecisionBoard: decisionDueDate windows + the overdue-on-creation
  // reachability guard are the board's own rules, inherited not re-derived),
  // one raise per overdue row. TITLE IS THE LADDER'S VERBATIM so when both
  // produce the same decision, titleKey collapses them to one card.
  // Severity 'attention', not 'critical' — an overdue self-authored decision is
  // a late chore, not an emergency (same doctrine as the risks surface above).
  // Same pre-event gate as the ladder's lifecycle projection (days > 0): on the
  // day, the Day stage IS the list.
  {
    id: 'decisions',
    label: 'Calls to make',
    domain: 'plan',
    route: { tab: 'Decisions' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      let days = null;
      try { days = daysUntil(event && event.date); } catch (_e) { return []; }
      if (days == null || days <= 0) return [];
      let board = null;
      try { board = playbookDecisionBoard(event); } catch (_e) { return []; }
      return ((board && board.open) || [])
        .filter((r) => r && r.id && r.status === 'overdue')
        .map((r) => ({
          severity: 'attention',
          title: `Resolve "${r.label}".`,
          why: r.because || null,
          // The decision's own row: routeSheet's 'Decisions' branch focuses the
          // sheet on decisionId (same addressing the shell uses for a single call).
          route: { tab: 'Decisions', decisionId: r.id },
        }));
    },
  },

  // ── Overdue vendor payments ────────────────────────────────────────────────
  // The ladder's tier 4 reads vendor fields directly (payDueDate && !balancePaid
  // && (cost || 0) > 0, due date past) and returns the SINGLE most overdue —
  // so two overdue payments produced at most one card anywhere. Same predicate,
  // one raise per overdue payment. 'critical' is earned here: reactive, real
  // money owed to a real vendor. TITLE IS THE LADDER'S VERBATIM ("Send payment
  // to X.") so the ladder's copy of the most-overdue one and ours collapse.
  {
    id: 'vendor-payments',
    label: 'Money you owe',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      const out = [];
      for (const v of vendors) {
        if (!v || !v.id) continue;
        if (!(v.payDueDate && !v.balancePaid && (v.cost || 0) > 0)) continue;
        let od = null;
        try { od = daysUntil(v.payDueDate); } catch (_e) { continue; }
        if (od == null || od >= 0) continue;               // future due dates are chips, not interruptions
        const late = Math.abs(od);
        out.push({
          severity: 'critical',
          title: `Send payment to ${v.name || 'this vendor'}.`,
          why: `Balance was due ${late} ${late === 1 ? 'day' : 'days'} ago`,
          // Same row the ladder routes to: the vendor's payment section.
          route: { tab: 'Vendors', vendorId: v.id, vendorSection: 'payment' },
        });
      }
      return out;
    },
  },

  // ── Overdue COI asks ───────────────────────────────────────────────────────
  // The ladder's tier 4.2 surfaces only ONE critical COI, and only criticals.
  // Same classifier (getVendorCOIState — dueInDays is its own "due 30 days out"
  // line, overdue = dueInDays <= 0; 'expired' is critical outright), one raise
  // per vendor whose ask is genuinely overdue. Severity is the classifier's:
  // 'critical' ONLY where the ladder called it critical (coi.level), everything
  // else 'attention'. A future-dated ask never raises — a deadline still ahead
  // is a chip on the card (same rule as vendor-arrivals above). Copy comes from
  // the shared coiNextAction so the ladder, the vendor detail, and this raise
  // can never disagree — and the ladder's card dedups against ours by title.
  {
    id: 'vendor-coi',
    label: 'Proof of insurance',
    domain: 'vendors',
    route: { tab: 'Vendors' },
    raise(event) {
      if (isPastEvent(event && event.date)) return [];
      const vendors = Array.isArray(event && event.vendors) ? event.vendors : [];
      const out = [];
      for (const v of vendors) {
        if (!v || !v.id || !String(v.name || '').trim()) continue;
        let coi = null;
        try { coi = getVendorCOIState(v, event); } catch (_e) { continue; }
        if (!coi || !coi.required || coi.level === 'safe') continue;
        const overdue = coi.dueInDays != null && coi.dueInDays <= 0;
        if (!(coi.level === 'critical' || overdue)) continue;
        let cna = null;
        try { cna = coiNextAction(v, event, v.name); } catch (_e) { cna = null; }
        out.push({
          severity: coi.level === 'critical' ? 'critical' : 'attention',
          // The ladder's exact title source: cna.title, with the ladder's own fallback.
          title: (cna && cna.title) || `Get an updated COI from ${v.name}.`,
          why: (cna && cna.consequence) || null,
          route: { tab: 'Vendors', vendorId: v.id, vendorSection: 'documents' },
        });
      }
      return out;
    },
  },
];

/**
 * Everything every surface is raising, most severe first.
 * @returns {{ surface: string, label: string, domain: string, severity: string,
 *             title: string, why: string|null, route: object }[]}
 */
export function raiseAll(event) {
  if (!event) return [];
  const out = [];
  for (const s of SURFACES) {
    let items = [];
    try { items = s.raise(event) || []; } catch (_e) { items = []; }
    for (const i of items) {
      if (!i || !i.title) continue;
      out.push({
        surface: s.id, label: s.label, domain: s.domain,
        severity: i.severity === 'critical' ? 'critical' : 'attention',
        title: i.title, why: i.why || null,
        route: i.route || s.route,
      });
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
}

/**
 * What each surface is raising, keyed by surface id — for badges.
 * A badge that counts something real, and that clearing the work actually clears.
 */
export function raiseCounts(event) {
  const counts = {};
  for (const r of raiseAll(event)) counts[r.surface] = (counts[r.surface] || 0) + 1;
  return counts;
}
