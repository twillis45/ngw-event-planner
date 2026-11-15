// ─── WHO'S CONFIRMED — one read across vendors, helpers and guests ───────────
//
// The host board asked for ONE place that answers "who has said yes?" (11/15/2026).
// The answers already live in three places; this module adds no new state and no
// second source, it only reads them side by side:
//   vendors  — the vendor's OWN answer through the brief link
//              (fetchVendorConfirmations, latest row per vendor id). The host's own
//              "Locked in" is deliberately NOT read as confirmed: the shell reserves
//              "confirmed" for the vendor's word (VENDOR_STATUS_LABEL).
//   helpers  — deriveHelperResponsibilities, whose status comes from the single
//              seam helperStatusFor (helperResponsibility.js). A helper link that
//              lets a helper answer for themselves plugs in THERE, not here.
//   guests   — the RSVP answers on the guest list (event.guests[].rsvp).
//
// Three truthful states only: confirmed, hasn't answered, flagged a problem.
// Nothing is shown as confirmed without one of the sources above saying so.
// PURE: no I/O, no clock, no storage.
import { deriveHelperResponsibilities } from './helperResponsibility';

const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const vendorLabel = (v) => clean(v && v.name) || clean(v && v.category) || 'A vendor';

/**
 * @param {object} event
 * @param {Object<string, {state: string}>} confirmationByVendor latest confirm-back row per vendor id
 */
export function summarizeWhoIsConfirmed(event, confirmationByVendor) {
  const ev = event || {};
  const byVendor = (confirmationByVendor && typeof confirmationByVendor === 'object') ? confirmationByVendor : {};

  // Vendors — hired help with their own confirm lifecycle. An informal "vendor"
  // (a friend on the vendor list) is a helper, and is counted there instead.
  const paid = (Array.isArray(ev.vendors) ? ev.vendors : []).filter((v) => v && !v.isInformal);
  let vendors = null;
  if (paid.length) {
    const confirmed = [], flagged = [], waiting = [];
    for (const v of paid) {
      const row = byVendor[String(v.id)];
      const state = row && clean(row.state);
      if (state === 'confirmed') confirmed.push(vendorLabel(v));
      else if (state) flagged.push(vendorLabel(v));
      else waiting.push(vendorLabel(v));
    }
    vendors = { total: paid.length, confirmed: confirmed.length, flagged, waiting };
  }

  // Helpers — one row per responsibility ("stuffing (Jordan)"), the Helpers panel's own rows.
  let helpers = null;
  let resp = [];
  try { resp = (deriveHelperResponsibilities(ev) || {}).responsibilities || []; } catch { resp = []; }
  if (resp.length) {
    const waiting = resp
      .filter((r) => r.status === 'assigned')
      .map((r) => ({ label: clean(r.label), name: clean(r.helperName) }));
    helpers = { total: resp.length, confirmed: resp.length - waiting.length, waiting };
  }

  // Guests — the replies on the roster.
  let guests = null;
  const roster = (Array.isArray(ev.guests) ? ev.guests : []).filter(Boolean);
  if (roster.length) {
    const said = (g, w) => clean(g.rsvp).toLowerCase() === w;
    guests = {
      invited: roster.length,
      yes: roster.filter((g) => said(g, 'yes')).length,
      maybe: roster.filter((g) => said(g, 'maybe')).length,
      no: roster.filter((g) => said(g, 'no')).length,
    };
  }

  return { vendors, helpers, guests };
}

/** The words, one part per source: "Vendors 2 of 3 confirmed", "Helpers 5 of 7", "Guests 12 yes, 2 maybe". */
export function whoIsConfirmedLines(summary) {
  const s = summary || {};
  const parts = [];
  if (s.vendors) parts.push({ key: 'vendors', text: `Vendors ${s.vendors.confirmed} of ${s.vendors.total} confirmed` });
  if (s.helpers) parts.push({ key: 'helpers', text: `Helpers ${s.helpers.confirmed} of ${s.helpers.total}` });
  if (s.guests) parts.push({ key: 'guests', text: `Guests ${s.guests.yes} yes${s.guests.maybe ? `, ${s.guests.maybe} maybe` : ''}` });

  const waitingNames = [
    ...((s.vendors && s.vendors.waiting) || []),
    ...((s.helpers && s.helpers.waiting) || []).map((w) => (w.name ? `${w.label} (${w.name})` : w.label)),
  ].filter(Boolean);
  const flaggedNames = (s.vendors && s.vendors.flagged) || [];
  return {
    parts,
    waiting: waitingNames.length ? `Still waiting: ${waitingNames.join(', ')}` : '',
    flagged: flaggedNames.length ? `Flagged a problem: ${flaggedNames.join(', ')}` : '',
  };
}
