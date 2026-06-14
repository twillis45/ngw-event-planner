// ─── Vendor Promise Conflict Detection ─────────────────────────────────────
// Sprint 61.A Phase A. Pure rules engine that reads event + vendor +
// promise state and surfaces conflicts in plain language. Returns a flat
// list — UI groups + ranks them.

import { getVendorPlaybook } from './playbooks.js';

function parseHHMM(t) {
  if (!t || typeof t !== 'string') return null;
  const [h, m] = t.split(':').map(n => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

let conflictCounter = 0;
function nextId() { conflictCounter += 1; return `cf-${Date.now().toString(36)}-${conflictCounter}`; }

const SEV = { critical: 4, high: 3, attention: 2, watch: 1 };

/**
 * @typedef Conflict
 * @prop {string}  id
 * @prop {('watch'|'attention'|'high'|'critical')} severity
 * @prop {string}  kind
 * @prop {string}  title
 * @prop {string}  explanation       plain language
 * @prop {string}  recommendedAction
 * @prop {Array<{type:string,id:string}>} sourceRefs
 * @prop {string|null} affectedVendorId
 * @prop {string|null} affectedEventId
 */

/**
 * Detect all conflicts across an event.
 * @param {Object} event
 * @param {Array} promises  Promise[] (across all vendors for this event)
 */
export function deriveVendorPromiseConflicts(event, promises = []) {
  if (!event) return [];
  const conflicts = [];
  const vendors = Array.isArray(event.vendors) ? event.vendors : [];
  const ros     = Array.isArray(event.ros)     ? event.ros     : [];
  const guests  = Array.isArray(event.guests)  ? event.guests  : [];

  // ── 1. Venue access ──────────────────────────────────────────────────
  // Find the venue vendor's access_time + any other vendor's arrival/setup
  // that's earlier than venue access.
  const venueVendor = vendors.find(v => /venue/i.test(v.category || ''));
  const venueAccess = venueVendor?.arrivalTime || event.venueAccessTime || null;
  const venueAccessMin = parseHHMM(venueAccess);

  vendors.forEach(v => {
    if (!v.arrivalTime) return;
    const arrMin = parseHHMM(v.arrivalTime);
    if (venueAccessMin !== null && arrMin !== null && arrMin < venueAccessMin) {
      conflicts.push({
        id: nextId(),
        severity: 'critical',
        kind: 'arrival_before_access',
        title: `${v.name} arrives before venue access`,
        explanation: `${v.name} arrival is set for ${v.arrivalTime}, but venue access starts at ${venueAccess}.`,
        recommendedAction: 'Confirm early access or adjust arrival time.',
        sourceRefs: [{ type: 'vendor', id: v.id }, { type: 'vendor', id: venueVendor?.id }].filter(s => s.id),
        affectedVendorId: v.id,
        affectedEventId: event.id,
      });
    }
  });

  // ── 2. Setup after guest arrival ─────────────────────────────────────
  const guestArrivalSeg = ros.find(r => /guest|arrival|cocktail|ceremony begins/i.test(r.segment || ''));
  if (guestArrivalSeg?.time) {
    const guestMin = parseHHMM(guestArrivalSeg.time);
    vendors.forEach(v => {
      const setupSeg = ros.find(r => (/setup|load[ -]?in|delivery/i.test(r.segment || '')) && (r.vendorName === v.name || r.owner === v.name));
      if (setupSeg?.time) {
        const setupMin = parseHHMM(setupSeg.time);
        if (guestMin !== null && setupMin !== null && setupMin >= guestMin) {
          conflicts.push({
            id: nextId(),
            severity: 'high',
            kind: 'setup_after_guest_arrival',
            title: `${v.name} setup runs into guest arrival`,
            explanation: `${v.name} setup is scheduled at ${setupSeg.time}, after guest arrival at ${guestArrivalSeg.time}.`,
            recommendedAction: 'Move setup earlier, or confirm setup completes before guests arrive.',
            sourceRefs: [{ type: 'vendor', id: v.id }, { type: 'ros', id: setupSeg.id }],
            affectedVendorId: v.id,
            affectedEventId: event.id,
          });
        }
      }
    });
  }

  // ── 3. Photographer coverage ends before key moment ─────────────────
  const photoVendor = vendors.find(v => /photo|video/i.test(v.category || ''));
  if (photoVendor && photoVendor.coverageEnd) {
    const covMin = parseHHMM(photoVendor.coverageEnd);
    const lateSeg = ros.find(r => /cake|send[- ]?off|toast|first dance|reception/i.test(r.segment || '') && parseHHMM(r.time) !== null);
    if (lateSeg) {
      const segMin = parseHHMM(lateSeg.time);
      if (covMin !== null && segMin !== null && covMin < segMin) {
        conflicts.push({
          id: nextId(),
          severity: 'high',
          kind: 'coverage_gap',
          title: `${photoVendor.name} coverage ends before "${lateSeg.segment}"`,
          explanation: `Coverage ends at ${photoVendor.coverageEnd}, but "${lateSeg.segment}" is at ${lateSeg.time}.`,
          recommendedAction: 'Extend coverage or move the key moment earlier.',
          sourceRefs: [{ type: 'vendor', id: photoVendor.id }, { type: 'ros', id: lateSeg.id }],
          affectedVendorId: photoVendor.id,
          affectedEventId: event.id,
        });
      }
    }
  }

  // ── 4. Catering count mismatch ───────────────────────────────────────
  const caterer = vendors.find(v => /cater/i.test(v.category || ''));
  if (caterer && (caterer.guestCount !== undefined && caterer.guestCount !== null)) {
    const trackerCount = guests.length || (event.guestEstimate ? Number(event.guestEstimate) : null);
    if (trackerCount !== null && Math.abs(Number(caterer.guestCount) - trackerCount) > 0) {
      conflicts.push({
        id: nextId(),
        severity: 'high',
        kind: 'count_mismatch',
        title: 'Catering guest count does not match guest tracker',
        explanation: `Caterer expects ${caterer.guestCount}; guest tracker shows ${trackerCount}.`,
        recommendedAction: 'Reconcile final count with caterer before final-count cutoff.',
        sourceRefs: [{ type: 'vendor', id: caterer.id }],
        affectedVendorId: caterer.id,
        affectedEventId: event.id,
      });
    }
  }

  // ── 5. DJ missing ceremony/reception timing ─────────────────────────
  const dj = vendors.find(v => /dj|entertainment|band|music/i.test(v.category || ''));
  if (dj) {
    const ceremonySeg = ros.find(r => /ceremony|vows|processional/i.test(r.segment || ''));
    const receptionSeg = ros.find(r => /reception|cocktail|dinner/i.test(r.segment || ''));
    if (ceremonySeg && !ceremonySeg.time) {
      conflicts.push({
        id: nextId(),
        severity: 'attention',
        kind: 'timeline_clash',
        title: `${dj.name} has no ceremony timing`,
        explanation: 'Ceremony segment exists but no time is set — DJ cannot cue announcements.',
        recommendedAction: 'Set ceremony time so DJ can build the cue sheet.',
        sourceRefs: [{ type: 'vendor', id: dj.id }, { type: 'ros', id: ceremonySeg.id }],
        affectedVendorId: dj.id,
        affectedEventId: event.id,
      });
    }
    if (receptionSeg && !receptionSeg.time) {
      conflicts.push({
        id: nextId(),
        severity: 'attention',
        kind: 'timeline_clash',
        title: `${dj.name} has no reception timing`,
        explanation: 'Reception segment exists but no time is set — toasts/cake/dances cannot be scheduled.',
        recommendedAction: 'Set reception time so DJ can build the cue sheet.',
        sourceRefs: [{ type: 'vendor', id: dj.id }, { type: 'ros', id: receptionSeg.id }],
        affectedVendorId: dj.id,
        affectedEventId: event.id,
      });
    }
  }

  // ── 6. Rentals delivery vs load-in ──────────────────────────────────
  const rentalVendor = vendors.find(v => /rental/i.test(v.category || ''));
  if (rentalVendor && rentalVendor.deliveryWindowStart && venueAccessMin !== null) {
    const delMin = parseHHMM(rentalVendor.deliveryWindowStart);
    if (delMin !== null && delMin < venueAccessMin) {
      conflicts.push({
        id: nextId(),
        severity: 'critical',
        kind: 'delivery_window_conflict',
        title: 'Rentals delivery before venue load-in',
        explanation: `Rentals delivery starts ${rentalVendor.deliveryWindowStart}, but venue access starts at ${venueAccess}.`,
        recommendedAction: 'Adjust delivery window or confirm early access.',
        sourceRefs: [{ type: 'vendor', id: rentalVendor.id }],
        affectedVendorId: rentalVendor.id,
        affectedEventId: event.id,
      });
    }
  }

  // ── 7. Florist setup conflicts with venue access ────────────────────
  const florist = vendors.find(v => /florist|floral|flower|decor/i.test(v.category || ''));
  if (florist && florist.deliveryTime && venueAccessMin !== null) {
    const delMin = parseHHMM(florist.deliveryTime);
    if (delMin !== null && delMin < venueAccessMin) {
      conflicts.push({
        id: nextId(),
        severity: 'high',
        kind: 'delivery_window_conflict',
        title: 'Florist delivery before venue access',
        explanation: `Florist delivery is set for ${florist.deliveryTime}, but venue access starts at ${venueAccess}.`,
        recommendedAction: 'Confirm early access or adjust delivery time.',
        sourceRefs: [{ type: 'vendor', id: florist.id }],
        affectedVendorId: florist.id,
        affectedEventId: event.id,
      });
    }
  }

  // ── 8. Payment vs Budget conflict ───────────────────────────────────
  // If a vendor is marked balance-paid but the matching budget line shows
  // an outstanding balance, surface the conflict so the planner can reconcile.
  vendors.forEach(v => {
    const bLine = (event.budget || []).find(b => (b.category || '').toLowerCase() === (v.category || '').toLowerCase());
    if (!bLine) return;
    const actual = Number(bLine.actual || 0);
    const committed = Number(bLine.budgeted || 0);
    if (v.balancePaid && actual < committed) {
      conflicts.push({
        id: nextId(),
        severity: 'attention',
        kind: 'payment_vs_budget',
        title: `${v.name} marked paid but budget shows outstanding`,
        explanation: `Vendor says balance paid; budget shows ${actual} of ${committed} spent.`,
        recommendedAction: 'Reconcile vendor payment with budget line — one is stale.',
        sourceRefs: [{ type: 'vendor', id: v.id }, { type: 'budget', id: bLine.id }],
        affectedVendorId: v.id,
        affectedEventId: event.id,
      });
    }
  });

  // ── 9. Contract status conflict with documents ──────────────────────
  vendors.forEach(v => {
    const sayUploaded = !!(v.contractUrl || v.contractFileName || v.contractStoragePath);
    const saySigned   = v.contractSigned === true || v.contract_signed === true;
    if (saySigned && !sayUploaded) {
      conflicts.push({
        id: nextId(),
        severity: 'attention',
        kind: 'contract_vs_documents',
        title: `${v.name} contract marked signed but no file on record`,
        explanation: 'Vendor record says signed; no contract file is attached for reference.',
        recommendedAction: 'Upload the signed contract or correct the signed status.',
        sourceRefs: [{ type: 'vendor', id: v.id }],
        affectedVendorId: v.id,
        affectedEventId: event.id,
      });
    }
  });

  // Sort by severity (critical > high > attention > watch)
  return conflicts.sort((a, b) => (SEV[b.severity] || 0) - (SEV[a.severity] || 0));
}

/**
 * Filter to conflicts affecting one vendor only.
 */
export function conflictsForVendor(vendor, allConflicts) {
  if (!vendor) return [];
  return (allConflicts || []).filter(c => c.affectedVendorId === vendor.id);
}
