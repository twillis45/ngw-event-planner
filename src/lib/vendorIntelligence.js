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
// COI / insurance certificate gate (operational reality — board 2026-06-10 #4)
// ─────────────────────────────────────────────────────────────────────────────
// Most venues legally require a Certificate of Insurance from liability-bearing
// vendors, naming the venue as additional insured, ON FILE ~30 days before the
// event. No COI = no load-in — a hard, real-world gate the screen never modeled.
// This tracks the EVENT-SPECIFIC COI as a real GATE (distinct from the vendor's
// general `insuranceStatus` reputation string). Board 2026-06-10: "received" (a
// PDF arrived) is NOT "valid" — the venue gate is that the certificate names the
// venue as additional insured AND covers the event date. So a received-but-
// unverified COI stays AMBER, not green; only a verified cert with coverage
// through the event reads safe. Fields:
//   vendor.coiStatus     = 'received' | 'requested' | 'not_required' (else inferred)
//   vendor.coiVerified   = bool  — a human confirmed venue-as-additional-insured + window
//   vendor.coiExpiryDate = ISO   — coverage valid through
const COI_REQUIRED_CATEGORIES = [
  'venue', 'catering', 'bar', 'beverage', 'rental', 'furniture', 'staffing',
  'transport', 'shuttle', 'pyro', 'firework', 'tent', 'lighting', 'av',
  'production', 'stage', 'security', 'valet', 'generator',
];
export function getVendorCOIState(vendor, event) {
  if (!vendor) return null;
  const cat = (vendor.category || '').toLowerCase();
  const explicit = vendor.coiStatus;
  const requiredByCat = COI_REQUIRED_CATEGORIES.some(c => cat.includes(c));
  if (explicit === 'not_required' || (!explicit && !requiredByCat)) {
    return { required: false, status: 'not_required', label: 'Not required', level: 'safe', dueInDays: null, verified: false, expiry: null };
  }
  const status = explicit === 'received' ? 'received' : explicit === 'requested' ? 'requested' : 'required';
  const eventDays = event && event.date ? daysFrom(event.date) : null;
  const dueInDays = eventDays === null ? null : eventDays - 30; // COI due 30 days out
  const verified = vendor.coiVerified === true;
  const expiry = vendor.coiExpiryDate || null;
  const expiresBeforeEvent = !!(expiry && event && event.date
    && new Date(expiry + 'T00:00:00').getTime() < new Date(event.date + 'T00:00:00').getTime());

  if (status === 'received') {
    if (expiresBeforeEvent) {
      // Coverage lapses before the event — worse than not having one.
      return { required: true, status: 'expired', label: `Lapses ${expiry} — before the event`, level: 'critical', dueInDays, verified, expiry };
    }
    if (!verified) {
      // The gap Venue Ops flagged: a PDF arrived but no one confirmed it's VALID.
      return { required: true, status: 'received', label: 'Received — not verified valid', level: 'attention', dueInDays, verified: false, expiry };
    }
    return { required: true, status: 'verified', label: expiry ? `Verified · valid through ${expiry}` : 'Verified valid', level: 'safe', dueInDays, verified: true, expiry };
  }
  const overdue = dueInDays !== null && dueInDays <= 0;
  const soon = dueInDays !== null && dueInDays <= 14;
  let level, label;
  if (status === 'requested') {
    level = overdue ? 'critical' : 'attention';
    label = overdue ? 'Overdue — chase it' : 'Requested — awaiting';
  } else {
    level = (overdue || soon) ? 'critical' : 'attention';
    label = overdue ? 'Required — not requested' : 'Request it';
  }
  return { required: true, status, label, level, dueInDays, verified: false, expiry };
}

// Centralized COI next-action so the priority ladder and the false-done guard
// agree. Returns {title, consequence, ctaCopy, sourceCategory:'coi'} or null.
export function coiNextAction(vendor, event, vname) {
  const coi = getVendorCOIState(vendor, event);
  if (!coi || !coi.required || coi.level === 'safe') return null;
  if (coi.status === 'requested') {
    return { title: `Get the insurance certificate on file for ${vname}.`, consequence: 'A current COI naming the venue is the most common reason a vendor is turned away at load-in — it is not on file yet.', ctaCopy: 'Mark COI received', sourceCategory: 'coi' };
  }
  if (coi.status === 'received') { // received but not verified valid
    return { title: `Verify ${vname}'s insurance certificate.`, consequence: 'A PDF arrived, but no one has confirmed it names the venue as additional insured and covers the event date. "Received" is not "valid".', ctaCopy: 'Verify COI', sourceCategory: 'coi' };
  }
  if (coi.status === 'expired') {
    return { title: `Get an updated COI from ${vname}.`, consequence: `The certificate ${coi.label.toLowerCase()} — coverage must extend through the event date or the venue will turn them away.`, ctaCopy: 'Request current COI', sourceCategory: 'coi' };
  }
  // required, not yet requested
  return { title: `Request a certificate of insurance from ${vname}.`, consequence: 'Most venues require a COI naming them as additional insured, due ~30 days out.', ctaCopy: 'Mark COI requested', sourceCategory: 'coi' };
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
  // Lifecycle vocab (2026-06): Lead → Booking → Booked → Locked in. The pros
  // wanted the "missing middle" made obvious — a brand-new vendor is a LEAD (not
  // delinquent "Planning"), and a fully-confirmed one is LOCKED IN. Display-only.
  switch (status) {
    case 'Considering': return 'Lead';
    case 'Quoted':      return 'Lead · quoted';
    case 'Contracted':  return 'Booking';
    case 'Deposit Paid': return 'Booked';
    case 'Booked':       return 'Booked';
    case 'Confirmed': {
      if (eventSoon) return 'Locked in · final check';
      return 'Locked in';
    }
    case 'Not Started':
    case '':
    case undefined:
      return 'Lead';
    default:
      return 'Booked';
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
    // A vendor you haven't sourced yet (still 'Considering' / a seeded category
    // placeholder) has no one to reach — missing contact is NOT a crisis until
    // you're actually pursuing them. Otherwise a fresh event seeded with N
    // suggested categories would read as "N critical vendors." Only escalate to
    // critical once the vendor is past the considering stage.
    communication = booking.level === 'not_started'
      ? { level: 'not_started', note: 'Not sourced yet — add a contact when you reach out.' }
      : { level: 'critical', note: 'No contact details on file — cannot reach vendor.' };
  } else if (checklistRatio !== null && checklistRatio < 0.5 && eventClose) {
    communication = { level: 'attention', note: `Less than half of vendor comms checklist complete with ${eventDays}d left.` };
  } else if (lastLogDays !== null && lastLogDays > 21 && isCommitted && !eventPast && eventClose) {
    // Radio silence only counts as "needs follow-up" when a reconfirm is actually
    // DUE — inside the 30-day window, matching the reconfirm rung in the next-
    // action ladder (getVendorNextAction). Far from the event a confirmed vendor
    // with open channels is SAFE, not amber. Flagging a vendor that hadn't been
    // logged in weeks 3 months out made the readiness count read "needs follow-up"
    // with NO live action behind it (board 2026-06-12: "the count is lying" —
    // Bluebell, fully locked in, was counted as follow-up for a 58-day-old note).
    // Now readiness and the action ladder agree on when staleness matters.
    communication = { level: 'attention', note: `Last touch ${lastLogDays}d ago — reconfirm before the event.` };
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

  // ── Documents ── (contract + COI compliance gate)
  let documents;
  const coi = getVendorCOIState(vendor, event);
  if (coi && coi.required && coi.level === 'critical') {
    documents = { level: 'critical', note: coi.status === 'expired'
      ? `Insurance ${coi.label.toLowerCase()} — venue will turn them away.`
      : coi.dueInDays !== null && coi.dueInDays <= 0
        ? 'Certificate of insurance overdue — venue may hold them at the door.'
        : 'Insurance certificate not on file before the 30-day venue deadline.' };
  } else if (isConfirmed && !contractSigned) {
    documents = { level: 'attention', note: 'Contract not on file.' };
  } else if (coi && coi.required && coi.level === 'attention') {
    documents = { level: 'attention', note: coi.status === 'received'
      ? 'Insurance certificate received but NOT yet verified valid (venue named + covers the event date).'
      : coi.status === 'requested'
        ? 'Insurance certificate requested — awaiting the document.'
        : 'Insurance certificate still needs to be requested.' };
  } else if (contractSigned) {
    documents = { level: 'safe', note: coi && coi.required ? 'Contract signed; COI verified valid.' : 'Contract signed (file storage coming).' };
  } else {
    documents = { level: 'not_tracked', note: 'Contract not yet expected.' };
  }

  // ── Day-of ── (model doesn't support check-in / setup / arrival actuals)
  let dayOf;
  if (eventPast) dayOf = { level: 'not_tracked', note: 'Day-of details not retained after the event.' };
  else if (eventClose) {
    if (arrivalSet) dayOf = { level: 'safe', note: 'Arrival time set — day-of ready.' }; // Readiness reflectivity (2026-06-10): condition (arrival) satisfied → green, not stuck amber. Live check-in is not_tracked, not an open issue.
    else dayOf = { level: 'attention', note: 'Day-of plan not confirmed.' };
  } else dayOf = { level: 'not_tracked', note: 'Day-of activates closer to the event.' };

  // ── Closeout ── (no closeout fields exist)
  let closeout;
  if (eventPast) {
    if (balancePaid) closeout = { level: 'safe', note: 'Paid in full.' }; // Readiness reflectivity: condition (paid in full) satisfied → green, not stuck amber.
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

  // Certificate of insurance — a hard venue gate. Surface it HIGH in the ladder
  // when critical (overdue request, or coverage that lapses before the event).
  // Lower-severity COI states (requested-awaiting, received-but-unverified) are
  // surfaced by the false-done guard near the end.
  const coiCrit = getVendorCOIState(vendor, event);
  if (isCommitted && coiCrit && coiCrit.required && coiCrit.level === 'critical') {
    const a = coiNextAction(vendor, event, vname);
    if (a) return a;
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

  // ── "FALSE DONE" GUARD (board 2026-06-10, pros' #1 safety bug) ──────────────
  // Before declaring "no blockers", honestly check whether anything is still
  // amber. The old fallback said "No blockers detected" while the vendor chip
  // was still amber (booking unconfirmed, COI requested-not-received) — telling
  // the planner they were DONE when they weren't. Absence of a *critical* item
  // is NOT readiness. Surface the most important remaining attention item — COI
  // first (the #1 reason a vendor is turned away at load-in).
  const ch = getVendorChallengeSummary(vendor, event);
  // COI first (the #1 reason a vendor is turned away). Covers requested-awaiting,
  // received-but-unverified ("verify it's valid"), and expired states.
  if (isCommitted) {
    const coiA = coiNextAction(vendor, event, vname);
    if (coiA) return coiA;
  }
  if (isCommitted && ch.booking && ch.booking.level === 'attention') {
    return {
      title: `Confirm ${vname} is fully booked.`,
      consequence: ch.booking.note || 'Booking is recorded but not yet confirmed.',
      ctaCopy: 'Mark confirmed',
      sourceCategory: 'booking',
    };
  }
  const stillOpen = Object.values(ch).filter(v => v && (v.level === 'attention' || v.level === 'critical'));
  if (stillOpen.length > 0) {
    return {
      title: `Follow up with ${vname}.`,
      consequence: `${stillOpen[0].note} Not fully clear yet.`,
      ctaCopy: 'Open vendor',
      sourceCategory: 'review',
    };
  }

  // Truly clear — every category is safe/not-applicable. Only NOW is it "done".
  return {
    title: `${vname} is on track.`,
    consequence: 'No open items. Spot-check before event day.',
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

  // ── COI: certificate of insurance gate — one-click request/receive ──
  if (cat === 'coi') {
    // No event in scope here; derive status from vendor fields (expiry-vs-event
    // is handled where the action TITLE is built, in coiNextAction).
    const coi = getVendorCOIState(vendor, null);
    const st = coi ? coi.status : (vendor.coiStatus || 'required');
    if (st === 'requested') {
      // PDF arrives → mark received (still NOT verified valid).
      return { kind: 'patch', ctaLabel: 'Mark COI received', patch: { coiStatus: 'received' }, logText: `Certificate of insurance received from ${vname} — needs verifying (venue named + covers the event date).` };
    }
    if (st === 'received' || st === 'expired') {
      // Verify validity — requires the expiry date + a human check, so open the
      // editor (you can't one-click "valid"). This is the real gate.
      return { kind: 'edit', ctaLabel: st === 'expired' ? 'Request current COI' : 'Verify COI', editHint: 'Confirm it names the venue as additional insured and covers the event date, then set "verified" + the expiry.' };
    }
    return { kind: 'patch', ctaLabel: 'Mark COI requested', patch: { coiStatus: 'requested' }, logText: `Requested a certificate of insurance from ${vname} (naming the venue as additional insured).` };
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

  // ── Universal fallback — the app must ALWAYS offer a next step ──────────────
  // Board 2026-06-12 ("the first CTA isn't actionable" / "the app should always
  // tell you the next step"): a Next-action card must NEVER render without a
  // working CTA. Whatever the category — including the 'review' / spot-check
  // fallback from getVendorNextAction — opening the vendor editor lets the
  // planner resolve the open item and clear "needs follow-up". No dead cards.
  return {
    kind: 'edit',
    ctaLabel: 'Review & update',
    editHint: 'Update the open item to clear follow-up.',
  };
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
  const coi = getVendorCOIState(vendor, event);

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
      // Payment stage 1 — deposit (books the date). Board #5: carry a real due
      // date so it's a scheduled stage, not a guess.
      key: 'deposit',
      label: 'Deposit (books the date)',
      status: depositPaid ? 'done' : (isCommitted ? 'missing' : 'pending'),
      value: depositPaid ? 'Paid'
        : vendor.depositAmt
          ? `$${vendor.depositAmt.toLocaleString()} due${vendor.depositDueDate ? ` ${vendor.depositDueDate}` : ''}`
          : 'Not recorded',
      consequence: !depositPaid && isCommitted ? 'Booking is not fully secured until deposit lands.' : undefined,
    },
    {
      // Payment stage 2 — final balance (typically due 2–4 weeks out).
      key: 'balance',
      label: 'Final payment',
      status: balancePaid ? 'done' : (vendor.payDueDate ? 'pending' : 'not_tracked'),
      value: balancePaid ? 'Paid'
        : vendor.payDueDate
          ? (() => { const d = daysFrom(vendor.payDueDate); return d !== null && d >= 0 ? `Due ${vendor.payDueDate} · in ${d}d` : `Due ${vendor.payDueDate}`; })()
          : 'No due date set',
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
      key: 'coi',
      label: 'Insurance certificate (COI)',
      // 'done' ONLY when verified valid (level safe). Received-but-unverified is
      // pending; overdue/expired is missing.
      status: !coi || !coi.required ? 'done'
        : coi.level === 'safe' ? 'done'
        : coi.level === 'critical' ? 'missing' : 'pending',
      value: !coi || !coi.required ? 'Not required for this vendor'
        : coi.label + (coi.status !== 'verified' && coi.dueInDays !== null && coi.dueInDays > 0 && coi.status !== 'received' ? ` · due in ${coi.dueInDays}d` : ''),
      consequence: coi && coi.required && coi.level !== 'safe'
        ? (coi.status === 'received'
            ? 'A PDF arrived but no one confirmed it names the venue and covers the event date — "received" is not "valid".'
            : 'Most venues hold vendors at the door without a current COI naming the venue.')
        : undefined,
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
  const eventClose = eventDays !== null && eventDays >= 0 && eventDays <= 30;
  // Operational reality (board 2026-06-10 #6): real day-of planning fields.
  const onSiteName  = fieldEither(vendor, 'onSiteContactName', 'onsiteContactName');
  const onSitePhone = fieldEither(vendor, 'onSitePhone', 'onsitePhone');
  const loadInOrder = fieldEither(vendor, 'loadInOrder', 'load_in_order');
  const reportsTo   = fieldEither(vendor, 'reportsTo', 'reports_to');
  // "Plan now" items are missing (not just untracked) once the event is close.
  const planStatus = (val) => val ? 'done' : (eventClose ? 'missing' : 'pending');

  return [
    {
      key: 'expectedArrival',
      label: 'Arrival / setup time',
      status: arrivalTime ? 'done' : (eventClose ? 'missing' : 'pending'),
      value: arrivalTime || (eventToday ? 'Not set — needed today' : 'Not set'),
      consequence: !arrivalTime && eventClose ? 'Run-of-show timing cannot be trusted without an arrival time.' : undefined,
    },
    {
      key: 'loadInOrder',
      label: 'Load-in order',
      status: planStatus(loadInOrder),
      value: loadInOrder || (eventClose ? 'Not set — sequence load-in' : 'Not set yet'),
      consequence: !loadInOrder && eventClose ? 'Vendors arriving out of order block the dock and each other.' : undefined,
    },
    {
      key: 'onSiteContact',
      label: 'On-site contact',
      status: (onSiteName || onSitePhone) ? 'done' : (vendor.phone ? 'pending' : (eventClose ? 'missing' : 'pending')),
      value: (onSiteName || onSitePhone)
        ? `${onSiteName || vendor.name}${onSitePhone ? ` · ${onSitePhone}` : ''}`
        : (vendor.phone ? `Default: ${vendor.contactName || vendor.name} · ${vendor.phone}` : 'No on-site contact set'),
      consequence: !onSiteName && !onSitePhone && !vendor.phone && eventClose ? 'No one to call if setup is delayed on the day.' : undefined,
    },
    {
      key: 'reportsTo',
      label: 'Reports to',
      status: planStatus(reportsTo),
      value: reportsTo || (eventClose ? 'Not set — assign a point person' : 'Not set yet'),
    },
    {
      key: 'actualArrival',
      label: 'Checked in on the day',
      status: 'not_tracked',
      value: eventPast ? 'Not retained' : 'Tracked live on event day',
    },
    {
      key: 'strike',
      label: 'Strike / load-out',
      status: 'not_tracked',
      value: 'Tracked live on event day',
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
