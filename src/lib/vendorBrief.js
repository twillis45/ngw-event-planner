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
export function vendorRosSlice(ros, vendor) {
  const name = (vendor && vendor.name) || '';
  return (ros || [])
    .filter(r => r && (r.vendorName === name || r.owner === name))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    .map(r => ({ time: r.time, segment: r.segment, location: r.location, notes: r.notes }));
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
    venue:     e.venue,
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
    ros: vendorRosSlice(ros, v),
  };
}
