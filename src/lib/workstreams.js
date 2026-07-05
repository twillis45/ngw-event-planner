// workstreamsFor(event, ctx, vendors, playbook) — POP-1/WOW-1 read-only composition layer.
//
// Groups EXISTING vendor records into Workstreams (Venue, Photography, Food, Bar,
// Entertainment, Decor, Guest Experience) — a pure, derive-don't-store function,
// same pattern as taskEngine.js's taskSatisfied/effectiveDone and
// experienceContext.js's buildExperienceContext. Does NOT replace ExperienceContext,
// Human Intelligence, Event Identity, or eventPlan()'s reactive tier ladder — it
// composes their existing outputs (ctx.decisionBlockers) plus event.vendors into one
// per-workstream readiness rollup.
//
// Explicitly out of scope for this pass (docs/POP1_PHASE1_FOUNDATION_AUDIT.md,
// docs/POP1_PHASE1_DELTA_AND_WORKSTREAM_DESIGN.md): the cross-workstream dependency
// graph (Venue -> Decor -> Photography, etc.) is authored knowledge, not derivable
// from event data — `dependencies` below is populated ONLY when already known
// (currently: never, until that graph is authored), never invented here.

import { getVendorCOIState } from './vendorIntelligence';

// Category (from vendorCategoriesByType.js / the add-vendor picker) -> workstream.
// Deliberately conservative: categories not listed fall into 'other' rather than
// guessing a workstream that might be wrong.
const CATEGORY_TO_WORKSTREAM = {
  'Venue': 'venue',
  'Catering': 'food', 'Cake': 'food', 'Grazing Table': 'food', 'Dessert Caterer': 'food',
  'Photography': 'photography', 'Videography': 'photography', 'Content Creator': 'photography',
  '360 Booth': 'photography', 'Photo Booth': 'photography',
  'DJ': 'entertainment', 'MC / Host': 'entertainment', 'Entertainment': 'entertainment',
  'Live Streaming / Hybrid': 'entertainment', 'Choreographer': 'entertainment',
  'Speakers / Talent': 'entertainment', 'Facilitator / Trainer': 'entertainment',
  'Florals': 'decor', 'Balloon Décor': 'decor', 'Decor': 'decor', 'Lighting': 'decor',
  'Mobile Bar': 'bar', 'Full Bar': 'bar',
  'Rentals': 'guest_experience', 'AV / Tech': 'guest_experience', 'Transport': 'guest_experience',
  'Transportation': 'guest_experience', 'Printing / Signage': 'guest_experience',
  'Registration / Badging': 'guest_experience', 'Staffing': 'guest_experience',
  'Hair & Makeup': 'guest_experience', 'Officiant': 'guest_experience', 'Favors': 'guest_experience',
  'Activities': 'guest_experience', 'Awards / Engraving': 'guest_experience',
  'Lodging / Concierge': 'guest_experience', 'Brand Activation': 'guest_experience',
  'Sponsor / Exhibitor': 'guest_experience', 'Event App': 'guest_experience',
  // POP-1/WOW-1 data addition: generic categories (any Retirement Party, not
  // Army-only) confirmed missing against the flagship validation event — each
  // gets its own workstream, matching the doctrine's flagship workstream list
  // (Recognition Ceremony / Recognition Slideshow named as distinct from
  // Photography and Guest Experience, not folded into either).
  'Recognition Ceremony': 'recognition_ceremony',
  'Recognition Slideshow': 'recognition_slideshow',
  'Military Display': 'military_display',
};

const WORKSTREAM_LABELS = {
  venue: 'Venue',
  food: 'Food',
  photography: 'Photography',
  entertainment: 'Entertainment',
  decor: 'Decor',
  bar: 'Bar',
  guest_experience: 'Guest Experience',
  recognition_ceremony: 'Recognition Ceremony',
  recognition_slideshow: 'Recognition Slideshow',
  military_display: 'Military Display',
  other: 'Other',
};

// Same "Booked" vocabulary as CommandCenter.jsx's vendorReadinessRollup /
// VendorPlanningWorkspace.jsx's hostStatusWord — kept in sync deliberately;
// see docs/POP1_PHASE1_FOUNDATION_AUDIT.md §6 for the contradiction this
// vocabulary mismatch caused before it was unified.
const BOOKED_STATUSES = new Set(['Confirmed', 'Booked', 'Deposit Paid', 'Contracted']);

function workstreamKeyForVendor(vendor) {
  return CATEGORY_TO_WORKSTREAM[vendor && vendor.category] || 'other';
}

function statusFor(booked, total) {
  if (total === 0) return 'empty';
  if (booked === total) return 'ready';
  if (booked === 0) return 'not_started';
  return 'in_progress';
}

// Decision blockers (from ExperienceContext / deriveDecisionBlockers, already
// composed elsewhere) matched to a workstream by a simple type-prefix match —
// e.g. a 'venue-selection' blocker's next decision surfaces on the 'venue'
// workstream. No new blocker logic is introduced here.
function nextDecisionFor(workstreamKey, ctx) {
  const blockers = (ctx && Array.isArray(ctx.decisionBlockers)) ? ctx.decisionBlockers : [];
  const match = blockers.find(b => b && typeof b.type === 'string' && b.type.split('-')[0] === workstreamKey);
  return match ? { type: match.type, reasoning: match.reasoning || null, urgency: match.urgency || null } : null;
}

/**
 * @param {object} event
 * @param {object|null} ctx - ExperienceContext (buildExperienceContext output), optional
 * @param {Array|null} vendors - defaults to event.vendors
 * @param {object|null} playbook - reserved for future workstream-aware playbook content;
 *   not yet consumed (no playbook-derived workstream data exists to compose — honestly
 *   left unused rather than inventing a placeholder read)
 * @returns {Array<{id, label, status, blocked, nextDecision, dependencies, deepLink, vendors, readiness}>}
 */
export function workstreamsFor(event, ctx = null, vendors = null, playbook = null) {
  const list = vendors || (event && event.vendors) || [];
  const groups = new Map();

  for (const v of list) {
    const key = workstreamKeyForVendor(v);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }

  const workstreams = [];
  for (const [key, vendorsInGroup] of groups.entries()) {
    const total = vendorsInGroup.length;
    const booked = vendorsInGroup.filter(v => BOOKED_STATUSES.has(v.status)).length;
    const needsAttention = total - booked;

    // Blocked: a real, already-existing signal (COI/insurance critical) — not a
    // new blocking concept. Distinct from "needs attention" (routine follow-up).
    const blocked = vendorsInGroup.some(v => {
      try { return getVendorCOIState(v, event)?.level === 'critical'; }
      catch { return false; }
    });

    const firstNeedsAttention = vendorsInGroup.find(v => !BOOKED_STATUSES.has(v.status)) || vendorsInGroup[0] || null;

    workstreams.push({
      id: key,
      label: WORKSTREAM_LABELS[key] || key,
      status: statusFor(booked, total),
      blocked,
      nextDecision: nextDecisionFor(key, ctx),
      dependencies: [], // none authored/known yet — see file header
      deepLink: firstNeedsAttention ? { tab: 'Vendors', vendorId: firstNeedsAttention.id } : { tab: 'Vendors' },
      vendors: vendorsInGroup,
      readiness: { total, booked, needsAttention },
    });
  }

  return workstreams;
}

// Rollup across all workstreams — the single number eventPlan()/Vendors should
// both read, replacing two independently-computed vendor counts with one.
export function workstreamReadinessRollup(event, ctx = null, vendors = null, playbook = null) {
  const workstreams = workstreamsFor(event, ctx, vendors, playbook);
  return workstreams.reduce((acc, w) => ({
    total: acc.total + w.readiness.total,
    booked: acc.booked + w.readiness.booked,
    needsAttention: acc.needsAttention + w.readiness.needsAttention,
  }), { total: 0, booked: 0, needsAttention: 0 });
}
