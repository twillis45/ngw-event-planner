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
import { deriveEventCompressionSummary, classifyTemplateTaskUrgency } from './lib/workflowCompression';
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
import { topPlaybookTask, topPlaybookDecision, playbookCapacity, playbookInfraPrompts, playbookFoodPlan } from './lib/playbooks';
import { renderAction, personaFor, audiencePersona } from './lib/nextActionRenderer';
// Sprint UX-4 — Disclosure architecture: ONE resolver decides section visibility; dormant
// sections relocate to the Upcoming Rail (reachable, never hidden). Planner ⇒ never dormant.
import { isDormant, upcomingRail } from './lib/disclosure';
import { labelFor } from './lib/presentationLabels'; // Sprint 57C Phase 2: vocabulary layer (host labels; pi.labels flag, default OFF)
// Sprint 57H: Because Layer — exposes existing reasoning on a Planning Health row
// (pi.because flag, presentation-only; `because` strings are built from real factors).
import { becauseActive } from './lib/becauseLayer';
// Sprint 57K: Value-Level Confidence — Pattern 014 certainty attached to a value
// (pi.valueConfidence flag, presentation-only; classified by provenance).
import { valueConfidence, valueConfidenceActive, valueWord } from './lib/valueConfidence';
// Stage C (single-source task convergence): readiness counts engine-satisfied work
// even when the host never ticks a box. effectiveDone = task.done || taskSatisfied.
import { effectiveDone, taskSatisfied } from './lib/taskEngine';

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

// ── PHASE_OFFSET mirror (kept local so adapter has no App.js dependency) ──────
const PHASE_OFFSET = {
  '12 Months Out': -365, '10 Months Out': -304, '8 Months Out': -243,
  '6 Months Out':  -182, '5 Months Out':  -152, '4 Months Out': -121,
  '3 Months Out':   -91, '2 Months Out':   -61, '1 Month Out':   -30,
  '2 Weeks Out':    -14, 'Week Of':          -7,
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function daysFrom(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000);
}
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
function isTaskOverdue(task, eventDate, eventType) {
  if (task.done || !eventDate || !(task.week in PHASE_OFFSET)) return false;
  // Compression-aware "behind" — mirrors App.js's isTaskOverdue so the
  // CommandCenter (Your Call to Make / readiness / attention) agrees with the
  // rest of the app. A tight booking that pushes a phase's FIXED offset into the
  // past must NOT mark every task overdue: route through the compression engine
  // so a task counts as behind only when it's genuinely past recovery
  // (risk_lost), not merely compressed into a shorter runway. Naive past-date
  // fallback only when the event type is unknown. PL-3: due-today counts (`<=`).
  const days = daysFrom(eventDate);
  if (eventType && days !== null && days >= 0) {
    return classifyTemplateTaskUrgency(task, days, eventType, PHASE_OFFSET).urgency === 'risk_lost';
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(eventDate + 'T00:00:00');
  due.setDate(due.getDate() + PHASE_OFFSET[task.week]);
  return due <= today;
}
function overdueDays(task, eventDate) {
  if (!eventDate || !(task.week in PHASE_OFFSET)) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(eventDate + 'T00:00:00');
  due.setDate(due.getDate() + PHASE_OFFSET[task.week]);
  return Math.ceil((today - due) / 86400000);
}

// ── Data adapter — derives all Command Center sections from one event ────────
export function deriveCommandCenterData(event) {
  const timeline = event.timeline || [];
  const comms    = event.commClient || [];
  const vendors  = event.vendors || [];
  const guests   = event.guests || [];
  const budget   = event.budget || [];

  // Open Decisions = overdue uncompleted tasks
  const decisions = timeline
    .filter(t => !t.done && isTaskOverdue(t, event.date, event.type))
    .map(t => {
      const od = overdueDays(t, event.date);
      return {
        id: t.id, title: t.task || 'Untitled task',
        owner: t.owner || 'You',
        phase: t.week,
        // Sprint 49: Figma H vocabulary (PENDING/URGENT/AWAITING/OPEN/APPROVED/REJECTED)
        statusLabel: od > 14 ? 'OVERDUE' : 'DUE', // critical≠urgent: these are TIME states (how overdue), not severity jargon.
        statusColor: od > 14 ? P.red : P.amber,
        dueLabel: od > 0 ? `Overdue ${od}d` : 'Today',
        dueColor: P.red,
        impact: `${t.week} · ${t.owner || 'You'} owns`,
      };
    })
    .sort((a, b) => parseInt(b.dueLabel) - parseInt(a.dueLabel))
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

  // Next Up — upcoming tasks within next two phases
  const phaseOrder = Object.keys(PHASE_OFFSET);
  const d = daysFrom(event.date);
  let phaseIdx = phaseOrder.length - 1;
  if (d !== null && d >= 0) {
    if      (d <= 7)   phaseIdx = phaseOrder.indexOf('Week Of');
    else if (d <= 14)  phaseIdx = phaseOrder.indexOf('2 Weeks Out');
    else if (d <= 30)  phaseIdx = phaseOrder.indexOf('1 Month Out');
    else if (d <= 61)  phaseIdx = phaseOrder.indexOf('2 Months Out');
    else if (d <= 91)  phaseIdx = phaseOrder.indexOf('3 Months Out');
    else if (d <= 121) phaseIdx = phaseOrder.indexOf('4 Months Out');
    else if (d <= 152) phaseIdx = phaseOrder.indexOf('5 Months Out');
    else if (d <= 182) phaseIdx = phaseOrder.indexOf('6 Months Out');
    else if (d <= 243) phaseIdx = phaseOrder.indexOf('8 Months Out');
    else if (d <= 304) phaseIdx = phaseOrder.indexOf('10 Months Out');
    else               phaseIdx = phaseOrder.indexOf('12 Months Out');
  }
  // A milestone clears when its ACTION is satisfied by real event state — not only
  // when someone manually ticks `done`. So "Prep for 'Invite guests…'" disappears the
  // moment a count is locked or guests exist; "Set the budget" once a total is set, etc.
  // Keyword-matched against the same domains the next-step CTA routes to. Conservative:
  // unmatched tasks are never auto-cleared (we only hide what we can prove is handled).
  const _stTask = (t) => {
    const s = String(t.task || '').toLowerCase();
    const guests   = event.guests || [];
    const hasGuests = (Number(event.guestCount) || Number(event.guestEstimate) || guests.length) > 0;
    const hasBudget = (Number(event.totalBudget) || 0) > 0 || (event.budget || []).some(b => Number(b.budgeted) > 0);
    const hasVenue  = !!String(event.venue || '').trim() && !/^(tbd|tba)$/i.test(String(event.venue).trim());
    const hasVendors = (event.vendors || []).some(v => v && (v.name || '').trim());
    const hasFood   = (event.foodChoices && Object.keys(event.foodChoices).length > 0) || (event.foodAdd || []).length > 0;
    if (/invite|rsvp|\bguest|head\s?count|who.?s coming|adult|kids?\b/.test(s)) return hasGuests;
    if (/budget|spending plan|set (a |the )?(cost|spend)/.test(s))             return hasBudget;
    if (/venue|location|book.*(space|hall|room|venue)|secure.*(space|venue)/.test(s)) return hasVenue;
    if (/vendor|cater|photograph|\bdj\b|florist|hire|book a /.test(s))         return hasVendors;
    if (/menu|food plan|what to (cook|serve|make)|plan the food/.test(s))       return hasFood;
    return false;
  };
  const nextUp = timeline
    .filter(t => !t.done && !_stTask(t))
    .filter(t => phaseOrder.indexOf(t.week) >= phaseIdx && phaseOrder.indexOf(t.week) <= phaseIdx + 1)
    .slice(0, 4)
    .map(t => ({
      id: t.id,
      label: t.task || 'Untitled task',
      sub: `${t.week} · ${t.owner || 'You'}`,
      color: isTaskOverdue(t, event.date, event.type) ? P.red : P.amber,
      dateLabel: isTaskOverdue(t, event.date, event.type) ? 'OVD' : t.week === 'Week Of' ? 'WK' : 'SOON',
      dateNum: t.week === 'Week Of' ? '7d' : t.week === '2 Weeks Out' ? '14d' : (t.week || '').replace(/[^0-9]/g, '') + 'm',
    }));

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

  // Vendor issues count (anything not Confirmed/Booked) — caterer drift
  // counts as an issue even though the vendor itself is confirmed.
  const vendorIssuesCount = vendors.filter(v => v.status !== 'Confirmed' && v.status !== 'Booked').length
    + (catererDrift ? 1 : 0);

  // Planning Health (operational readiness, not financial)
  const tasksDone   = timeline.filter(t => t.done).length;
  const tasksTotal  = timeline.length;
  const overdueCount = timeline.filter(t => !t.done && isTaskOverdue(t, event.date, event.type)).length;
  const confirmedVendors = vendors.filter(v => v.status === 'Confirmed' || v.status === 'Booked').length;
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
  if (_isHostBudget) { try { const _fp = playbookFoodPlan(event); if (_fp) { _foodSpent = _fp.spentHigh || 0; } } catch (e) { /* non-fatal */ } }
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
      vendors.length === 0 ? 'AT RISK'
        : confirmedVendors === vendors.length ? 'ON TRACK'
        : (vendors.length - confirmedVendors) >= 3 ? 'AT RISK'
        : 'ATTENTION',
      vendors.length > 0 ? `${confirmedVendors} of ${vendors.length} confirmed` : 'No vendors yet') : null,
    stat('Guests',
      guests.length === 0 ? 'AT RISK'
        : yesGuests / guests.length >= 0.7 ? 'ON TRACK'
        : 'ATTENTION',
      guests.length > 0 ? `${yesGuests} confirmed of ${guests.length} invited`
        : event.guestEstimate ? `${event.guestEstimate} estimated · no RSVPs` : 'No guests yet'),
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
export function getEventAttention(event) {
  const timeline = event.timeline || [];
  const comms    = event.commClient || [];
  const vendors  = event.vendors || [];
  return {
    decisions: timeline.filter(t => !t.done && isTaskOverdue(t, event.date, event.type)).length,
    approvals: comms.filter(m => m.message_type === 'approval_request' && !['approved', 'rejected'].includes(m.approval_status)).length,
    // Split: an approval still on the planner to SEND is not "awaiting client".
    approvalsAwaiting: comms.filter(m => m.message_type === 'approval_request' && !['approved', 'rejected'].includes(m.approval_status) && approvalIsSent(m)).length,
    requests:  comms.filter(m => m.message_type !== 'approval_request' && isInboundMessage(m) && (m.body || m.text) && !m.handled && !m.answered).length,
    vendorIssues: vendors.filter(v => v.status !== 'Confirmed' && v.status !== 'Booked').length,
  };
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
    const compression = deriveEventCompressionSummary(ev, daysFrom, PHASE_OFFSET);
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
      if (t.done || !isTaskOverdue(t, ev.date, ev.type)) continue;
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
      // Sprint 49: Figma F vocabulary — only 'Confirmed' (or legacy 'Booked')
    // is fully ready. Anything else (Considering / Quoted / Contracted /
    // Deposit Paid / Pending / Partial / Not Started / Unconfirmed) still
    // needs the planner's attention in some way.
    const isConfirmed = v.status === 'Confirmed' || v.status === 'Booked';
      if (isConfirmed) continue;
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
  const overdueCount   = timeline.filter(t => !effectiveDone(event, t) && isTaskOverdue(t, event.date, event.type)).length;
  const tasksDone      = timeline.filter(t => effectiveDone(event, t)).length;
  const tasksTotal     = timeline.length;
  const confirmedV     = vendors.filter(v => v.status === 'Confirmed' || v.status === 'Booked').length;
  const unconfirmedV   = vendors.length - confirmedV;

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
    (v.status === 'Confirmed' || v.status === 'Booked') &&
    !(v.contractSigned === true || v.contract_signed === true)
  ).length;
  let vendor;
  if      (vendors.length === 0)               vendor = { status: 'AT_RISK',   label: 'At risk',  note: 'No vendors' };
  else if (unconfirmedV >= 3)                  vendor = { status: 'AT_RISK',   label: 'At risk',  note: `${unconfirmedV} unconfirmed` };
  else if (unconfirmedV > 0)                   vendor = { status: 'ATTENTION', label: 'Attention', note: `${unconfirmedV} unconfirmed` };
  else if (confirmedNoContract > 0)            vendor = { status: 'ATTENTION', label: 'Attention', note: `${confirmedNoContract} missing contract` };
  else                                          vendor = { status: 'ON_TRACK',  label: 'On track', note: `${confirmedV} confirmed` };

  // Timeline readiness
  const taskPct = tasksTotal > 0 ? tasksDone / tasksTotal : 0;
  let timelineR;
  if      (tasksTotal === 0)                   timelineR = { status: 'AT_RISK',  label: 'At risk', note: 'No tasks' };
  else if (overdueCount > 2)                   timelineR = { status: 'AT_RISK',  label: 'At risk', note: `${overdueCount} overdue` };
  else if (overdueCount > 0)                   timelineR = { status: 'ATTENTION', label: 'Attention', note: `${overdueCount} overdue` };
  else if (taskPct >= 0.8)                     timelineR = { status: 'ON_TRACK', label: 'On track', note: `${Math.round(taskPct*100)}%` };
  else if (taskPct >= 0.5)                     timelineR = { status: 'ATTENTION', label: 'Attention', note: `${Math.round(taskPct*100)}%` };
  else                                          timelineR = { status: 'ATTENTION', label: 'Attention', note: `${Math.round(taskPct*100)}%` };

  // Sprint 49: real documents readiness (was previously placeholder)
  const documents = getDocumentsReadiness(event);

  return { decision, vendor, timeline: timelineR, document: documents };
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
        primaryRoute: { eventId: todayEv.id, tab: 'Event Day Schedule' },
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
      primaryRoute: { eventId: todayEv.id, tab: 'Event Day Schedule' },
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
      primaryRoute: { eventId: ev.id, tab: 'Command' },
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
      primaryRoute: { eventId: upcoming.ev.id, tab: 'Command' },
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
function _eventFoundationActions(event) {
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
      cta: 'Set date', route: { tab: 'Details', focusField: 'event-date' },
      done: dateSet, handledFact: dateSet ? 'Date set' : null,
    },
    {
      id: 'guests', domain: 'guests', title: 'Add your guest list.',
      consequence: 'Who’s coming is the first domino — it sizes the budget, the food, and the schedule.',
      cta: 'Add guests', route: { tab: 'Guests' },
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
      cta: 'Plan food', route: { tab: 'Planning' },
      done: hasFood, handledFact: hasFood ? 'Food sourced' : null,
    },
  ];
}

// eventPlan(event) — the public single source. Exported and consumed by every surface.
export function eventPlan(event) {
  if (!event) return { nextActions: [], progress: { done: 0, total: 0 }, handled: [] };

  const foundation = _eventFoundationActions(event);
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
  const top = (() => { try { return _selectEventNextActionInner(event); } catch { return null; } })();
  const topAction = top && top.title ? {
    id: top.category || 'top',
    domain: top.category || 'top',
    title: top.title,
    consequence: top.consequence || null,
    cta: top.primaryCta || null,
    route: top.primaryRoute || null,
    done: false,
  } : null;

  // Map the top action's category to a foundational domain so we can dedupe — e.g. the
  // engine's 'readiness' budget step and the foundational 'budget' domino are the same
  // thing and must not both appear.
  const CATEGORY_TO_DOMAIN = { start: 'guests', readiness: 'budget' };
  const topDomain = topAction ? (CATEGORY_TO_DOMAIN[top.category] || top.category) : null;

  const seen = new Set(topDomain ? [topDomain] : []);
  const nextActions = [];
  if (topAction) nextActions.push(topAction);
  for (const a of foundation) {
    if (a.done) continue;            // satisfied dominoes never surface as a next action
    if (seen.has(a.domain)) continue; // already represented (e.g. by the engine top)
    seen.add(a.domain);
    nextActions.push(a);
  }
  return { nextActions, progress, handled };
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
  const rendered = renderAction(_selectEventNextActionWithBadge(event), personaFor(event));
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

function _selectEventNextActionWithBadge(event) {
  const cmd = _selectEventNextActionInner(event);
  if (!cmd || !event) return cmd;
  // Don't double up — if compression IS the primary, no sub-badge.
  if (cmd.category === 'compression') return cmd;
  const compression = deriveEventCompressionSummary(event, daysFrom, PHASE_OFFSET);
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

function _selectEventNextActionInner(event) {
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
      primaryRoute: { tab: 'Guests' },
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
      consequence: `Caterer holds ${event.catererCount}; ${d.yesGuestsCount} guests are confirmed. Out-of-sync headcounts cascade into seating, meal counts, and the run of show.`,
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
      level: 'critical',
      category: 'decision',
      title: `Resolve "${(urgent.title || 'an open decision').slice(0, 80)}".`,
      consequence: od > 0
        ? `Overdue by ${daysWord(od)}. Open decisions block timeline, vendor, and approval progress downstream.`
        : `Pending decision. Holding it open blocks downstream timeline + vendor work.`,
      primaryCta: 'Decide',
      primaryRoute: { tab: 'Decisions', decisionId: urgent.id },
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
      title: cna.title || `Get an updated COI from ${v.name}.`,
      consequence: cna.consequence || 'A current certificate of insurance naming the venue is required to clear load-in.',
      primaryCta: 'Get COI',
      primaryRoute: { tab: 'Vendors', vendorId: v.id, vendorSection: 'documents' },
      contextLine: daysSub,
    };
  }

  const unconfirmed = vendors.find(v => v.status !== 'Confirmed' && v.status !== 'Booked' && v.name);
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
  const compression = deriveEventCompressionSummary(event, daysFrom, PHASE_OFFSET);
  if (compression && compression.significant) {
    const doNow = compression.doNow.length;
    // Owner directive 2026-06-24: the next step must BE the action — never a situational
    // narration ("A few things land around the same time"). The clustering is CONTEXT,
    // not the headline. Lead with the single concrete first task; demote the "+N more"
    // to a quiet consequence; route STRAIGHT to that task (less friction, no extra
    // "which one?" question). The vague headline only survives as a last-resort fallback
    // when the engine somehow has no named first task.
    const first = compression.doNow[0];
    const firstText = first && (first.task || first.title)
      ? String(first.task || first.title).trim().replace(/[.\s]+$/, '')
      : null;
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
      // Route STRAIGHT to the first task when we have its id (the editor scrolls to it);
      // fall back to the '__compressed__' sentinel (Timeline auto-selects the
      // "Tight timeline" filter) only when there's no specific task to land on.
      primaryRoute: (first && first.id)
        ? { tab: 'Planning Tasks', taskId: first.id }
        : { tab: 'Planning Tasks', taskId: '__compressed__' },
      contextLine: daysSub,
    };
  }

  // Tier 5: timeline risk
  const readiness = getEventReadiness(event);
  if (readiness.timeline && readiness.timeline.status === 'AT_RISK') {
    // Owner directive 2026-06-24: a verb CTA must DEEP-LINK to the action, not dump the
    // host on a whole tab. "Catch up" lands on the FIRST overdue task (the editor scrolls
    // to it); fall back to the Timeline only when there's no specific task to open.
    const firstOverdue = (event.timeline || []).find((t) => t && !t.done && isTaskOverdue(t, event.date, event.type));
    return {
      level: 'attention',
      category: 'timeline',
      title: 'Catch up on overdue planning tasks.',
      consequence: `${readiness.timeline.note}${days !== null && days >= 0 ? ` · only ${daysWord(days)} left to recover` : ''}. Falling further behind compounds vendor and budget risk.`,
      primaryCta: 'Catch up',
      primaryRoute: firstOverdue ? { tab: 'Planning Tasks', taskId: firstOverdue.id } : { tab: 'Timeline' },
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
      primaryRoute: (() => {
        const s = String(nextUp.label || '').toLowerCase();
        if (/guest|invite|rsvp|head\s?count|seat/.test(s)) return { tab: 'Guests' };
        if (/budget|deposit|payment|\bpay\b|\bcost|spend|quote|invoice/.test(s)) return { tab: 'Budget' };
        if (/vendor|cater|venue|photograph|\bdj\b|florist|rental|baker|bartend|\bbook\b/.test(s)) return { tab: 'Vendors' };
        if (/food|menu|shop|grocer|drink|supplies|seating/.test(s)) return { tab: 'Planning' };
        return { tab: 'Timeline', timelineId: nextUp.id };
      })(),
      contextLine: daysSub,
    };
  }

  // Tier 7.5 (Host Activation v1 · Phase 4): a brand-new event with nothing planned
  // yet gets a START HERE — never a dead "nothing urgent". The guest count is the
  // first domino (it drives the budget, the food, and the timeline).
  const isEmptyEvent = (event.timeline || []).length === 0
    && (event.vendors || []).filter(v => v && (v.name || '').trim()).length === 0
    && (event.guests || []).length === 0
    && (event.budget || []).length === 0;
  if (isEmptyEvent) {
    return {
      level: 'attention',
      category: 'start',
      title: 'Start here — add who’s coming.',
      consequence: 'Your guest count is the first domino: it drives the budget, the food, and the timeline.',
      primaryCta: 'Add guests',
      primaryRoute: { tab: 'Guests' },
      contextLine: daysSub,
    };
  }

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
  return {
    level: 'neutral',
    category: 'neutral',
    title: 'Event on track. Nothing urgent right now.',
    consequence: days !== null && days >= 0 && days <= 30
      ? 'A readiness sweep this close to event day usually surfaces what was about to slip.'
      : 'Use the quiet window to push timeline + vendor commitments forward of schedule.',
    primaryCta: 'Review readiness',
    primaryRoute: { tab: 'Timeline' },
    contextLine: daysSub,
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
function TimelineRow({ t, isFirst }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px',
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
    </div>
  );
}

// ── Vendor row ────────────────────────────────────────────────────────────────
function VendorRow({ v, onOpen, isFirst }) {
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
      }}>{v.statusLabel}</span>
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
          {/* Sprint 57K: Value-Level Confidence — Pattern 014 word travels WITH the
              value (small steel pill before the number), only when pi.valueConfidence
              is on AND this row's value provenance is classifiable. */}
          {valueConfidenceActive() && h.valueLevel && (
            <span style={{
              display: 'inline-block', fontSize: type.size["2xs"], fontWeight: 700, letterSpacing: '0.06em',
              color: P.textSecondary, border: `1px solid ${P.borderSubtle}`, borderRadius: 4,
              padding: '0px 4px', marginRight: 6, verticalAlign: '1px', textTransform: 'uppercase',
            }}>{valueWord(h.valueLevel, event)}</span>
          )}
          {h.note}
        </div>
        {/* Sprint 57H: existing reasoning, exposed. Quiet steel line, one notch below
            the note (tier-3 whisper); renders only when pi.because is on AND this row
            carries a traceable `because`. */}
        {becauseActive() && h.because && (
          <div style={{ fontSize: type.size.xs, color: P.textTertiary, marginTop: 1 }}>
            <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>Because</span> {h.because}
          </div>
        )}
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
  const label =
    command.level === 'critical'  ? 'Next step · Critical' :
    command.level === 'attention' ? 'Next step · Needs you' :
                                    'Next step';

  const handleCta = () => {
    if (!command.primaryRoute) return;
    // Pull section/focus hints + eventId OUT of rest so `idKey` only ever picks a
    // real item id (decisionId / vendorId / commId / timelineId).
    const { tab, vendorSection, foodFocus, eventId, ...rest } = command.primaryRoute;
    const idKey = Object.keys(rest)[0];
    // Forward vendorSection / foodFocus as the third opts arg so the EventPlanner
    // route chain lands in the right section, or scrolls to the right food line (#12).
    const opts = (vendorSection || foodFocus) ? { vendorSection, foodFocus } : undefined;
    onTabChange && onTabChange(tab, rest[idKey] || null, opts);
  };

  return (
    <div style={{
      position: 'relative',
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
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: type.size.xs, fontWeight: type.weight.semibold,
              color: sbTone, background: sbTone + '18',
              border: `1px solid ${sbTone}44`, borderRadius: 99,
              padding: '2px 8px', letterSpacing: '0.06em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>⏱ {sb.label}</span>
            <span style={{ fontSize: type.size.sm, color: P.textSecondary, fontFamily: FF, flex: 1, minWidth: 0 }}>
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
        {!dormant('nextUp') && (d.nextUp.length > 0 || !d.isHost) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader label="Next Up" action="Full timeline →" onAction={() => onTabChange?.('Timeline')} />
          {d.nextUp.length > 0 ? (
            <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
              {d.nextUp.map((t, i) => <TimelineRow key={t.id} t={t} isFirst={i === 0} />)}
            </div>
          ) : <EmptyState>No upcoming milestones in window.</EmptyState>}
        </div>
        )}

        {/* Vendor Status */}
        {!dormant('vendors') && (!d.isHost || d.hasVendors) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader label="Vendors" action="All →" onAction={() => onTabChange?.('Vendors')} />
          {d.vendorRows.length > 0 ? (
            <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
              {d.vendorRows.map((v, i) => (
                <VendorRow key={v.id} v={v} onOpen={() => onTabChange?.('Vendors', v.id)} isFirst={i === 0} />
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
            {!dormant('nextUp') && (d.nextUp.length > 0 || !isHost) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SectionHeader label="Next Up" action="Full timeline →" onAction={() => onTabChange?.('Timeline')} />
              {d.nextUp.length > 0 ? (
                <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
                  {d.nextUp.map((t, i) => <TimelineRow key={t.id} t={t} isFirst={i === 0} />)}
                </div>
              ) : <EmptyState>No upcoming milestones.</EmptyState>}
            </div>
            )}

            {/* Vendors */}
            {!dormant('vendors') && (!d.isHost || d.hasVendors) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SectionHeader label="Vendors" action="Manage all →" onAction={() => onTabChange?.('Vendors')} />
              {d.vendorRows.length > 0 ? (
                <div style={{ ...cardEdge, border: cardEdge.border, borderRadius: radius.md }}>
                  {d.vendorRows.map((v, i) => (
                    <VendorRow key={v.id} v={v} onOpen={() => onTabChange?.('Vendors', v.id)} isFirst={i === 0} />
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
export default function CommandCenter({ event, isHost = false, onTabChange, onBack, backLabel, onAddDecision, onAddApproval, onAddRequest, hideUpNext = false }) {
  const width = useWindowWidth();
  const isMobile = width < 768;
  const data = useMemo(() => deriveCommandCenterData(event), [event]);

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
