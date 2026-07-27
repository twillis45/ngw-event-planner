// demo/src/CommandCenter.jsx
// Sprint 48 — Event Command Center · default event landing surface
//
// Source of truth: Figma file CYlmJqDCXEaacCuz9wW3bd
//   Mobile  (J): page 643:2, frame 645:2
//   Desktop (K): page 643:3, frame 655:2
//
// Sections (mobile priority order):
//   1. Event Header  2. Open Decisions  3. Approvals  4. Requests
//   5. Unanswered Questions  6. Next Up  7. Vendors  8. Documents
//   + Sticky Quick Actions (mobile only)
//
// Data adapters are derived from existing event shape (timeline, commClient,
// vendors, guests, budget). No new schemas introduced.
//
// Page L (Command Center Variations) — DOCTRINE DECISION (Sprint 50):
// Figma page 643:4 explored three variants:
//   - VAR A (660:2)   Focus Mode — show only the #1 blocker, sequential.
//   - VAR B (660:41)  Compressed Triage — every item as one scannable row,
//                     mixed types, sorted by urgency.
//   - VAR C (660:119) Conversation-First — decision IS the thread; inline
//                     action choices show their side-effects.
// This production component implements VAR B (Compressed Triage) — grouped
// by section (Decisions / Approvals / Requests / Vendors) but every row
// independently scannable + actionable. VAR A and VAR C are exploration
// artifacts retained in Figma for future iteration; not shipped on purpose.

import { useState, useEffect, useMemo } from 'react';
import { color, space, type, radius, elevation, edge } from './design/tokens';
// Sprint 57f.1: derive compression urgency from the event's own timeline so
// Event Command can surface "Tight timeline — N tasks moved to the front"
// when the planner most needs to see it, with a CTA that routes into the
// existing Timeline tab compressed-priorities filter.
import { deriveEventCompressionSummary } from './lib/workflowCompression';
import { summarizeCrew } from './lib/studioTeam';
// Sprint 57F-A: Positive Attention — the read-only "You're Set On ✓" reader over
// existing readiness (pi.attention flag, host-only, presentation-only).
import { attentionActive, positiveAttention } from './lib/positiveAttention';
// Sprint 57J: Decision Confidence — "do we have enough to lock this?" reader over
// existing resolvers (pi.decisions flag, presentation-only judgment layer).
import { decisionsActive, decisionConfidence } from './lib/decisionConfidence';
// Sprint 60B: Event Identity — a reader over the meaning ALREADY captured at intake
// (pi.identity flag, presentation-only; orients planning, no engine/store/workflow).
import { identityOn, eventIdentity, mustHaveBecause, isMeaningfulMustHave } from './lib/eventIdentity';
// Sprint 57G: Confidence Grammar (Pattern 014) — remaps the Planning Health status
// WORD + COLOR by actual certainty, per persona (pi.confidence flag, presentation-only).
import { confidencePersona, confidenceFor } from './lib/confidenceGrammar';
// A critical COI (expired / overdue) is a hard load-in gate the venue turns
// vendors away for — it must rank in the event's next-action ladder, not only
// in the vendor detail. Surfaced here so the Portfolio triage column + its
// "Waiting on" word (both derived from this engine) agree.
import { getVendorCOIState, coiNextAction } from './lib/vendorIntelligence';
import { topPlaybookTask, topPlaybookDecision, nextUpcomingTask, playbookCapacity, playbookInfraPrompts, playbookFoodPlan, playbookDecisionBoard } from './lib/playbooks';
import { deriveEventPhaseProgress } from './lib/phaseProgress';
import { taskIsOverdue, taskDueInDays, taskLeadDays } from './lib/taskLead';
import { raiseAll, surfaceMeta } from './lib/surfaceRegistry';
// WAVE-6 (2026-07-15): snooze is applied INSIDE eventPlan — nextActions is the
// post-snooze truth and setAside carries what the host set down (one truth, no
// consumer can speak a set-aside item).
import { isSnoozed, snoozedUntil } from './lib/snooze';
import { readinessScore } from './lib/readinessHistory';
import { renderAction, personaFor, audiencePersona } from './lib/nextActionRenderer';
// Sprint UX-4 — Disclosure architecture: ONE resolver decides section visibility; dormant
// sections relocate to the Upcoming Rail (reachable, never hidden). Planner ⇒ never dormant.
import { isDormant, upcomingRail } from './lib/disclosure';
import { labelFor, labelsOn } from './lib/presentationLabels'; // Sprint 57C Phase 2: vocabulary layer (host labels; pi.labels flag, default OFF)
// Sprint 57H: Because Layer — exposes existing reasoning on a Planning Health row
// (pi.because flag, presentation-only; `because` strings are built from real factors).
// Sprint 57K: Value-Level Confidence — Pattern 014 certainty attached to a value
// (pi.valueConfidence flag, presentation-only; classified by provenance).
// Stage C (single-source task convergence): readiness counts engine-satisfied work
// even when the host never ticks a box. effectiveDone = task.done || taskSatisfied.
import { effectiveDone, taskSatisfied } from './lib/taskEngine';
// POP-1/WOW-1: read-only Workstream composition — groups existing vendor data
// by workstream (Venue/Photography/Food/...) instead of eventPlan/Vendors each
// computing their own flat vendor tally. See src/lib/workstreams.js header +
// docs/POP1_PHASE1_DELTA_AND_WORKSTREAM_DESIGN.md.
import { workstreamsFor, workstreamReadinessRollup, buildVendorReadinessRollup, isVendorBooked, isVendorConfirmed } from './lib/workstreams';
import { buildExperienceContext } from './lib/experienceContext';
import { daysUntil } from './lib/dates';

// An approval counts as SENT (ball in the client's court) when it's gone out —
// requestSentAt is the canonical flag but is not always written, so fall back to
// the same outbound/planner signal used elsewhere. Without this, a sent approval
// is misread as an unsent draft and the next action wrongly says "send it" /
// "Waiting on: You" when it's really "nudge the client" / "Waiting on: Client".
const approvalIsSent = (m) => !!m.requestSentAt || m.direction === 'outbound' || m.sender === 'planner' || /sent|delivered/i.test(m.deliveryStatus || '');

// A "request needing a reply" is an INBOUND message (from client/vendor), not one
// the planner sent. Without this guard every outbound planner message counted as a
// request — seed data is 18 outbound / 0 inbound, so every event showed phantom
// "N requests" across the attention queue, portfolio totals, and studio command.
const isInboundMessage = (m) => m.direction === 'inbound' || (!!m.sender && m.sender !== 'planner');
export { approvalIsSent, isInboundMessage };

// ── Studio Matte palette aliases (matches the rest of /plan/) ─────────────────
const P = {
  canvas:        color.surface.canvas,
  base:          color.surface.base,
  card:          color.surface.card,
  elev:          color.surface.elevated,
  borderSubtle:  color.border.subtle,
  borderDef:     color.border.default,
  borderAcc:     color.border.accent,
  textPrimary:   '#eef0f4',
  textSecondary: color.text.secondary,
  textTertiary:  color.text.tertiary,
  green:         color.status.confirmed,
  amber:         color.status.warning,
  red:           color.status.risk,
  // Sprint 60.U.3 10+ — steel-blue accent matches App.js accentTopGrad
  // (#4E6877) so CommandCenter section eyebrows read in the same voice
  // as modal NO GUESSWORK rails.
  steelBlue:     '#4E6877',
};
const FF = type.family;
// Metallic gradient edge + dimensional shadow — mirrors App.js metalEdge + cardShadow
// so CommandCenter cards carry the SAME polish as every other tab/card in the app
// (no flat "tab" surfaces). Spread in place of `background + border` on card surfaces.
const cardEdge = {
  border: '1px solid transparent',
  // Fully tokenized (design/tokens): edge gradient + card elevation + radius — so a
  // CommandCenter card is identical to every other card in the app, no magic values.
  background: `linear-gradient(${P.card},${P.card}) padding-box, linear-gradient(178deg, ${edge.hi} 0%, ${P.borderSubtle} ${edge.mid * 100}%, ${edge.lo} 100%) border-box`,
  boxShadow: elevation.card,
  borderRadius: radius.md,
};

// WAVE-6 (2026-07-15): the local 11-key TitleCase PHASE_OFFSET mirror is DELETED.
// It was the second copy of the lead vocabulary — the copy whose TitleCase keys
// never matched the stored prose labels, the exact drift lib/taskLead.js was built
// to end. Everything that read it now reads the ONE lead reader (taskLeadDays:
// authored leadDays / offsetDays / any week label), and overdue verdicts read the
// ONE policy (taskIsOverdue). workflowCompression's phaseOffset param was already
// only a legacy fallback behind taskLeadDays — callers here simply stop passing it.

// ── Utils ─────────────────────────────────────────────────────────────────────
function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
// One reader: daysUntil() in lib/dates.js. This was a private copy — correct, but a
// private copy is how vendorIntelligence's copy drifted into announcing "Event Day" the
// day before. Correct-and-duplicated is one edit away from wrong-and-duplicated.
const daysFrom = (dateStr) => daysUntil(dateStr);
function fmtRelative(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 0) return 'Scheduled';
  const h = Math.floor(diff / 3600000);
  if (h < 1)   return 'Just now';
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d}d ago`;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
// WAVE-6 (2026-07-15): the local isTaskOverdue wrapper — and its risk_lost gating —
// is DELETED. It was a SECOND overdue policy: with a type and a future date it
// answered "compression rush verdict", otherwise "past window", so the same task
// could be overdue to one caller and fine to another. lib/taskLead.js taskIsOverdue
// is the ONE policy (past its window + still open + was ever reachable — the
// reachability guard covers the tight-booking case the risk_lost gate existed for,
// off event.createdAt instead of a rush ratio). Call sites pass the real event so
// reachability can actually bind.
function overdueDays(task, eventDate) {
  if (!eventDate) return 0;
  const due = taskDueInDays(task, { date: eventDate });
  return due == null || due >= 0 ? 0 : Math.abs(due);
}

// ── taskTiming — THE one source for a task's real-date-derived timing ─────────
// Given the event's actual `event.date` + a task (its `offsetDays`, days-before-event,
// or any lead vocabulary taskLeadDays reads), return the canonical timing DERIVED FROM
// THE REAL DATE — never the static "2 Weeks Out" phase string (which is event-relative
// and lies once the real countdown is near/past). WAVE-6: the lead comes from the ONE
// reader (lib/taskLead taskLeadDays — authored leadDays, T-Nd strings, week labels in
// any casing), so this can never again disagree with the overdue policy about when a
// task is due. The stored-schema `offsetDays` (positive days-before-event) keeps its
// first-read precedence.
//   { dueDate:Date|null, daysUntil:number|null, overdue:bool, label:string, badge, num }
// label examples: "Overdue 3d" / "Due today" / "Due in 5d" / "Next week" / "Due Jul 9".
// The days-before-event a task claims, on the stored schema first, then the one
// lead reader. Shared by taskTiming and the Next-Up window below.
function _taskDaysBefore(task) {
  if (!task) return null;
  if (typeof task.offsetDays === 'number') return Math.abs(task.offsetDays);
  const lead = taskLeadDays(task);
  return lead == null ? null : -lead;
}
export function taskTiming(task, eventDate) {
  if (!task || !eventDate) return { dueDate: null, daysUntil: null, overdue: false, label: '', badge: '', num: '' };
  const daysBefore = _taskDaysBefore(task);
  if (daysBefore == null) return { dueDate: null, daysUntil: null, overdue: false, label: '', badge: '', num: '' };
  const due = new Date(eventDate + 'T00:00:00');
  due.setDate(due.getDate() - daysBefore);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((due - today) / 86400000);
  const overdue = daysUntil < 0;
  let label, badge, num;
  if (daysUntil < 0)       { label = `Overdue ${Math.abs(daysUntil)}d`; badge = 'OVD';  num = `${Math.abs(daysUntil)}d`; }
  else if (daysUntil === 0){ label = 'Due today';            badge = 'NOW';  num = '0d'; }
  else if (daysUntil === 1){ label = 'Due tomorrow';         badge = 'SOON'; num = '1d'; }
  else if (daysUntil <= 7) { label = `Due in ${daysUntil}d`; badge = 'SOON'; num = `${daysUntil}d`; }
  else if (daysUntil <= 14){ label = 'Next week';            badge = 'SOON'; num = `${daysUntil}d`; }
  else                     { label = `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`; badge = 'WK'; num = `${daysUntil}d`; }
  return { dueDate: due, daysUntil, overdue, label, badge, num };
}

// ── Data adapter — derives all Command Center sections from one event ────────
// foodPP (optional) — the caller's useFoodPriceFactor result ({ priceFactor, ... }),
// threaded in so the host budget-health row folds food spend at the SAME regional
// factor the Spending Plan bills at (money-drift fix). Omitted (eventPlan /
// selectEventNextAction / HostShellV2 paths) it defaults to national factor 1 —
// exactly the prior behavior, so pure-engine callers are byte-identical.
export function deriveCommandCenterData(event, foodPP = null) {
  const timeline = event.timeline || [];
  const comms    = event.commClient || [];
  const vendors  = event.vendors || [];
  const guests   = event.guests || [];
  const budget   = event.budget || [];

  // Open Decisions = overdue uncompleted tasks — WAVE-6: the ONE overdue policy
  // (lib/taskLead), handed the real event so the reachability guard can bind.
  // "Uncompleted" reads the SAME done-truth every what's-left surface uses
  // (effectiveDone — ticked OR proven handled by real event state); raw !t.done
  // kept raising work the event's own facts had already closed (2026-07-22,
  // completes the dayAlerts.js alignment).
  const decisions = timeline
    .filter(t => !effectiveDone(event, t) && taskIsOverdue(t, event))
    .map(t => {
      const od = overdueDays(t, event.date);
      const timing = taskTiming(t, event.date); // real-date-derived, single source
      return {
        id: t.id, title: t.task || 'Untitled task',
        owner: t.owner || 'You',
        // phase/impact now read the REAL countdown, not the static "2 Weeks Out" phase.
        phase: timing.label || t.week,
        // Sprint 49: Figma H vocabulary (PENDING/URGENT/AWAITING/OPEN/APPROVED/REJECTED)
        statusLabel: od > 14 ? 'OVERDUE' : 'DUE', // critical≠urgent: these are TIME states (how overdue), not severity jargon.
        statusColor: od > 14 ? P.red : P.amber,
        dueLabel: timing.label || (od > 0 ? `Overdue ${od}d` : 'Today'),
        dueColor: P.red,
        impact: `${timing.label || t.week} · ${t.owner || 'You'} owns`,
        // THE RANKING FIX. `od` was computed on the line above and then THROWN AWAY — the
        // object carried no overdue/urgency field at all. So the selector below
        // (_selectEventNextActionInner) which does
        //     decisions.find(x => x.urgency === 'URGENT')
        //  || decisions.find(x => x.overdue && x.overdueDays >= 14)
        //  || decisions[0]
        // could never match either find(), and ALWAYS fell to decisions[0]. Its consequence
        // copy then read `urgent.overdueDays || 0` → always 0, so the host was never told how
        // late anything was. Attaching them makes the tier actually rank.
        overdue: od > 0,
        overdueDays: od,
        urgency: od > 14 ? 'URGENT' : 'DUE',
        // RE-AUDIT F7 (2026-07-14): carry the source task's lead through the projection.
        // The snooze cap (lib/snooze.js) reads opts.leadDays off the action; the ladder's
        // overdue-decision tier reads it off THIS object via taskLeadDays(urgent) — which
        // checks Number(x.leadDays) first. Without this line the projection was lossy and
        // the cap never received a real number (dead cap, re-audit finding).
        leadDays: taskLeadDays(t),
      };
    })
    // Was `parseInt(b.dueLabel) - parseInt(a.dueLabel)` — and dueLabel is PROSE
    // ("Overdue 3d", "Due today", "Next week"). parseInt() of every one of those is NaN,
    // every comparison returned NaN, and the array simply kept its original event.timeline
    // insertion order. The "#1 most urgent decision" was whichever seeded task happened to
    // sit earliest in the array: a task 60 days overdue lost to one 1 day overdue if the
    // seed listed it later. Sort by the real number.
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .slice(0, 6);

  // Open Approvals
  const approvals = comms
    .filter(m => m.message_type === 'approval_request')
    .filter(m => !['approved', 'rejected'].includes(m.approval_status))
    .map(m => {
      const sent = approvalIsSent(m);
      return {
        id: m.id,
        title: m.subject || (m.body || '').slice(0, 80) || 'Approval request',
        sub: sent ? `Sent · ${m.channel || 'client'}` : 'Draft saved',
        ago: fmtRelative(m.createdAt || m.requestSentAt || m.date),
        // The next-action engine reads a.sent / a.sentRelative to choose between
        // "Send the drafted approval request" (You) and "Nudge the client" (Client).
        // These MUST be on the returned object — a local-only `sent` left the engine
        // seeing undefined and always picking the draft branch (the "Client" branch
        // was dead code, and this panel's AWAITING badge contradicted the engine).
        sent,
        sentRelative: sent ? fmtRelative(m.requestSentAt || m.createdAt || m.date) : null,
        // Sprint 49: Figma H vocabulary — draft = PENDING, sent = AWAITING
        statusLabel: sent ? 'AWAITING' : 'PENDING',
        statusColor: sent ? P.amber : P.textSecondary,
      };
    })
    .slice(0, 6);

  // Requests = inbound, non-approval messages
  const requests = comms
    .filter(m => m.message_type !== 'approval_request')
    .filter(isInboundMessage)
    .filter(m => (m.body || m.text))
    .filter(m => !m.handled && !m.answered)
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 5)
    .map(m => ({
      id: m.id,
      source: m.senderName || (m.channel === 'vendor' ? 'Vendor' : m.channel === 'client' ? 'Client' : 'Team'),
      sourceColor: m.channel === 'vendor' ? P.amber : m.channel === 'client' ? P.green : P.borderAcc,
      title: (m.body || m.text || '').slice(0, 100),
      when: fmtRelative(m.createdAt || m.date),
      unread: !m.read,
      linksTo: null,
    }));

  // Board (honesty): "Unanswered Questions" was just requests.slice() re-labeled —
  // it duplicated the Requests sub-group AND double-counted the "Needs You" badge.
  // Removed. A real unanswered-thread signal can use getUnansweredMessages() later.
  const questions = [];

  // Next Up — upcoming tasks within the current countdown bucket and the next-nearer
  // one. WAVE-6: the TitleCase phase index is gone — a task's own lead (_taskDaysBefore:
  // stored offsetDays, authored leadDays, any week label in any casing) maps into the
  // SAME numeric buckets the old phase ladder used, so stored-schema tasks the TitleCase
  // mirror could never read now qualify instead of silently vanishing from Next Up.
  const NEXTUP_BOUNDS = [7, 14, 30, 61, 91, 121, 152, 182, 243, 304, 365];
  const bucketOf = (daysBefore) => {
    const idx = NEXTUP_BOUNDS.findIndex((b) => daysBefore <= b);
    return idx === -1 ? NEXTUP_BOUNDS.length - 1 : idx;
  };
  const d = daysFrom(event.date);
  // No date → only nearest-window tasks (the legacy default of "last phase").
  const evBucket = (d !== null && d >= 0) ? bucketOf(d) : 0;
  // Next Up — upcoming, NOT-yet-handled tasks. effectiveDone (taskEngine) is the single
  // satisfaction predicate: a task drops the moment real event state proves it handled
  // (a count is locked, the budget is set…) — so "Set date, headcount, menu" never shows
  // once the date is set. effectiveDone = task.done || taskSatisfied(event, task), the
  // same reader every "what's left" surface uses, so the Next-Up can't disagree.
  // Timing is DERIVED FROM THE REAL DATE via taskTiming — no static "2 Weeks Out" phase.
  const nextUp = timeline
    .filter(t => !effectiveDone(event, t))
    .filter(t => {
      const daysBefore = _taskDaysBefore(t);
      if (daysBefore == null) return false;   // undatable — same drop as the old unknown-week
      const b = bucketOf(daysBefore);
      return b === evBucket || b === evBucket - 1;   // current bucket + the next-nearer one
    })
    .slice(0, 4)
    .map(t => {
      const timing = taskTiming(t, event.date);
      return {
        id: t.id,
        label: t.task || 'Untitled task',
        // owner stays; the static phase becomes the real-date-derived timing label.
        sub: `${timing.label || t.week} · ${t.owner || 'You'}`,
        // WAVE-5 RANKING (2026-07-15): carry the source task's authored lead
        // through the projection (same non-lossy rule as `decisions` above) so
        // the ladder's milestone tier can hand it to the snooze cap.
        leadDays: taskLeadDays(t),
        color: timing.overdue ? P.red : P.amber,
        dateLabel: timing.badge || (taskIsOverdue(t, event) ? 'OVD' : 'SOON'),
        dateNum: timing.num || (t.week === 'Week Of' ? '7d' : t.week === '2 Weeks Out' ? '14d' : (t.week || '').replace(/[^0-9]/g, '') + 'm'),
      };
    });

  // Vendor rows — Sprint 49: badges use Figma page F vocabulary
  //   CONFIRMED · PARTIAL · PENDING · UNCONFIRMED · NOT STARTED
  // and map from the app's underlying STAGES (Considering / Quoted /
  // Contracted / Deposit Paid / Confirmed) so visual model stays Figma-true
  // while data model stays unchanged. Payment-overdue still flags AT RISK
  // (Figma page B treats overdue payments as a top-priority risk).
  const figmaBadge = (v) => {
    if (v.status === 'Confirmed' || v.status === 'Booked')                       return { label: 'CONFIRMED',    color: P.green };
    if (v.status === 'Deposit Paid' || v.status === 'Contracted' || v.status === 'Partial') return { label: 'PARTIAL',     color: P.amber };
    if (v.status === 'Quoted' || v.status === 'Pending')                          return { label: 'PENDING',     color: P.amber };
    if (v.status === 'Considering' || v.status === 'Not Started' || !v.status)    return { label: 'NOT STARTED', color: P.textTertiary };
    if (v.status === 'Unconfirmed' || v.status === 'Needs Action' || v.flagged)   return { label: 'UNCONFIRMED', color: P.amber }; // Red audit: unconfirmed is pending (amber), not blocking (red).
    return { label: 'NOT STARTED', color: P.textTertiary };
  };
  // Sprint 51 Path B (Overview retire): caterer drift detection migrated from
  // the retired Overview tab. When the catering vendor is committed and the
  // planner's last-confirmed catererCount no longer matches yesGuests, surface
  // it on the catering vendor's row in Command Center as a HEADCOUNT MISMATCH
  // signal. Doesn't duplicate the Vendors workspace — it routes there.
  const yesGuestsCount = guests.filter(g => g.rsvp === 'Yes').length;
  const cateringVendor = vendors.find(v =>
    v.category === 'Catering' &&
    ['Confirmed','Booked','Deposit Paid','Contracted','Partial'].includes(v.status)
  );
  const catererDrift = !!cateringVendor
    && event.catererCount !== undefined
    && event.catererCount !== null
    && event.catererCount !== yesGuestsCount;
  const cateringDriftDelta = catererDrift ? (yesGuestsCount - (event.catererCount || 0)) : 0;

  const vendorRows = vendors.slice(0, 6).map(v => {
    const overduePayment = v.payDueDate && daysFrom(v.payDueDate) < 0 && !v.balancePaid;
    const base = figmaBadge(v);
    // Payment-overdue overrides to AT RISK (red) when relevant
    const badge = overduePayment && base.label !== 'CONFIRMED'
      ? { label: 'AT RISK', color: P.red }
      : base;
    // Caterer drift overrides the catering vendor's status to ATTENTION so
    // the planner sees "this booked vendor needs an update" without losing
    // the underlying confirmation state.
    const driftOverride = catererDrift && cateringVendor && v.id === cateringVendor.id
      ? { label: 'HEADCOUNT MISMATCH', color: P.amber }
      : null;
    return {
      id: v.id, category: v.category || 'Vendor', name: v.name || '—',
      statusLabel: (driftOverride || badge).label,
      statusColor: (driftOverride || badge).color,
      driftNote: driftOverride
        ? `Caterer holds ${event.catererCount}; ${yesGuestsCount} confirmed (${cateringDriftDelta > 0 ? '+' : ''}${cateringDriftDelta})`
        : null,
    };
  });

  // POP-1A: vendor issue count comes from the CANONICAL rollup
  // (workstream needsAttention), not a second "not Confirmed/Booked" filter
  // that could disagree with the orchestrator. Caterer drift stays additive —
  // it's a headcount contradiction the workstream model doesn't carry.
  const _vendorRollup = buildVendorReadinessRollup(event, null, vendors);
  const vendorIssuesCount = (_vendorRollup.counts.needsAttention || 0)
    + (catererDrift ? 1 : 0);

  // Planning Health (operational readiness, not financial)
  const tasksDone   = timeline.filter(t => t.done).length;
  const tasksTotal  = timeline.length;
  const overdueCount = timeline.filter(t => !effectiveDone(event, t) && taskIsOverdue(t, event)).length; // same open-set as `decisions` above
  const yesGuests = guests.filter(g => g.rsvp === 'Yes').length;
  const totalBudgeted = budget.reduce((s, r) => s + (r.budgeted || 0), 0);
  const totalActual   = budget.reduce((s, r) => s + (r.actual   || 0), 0);
  // Owner bug: the Budget row ignored food-plan spend, so it disagreed with the
  // Spending Plan. For a HOST, track the Spending Plan reality — category actuals +
  // food bought so far, against the host's total budget (or the food+categories
  // estimate). Planner budget stays category-only (food plan null/0 → unchanged).
  const _isHostBudget = audiencePersona(event) === 'host';
  // A self-host has no vendor roster or contract paperwork — "No vendors yet / No
  // documents" reads as a gap at something that doesn't apply (planner-cockpit leakage).
  // Mirror the host nav's reveal-when-data rule: show those readiness rows ONLY once the
  // host has actually added a vendor / document. Planner always sees them.
  const _isHost = _isHostBudget;
  const _hasVendors = vendors.length > 0;
  const _hasDocs = Array.isArray(event.documents) && event.documents.length > 0;
  let _foodSpent = 0;
  if (_isHostBudget) { try { const _fp = playbookFoodPlan(event, foodPP || undefined); if (_fp) { _foodSpent = _fp.spentHigh || 0; } } catch (e) { /* non-fatal */ } }
  const billedActual = totalActual + _foodSpent;
  // Audit fix: the "$X of $Y budget" denominator must be the host's REAL budget — the
  // total they set, else their entered category budgets — NEVER the floating food
  // ESTIMATE (foodHigh). Folding the estimate in made the SAME header read "$1,215" then
  // "$1,415" across renders and disagree with the Spending Plan. No real budget set ⇒
  // billedBudget is 0 and we show spend only, never an invented denominator.
  const billedBudget = (Number(event.totalBudget) > 0) ? Number(event.totalBudget) : totalBudgeted;
  const hasRealBudget = billedBudget > 0;
  const budgetPct = billedBudget > 0 ? billedActual / billedBudget : 0;

  const stat = (label, status, note) => ({
    label, statusLabel: status,
    color: status === 'ON TRACK' ? P.green : status === 'ATTENTION' ? P.amber : P.red,
    note,
  });

  const health = [
    stat('Timeline',
      tasksTotal === 0 ? 'AT RISK'
        : overdueCount > 2 ? 'AT RISK'
        : overdueCount > 0 ? 'ATTENTION'
        : (tasksDone / tasksTotal) >= 0.5 ? 'ON TRACK' : 'ATTENTION',
      tasksTotal > 0 ? `${Math.round(tasksDone/tasksTotal*100)}% complete · ${overdueCount} overdue` : 'No tasks yet'),
    (!_isHost || _hasVendors) ? stat('Vendors',
      // POP-1A: status + line from the canonical rollup, not local thresholds.
      // rollup.status is not_started/needs_attention/in_progress/to_confirm/ready.
      // SSOT #1 ROOT FIX: 'ready' now means fully CONFIRMED, so only that earns the
      // green ON TRACK (and with it the collapse into the hidden "✓ N on track"
      // drawer). 'to_confirm' — all booked, confirms still open — falls through to
      // ATTENTION, so the row stays VISIBLE and green never coexists with an open
      // confirm. Previously 'ready' fired on merely-booked and this row went green
      // AND got hidden, taking its own disclosure with it.
      _vendorRollup.status === 'not_started' ? 'AT RISK'
        : _vendorRollup.status === 'ready' ? 'ON TRACK'
        : _vendorRollup.status === 'needs_attention' ? ((_vendorRollup.counts.needsAttention || 0) >= 3 ? 'AT RISK' : 'ATTENTION')
        : 'ATTENTION',
      // Counts come straight from the canonical rollup — including the confirm
      // residual. This used to re-derive `confirmed` locally; re-derivation with a
      // drifting vocabulary is precisely what produced this bug class, so the
      // rollup now carries it and every consumer reads the same numbers.
      _vendorRollup.counts.total === 0 ? 'No vendors yet'
        : (_vendorRollup.counts.toConfirm > 0
            ? `${_vendorRollup.counts.ready} of ${_vendorRollup.counts.total} booked · ${_vendorRollup.counts.toConfirm} to confirm`
            : `${_vendorRollup.counts.confirmed} of ${_vendorRollup.counts.total} confirmed`)) : null,
    stat('Guests',
      guests.length === 0 ? 'AT RISK'
        : yesGuests / guests.length >= 0.7 ? 'ON TRACK'
        : 'ATTENTION',
      guests.length > 0 ? `${yesGuests} confirmed of ${guests.length} invited`
        // REMAINING-1A: the host CHOSE this count — lead with the meaning
        // ("planning for"), never the estimate label (host-friendly copy rule).
        : event.guestEstimate ? `Planning for ${event.guestEstimate} · no replies yet` : 'No guests yet'),
    stat('Budget',
      billedBudget === 0 ? 'AT RISK'
        : budgetPct >= 0.9 ? 'AT RISK'
        : budgetPct >= 0.7 ? 'ATTENTION'
        : 'ON TRACK',
      billedBudget > 0 ? `${fmtMoney(billedActual)} of ${fmtMoney(billedBudget)} · ${Math.round(budgetPct*100)}%` : 'No budget set'),
    // Sprint 49: real documents readiness (was previously placeholder).
    // Host with no documents → suppressed (reveal-when-data; a home host has no contracts).
    (() => {
      if (_isHost && !_hasDocs) return null;
      const dr = getDocumentsReadiness(event);
      return stat('Documents', dr.status === 'ON_TRACK' ? 'ON TRACK' : dr.status === 'AT_RISK' ? 'AT RISK' : 'ATTENTION', dr.note);
    })(),
    // Sprint 55H-B3A: capacity REQUIREMENTS (Pattern 009) — what the host LIKELY
    // needs, scaled from the playbook's rentalsGap by guest count. NEVER a deficit
    // (no inventory exists). Display-only here in Planning Health — it does NOT
    // enter getEventReadiness, so it never escalates the next-action ladder/spine.
    // Neutral steel ('ESTIMATE'), not a green/amber/red status. Playbook events only.
    // Board ruling: the FULL seating/supplies detail now lives in Plan. The Overview
    // keeps ONE collapsed echo line (count + link), no computed detail, no "because".
    (() => {
      const cap = playbookCapacity(event);
      if (!cap) return null;
      const cc = event.capacityChecked || {};
      const done = cap.items.filter((it) => cc[it.short]).length;
      const allDone = done === cap.items.length;
      return {
        label: 'Capacity', statusLabel: allDone ? 'ALL SET' : 'IN PLAN', color: P.textSecondary,
        note: allDone ? `Seating & supplies for ${cap.guests} — all set` : `Seating & supplies for ${cap.guests} guests`,
      };
    })(),
    // Sprint 55L: the Infrastructure-check prompts ("Reality Check") — the
    // operational-reality items a first-time host should CONFIRM before event
    // day, derived only from the playbook's authored risks/contingencies/type.
    // Same Pattern 010 treatment as Capacity: display-only here, NOT in
    // getEventReadiness, so it informs without escalating. Neutral steel
    // ('REVIEW'), never a deficit, never an adequacy claim. Playbook events only.
    // Board ruling (unanimous): the day-of safety walkthrough now lives at the top of
    // The Day. The Overview keeps ONE live echo — "not yet confirmed" carries amber
    // (the only off-track item allowed color), green once cleared — linking to The Day.
    (() => {
      const infra = playbookInfraPrompts(event);
      if (!infra) return null;
      const sc = event.safetyChecked || {};
      const done = infra.prompts.filter((p) => sc[p.key]).length;
      const all = infra.prompts.length;
      const allDone = done >= all;
      return {
        label: 'Reality Check', statusLabel: allDone ? 'CONFIRMED' : 'CONFIRM', color: allDone ? P.green : P.amber,
        note: allDone ? 'Day-of safety — all confirmed' : (done > 0 ? `Day-of safety — ${done} of ${all} confirmed` : 'Day-of safety — not yet confirmed'),
      };
    })(),
  ].filter(Boolean);

  // Status headline
  const headlineParts = [];
  if (decisions.length > 0)        headlineParts.push(`${decisions.length} decision${decisions.length === 1 ? '' : 's'} pending`);
  if (vendorIssuesCount > 0)       headlineParts.push(`${vendorIssuesCount} vendor${vendorIssuesCount === 1 ? '' : 's'} need${vendorIssuesCount === 1 ? 's' : ''} you`);
  if (catererDrift)                headlineParts.push(`caterer headcount drift`);
  if (questions.length > 0)        headlineParts.push(`${questions.length} unanswered question${questions.length === 1 ? '' : 's'}`);
  const totalNeeds = decisions.length + approvals.length + requests.length + vendorIssuesCount;
  const headline = totalNeeds === 0 ? 'All quiet — nothing urgent' : headlineParts.join(' · ');
  const headlineColor = totalNeeds === 0 ? P.green : P.amber;

  // Meta line (sub-header). Board trust-fix: bind the displayed count to the SAME
  // resolution the food/seating engine uses (guestCount → estimate → list length),
  // so the header can never say "18 guests" while Seating computes for 30.
  const resolvedGuests = Number(event.guestCount) || Number(event.guestEstimate) || guests.length || 0;
  const metaParts = [
    event.venue,
    resolvedGuests > 0 ? `${resolvedGuests} guests` : null,
    hasRealBudget ? `${fmtMoney(billedActual)} of ${fmtMoney(billedBudget)} budget`
      : (billedActual > 0 ? `${fmtMoney(billedActual)} spent` : null),
  ].filter(Boolean);

  // Days from
  const days = daysFrom(event.date);

  return {
    decisions, approvals, requests, questions, nextUp, vendorRows, vendorIssuesCount,
    health, headline, headlineColor, totalNeeds,
    metaParts, days,
    // Host-leakage gates: a self-host with no vendor/document data shouldn't see
    // vendor/paperwork sections at all (reveal-when-data, like the host nav).
    isHost: _isHost, hasVendors: _hasVendors, hasDocs: _hasDocs,
    // Sprint 51 Path B: caterer drift surfacing data
    catererDrift, cateringVendor, cateringDriftDelta, yesGuestsCount,
  };
}

// ── Sprint 49: Documents — schema + helpers ──────────────────────────────────
// kind:   'contract' | 'floor_plan' | 'mood_board' | 'seating_chart' | 'menu' | 'final_packet'
// status: 'not_started' | 'draft' | 'pending' | 'approved' | 'signed' | 'sent'
const DOC_KIND_LABELS = {
  contract:      'Contracts',
  floor_plan:    'Floor Plan',
  mood_board:    'Mood Board',
  seating_chart: 'Seating',
  menu:          'Menus',
  final_packet:  'Final Pkt',
};
const DOC_KIND_ORDER = ['contract', 'floor_plan', 'mood_board', 'seating_chart', 'menu', 'final_packet'];

// Per-kind status summary for DocPill display. Returns:
//   { label, status, statusColor, note } — one card's worth of info.
export function getDocStatusForKind(event, kind) {
  const docs = (event.documents || []).filter(d => d.kind === kind);
  const label = DOC_KIND_LABELS[kind] || kind;
  if (docs.length === 0) return { label, status: 'none', note: '—', color: P.textTertiary };

  // Pick "worst" status as the leading signal — at-risk first, then progress.
  const has = (s) => docs.some(d => d.status === s);
  const count = (s) => docs.filter(d => d.status === s).length;
  const newest = docs.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];

  // Contracts — special handling (count signed vs total)
  if (kind === 'contract') {
    const signed = count('signed');
    if (signed === docs.length) return { label, status: 'good', note: `${signed} signed`, color: P.green };
    return { label, status: 'attention', note: `${signed} of ${docs.length}`, color: P.amber };
  }

  if (has('approved') || has('signed')) {
    return { label, status: 'good', note: 'approved', color: P.green };
  }
  if (has('pending')) {
    return { label, status: 'attention', note: 'pending review', color: P.amber };
  }
  if (has('draft')) {
    return { label, status: 'attention', note: 'draft' + (newest ? ` · ${fmtRelative(newest.updatedAt)}` : ''), color: P.amber };
  }
  if (has('sent')) {
    return { label, status: 'attention', note: 'sent · awaiting', color: P.amber };
  }
  return { label, status: 'none', note: 'not started', color: P.textTertiary };
}

// All 6 DocPills with their status — drives the Command Center documents grid
export function getEventDocCards(event) {
  return DOC_KIND_ORDER.map(k => getDocStatusForKind(event, k));
}

// Documents readiness for the Planning Health rail and Events Index 4-axis.
// Returns the same shape as the other axes in getEventReadiness: { status, label, note }.
export function getDocumentsReadiness(event) {
  const docs = event.documents || [];
  const REQUIRED = ['contract']; // baseline doc every event needs
  if (docs.length === 0) {
    return { status: 'AT_RISK', label: 'At risk', note: 'No documents' };
  }
  const missingRequired = REQUIRED.filter(k => !docs.some(d => d.kind === k && (d.status === 'signed' || d.status === 'approved')));
  if (missingRequired.length > 0) {
    return { status: 'AT_RISK', label: 'At risk', note: 'Contract not signed' };
  }
  const draftCount   = docs.filter(d => d.status === 'draft').length;
  const pendingCount = docs.filter(d => d.status === 'pending').length;
  const approvedCount = docs.filter(d => d.status === 'approved' || d.status === 'signed').length;
  if (draftCount === 0 && pendingCount === 0) {
    return { status: 'ON_TRACK', label: 'On track', note: `${approvedCount} approved` };
  }
  if (draftCount + pendingCount >= 3) {
    return { status: 'AT_RISK', label: 'At risk', note: `${draftCount + pendingCount} pending` };
  }
  return { status: 'ATTENTION', label: 'Attention', note: `${approvedCount} approved · ${draftCount + pendingCount} pending` };
}

// ── Waiting-for-reply tracker ─────────────────────────────────────────────────
// Finds outbound messages sent >48h ago with no subsequent activity.
// Returns array of { eventId, eventName, thread, sentAt, hoursAgo, body }
export function getUnansweredMessages(events = [], thresholdHours = 48) {
  const now = Date.now();
  const results = [];
  for (const ev of events) {
    const comms = ev.commClient || [];
    // Group by thread (vendor name or 'client')
    const byThread = {};
    comms.forEach(m => {
      const key = m.channel === 'vendor' ? (m.vendor_name || 'vendor') : 'client';
      if (!byThread[key]) byThread[key] = [];
      byThread[key].push(m);
    });
    for (const [thread, msgs] of Object.entries(byThread)) {
      // Sort chronologically
      const sorted = [...msgs].sort((a, b) =>
        new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0)
      );
      // Find last outbound message
      const lastOut = [...sorted].reverse().find(m =>
        m.direction === 'outbound' || m.sender === 'planner'
      );
      if (!lastOut) continue;
      const sentAt = new Date(lastOut.createdAt || lastOut.date || 0);
      const hoursAgo = (now - sentAt.getTime()) / 3600000;
      if (hoursAgo < thresholdHours) continue;
      // Check if there's any activity AFTER the last outbound message
      const hasSubsequentActivity = sorted.some(m => {
        const t = new Date(m.createdAt || m.date || 0);
        return t > sentAt && (m.direction !== 'outbound' && m.sender !== 'planner');
      });
      if (hasSubsequentActivity) continue;
      results.push({
        eventId:   ev.id,
        eventName: ev.name || 'Untitled event',
        thread,
        sentAt:    sentAt.toISOString(),
        hoursAgo:  Math.round(hoursAgo),
        body:      (lastOut.body || lastOut.text || '').slice(0, 80),
      });
    }
  }
  return results.sort((a, b) => b.hoursAgo - a.hoursAgo);
}

// ── Lightweight per-event attention summary — used by Home + Events Index ────
// Returns only the counts each surface needs to know without paying the cost
// of the full Command Center derivation.
// POP-1/WOW-1: vendorIssues now derives from workstreamReadinessRollup (which
// itself groups event.vendors via workstreamsFor, src/lib/workstreams.js) —
// the SAME "Booked" vocabulary as hostStatusWord() in VendorPlanningWorkspace.jsx,
// single-sourced through one function instead of three independently-written
// status-set filters. See docs/POP1_PHASE1_FOUNDATION_AUDIT.md §6 for the
// contradiction this replaced (a 'Deposit Paid' vendor double-counted as an
// issue even though the Vendors tab already showed it as booked).
export function getEventAttention(event) {
  const timeline = event.timeline || [];
  const comms    = event.commClient || [];
  return {
    decisions: timeline.filter(t => !t.done && taskIsOverdue(t, event)).length,
    approvals: comms.filter(m => m.message_type === 'approval_request' && !['approved', 'rejected'].includes(m.approval_status)).length,
    // Split: an approval still on the planner to SEND is not "awaiting client".
    approvalsAwaiting: comms.filter(m => m.message_type === 'approval_request' && !['approved', 'rejected'].includes(m.approval_status) && approvalIsSent(m)).length,
    requests:  comms.filter(m => m.message_type !== 'approval_request' && isInboundMessage(m) && (m.body || m.text) && !m.handled && !m.answered).length,
    vendorIssues: workstreamReadinessRollup(event, null, event.vendors).needsAttention,
  };
}

// POP-1 Phase 1 (approved slice): kept as a thin, backward-compatible alias —
// delegates to workstreamReadinessRollup so there is exactly one status-set
// definition (in src/lib/workstreams.js), not a second copy here. This is the
// one number every surface (HostHome via eventPlan, and the Vendors tab's
// top-line count) should read, instead of each independently re-filtering
// event.vendors.
export function vendorReadinessRollup(event) {
  return workstreamReadinessRollup(event, null, event && event.vendors);
}

// Cross-event item stream — what Figma page I calls "What needs attention".
// Returns a flat, sorted list of actionable items across all events. Each
// item carries enough context (event name, owner, due) to be acted on
// without expanding. Sort: URGENT (overdue) → DUE/AWAITING → TO SEND.
export function getCrossEventAttentionItems(events = []) {
  const items = [];
  for (const ev of events) {
    const timeline = ev.timeline || [];
    const comms    = ev.commClient || [];
    const vendors  = ev.vendors || [];
    const eventName = ev.name || 'Untitled event';
    // Sprint 57: event proximity needed by stale-vendor signal below
    const eventDays = ev.date ? daysFrom(ev.date) : null;

    // Sprint 57f.2: compute compression first so the decision loop can
    // suppress its derivative overdue rows when the event already has a
    // compression meta-row. The compression row is the *cause* — listing
    // 14 derivative overdue rows alongside is noise. We suppress decision
    // rows (overdue timeline tasks) but never approvals/requests/vendor
    // rows; those are independent signals not caused by the lead time.
    // WAVE-6: no phaseOffset arg — classifyTemplateTaskUrgency reads taskLeadDays
    // itself; the map was only a legacy fallback this file no longer mirrors.
    const compression = deriveEventCompressionSummary(ev, daysFrom);
    const suppressDerivativeDecisions = !!(compression && compression.significant);
    // We always keep do_now tasks (they're the planner's first move). The
    // dedupe targets the risk_lost/long-tail overdue tasks that bloat the
    // queue. Build a set of task IDs we will NOT drop even when suppressing.
    const doNowKeepIds = new Set(
      suppressDerivativeDecisions
        ? compression.doNow.slice(0, 2).map(t => t.id) // cap at 2 to avoid spam
        : []
    );

    // Decisions = overdue uncompleted tasks
    for (const t of timeline) {
      if (t.done || !taskIsOverdue(t, ev)) continue;
      // Sprint 57f.2: when compression meta-row will appear, hide most
      // derivative overdue rows. Keep the top do_now items so a planner
      // who clicks the compression row OR taps a do_now row still sees
      // a route — but cap to prevent the wall-of-overdue effect.
      if (suppressDerivativeDecisions && !doNowKeepIds.has(t.id)) continue;
      const od = overdueDays(t, ev.date);
      items.push({
        id: `dec-${ev.id}-${t.id}`, kind: 'decision', eventId: ev.id, eventName,
        title: t.task || 'Untitled task',
        owner: t.owner || 'You',
        meta: `${t.week} · ${t.owner || 'You'}`,
        // Sprint 49: Figma H vocabulary
        statusLabel: od > 14 ? 'OVERDUE' : 'DUE', // critical≠urgent: these are TIME states (how overdue), not severity jargon.
        statusColor: '#E84036', // red
        dueLabel: `Overdue ${od}d`,
        dueColor: '#E84036',
        sortKey: 1000 + od, // higher = more urgent
        // Sprint 49: decisions now route to the canonical Decisions tab,
        // carrying a `decisionId` (= timeline task id) per EventPlanner's
        // initialNav shape.
        clickTarget: { tab: 'Decisions', decisionId: t.id },
      });
    }

    // Approvals — sent (awaiting) or draft (to send)
    for (const m of comms) {
      if (m.message_type !== 'approval_request') continue;
      if (['approved', 'rejected'].includes(m.approval_status)) continue;
      const sent = approvalIsSent(m);
      items.push({
        id: `app-${ev.id}-${m.id}`, kind: 'approval', eventId: ev.id, eventName,
        title: m.subject || (m.body || '').slice(0, 80) || 'Approval request',
        meta: `${eventName} · ${sent ? `Sent ${fmtRelative(m.requestSentAt || m.createdAt)}` : 'Draft saved'}`,
        owner: m.channel || 'Client',
        // Sprint 49: Figma H vocabulary — draft = PENDING, sent = AWAITING
        statusLabel: sent ? 'AWAITING' : 'PENDING',
        statusColor: sent ? '#d4904a' : '#849eb8',
        dueLabel: sent ? 'Awaiting' : 'Drafted',
        dueColor: sent ? '#d4904a' : '#849eb8',
        sortKey: sent ? 500 : 300,
        // Sprint 49: approvals route to the canonical Decisions tab too
        clickTarget: { tab: 'Decisions', decisionId: m.id },
      });
    }

    // Requests = inbound, non-approval messages awaiting response
    for (const m of comms) {
      if (m.message_type === 'approval_request') continue;
      if (!isInboundMessage(m)) continue; // outbound planner messages aren't requests
      if (!(m.body || m.text)) continue;
      if (m.handled || m.answered) continue;
      items.push({
        id: `req-${ev.id}-${m.id}`, kind: 'request', eventId: ev.id, eventName,
        title: (m.body || m.text || '').slice(0, 100),
        meta: `${eventName} · ${m.senderName || m.channel || 'Inbound'}`,
        owner: m.senderName || m.channel || '—',
        statusLabel: 'NEW',
        statusColor: '#5b6d7f',
        dueLabel: fmtRelative(m.createdAt || m.date),
        dueColor: '#849eb8',
        sortKey: 400,
        // Sprint 49: route to canonical Communication tab with the message id
        clickTarget: { tab: 'Communication', commId: m.id },
      });
    }

    // Sprint 57: Stale-vendor signal — committed vendors with no log entry in
    // 21+ days AND the event is < 60 days out. The audit flagged this gap:
    // "Stale-vendor signal — surface vendors with no activity in 21+d on L1
    // attention queue." Catches the "vendor went quiet" problem before it
    // becomes a day-of fire.
    if (eventDays !== null && eventDays >= 0 && eventDays <= 60) {
      for (const v of vendors) {
        const isCommitted = ['Confirmed', 'Booked', 'Deposit Paid', 'Contracted'].includes(v.status);
        if (!isCommitted) continue;
        const log = Array.isArray(v.log) ? v.log : [];
        if (log.length === 0) continue;
        const lastEntry = [...log].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
        if (!lastEntry?.date) continue;
        const lastDays = -daysFrom(lastEntry.date);
        if (lastDays < 21) continue;
        items.push({
          id: `stale-${ev.id}-${v.id}`, kind: 'vendor-stale', eventId: ev.id, eventName,
          title: `Reconfirm ${v.name || 'vendor'} — ${lastDays}d since last touch`,
          meta: `${eventName} · ${v.category || 'vendor'}`,
          owner: v.name || '—',
          statusLabel: 'STALE',
          statusColor: '#d4904a',
          dueLabel: `${eventDays}d to event`,
          dueColor: '#849EB8',
          sortKey: 350 + Math.min(lastDays, 200), // staler = higher priority
          clickTarget: { tab: 'Vendors', vendorId: v.id },
        });
      }
    }

    // Sprint 57f.1: Compressed-timeline signal — one item per event whose
    // lead time is non-standard AND has open do_now/risk_lost tasks. We do
    // NOT explode into N task-level items; that would spam the queue. One
    // event-level entry per compressed event, routing to its Planning
    // Tasks __compressed__ filter. Sprint 57f.2: reuse `compression` from
    // the top of this iteration (already computed for dedupe decisions).
    {
      if (compression && compression.significant) {
        // Red audit (2026-06-10): a tight timeline is CAUTION (act fast, less
        // buffer), not a blocking/critical state — so it's amber, never the
        // fire red. "rush" was #E84036; demoted to amber. The headline copy +
        // do-now count carry the severity, not an alarm color.
        const tone =
            compression.level === 'rush'       ? '#d4904a'
          : compression.level === 'compressed' ? '#d4904a'
          :                                      '#3a8a62'; // tight
        items.push({
          id: `compr-${ev.id}`, kind: 'compression', eventId: ev.id, eventName,
          title: compression.headline || 'Tight timeline — tasks moved to the front',
          meta: `${eventName} · ${compression.daysUntil}d to event`,
          owner: 'Plan',
          statusLabel: compression.meta.badge ? compression.meta.badge.replace('⏱ ', '') : 'TIGHT',
          statusColor: tone,
          dueLabel: `${compression.doNow.length} now${compression.considerSwap.length ? ` · ${compression.considerSwap.length} swap` : ''}`,
          dueColor: tone,
          // Compression is the *cause* of N overdue task rows on this event —
          // a planner seeing the compression item learns "why" in one row,
          // while seeing 14 individual overdue rows just looks like noise.
          // Rank above individual decisions so the meta-frame appears first
          // when both surface (decision sortKey = 1000 + overdueDays, so
          // we start at 1500 and scale by urgency count).
          sortKey: 1500
                 + (compression.level === 'rush' ? 200
                  : compression.level === 'compressed' ? 100 : 0)
                 + Math.min(compression.totalUrgent, 50),
          clickTarget: { tab: 'Planning Tasks', taskId: '__compressed__' },
        });
      }
    }

    // Vendor issues — unconfirmed vendors with past payment dates or flagged
    for (const v of vendors) {
      // RECON-I1 (POP-1C): isVendorBooked (lib/workstreams BOOKED_STATUSES) is the
      // ONE booked predicate — the old inline Confirmed|Booked set flagged a
      // 'Deposit Paid'/'Contracted' vendor as needing attention here while the
      // rollup called the same vendor ready on the same screen.
      // SSOT #1: named `booked`, not `isConfirmed` — a booked vendor is correctly
      // not an attention item here, but "confirmed" is a stricter, different rung.
      const booked = isVendorBooked(v);
      if (booked) continue;
      const overdueP = v.payDueDate && daysFrom(v.payDueDate) < 0;
      items.push({
        id: `ven-${ev.id}-${v.id}`, kind: 'vendor', eventId: ev.id, eventName,
        title: `${v.category || 'Vendor'} — ${v.name || 'unknown'}`,
        meta: `${eventName} · ${v.status || 'awaiting response'}`,
        owner: v.name || '—',
        // Sprint 49: Figma F vocabulary — overdue payment escalates to AT RISK,
        // otherwise pick the Figma badge state appropriate to the stored stage.
        statusLabel: overdueP
          ? 'AT RISK'
          : (v.status === 'Deposit Paid' || v.status === 'Contracted' || v.status === 'Partial') ? 'PARTIAL'
          : (v.status === 'Quoted' || v.status === 'Pending')                                    ? 'PENDING'
          : (v.status === 'Considering' || v.status === 'Not Started' || !v.status)              ? 'NOT STARTED'
          : (v.status === 'Unconfirmed' || v.status === 'Needs Action')                           ? 'UNCONFIRMED'
          : 'NOT STARTED',
        statusColor: overdueP ? '#E84036' : '#d4904a',
        dueLabel: v.payDueDate
          ? (overdueP ? `Overdue ${-daysFrom(v.payDueDate)}d` : `In ${daysFrom(v.payDueDate)}d`)
          : 'Open',
        dueColor: overdueP ? '#E84036' : '#d4904a',
        sortKey: overdueP ? 900 : 200,
        // Sprint 49: emit `vendorId` to match EventPlanner's initialNav shape
        clickTarget: { tab: 'Vendors', vendorId: v.id },
      });
    }
  }
  // Sort by urgency (descending sortKey)
  return items.sort((a, b) => b.sortKey - a.sortKey);
}

// Per-event 4-axis readiness — for the Events Index card.
// Returns { decision, vendor, timeline, document } each shaped as
// { status: 'ON_TRACK' | 'ATTENTION' | 'AT_RISK', label, note }.
export function getEventReadiness(event) {
  const timeline = event.timeline || [];
  const vendors  = event.vendors || [];

  // Stage C: read effectiveDone (engine-satisfied OR manually ticked), not raw t.done,
  // so rich event state (guests/budget/venue/vendor/food) counts as work handled and a
  // satisfied task is never flagged overdue.
  const overdueCount   = timeline.filter(t => !effectiveDone(event, t) && taskIsOverdue(t, event)).length;
  const tasksDone      = timeline.filter(t => effectiveDone(event, t)).length;
  const tasksTotal     = timeline.length;
  // RECON-I1 (POP-1C): the canonical booked predicate — see lib/workstreams.
  const confirmedV     = vendors.filter(v => isVendorBooked(v)).length;   // booked (secured for the day)
  const unconfirmedV   = vendors.length - confirmedV;
  // SSOT #1: "confirmed" is reserved for isVendorConfirmed (fully locked in); a
  // booked-but-not-confirmed vendor (Deposit Paid/Contracted) is disclosed as
  // "to confirm", so this axis never greens the WORD "confirmed" while an open
  // "Confirm vendor" action exists — same predicate as the dot/action/hero.
  const lockedInV      = vendors.filter(v => isVendorConfirmed(v)).length;
  const toConfirmV     = Math.max(0, confirmedV - lockedInV);

  // Decision health — overdue tasks ARE open decisions.
  let decision;
  if      (overdueCount === 0)     decision = { status: 'ON_TRACK', label: 'On track',  note: 'No open decisions' };
  else if (overdueCount <= 2)      decision = { status: 'ATTENTION', label: 'Attention', note: `${overdueCount} open` };
  else                              decision = { status: 'AT_RISK',  label: 'At risk',  note: `${overdueCount} open` };

  // Vendor readiness. A vendor isn't fully "on track" just because it's booked —
  // a Confirmed vendor with no signed contract is exactly the "needs follow-up"
  // the vendor DETAIL flags (getVendorReadiness booking/documents axis). Count it
  // here too so the event-level readiness and the vendor detail never disagree
  // (the "on track" vs "contract conflict" contradiction).
  const confirmedNoContract = vendors.filter(v =>
    isVendorBooked(v) &&
    !(v.contractSigned === true || v.contract_signed === true)
  ).length;
  let vendor;
  if      (vendors.length === 0)               vendor = { status: 'AT_RISK',   label: 'At risk',  note: 'No vendors' };
  else if (unconfirmedV >= 3)                  vendor = { status: 'AT_RISK',   label: 'At risk',  note: `${unconfirmedV} unconfirmed` };
  else if (unconfirmedV > 0)                   vendor = { status: 'ATTENTION', label: 'Attention', note: `${unconfirmedV} unconfirmed` };
  else if (confirmedNoContract > 0)            vendor = { status: 'ATTENTION', label: 'Attention', note: `${confirmedNoContract} missing contract` };
  // SSOT #1 ROOT FIX. This axis previously returned ON_TRACK with a "· N to confirm"
  // note — the note was honest but the TOKEN was not, and the token is what other
  // engines read: positiveAttention lists any ON_TRACK vendor axis under a green
  // "You're Set On ✓" pill, and decisionConfidence renders it as green "Ready to
  // lock". Fixing the note while leaving the token is why those two kept lying.
  // An open confirm IS something the host has to do, so it is ATTENTION, not ON_TRACK.
  // `toConfirm` rides on the canonical rollup — not re-derived here.
  else if (toConfirmV > 0)                      vendor = { status: 'ATTENTION', label: 'To confirm', note: `all booked · ${toConfirmV} to confirm` };
  else                                          vendor = { status: 'ON_TRACK',  label: 'On track', note: `${lockedInV} confirmed` };

  // Timeline readiness
  const taskPct = tasksTotal > 0 ? tasksDone / tasksTotal : 0;
  let timelineR;
  // MISSING DATA IS NOT A RISK. This said AT_RISK/'No tasks' for an empty checklist, which
  // fed the ladder's Tier 5 and produced "Catch up on overdue planning tasks. No tasks · only
  // N days left to recover." — a red alarm about work that does not exist. It also forced the
  // band-aid in confidenceGrammar (a /^No\b/ note-regex downgrading the tier) which in turn
  // let a REAL at-risk row be downgraded whenever its note happened to start with "No".
  // UNKNOWN is the honest status for an empty ledger, and now the whole chain can be honest.
  if      (tasksTotal === 0)                   timelineR = { status: 'UNKNOWN',  label: 'Not started', note: 'No tasks yet' };
  else if (overdueCount > 2)                   timelineR = { status: 'AT_RISK',  label: 'At risk', note: `${overdueCount} overdue` };
  else if (overdueCount > 0)                   timelineR = { status: 'ATTENTION', label: 'Attention', note: `${overdueCount} overdue` };
  else if (taskPct >= 0.8)                     timelineR = { status: 'ON_TRACK', label: 'On track', note: `${Math.round(taskPct*100)}%` };
  else if (taskPct >= 0.5)                     timelineR = { status: 'ATTENTION', label: 'Attention', note: `${Math.round(taskPct*100)}%` };
  else                                          timelineR = { status: 'ATTENTION', label: 'Attention', note: `${Math.round(taskPct*100)}%` };

  // Sprint 49: real documents readiness (was previously placeholder)
  const documents = getDocumentsReadiness(event);

  return { decision, vendor, timeline: timelineR, document: documents };
}

// ─── PROGRESS DOCTRINE (PROGRESS-2, locked by progressDoctrine.test.js) ───────
// wholeEventReadinessScore below is THE ONLY canonical whole-event readiness
// source. Every other progress value in the app is scoped-local and must be
// labeled as such: eventPlan().progress is a plan-essentials COUNT (the Plan
// badge), vendor chips are vendor-scoped, task percentages are task-scoped,
// per-area rows and named trackers (capacity, thank-you, setup guide) are
// local display state that NEVER enters this score. Do not wire a header/
// whole-event surface to any local source, and do not label a local source
// with generic "progress"/"ready" copy.
// ─── The same "axes that don't apply are EXCLUDED, not scored as failing" rule,
// shared by every reader of getEventReadiness. A DIY host who never hired a
// vendor gets vendor: null (not AT_RISK 'No vendors'); same for documents.
// wholeEventReadinessScore (the header score) already used this inline — the
// events-index card was found reading getEventReadiness() raw instead, so a
// no-vendor DIY host was pinned "At risk" forever on that card even though the
// header right above it correctly showed the event as fine. One source now.
export function applicableReadinessAxes(event) {
  if (!event) return null;
  const r = getEventReadiness(event);
  let isHost = false;
  try { isHost = audiencePersona(event) === 'host'; } catch { isHost = false; }
  const hasVendors = (event.vendors || []).some(v => v && String(v.name || '').trim());
  const hasDocs = Array.isArray(event.documents) && event.documents.length > 0;
  return {
    ...r,
    vendor:   (isHost && !hasVendors) ? null : r.vendor,
    document: (isHost && !hasDocs)    ? null : r.document,
  };
}

// ─── PROGRESS-1: whole-event readiness score (the header ReadinessTrack) ──────
// Composes the SAME 4-axis getEventReadiness with one honesty rule: axes that
// don't apply to this event are EXCLUDED, not scored as failing. Command's own
// Planning Health already suppresses the Vendors row for a host with no
// vendors and the Documents row for a host with no documents — the whole-event
// score now follows the same rule, so a backyard host who deliberately hired
// nobody is no longer permanently pinned at "half ready" by axes they don't
// have. No new engine: same axes, same readinessScore mapping.
export function wholeEventReadinessScore(event) {
  if (!event) return null;
  return readinessScore(applicableReadinessAxes(event));
}

// Aggregate counts across all events — drives the Home Attention Queue
export function getCrossEventAttention(events = []) {
  let decisions = 0, approvals = 0, requests = 0, vendorIssues = 0;
  const byEvent = events.map(e => {
    const a = getEventAttention(e);
    decisions   += a.decisions;
    approvals   += a.approvals;
    requests    += a.requests;
    vendorIssues += a.vendorIssues;
    return { event: e, ...a, total: a.decisions + a.approvals + a.requests + a.vendorIssues };
  });
  return {
    totals: { decisions, approvals, requests, vendorIssues,
              total: decisions + approvals + requests + vendorIssues },
    byEvent: byEvent.sort((a, b) => b.total - a.total),
  };
}

// ─── Sprint 52: deterministic priority selectors ────────────────────────────
// Power the L1 "Top of Book" panel and the L3 "Up Next" panel.
// No AI, no fake urgency — these walk a fixed priority ladder over the same
// state the rest of the app already reads. Every return is a `command` object
// shaped { level, category, title, consequence, primaryCta, primaryRoute,
// secondaryCta?, secondaryAction? } so the rendering layer can stay dumb.

const fmtMoney0 = (n) => '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const daysWord = (d) => d === 1 ? '1 day' : `${d} days`;

// L1 — across all events on Studio Home.
export function selectStudioCommand(events = []) {
  const active = (events || []).filter(e => !e.archived);
  if (active.length === 0) {
    // Sprint 60.O Addendum: single command voice — locked copy from spec.
    return {
      level: 'neutral',
      category: 'empty',
      title: 'Plan your first event.',
      consequence: 'Start with the basics. Add people, money, and timing later.',
      primaryCta: 'Plan your first event',
      primaryAction: 'new-event',
      secondaryCta: 'Try a sample event',
      secondaryAction: 'sample',
    };
  }

  const items = getCrossEventAttentionItems(active);

  // Sprint 60.P Addendum — state priority truth lock.
  // Today/live event ALWAYS wins over generic future planning language.
  // We split into two sub-tiers up here, BEFORE the critical/attention
  // ladder, so a today event with empty vendors no longer renders as
  // "slipping on vendors" — it renders as TODAY · LIVE (or LIVE · ACT
  // NOW if there really are day-of items to handle).
  const todayActive = active
    .map(ev => ({ ev, days: daysFrom(ev.date) }))
    .filter(x => x.days === 0)
    .sort((a, b) => (a.ev.name || '').localeCompare(b.ev.name || ''))[0];
  if (todayActive) {
    const { ev: todayEv } = todayActive;
    // Are there any URGENT/AT_RISK items tied to the today event?
    const todayCritical = items.filter(it => it.eventId === todayEv.id && (it.statusLabel === 'OVERDUE' || it.statusLabel === 'AT RISK'));
    const todayAttention = items.filter(it => it.eventId === todayEv.id);
    if (todayCritical.length > 0 || todayAttention.length > 0) {
      // Tier 1a: LIVE · ACT NOW — live event with active day-of issues
      const count = todayAttention.length;
      const top = todayCritical[0] || todayAttention[0];
      return {
        level: 'critical',
        category: 'today-act',
        eventId: todayEv.id,
        eventName: todayEv.name,
        title: `${count} thing${count !== 1 ? 's' : ''} need${count === 1 ? 's' : ''} attention right now.`,
        consequence: top ? `Start with "${top.title || top.label || 'the highest-priority item'}".` : 'Open your run of show to work the day.',
        primaryCta: 'Open your run of show',
        primaryRoute: { eventId: todayEv.id, tab: 'Event Day Schedule', focusField: 'ros-now' },
        secondaryCta: 'View messages',
        secondaryRoute: { eventId: todayEv.id, tab: 'Communication' },
      };
    }
    // Tier 1b: TODAY · LIVE — live event, clean
    return {
      level: 'attention',
      category: 'today',
      eventId: todayEv.id,
      eventName: todayEv.name,
      title: 'Your event is today.',
      // B5 — promise only what production delivers: the real run-of-show (Event Day
      // Schedule, derived from the playbook). The unified "Day-of Mode" with live vendor
      // arrivals + messages is a dev-only demo (App.js ~35410), so the CTA must not sell it.
      consequence: 'Your run of show is ready — every cue for the day, top to bottom.',
      primaryCta: 'Open your run of show',
      primaryRoute: { eventId: todayEv.id, tab: 'Event Day Schedule', focusField: 'ros-now' },
      secondaryCta: 'View full event details',
      secondaryRoute: { eventId: todayEv.id, tab: 'Planning' },
    };
  }

  // Tier 2: critical blockers — URGENT-labeled items or AT RISK vendors
  const critical = items.find(it => it.statusLabel === 'OVERDUE' || it.statusLabel === 'AT RISK');
  if (critical) {
    const sameEventCount = items.filter(it => it.eventId === critical.eventId &&
      (it.statusLabel === 'OVERDUE' || it.statusLabel === 'AT RISK')).length;
    return {
      level: 'critical',
      category: 'blocker',
      eventId: critical.eventId,
      eventName: critical.eventName,
      // Sprint 60.O Addendum: drop "Start here:" prefix — eyebrow carries
      // the framing. Headline is now the plain truth: who has how many.
      title: `${critical.eventName} has ${sameEventCount > 1 ? `${sameEventCount} blockers` : 'a blocker'}.`,
      consequence: `"${critical.title}" — ${critical.dueLabel || 'awaiting your action'}. Other tasks are stuck until this is handled.`,
      primaryCta: 'Handle this first',
      primaryRoute: { eventId: critical.eventId, ...critical.clickTarget },
      secondaryCta: items.length > 1 ? `View all ${items.length} attention items` : 'View all attention items',
      secondaryAction: 'attention',
    };
  }

  // Tier 2: AWAITING approvals (client decisions blocking)
  const awaiting = items.find(it => it.kind === 'approval' && it.statusLabel === 'AWAITING');
  if (awaiting) {
    return {
      level: 'attention',
      category: 'decision',
      eventId: awaiting.eventId,
      eventName: awaiting.eventName,
      // Sprint 60.O Addendum: dropped "Start here:" prefix.
      title: `${awaiting.eventName} is waiting on client approval.`,
      consequence: `"${(awaiting.title || '').slice(0, 100)}" — sent, awaiting reply. Decisions downstream are paused.`,
      primaryCta: 'Handle this first',
      primaryRoute: { eventId: awaiting.eventId, ...awaiting.clickTarget },
      secondaryCta: items.length > 1 ? `View all ${items.length} attention items` : 'View all attention items',
      secondaryAction: 'attention',
    };
  }

  // Tier 3: PENDING approvals (draft to send) — planner's own move
  const pending = items.find(it => it.kind === 'approval' && it.statusLabel === 'PENDING');
  if (pending) {
    return {
      level: 'attention',
      category: 'decision',
      eventId: pending.eventId,
      eventName: pending.eventName,
      title: `An approval for ${pending.eventName} is drafted but not sent.`,
      consequence: `"${(pending.title || '').slice(0, 100)}" is sitting in your queue. Send it so the client clock can start.`,
      primaryCta: 'Handle this first',
      primaryRoute: { eventId: pending.eventId, ...pending.clickTarget },
      secondaryCta: items.length > 1 ? `View all ${items.length} attention items` : 'View all attention items',
      secondaryAction: 'attention',
    };
  }

  // Tier 4: vendor issues
  const vendor = items.find(it => it.kind === 'vendor');
  if (vendor) {
    return {
      level: 'attention',
      category: 'vendor',
      eventId: vendor.eventId,
      eventName: vendor.eventName,
      title: `${vendor.title.replace(/^[A-Z][a-z]+ — /, '')} still needs confirmation for ${vendor.eventName}.`,
      consequence: `Currently ${vendor.statusLabel.toLowerCase().replace('_', ' ')}. The longer it sits, the tighter your fallback window.`,
      primaryCta: 'Handle this first',
      primaryRoute: { eventId: vendor.eventId, ...vendor.clickTarget },
      secondaryCta: items.length > 1 ? `View all ${items.length} attention items` : 'View all attention items',
      secondaryAction: 'attention',
    };
  }

  // Tier 5: timeline / checklist risk — find lowest-readiness event
  let lowReadinessEvent = null;
  let lowReadinessScore = Infinity;
  for (const ev of active) {
    const r = getEventReadiness(ev);
    const riskCount = [r.decision, r.vendor, r.timeline, r.document]
      .filter(a => a && a.status === 'AT_RISK').length;
    const attentionCount = [r.decision, r.vendor, r.timeline, r.document]
      .filter(a => a && a.status === 'ATTENTION').length;
    const score = -(riskCount * 10 + attentionCount);
    if (score < lowReadinessScore) {
      lowReadinessScore = score;
      lowReadinessEvent = { ev, r, riskCount, attentionCount };
    }
  }
  if (lowReadinessEvent && (lowReadinessEvent.riskCount > 0 || lowReadinessEvent.attentionCount >= 2)) {
    const { ev, r, riskCount } = lowReadinessEvent;
    const days = daysFrom(ev.date);
    const worst = ['decision','vendor','timeline','document']
      .find(k => r[k] && r[k].status === 'AT_RISK') ||
      ['decision','vendor','timeline','document'].find(k => r[k] && r[k].status === 'ATTENTION');
    const worstNote = (r[worst] && r[worst].note) || '';
    // Sprint 60.P Addendum — locked NEEDS FOLLOW-UP copy for the attention
    // tier. "Slipping on vendors" was the source of the truth conflict
    // with EventReadinessPanel; the new copy reflects the work to do
    // without implying the readiness panel is wrong.
    return {
      level: riskCount > 0 ? 'attention' : 'neutral',
      category: 'readiness',
      eventId: ev.id,
      eventName: ev.name,
      title: `${ev.name} needs follow-up.`,
      consequence: `${worstNote ? worstNote + '. ' : ''}Handle this before it becomes urgent${days !== null && days > 0 ? ` — ${daysWord(days)} until event` : ''}.`,
      primaryCta: 'Open event',
      primaryRoute: { eventId: ev.id, tab: 'Command', focusField: 'next-step-hero' },
      secondaryCta: 'View all attention items',
      secondaryAction: 'attention',
    };
  }

  // Tier 6: inbound requests
  const req = items.find(it => it.kind === 'request');
  if (req) {
    return {
      level: 'neutral',
      category: 'comm',
      eventId: req.eventId,
      eventName: req.eventName,
      title: `${req.owner || 'Someone'} is waiting on a reply for ${req.eventName}.`,
      consequence: `"${(req.title || '').slice(0, 100)}" came in ${req.dueLabel || 'recently'}. A short reply keeps trust intact.`,
      primaryCta: 'Handle this first',
      primaryRoute: { eventId: req.eventId, ...req.clickTarget },
      secondaryCta: items.length > 1 ? `View all ${items.length} attention items` : 'View all attention items',
      secondaryAction: 'attention',
    };
  }

  // Tier 6.5 (TODAY/LIVE) was hoisted to the top of the ladder in
  // Sprint 60.P Addendum so live event days always win over generic
  // future-planning language. See the LIVE · ACT NOW / TODAY · LIVE
  // branches at the start of this function.

  // Tier 6.7: decision-first / operational playbook step (Sprint 55C-1 + 55G).
  // For an otherwise-clear upcoming event, surface the per-event next action
  // when it is a playbook DECISION or operational buy — through the existing
  // selectStudioCommand → selectEventNextAction path. Decision-first ordering is
  // already enforced inside selectEventNextAction (the decision gate outranks the
  // purchase tier), so "Confirm final guest count" reaches the Home Spine before
  // "Buy protein." This sits BELOW every critical/attention tier above and ABOVE
  // the generic "N events upcoming / on track" time-fillers below.
  const opCandidate = active
    .map(ev => ({ ev, days: daysFrom(ev.date) }))
    .filter(x => x.days !== null && x.days >= 0)
    .sort((a, b) => a.days - b.days)
    .map(x => ({ ev: x.ev, na: selectEventNextAction(x.ev) }))
    .find(x => x.na && (x.na.category === 'operational' || x.na.category === 'decision'));
  if (opCandidate) {
    const { ev, na } = opCandidate;
    return {
      level: na.level,
      category: na.category,
      eventId: ev.id,
      eventName: ev.name,
      title: na.title,
      consequence: na.consequence,
      primaryCta: na.primaryCta,
      primaryRoute: { eventId: ev.id, ...na.primaryRoute },
      secondaryCta: 'View all events',
      secondaryAction: 'events',
    };
  }

  // Tier 7: upcoming events. Sprint 60.O Addendum: split single vs. multi.
  // 2+ events in next 60 days → summary headline. Single → "next event on track".
  const upcomingIn60 = active
    .map(ev => ({ ev, days: daysFrom(ev.date) }))
    .filter(x => x.days !== null && x.days > 0 && x.days <= 60)
    .sort((a, b) => a.days - b.days);
  if (upcomingIn60.length >= 2) {
    const nextEv = upcomingIn60[0].ev;
    // Sprint 60.O Addendum: secondary "Open today's event" ONLY shows
    // when a today/live event exists. Otherwise no secondary (per spec).
    const todayUpcoming = upcomingIn60.find(x => x.days === 0);
    return {
      level: 'neutral',
      category: 'multiple-upcoming',
      eventId: nextEv.id,
      eventName: nextEv.name,
      title: `${upcomingIn60.length} events in the next 60 days.`,
      consequence: 'Start with the event that needs attention first.',
      primaryCta: 'View all events',
      primaryAction: 'events',
      secondaryCta: todayUpcoming ? "Open today's event" : null,
      secondaryRoute: todayUpcoming ? { eventId: todayUpcoming.ev.id, tab: 'Command' } : undefined,
    };
  }
  const upcoming = upcomingIn60.find(x => x.days <= 30) || upcomingIn60[0];
  if (upcoming) {
    return {
      level: 'neutral',
      category: 'calendar',
      eventId: upcoming.ev.id,
      eventName: upcoming.ev.name,
      title: 'Your next event is on track.',
      // Sprint 60.O Addendum: locked all-clear body copy.
      consequence: 'No overdue tasks. No pending payments. Your next event is organized.',
      primaryCta: 'Open your event',
      primaryRoute: { eventId: upcoming.ev.id, tab: 'Command', focusField: 'next-step-hero' },
      secondaryCta: 'View all events',
      secondaryAction: 'events',
    };
  }

  // Tier 8: all-clear fallback (no events upcoming).
  return {
    level: 'neutral',
    category: 'all-clear',
    title: 'Your next event is on track.',
    consequence: 'No overdue tasks. No pending payments. Your next event is organized.',
    primaryCta: 'View all events',
    primaryAction: 'events',
    secondaryCta: null,
  };
}

// ── eventPlan(event) — THE single source of truth for "what to do next + progress" ──
// One generator answers both questions so no surface can go stale or disagree:
//   • nextActions — ordered, deduped-by-domain list of the NOT-DONE actions. [0] is THE
//     one thing every hero/ribbon/Focus shows. The reactive #1 (caterer / decision /
//     vendor / timeline / inbound / operational) comes straight from the existing engine
//     (_selectEventNextActionInner) so its rich, routed, state-aware copy is preserved.
//   • progress  — { done, total } over the CANONICAL foundational action set, with `done`
//     computed from REAL event state via the domino predicates (NOT raw task.done). This
//     is the synced "X/Y" badge source — set the budget and the count moves, no ticking.
//   • handled   — the proven-done foundational facts as short whisper strings, for Focus.
//
// State-aware by construction: a foundational action's `done` is the same predicate the
// engine's foundational tiers gate on (a date is set, a guest signal exists, money is on
// the budget, food is sourced). So a satisfied sub-goal can never reach a hero — the
// composite playbook string "Set date, headcount, menu" is decomposed here into atomic
// dominoes ("Set the date", "Add your guest list", "Set your budget") that drop out one
// at a time, never surfacing verbatim once any part is done.
// Exported for tests (same precedent as _stripLeadingDateClause): D-1B pins that
// every foundation CTA carries its exact deep-link target, not just a tab.
export function _eventFoundationActions(event) {
  if (!event) return [];
  const guests = Array.isArray(event.guests) ? event.guests : [];
  const hasGuestSignal = guests.length > 0
    || Number(event.guestCount) > 0 || Number(event.guestEstimate) > 0;
  const dateSet = !!String(event.date || '').trim()
    && !/^(tbd|tba)$/i.test(String(event.date).trim());
  const budgetIsSet = (event.budget || []).reduce((s, r) => s + (Number(r && r.budgeted) || 0), 0) > 0
    || Number(event.totalBudget) > 0;
  // Food is "sourced" once the host has made any food/sourcing choice, self-provides
  // (cook/potluck), or a named vendor exists. Inlined (vs importing the taskEngine
  // predicates) to avoid a lint/circular-import edge in this module.
  const foodSourcing = String((event.foodChoices && event.foodChoices.sourcing) || '').toLowerCase();
  const selfProvides = !!foodSourcing && /host cooks|potluck|cook (it )?(yourself|everything|the mains)|\bdiy\b|self[-\s]?cater/.test(foodSourcing);
  const aNamedVendor = Array.isArray(event.vendors) && event.vendors.some((v) => v && String(v.name || '').trim());
  const hasFood = (event.foodChoices && Object.keys(event.foodChoices).length > 0)
    || (Array.isArray(event.foodAdd) && event.foodAdd.length > 0)
    || selfProvides || aNamedVendor;

  // The canonical foundational dominoes, in priority order. Each `done` is derived from
  // real state — never from a stored task flag — so the badge and the hero agree.
  return [
    {
      id: 'date', domain: 'date', title: 'Set the date.',
      consequence: 'The date anchors every countdown, milestone, and shopping window.',
      // 'Event Details' is the real tab id — 'Details' has no render branch
      // (the same dead-route bug the rain-plan CTA's live verification caught).
      cta: 'Set date', route: { tab: 'Event Details', focusField: 'event-date' },
      done: dateSet, handledFact: dateSet ? 'Date set' : null,
    },
    {
      id: 'guests', domain: 'guests', title: 'Add your guest list.',
      consequence: 'Who’s coming is the first domino — it sizes the budget, the food, and the schedule.',
      cta: 'Add guests', route: { tab: 'Guests', focusField: 'guests-entry' },
      done: hasGuestSignal,
      handledFact: hasGuestSignal
        ? `${guests.filter(g => g && g.rsvp === 'Yes').length || Number(event.guestCount) || Number(event.guestEstimate) || guests.length} guests`
        : null,
    },
    {
      id: 'budget', domain: 'budget', title: 'Set your budget.',
      consequence: 'With your headcount in, a budget frames every food and vendor choice.',
      cta: 'Set budget', route: { tab: 'Budget', focusField: 'hsp-budget' },
      done: budgetIsSet,
      handledFact: budgetIsSet
        ? (Number(event.totalBudget) > 0 ? `Budget set · ${fmtMoney0(Number(event.totalBudget))}` : 'Budget set')
        : null,
    },
    {
      id: 'food', domain: 'food', title: 'Plan the food.',
      consequence: 'How you’re feeding everyone — cook, cater, or potluck — drives the shopping and the run of show.',
      // D-1B: deep-link to the open menu decision when one exists (its foodFocus
      // route scrolls + focuses the "Your choices" card), instead of dumping the
      // host at the Plan tab top. No pickable decision → the honest tab route.
      cta: 'Plan food',
      route: (() => {
        try {
          const dec = topPlaybookDecision(event);
          if (dec && dec.primaryRoute && dec.primaryRoute.foodFocus) return dec.primaryRoute;
        } catch {}
        return { tab: 'Planning', focusField: 'food-plan' };
      })(),
      done: hasFood, handledFact: hasFood ? 'Food sourced' : null,
    },
  ];
}

// A playbook "planning" composite bundles several sub-goals into one milestone name
// ("Set date, headcount, menu" / "Set date + guest count + budget"). Detect it so no hero
// ever shows a half-done bundle — once the host handles ONE part (locks the headcount) the
// whole string reads as stale ("why is it still telling me to set the headcount?").
function _isSetCompositeTitle(t) {
  return !!t && /^set\b/i.test(t) && /[,+&]|\band\b/i.test(t)
    && /\b(date|headcount|guests?|count|menu|budget|list|format)\b/i.test(t);
}
// Replace such a composite with the ATOMIC remaining foundational action (date → guests →
// budget → food). Single source: the same _eventFoundationActions dominoes eventPlan uses,
// so the decomposition is state-aware — a locked headcount drops 'guests' and the next
// real gap ("Set the date.") leads. Returns cmd unchanged when it isn't a composite.
// A host event ALWAYS has a date (it's chosen at creation), so a next-step CTA must never
// tell the host to "set date." Strip a satisfied LEADING date clause from a "Set date, …"
// composite — "Set date, headcount, menu" → "Set headcount, menu" — keeping the connector
// grammar intact. No-op when the date isn't set (defensive) or the title isn't such a string.
export function _stripLeadingDateClause(title, event) {
  const dateSet = !!String((event && event.date) || '').trim()
    && !/^(tbd|tba)$/i.test(String((event && event.date) || '').trim());
  if (!dateSet) return title;
  const re = /^(set\s+)(?:the\s+)?date(\s+window)?\s*(?:,|\+|&|\band\b)\s*/i;
  return re.test(title) ? title.replace(re, '$1') : title;
}

function decomposeSetComposite(cmd, event) {
  if (!cmd || !_isSetCompositeTitle(cmd.title)) return cmd;
  const atomic = _eventFoundationActions(event).find((a) => !a.done);
  if (atomic) {
    return { ...cmd, title: atomic.title, consequence: atomic.consequence,
      primaryCta: atomic.cta, primaryRoute: atomic.route, category: atomic.domain };
  }
  // No atomic foundational gap remains, but a stale "Set date, …" composite still surfaced.
  // Don't return it verbatim — strip the already-satisfied date clause so the CTA can never
  // say "set date" for an event that necessarily has one.
  const title = _stripLeadingDateClause(cmd.title, event);
  return title !== cmd.title ? { ...cmd, title } : cmd;
}

// POP-1C — the ONE recommendation lifecycle. A pure read-only PROJECTION that
// maps every already-computed recommendation onto the 7 canonical states:
//   Discovered → Recommended → Accepted → Working → Blocked → Completed → Archived
// It invents no field and calls no engine eventPlan doesn't already run — every
// state is read from a signal that exists above (foundation.done, workstream
// status/blocked, ctx.decisionBlockers, ctx.activeRisks, the decision board's
// own overdue verdict) or from an event status map
// (riskStatus/decisionBlockerStatus/contextNudges = the dismissal → Archived
// path). Consumers filter by state (e.g. hide Completed/Archived) instead of
// each re-deriving "is this done?" — that duplication was the doctrine's target.
function deriveRecommendationLifecycle(event, ctx, nextActions, foundation, workstreams) {
  const items = [];
  const ev = event || {};
  const surfacedDomains = new Set((nextActions || []).map(a => a.domain).filter(Boolean));

  // Foundation dominoes: done → Completed; surfaced now → Recommended; else Discovered.
  (foundation || []).forEach(a => {
    if (!a || !a.domain) return;
    const state = a.done ? 'Completed' : (a.domain === (nextActions[0] && nextActions[0].domain) || surfacedDomains.has(a.domain)) ? 'Recommended' : 'Discovered';
    items.push({ id: a.domain, category: 'foundation', state });
  });

  // Vendor workstreams: blocked → Blocked; ready → Completed; in_progress → Working;
  // not_started → Recommended (there's work to start).
  (workstreams || []).forEach(w => {
    if (!w || !w.id) return;
    const state = w.blocked ? 'Blocked'
      : w.status === 'ready' ? 'Completed'
      : w.status === 'in_progress' ? 'Working'
      : w.status === 'not_started' ? 'Recommended'
      : 'Working';
    items.push({ id: 'workstream:' + w.id, category: 'vendor', state });
  });

  // Decision blockers (advisory): acknowledged → Accepted; else Blocked (they gate).
  const blockerStatus = ev.decisionBlockerStatus || {};
  ((ctx && ctx.decisionBlockers) || []).forEach(b => {
    if (!b || !b.type) return;
    items.push({ id: 'blocker:' + b.type, category: 'decision', state: blockerStatus[b.type] === 'acknowledged' ? 'Accepted' : 'Blocked' });
  });

  // Active risks (advisory, not yet dismissed): Recommended (a suggested mitigation).
  ((ctx && ctx.activeRisks) || []).forEach(r => {
    if (!r || !r.type) return;
    items.push({ id: 'risk:' + r.type, category: 'risk', state: 'Recommended' });
  });

  // LIFECYCLE-VERDICT-1 ("vs The Market Leaders" audit, Trust row #5): the
  // verdict line ("N decisions are past their easy window") and this
  // lifecycle's "all clear" suffix (rendered only when NOTHING is Blocked)
  // sit on the same hero — they must agree by construction, so both read the
  // SAME playbookDecisionBoard (already run by eventPlan via the next-action
  // ladder's tier 7.8). An overdue board decision IS a blocked
  // recommendation — the host's own unmade pick gates the spread, shopping,
  // and budget sizing. Same gate as the verdict (pre-event, days > 0): on the
  // day the hero points at the day, and a wrapped event stays wrapped
  // (PAST-EVENT-1) — no stale planning blame on either layer. Reachability
  // (overdue-on-creation) is the board's own rule and is inherited, not
  // re-derived: a brand-new tight-timeline event is calm on BOTH layers.
  try {
    const _d = ev.date ? daysFrom(ev.date) : null;
    if (_d != null && _d > 0) {
      const _board = playbookDecisionBoard(ev);
      (((_board && _board.open) || [])).forEach(r => {
        if (r && r.status === 'overdue') items.push({ id: 'board:' + r.id, category: 'decision', state: 'Blocked' });
      });
    }
  } catch { /* board unavailable — lifecycle projects the rest unchanged */ }

  // Archived — the dismissal path, the ONE place recommendations leave the flow:
  // any *Status map entry marked 'dismissed', plus balance-paid (vendor) events.
  const archiveFrom = (map, cat) => Object.keys(map || {}).forEach(k => {
    if (map[k] === 'dismissed') items.push({ id: cat + ':' + k, category: cat, state: 'Archived' });
  });
  archiveFrom(ev.riskStatus, 'risk');
  archiveFrom(ev.decisionBlockerStatus, 'decision');
  archiveFrom(ev.contextNudges, 'nudge');

  return items;
}

// ── WAVE-5 RANKING (2026-07-15): per-ITEM identity for the reactive top ───────
// The reactive top action's id was `top.category || 'top'` — a per-CATEGORY key.
// Snoozing "Confirm the DJ." wrote event.snoozed['vendor']; after the DJ was
// confirmed, "Confirm the caterer." INHERITED the id and was silently hidden,
// and the shell's Set-aside row showed the new title against the old date.
// The id is now derived from the underlying record (the vendor/decision/task/
// message the tier's route names), falling back to a slug of the title — never
// the bare category — so it is stable across recomputes and unique per item.
//
// Calm fillers ('neutral' Tier 8, 'calendar' Tier 7, 'heart' Tier 7.9) get NO id
// at all: the lone calm line is a state, not a task, and canSnooze() (lib/snooze)
// refuses an id-less action — so "not now" can never render on "Event on track."
const CALM_FILLER_CATEGORIES = new Set(['neutral', 'calendar', 'heart']);
const _slugTitle = (t) => String(t || '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
// WAVE-8 (2026-07-15): which registry surface owns a vendor debt, keyed by the route
// SECTION the ladder deep-links to. This lets _topActionId key a ladder vendor top with
// the SAME 'surface:<surface>:<vendorId>' its registry raiser emits, so the two
// producers' ids collapse on identity: an overdue payment (vendorSection 'payment') and
// its vendor-payments raise, a critical COI (vendorSection 'documents') and its
// vendor-coi raise. A vendor ask with no section has no registry twin (see _topActionId).
const VENDOR_SECTION_SURFACE = { payment: 'vendor-payments', documents: 'vendor-coi' };
export function _topActionId(cmd) {
  if (!cmd || !cmd.title) return null;
  if (CALM_FILLER_CATEGORIES.has(cmd.category)) return null; // calm filler → unsnoozeable by construction
  const r = cmd.primaryRoute || {};
  // WAVE-6 (2026-07-15): ONE canonical id for a decision debt, whoever produces it.
  // Tier 2 wrote 'top:decision:<taskId>', tier 7.8 wrote 'top:decision:<slug>' and
  // the registry wrote 'surface:decisions:<key>' — three ids for what can be the
  // SAME record, so a snooze written against one producer detached the moment
  // another producer picked the debt up. Every decision-category action whose
  // record is known now keys 'decision:<recordId>' (the board/playbook decision id,
  // the timeline task id, or the blocker's own decision key), and the registry
  // splice in eventPlan uses the SAME form — the snooze follows the debt.
  if (cmd.category === 'decision') {
    const decRec = cmd.decisionId || r.decisionId || cmd.decision || r.foodFocus || null;
    if (decRec != null) return 'decision:' + String(decRec);
  }
  // WAVE-8 (2026-07-15): ONE canonical id for a vendor debt, whoever produces it —
  // mirroring the decision unification above. The registry raises a vendor debt as
  // 'surface:<vendor-surface>:<vendorId>' (vendor-payments / vendor-coi); the ladder
  // surfaced the SAME debt — the overdue payment (tier 4) and critical COI (tier 4.2) —
  // as a generic 'top:vendor:<vendorId>'. Two ids for one debt: a snooze written against
  // one producer detached the moment the other picked the debt up — the exact structure
  // the decision fix closed, still open for vendors. The debt's SECTION (the route's
  // vendorSection) names which surface it is, so the ladder top keys the SAME id the
  // registry emits and the two collapse on identity, not just on title prose. A vendor
  // ask with no section (an unconfirmed booking, caterer drift) has no registry twin and
  // keeps the generic 'top:vendor:<vendorId>' form (snoozeIntegrity + wave6 pin this).
  if (cmd.category === 'vendor' && r.vendorId != null) {
    const surface = VENDOR_SECTION_SURFACE[r.vendorSection];
    if (surface) return 'surface:' + surface + ':' + String(r.vendorId);
  }
  // The row the action routes to IS its identity — same doctrine as the registry
  // itemKey (RE-AUDIT F4). Only the bare category is forbidden. WAVE-8: guestId joins
  // the precedence — a tier routing purely on a guest row (none live today, but the
  // seating/travel registry raisers route on guestId) must key the record, not slug a
  // prose title. The list mirrors the test's RECORD_ROUTE_FIELDS exactly.
  const rec = r.vendorId || r.decisionId || r.taskId || r.commId || r.riskId
    || r.timelineId || r.guestId || r.foodFocus || null;
  return 'top:' + (cmd.category || 'top') + ':' + (rec != null ? String(rec) : _slugTitle(cmd.title));
}

// eventPlan(event) — the public single source. Exported and consumed by every surface.
export function eventPlan(event, ctx = null) {
  if (!event) return {
    nextActions: [], setAside: [], worries: [], progress: { done: 0, total: 0 }, handled: [],
    vendorReadiness: { total: 0, booked: 0, confirmed: 0, toConfirm: 0, needsAttention: 0 }, workstreams: [],
    vendorReadinessRollup: {
      status: 'not_started', label: 'No vendors added yet', nextAction: 'Add your first vendor.',
      ctaLabel: 'Add vendor', target: { tab: 'Vendors', focusField: 'vendor-add' }, reason: null,
      counts: { total: 0, ready: 0, confirmed: 0, toConfirm: 0, needsAttention: 0, missing: 0 },
    },
    planningState: { currentPriority: null, currentWorkstream: null, currentMilestone: null, nextMilestone: null, blockedDecisions: [], recommendationLifecycle: undefined, deepLink: null, reasoning: null, confidence: undefined },
  };

  // POP-1B — SINGLE CONSUMER OF EXPERIENCE CONTEXT: derive ctx here when the
  // caller didn't pass one, so no planning surface has to build/wire it
  // separately. eventPlan consumes only ctx.decisionBlockers (event-derived,
  // profile-independent), so a null-profile build is complete for this use.
  // An explicit ctx from the caller wins (e.g. profile-enriched).
  if (!ctx) {
    try { ctx = buildExperienceContext(event, null, undefined); } catch { ctx = null; }
  }

  const foundation = _eventFoundationActions(event);
  // The SAME ledger the "Where you stand" tile counts — read once, here, so the action
  // list and the progress tile cannot form independent opinions. (See "ONE LEDGER" below.)
  let phaseProgressForPlan = null;
  try { phaseProgressForPlan = deriveEventPhaseProgress(event); } catch (_e) { phaseProgressForPlan = null; }
  const progress = {
    done: foundation.filter(a => a.done).length,
    total: foundation.length,
  };
  const handled = foundation.filter(a => a.done && a.handledFact).map(a => a.handledFact);

  // The reactive engine owns the rich, routed #1 once the foundation is underway; for a
  // brand-new event the engine ALSO returns the foundational simple-win ("Add your guest
  // list"). Either way its output is the authoritative, state-aware top action — so we
  // lead nextActions with it, then append the remaining not-done foundational dominoes
  // (deduped by domain so the same domain never appears twice).
  // Decompose a stale "Set date, headcount, menu" composite into the atomic remaining
  // domino BEFORE it becomes the hero — the doctrine's single-source decomposition.
  const top = decomposeSetComposite(
    (() => { try { return _selectEventNextActionInner(event); } catch { return null; } })(),
    event,
  );
  // WAVE-6: days-to-event, read once — dueInDays for any action carrying a real
  // leadDays is dte + leadDays (the same relation lib/taskLead computes; a derived
  // number, not an invented one). Actions with no lead keep dueInDays null.
  const _dte = event.date ? daysFrom(event.date) : null;
  const _dueFromLead = (leadDays) =>
    (Number.isFinite(leadDays) && _dte != null) ? _dte + Number(leadDays) : null;
  // Phase-id → canonical AREA domain (hoisted: both the hero below and the phase splice use it).
  const PHASE_TO_DOMAIN = {
    datetime: 'date', date: 'date', location: 'venue', headcount: 'guests', food: 'food',
    budget: 'budget', vendors: 'vendors', rain: 'rain', shopping: 'shopping',
    crabs: 'food', payments: 'vendors', thankyous: 'guests', rentals: 'rentals',
  };
  // If the reactive hero shares a row-level route with a phaseProgress item, they are the
  // SAME concern — captured here so topDomain (below) can adopt that concern's AREA domain
  // rather than the coarse category map that assumes every 'readiness' hero is the budget step.
  const _topFocus = top && top.primaryRoute && top.primaryRoute.focusField;
  const _topPhaseMatch = _topFocus
    ? ((phaseProgressForPlan && phaseProgressForPlan.items) || []).find((it) => it && it.route && it.route.focusField === _topFocus)
    : null;
  const topAction = top && top.title ? {
    // WAVE-5 RANKING (2026-07-15): per-ITEM id, not per-category — snooze keys on
    // this, and a category key made "Confirm the caterer" inherit the DJ's snooze
    // (see _topActionId above). Calm fillers get null → never snoozeable.
    id: _topActionId(top),
    domain: top.category || 'top',
    title: top.title,
    // DOCTRINE (2026-07-22): the producer's declared classification rides the
    // action — this rebuild has a history of dropping fields (F1 level, F7
    // leadDays); sourceCategory joined the list and the shell fell back to
    // title-prose sniffing. Carried explicitly now.
    sourceCategory: top.sourceCategory || null,
    consequence: top.consequence || null,
    cta: top.primaryCta || null,
    route: top.primaryRoute || null,
    // The ladder hero must carry primaryRoute too, not only `route` — every OTHER producer
    // (phaseProgress, surfaceRegistry) sets both, and the shell + the row-level-route contract
    // read primaryRoute. Without it, when the hero represents a phase concern (e.g. the rain
    // backup) and dedup keeps the richer ladder row, that row's primaryRoute was undefined —
    // dropping the row-level deep-link the phase item had.
    primaryRoute: top.primaryRoute || null,
    // RE-AUDIT F1 (fresh-eyes, 2026-07-14): `level` was DROPPED here. The selector stamps
    // level:'critical' on overdue payments, decisions and COI — and this rebuild threw the
    // stamp away, so canSnooze() saw no 'critical' and rendered "not now" on "Send payment
    // to X": the app's single worst item was the one item a host could silence. The doctrine
    // line — a critical is never a someday — was false exactly at the top of the list.
    level: top.level || null,
    category: top.category || null,
    // RE-AUDIT F7 (fresh-eyes, 2026-07-14): `leadDays` was ALSO dropped here — and it is
    // the number the snooze lead-window cap reads (lib/snooze.js proposedSnoozeDays,
    // opts.leadDays). Nothing upstream ever handed the top action a real lead, so the
    // cap was DEAD CODE at the exact spot it matters most: a decision 4 days from its
    // window could be proposed a 10-day snooze and quietly slept past the point of no
    // return. The ladder's overdue-decision tier now attaches it; copy it through.
    leadDays: top.leadDays ?? null,
    // WAVE-6: the real clock, derived from the lead where one exists — band-1
    // ordering and the shell both read this; null where the engine has no number.
    dueInDays: _dueFromLead(top.leadDays),
    done: false,
    // WAVE-5 RANKING (2026-07-15): name the producer, like phaseProgress and
    // surfaceRegistry actions already do — selectEventNextAction reads this to
    // know whether the band-sorted head is the ladder's own top (render the rich
    // ladder result) or another producer's (return the head itself). One #1.
    source: 'ladder',
  } : null;

  // Map the top action's category to a foundational domain so we can dedupe — e.g. the
  // engine's 'readiness' budget step and the foundational 'budget' domino are the same
  // thing and must not both appear.
  // RE-AUDIT F3: the reactive vendor tier ("Confirm X.", category 'vendor') and the phase
  // ledger's vendors item ("Follow up with X") are the SAME gap from the same
  // isVendorConfirmed read — but 'vendor' ≠ 'vendors' so the dedup missed and one vendor got
  // two cards. Mapped.
  const CATEGORY_TO_DOMAIN = { start: 'guests', readiness: 'budget', vendor: 'vendors' };
  // The coarse category map assumes every 'readiness' hero is the budget step — false when the
  // readiness hero is a rain backup (or any other readiness concern). So for a 'readiness' hero
  // that IS a phase concern (matched by row-level route), take that concern's AREA domain
  // (rain/budget/…). Narrowed to 'readiness' ONLY: a food DECISION hero shares the food-plan
  // route with the food SUMMARY but is not it, and must not adopt 'food' and dedupe the summary.
  const topDomain = topAction
    ? ((top.category === 'readiness' && _topPhaseMatch)
        ? (PHASE_TO_DOMAIN[_topPhaseMatch.id] || _topPhaseMatch.id)
        : (CATEGORY_TO_DOMAIN[top.category] || top.category))
    : null;
  // WAVE-5 INTEGRATION (2026-07-15): the action carries the MAPPED domain, not the raw
  // category — 'vendor' (singular) is invisible to the shell's DOMAIN_LENS ('vendors'),
  // which filed "Confirm Fired Up BBQ." under Plan while every other vendor ask sat in
  // the Vendors lens. Same one-vocabulary rule as the dedup below.
  if (topAction) topAction.domain = topDomain;

  const seen = new Set(topDomain ? [topDomain] : []);
  // WAVE-6: the top action's canonical id joins the dedup set so a registry raise
  // for the SAME record (e.g. tier 7.8's board decision vs the decisions surface)
  // collapses on identity, not just on title prose.
  if (topAction && topAction.id) seen.add(topAction.id);
  // DEDUP ON TITLE, NOT JUST DOMAIN. The domain map (CATEGORY_TO_DOMAIN) only knows two
  // cases, so a reactive top action whose category is e.g. 'operational' but whose TITLE is
  // "Decide what you're serving" was not deduped against the phase ledger's 'food' item with
  // the same title — the crab feast showed that exact task TWICE. Two actions with the same
  // rendered title are the same task, whatever engine made them and whatever domain each
  // assigned. Normalize away the trailing period and the "· N open" tail so near-identical
  // renders collapse.
  const titleKey = (t) => String(t || '').toLowerCase().replace(/·[^·]*$/, '').replace(/[.\s]+$/, '').trim();
  const seenTitles = new Set();
  const nextActions = [];
  if (topAction) { nextActions.push(topAction); seenTitles.add(titleKey(topAction.title)); }
  for (const a of foundation) {
    if (a.done) continue;            // satisfied dominoes never surface as a next action
    if (seen.has(a.domain)) continue; // already represented (e.g. by the engine top)
    if (seenTitles.has(titleKey(a.title))) continue;
    seen.add(a.domain); seenTitles.add(titleKey(a.title));
    nextActions.push(a);
  }

  // ── ONE LEDGER (2026-07-14) ─────────────────────────────────────────────────
  // The attention system had TWO ledgers and the wrong one did the talking.
  //
  // `foundation` is FOUR dominoes — date, guests, budget, food. That is the entire
  // vocabulary of "N things need you". Meanwhile deriveEventPhaseProgress tracks the
  // REAL surface: location, shopping, vendors, RAIN PLAN, the crab order, over-budget —
  // each already carrying a `cueLabel` and a working row-level `route`.
  //
  // So the engine that KNEW was not the engine that SPOKE. Measured on an outdoor August
  // crab feast with the four dominoes set: phaseProgress held {id:'rain', handled:false,
  // cueLabel:'Add a rain backup', route:{tab:'Event Details', focusField:'rain-plan'}} and
  // {id:'food', cueLabel:"Decide what you're serving · 2 open"} — while nextActions
  // returned ONE item: the generic "Catch up on overdue planning tasks." The host was told
  // there was one vague thing to do, by an app that already knew the two specific ones and
  // how to deep-link to both. The same gap let "N things need you" report 1 while "Where
  // you stand" said 2 of 5 areas were open, 300px apart on one screen.
  //
  // The phase ledger now feeds the action list. It is the SAME items the "Where you stand"
  // tile counts, so the two numbers are two views of one truth rather than two opinions.
  // Ordering is the phase engine's own `priority` — the reactive top action still leads,
  // because a vendor who hasn't confirmed outranks a domino by construction.
  // (PHASE_TO_DOMAIN is hoisted above topAction so the hero can adopt a phase area domain.)
  // WAVE-6: read the registry ONCE, ahead of the phase splice — the record-level
  // dedup below needs to know which decision RECORDS the registry raises before the
  // phase ledger's summary item gets to claim them.
  let raised = [];
  try { raised = raiseAll(event) || []; } catch (_e) { raised = []; }
  const raisedDecisionKeys = new Set(
    raised.filter((r) => r.surface === 'decisions' && r.key != null).map((r) => r.key),
  );
  try {
    const phaseItems = (phaseProgressForPlan && phaseProgressForPlan.items) || [];
    const openPhase = phaseItems
      .filter(i => i && !i.handled && i.cueLabel && i.route)
      .sort((a, b) => (a.priority || 9) - (b.priority || 9));
    for (const i of openPhase) {
      const domain = PHASE_TO_DOMAIN[i.id] || i.id;
      if (seen.has(domain)) continue;   // the foundation or the reactive top already says it
      if (seenTitles.has(titleKey(i.cueLabel))) continue;   // same task, different engine
      // ── WAVE-6 RECORD-LEVEL DEDUP ────────────────────────────────────────────
      // The food cue ("Decide what you're serving · 3 open") COUNTS choice records
      // the `decisions` surface also raises individually — same playbook ids on
      // both sides (phaseProgress exposes them as i.records). Direction chosen: the
      // PER-ITEM raises win and the summary drops its claim to exactly those
      // records — the raises carry row-level routes (decisionId) and fold into the
      // surface's bundle below, while the summary can only land on the plan top; a
      // list must never bill one record twice across a summary and its own row.
      let cueLabel = i.cueLabel;
      if (Array.isArray(i.records) && i.records.length && raisedDecisionKeys.size) {
        const remaining = i.records.filter((id) => !raisedDecisionKeys.has(String(id)));
        if (remaining.length === 0) continue;              // every record is individually raised
        if (remaining.length < i.records.length) {
          // The summary keeps only the records nobody else raises — recount honestly.
          cueLabel = String(i.cueLabel).replace(/·\s*\d+\s+open/, `· ${remaining.length} open`);
        }
      }
      seen.add(domain); seenTitles.add(titleKey(cueLabel));
      nextActions.push({
        id: 'phase:' + i.id,
        domain,
        title: cueLabel,
        // The phase engine's cue is the whole sentence; it has no separate consequence
        // line, and inventing one would be fabricating a reason. Left null honestly.
        consequence: null,
        // BOTH KEYS, and the ones the CONSUMER actually reads.
        //
        // When I merged the phase ledger into nextActions (14f4973) I set `primaryRoute` and
        // `ctaLabel` — plausible names, both of which exist elsewhere in this file, and
        // NEITHER of which HostShellV2 reads. The card renders `a.cta` (:4615) and routes on
        // `a.route` (onCta/wiredKind). So the phase actions shipped into the ranked list
        // saying exactly the right thing, with NO BUTTON and NO ROUTE — the very "pure
        // anxiety, cannot act on it" failure the attention audit had just called critical, and
        // I reintroduced it while fixing it. Caught only because "Set the start time" needed a
        // working route to be worth adding at all.
        //
        // The foundation actions right above use `route` + `cta`. That is the contract.
        route: i.route,
        primaryRoute: i.route,
        cta: 'Go',
        ctaLabel: 'Go',
        level: 'attention',
        category: 'phase',
        done: false,
        source: 'phaseProgress',
        // WAVE-5 RANKING (2026-07-15): the snooze lead cap (lib/snooze.js) reads
        // opts.leadDays off the action. A phase item maps to its underlying
        // timeline task's authored lead WHERE ONE EXISTS (a route naming a task);
        // essentials with no authored lead keep null — an uncapped half-runway
        // snooze is then honest, and inventing a lead here would be fabrication.
        leadDays: (i.route && i.route.taskId)
          ? taskLeadDays((event.timeline || []).find(t => t && t.id === i.route.taskId))
          : null,
      });
      // WAVE-6: derive the clock from the lead where one exists (null stays null).
      const _justPushed = nextActions[nextActions.length - 1];
      _justPushed.dueInDays = _dueFromLead(_justPushed.leadDays);
    }
  } catch (_e) { /* phase ledger unavailable — the foundation list stands unchanged */ }

  // ── THE SURFACE REGISTRY ────────────────────────────────────────────────────
  // The attention audit's #1 structural finding: only 2 of 7 attention producers fed this
  // list. Risks, vendor conflicts, the day-of alert stack and the arrival asks all ran, were
  // all correct in isolation, and all reached NOTHING — a weather risk on an outdoor event
  // could not outrank "Plan the food", not because it ranked low but because it could not
  // ENTER THE LIST AT ALL. Each was hand-wired to one passive row, or to one sheet a host
  // might never open.
  //
  // Now every surface DECLARES what it raises (lib/surfaceRegistry.js) and this reads the
  // declaration. Criticals lead — a caterer who hasn't arrived outranks a domino by
  // construction — and dedupe is by domain, so a surface already speaking for itself in the
  // list is not doubled.
  //
  // The rule the registry exists to enforce: a surface cannot be silent by ACCIDENT. It can
  // only be silent by declaring nothing, visibly, in one file.
  // WAVE-6: what the host set down, carried out of eventPlan as `setAside` — the
  // shell renders its Set-aside pile from THIS, and nextActions is post-snooze.
  const setAside = [];
  // ── WAVE-7: THE WORRY LANE LIVES IN THE ENGINE (2026-07-15) ─────────────────
  // The worry split used to live only in the V2 shell (HostShellV2 isWorry) — so
  // every OTHER consumer (V1 heroes, mayExhale, App.js auto-route, the reveal's
  // step count, planningState) spoke the worry-INCLUSIVE head. The split moves
  // here, into the single source: a WORRY is a raise from the registry's `risks`
  // surface at level 'attention' (risk raises are attention-only today; if a
  // risks item were ever critical it is WORK and stays in nextActions — a
  // critical never files as a worry). The risks bundle (bundle:risks) is a worry
  // wholesale. Worries keep the full action shape (id/title/consequence/route/
  // cta) — actionable heads-ups, just uncounted and unranked: they leave
  // nextActions BEFORE banding/counting, so no count, hero, or grounding line
  // ever bills a contingency as a chore.
  //
  // SNOOZE SEMANTICS (decided + documented, wave-7): a worry is NOT snoozeable —
  // a heads-up row has no "not now" (its lane is already the quiet lane; the
  // dismissal path is riskStatus, the ONE place risks leave the flow). Worries
  // keep their ids (React keys + riskStatus routing), but the shell must not
  // offer snooze on the heads-up lane. Back-compat: a risk snoozed BEFORE this
  // split (pass 2 below) still honors its date in setAside until it lapses.
  const worries = [];
  try {
    const criticals = raised.filter(r => r.severity === 'critical');
    const rest = raised.filter(r => r.severity !== 'critical');
    // RE-AUDIT F2: `insertAt = topAction ? 1 : 0` put every registry critical BEHIND the
    // reactive top — whatever it was. The selector always returns something, including calm
    // filler ("Event on track. Nothing urgent right now."), so the hero could read "2 things
    // need you · first: Event on track…" with a CRITICAL parked second. Criticals lead over
    // ANY non-critical top; a reactive top that is itself critical (a payment) stays first.
    let insertAt = (topAction && topAction.level === 'critical') ? 1 : 0;
    // ── Pass 1: collect deduped per-item actions, RECORD-KEYED ─────────────────
    const registryActions = [];
    for (const r of [...criticals, ...rest]) {
      // WAVE-6 RECORD-KEYED IDENTITY. The old key was vendorId||riskId with a
      // TITLE fallback — and titles carry live counts ('2 confirmed guests still
      // need seats'), so the id changed every time the count moved and the snooze
      // detached. The raiser now declares its own record (`key`: decisionId,
      // guestId, itemType:itemId…); an aggregate raise that deliberately declares
      // NO record (lodging, ground) uses the surface id ALONE — stable whatever
      // the count says. Only when a keyless surface raises SIBLINGS (no in-repo
      // raiser does) do the extras fall back to the normalized title, so they
      // dedup-collide loudly in tests instead of silently shadowing each other.
      const rec = r.key != null ? r.key : null;
      // ONE canonical id per decision debt (see _topActionId): the decisions
      // surface keys 'decision:<recordId>' — the SAME form the ladder's tiers use —
      // so a snooze follows the debt across producers.
      let itemKey;
      if (r.surface === 'decisions' && rec != null) itemKey = 'decision:' + rec;
      else if (rec != null) itemKey = 'surface:' + r.surface + ':' + rec;
      else {
        const siblings = raised.filter((x) => x && x.surface === r.surface).length;
        itemKey = siblings > 1
          ? 'surface:' + r.surface + ':' + titleKey(r.title)
          : 'surface:' + r.surface;
      }
      if (seen.has(itemKey) || seenTitles.has(titleKey(r.title))) {
        // WAVE-8 (2026-07-15): the collapsing registry twin can carry a real clock the
        // surviving card lacks. A ladder payment/COI top has no leadDays, so its
        // dueInDays is null — while the registry's vendor-payments/vendor-coi raise for
        // the SAME debt carries the vendor's actual overdue days. Before wave-8 the
        // null-clock ladder card simply won the dedup and the most-overdue critical lost
        // its clock (it sank in the band-1 dueInDays sort as if it had no deadline).
        // Thread the twin's dueInDays/leadDays onto the survivor so the surviving card
        // keeps the real deadline. Only fill a gap — never overwrite a clock the
        // survivor already has.
        const rtk = titleKey(r.title);
        const survivor = nextActions.find((a) => a && (a.id === itemKey || titleKey(a.title) === rtk))
          || registryActions.find((a) => a && (a.id === itemKey || titleKey(a.title) === rtk));
        if (survivor) {
          if (survivor.dueInDays == null && r.dueInDays != null) survivor.dueInDays = r.dueInDays;
          if (survivor.leadDays == null && r.leadDays != null) survivor.leadDays = r.leadDays;
        }
        continue;
      }
      seen.add(itemKey); seenTitles.add(titleKey(r.title));
      registryActions.push({
        // WAVE-5 RANKING (2026-07-15): `domain` is the surface's PLAIN domain
        // ('vendors' | 'risks' | 'day'), not the old 'surface:*' form — the shell's
        // DOMAIN_LENS files a vendor raise under the Vendors lens off exactly this
        // word. The snooze/dedup key (itemKey/id) is separate.
        id: itemKey, domain: r.domain,
        title: r.title,
        // DOCTRINE (2026-07-22): the raiser's declared classification rides the
        // action to the shell — the shell must never re-sniff it from title
        // prose (the Layer-2 harness caught this exact field dropping here).
        sourceCategory: r.sourceCategory != null ? r.sourceCategory : null,
        consequence: r.why,
        route: r.route, primaryRoute: r.route,
        cta: 'Go', ctaLabel: 'Go',
        level: r.severity, category: 'surface',
        done: false, source: 'surfaceRegistry', surface: r.surface,
        // WAVE-6: the raiser's own clock (decision daysOut, payDueDate, COI line,
        // reconfirm window) — null where the engine has none. leadDays is what the
        // snooze cap reads; with it, a past-window decision is REFUSED a snooze
        // (the wave-6 proof: 4 past-window decisions were offered "back Jul 20").
        dueInDays: r.dueInDays != null ? r.dueInDays : null,
        leadDays: r.leadDays != null ? r.leadDays : null,
      });
    }
    // ── Pass 2: per-item snoozes drop children BEFORE bundling ─────────────────
    // (so a bundle's count reflects only what is actually up; a critical ignores
    // its own stale snooze, as everywhere). Set-aside children carry their dates.
    const visible = [];
    for (const a of registryActions) {
      if (a.level !== 'critical' && isSnoozed(event, a.id)) {
        setAside.push({ ...a, snoozedUntil: snoozedUntil(event, a.id) });
      } else visible.push(a);
    }
    // ── Pass 3: bundle — one surface contributing ≥3 raises becomes ONE action ──
    // Registry surfaces only (never phase/foundation/ladder items — those are
    // curated singles already). Shape is the shell contract: { id:'bundle:<surface>',
    // kind:'bundle', title, level, category:'surface', domain, route, count, items }.
    const bySurface = new Map();
    for (const a of visible) {
      if (!bySurface.has(a.surface)) bySurface.set(a.surface, []);
      bySurface.get(a.surface).push(a);
    }
    const merged = [];
    for (const [surfaceId, group] of bySurface) {
      if (group.length < 3) { merged.push(...group); continue; }
      const meta = surfaceMeta(surfaceId);
      const dues = group.map((a) => a.dueInDays).filter((n) => Number.isFinite(n));
      const leads = group.map((a) => a.leadDays).filter((n) => Number.isFinite(n));
      merged.push({
        id: 'bundle:' + surfaceId,
        kind: 'bundle',
        // The surface's own host-language title — the raise vocabulary, counted.
        title: meta ? meta.bundleTitle(group.length)
          : `${group.length} things need a look`,
        consequence: null,               // the children carry the specifics
        level: group.some((a) => a.level === 'critical') ? 'critical' : 'attention',
        category: 'surface',
        domain: group[0].domain,
        route: (meta && meta.route) || group[0].route,
        primaryRoute: (meta && meta.route) || group[0].route,
        cta: 'Go', ctaLabel: 'Go',
        count: group.length,
        items: group,                    // the children, in their internal order
        done: false, source: 'surfaceRegistry', surface: surfaceId,
        dueInDays: dues.length ? Math.min(...dues) : null,   // most urgent child
        // Tightest child window governs the bundle's snooze cap (most negative
        // lead = earliest close); snoozing the bundle sets aside ALL children
        // (see lib/snooze.js bundle semantics).
        leadDays: leads.length ? Math.min(...leads) : null,
      });
    }
    for (const action of merged) {
      // WAVE-7 worry split (see the lane header above): an attention-level raise
      // from the risks surface — single or bundle — files as a worry, not work.
      // A critical from risks (none exists in-repo today) stays in the list.
      if (action.surface === 'risks' && action.level !== 'critical') { worries.push(action); continue; }
      if (action.level === 'critical') { nextActions.splice(insertAt++, 0, action); }
      else nextActions.push(action);
    }
  } catch (_e) { /* registry unavailable — the list stands unchanged */ }

  // ── RE-AUDIT F5 + F6 (fresh-eyes, 2026-07-14): the merge gets a spine ────────
  // F5 — A CALM FILLER BESIDE REAL WORK IS A CONTRADICTION. The ladder ALWAYS
  // returns something; its calm tiers ('neutral' Tier 8, 'calendar' Tier 7,
  // 'heart' Tier 7.9) exist to fill an EMPTY list, not to compete in a full one.
  // Merged ahead of real items they produced the live absurdity: "2 things need
  // you · first: Event on track. Nothing urgent right now." A filler's entire
  // claim is that nothing else is open — so the moment anything else IS open,
  // every filler leaves. When ONLY fillers exist, exactly the first survives:
  // that is the calm state, said once.
  // F6 — SEVERITY WAS SPLICE POSITION, NOT A COMPUTED ORDER. Registry criticals
  // were hand-spliced ahead (F2), but nothing GUARANTEED a critical from any
  // producer beats a non-critical from any other. Band the whole list —
  // critical (0) → real work (1) → calm (2) — with a STABLE sort so each
  // producer's own internal ranking (insertion order) survives within a band.
  // (One vocabulary: the same CALM_FILLER_CATEGORIES set _topActionId uses to
  // withhold a snooze id — the filler gate and the no-snooze rule cannot drift.)
  const _isCalmFiller = (a) => !!a && CALM_FILLER_CATEGORIES.has(a.category);
  // WAVE-7: a live worry ALSO purges the fillers. A filler's claim is that nothing
  // is open; with a heads-up standing, the honest queue is EMPTY (the shell's
  // heads-up lane and the V1 exhale speak for the state), not "Event on track."
  // beside "Have a plan for: rain". Only-worries ⇒ nextActions [] by construction.
  if (nextActions.some((a) => !_isCalmFiller(a)) || worries.length > 0) {
    for (let i = nextActions.length - 1; i >= 0; i--) {
      if (_isCalmFiller(nextActions[i])) nextActions.splice(i, 1);
    }
  } else if (nextActions.length > 1) {
    nextActions.splice(1); // only fillers: one calm line, never a stack of them
  }
  const _severityBand = (a) => (a && a.level === 'critical') ? 0 : (_isCalmFiller(a) ? 2 : 1);
  // WAVE-6 shell contract: every ranked action exposes dueInDays and leadDays as
  // number|null — a uniform read, never a sometimes-missing field. Null stays
  // null: no invented numbers, only normalization of absence.
  for (const a of [...nextActions, ...worries]) {
    if (!a) continue;
    a.dueInDays = Number.isFinite(a.dueInDays) ? a.dueInDays : null;
    a.leadDays = Number.isFinite(a.leadDays) ? a.leadDays : null;
  }
  // WAVE-6 BAND-1 ORDERING: within the attention band, TIME-TO-WINDOW decides —
  // dueInDays ascending (most past-due first, then soonest), nulls last, stable
  // within ties so each producer's internal ranking survives. Criticals stay band
  // 0 (their urgency is categorical, not a date race); the calm band stays 2.
  nextActions.sort((a, b) => {                    // Array.prototype.sort is stable (V8)
    const ba = _severityBand(a), bb = _severityBand(b);
    if (ba !== bb) return ba - bb;
    if (ba === 1) {
      const da = Number.isFinite(a.dueInDays) ? a.dueInDays : Infinity;
      const db = Number.isFinite(b.dueInDays) ? b.dueInDays : Infinity;
      if (da !== db) return da - db;
    }
    return 0;
  });

  // ── WAVE-6: ONE POST-SNOOZE TRUTH ───────────────────────────────────────────
  // Snooze applies HERE, inside the single source — `nextActions` is post-snooze
  // and `setAside` carries what the host set down (with its comeback date), so
  // selectEventNextAction, planningState.currentPriority/reasoning, the V1
  // heroes and the shell all read the same head and none can speak a set-aside
  // item. A critical ignores its own stale snooze (the standing rule); calm
  // fillers carry no id and pass through untouched. Bundles set aside as a unit
  // (bundle id covers all children — lib/snooze.js documents the semantics).
  for (let i = nextActions.length - 1; i >= 0; i--) {
    const a = nextActions[i];
    if (!a || !a.id || a.level === 'critical') continue;
    if (isSnoozed(event, a.id)) {
      setAside.unshift({ ...a, snoozedUntil: snoozedUntil(event, a.id) });
      nextActions.splice(i, 1);
    }
  }

  // PAST-EVENT-1 — a wrapped event's action list must agree with the phase engine
  // (deriveEventPhaseProgress already returns 'post_event' / "Wrap-up" for it): it
  // doesn't help a host to be told "3 things need you" about a party that happened
  // years ago. Once the event is unambiguously in the past, no domino surfaces as a
  // next action — progress/handled above still reflect real completion, unaffected.
  // WAVE-6: the set-aside pile empties too — a party that already happened has
  // nothing waiting to come back.
  const _eventDays = event.date ? daysFrom(event.date) : null;
  // WAVE-7: the worry lane empties too — a party that already happened has no
  // contingencies left to hold. (The risks surface already declines to raise on a
  // past event; this is the same wipe the other two lanes get, for symmetry.)
  if (_eventDays != null && _eventDays < 0) { nextActions.length = 0; setAside.length = 0; worries.length = 0; }
  // Read-only, additive — does not affect nextActions ranking/ordering.
  // vendorReadiness is now derived FROM workstreams (single computation), not a
  // parallel flat tally, so eventPlan/HostHome and any workstream-aware surface
  // can never disagree about the vendor count.
  const workstreams = workstreamsFor(event, ctx, event.vendors);
  const vendorReadiness = workstreamReadinessRollup(event, ctx, event.vendors);
  // POP-1 Phase 1 (exact first slice): the presentational rollup Vendors' top-line
  // now reads instead of building its own "N booked · M to follow up" copy locally —
  // same underlying workstreams/vendorReadiness data, just shaped for direct render.
  // (Named vendorReadinessRollupPresentation locally to avoid shadowing the
  // top-level exported vendorReadinessRollup(event) function in this same file —
  // the returned object key below is still `vendorReadinessRollup`.)
  const vendorReadinessRollupPresentation = buildVendorReadinessRollup(event, ctx, event.vendors);

  // POP-1.1 Objective 1: EXPOSE + COMPOSE only — a read-only mapping over fields
  // that already exist above. No new computation, no change to nextActions
  // ranking/ordering, no new engine. `confidence` and `recommendationLifecycle`
  // are honestly left null/undefined where no existing signal supports them yet
  // (see docs/POP1_1_CONSOLIDATION_REPORT.md — inventing a value here would
  // violate "no duplicate logic / no new engines").
  const leadAction = nextActions[0] || null;
  const nextMilestone = foundation.find(a => !a.done) || null;
  const lastCompletedMilestone = [...foundation].reverse().find(a => a.done) || null;
  const planningState = {
    currentPriority: leadAction ? leadAction.title : null,
    currentWorkstream: (leadAction && leadAction.domain && workstreams.some(w => w.id === leadAction.domain)) ? leadAction.domain : null,
    currentMilestone: lastCompletedMilestone ? lastCompletedMilestone.title : null,
    nextMilestone: nextMilestone ? nextMilestone.title : null,
    blockedDecisions: (ctx && Array.isArray(ctx.decisionBlockers)) ? ctx.decisionBlockers : [],
    // POP-1C: one lifecycle, projected read-only from state that already exists.
    recommendationLifecycle: deriveRecommendationLifecycle(event, ctx, nextActions, foundation, workstreams),
    deepLink: leadAction ? (leadAction.route || null) : null,
    reasoning: leadAction ? (leadAction.consequence || null) : null,
    confidence: undefined, // no existing per-action confidence signal to compose — not invented here
  };

  // WAVE-6: setAside rides out beside nextActions — one post-snooze truth.
  // WAVE-7: worries ride out too — the heads-up lane, uncounted and unranked,
  // never in nextActions. Null-event and error paths return worries: [] (the
  // registry try/catch above leaves the array empty, same as setAside).
  return { nextActions, setAside, worries, progress, handled, vendorReadiness, workstreams, planningState, vendorReadinessRollup: vendorReadinessRollupPresentation };
}

// L3 — within a single event for the Event Command Center top panel.
// Sprint 57f.2: thin wrapper around the priority-ladder that attaches a
// compact compression sub-badge when a higher-priority NBA pre-empted the
// compression tier (4.5). The badge is context, not the primary signal —
// NextBestActionPanel renders it as a one-line secondary chip with a
// "Review compressed tasks" CTA routing to the Planning Tasks compressed
// filter. When the primary NBA already IS the compression tier, no
// sub-badge is attached (it would duplicate the primary).
// Sprint 55M — producer-side renderer seam (Pattern 011). The public producer is a
// thin wrapper: it composes the engine action (UNCHANGED) then renders it once at the
// single exit for the event's persona. With VOICE={} the render is the identity
// function, so every one of the ~12 consumers receives byte-identical output today.
// The engine (_selectEventNextActionInner) and the sub-badge composer below are not
// touched; persona can only rephrase title/consequence/primaryCta (see nextActionRenderer).
//
// SINGLE SOURCE: this is now a thin wrapper over eventPlan — it renders the SAME #1
// action (eventPlan(event).nextActions[0], which is _selectEventNextActionInner's result)
// that the ribbon, Focus THE ONE, and the per-tab heroes all read, so they can never
// disagree about the top step. The compression sub-badge + persona voice + identity
// `because` are layered on top of that one action (kept for back-compat).
export function selectEventNextAction(event) {
  // PHASE-HERO-1: the hero must never sell planning after the event, and on
  // the day itself it points at the day, not stale setup. Same phase engine
  // as the header bar (deriveEventPhaseProgress) — the two can't disagree.
  try {
    const pp = deriveEventPhaseProgress(event);
    if (pp && pp.phase === 'post_event') {
      if (!pp.nextCue) return null; // all wrapped up — surfaces show their done states
      return {
        level: 'neutral', category: 'wrapup',
        title: `${pp.nextCue.label}.`,
        consequence: 'The event is done — this is the last of the wrap-up.',
        primaryCta: 'Take me to it',
        primaryRoute: pp.nextCue.route,
      };
    }
    if (pp && pp.phase === 'live_event' && pp.nextCue) {
      return {
        level: 'neutral', category: 'live',
        title: `${pp.nextCue.label}.`,
        consequence: 'It’s event day — run the day; the plan can rest.',
        primaryCta: 'See the day plan',
        primaryRoute: pp.nextCue.route,
      };
    }
  } catch { /* fall through to the planning ladder */ }
  // ── WAVE-5 RANKING (2026-07-15): ONE #1, by construction. ──────────────────
  // This wrapper used to return the raw ladder result while eventPlan's
  // nextActions[0] was the BAND-SORTED head (criticals lead, calm fillers leave
  // when real work exists) — so the App.js heroes could name a different #1
  // than the ranked list (registry critical vs ladder non-critical; heart
  // filler vs a live risk raise). Now both read one path: when the band-sorted
  // head is NOT the ladder's own top action, the head IS the answer, returned
  // in the same shape every consumer reads (title / level / category /
  // consequence / primaryCta / primaryRoute). When the head IS the ladder top,
  // the rich ladder render below (persona voice, compression sub-badge,
  // identity `because`) is byte-identical to before.
  try {
    const _plan = eventPlan(event);
    const _head = (_plan.nextActions || [])[0] || null;
    // WAVE-6: eventPlan's nextActions is POST-snooze. When everything real is set
    // aside, the honest hero is NO task — never a set-aside item resurfaced through
    // the raw ladder below (the ladder knows nothing about snoozes). The shell
    // renders the Set-aside pile from plan.setAside instead.
    // WAVE-7: same for the worry lane — when ONLY worries exist, the hero is NO
    // task (a heads-up is not a chore) and mayExhale call sites may exhale; the
    // heads-up lane speaks from plan.worries. Never fall through to the raw
    // ladder here: it would resurface a calm filler the worry split just purged.
    if (!_head && ((_plan.setAside || []).length > 0 || (_plan.worries || []).length > 0)) return null;
    if (_head && _head.source !== 'ladder') {
      return {
        level: _head.level || null,
        category: _head.category || null,
        title: _head.title,
        consequence: _head.consequence || null,
        primaryCta: _head.cta || _head.ctaLabel || 'Go',
        primaryRoute: _head.route || _head.primaryRoute || null,
        // Carried so a hero that snoozes/filters can key the SAME item the list does.
        id: _head.id || null,
        domain: _head.domain || null,
        leadDays: _head.leadDays ?? null,
        // WAVE-6 shell contract: the head's clock and bundle fields ride along.
        dueInDays: _head.dueInDays ?? null,
        kind: _head.kind || null,
        count: _head.count ?? null,
        items: _head.items || null,
        source: _head.source || null,
      };
    }
    // WAVE-6: the ladder's own top can be snoozed too. If the band-sorted head IS
    // a ladder action, the rich render below is byte-identical to before — but if
    // the ladder top was set aside and something else now leads, the head branch
    // above already returned it. The remaining case (head is ladder) falls through.
  } catch { /* plan unavailable — the ladder render below stands */ }
  // Decompose any stale "Set date, headcount, menu" composite into the atomic remaining
  // domino so the Focus "ONE thing" + spine never show a half-done bundle (same single
  // source as eventPlan).
  const rendered = renderAction(decomposeSetComposite(_selectEventNextActionWithBadge(event), event), personaFor(event));
  // Sprint 60C #2 — identity whisper (annotation only, post-engine). When this
  // action confidently serves the captured must-have AND the engine attached no
  // reasoning, expose the meaning link through the EXISTING `because` channel.
  // Never enters _selectEventNextActionInner, never reorders (60C audit guardrail);
  // shows only when pi.identity is on AND a confident textual link exists (else
  // graceful no-op). Renders only where `because` already renders (pi.because).
  if (identityOn() && rendered && !rendered.because) {
    const because = mustHaveBecause(event, rendered.title);
    if (because) return { ...rendered, because, becauseFromIdentity: true };
  }
  return rendered;
}


// ONE-TELLING-1: a screen tells the next step ONCE. The Next Up list drops any
// row that is the same step the hero above it already carries (normalized
// prefix match — hero titles are the task text plus trims/ellipses).
export function dropHeroDuplicate(rows, na) {
  if (!na || !na.title || !Array.isArray(rows)) return rows || [];
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const t = norm(na.title);
  return rows.filter(r => {
    const l = norm(r && r.label);
    if (!l) return true;
    const probe = l.slice(0, 32);
    return !(probe && t.includes(probe));
  });
}

function _selectEventNextActionWithBadge(event) {
  const cmd = _selectEventNextActionInner(event);
  if (!cmd || !event) return cmd;
  // Don't double up — if compression IS the primary, no sub-badge.
  if (cmd.category === 'compression') return cmd;
  const compression = deriveEventCompressionSummary(event, daysFrom);
  if (!compression || !compression.significant) return cmd;
  return {
    ...cmd,
    compressionSubBadge: {
      level: compression.level,
      label: 'Tight timeline',
      count: compression.totalUrgent,
      doNow: compression.doNow.length,
      considerSwap: compression.considerSwap.length,
      cta: 'Review compressed tasks',
      route: { tab: 'Planning Tasks', taskId: '__compressed__' },
    },
  };
}

// Sprint 61 (Next-Step Spine): WHO the next action is waiting on, derived from
// the SAME engine (na.category) that produced the action — so the owner word and
// the action can never name different parties on one surface. Returns a semantic
// key; each renderer maps key→color (the triage board uses amber/text/muted; the
// Spine uses its own palette). This is the single source the triage "Waiting on"
// column and the Spine ribbon both consume.
export function nextStepOwner(na) {
  const cat = (na || {}).category;
  const title = ((na || {}).title || '');
  switch (cat) {
    case 'decision': case 'blocker': case 'today-act': case 'today':
    case 'compression': case 'timeline': case 'readiness': case 'caterer':
    case 'comm': // inbound message awaiting your reply
    case 'sample': // demo: exploring the sample event
      return { key: 'you', label: 'You' };
    case 'vendor':
      return { key: 'vendor', label: 'Vendor' };
    case 'approval':
      // A drafted (unsent) approval is on you to send; a sent one awaits the client.
      return /drafted|send the/i.test(title)
        ? { key: 'you', label: 'You' }
        : { key: 'client', label: 'Client' };
    case 'calendar': case 'multiple-upcoming':
      return { key: 'soon', label: 'Soon' };
    default:
      return { key: 'clear', label: 'Clear' };
  }
}

export function _selectEventNextActionInner(event) {
  if (!event) return null;
  const d = deriveCommandCenterData(event);
  const days = daysFrom(event.date);
  const daysSub = days !== null && days >= 0
    ? (days === 0 ? 'today' : `${daysWord(days)} until event`)
    : null;

  // Tier 0 (Sprint UX-3 / ACT-1 fix): a BRAND-NEW event (no guests AND no named
  // vendors — the host hasn't done anything real yet; the kit's seeded timeline/
  // budget are scaffolding, not progress) gets a SIMPLE WIN as the first step:
  // "Add your guest list." Who's coming is the first domino. This intentionally
  // outranks the seeded-but-overdue timeline "Decide…" tasks (which read as urgent
  // decisions on a near-term event) — but ONLY for an untouched event: the moment a
  // guest, a guest count, or a real vendor exists, it stops firing and the normal
  // reactive ladder resumes. Past events are exempt.
  const brandNew = (event.guests || []).length === 0
    && !Number(event.guestCount) && !Number(event.guestEstimate)
    && (event.vendors || []).filter(v => v && (v.name || '').trim()).length === 0;
  if (brandNew && (days === null || days >= 0)) {
    return {
      level: 'attention',
      category: 'start',
      title: 'Add your guest list.',
      consequence: 'Who’s coming is the first domino — it sizes the budget, the food, and the schedule.',
      primaryCta: 'Add guests',
      // focusField 'guests-entry' lands the host ON the count entry in FOCUS MODE
      // (rest of the Guests tab dimmed) so they just enter the value.
      primaryRoute: { tab: 'Guests', focusField: 'guests-entry' },
      contextLine: daysSub,
    };
  }

  // Tier 0.5 (foundational setup): the host has started — a guest count or guest
  // list exists — but no real money is set on the budget. Setting the budget is
  // the next foundational domino (it frames every food + vendor decision), so the
  // guided workflow leads them there before the routine reactive ladder. Seeded
  // $0 template rows do NOT count as set; the moment any real amount is entered,
  // this stops firing. Past events are exempt.
  const hasGuestSignal = (event.guests || []).length > 0
    || Number(event.guestCount) > 0 || Number(event.guestEstimate) > 0;
  // A host sets a single "What's your budget?" number (event.totalBudget); a planner
  // builds category rows. Either counts as the budget being set — so the spine
  // advances off "Set your budget" the moment they enter one.
  const budgetIsSet = (event.budget || []).reduce((s, r) => s + (Number(r.budgeted) || 0), 0) > 0
    || Number(event.totalBudget) > 0;
  if (hasGuestSignal && !budgetIsSet && (days === null || days >= 0)) {
    return {
      level: 'attention',
      category: 'readiness',
      title: 'Set your budget.',
      consequence: 'With your headcount in, a budget frames every food and vendor choice — Event Boss can size a starting point for you.',
      primaryCta: 'Set budget',
      // focusField deep-links to the budget $ input so the host lands on it, not the tab top.
      primaryRoute: { tab: 'Budget', focusField: 'hsp-budget' },
      contextLine: daysSub,
    };
  }

  // Tier 1: caterer drift (already detected in deriveCommandCenterData)
  if (d.catererDrift && d.cateringVendor) {
    return {
      level: 'attention',
      category: 'caterer',
      title: 'Confirm final catering count.',
      consequence: `The caterer is set for ${event.catererCount}, but ${d.yesGuestsCount} ${d.yesGuestsCount === 1 ? 'guest has' : 'guests have'} said yes. Until those match, seating, meal counts, and the day's timing are all working from the wrong number.`,
      primaryCta: 'Fix catering count',
      primaryRoute: { tab: 'Vendors', vendorId: d.cateringVendor.id },
      contextLine: daysSub,
    };
  }

  // Tier 2: URGENT or critical decision
  const decisions = (d.decisions || []);
  const urgent = decisions.find(x => (x.urgency || '').toUpperCase() === 'URGENT')
              || decisions.find(x => x.overdue && x.overdueDays >= 14)
              || decisions[0];
  if (urgent) {
    const od = urgent.overdueDays || 0;
    return {
      // WAVE-5 RANKING (2026-07-15): demoted from 'critical'. Doctrine
      // (surfaceRegistry.js): 'critical' is reserved for REACTIVE raises — a
      // payment overdue to a real vendor, a no-show, a same-hour conflict. An
      // overdue SELF-AUTHORED decision is a late chore, not an emergency; at
      // 'critical' it was also unsnoozeable (canSnooze hard rule), so the one
      // action carrying a real leadDays never reached the snooze cap. At
      // 'attention' it stays the band-1 top AND the cap finally binds —
      // including the refuse-when-window-closed branch (proposedSnoozeDays
      // returns null for a task already past its window: never hidden).
      level: 'attention',
      category: 'decision',
      title: `Resolve "${(urgent.title || 'an open decision').slice(0, 80)}".`,
      consequence: od > 0
        ? `Overdue by ${daysWord(od)}. Open decisions block timeline, vendor, and approval progress downstream.`
        : `Pending decision. Holding it open blocks downstream timeline + vendor work.`,
      primaryCta: 'Decide',
      primaryRoute: { tab: 'Decisions', decisionId: urgent.id },
      // RE-AUDIT F7: the task's own lead, so the snooze lead-window cap
      // (proposedSnoozeDays opts.leadDays) finally binds for the top action.
      leadDays: taskLeadDays(urgent),
      contextLine: daysSub,
    };
  }

  // Tier 3: AWAITING approvals — needs send or chase
  const approvals = (d.approvals || []);
  const draftedApproval = approvals.find(a => !a.sent);
  if (draftedApproval) {
    return {
      level: 'attention',
      category: 'approval',
      title: 'Send the drafted approval request.',
      consequence: `"${(draftedApproval.title || 'an approval').slice(0, 80)}" is drafted but never sent. The client clock can't start until it goes out.`,
      primaryCta: 'Send it',
      primaryRoute: { tab: 'Decisions', decisionId: draftedApproval.id },
      contextLine: daysSub,
    };
  }
  const awaitingApproval = approvals.find(a => a.sent);
  if (awaitingApproval) {
    return {
      level: 'attention',
      category: 'approval',
      title: 'Nudge the client on the pending approval.',
      consequence: `"${(awaitingApproval.title || 'an approval').slice(0, 80)}" was sent ${awaitingApproval.sentRelative || 'a while ago'}. Decisions stay paused until the client answers.`,
      primaryCta: 'Nudge client',
      primaryRoute: { tab: 'Decisions', decisionId: awaitingApproval.id },
      contextLine: daysSub,
    };
  }

  // Tier 4: vendor — overdue payment first, then unconfirmed near event
  const vendors = event.vendors || [];
  const overduePayVendor = vendors
    .filter(v => v.payDueDate && !v.balancePaid && (v.cost || 0) > 0)
    .map(v => ({ v, days: daysFrom(v.payDueDate) }))
    .filter(x => x.days !== null && x.days < 0)
    .sort((a, b) => a.days - b.days)[0];
  if (overduePayVendor) {
    const v = overduePayVendor.v;
    const od = -overduePayVendor.days;
    return {
      level: 'critical',
      category: 'vendor',
      title: `Send payment to ${v.name || 'this vendor'}.`,
      consequence: `Balance was due ${daysWord(od)} ago${v.cost ? ` (${fmtMoney0(v.cost)})` : ''}. Late payments can affect how the vendor prioritizes your event — better to settle now.`,
      // Sprint 60.B: issue-specific CTA. Lands inside the payment section.
      primaryCta: 'Pay now',
      primaryRoute: { tab: 'Vendors', vendorId: v.id, vendorSection: 'payment' },
      contextLine: daysSub,
    };
  }

  // Tier 4.2: critical COI — a dock-blocker even on an otherwise-Confirmed vendor.
  // The venue turns vendors away without current insurance, so it outranks a
  // merely-unconfirmed booking. Messaging comes from the shared coiNextAction so
  // the ladder and the vendor detail agree.
  const coiCritical = vendors
    .map(v => ({ v, coi: getVendorCOIState(v, event) }))
    .find(x => x.v.name && x.coi && x.coi.level === 'critical');
  if (coiCritical) {
    const v = coiCritical.v;
    const cna = coiNextAction(v, event, v.name) || {};
    return {
      level: 'critical',
      category: 'vendor',
      sourceCategory: cna.sourceCategory || 'coi', // classification rides the action
      title: cna.title || `Get an updated COI from ${v.name}.`,
      consequence: cna.consequence || 'A current certificate of insurance naming the venue is required to clear load-in.',
      primaryCta: 'Get COI',
      primaryRoute: { tab: 'Vendors', vendorId: v.id, vendorSection: 'documents' },
      contextLine: daysSub,
    };
  }

  // Single source of truth: isVendorConfirmed (workstreams) is the ONE "fully
  // locked in" predicate — the area readiness dot uses the same one, so a
  // "Confirm vendor" action never coexists with a green vendors dot. (Was an
  // ad-hoc `!== 'Confirmed' && !== 'Booked'` that also omitted 'Paid'.)
  const unconfirmed = vendors.find(v => v.name && !isVendorConfirmed(v));
  if (unconfirmed) {
    return {
      level: 'attention',
      category: 'vendor',
      title: `Confirm ${unconfirmed.name}.`,
      consequence: `Currently ${(unconfirmed.status || 'open').toLowerCase()}. The closer to the event, the harder it gets to find another option if this one falls through.`,
      // Sprint 61: verb-first — the move is to confirm the booking.
      primaryCta: 'Confirm vendor',
      primaryRoute: { tab: 'Vendors', vendorId: unconfirmed.id },
      contextLine: daysSub,
    };
  }

  // Sprint 57f.1: Tier 4.5 — compressed-timeline summary
  // Fires only when (a) the event's lead time is non-standard AND
  // (b) there's at least one do_now or risk_lost task still open. We surface
  // this BEFORE the generic "timeline AT_RISK" so the planner sees the
  // compression framing first (which has a clearer next move) rather than
  // a generic "catch up on tasks" prompt.
  const compression = deriveEventCompressionSummary(event, daysFrom);
  if (compression && compression.significant) {
    const doNow = compression.doNow.length;
    // Owner directive 2026-06-24: the next step must BE the action — never a situational
    // narration ("A few things land around the same time"). The clustering is CONTEXT,
    // not the headline. Lead with the single concrete first task; demote the "+N more"
    // to a quiet consequence; route STRAIGHT to that task (less friction, no extra
    // "which one?" question). The vague headline only survives as a last-resort fallback
    // when the engine somehow has no named first task.
    const first = compression.doNow[0];
    let firstText = first && (first.task || first.title)
      ? String(first.task || first.title).trim().replace(/[.\s]+$/, '')
      : null;
    let firstRoute = (first && first.id)
      ? { tab: 'Planning Tasks', taskId: first.id }
      : { tab: 'Planning Tasks', taskId: '__compressed__' };
    // A "Set date, headcount, menu" composite bundles sub-goals the host handles one at a
    // time — it must never lead as a "do now" once any part is handled. Decompose it to the
    // ATOMIC remaining foundational domino ("Set the date." / "Set your budget.", with its
    // real route). If EVERY part is already done, it isn't a real do-now at all — fall
    // through to the next genuine tier so a satisfied bundle never reaches the hero/spine.
    let _skipCompression = false;
    // WAVE-5 RANKING (2026-07-15): the lead of the ACTUAL task this action names,
    // for the snooze cap. Nulled when the composite decomposes to a foundational
    // domino below — the domino has no authored lead, and borrowing the bundle's
    // would be inventing one.
    let firstLead = first ? taskLeadDays(first) : null;
    if (_isSetCompositeTitle(firstText)) {
      const atomic = _eventFoundationActions(event).find((a) => !a.done);
      if (!atomic) _skipCompression = true;
      else { firstText = atomic.title.replace(/[.\s]+$/, ''); firstRoute = atomic.route || firstRoute; firstLead = null; }
    }
    // A food/menu lead task should DEEP-LINK to the menu the host actually makes (the "Your choices"
    // card focuses + scrolls to the open choice), not dump them on the generic tasks tab. When a
    // pickable menu decision is open, use its foodFocus route; otherwise land on the Plan tab.
    if (firstText && /\bmenu\b/i.test(firstText)) {
      const _foodDec = topPlaybookDecision(event);
      firstRoute = (_foodDec && _foodDec.primaryRoute && _foodDec.primaryRoute.foodFocus)
        ? _foodDec.primaryRoute
        : { tab: 'Planning' };
    }
    if (!_skipCompression) {
      const more = Math.max(0, doNow - 1);
      return {
        level: 'attention',
        category: 'compression',
        title: firstText ? firstText + '.' : (compression.headline || 'Tight timeline — a few tasks moved to the front.'),
        consequence: firstText
          ? `${more > 0 ? `${more} more cluster around the same time — do this one first and the rest stay in order. ` : ''}${compression.meta.sub}`
          : `${doNow} ${doNow === 1 ? 'task' : 'tasks'} to handle now. ${compression.meta.sub}`,
        primaryCta: firstText ? 'Do this' : 'Review tasks',
        // Surfaced so the persona voice can lead with the action without re-deriving it.
        firstAction: firstText,
        moreCount: more,
        primaryRoute: firstRoute,
        // WAVE-5 RANKING (2026-07-15): built from a timeline task → carries its
        // authored lead so the snooze cap can bind. Null when no task/lead exists.
        leadDays: firstLead,
        contextLine: daysSub,
      };
    }
  }

  // Tier 5: timeline risk
  const readiness = getEventReadiness(event);
  if (readiness.timeline && readiness.timeline.status === 'AT_RISK') {
    // Owner directive 2026-06-24: a verb CTA must DEEP-LINK to the action, not dump the
    // host on a whole tab. "Catch up" lands on the FIRST overdue task (the editor scrolls
    // to it); fall back to the Timeline only when there's no specific task to open.
    const firstOverdue = (event.timeline || []).find((t) => t && !t.done && taskIsOverdue(t, event));
    return {
      level: 'attention',
      category: 'timeline',
      title: 'Catch up on overdue planning tasks.',
      consequence: `${readiness.timeline.note}${days !== null && days >= 0 ? ` · only ${daysWord(days)} left to recover` : ''}. Falling further behind compounds vendor and budget risk.`,
      primaryCta: 'Catch up',
      primaryRoute: firstOverdue ? { tab: 'Planning Tasks', taskId: firstOverdue.id } : { tab: 'Timeline' },
      // WAVE-5 RANKING (2026-07-15): the first overdue task's authored lead —
      // it is overdue, so the cap's window-closed branch refuses to hide it.
      leadDays: firstOverdue ? taskLeadDays(firstOverdue) : null,
      contextLine: daysSub,
    };
  }

  // Tier 6: inbound communication
  const requests = (d.requests || []);
  if (requests.length > 0) {
    const r = requests[0];
    return {
      level: 'neutral',
      category: 'comm',
      title: `Reply to ${r.from || r.owner || 'an inbound message'}.`,
      consequence: `"${(r.preview || r.title || '').slice(0, 100)}" — ${r.relative || 'awaiting response'}. A short reply often unblocks more than its size suggests.`,
      primaryCta: 'Reply',
      primaryRoute: { tab: 'Communication', commId: r.id },
      contextLine: daysSub,
    };
  }

  // Tier 6.4: decision-first gate (Sprint 55G / NGW Product Pattern 001).
  // When a prerequisite decision is unresolved AND it blocks an in-window
  // purchase, surface the DECISION instead of the buy — "Confirm final guest
  // count" before "Buy protein," "Collect dietary restrictions" before buying
  // food. SUBORDINATE to every reactive tier above (solve/vendor/readiness
  // priority is preserved); inserted ONLY between the reactive tiers and the
  // purchase tier below. No new system — reads authored playbook + event state.
  const opDecision = topPlaybookDecision(event);
  if (opDecision) {
    return {
      level: opDecision.level,
      category: 'decision',
      // WAVE-7 SEAM FIX (2026-07-15): this re-wrap DROPPED the blocker's own record
      // key (`decision: 'dietary' | 'guestCount'`), so _topActionId had nothing to
      // read and slugged the title ('top:decision:collect-dietary-…') while the
      // registry's decisions surface keyed the SAME record 'decision:dietary' —
      // the one debt was billed twice (ladder card + child of bundle:decisions)
      // and a snooze written against either id detached from the other. Carry the
      // record through so the canonical 'decision:<recordId>' form wins here too.
      decision: opDecision.decision || null,
      decisionId: opDecision.decisionId != null ? opDecision.decisionId : null,
      title: opDecision.title,
      consequence: opDecision.consequence,
      primaryCta: opDecision.primaryCta,
      // Spread the full primaryRoute — previously narrowed to just .tab, dropping
      // foodFocus, focusField, taskId, eventId, and other deep-link fields.
      primaryRoute: opDecision.primaryRoute,
      contextLine: daysSub,
    };
  }

  // Tier 6.5: operational playbook task (Sprint 55C-1).
  // A dated, quantity-resolved buy from the event's playbook — eligible only
  // inside its shopping window (the reader gates timing + quantity). It is
  // SUBORDINATE to every reactive item above (caterer / decision / approval /
  // vendor / compression / timeline risk / inbound comm) AND to the decision
  // gate just above: it surfaces only when nothing urgent is open and no
  // prerequisite decision is blocking. It ranks ABOVE the generic "prep for the
  // next milestone" calendar tier because it names a concrete, sized action.
  const opTask = topPlaybookTask(event);
  if (opTask) {
    return {
      level: opTask.level,
      category: 'operational',
      title: opTask.title,
      consequence: opTask.consequence,
      primaryCta: opTask.primaryCta,
      // #12: use the task's OWN route — it carries foodFocus (the line id) so
      // "Take me to it" lands on the exact item, not just the Planning tab.
      primaryRoute: opTask.primaryRoute || { tab: 'Planning' },
      // WAVE-5 RANKING (2026-07-15): the buy's authored lead — the playbook's
      // buyAt token ('T-3d'), or recovered exactly as dueInDays − daysToEvent
      // (dueInDays = dte + offset by construction). No lead → null, honestly.
      leadDays: (() => {
        const authored = taskLeadDays({ when: (opTask.provenance || {}).buyAt });
        if (authored != null) return authored;
        return (Number.isFinite(opTask.dueInDays) && days != null) ? opTask.dueInDays - days : null;
      })(),
      contextLine: daysSub,
    };
  }

  // Tier 7: nearest upcoming milestone
  const nextUp = (d.nextUp || [])[0];
  if (nextUp) {
    return {
      level: 'neutral',
      category: 'calendar',
      // Bug fix 2026-06-12: nextUp items carry `label`/`sub` (see deriveCommandCenterData
      // ~230), NOT `title`/`relative` — so this CTA was showing a generic
      // "Prep for 'next milestone'. Coming up soon." placeholder instead of the
      // real task. Use the actual fields so it names the real milestone.
      // Title is the screen's brightest element (host home hero) — never cut it
      // mid-word. Trim to a word boundary and keep the ellipsis inside the quote.
      title: (() => {
        const lbl = nextUp.label || 'the next milestone';
        if (lbl.length <= 72) return `Prep for "${lbl}".`;
        return `Prep for "${lbl.slice(0, 72).replace(/\s+\S*$/, '')}…"`;
      })(),
      consequence: `${nextUp.sub ? `Coming up: ${nextUp.sub}. ` : ''}Staying ahead by one step makes the rest of the timeline feel quiet.`,
      primaryCta: 'Get ahead',
      // "Get ahead" should land on the FIELD where you actually DO the action — e.g.
      // "Invite guests" → Guests, "Set the budget" → Budget — not just the Timeline
      // view of the milestone. Map the milestone's words to its action tab; fall back
      // to the timeline (anchored to the milestone) when it isn't a domain action.
      // EARLIEST-KEYWORD-WINS router, shared with every Next Up row (see
      // milestoneActionRoute) so the hero and the rows can never disagree.
      primaryRoute: milestoneActionRoute(nextUp.label, event, nextUp.id),
      // WAVE-5 RANKING (2026-07-15): built from a timeline task — its authored
      // lead rides along (null when the task carries none).
      leadDays: nextUp.leadDays ?? null,
      contextLine: daysSub,
    };
  }

  // Tier 7.5 (Host Activation v1 · Phase 4): a brand-new event with nothing planned
  // yet gets a START HERE — never a dead "nothing urgent". The guest count is the
  // first domino (it drives the budget, the food, and the timeline).
  // A set HEADCOUNT counts as a guest signal, not just a roster: a host who chooses
  // "By headcount" writes guestCount/guestEstimate (no roster rows), so checking only
  // event.guests[] left this "Start here — add who's coming" card stuck on screen after
  // the count was set. Mirror _eventFoundationActions' hasGuestSignal so setting the count
  // (any mode) clears the card and advances to the next domino.
  const isEmptyEvent = (event.timeline || []).length === 0
    && (event.vendors || []).filter(v => v && (v.name || '').trim()).length === 0
    && (event.guests || []).length === 0
    && !(Number(event.guestCount) > 0) && !(Number(event.guestEstimate) > 0)
    && (event.budget || []).length === 0;
  if (isEmptyEvent) {
    return {
      level: 'attention',
      category: 'start',
      title: 'Start here — add who’s coming.',
      consequence: 'Your guest count is the first domino: it drives the budget, the food, and the timeline.',
      primaryCta: 'Add guests',
      // focusField 'guests-entry' lands the host ON the count entry in FOCUS MODE
      // (rest of the Guests tab dimmed) so they just enter the value.
      primaryRoute: { tab: 'Guests', focusField: 'guests-entry' },
      contextLine: daysSub,
    };
  }

  // Tier 7.8 — ONE-SOURCE HERO (Todd, 2026-07-07). Before any calm claim, the
  // hero must agree with the two other truth tellers on the same screen: the
  // "What to settle" board and the phase-readiness bar. (Observed: "You're in
  // good shape / Nothing needs you right now" rendered directly above three
  // OVERDUE settle chips and an open "Add a rain backup" cue — the ladder read
  // deriveCommandCenterData().decisions, a different engine than the board.)
  // 1 · An overdue board decision IS the next action.
  try {
    const _board = playbookDecisionBoard(event);
    const _over = ((_board && _board.open) || []).filter(r => r && r.status === 'overdue');
    if (_over.length) {
      return {
        level: 'attention',
        category: 'decision',
        title: `Resolve "${_over[0].label}".`,
        // WAVE-6: the decision RECORD this action is about — the canonical
        // cross-producer snooze id ('decision:<id>') keys on it even though the
        // route intentionally lands on the settle board, not the single row.
        decisionId: _over[0].id,
        settleCount: _over.length,
        consequence: _over.length === 1
          ? 'It’s past its easy window — the spread and shopping list size from it.'
          : `${_over.length} decisions are past their easy window — this one first. The spread and shopping list size from them.`,
        primaryCta: 'Settle it',
        primaryRoute: { tab: 'Planning', focusField: 'host-decisions' },
        // WAVE-5 RANKING (2026-07-15): the decision's authored lead, recovered
        // exactly (the board's daysOut = daysToEvent + offset by construction).
        // These rows are overdue, so the snooze cap's window-closed branch
        // refuses to hide them — the honest outcome.
        leadDays: (Number.isFinite(_over[0].daysOut) && days != null)
          ? _over[0].daysOut - days : null,
        contextLine: daysSub,
      };
    }
  } catch { /* board unavailable — fall through */ }
  // 2 · An open planning essential outranks "nothing needs you" — the header
  // bar is already saying it; the hero must not contradict it. The cue label
  // becomes the hero title, so the header cue's wording-yield hides itself
  // (one telling, hero wins).
  try {
    const _pp = deriveEventPhaseProgress(event);
    if (_pp && _pp.phase === 'pre_event' && _pp.nextCue) {
      return {
        level: 'neutral',
        category: 'readiness',
        title: `${_pp.nextCue.label}.`,
        consequence: `The last of the planning essentials — ${_pp.completedCount} of ${_pp.totalCount} are already handled. After this, the plan really is quiet.`,
        primaryCta: 'Take me to it',
        primaryRoute: _pp.nextCue.route,
        contextLine: daysSub,
      };
    }
  } catch { /* fall through to heart/neutral */ }

  // Tier 7.9 (#17) — when nothing's urgent, the intelligence points to the HEART of
  // the event: the captured must-have moment. Meaning is a first-class engine input,
  // not a passive card. category 'heart' has no VOICE entry, so this copy renders as
  // authored (already warm) instead of being overwritten by the neutral voice.
  if (event.must_have_moment && isMeaningfulMustHave(event.must_have_moment)) {
    const mh = String(event.must_have_moment).trim();
    // CLEARS once the moment is actually on the run of show (the host planned it). A
    // next-step must update when its action is satisfied — "Protect the heart · Plan the
    // moment" should not persist after the moment has a place + owner in the day.
    const heartScheduled = (event.ros || event.timeline || []).some(r =>
      r && (r.heart === true || String(r.segment || '').trim().toLowerCase() === mh.toLowerCase()));
    if (!heartScheduled) {
      const mhShort = mh.length <= 64 ? mh : mh.slice(0, 64).replace(/\s+\S*$/, '') + '…';
      return {
        level: 'neutral',
        category: 'heart',
        title: `Protect the heart: "${mhShort}".`,
        consequence: "Nothing's urgent right now — so use the calm to make sure the one thing that matters actually happens. Give it an owner and a moment in the run of show.",
        primaryCta: 'Plan the moment',
        // Deep-link to the must-have card on the run of show (data-deeplink="musthave"),
        // so "Plan the moment" lands ON the host's own moment with a one-tap add — not on
        // an empty schedule with no affordance for their custom moment.
        primaryRoute: { tab: 'Event Day Schedule', timelineId: 'musthave' },
        contextLine: daysSub,
      };
    }
  }

  // Tier 8: neutral fallback
  // GPS "next turn": the soonest buy that isn't due yet, so the calm host voice can say
  // "next up: buy the proteins, in 3 days" instead of a bare "nothing needs you."
  const _preview = (() => { try { return nextUpcomingTask(event); } catch { return null; } })();
  return {
    level: 'neutral',
    category: 'neutral',
    title: 'Event on track. Nothing urgent right now.',
    consequence: days !== null && days >= 0 && days <= 30
      ? 'A readiness sweep this close to event day usually surfaces what was about to slip.'
      : 'Use the quiet window to push timeline + vendor commitments forward of schedule.',
    // When there IS a named next-up, make it the actionable CTA — deep-link straight to that item
    // (the host voice names it: "Next up: buy the proteins…"). Otherwise the generic timeline sweep.
    primaryCta: (_preview && _preview.route) ? 'See what’s next' : 'Review the timeline',
    primaryRoute: (_preview && _preview.route) ? _preview.route : { tab: 'Timeline' },
    contextLine: daysSub,
    preview: _preview,
  };
}

// ── Window width hook (responsive) ────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ── Primitives ────────────────────────────────────────────────────────────────
// Sprint 57: SECTION_SUBTITLES map clarifies the Decisions / Approvals /
// Requests / Questions distinction inline (audit v2 §6 — coordinators couldn't
// intuit the three from labels alone). Each is rendered as small italic gray
// helper copy directly under the section header.
const SECTION_SUBTITLES = {
  'Open Decisions':       'Your call to make',
  'Approvals':            'Waiting on client',
  'Requests':             'Vendor asks waiting on you',
  'Unanswered Questions': 'Open threads in messages',
  'Planning Health':      'Readiness across the event',
  'Next Up':              'Coming up on the timeline',
  'Vendors':              'Booked / partial / pending',
  'Documents':            'Contracts, COIs, signed docs',
};

function SectionHeader({ label, count, countColor, action, onAction, event }) {
  const subtitle = SECTION_SUBTITLES[label];          // lookup on the canonical label
  const dispLabel = labelFor(label, event);           // Phase 2: host display label
  const dispSub   = labelFor(subtitle, event);        // …and host subtitle
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Board ruling 2026-06-24 — SECTION TITLE, not a 10px eyebrow chip. These are the
            section NAMES of the whole Pulse ("What this is", "Decisions", "Needs You", "Next
            Up"…); at 10px uppercase steel they sat BELOW the lg/sm content they head (badly
            inverted). Now a real section title: lg (15), sentence-case, primary — leads its
            group by size, not hue. */}
        <span style={{
          fontSize: type.size.lg, fontWeight: 700, color: P.textPrimary, fontFamily: FF,
          letterSpacing: '-0.01em',
        }}>{dispLabel}</span>
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: type.size.sm, fontWeight: 600, color: countColor || P.textSecondary, fontFamily: FF }}>{count}</span>
        )}
        <div style={{ flex: 1 }} />
        {action && (
          <button onClick={onAction} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: type.size.sm, fontWeight: 500, color: P.green, fontFamily: FF, padding: 0,
          }}>{action}</button>
        )}
      </div>
      {subtitle && (
        <div style={{
          fontSize: type.size.xs, color: P.textTertiary, fontFamily: FF,
          fontStyle: 'italic', marginTop: 2, lineHeight: 1.4,
        }}>{dispSub}</div>
      )}
    </div>
  );
}

// Quiet sub-label inside the unified "Needs You" queue — one notch below
// SectionHeader (board: the four "waiting on you" lists share one header now).
function NeedsSubLabel({ label, count, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
      <span style={{ fontSize: type.size.xs, fontWeight: 700, color: P.textSecondary, fontFamily: FF, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      {count > 0 && <span style={{ fontSize: type.size.xs, fontWeight: 600, color: P.textTertiary, fontFamily: FF }}>{count}</span>}
      <div style={{ flex: 1 }} />
      {action && <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: type.size.xs, fontWeight: 500, color: P.green, fontFamily: FF, padding: 0 }}>{action}</button>}
    </div>
  );
}

function Pill({ label, color, outline }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: type.size["2xs"], fontWeight: 600, fontFamily: FF, letterSpacing: '0.10em',
      padding: '2px 7px', borderRadius: 3,
      background: outline ? 'transparent' : color,
      color: outline ? color : P.canvas,
      border: outline ? `1px solid ${color}` : 'none',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>{label}</span>
  );
}

// ── Decision card ─────────────────────────────────────────────────────────────
function DecisionCard({ d, onOpen, isMobile }) {
  return (
    <div style={{
      ...cardEdge, border: cardEdge.border, borderRadius: radius.md,
      padding: isMobile ? 14 : 18,
      display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12,
      fontFamily: FF,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pill label={d.statusLabel} color={d.statusColor} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: type.size.sm, fontWeight: 600, color: d.dueColor }}>{d.dueLabel}</span>
      </div>
      <div style={{
        fontSize: type.size.lg, fontWeight: 600, color: P.textPrimary,
        letterSpacing: '-0.01em', lineHeight: 1.3,
      }}>{d.title}</div>
      <div style={{ fontSize: type.size.sm, color: P.textSecondary, lineHeight: 1.4 }}>{d.impact}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: P.textSecondary, flexShrink: 0 }} />
        <span style={{ fontSize: type.size.sm, color: P.textTertiary }}>{d.owner}</span>
        <div style={{ flex: 1 }} />
        <button onClick={onOpen} style={{
          background: 'transparent', color: P.textPrimary,
          border: `1px solid ${P.borderDef}`, cursor: 'pointer',
          fontSize: type.size.sm, fontWeight: 600, fontFamily: FF,
          padding: '6px 12px', borderRadius: 6, whiteSpace: 'nowrap',
        }}>Decide →</button>
      </div>
    </div>
  );
}

// ── Approval row ──────────────────────────────────────────────────────────────
function ApprovalRow({ a, onOpen }) {
  return (
    <button onClick={onOpen} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14,
      ...cardEdge, border: cardEdge.border, borderRadius: radius.md,
      cursor: 'pointer', fontFamily: FF, textAlign: 'left',
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: type.size.base, fontWeight: 600, color: P.textPrimary, lineHeight: 1.3 }}>
          {a.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Pill label={a.statusLabel} color={a.statusColor} />
          <span style={{ fontSize: type.size.sm, color: P.textSecondary }}>{a.sub} · {a.ago}</span>
        </div>
      </div>
      <span style={{ color: P.textTertiary, fontSize: type.size.md }}>›</span>
    </button>
  );
}

// ── Request row ───────────────────────────────────────────────────────────────
function RequestRow({ r, onOpen, isFirst }) {
  return (
    <button onClick={onOpen} style={{
      width: '100%', display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 14px',
      background: 'none', border: 'none', borderTop: isFirst ? 'none' : `1px solid ${P.borderSubtle}`,
      cursor: 'pointer', fontFamily: FF, textAlign: 'left',
    }}>
      <div style={{ paddingTop: 5, flexShrink: 0 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: r.unread ? P.borderAcc : P.borderSubtle,
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: type.size["2xs"], fontWeight: 700, color: r.sourceColor,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>{r.source}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: type.size.xs, color: P.textTertiary }}>{r.when}</span>
        </div>
        <div style={{ fontSize: type.size.base, fontWeight: 500, color: P.textPrimary, lineHeight: 1.3 }}>
          {r.title}
        </div>
      </div>
    </button>
  );
}

// ── Communication question row ────────────────────────────────────────────────
function QuestionRow({ q, onOpen, isFirst }) {
  return (
    <button onClick={onOpen} style={{
      width: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: '11px 14px',
      background: 'none', border: 'none', borderTop: isFirst ? 'none' : `1px solid ${P.borderSubtle}`,
      cursor: 'pointer', fontFamily: FF, textAlign: 'left',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: q.sourceColor, flexShrink: 0 }} />
        <span style={{ fontSize: type.size.sm, fontWeight: 600, color: P.textPrimary }}>{q.source}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: type.size.xs, color: P.textTertiary }}>{q.when}</span>
      </div>
      <div style={{ fontSize: type.size.caption, color: P.textSecondary, lineHeight: 1.45 }}>"{q.snippet}"</div>
    </button>
  );
}

// ── Timeline row ──────────────────────────────────────────────────────────────
// ── Milestone action router (ACTIONABLE-ROWS follow-up) ──────────────────────
// EARLIEST-KEYWORD-WINS: a milestone label leads with its action ("Book the
// caterer … for your guest count"), so the domain whose keyword appears FIRST
// owns the route. Shared by the Tier-7 next-step hero AND every Next Up row —
// a visible milestone must never be a dead label (deep-link doctrine).
// Moved to lib/taskRoute (routing audit 2026-07-27) so the V2 shell shares the
// canonical producer without dragging this planner bundle along. Re-exported
// here so every existing import keeps working.
export { milestoneActionRoute } from './lib/taskRoute';
const _milestoneActionRouteMoved = true; void _milestoneActionRouteMoved;

function TimelineRow({ t, isFirst, onOpen = null }) {
  // Deep-link doctrine: a Next Up row is never a dead label — it routes to the
  // exact place the milestone gets done (or the timeline anchored to it).
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      onClick={onOpen || undefined}
      data-testid={onOpen ? `nextup-row-${t.id}` : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', width: '100%',
        boxSizing: 'border-box', textAlign: 'left', background: 'transparent',
        border: 'none', cursor: onOpen ? 'pointer' : 'default',
        borderTop: isFirst ? 'none' : `1px solid ${P.borderSubtle}`, fontFamily: FF,
      }}>
      <div style={{
        width: 42, display: 'flex', flexDirection: 'column', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: type.size["2xs"], fontWeight: 600, color: t.color,
          letterSpacing: '0.12em',
        }}>{t.dateLabel}</span>
        <span style={{ fontSize: type.size.lg, fontWeight: 600, color: P.textPrimary, letterSpacing: '-0.01em' }}>
          {t.dateNum}
        </span>
      </div>
      <div style={{ width: 1, height: 28, background: P.borderSubtle, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: type.size.base, fontWeight: 600, color: P.textPrimary, lineHeight: 1.3 }}>{t.label}</div>
        <div style={{ fontSize: type.size.xs, color: P.textSecondary }}>{t.sub}</div>
      </div>
      {onOpen && <span aria-hidden style={{ color: P.textSecondary, fontSize: type.size.sm, flexShrink: 0 }}>›</span>}
    </Tag>
  );
}

// ── Vendor row ────────────────────────────────────────────────────────────────
// Host chip words for the overview vendor list — the SAME vocabulary the
// Vendors tab's hostStatusWord speaks (Booked / Got a price / Still deciding),
// applied at THIS call site only. Deliberately NOT added to the shared
// HOST_LABELS map: HealthRow routes its statusLabel through labelFor too, and
// health rows also emit 'CONFIRMED'/'NOT STARTED' where 'Booked'/'Still
// deciding' would be wrong-context (e.g. a Reality Check row). Covers every
// label figmaBadge/driftOverride can produce; 'AT RISK' stays with the shared
// labelFor mapping ('Needs attention'). Planner persona is identity.
export const HOST_VENDOR_CHIP = {
  'CONFIRMED': 'Booked',
  'PARTIAL': 'Deposit paid',
  'PENDING': 'Got a price',
  'NOT STARTED': 'Still deciding',
  'UNCONFIRMED': 'Not confirmed yet',
  'HEADCOUNT MISMATCH': 'Count needs an update',
};

function VendorRow({ v, onOpen, isFirst, event = null }) {
  // Same gating semantics as labelFor: flag on + host persona; otherwise identity.
  const hostChip = labelsOn() && audiencePersona(event) === 'host' ? HOST_VENDOR_CHIP[v.statusLabel] : null;
  return (
    <button onClick={onOpen} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: 'none', border: 'none', borderTop: isFirst ? 'none' : `1px solid ${P.borderSubtle}`,
      cursor: 'pointer', fontFamily: FF, textAlign: 'left',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.statusColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ fontSize: type.size.caption, fontWeight: 600, color: P.textPrimary }}>{v.category}</div>
        {v.name && <div style={{ fontSize: type.size.xs, color: P.textTertiary }}>{v.name}</div>}
        {/* Sprint 51 Path B: caterer drift detail — surfaces the actual
            headcount delta inline so the planner sees the work before the
            click instead of having to drill in. */}
        {v.driftNote && (
          <div style={{ fontSize: type.size.xs, color: P.amber, marginTop: 2 }}>{v.driftNote}</div>
        )}
      </div>
      <span style={{
        fontSize: type.size.xs, fontWeight: 600, color: v.statusColor,
        letterSpacing: '0.10em', flexShrink: 0,
      }}>{/* Host persona audit (POP-1): status chips route through the EXISTING
            labelFor vocabulary layer — a host-persona event reads "Needs attention"
            instead of the compliance word "AT RISK" (HOST_LABELS already maps it;
            this row was the one chip bypassing the layer). Planner persona and
            unmapped labels (CONFIRMED/PARTIAL/PENDING/NOT STARTED) are identity. */}
        {hostChip || labelFor(v.statusLabel, event)}</span>
    </button>
  );
}

// ── Document pill ─────────────────────────────────────────────────────────────
function DocPill({ label, status, color, onClick }) {
  const baseStyle = {
    flex: 1, padding: '10px 12px', background: P.card,
    border: `1px solid ${P.borderSubtle}`, borderRadius: 8,
    display: 'flex', flexDirection: 'column', gap: 4, fontFamily: FF,
    minWidth: 0, textAlign: 'left',
  };
  const inner = (
    <>
      <div style={{ fontSize: type.size.sm, fontWeight: 600, color: P.textPrimary }}>{label}</div>
      <div style={{ fontSize: type.size.xs, color: color || P.textTertiary }}>{status}</div>
    </>
  );
  if (!onClick) return <div style={baseStyle}>{inner}</div>;
  return (
    <button onClick={onClick} title={`Open ${label}`}
      style={{ ...baseStyle, cursor: 'pointer', minHeight: 44 }}>
      {inner}
    </button>
  );
}

// ── Planning Health row ───────────────────────────────────────────────────────
// Each health dimension routes to the tab that owns it (board: a callout that
// names a problem must be the handle that takes you to it).
// Board ruling: Capacity ("Seating & supplies") → Plan; Reality Check ("Before the
// big day") → The Day. The Overview row is now a collapsed echo that LINKS to the home.
const HEALTH_ROUTE = { Timeline: 'Timeline', Vendors: 'Vendors', Guests: 'Guests', Budget: 'Budget', Documents: 'Documents', Capacity: 'Planning', 'Reality Check': 'Event Day Schedule' };
// Sprint 57G: TIER → Studio Matte color. UNKNOWN/ESTIMATE/VERIFY render steel —
// never green (false certainty) and never red (false alarm) for "no data".
const CONF_TIER_COLOR = { green: P.green, amber: P.amber, red: P.red, steel: P.textSecondary };
// Board #13 — collapse the cockpit. Show only what needs the host; roll everything
// that's ON TRACK into one "N handled" line they can expand. No 8 near-equal rows.
function HealthList({ health, onTabChange, event }) {
  const [showOk, setShowOk] = useState(false);
  const grammar = confidencePersona(event);
  const attention = health.filter(h => h.statusLabel !== 'ON TRACK');
  const onTrack = health.filter(h => h.statusLabel === 'ON TRACK');
  const rows = showOk ? [...attention, ...onTrack] : attention;
  return (
    <>
      {rows.map((h, i) => <HealthRow key={h.label} h={h} isFirst={i === 0} onTabChange={onTabChange} event={event} grammar={grammar} />)}
      {onTrack.length > 0 && (
        <button type="button" onClick={() => setShowOk(v => !v)}
          style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderTop: rows.length ? `1px solid ${P.borderSubtle}` : 'none', padding: '12px 14px', cursor: 'pointer', fontFamily: FF, fontSize: type.size.base, fontWeight: 600, color: P.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span><span style={{ color: P.green, fontWeight: 800 }}>✓</span> {onTrack.length} on track</span>
          <span style={{ fontSize: type.size.sm, opacity: 0.8 }}>{showOk ? 'Hide' : 'Show'}</span>
        </button>
      )}
    </>
  );
}
function HealthRow({ h, isFirst, onTabChange, event, grammar }) {
  const target    = HEALTH_ROUTE[h.label];              // route keyed on the CANONICAL label
  const clickable = !!(target && onTabChange);
  const dispLabel  = labelFor(h.label, event);          // 57C Phase 2: host display label
  // 57G Confidence Grammar: when active, remap the status WORD + COLOR by actual
  // certainty (Pattern 014). When off, fall back to the 57C label translation,
  // then the raw token (identity). Confidence word wins over label translation.
  const conf  = grammar ? confidenceFor(h, grammar) : null;
  const dispStatus = conf ? conf.word : labelFor(h.statusLabel, event);
  const dotC  = conf ? (CONF_TIER_COLOR[conf.tier] || h.color) : h.color;
  const inner = (
    <>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotC, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ fontSize: type.size.base, fontWeight: 600, color: P.textPrimary }}>{dispLabel}</div>
        <div style={{ fontSize: type.size.sm, color: P.textSecondary }}>
          {/* POP-1D: the value-level pill and the "Because" line below were both
              inert — h.valueLevel and h.because are never set on any health row
              (stat() and the inline builders don't produce them). Removed the
              two dead branches + their dead modules (valueConfidence, becauseLayer);
              confidenceFor above is the one live, canonical explainability path. */}
          {h.note}
        </div>
      </div>
      <span style={{ fontSize: type.size.xs, fontWeight: 600, color: dotC, letterSpacing: '0.10em', flexShrink: 0 }}>{dispStatus}</span>
      {clickable && <span aria-hidden style={{ color: P.textTertiary, fontSize: type.size.lg, flexShrink: 0, marginLeft: 2 }}>›</span>}
    </>
  );
  const baseStyle = {
    display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px',
    borderTop: isFirst ? 'none' : `1px solid ${P.borderSubtle}`, fontFamily: FF,
  };
  if (!clickable) return <div style={baseStyle}>{inner}</div>;
  return (
    <button onClick={() => onTabChange(target)} title={`Open ${h.label}`}
      style={{ ...baseStyle, width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', minHeight: 44 }}>
      {inner}
    </button>
  );
}

// ── Sprint 60B: Event Identity — "what this really is" ────────────────────────
// A reader over the meaning captured at intake. Orients planning by stating the
// event's purpose, surfacing the must-have moment as a tracked priority, and naming
// what success means — persona-NEUTRAL (the meaning is the event's, not the
// audience's), so host/operator/planner all see the same. Renders nothing when the
// flag is off or no meaning was captured (graceful degrade to today).
function EventIdentityBlock({ event, isMobile }) {
  // Attention System (board 2026-06-24): identity WHISPERS — collapsed to one quiet line
  // by default, expands when the host reaches for it (progressive disclosure, not a
  // permanent wall). Hook declared first, before the early returns.
  const [open, setOpen] = useState(false);
  if (!identityOn()) return null;
  const id = eventIdentity(event);
  if (!id) return null;
  // Board ruling 2026-06-24: don't state the must-have twice. When "The one thing that
  // must happen" is shown above, drop any "What success looks like" bullet that just
  // echoes it (e.g. "The must-have happens: <the must-have>") — orientation should not repeat.
  const mh = id.mustHaveMoment ? String(id.mustHaveMoment).toLowerCase().trim() : '';
  const successBullets = (id.success || []).filter(
    (b) => !(mh && String(b).toLowerCase().includes(mh))
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8, marginBottom: isMobile ? 12 : 16 }}>
      {/* Collapsed = one quiet line (whisper). Tap to expand the full meaning. */}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ display: 'flex', alignItems: 'baseline', gap: 10, width: '100%', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', textAlign: 'left', fontFamily: FF }}>
        <span style={{ fontSize: type.size.xs, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.textTertiary, flexShrink: 0 }}>What this is</span>
        {!open && <span style={{ fontSize: type.size.base, color: P.textSecondary, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{id.reallyIs}</span>}
        <span aria-hidden style={{ marginLeft: 'auto', color: P.textTertiary, fontSize: type.size.caption, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md, padding: '14px 16px' }}>
          <div style={{ fontSize: type.size.md, fontWeight: 600, color: P.textPrimary, lineHeight: 1.45 }}>{id.reallyIs}</div>
          {id.intent && <div style={{ fontSize: type.size.base, color: P.textSecondary, marginTop: 4, lineHeight: 1.45 }}>{id.intent}</div>}
          {id.mustHaveMoment && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${P.borderSubtle}` }}>
              <div style={{ fontSize: type.size.caption, fontWeight: 600, color: P.textSecondary }}>The one thing that must happen</div>
              <div style={{ fontSize: type.size.md, fontWeight: 600, color: P.textPrimary, marginTop: 3 }}>{id.mustHaveMoment}</div>
            </div>
          )}
          {successBullets.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${P.borderSubtle}` }}>
              <div style={{ fontSize: type.size.caption, fontWeight: 600, color: P.textSecondary, marginBottom: 4 }}>What success looks like</div>
              {successBullets.slice(0, 5).map((b, i) => (
                <div key={i} style={{ fontSize: type.size.base, color: P.textSecondary, lineHeight: 1.55 }}>· {b}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sprint 57F-A: Positive Attention — "You're Set On ✓" ──────────────────────
// Read-only reassurance: the dimensions a host can stop worrying about, derived
// ONLY from existing readiness (the positiveAttention reader). Quiet by design —
// green checks that whisper beneath the one thing that still needs the host. The
// reader already excludes adequacy/safety/estimate claims, so nothing false can
// appear here. Renders nothing when items is empty (flag OFF / not host / nothing set).
// ── Sprint 57J: Decision Confidence — "Where decisions stand" ─────────────────
// Planner judgment, not a checklist: surface the decisions you can LOCK (ready),
// the ones BLOCKED on a prereq, and the ones running OVERDUE. Guest count always
// shows (the headline). Pure in-progress "gathering" rows are suppressed (they're
// not a judgment moment). Renders in the action column ⇒ reaches mobile too.
const DEC_STATE = {
  ready_to_lock: { word: 'Ready to lock', color: 'green' },
  blocked:       { word: 'Blocked',       color: 'steel' },
  overdue:       { word: 'Overdue',       color: 'red'   },
  gathering:     { word: 'Gathering',     color: 'steel' },
  locked:        { word: 'Locked',        color: 'green' },
  unknown:       { word: '',              color: 'steel' },
};
function DecisionsBlock({ items, isMobile }) {
  if (!items || items.length === 0) return null;
  // Judgment, not checklist: lead with lockable/blocked/overdue; always keep guest count.
  const shown = items.filter((it) => it.key === 'guestCount' || ['ready_to_lock', 'blocked', 'overdue'].includes(it.state));
  if (!shown.length) return null;
  const colorOf = (s) => ({ green: P.green, red: P.red, steel: P.textSecondary }[(DEC_STATE[s] || {}).color] || P.textSecondary);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
      <SectionHeader label="Decisions" />
      <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
        {shown.map((it, i) => {
          const col = colorOf(it.state);
          return (
            <div key={it.key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', fontFamily: FF,
              borderTop: i === 0 ? 'none' : `1px solid ${P.borderSubtle}`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ fontSize: type.size.base, fontWeight: 600, color: P.textPrimary }}>{it.label}</div>
                <div style={{ fontSize: type.size.sm, color: P.textSecondary }}>
                  {it.confidence ? <span style={{ color: col, fontWeight: 600 }}>{it.confidence} </span> : null}{it.reason}
                </div>
              </div>
              <span style={{ fontSize: type.size.xs, fontWeight: 600, color: col, letterSpacing: '0.08em', flexShrink: 0 }}>
                {(DEC_STATE[it.state] || {}).word}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YoureSetOn({ items, isMobile }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
      <SectionHeader label="You're Set On" count={items.length} countColor={P.green} />
      <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
        {items.map((it, i) => (
          <div key={it.key} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', fontFamily: FF,
            borderTop: i === 0 ? 'none' : `1px solid ${P.borderSubtle}`,
          }}>
            <span aria-hidden style={{ color: P.green, fontSize: type.size.md, fontWeight: 700, flexShrink: 0, width: 16, textAlign: 'center' }}>✓</span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ fontSize: type.size.base, fontWeight: 600, color: P.textPrimary }}>{it.label}</div>
              {it.note && <div style={{ fontSize: type.size.sm, color: P.textSecondary }}>{it.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sprint UX-4: Upcoming Rail — the reachable home for DORMANT sections. Shows what
// EXISTS without demanding attention ("available later"); a tap routes to the real tab.
// Renders nothing when there's nothing dormant (planner / fully-active event).
function UpcomingRail({ items, onTabChange, isMobile }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
      <SectionHeader label="Coming up later" />
      <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
        {items.map((r, i) => (
          <button key={r.section} onClick={() => onTabChange?.(r.route)} style={{
            width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', background: 'transparent', border: 'none',
            borderTop: i === 0 ? 'none' : `1px solid ${P.borderSubtle}`, cursor: 'pointer', fontFamily: FF,
          }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ fontSize: type.size.base, fontWeight: 600, color: P.textSecondary }}>{r.label}</div>
              <div style={{ fontSize: type.size.sm, color: P.textTertiary }}>{r.hint}</div>
            </div>
            <span aria-hidden style={{ color: P.textTertiary, fontSize: type.size.md, flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ children }) {
  return (
    <div style={{
      padding: '20px 14px', ...cardEdge, border: cardEdge.border,
      borderRadius: 8, textAlign: 'center', fontFamily: FF,
      fontSize: type.size.caption, color: P.textTertiary,
    }}>
      {children}
    </div>
  );
}

// ─── Sprint 52: Up Next panel ───────────────────────────────────────────────
// Editorial L3 command band. Replaces the previous dot+sentence status headline
// with a dominant, single-action surface: label · big title · consequence ·
// primary CTA. The action itself is selected deterministically by
// selectEventNextAction (see priority ladder there). Tone: command desk.
// Label "Up next" is industry-resonant — planners actually say this out loud.
// (Was "Next Best Action" in initial Sprint 52; renamed per language pass —
// Salesforce-speak was undermining the planner-native voice elsewhere.)
function NextBestActionPanel({ command, onTabChange, isMobile }) {
  if (!command) return null;
  // Severity color drives the left accent strip and the eyebrow label only.
  // Studio Matte Confidence lock (board 2026-06-24): attention/"Needs you" is a
  // confidence/attention state → STEEL, never warm gold (amber is banned from
  // confidence signals; reserved for Kelvin/role/interaction). Critical keeps the
  // canonical alarm red. Tiers now read steel → steelBlue → red, all on-palette.
  const accent =
    command.level === 'critical'  ? P.red :
    command.level === 'attention' ? P.steelBlue :
                                    P.textSecondary;
  const ctaTop  = P.steelBlue;            // #4E6877
  const ctaBase = '#3F5B6A';              // matches palette steelBlueDark
  // Eyebrow casing parity (Figma host hero eyebrows are ALL-CAPS): the span already
  // applies textTransform: 'uppercase', but the source literals are uppercased too so
  // code labels match the render and no future render that drops the transform regresses.
  const label =
    command.level === 'critical'  ? 'NEXT STEP · CRITICAL' :
    command.level === 'attention' ? 'NEXT STEP · NEEDS YOU' :
                                    'NEXT STEP';

  const handleCta = () => {
    if (!command.primaryRoute) return;
    // Pull section/focus hints + eventId OUT of rest so `idKey` only ever picks a
    // real item id (decisionId / vendorId / commId / timelineId). focusField MUST be
    // pulled out too — else it was mistaken for an item id (rest's first key) AND never
    // forwarded, so "Set budget" landed on the tab top but never focused the $ field.
    const { tab, vendorSection, foodFocus, focusField, eventId, ...rest } = command.primaryRoute;
    const idKey = Object.keys(rest)[0];
    // Forward vendorSection / foodFocus / focusField as the third opts arg so the
    // EventPlanner route chain lands in the right section, scrolls to the right food
    // line (#12), or focuses the right input (Board #15 — e.g. hsp-budget).
    const opts = (vendorSection || foodFocus || focusField) ? { vendorSection, foodFocus, focusField } : undefined;
    onTabChange && onTabChange(tab, rest[idKey] || null, opts);
  };

  return (
    // id="next-step-hero": CTA landing anchor — "Open event" routes land ON the
    // next-step hero, never an unscrolled Command top.
    <div id="next-step-hero" style={{
      position: 'relative',
      scrollMarginTop: 16,
      padding: isMobile ? '18px 18px 18px 22px' : '22px 26px 22px 30px',
      // Same polish as every app card — the metallic gradient edge + dimensional
      // lift (was flat P.card + solid border). cardEdge provides bg/border/shadow/radius.
      ...cardEdge,
      overflow: 'hidden',
      fontFamily: FF,
      // Attention System: the hero breathes when something actually needs you;
      // stays still when you're clear (neutral) so "all good" reads as calm.
      animation: command.level === 'neutral' ? undefined : 'ceBreathe 3.4s ease-in-out infinite',
    }}>
      {/* Editorial accent strip — single source of light, Studio Matte compliant */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: accent,
        opacity: command.level === 'neutral' ? 0.4 : 1,
      }} />

      {/* Label row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
      }}>
        <span style={{
          fontSize: type.size.xs, fontWeight: type.weight.semibold,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: accent,
        }}>
          {label}
        </span>
        {command.contextLine && (
          <>
            <span style={{ color: P.textTertiary, fontSize: type.size.xs }}>·</span>
            <span style={{ fontSize: type.size.sm, color: P.textTertiary, fontFamily: FF }}>
              {command.contextLine}
            </span>
          </>
        )}
      </div>

      {/* Title — editorial */}
      <div style={{
        fontSize: isMobile ? type.size['2xl'] : type.size['3xl'],
        fontWeight: type.weight.semibold,
        letterSpacing: '-0.025em',
        lineHeight: 1.15,
        color: P.textPrimary,
        marginBottom: 8,
      }}>
        {command.title}
      </div>

      {/* Consequence */}
      <div style={{
        fontSize: type.size.base,
        lineHeight: 1.55,
        color: P.textSecondary,
        marginBottom: 18,
        maxWidth: 720,
      }}>
        {command.consequence}
      </div>

      {/* CTA — steel-blue, regardless of severity. Severity is signaled
          by the left accent strip + eyebrow label above, never the
          primary action color. */}
      <button
        onClick={handleCta}
        style={{
          padding: isMobile ? '9px 18px' : '10px 22px',
          borderRadius: radius.sm,
          border: 'none',
          cursor: 'pointer',
          background: `linear-gradient(180deg, ${ctaTop} 0%, ${ctaBase} 100%)`,
          color: '#eef0f4',
          fontSize: type.size.base,
          fontWeight: type.weight.semibold,
          letterSpacing: '0.01em',
          fontFamily: FF,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'transform 0.12s',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.32)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {command.primaryCta}
        <span style={{ fontSize: type.size.caption, opacity: 0.85 }}>→</span>
      </button>

      {/* Sprint 57f.2: compression sub-badge. Renders ONLY when the
          primary NBA is something else and the timeline is still
          compressed enough to warrant context. Visually subordinate to
          the primary CTA above — same row, but quieter color, smaller
          type, and a separate action that doesn't compete. */}
      {command.compressionSubBadge && (() => {
        const sb = command.compressionSubBadge;
        const sbTone =
            sb.level === 'rush'       ? P.amber  // Red audit: tight timeline = caution, not red.
          : sb.level === 'compressed' ? P.amber
          :                             P.textSecondary;
        const handleSubCta = () => {
          if (!sb.route) return;
          const { tab, ...rest } = sb.route;
          const idKey = Object.keys(rest)[0];
          onTabChange && onTabChange(tab, idKey ? rest[idKey] : null);
        };
        const summary =
            sb.doNow > 0 && sb.considerSwap > 0
              ? `${sb.doNow} to do now · ${sb.considerSwap} to consider swapping`
          : sb.doNow > 0
              ? `${sb.doNow} ${sb.doNow === 1 ? 'task' : 'tasks'} to do now`
              : `${sb.considerSwap} long-lead ${sb.considerSwap === 1 ? 'task' : 'tasks'}`;
        return (
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${P.borderSubtle}`,
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 8 : 10, flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: type.size.xs, fontWeight: type.weight.semibold,
              color: sbTone, background: sbTone + '18',
              border: `1px solid ${sbTone}44`, borderRadius: 99,
              padding: '2px 8px', letterSpacing: '0.06em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>⏱ {sb.label}</span>
            <span style={{ fontSize: type.size.sm, color: P.textSecondary, fontFamily: FF, ...(isMobile ? {} : { flex: 1, minWidth: 0 }) }}>
              {summary}
            </span>
            <button
              onClick={handleSubCta}
              style={{
                background: 'transparent',
                border: `1px solid ${P.borderDef}`,
                borderRadius: radius.sm,
                color: P.textSecondary,
                fontFamily: FF,
                fontSize: type.size.sm,
                fontWeight: type.weight.medium,
                padding: '5px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = P.textPrimary; e.currentTarget.style.border = `1px solid ${sbTone}`; }}
              onMouseLeave={e => { e.currentTarget.style.color = P.textSecondary; e.currentTarget.style.border = `1px solid ${P.borderDef}`; }}
            >
              {sb.cta} →
            </button>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
// Sprint 52B — small, informational team-readiness block. Renders nothing for
// solo events (no crew assigned) so it never becomes dashboard clutter.
function TeamReadinessBlock({ summary, onManage, gap = 12 }) {
  if (!summary || summary.total === 0) return null;
  const sev = summary.severity === 'attention' ? P.amber : summary.severity === 'none' ? P.green : P.textSecondary;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      <SectionHeader label="Team" action="Manage →" onAction={onManage} />
      <div data-testid="cc-team-readiness" style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sev, flexShrink: 0 }} />
          <span style={{ fontSize: type.size.base, fontWeight: 700, color: P.textPrimary }}>{summary.total} on this event</span>
        </div>
        <div style={{ fontSize: type.size.caption, color: P.textSecondary, marginTop: 4 }}>
          {summary.confirmed} confirmed{summary.needsConfirmation ? ` · ${summary.needsConfirmation} need confirmation` : ''}{summary.assigned ? ` · ${summary.assigned} assigned` : ''}
        </div>
        {summary.crew.slice(0, 4).map(c => (
          <div key={c.id} style={{ fontSize: type.size.caption, marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: P.textPrimary }}>{c.name}{c.roleLabel ? ` · ${c.roleLabel}` : ''}</span>
            <span style={{ color: c.status === 'needs_confirmation' ? P.amber : c.status === 'confirmed' ? P.green : P.textTertiary, whiteSpace: 'nowrap' }}>{c.status === 'needs_confirmation' ? 'Needs confirmation' : c.status === 'confirmed' ? 'Confirmed' : 'Assigned'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileCommandCenter({ event, data, crewSummary, setItems, decisionItems, dormant, rail, onTabChange, onBack, backLabel, onAddDecision, onAddApproval, onAddRequest }) {
  const d = data;
  return (
    <div style={{ background: 'transparent', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Studio bar — slim header with back + brand context */}
      {onBack && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', background: P.base,
          borderBottom: `1px solid ${P.borderSubtle}`, fontFamily: FF,
        }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: type.size.xl, color: P.textSecondary, padding: 0,
          }}>←</button>
          {/* P0 punch-list: the event NAME is the Pulse hero (banner below) — the studio
              bar only carries wayfinding back to Home, no duplicate name/meta. */}
          <span style={{ fontSize: type.size.base, fontWeight: 600, color: P.textSecondary }}>{backLabel ? backLabel.replace(/^←\s*/, '') : 'Studio'}</span>
        </div>
      )}

      <div style={{
        padding: '18px 16px',
        display: 'flex', flexDirection: 'column', gap: 18,
        fontFamily: FF,
      }}>
        {/* Event banner — intimate, not corporate */}
        {/* UNIFIED HEADER FRAME (board): the EVENT BOSS PULSE eyebrow is removed so Your Event's
            hero leads bare, identical to Plan/Budget/Guests/The Day. The app-header + ReadinessTrack
            are the only chrome above the hero. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Option A: name + date + countdown live in the persistent header now. */}
          {d.metaParts.length > 0 && (
            <div style={{ fontSize: type.size.sm, color: P.textTertiary }}>{d.metaParts.join(' · ')}</div>
          )}
        </div>

        {/* Sprint 52: Up Next — replaces the previous dot+sentence
            status headline. Editorial command band that tells the planner the
            single next thing to do, and routes them straight there. */}
        <NextBestActionPanel
          command={selectEventNextAction(event)}
          onTabChange={onTabChange}
          isMobile={true}
        />

        {/* Attention System: everything below the hero recedes (.hp-recede-group)
            and brightens as you reach for it — the Up Next panel is the one bright
            thing on the Overview. */}
        <div className="hp-recede-group" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* NEEDS YOU — one unified queue (board: four parallel "waiting on you"
            lists were hierarchy theater). Decisions / Approvals / Requests /
            Questions share one header + total; each is a quiet sub-group. Row
            renderers and routing are unchanged. */}
        {(() => {
          const needs = d.decisions.length + d.approvals.length + d.requests.length + d.questions.length;
          if (dormant('needsYou')) return null;   // UX-4: dormant ⇒ not in the main flow
          // Host shell de-cockpit (task #51): the Decisions/Approvals/Requests/Questions
          // queue + "Your call to make / Waiting on client" + "+Add/+Create" are PLANNER
          // machinery. A host's single next thing is the NextBestActionPanel above; the
          // planner queue never renders to a host.
          if (d.isHost) return null;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionHeader label="Needs You" count={needs} countColor={needs > 0 ? P.red : P.green} />
              {needs === 0 && <EmptyState>Nothing needs you right now — you're clear.</EmptyState>}
              {d.decisions.length > 0 && (<>
                <NeedsSubLabel label="Your call to make" count={d.decisions.length} action="+ Add" onAction={onAddDecision} />
                {d.decisions.map(dc => (
                  <DecisionCard key={dc.id} d={dc} onOpen={() => onTabChange?.('Decisions', dc.id)} isMobile />
                ))}
              </>)}
              {d.approvals.length > 0 && (<>
                <NeedsSubLabel label="Waiting on client" count={d.approvals.length} action="+ Create" onAction={onAddApproval} />
                {d.approvals.map(a => (
                  <ApprovalRow key={a.id} a={a} onOpen={() => onTabChange?.('Decisions', a.id)} />
                ))}
              </>)}
              {d.requests.length > 0 && (<>
                <NeedsSubLabel label="Vendor asks" count={d.requests.length} action="All →" onAction={() => onTabChange?.('Communication')} />
                <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
                  {d.requests.map((r, i) => (
                    <RequestRow key={r.id} r={r} onOpen={() => onTabChange?.('Communication', r.id)} isFirst={i === 0} />
                  ))}
                </div>
              </>)}
              {d.questions.length > 0 && (<>
                <NeedsSubLabel label="Open questions" count={d.questions.length} action="View →" onAction={() => onTabChange?.('Communication')} />
                <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
                  {d.questions.map((q, i) => (
                    <QuestionRow key={q.id} q={q} onOpen={() => onTabChange?.('Communication', q.id)} isFirst={i === 0} />
                  ))}
                </div>
              </>)}
            </div>
          );
        })()}

        {/* Sprint 57F-A: Positive Attention — reassurance right beneath what needs you. */}
        {/* Sprint 60B: Event Identity — what this really is + the must-have */}
        <EventIdentityBlock event={event} isMobile />
        <YoureSetOn items={setItems} isMobile />
        {/* Sprint 57J: Decision Confidence — "do we have enough to lock this?"
            Host de-cockpit (task #51): the "Gathering / Blocked" confidence pills are
            planner-operator framing; hosts never see them. */}
        {!d.isHost && <DecisionsBlock items={decisionItems} isMobile />}

        {/* Next Up — Attention System (board 2026-06-24): for a host, an EMPTY "Next Up"
            is noise (an empty card contradicts "nothing needs you, go enjoy this"). Hide
            the section entirely when there's nothing upcoming; the planner keeps the
            empty-state as an operational signal. */}
        {!dormant('nextUp') && (() => { const nextUpRows = dropHeroDuplicate(d.nextUp, selectEventNextAction(event)); return (nextUpRows.length > 0 || !d.isHost) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader label="Next Up" action="Full timeline →" onAction={() => onTabChange?.('Timeline')} />
          {nextUpRows.length > 0 ? (
            <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
              {nextUpRows.map((t, i) => <TimelineRow key={t.id} t={t} isFirst={i === 0} onOpen={() => { const r = milestoneActionRoute(t.label, event, t.id); onTabChange?.(r.tab, r.vendorId || r.timelineId, r.focusField ? { focusField: r.focusField } : undefined); }} />)}
            </div>
          ) : <EmptyState>No upcoming milestones in window.</EmptyState>}
        </div>
        ); })()}

        {/* Vendor Status */}
        {!dormant('vendors') && (!d.isHost || d.hasVendors) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader label="Vendors" action="All →" onAction={() => onTabChange?.('Vendors')} />
          {d.vendorRows.length > 0 ? (
            <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
              {d.vendorRows.map((v, i) => (
                <VendorRow key={v.id} v={v} event={event} onOpen={() => onTabChange?.('Vendors', v.id)} isFirst={i === 0} />
              ))}
            </div>
          ) : <EmptyState>No vendors yet.</EmptyState>}
        </div>
        )}

        {/* Team — Sprint 52B */}
        <TeamReadinessBlock summary={crewSummary} onManage={() => onTabChange?.('Crew')} gap={10} />

        {/* Documents — Sprint 49: real status from event.documents */}
        {!dormant('documents') && (!d.isHost || d.hasDocs) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader label="Documents" action="All →" onAction={() => onTabChange?.('Documents')} />
          {(() => {
            const cards = getEventDocCards(event);
            return (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  {cards.slice(0, 3).map(c => <DocPill key={c.label} label={c.label} status={c.note} color={c.color} />)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {cards.slice(3, 6).map(c => <DocPill key={c.label} label={c.label} status={c.note} color={c.color} />)}
                </div>
              </>
            );
          })()}
        </div>
        )}

        {/* Sprint UX-4: Upcoming Rail — dormant sections, reachable, no attention demand. */}
        <UpcomingRail items={rail} onTabChange={onTabChange} isMobile />
        </div>{/* /hp-recede-group */}
      </div>

      {/* Sticky bottom action bar — planner-only. Host de-cockpit (task #51): a host
          never hand-files Decisions/Approvals/Requests; their actions come from the
          next-step engine, not a CRM toolbar. */}
      {!d.isHost && (
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: P.elev, borderTop: `1px solid ${P.borderSubtle}`,
        padding: '11px 14px', display: 'flex', gap: 10,
        fontFamily: FF,
      }}>
        <button onClick={onAddDecision} style={actionBtnStyle}>+ Decision</button>
        <button onClick={onAddApproval} style={actionBtnStyle}>+ Approval</button>
        <button onClick={onAddRequest}  style={actionBtnStyle}>+ Request</button>
      </div>
      )}
      {/* Quiet rest-state — a deliberate bottom so a short Pulse reads as CALM, not an
          unfinished void (board punch list). Reinforces the "I've got the rest" voice. */}
      <div style={{ textAlign: 'center', padding: '30px 0 10px' }}>
        <div aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: P.steelBlue, margin: '0 auto 9px', boxShadow: `0 0 8px ${P.steelBlue}99` }} />
        <div style={{ fontSize: type.size.caption, color: P.textTertiary, letterSpacing: '0.02em' }}>Event Boss is watching the rest — enjoy this.</div>
      </div>
    </div>
  );
}

const actionBtnStyle = {
  flex: 1, padding: '8px 0', borderRadius: 7,
  background: 'transparent', border: `1px solid ${P.borderSubtle}`,
  color: P.textPrimary, fontSize: type.size.sm, fontWeight: 600, fontFamily: FF,
  cursor: 'pointer', whiteSpace: 'nowrap',
};

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
function DesktopCommandCenter({ event, isHost = false, data, crewSummary, setItems, decisionItems, dormant, rail, onTabChange, onBack, backLabel, onAddDecision, onAddApproval, onAddRequest, hideUpNext = false }) {
  const d = data;
  const width = useWindowWidth();
  // A self-host lives in ONE calm 760 column (owner directive) — so the Overview is
  // a single column for hosts, never a cramped 2-col board in 760. The planner keeps
  // the wide two-column cockpit, collapsing only on tablet/narrow.
  const twoCol = !isHost && width >= 1024;
  return (
    <div style={{ background: 'transparent', minHeight: '100%', fontFamily: FF }}>
      {/* Studio bar */}
      {onBack && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 24px', background: P.base,
          borderBottom: `1px solid ${P.borderSubtle}`,
        }}>
          <button onClick={onBack} style={{
            background: 'none', border: `1px solid ${P.borderSubtle}`,
            cursor: 'pointer', fontSize: type.size.sm, fontWeight: 500,
            color: P.textSecondary, padding: '4px 11px', borderRadius: 5,
            fontFamily: FF,
          }}>{backLabel || '← Studio'}</button>
          {/* P0: host's name/meta lives in the Pulse hero banner below — don't repeat it
              in the studio bar. Planner cockpit keeps it (no hero banner duplication concern). */}
          {!isHost && <>
          <span style={{ color: P.borderSubtle, fontSize: type.size.xl }}>|</span>
          <span style={{ fontSize: type.size.base, fontWeight: 600, color: P.textPrimary }}>{event.name || 'Event'}</span>
          {event.type && <span style={{ fontSize: type.size.caption, color: P.textSecondary }}>· {event.type}{event.secondaryType ? ` + ${event.secondaryType}` : ''}</span>}
          {d.days !== null && (
            <span style={{ fontSize: type.size.caption, color: d.days <= 30 && d.days > 0 ? P.amber : P.textSecondary }}>
              {/* Figma 655:60 canonical countdown */}
              · {d.days > 0 ? `${d.days} days from now` : d.days === 0 ? 'Today' : `${Math.abs(d.days)} days ago`}
            </span>
          )}
          </>}
        </div>
      )}

      {/* Tab-parity (board 2026-06-24): NO horizontal padding here — the outer content
          gutter + the 760 host column already provide it. The 32px inset made Your Event
          696px wide while every other tab fills 760, so the header/title didn't line up. */}
      <div style={{ padding: '28px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Event banner */}
        {/* UNIFIED HEADER FRAME (board): EVENT BOSS PULSE eyebrow removed — Your Event's hero
            leads bare like every other host tab. The app-header + ReadinessTrack are the chrome. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {/* Option A: name + countdown + date live in the persistent header now. */}
          <div style={{ fontSize: type.size.base, color: P.textSecondary }}>
            {[
              event.type && `${event.type}${event.secondaryType ? ` + ${event.secondaryType}` : ''}`,
              ...d.metaParts,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>

        {/* Sprint 52: Up Next — editorial command band replacing the previous
            status headline. One title, one consequence, one CTA routing to
            the right L4 specialist. */}
        {/* Option A / desktop ribbon (2026-06-24): on desktop the next step is the
            FULL-WIDTH spine ribbon under the header (fills the wide void). Hide this
            in-column copy so the action shows once, not twice. */}
        {!hideUpNext && (
          <NextBestActionPanel
            command={selectEventNextAction(event)}
            onTabChange={onTabChange}
            isMobile={false}
          />
        )}

        {/* Body — two columns on wide, one on tablet/narrow. */}
        <div style={{ display: 'grid', gridTemplateColumns: twoCol ? 'minmax(0, 1fr) 380px' : '1fr', gap: twoCol ? 28 : 20, alignItems: 'start' }}>

          {/* LEFT — action stream. Attention System: each section recedes until
              reached; the Up Next hero above is the one bright thing. */}
          <div className="hp-recede-group" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Open Decisions */}
            {/* NEEDS YOU — unified queue (board: four parallel "waiting on you"
                lists were hierarchy theater). One header + total; quiet sub-groups. */}
            {(() => {
              const needs = d.decisions.length + d.approvals.length + d.requests.length + d.questions.length;
              if (dormant('needsYou')) return null;   // UX-4: dormant ⇒ relocated to the rail
              if (isHost) return null;                // Host de-cockpit (task #51): planner queue never renders to a host
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionHeader label="Needs You" count={needs} countColor={needs > 0 ? P.red : P.green} />
                  {needs === 0 && <EmptyState>Nothing needs you right now — this event is on track.</EmptyState>}
                  {d.decisions.length > 0 && (<>
                    <NeedsSubLabel label="Your call to make" count={d.decisions.length} action="+ Add decision" onAction={onAddDecision} />
                    {d.decisions.map(dc => <DecisionCard key={dc.id} d={dc} onOpen={() => onTabChange?.('Decisions', dc.id)} />)}
                  </>)}
                  {d.approvals.length > 0 && (<>
                    <NeedsSubLabel label="Waiting on client" count={d.approvals.length} action="+ Create approval" onAction={onAddApproval} />
                    {d.approvals.map(a => <ApprovalRow key={a.id} a={a} onOpen={() => onTabChange?.('Decisions', a.id)} />)}
                  </>)}
                  {d.requests.length > 0 && (<>
                    <NeedsSubLabel label="Vendor asks" count={d.requests.length} action="All requests →" onAction={() => onTabChange?.('Communication')} />
                    <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
                      {d.requests.map((r, i) => <RequestRow key={r.id} r={r} onOpen={() => onTabChange?.('Communication', r.id)} isFirst={i === 0} />)}
                    </div>
                  </>)}
                  {d.questions.length > 0 && (<>
                    <NeedsSubLabel label="Open questions" count={d.questions.length} action="View full stream →" onAction={() => onTabChange?.('Communication')} />
                    <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
                      {d.questions.map((q, i) => <QuestionRow key={q.id} q={q} onOpen={() => onTabChange?.('Communication', q.id)} isFirst={i === 0} />)}
                    </div>
                  </>)}
                </div>
              );
            })()}

            {/* Sprint 57F-A: Positive Attention — reassurance below the Needs You queue. */}
            {/* Sprint 60B: Event Identity — what this really is + the must-have */}
            <EventIdentityBlock event={event} />
            <YoureSetOn items={setItems} />
            {/* Sprint 57J: Decision Confidence — "do we have enough to lock this?"
                Host de-cockpit (task #51): "Gathering / Blocked" confidence pills are
                planner-operator framing; hosts never see them. */}
            {!isHost && <DecisionsBlock items={decisionItems} />}
          </div>

          {/* RIGHT — operational rail (recedes section-by-section). */}
          <div className="hp-recede-group" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Planning Health — UX-SAAS: a host doesn't get a "Readiness across the
                event" gauge rail (it reads as an ops cockpit). Planner keeps it. */}
            {!isHost && !dormant('planningHealth') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SectionHeader label="Planning Health" event={event} />
              <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
                <HealthList health={d.health} onTabChange={onTabChange} event={event} />
              </div>
            </div>
            )}

            {/* Next Up — hide the empty card for a host (Attention System: no empty cards
                contradicting "nothing needs you"). Planner keeps the empty-state signal. */}
            {!dormant('nextUp') && (() => { const nextUpRows = dropHeroDuplicate(d.nextUp, selectEventNextAction(event)); return (nextUpRows.length > 0 || !isHost) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SectionHeader label="Next Up" action="Full timeline →" onAction={() => onTabChange?.('Timeline')} />
              {nextUpRows.length > 0 ? (
                <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
                  {nextUpRows.map((t, i) => <TimelineRow key={t.id} t={t} isFirst={i === 0} onOpen={() => { const r = milestoneActionRoute(t.label, event, t.id); onTabChange?.(r.tab, r.vendorId || r.timelineId, r.focusField ? { focusField: r.focusField } : undefined); }} />)}
                </div>
              ) : <EmptyState>No upcoming milestones.</EmptyState>}
            </div>
            ); })()}

            {/* Vendors */}
            {!dormant('vendors') && (!d.isHost || d.hasVendors) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SectionHeader label="Vendors" action="Manage all →" onAction={() => onTabChange?.('Vendors')} />
              {d.vendorRows.length > 0 ? (
                <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
                  {d.vendorRows.map((v, i) => (
                    <VendorRow key={v.id} v={v} event={event} onOpen={() => onTabChange?.('Vendors', v.id)} isFirst={i === 0} />
                  ))}
                </div>
              ) : <EmptyState>No vendors yet.</EmptyState>}
            </div>
            )}

            {/* Team — Sprint 52B */}
            <TeamReadinessBlock summary={crewSummary} onManage={() => onTabChange?.('Crew')} />

            {/* Documents — Sprint 49: real status from event.documents */}
            {!dormant('documents') && (!d.isHost || d.hasDocs) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SectionHeader label="Documents" action="All →" onAction={() => onTabChange?.('Documents')} />
              {(() => {
                const cards = getEventDocCards(event);
                return (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {cards.slice(0, 3).map(c => <DocPill key={c.label} label={c.label} status={c.note} color={c.color} />)}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {cards.slice(3, 6).map(c => <DocPill key={c.label} label={c.label} status={c.note} color={c.color} />)}
                    </div>
                  </>
                );
              })()}
            </div>
            )}

            {/* Sprint UX-4: Upcoming Rail — dormant sections, reachable, no attention demand. */}
            <UpcomingRail items={rail} onTabChange={onTabChange} />
          </div>
        </div>
        {/* Quiet rest-state — board ruling 2026-06-24: desktop was trailing into a void with
            no closing anchor. Mirror the mobile "I've got the rest" footer so a short Pulse
            reads as CALM + complete, not unfinished. */}
        <div style={{ textAlign: 'center', padding: '30px 0 10px' }}>
          <div aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: P.steelBlue, margin: '0 auto 9px', boxShadow: `0 0 8px ${P.steelBlue}99` }} />
          <div style={{ fontSize: type.size.caption, color: P.textTertiary, letterSpacing: '0.02em' }}>Event Boss is watching the rest — enjoy this.</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — routes to mobile/desktop based on viewport
// ─────────────────────────────────────────────────────────────────────────────
export default function CommandCenter({ event, isHost = false, onTabChange, onBack, backLabel, onAddDecision, onAddApproval, onAddRequest, hideUpNext = false, foodPP = null }) {
  const width = useWindowWidth();
  const isMobile = width < 768;
  const data = useMemo(() => deriveCommandCenterData(event, foodPP), [event, foodPP]);

  // Default handlers that route to existing tabs if not supplied
  const addDecision = onAddDecision || (() => onTabChange?.('Planning Tasks'));
  const addApproval = onAddApproval || (() => onTabChange?.('Communication'));
  const addRequest  = onAddRequest  || (() => onTabChange?.('Communication'));

  const crewSummary = summarizeCrew(event);
  // Sprint 57F-A: Positive Attention. Pure reader over existing readiness; empty
  // ([]) when the flag is OFF or the audience isn't host ⇒ nothing renders ⇒
  // production-identical. getEventReadiness is the SAME signal that powers the
  // readiness score — no new calculation.
  const setItems = useMemo(
    () => (attentionActive(event) ? positiveAttention(event, getEventReadiness(event)).items : []),
    [event],
  );
  // Sprint 57J: Decision Confidence. Pure reader over the SAME getEventReadiness +
  // existing resolvers; empty when pi.decisions is off ⇒ production-identical.
  const decisionItems = useMemo(
    () => (decisionsActive() ? decisionConfidence(event, getEventReadiness(event)) : []),
    [event],
  );
  // Sprint UX-4 — every host-facing section routes through the ONE disclosure resolver.
  // Dormant ⇒ not in the main flow (it moves to the Upcoming Rail). Planner ⇒ never
  // dormant (full cockpit preserved). Populated/urgent content is never dormant.
  const sig = useMemo(() => {
    const needs = data.decisions.length + data.approvals.length + data.requests.length + data.questions.length;
    const criticalNeeds = (data.decisions || []).filter(x => x && (x.urgency === 'URGENT' || x.overdue)).length;
    return { needs, criticalNeeds, decisions: data.decisions.length, approvals: data.approvals.length, requests: data.requests.length };
  }, [data]);
  const dormant = (section) => isDormant(section, event, sig);
  const rail = upcomingRail(event, sig);
  const sharedProps = { event, isHost, data, crewSummary, setItems, decisionItems, dormant, rail, onTabChange, onBack, backLabel,
    onAddDecision: addDecision, onAddApproval: addApproval, onAddRequest: addRequest, hideUpNext };
  return isMobile
    ? <MobileCommandCenter  {...sharedProps} />
    : <DesktopCommandCenter {...sharedProps} />;
}
