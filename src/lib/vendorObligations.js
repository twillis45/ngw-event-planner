// ─── VENDOR OBLIGATIONS — the derived half of the checklist ──────────────────
//
// THE GAP THIS CLOSES, measured 2026-08-16. A Wedding with a booked caterer
// carrying `coiStatus: 'missing'`, no deposit and no signed contract produced an
// eleven-row checklist with ZERO rows mentioning insurance, deposit or contract —
// while `getVendorCOIState` already returned
// `{ required: true, status: 'required', label: 'Request it' }` for that vendor.
//
// The engine knew the caterer needed insurance. The host's list never said so.
//
// WHY THIS IS THE RIGHT PLACE FOR DERIVATION, and the earlier board ruling that
// scoped it. Two benches ranked derivation second behind authoring the day-of
// program, and the Venue Operations seat named its genuine home precisely:
// vendor dependency chains and the COI gate, "which no amount of playbook
// authoring scales across 39 types". Everything here is that and nothing else.
//
// THREE RULES THIS MODULE KEEPS.
//
// 1. PREP ONLY. Never emits a day-of beat. Those live in `schedules.program`,
//    are authored per event type, and are ritual knowledge no engine can infer —
//    "open the gifts after the cake" is not derivable from a vendor record.
//
// 2. IT READS STATE, IT DOES NOT INFER IT. Every row below fires on a field the
//    HOST entered or the vendor engine computed: `coiStatus`, `depositPaid`,
//    `contractSigned`, `arrivalTime`. Nothing is derived from prose. The corpus
//    law is that a text MENTION never satisfies a task, and the inverse holds
//    too: a mention must never CREATE one.
//
// 3. SILENCE IS AN ANSWER. A vendor with nothing outstanding emits nothing. A
//    derived list that always has rows in it is a nag, and a host learns to stop
//    reading a list that is never empty.
import { isVendorBooked } from './workstreams';
import { getVendorCOIState } from './vendorIntelligence';

/** Booked vendors only — an idea for a vendor owes the host nothing yet. */
const engagedVendors = (event) => ((event && event.vendors) || []).filter((v) => {
  if (!v || !v.name) return false;
  try { return isVendorBooked(v); } catch { return false; }
});

const vendorLabel = (v) => (v.name || v.role || 'this vendor');

/**
 * vendorObligations(event) -> checklist-shaped rows for what booked vendors owe.
 *
 * Shape matches an authored task (`id`, `phase`, `label`, `when`) so the render
 * seam cannot tell them apart, PLUS `derived: true` and `vendorId` so a row can
 * route to the exact vendor rather than dropping the host on a tab. The repo's
 * standing rule is that a CTA lands on the row it is about.
 */
export function vendorObligations(event) {
  const out = [];
  for (const v of engagedVendors(event)) {
    const who = vendorLabel(v);
    const base = { phase: 'vendor', derived: true, vendorId: v.id || null };

    // ── COI ───────────────────────────────────────────────────────────────
    // The one obligation with a hard gate behind it: a venue can refuse a
    // vendor at the dock without a certificate on file, which turns a paid
    // booking into an absent vendor on the day. Deliberately asks the vendor
    // engine rather than reading `coiStatus` directly, so "does this vendor
    // even need one" stays a single definition.
    let coi = null;
    try { coi = getVendorCOIState(v, event); } catch { coi = null; }
    // READ THE ENGINE'S OWN LADDER, do not re-derive it. `getVendorCOIState`
    // distinguishes required -> requested -> received -> verified, and
    // `verified` means `coiVerified === true`, a real rung ABOVE having the
    // document in hand. The first version of this fired on `required &&
    // !verified`, which raised "get the certificate" for a host who already had
    // it and was merely waiting to check it — a nag on a task already done.
    //
    // So the checklist row is only for a certificate NOT IN HAND, plus the
    // genuinely urgent case of one that lapses before the event. "Received but
    // not verified" is a vendor-cockpit nuance and stays there.
    const coiStatus = coi && coi.required ? coi.status : null;
    if (coiStatus === 'required' || coiStatus === 'requested') {
      out.push({
        ...base,
        id: `d_coi_${v.id || who}`,
        label: `Get the certificate of insurance from ${who}`,
        when: 'T-14d',
        why: 'A venue can turn a vendor away at load-in without one on file.',
      });
    } else if (coiStatus === 'expired') {
      out.push({
        ...base,
        id: `d_coi_${v.id || who}`,
        label: `Get a current certificate from ${who} — theirs lapses before the event`,
        when: 'T-14d',
        why: 'An expired certificate is the same as none on the day.',
      });
    }

    // ── Money and paper ───────────────────────────────────────────────────
    if (v.depositPaid === false) {
      out.push({
        ...base,
        id: `d_dep_${v.id || who}`,
        label: `Pay the deposit to hold ${who}`,
        when: v.depositDueDate ? 'T-30d' : 'T-21d',
        why: 'A held date is not a booked date until the deposit clears.',
      });
    }
    if (v.contractSigned === false) {
      out.push({
        ...base,
        id: `d_con_${v.id || who}`,
        label: `Sign the contract with ${who}`,
        when: 'T-30d',
        why: 'Without it there is nothing that says what you agreed to.',
      });
    }

    // ── The day itself ────────────────────────────────────────────────────
    // Not a day-of beat: this is the PREP act of agreeing a time in advance.
    // Only fires for a vendor already booked, because asking an unbooked
    // vendor when they arrive is noise.
    if (!v.arrivalTime) {
      out.push({
        ...base,
        id: `d_arr_${v.id || who}`,
        label: `Agree an arrival time with ${who}`,
        when: 'T-7d',
        why: 'Two vendors arriving at once, or nobody with a key, is a day-of scramble.',
      });
    }
  }
  return out;
}

/** How many obligations are outstanding — for a rollup that must not lie. */
export function vendorObligationCount(event) {
  return vendorObligations(event).length;
}
