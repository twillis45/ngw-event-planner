// ─── Booking-collapse provenance (failure-modes wave 2, 2026-07-28) ──────────
// What actually happens when a rental host or a vendor fails before the event —
// platform policy pages fetched primary (Airbnb help articles; Vrbo via the
// Expedia newsroom primary while help.vrbo.com was down); federal authority for
// the chargeback clock. This registry is ALSO the research foundation for the
// rental-house intelligence engine (host directive 2026-07-28).

export const BOOKING_RISK_SOURCES = {
  'airbnb-host-cancel': {
    org: 'Airbnb — Fees and consequences when a Host cancels (help article 990)',
    url: 'https://www.airbnb.com/help/article/990',
    fetched: '2026-07-28',
    claim: 'A host who cancels pays 10% (30+ days out), 25% (30 days–48h), or 50% (under 48h) of the reservation, minimum $50, and risks suspension — but nothing PREVENTS the cancellation. The group’s real exposure is rebooking scarcity close to the date, not the money.',
  },
  'airbnb-rebooking': {
    org: 'Airbnb — Rebooking and Refund Policy for homes (effective 2025-02-06, article 2868)',
    url: 'https://www.airbnb.com/help/article/2868',
    fetched: '2026-07-28',
    claim: 'Host cancellation before check-in: full refund plus rebooking help at comparable pricing. Material inaccuracies (wrong bed count, missing amenities, uninhabitable, undisclosed hazards) qualify for refund or rebooking — but MUST be reported within 72 HOURS of discovery, with evidence. Timestamp what you find on arrival.',
  },
  'airbnb-mde': {
    org: 'Airbnb — Major Disruptive Events Policy (article 1320)',
    url: 'https://www.airbnb.com/help/article/1320',
    fetched: '2026-07-28',
    claim: 'Penalty-free cancellation covers declared emergencies, mandatory evacuations, and UNFORESEEABLE disasters — and explicitly EXCLUDES weather common enough to be foreseeable (a hurricane during hurricane season), personal illness, and transport failures. A beach rental booked in storm season has no platform safety net; that is an insurance question.',
  },
  'airbnb-cancel-tiers': {
    org: 'Airbnb — Cancellation policies for listings (article 475)',
    url: 'https://www.airbnb.com/help/article/475',
    fetched: '2026-07-28',
    claim: 'The listing’s guest-cancellation tier is visible before booking: Flexible (full refund to 24h), Moderate (5 days), Limited (14 days full / 7–14 half, bookings on/after Oct 2025), Firm (30 days full / 7–30 half), Strict (half only 7+ days out). A group booking far out should weigh Flexible/Moderate listings so its own attrition isn’t a total loss.',
  },
  'vrbo-book-confidence': {
    org: 'Vrbo / Expedia Group — Book with Confidence Guarantee (newsroom primary; help system down at fetch)',
    url: 'https://www.expedia.com/newsroom/vrbo-cracks-down-on-properties-that-cancel-on-guests-raises-standards-for-premier-hosts/',
    fetched: '2026-07-28',
    claim: 'Vrbo fines hosts who cancel (scaled by timing), demotes repeat cancelers (Premier requires a ≤1% host-cancel rate), and its guarantee provides rebooking help when a host cancels close to the stay (~30 days), lodging help at a failed check-in, and fraud protection — ONLY for stays booked and paid through Vrbo’s checkout.',
  },
  'cfpb-fcba': {
    org: 'CFPB — disputing a credit card charge (Fair Credit Billing Act)',
    url: 'https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-a-charge-on-my-credit-card-bill-en-61/',
    fetched: '2026-07-28',
    claim: 'A billing-error dispute must be written within 60 days of the statement carrying the charge — an event deposit paid months out can age past the window before a vendor folds. Pay vendor deposits by credit card, never cash or app transfers.',
  },
  'markel-vendor-gifts': {
    org: 'Markel Insurance — gift theft prevention + vendor bankruptcy coverage (insurer primary)',
    url: 'https://www.markel.com/insights-and-resources/insights/wedding-gifts-stolen',
    fetched: '2026-07-28',
    claim: 'Vendor bankruptcy is an insurable peril under event cancellation coverage (policies from ~$130, purchasable to 14 days out). Gift-theft prevention: a named gift attendant, a locked card box, the table in a populated corner away from exits, registry gifts shipped home.',
  },
};
