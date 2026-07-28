// ─── Vendor Brief payload — AUDITED WHITELIST ───────────────────────────────
// The vendor brief is VENDOR-FACING: its payload is base64-encoded into a
// shareable URL/QR that leaves the host's hands. Every field here must be
// explicitly safe for the vendor to see. This is a whitelist by construction —
// the builder never spreads `vendor`/`event`/`profile`, it copies named fields
// only — so a new private field added to the vendor record can never leak into
// a brief by default.
//
// PRIVACY AUDIT (2026-07-05): vendor.notes is the host's PRIVATE bookkeeping —
// seed data shows deposit amounts, payment reminders, and headcount notes in
// it — and it was previously included in the payload AND rendered in the
// brief. It is now excluded, along with every money/ops field:
//   EXCLUDED: notes, cost, depositAmt, depositPaid, balancePaid, payDueDate,
//   backup, contractSigned/contract*, coi*, log, reliability/score fields
//   (eventsCompleted, onTimeRate, incidentCount, …), and anything else not
//   named below.
// Vendor-facing copy belongs in vendor.briefNote — a field the host writes
// KNOWING the vendor will read it (read here when present; nothing writes it
// yet, so including the read is additive and migration-free).

// The run-of-show slice a vendor may see: only cues assigned to them, and only
// the fields a vendor needs to show up in the right place at the right time.
// (Cue-level `notes` are day-of stage directions — written to be read aloud /
// followed on site — not host bookkeeping, so they stay.)
import { venueFor } from './venueFor';

export function vendorRosSlice(ros, vendor) {
  const name = (vendor && vendor.name) || '';
  return (ros || [])
    .filter(r => r && (r.vendorName === name || r.owner === name))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    // `rel` travels with the row. Until 2026-07-14 the run of show manufactured a clock out
    // of a coarse "afternoon" (and, with nothing at all, out of a bare 15:00) — and THIS
    // function shipped those invented hours to a real caterer as their load-in time. The
    // times are now null unless the host actually set a start time; `rel` carries what we
    // genuinely know ("4h before guests arrive"), so the brief stays useful without lying.
    // A vendor reading "4h before guests arrive" can plan. A vendor reading a made-up 11:00
    // shows up at the wrong hour.
    .map(r => ({ time: r.time, rel: r.rel || null, segment: r.segment, location: r.location, notes: r.notes }));
}

export function buildVendorBriefPayload(vendor, event, ros, profile) {
  const v = vendor || {}, e = event || {}, p = profile || {};
  return {
    // vendor identity — safe: it's the vendor's own info
    vendorId:    v.id,
    vendorName:  v.name,
    contactName: v.contactName || '',
    category:    v.category,
    arrivalTime: v.arrivalTime,
    // vendor-facing note ONLY — never v.notes (host-private bookkeeping)
    briefNote:   v.briefNote || '',
    // event basics — what/when/where the vendor is showing up for
    eventId:   e.id,
    eventName: e.name,
    eventDate: e.date,
    venue:     venueFor(e).name,
    // planner contact + branding — intended for vendor use
    plannerName:     p.name  || '',
    plannerPhone:    p.phone || '',
    plannerEmail:    p.email || '',
    plannerBusiness: p.businessName || '',
    plannerWebsite:  p.website   || '',
    plannerIG:       p.instagram || '',
    plannerCity:     p.city      || '',
    plannerLogo:     p.logo      || '',
    brandColor:      p.brandColor || '',
    // this vendor's run-of-show slice only
    // THE OUTWARD GATE. The event now arrives with a GROUNDED default start time so the plan
    // runs on a real clock immediately — but a default is OURS, not the host's, until they
    // confirm it, and a caterer who shows up at the wrong hour does not care whose default it
    // was. Until the host says "that's right", the brief carries the RELATIVE schedule it
    // already computes ("4h before guests arrive") and names no hour. That is honest AND
    // useful: a vendor can plan against it. A made-up 11:00 they cannot.
    // Only OUR default is withheld. A host who wrote their own run of show, or set their own
    // start time, owns those hours — nulling them would be the opposite error, hiding the
    // host's real decision from the vendor who needs it. `startTimeSource === 'derived'` is
    // precisely and only "the app picked this and the host has not yet said it's right".
    ros: String(e.startTimeSource || '') === 'derived'
      ? vendorRosSlice(ros, v).map(r => ({ ...r, time: null }))
      : vendorRosSlice(ros, v),
  };
}
