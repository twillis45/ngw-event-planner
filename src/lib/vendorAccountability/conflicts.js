// ─── Vendor Promise Conflict Detection ─────────────────────────────────────
// Sprint 61.A Phase A. Pure rules engine that reads event + vendor +
// promise state and surfaces conflicts in plain language. Returns a flat
// list — UI groups + ranks them.

import { getVendorPlaybook } from './playbooks.js';
import { parseStartMinutes } from '../eventWhen.js';

// Times in the seed + host input are 12-hour strings ("1:00 PM", "10:00 AM"),
// but the old local parser split on ":" and dropped the meridiem — so "1:00 PM"
// read as 60 minutes and looked EARLIER than a "10:00 AM" (600) venue access,
// firing a false "arrives before venue access" conflict for every afternoon
// vendor (a whole wedding's PM roster). Route through the shared AM/PM-aware
// parser (eventWhen.parseStartMinutes) instead, which also reads 24-hour.
function parseHHMM(t) { return parseStartMinutes(t); }

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
    // The host has already told us this vendor is cleared to be there early —
    // the "confirm early access" resolution set this flag. Stop flagging it.
    if (v.earlyAccessConfirmed) return;
    const arrMin = parseHHMM(v.arrivalTime);
    if (venueAccessMin !== null && arrMin !== null && arrMin < venueAccessMin) {
      conflicts.push({
        id: nextId(),
        severity: 'critical',
        kind: 'arrival_before_access',
        title: `${v.name} arrives before venue access`,
        explanation: `${v.name} arrival is set for ${v.arrivalTime}, but venue access starts at ${venueAccess}.`,
        // Tight one-line situation for the decluttered hero (grounded — same two real times).
        detailShort: `Arrives ${v.arrivalTime} · doors open ${venueAccess}`,
        recommendedAction: 'Confirm early access or adjust arrival time.',
        // STRUCTURED FIX (phase 2): the two real ways to clear it are both concrete
        // vendor patches, so the hero can resolve in place (one tap) instead of only
        // routing. `set` = "adjust arrival time" to when access opens; `confirm` =
        // "confirm early access" (flag it cleared, which the guard above then honors).
        // `custom` = the host can pick ANY arrival time (not just the two canned fixes) —
        // names the vendor field the inline time picker writes to.
        proposedFix: {
          confirm: { patch: { earlyAccessConfirmed: true }, label: 'Confirm early access',
            receipt: `${v.name} is cleared for early access — the clash is gone.` },
          set: { patch: { arrivalTime: venueAccess }, label: `Move arrival to ${venueAccess}`,
            receipt: `${v.name} now arrives at ${venueAccess}, when the doors open.` },
          custom: { field: 'arrivalTime', kind: 'time', label: 'Set a different time', suggest: venueAccess },
        },
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
  if (caterer && (caterer.guestCount !== undefined && caterer.guestCount !== null) && !caterer.guestCountConfirmed) {
    // The tracker is the host's INTENDED headcount, which is at least the
    // planned estimate — a PARTIAL entered roster must not shadow it. `guests.length
    // || guestEstimate` did exactly that: a 7-of-75 roster read as "7", so a caterer
    // set to the real 75 looked "off by 68" (a false positive — the count matches the
    // plan, only the RSVPs are still coming in). Take the larger of entered-vs-estimate.
    const est = event.guestEstimate != null && String(event.guestEstimate).trim() !== '' ? Number(event.guestEstimate) : 0;
    const trackerCount = Math.max(guests.length, Number.isFinite(est) ? est : 0) || null;
    if (trackerCount !== null && Math.abs(Number(caterer.guestCount) - trackerCount) > 0) {
      conflicts.push({
        id: nextId(),
        severity: 'high',
        kind: 'count_mismatch',
        title: 'Catering guest count does not match guest tracker',
        explanation: `Caterer expects ${caterer.guestCount}; guest tracker shows ${trackerCount}.`,
        recommendedAction: 'Reconcile final count with caterer before final-count cutoff.',
        // STRUCTURED FIX: one clean vendor-field patch either way. `set` = match the
        // caterer's number to the tracker (a number fix); `confirm` = the caterer's
        // count is right on purpose, flag it so this stops firing (the guard above).
        proposedFix: {
          set: { patch: { guestCount: trackerCount }, label: `Match the guest tracker (${trackerCount})`,
            receipt: `Caterer set to ${trackerCount} — it matches your guest tracker now.` },
          confirm: { patch: { guestCountConfirmed: true }, label: `Keep the caterer’s count (${caterer.guestCount})`,
            receipt: `Kept the caterer’s ${caterer.guestCount} — the tracker difference is acknowledged.` },
        },
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
        // Resolve IN PLACE (no "Take me to" route-away): a structured proposedFix
        // the mapper (deriveResolution) turns into two one-tap options. A genuine
        // either/or — trust the vendor and make the budget reflect the payment (a
        // budget `event` write), or trust the budget and reopen the balance (a
        // vendor `patch`). Resolving either clears the conflict.
        proposedFix: {
          confirm: {
            label: `Paid in full — show $${committed.toLocaleString()} spent`,
            event: { budget: (event.budget || []).map(b => (b === bLine ? { ...b, actual: committed } : b)) },
            receipt: `Budget updated — $${committed.toLocaleString()} now reads paid. The budget reads true.`,
          },
          set: {
            label: `Not yet — $${(committed - actual).toLocaleString()} still owed`,
            patch: { balancePaid: false },
            receipt: `${v.name} — balance reopened; $${(committed - actual).toLocaleString()} still to pay.`,
          },
        },
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
        // In place: reopen the "signed" flag (a vendor patch that clears the clash),
        // or — if it really is signed — route to the vendor to attach the file (a
        // genuine upload can't be a one-tap patch).
        proposedFix: {
          confirm: {
            label: 'Not signed yet — reopen it',
            patch: { contractSigned: false, contract_signed: false },
            receipt: `${v.name} — contract reopened; mark it signed once the paperwork's on file.`,
          },
          set: {
            label: 'Signed — attach the file',
            route: { tab: 'Vendors', vendorId: v.id, vendorSection: 'documents' },
          },
        },
      });
    }
  });

  // GROUNDED PUNCHY HEADLINES (regrounded from the old UI-side ASK_BY_KIND, host
  // request 2026-07-18: "i like the punchier copy — update the decision engine to
  // update the per-conflict fields"). The loud host-plain line now lives HERE in the
  // engine, built PER-INSTANCE from the real affected vendor's name + the real kind —
  // so it's accurate (the old "Two vendors want the same hour" misread a single
  // vendor-vs-venue clash as two vendors) and never a generic render-time map. Falls
  // back to the real `title` when there's no grounded name. `impact` = what resolving
  // it unlocks — authored engine knowledge, keyed on the real kind (like a playbook's why).
  const IMPACT = {
    arrival_before_access: 'the setup window clears',
    setup_after_guest_arrival: 'guests walk into a finished room',
    coverage_gap: 'the moment gets captured',
    count_mismatch: 'the food count locks',
    timeline_clash: 'the DJ can build the cue sheet',
    delivery_window_conflict: 'the delivery lands with someone there',
    payment_vs_budget: 'the budget reads true',
    contract_vs_documents: 'the paper trail is clean',
  };
  const nameOf = (id) => { const vv = vendors.find(x => x && x.id === id); return (vv && String(vv.name || '').trim()) || null; };
  const headlineFor = (c) => {
    const n = nameOf(c.affectedVendorId);
    if (!n) return c.title; // no grounded name → the real title stands
    switch (c.kind) {
      case 'arrival_before_access': return `${n} beats the doors open.`;
      case 'setup_after_guest_arrival': return `${n}’s setup runs into your guests.`;
      case 'coverage_gap': return `${n} clocks out too early.`;
      case 'count_mismatch': return 'The catering count is off.';
      case 'timeline_clash': return `${n} still needs a time.`;
      case 'delivery_window_conflict': return `${n} delivers before the doors open.`;
      case 'payment_vs_budget': return `${n}’s payment doesn’t match the budget.`;
      case 'contract_vs_documents': return `${n}’s contract says signed — no file.`;
      default: return c.title;
    }
  };
  conflicts.forEach(c => { c.headline = headlineFor(c); c.impact = IMPACT[c.kind] || null; });

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
