// ─── guestCountFor — whose number is the headcount? ──────────────────────────
//
// THE LIVE DEFECT (measured 2026-09-18, inputs-vs-engine-needs audit). A host who
// types eight words — "Cookout on June 12, 2027" — gets a STORED headcount of 40.
// Not a preview, not a hint: `guestEstimate: 40`, written by the creation seam
// from the playbook's typical when the parser heard no count.
//
// Everything downstream then treats it as fact. Measured on that event:
//   attendanceModel   planned 40, low 32, high 46 — a full forecast
//   hostSpending      committed $2,320, food $1,543, supplies $295
//   vendorPlan        5 categories priced, $480–$1,000
//   returnNarration   countSet: TRUE   ← records that the host set a count
//   draftVendorOutreach   "for about 40 guests"  ← AND IT LEAVES THE APP
//
// That last line is the one that matters. Of everything the app derives, this is
// the only measured case where a number the app INVENTED is put in front of a
// third party in the host's name. A caterer quotes against it.
//
// THE PRECEDENT IS ALREADY IN THE TREE, and this is deliberately its twin.
// lib/startTime.js had exactly this bug — a derived 15:00 leaking into seven
// outward drafts — and solved it with two pieces: a `startTimeSource` field
// written at the moment of derivation, and `startTimeIsConfirmed()` gating every
// outward surface. The headcount had NEITHER. `grep guestEstimateSource` over the
// repo returned zero hits: there was no field to carry the fact, so no surface
// could have consulted it even if it wanted to.
//
// THE SHELL ALREADY KNEW. HostShellV2 ~:1370 computes
//   effGuests = (fGuests ?? parsed.guests) ?? pbTypical
// and ~:7318 renders the chip as "~40 · typical" precisely when both host sources
// are null. So the provenance was on screen at creation and discarded one line
// later at persist — the same class as the three `*Basis` fields the parser drops.
//
// WHY UNKNOWN COUNTS AS THE HOST'S. Legacy events carry no source field, and the
// overwhelming majority of them hold a number the host really did give. Treating
// unknown as derived would withhold real headcounts from real vendor briefs — a
// worse failure than the one this fixes, and a silent one. Only a value we KNOW
// we invented is withheld. Exactly the rule startTimeIsConfirmed uses.
//
// PURE: no I/O, no clock, no storage.

/** The app substituted a playbook typical because the host gave no number. */
export const SOURCE_PLAYBOOK_TYPICAL = 'playbook-typical';
/** The host said it — typed, parsed from their own sentence, or picked a chip. */
export const SOURCE_HOST = 'host';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * The headcount and whose it is.
 *
 *   count   the number to plan with, or null when there is none.
 *   known   is there a number at all.
 *   source  'host' | 'playbook-typical' | null (never recorded).
 *   fromHost  safe to state OUTWARD — see guestCountIsConfirmed.
 *
 * Resolution order matches every existing reader in the tree
 * (guestCount || guestEstimate || guests.length), so adopting this file changes
 * no number anywhere — it only adds the fact of whose number it is.
 */
export function guestCountFor(event) {
  const ev = event || {};
  const locked = num(ev.guestCount);
  const estimate = num(ev.guestEstimate);
  const roster = Array.isArray(ev.guests) ? ev.guests.length : 0;
  const count = locked || estimate || roster || null;

  // A LOCKED COUNT AND A ROSTER ARE THE HOST'S BY CONSTRUCTION. `guestCount` is
  // only ever written by the count editor and the lock control, and a roster is
  // people they entered one at a time. `guestCountSource` describes the ESTIMATE
  // — the only slot the app ever writes a number of its own into — so it may not
  // be allowed to cast doubt on either of the other two.
  const source = (() => {
    if (count == null) return null;
    if (locked || (!estimate && roster)) return SOURCE_HOST;
    const s = String(ev.guestCountSource || '');
    return s === SOURCE_PLAYBOOK_TYPICAL ? SOURCE_PLAYBOOK_TYPICAL
      : s === SOURCE_HOST ? SOURCE_HOST
        : null;                                  // legacy: never recorded
  })();

  return {
    count,
    known: count != null,
    source,
    fromHost: count != null && source !== SOURCE_PLAYBOOK_TYPICAL,
  };
}

/**
 * May this number be stated OUTWARD — to a vendor, on an invite, in a brief?
 *
 * The twin of startTimeIsConfirmed, and unknown resolves the same way: only a
 * number we recorded as our own substitution is withheld.
 */
export const guestCountIsConfirmed = (event) => guestCountFor(event).fromHost;

/**
 * What to tell the HOST about a headcount the app supplied.
 *
 * Null when there is nothing to say, so a caller can render it without a branch.
 * This is the other half of withholding: a vendor draft that quietly drops the
 * headcount would leave the host thinking the caterer was told.
 */
export function guestCountNotice(event) {
  const g = guestCountFor(event);
  if (g.source !== SOURCE_PLAYBOOK_TYPICAL) return null;
  return `We used ${g.count} as a typical headcount for this kind of event — it is not in anything we send until you confirm it.`;
}
