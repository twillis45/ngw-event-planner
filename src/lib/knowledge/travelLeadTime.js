// ─── AN INVITE THAT ARRIVES AFTER THE CHEAP SEATS ARE GONE ───────────────────
//
// Birthday authors `bd_invite` at offsetDays 18. On a LOCAL party that is fine.
// On the Santa Fe 80th — ten people flying to New Mexico — a guest opening that
// invitation has 18 days to buy a flight, and 18 days is not merely "a bit
// tight": it is past the point where fares reliably step up.
//
// THE MEASURED BASIS (read from the pages, not from search snippets):
//
//   CheapAir's 2024 annual study — 917 million airfares across more than 8,000
//   US markets — puts the domestic PRIME BOOKING WINDOW at 74 to 21 days out,
//   names 42 days as the best single day on average, and states that "the fare
//   spikes start right around 21 days from your travel date". Booking inside
//   20-14 days ("Push Your Luck") costs 8% more than the prime window.
//
//   Corroborated by two independent studies, via Frommers (2026-03-04): Google
//   Flights puts the domestic optimum at 39 days with a 23-51 day window, and
//   Expedia at 15-30 days. All three land inside "roughly three weeks to two and
//   a half months" — and none of them is nine months.
//
// SO THE WEDDING-INDUSTRY ADVICE IS ABOUT A DIFFERENT CLOCK, and conflating the
// two is the mistake this module exists to prevent. "Send save-the-dates 9-12
// months out" is about a guest's CALENDAR — holding the dates, booking leave,
// saving up. It is NOT about buying the flight early: CheapAir measures booking
// 315-206 days out as costing 36% MORE, and Expedia measures $160 more for
// booking beyond six months. Telling a host to make guests buy flights in
// January for a June trip would be advice against the evidence.
//
// WHAT IS GROUNDED HERE AND WHAT IS NOT. The two window edges are cited. The
// decision buffer added on top is REASONED and labelled as such: a guest cannot
// act on the prime window at the instant they are told, because they have to
// decide, check with whoever they travel with, and clear the time off first. No
// source measures that gap, so it is not dressed as though one does.
export const TRAVEL_LEAD_SOURCES = {
  'cheapair-airfare-2024': {
    title: 'Annual Airfare Study — Flight Booking Zones and the Prime Booking Window',
    publisher: 'CheapAir.com',
    tier: 'cited',
    note: 'More than 917 million airfares across 8,000+ US markets. Domestic prime booking window 74-21 days out; best single day 42 days; "the fare spikes start right around 21 days from your travel date"; booking 315-206 days out costs 36% more, 205-75 days costs 14% more, and 20-14 days costs 8% more. Published 2024-10-19, page read 2026-09-23. The publisher sells flights, which is disclosed in `limitations`.',
    url: 'https://www.cheapair.com/blog/the-best-time-to-buy-flights/',
    fetched: '2026-09-23',
    limitations: ['commercial_interest_disclosed'],
  },
  'frommers-booking-windows-2026': {
    title: 'How Far in Advance Should You Book Flights? Two Major Studies Have Answers',
    publisher: 'Frommers (reporting Google Flights and Expedia studies)',
    tier: 'cited',
    note: 'Independent corroboration of the window, from two studies neither of which is CheapAir. Google Flights: domestic optimum 39 days, good-fare window 23-51 days (data 2021-01-01 to 2025-08-01). Expedia: 15-30 days, and booking more than six months out cost $160 more on average (2025 data). The author notes ARC — the impartial clearing house — no longer publishes such a report. Published 2026-03-04, page read 2026-09-23.',
    url: 'https://www.frommers.com/tips/calendar-of-events/how-far-in-advance-of-a-flight-should-you-book-airfare-two-major-studies-have-answers/',
    fetched: '2026-09-23',
    limitations: ['reports_third_party_studies'],
  },
};

/** The cited window edges. Days before departure. */
export const AIR_BOOKING = Object.freeze({
  primeOpensDays: 74,   // top of CheapAir's prime booking window
  primeClosesDays: 21,  // "the fare spikes start right around 21 days"
  bestSingleDay: 42,    // CheapAir's measured average best day
  sources: ['cheapair-airfare-2024', 'frommers-booking-windows-2026'],
});

// A guest cannot buy the moment they are told. REASONED, not measured: no source
// in this registry puts a number on deciding, checking with whoever you travel
// with and clearing the days off. Two weeks is a planner's judgement and is
// reported as such — `basis.decisionBufferTier` says 'reasoned' so a surface can
// never render the total as fully cited.
const DECISION_BUFFER_DAYS = 14;

/**
 * How many days before the event an invitation must land, for an event whose
 * guests have to fly.
 *
 * Returns null when the event is not a destination event — there is no air
 * travel to be early for, and the playbook's own timing stands.
 *
 * `floorDays` is the number to plan against. `because` explains it in the
 * host's terms. `tier` is 'synthesized' on purpose: two cited edges plus one
 * reasoned buffer is not a cited figure, and the ladder has a rung for exactly
 * that. It is honest-ungrounded, not dressed up.
 */
export function airTravelInviteFloor(event) {
  if (!event || event.isDestination !== true) return null;
  const floorDays = AIR_BOOKING.primeOpensDays + DECISION_BUFFER_DAYS; // 88
  return {
    floorDays,
    primeOpensDays: AIR_BOOKING.primeOpensDays,
    primeClosesDays: AIR_BOOKING.primeClosesDays,
    bestSingleDay: AIR_BOOKING.bestSingleDay,
    decisionBufferDays: DECISION_BUFFER_DAYS,
    decisionBufferTier: 'reasoned',
    tier: 'synthesized',
    sources: AIR_BOOKING.sources,
    because: `Flights are cheapest booked ${AIR_BOOKING.primeOpensDays}–${AIR_BOOKING.primeClosesDays} days out, and fares step up around ${AIR_BOOKING.primeClosesDays} days. Inviting ${floorDays} days ahead gives everyone the whole of that window, plus a fortnight to decide and ask for the time off.`,
  };
}

/**
 * Is this lead time late enough to have cost the guests money?
 * TRUE only past the CITED spike point — the one edge that is measured rather
 * than reasoned, so the warning never rests on the buffer.
 */
export function pastPrimeBookingWindow(daysOut) {
  const n = Number(daysOut);
  return Number.isFinite(n) && n < AIR_BOOKING.primeClosesDays;
}
