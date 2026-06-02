// demo/src/lib/vendorIntelligence.js
// Sprint 53 · Vendor Intelligence + Detail Cockpit Pass
//
// Deterministic vendor readiness logic — no AI, no fake scoring.
// Every helper is a pure function over { vendor, event } with explicit
// rules and honest "not_tracked" states when the data model doesn't
// support a signal yet.
//
// Used by:
//   - VendorPlanningWorkspace (command strip, list rows, detail cockpit)
//   - CommandCenter vendor attention items (future consolidation)
//
// Vocabulary (kept in sync with the Sprint 53 brief):
//   readiness levels: 'safe' | 'attention' | 'critical' | 'not_tracked' | 'not_started'
//   lifecycle stages: 10-stage model from inquiry through archived
//   challenge categories: 9 categories from the brief
//
// Field-model reality (per inspection report):
//   - vendor.status: 'Considering' | 'Quoted' | 'Contracted' | 'Deposit Paid' | 'Confirmed' (+ legacy 'Booked')
//   - vendor.contractSigned (bool — camelCase). Some legacy code reads contract_signed (snake_case).
//   - vendor.depositPaid, vendor.balancePaid (bools). vendor.payDueDate (ISO).
//   - vendor.arrivalTime (HH:MM). vendor.contactName, vendor.contact (email), vendor.phone.
//   - vendor.commsChecklist ({ stringPrompt: bool }) — exists in model but not surfaced today.
//   - vendor.log (array of { id, date, text }).
//   - NO day-of contact field, NO check-in field, NO post-event closeout fields,
//     NO vendor→document FK. We represent these as 'not_tracked' honestly.

import { getVendorRequiredQuestions } from './vendorQuestions';

// ── Tiny date utils (deliberately self-contained — no import from elsewhere) ──
function daysFrom(iso) {
  if (!iso) return null;
  const t = new Date(iso + 'T00:00:00').getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}
function fieldEither(v, ...keys) {
  for (const k of keys) {
    if (v && v[k] !== undefined && v[k] !== null && v[k] !== '') return v[k];
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Lifecycle stage
// ─────────────────────────────────────────────────────────────────────────────
// Maps real vendor data into the 10-stage brief model.
// The underlying STAGES enum is narrower; we use other signals (commsChecklist
// completion ratio, event date, balancePaid) to advance vendors past Booked
// into Planning / Final Confirmation / Day-Of / Closeout.
// Sprint 56 tone calm-down: friendlier lifecycle labels. "Day-Of Active" was
// operational/military-adjacent; "Post-Event Closeout" was bureaucratic.
// "Event day" and "After the event" read like plain English without losing
// any meaning for pros.
export const VENDOR_LIFECYCLE_STAGES = [
  'Looking',
  'Shortlisted',
  'Selected',
  'Contracting',
  'Booked',
  'Planning',
  'Final Confirmation',
  'Event Day',
  'After the Event',
  'Archived',
];

export function getVendorLifecycleStage(vendor, event) {
  if (!vendor) return 'Inquiry / Needed';
  const status = vendor.status || '';
  const eventDays = event && event.date ? daysFrom(event.date) : null;
  const eventPast = eventDays !== null && eventDays < 0;
  const eventToday = eventDays === 0;
  const eventSoon = eventDays !== null && eventDays >= 0 && eventDays <= 14;

  // Post-event states
  if (eventPast) {
    if (vendor.balancePaid === true) return 'Archived';
    return 'After the Event';
  }
  if (eventToday) return 'Event Day';

  // Pre-event states driven by status
  switch (status) {
    case 'Considering': return 'Shortlisted';
    case 'Quoted':      return 'Selected';
    case 'Contracted':  return 'Contracting';
    case 'Deposit Paid': return 'Booked';
    case 'Booked':       return 'Booked';
    case 'Confirmed': {
      if (eventSoon) return 'Final Confirmation';
      return 'Planning';
    }
    case 'Not Started':
    case '':
    case undefined:
      return 'Looking';
    default:
      return 'Planning';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Challenge summary — readiness across 9 brief categories
// ─────────────────────────────────────────────────────────────────────────────
// Each category returns { level, note }.
//   level: 'safe' | 'attention' | 'critical' | 'not_tracked'
//   note: short consequence-based phrase
//
// Categories per brief: Booking, Communication, Logistics, Scope, Timeline,
// Financial, Documents, Day-of, Closeout.
export function getVendorChallengeSummary(vendor, event) {
  if (!vendor) return {};
  const status = vendor.status || '';
  const isCommitted = status === 'Confirmed' || status === 'Booked' || status === 'Deposit Paid' || status === 'Contracted';
  const isConfirmed = status === 'Confirmed' || status === 'Booked';
  const contractSigned = vendor.contractSigned === true || vendor.contract_signed === true;
  const depositPaid = vendor.depositPaid === true;
  const balancePaid = vendor.balancePaid === true;
  const payDays = daysFrom(vendor.payDueDate);
  const payOverdue = payDays !== null && payDays < 0 && !balancePaid;
  const arrivalSet = !!fieldEither(vendor, 'arrivalTime', 'arrival_time');
  const eventDays = event && event.date ? daysFrom(event.date) : null;
  const eventPast = eventDays !== null && eventDays < 0;
  const eventClose = eventDays !== null && eventDays >= 0 && eventDays <= 30;
  const cost = vendor.cost || 0;

  // ── Booking ──
  let booking;
  if (isConfirmed && contractSigned) booking = { level: 'safe', note: 'Booked and contract signed.' };
  else if (isConfirmed && !contractSigned) booking = { level: 'attention', note: 'Confirmed but no contract on file.' };
  else if (status === 'Deposit Paid' || status === 'Contracted') booking = { level: 'attention', note: 'Booking in progress — not yet confirmed.' };
  else if (status === 'Quoted') booking = { level: 'attention', note: 'Quoted — needs decision before booking.' };
  else if (status === 'Considering' || !status) booking = { level: 'not_started', note: 'Not booked yet.' };
  else booking = { level: 'attention', note: `Status: ${status}.` };

  // ── Communication ──
  const checklistKeys = vendor.commsChecklist ? Object.keys(vendor.commsChecklist) : [];
  const checklistDone = checklistKeys.filter(k => vendor.commsChecklist[k]).length;
  const checklistRatio = checklistKeys.length > 0 ? checklistDone / checklistKeys.length : null;
  const lastLog = (vendor.log || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  const lastLogDays = lastLog && lastLog.date ? -daysFrom(lastLog.date) : null;
  let communication;
  if (!vendor.contact && !vendor.phone) {
    communication = { level: 'critical', note: 'No contact details on file — cannot reach vendor.' };
  } else if (checklistRatio !== null && checklistRatio < 0.5 && eventClose) {
    communication = { level: 'attention', note: `Less than half of vendor comms checklist complete with ${eventDays}d left.` };
  } else if (lastLogDays !== null && lastLogDays > 30 && isCommitted && !eventPast) {
    communication = { level: 'attention', note: `Last touch ${lastLogDays}d ago — radio silence.` };
  } else if (vendor.contact || vendor.phone) {
    communication = { level: 'safe', note: 'Contact channels available.' };
  } else {
    communication = { level: 'not_tracked', note: 'Communication state not tracked yet.' };
  }

  // ── Logistics ── (arrival, setup, access — we only really have arrivalTime)
  let logistics;
  if (eventClose && !arrivalSet && isCommitted) {
    logistics = { level: 'attention', note: 'Arrival/setup time not confirmed.' };
  } else if (arrivalSet) {
    logistics = { level: 'safe', note: 'Arrival time set.' };
  } else {
    logistics = { level: 'not_tracked', note: 'Logistics not tracked yet.' };
  }

  // ── Scope ── (we don't have a scope field. Use category presence + budgetCategory match)
  let scope;
  if (!vendor.category) scope = { level: 'attention', note: 'Vendor category not set — scope unclear.' };
  else if (isCommitted) scope = { level: 'safe', note: `${vendor.category} scope agreed via booking.` };
  else scope = { level: 'not_tracked', note: 'Scope locked at booking.' };

  // ── Timeline ── (based on run-of-show match)
  let timeline;
  const rosMatches = (event && event.ros) ? event.ros.filter(r => r.vendorName && vendor.name && r.vendorName.toLowerCase().includes(vendor.name.toLowerCase())).length : 0;
  if (rosMatches > 0) timeline = { level: 'safe', note: `${rosMatches} run-of-show entr${rosMatches === 1 ? 'y' : 'ies'} linked.` };
  else if (isCommitted && eventClose) timeline = { level: 'attention', note: 'No run-of-show entries reference this vendor.' };
  else timeline = { level: 'not_tracked', note: 'No run-of-show entries yet.' };

  // ── Financial ──
  let financial;
  if (cost === 0 && !isCommitted) financial = { level: 'not_tracked', note: 'No cost set yet.' };
  else if (payOverdue) financial = { level: 'critical', note: `Final payment overdue by ${-payDays}d.` };
  else if (isConfirmed && balancePaid) financial = { level: 'safe', note: 'Paid in full.' };
  else if (isConfirmed && depositPaid && payDays !== null && payDays >= 0 && payDays <= 7) financial = { level: 'attention', note: `Final payment due in ${payDays}d.` };
  else if (depositPaid) financial = { level: 'safe', note: 'Deposit paid; balance pending.' };
  else if (isCommitted && !depositPaid) financial = { level: 'attention', note: 'Deposit not yet recorded.' };
  else financial = { level: 'not_tracked', note: 'Payment state not tracked yet.' };

  // ── Documents ── (no FK to event.documents; rely on contractSigned)
  let documents;
  if (contractSigned) documents = { level: 'safe', note: 'Contract signed (file storage coming).' };
  else if (isConfirmed) documents = { level: 'attention', note: 'Contract not on file.' };
  else documents = { level: 'not_tracked', note: 'Contract not yet expected.' };

  // ── Day-of ── (model doesn't support check-in / setup / arrival actuals)
  let dayOf;
  if (eventPast) dayOf = { level: 'not_tracked', note: 'Day-of details not retained after the event.' };
  else if (eventClose) {
    if (arrivalSet) dayOf = { level: 'attention', note: 'Arrival time set — day-of check-in not yet tracked.' };
    else dayOf = { level: 'attention', note: 'Day-of plan not confirmed.' };
  } else dayOf = { level: 'not_tracked', note: 'Day-of activates closer to the event.' };

  // ── Closeout ── (no closeout fields exist)
  let closeout;
  if (eventPast) {
    if (balancePaid) closeout = { level: 'attention', note: 'Final payment recorded — deliverables/closeout not tracked yet.' };
    else closeout = { level: 'critical', note: 'Final payment not recorded after event.' };
  } else closeout = { level: 'not_tracked', note: 'Closeout activates after the event.' };

  return { booking, communication, logistics, scope, timeline, financial, documents, dayOf, closeout };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Overall readiness — derived from challenge summary
// ─────────────────────────────────────────────────────────────────────────────
// Returns { level, label, summary, counts }
//   level: 'safe' | 'attention' | 'critical' | 'not_started' | 'closed'
//   label: human-readable status (e.g. "Needs attention", "Critical", "Ready for day-of")
//   summary: short consequence line
//   counts: { critical, attention, safe, notTracked } across challenge categories
export function getVendorReadiness(vendor, event) {
  if (!vendor) return { level: 'not_started', label: 'Not started', summary: '', counts: {} };
  const status = vendor.status || '';
  const eventDays = event && event.date ? daysFrom(event.date) : null;
  const eventPast = eventDays !== null && eventDays < 0;
  const eventToday = eventDays === 0;
  const eventSoon = eventDays !== null && eventDays >= 0 && eventDays <= 14;

  const c = getVendorChallengeSummary(vendor, event);
  const cats = Object.values(c);
  const critical = cats.filter(x => x && x.level === 'critical').length;
  const attention = cats.filter(x => x && x.level === 'attention').length;
  const safe = cats.filter(x => x && x.level === 'safe').length;
  const notTracked = cats.filter(x => x && x.level === 'not_tracked').length;
  const counts = { critical, attention, safe, notTracked };

  // Closed state — past event + balance paid
  if (eventPast && vendor.balancePaid) {
    return { level: 'closed', label: 'Closed', summary: 'Event complete; vendor paid in full.', counts };
  }

  // Critical state — any category is critical
  if (critical > 0) {
    const first = cats.find(x => x && x.level === 'critical');
    return { level: 'critical', label: 'Critical', summary: first ? first.note : 'Critical issue.', counts };
  }

  // Not started — early lead
  if (status === 'Considering' || !status) {
    return { level: 'not_started', label: 'Not started', summary: 'Not booked yet.', counts };
  }

  // Attention state — Sprint 56 tone calm-down: "Needs attention" reads
  // SaaS-y; "Needs follow-up" is what planners actually say.
  if (attention > 0) {
    let label = 'Needs follow-up';
    if (eventToday) label = 'Day-of follow-up';
    const first = cats.find(x => x && x.level === 'attention');
    return { level: 'attention', label, summary: first ? first.note : 'Items pending.', counts };
  }

  // Safe — leans on event proximity for label
  let label = 'Safe';
  if (eventSoon || eventToday) label = 'Ready for day-of';
  return { level: 'safe', label, summary: eventSoon ? 'All checks passing — ready for event day.' : 'Booking healthy.', counts };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Next action — deterministic priority ladder
// ─────────────────────────────────────────────────────────────────────────────
// Returns { title, consequence, ctaCopy, sourceCategory } or null if vendor is fully closed.
// Priority order per brief:
//   1. Critical day-of issue (we don't have day-of issues as data → skip unless near event)
//   2. Missing required category (planner-level — out of vendor scope, skip)
//   3. Unsigned contract on confirmed vendor
//   4. Deposit/final payment overdue
//   5. Missing day-of contact (we don't have dedicated day-of contact field → use phone presence near event)
//   6. Missing arrival/setup time
//   7. Timeline dependency conflict (catering count drift — handled at CommandCenter; vendor-level here is RoS absence)
//   8. Unanswered required vendor-type question
//   9. Missing required document (no FK exists → conflate with contract)
//   10. Closeout item overdue (past event + unpaid)
//   11. Neutral fallback: Review vendor readiness
export function getVendorNextAction(vendor, event) {
  if (!vendor) return null;
  const status = vendor.status || '';
  const isConfirmed = status === 'Confirmed' || status === 'Booked';
  const isCommitted = isConfirmed || status === 'Deposit Paid' || status === 'Contracted';
  const contractSigned = vendor.contractSigned === true || vendor.contract_signed === true;
  const depositPaid = vendor.depositPaid === true;
  const balancePaid = vendor.balancePaid === true;
  const payDays = daysFrom(vendor.payDueDate);
  const arrivalSet = !!fieldEither(vendor, 'arrivalTime', 'arrival_time');
  const eventDays = event && event.date ? daysFrom(event.date) : null;
  const eventPast = eventDays !== null && eventDays < 0;
  const eventClose = eventDays !== null && eventDays >= 0 && eventDays <= 30;
  const eventVeryClose = eventDays !== null && eventDays >= 0 && eventDays <= 14;
  const vname = vendor.name || 'this vendor';
  const cat = (vendor.category || 'vendor').toLowerCase();

  // Closeout-overdue first (past event)
  if (eventPast && !balancePaid && (vendor.cost || 0) > 0) {
    return {
      title: `Settle final payment with ${vname}.`,
      consequence: 'Event passed and balance not marked paid. Closeout is incomplete until payment lands.',
      ctaCopy: 'Mark balance paid',
      sourceCategory: 'closeout',
    };
  }
  if (eventPast && balancePaid) {
    return {
      title: `Request deliverables and rate ${vname}.`,
      consequence: 'Post-event follow-up: collect deliverables, send thank-you, decide if this vendor goes on the preferred list.',
      ctaCopy: 'Open closeout',
      sourceCategory: 'closeout',
    };
  }

  // Overdue payment (pre-event)
  if (payDays !== null && payDays < 0 && !balancePaid) {
    return {
      title: `Send final payment to ${vname}.`,
      consequence: `Balance was due ${-payDays}d ago. Late payments can affect how the vendor prioritizes your event — better to settle now.`,
      ctaCopy: 'Record payment',
      sourceCategory: 'financial',
    };
  }

  // Confirmed but no contract
  if (isConfirmed && !contractSigned) {
    return {
      title: `Get the signed contract from ${vname}.`,
      consequence: 'Vendor is confirmed but no contract is on file — booking record is incomplete and protection is thin.',
      ctaCopy: 'Mark contract signed',
      sourceCategory: 'documents',
    };
  }

  // Committed but deposit not recorded
  if (isCommitted && !depositPaid && (vendor.cost || 0) > 0) {
    return {
      title: `Confirm deposit paid to ${vname}.`,
      consequence: 'Deposit not yet recorded. Booking is not fully secured until deposit lands.',
      ctaCopy: 'Mark deposit paid',
      sourceCategory: 'financial',
    };
  }

  // Final payment due soon
  if (isCommitted && depositPaid && !balancePaid && payDays !== null && payDays >= 0 && payDays <= 7) {
    return {
      title: `Final payment due in ${payDays}d to ${vname}.`,
      consequence: 'Final payment due before vendor is fully secured.',
      ctaCopy: 'Record payment',
      sourceCategory: 'financial',
    };
  }

  // Missing arrival/setup time near event
  if (isCommitted && !arrivalSet && eventVeryClose) {
    return {
      title: `Confirm arrival time for ${vname}.`,
      consequence: 'Arrival time missing — timeline readiness cannot be trusted in the last two weeks.',
      ctaCopy: 'Set arrival time',
      sourceCategory: 'logistics',
    };
  }

  // Vendor unconfirmed and event approaching
  if (!isConfirmed && (status === 'Quoted' || status === 'Considering') && eventClose) {
    return {
      title: `Decide on ${vname}.`,
      consequence: `Currently ${status.toLowerCase()}. The closer to the event, the harder it gets to find another option if this one falls through.`,
      ctaCopy: 'Open vendor',
      sourceCategory: 'booking',
    };
  }

  // No run-of-show coverage for committed vendor near event
  const rosMatches = (event && event.ros) ? event.ros.filter(r => r.vendorName && r.vendorName.toLowerCase().includes((vendor.name || '').toLowerCase())).length : 0;
  if (isCommitted && rosMatches === 0 && eventVeryClose) {
    return {
      title: `Add ${vname} to the run of show.`,
      consequence: `This vendor isn't on the run of show yet — adding them makes sure their setup is included in the day-of timeline.`,
      ctaCopy: 'Open timeline',
      sourceCategory: 'timeline',
      route: { tab: 'Timeline' },
    };
  }

  // Unanswered category questions near event
  if (isCommitted && eventClose) {
    const questions = getVendorRequiredQuestions(vendor, event);
    const unanswered = questions.find(q => q.status === 'unknown' || q.status === 'missing');
    if (unanswered) {
      return {
        title: unanswered.actionTitle || `Confirm: ${unanswered.question}`,
        consequence: unanswered.consequence || `${cat} prep is incomplete without this answer.`,
        ctaCopy: unanswered.ctaCopy || 'Open vendor',
        sourceCategory: 'scope',
      };
    }
  }

  // Communication stale near event
  if (isCommitted && eventClose) {
    const lastLog = (vendor.log || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const lastLogDays = lastLog && lastLog.date ? -daysFrom(lastLog.date) : null;
    if (lastLogDays !== null && lastLogDays > 21) {
      return {
        title: `Send a reconfirmation to ${vname}.`,
        consequence: `Last touch ${lastLogDays}d ago. Checking in 14–30 days out catches small changes before they become day-of surprises.`,
        ctaCopy: 'Log reconfirmation',
        sourceCategory: 'communication',
      };
    }
  }

  // Neutral fallback
  return {
    title: `Review readiness for ${vname}.`,
    consequence: 'No blockers detected. Spot-check the planning, day-of, and closeout sections.',
    ctaCopy: 'Open vendor',
    sourceCategory: 'review',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4b. Actionable next step — what the CTA actually DOES when clicked
// ─────────────────────────────────────────────────────────────────────────────
// Sprint 56d — pushed deeper. The CTAs now do the actual thing, not just
// record that the planner did it manually.
//
// Action kinds:
//   'payment'  — open a payment-method picker; each method either deep-links
//                to the payment rail (Venmo/PayPal/Cash App) or shows
//                copy-paste instructions (Zelle/Check/Wire). After the
//                planner sends payment externally, they confirm "I sent it"
//                which flips balancePaid + logs the method used.
//   'contract' — expand to 3 options: paste contract link (saves to
//                vendor.contractUrl + marks signed), mark received offline,
//                or email the vendor for signature (mailto: with template).
//   'arrival'  — expand to an inline time picker. Save updates
//                vendor.arrivalTime + logs.
//   'patch'    — one-click vendor mutation (mark deposit paid, mark confirmed).
//                Kept for cases where there's nothing more to do.
//   'log'      — one-click log entry (reconfirmation sent, deliverables
//                requested). No vendor field changes.
//   'edit'     — open the full Vendor editor for category-specific work
//                that doesn't fit inline (timeline, scope questions).
//
// Step shape:
//   {
//     kind, ctaLabel,
//     patch?,          // for 'patch'
//     logText?,        // for 'patch'+'log'+'arrival'+'payment'
//     editHint?,       // for 'edit'
//     amount?,         // for 'payment' — pre-filled amount
//     amountLabel?,    // for 'payment' — "Balance due" or "Deposit"
//     contractContext? // for 'contract' — vendor name, email, etc.
//   }
export function getActionableNextStep(nextAction, vendor) {
  if (!nextAction || !vendor) return null;
  const cat = nextAction.sourceCategory;
  const vname = vendor.name || 'vendor';

  // ── Closeout (post-event paid) — deliverables follow-up log only ──
  if (cat === 'closeout' && vendor.balancePaid === true) {
    return {
      kind: 'log',
      ctaLabel: 'Log follow-up sent',
      logText: `Post-event follow-up sent to ${vname}: requested deliverables and shared thank-you.`,
    };
  }

  // ── Closeout / financial — actually pay the balance ──
  if ((cat === 'closeout' || cat === 'financial') && !vendor.balancePaid && vendor.depositPaid) {
    const balanceAmt = vendor.cost && vendor.depositAmt ? vendor.cost - vendor.depositAmt
                     : vendor.cost ? vendor.cost
                     : 0;
    return {
      kind: 'payment',
      ctaLabel: 'Send payment',
      amount: balanceAmt,
      amountLabel: 'Balance due',
      target: 'balance',
    };
  }

  // ── Financial: deposit not yet recorded — actually pay the deposit ──
  if (cat === 'financial' && !vendor.depositPaid) {
    const depositAmt = vendor.depositAmt
      || (vendor.cost ? Math.round(vendor.cost * 0.3) : 0); // default 30%
    return {
      kind: 'payment',
      ctaLabel: 'Send deposit',
      amount: depositAmt,
      amountLabel: 'Deposit',
      target: 'deposit',
    };
  }

  // ── Documents: contract not on file — paste URL or email for signature ──
  if (cat === 'documents') {
    const contractSigned = vendor.contractSigned === true || vendor.contract_signed === true;
    if (!contractSigned) {
      return {
        kind: 'contract',
        ctaLabel: 'Handle contract',
      };
    }
  }

  // ── Booking: vendor unconfirmed and event close — one-click confirm ──
  if (cat === 'booking' && vendor.status !== 'Confirmed' && vendor.status !== 'Booked') {
    return {
      kind: 'patch',
      ctaLabel: 'Mark confirmed',
      patch: { status: 'Confirmed' },
      logText: `Marked Confirmed via vendor cockpit (was ${vendor.status || 'unset'}).`,
    };
  }

  // ── Communication: stale — log a reconfirmation send ──
  if (cat === 'communication') {
    return {
      kind: 'log',
      ctaLabel: 'Log reconfirmation sent',
      logText: `Reconfirmation message sent to ${vname}.`,
    };
  }

  // ── Logistics: missing arrival time — inline time picker ──
  if (cat === 'logistics') {
    return {
      kind: 'arrival',
      ctaLabel: 'Set arrival time',
    };
  }

  // ── Scope: unanswered category question — open editor ──
  if (cat === 'scope') {
    return {
      kind: 'edit',
      ctaLabel: 'Open vendor details',
      editHint: 'Answer the category-specific questions in the vendor editor.',
    };
  }

  // ── Timeline: not on RoS — for now, open editor; future: cross-tab nav ──
  if (cat === 'timeline') {
    return {
      kind: 'edit',
      ctaLabel: 'Open vendor details',
      editHint: 'Add this vendor to the Run of Show tab manually for now.',
    };
  }

  // ── Review fallback: no specific actionable move ──
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Planning state — what must be true before event day
// ─────────────────────────────────────────────────────────────────────────────
// Returns array of { key, label, status, value, consequence? }
//   status: 'done' | 'pending' | 'missing' | 'not_tracked'
export function getVendorPlanningState(vendor, event) {
  if (!vendor) return [];
  const status = vendor.status || '';
  const isConfirmed = status === 'Confirmed' || status === 'Booked';
  const isCommitted = isConfirmed || status === 'Deposit Paid' || status === 'Contracted';
  const contractSigned = vendor.contractSigned === true || vendor.contract_signed === true;
  const depositPaid = vendor.depositPaid === true;
  const balancePaid = vendor.balancePaid === true;
  const arrivalTime = fieldEither(vendor, 'arrivalTime', 'arrival_time');

  return [
    {
      key: 'selected',
      label: 'Vendor selected',
      status: isCommitted ? 'done' : (status === 'Quoted' ? 'pending' : 'missing'),
      value: status || '—',
    },
    {
      key: 'scope',
      label: 'Scope confirmed',
      status: isCommitted ? 'done' : 'pending',
      value: vendor.category ? `${vendor.category} scope` : 'Category not set',
      consequence: isCommitted ? undefined : 'Scope locks at booking.',
    },
    {
      key: 'contract',
      label: 'Contract signed',
      status: contractSigned ? 'done' : (isConfirmed ? 'missing' : 'pending'),
      value: contractSigned ? 'Signed' : (isConfirmed ? 'Not attached' : 'Awaiting booking'),
      consequence: !contractSigned && isConfirmed ? 'Booking record is incomplete without a signed contract.' : undefined,
    },
    {
      key: 'deposit',
      label: 'Deposit paid',
      status: depositPaid ? 'done' : (isCommitted ? 'missing' : 'pending'),
      value: depositPaid ? 'Paid' : (vendor.depositAmt ? `$${vendor.depositAmt.toLocaleString()} due` : 'Not recorded'),
      consequence: !depositPaid && isCommitted ? 'Booking is not fully secured until deposit lands.' : undefined,
    },
    {
      key: 'balance',
      label: 'Final payment',
      status: balancePaid ? 'done' : (vendor.payDueDate ? 'pending' : 'not_tracked'),
      value: balancePaid ? 'Paid' : (vendor.payDueDate ? `Due ${vendor.payDueDate}` : 'No due date set'),
    },
    {
      key: 'primaryContact',
      label: 'Primary contact',
      status: (vendor.contactName || vendor.contact) ? 'done' : 'missing',
      value: vendor.contactName || vendor.contact || 'Not set',
      consequence: !vendor.contactName && !vendor.contact ? 'No one to reach if anything changes.' : undefined,
    },
    {
      key: 'dayOfContact',
      label: 'Day-of contact',
      // Model has no separate day-of contact. Use phone presence as proxy, but
      // flag it as 'not_tracked' so the user knows we don't have a dedicated field.
      status: 'not_tracked',
      value: vendor.phone ? `Likely: ${vendor.phone}` : 'Not tracked yet',
      consequence: 'No one to call if setup is delayed (dedicated day-of contact field coming).',
    },
    {
      key: 'arrival',
      label: 'Arrival / setup time',
      status: arrivalTime ? 'done' : (isCommitted ? 'missing' : 'pending'),
      value: arrivalTime || 'Not tracked yet',
      consequence: !arrivalTime && isCommitted ? 'Timeline readiness cannot be trusted without arrival times.' : undefined,
    },
    {
      key: 'logistics',
      label: 'Venue / logistics needs',
      status: 'not_tracked',
      value: 'Not tracked yet',
      consequence: 'Load-in route, power, parking, kitchen access — to be added.',
    },
    {
      key: 'documents',
      label: 'Required documents',
      status: 'not_tracked',
      value: 'File uploads coming next',
      consequence: 'Contract PDF, COI, invoices cannot be attached yet.',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Day-of state — what we need when the event is live
// ─────────────────────────────────────────────────────────────────────────────
// Model has almost no day-of fields. Be honest: most items return 'not_tracked'
// with a label explaining what they'd be when the model supports them.
export function getVendorDayOfState(vendor, event) {
  if (!vendor) return [];
  const arrivalTime = fieldEither(vendor, 'arrivalTime', 'arrival_time');
  const eventDays = event && event.date ? daysFrom(event.date) : null;
  const eventToday = eventDays === 0;
  const eventPast = eventDays !== null && eventDays < 0;

  return [
    {
      key: 'expectedArrival',
      label: 'Expected arrival',
      status: arrivalTime ? 'done' : 'missing',
      value: arrivalTime || (eventToday ? 'Not set — needed today' : 'Not set'),
    },
    {
      key: 'actualArrival',
      label: 'Actual arrival / check-in',
      status: 'not_tracked',
      value: eventPast ? 'Not retained' : 'Not tracked yet',
    },
    {
      key: 'setup',
      label: 'Setup status',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'ready',
      label: 'Ready status',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'active',
      label: 'Active / complete',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'strike',
      label: 'Strike / load-out',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'dayOfContact',
      label: 'Day-of contact',
      status: vendor.phone ? 'done' : 'missing',
      value: vendor.phone ? `${vendor.contactName || vendor.name} · ${vendor.phone}` : 'No phone on file',
    },
    {
      key: 'logistics',
      label: 'Logistics needs',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'incidents',
      label: 'Incident notes',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Closeout state — what must happen after the event
// ─────────────────────────────────────────────────────────────────────────────
export function getVendorCloseoutState(vendor, event) {
  if (!vendor) return [];
  const balancePaid = vendor.balancePaid === true;
  const eventDays = event && event.date ? daysFrom(event.date) : null;
  const eventPast = eventDays !== null && eventDays < 0;

  return [
    {
      key: 'finalInvoice',
      label: 'Final invoice received',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'finalPayment',
      label: 'Final payment',
      status: balancePaid ? 'done' : (eventPast ? 'missing' : 'pending'),
      value: balancePaid ? 'Paid' : (eventPast ? 'Overdue' : 'Pending event close'),
    },
    {
      key: 'gratuity',
      label: 'Gratuity / tip',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'deliverables',
      label: 'Deliverables received',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'issues',
      label: 'Issues / disputes',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'thankYou',
      label: 'Thank-you / follow-up',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'rating',
      label: 'Vendor rating',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'preferredFlag',
      label: 'Preferred vendor flag',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
    {
      key: 'closeoutNotes',
      label: 'Closeout notes',
      status: 'not_tracked',
      value: 'Not tracked yet',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Linked event work
// ─────────────────────────────────────────────────────────────────────────────
// Returns { timeline, decisions, tasks, communication, budget, documents }
// Each is array of { id?, label, note? } or 'not_tracked' marker.
export function getVendorLinkedWork(vendor, event) {
  if (!vendor || !event) return { timeline: [], decisions: [], tasks: [], communication: [], budget: [], documents: [] };
  const vname = (vendor.name || '').toLowerCase();
  const vcat = (vendor.category || '').toLowerCase();
  const vbcat = (vendor.budgetCategory || '').toLowerCase();

  // Timeline / RoS entries matching this vendor by name
  const timeline = (event.ros || [])
    .filter(r => r.vendorName && vname && r.vendorName.toLowerCase().includes(vname))
    .map(r => ({ id: r.id, label: r.title || r.activity || 'Run-of-show entry', note: r.time ? `${r.time}` : undefined }));

  // Decisions linked by vendor name or category mention in title
  const decisions = (event.decisions || event.approvals || [])
    .filter(d => {
      const t = (d.title || '').toLowerCase();
      return (vname && t.includes(vname)) || (vcat && t.includes(vcat));
    })
    .map(d => ({ id: d.id, label: d.title || 'Decision', note: d.status || d.urgency }));

  // Tasks / checklist
  const tasks = (event.checklist || event.tasks || [])
    .filter(t => {
      const txt = (t.text || t.title || '').toLowerCase();
      return (vname && txt.includes(vname)) || (vcat && txt.includes(vcat));
    })
    .map(t => ({ id: t.id, label: t.text || t.title, note: t.done ? 'Done' : (t.due ? `Due ${t.due}` : undefined) }));

  // Communication threads (commVendor + commClient with vendor channel)
  const communication = [
    ...(event.commVendor || []),
    ...(event.commClient || []).filter(m => m.channel === 'vendor'),
  ]
    .filter(m => {
      const txt = ((m.subject || '') + ' ' + (m.body || '') + ' ' + (m.to || '') + ' ' + (m.from || '')).toLowerCase();
      return vname && txt.includes(vname);
    })
    .slice(0, 5)
    .map(m => ({ id: m.id, label: m.subject || m.body?.slice(0, 60) || 'Message', note: m.date || undefined }));

  // Budget items by budgetCategory
  const budget = (event.budget || [])
    .filter(b => {
      const cat = (b.category || b.name || '').toLowerCase();
      return vbcat && cat.includes(vbcat);
    })
    .slice(0, 5)
    .map(b => ({ id: b.id, label: b.name || b.category || 'Budget item', note: b.amount ? `$${b.amount.toLocaleString()}` : undefined }));

  // Documents — no FK exists. Try kind/title heuristics.
  const documents = (event.documents || [])
    .filter(d => {
      const t = ((d.title || '') + ' ' + (d.notes || '')).toLowerCase();
      return (vname && t.includes(vname)) || (vcat && t.includes(vcat));
    })
    .map(d => ({ id: d.id, label: d.title || d.kind, note: d.status }));

  return { timeline, decisions, tasks, communication, budget, documents };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Highest-risk vendor
// ─────────────────────────────────────────────────────────────────────────────
// Used by the command strip CTA: "Start with highest-risk vendor".
// Rank by readiness severity, then by event proximity.
export function getHighestRiskVendor(vendors = [], event) {
  if (!vendors || vendors.length === 0) return null;
  const scored = vendors.map(v => {
    const r = getVendorReadiness(v, event);
    const levelRank = { critical: 1000, attention: 500, not_started: 100, safe: 0, closed: -100 }[r.level] || 0;
    // Higher rank = more urgent. Tiebreak by criticals count.
    const score = levelRank + (r.counts.critical || 0) * 50 + (r.counts.attention || 0) * 5;
    return { v, score, readiness: r };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score <= 0) return null;
  return { vendor: top.v, readiness: top.readiness };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Vendor portfolio summary — counts for the command strip
// ─────────────────────────────────────────────────────────────────────────────
export function getVendorPortfolioSummary(vendors = [], event) {
  const summary = { total: vendors.length, safe: 0, attention: 0, critical: 0, notStarted: 0, closed: 0 };
  for (const v of vendors) {
    const r = getVendorReadiness(v, event);
    if (r.level === 'critical') summary.critical++;
    else if (r.level === 'attention') summary.attention++;
    else if (r.level === 'safe') summary.safe++;
    else if (r.level === 'not_started') summary.notStarted++;
    else if (r.level === 'closed') summary.closed++;
  }
  return summary;
}
