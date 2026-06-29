// Grounded attendance-shift model — how a real headcount typically lands vs. the
// number a host PLANS for. A host says "I'm planning for 50"; actual attendance
// rarely hits 50 exactly. Published RSVP / no-show research gives the typical swing,
// which we turn into an expected BAND (low–high) so the food plan, supplies, and
// budget size to reality instead of a single optimistic number.
//
// HONEST BY FRAMING: these are typical RANGES synthesized from published benchmarks
// ACROSS event types — not extrapolated from any single type (weddings included only as
// one data point). They fill the gap ONLY when there's no real RSVP signal yet (a typed
// count/estimate). Once a roster with RSVPs exists, the real replies win — this model
// steps aside (see attendanceBand()).
//
// SOURCES — deliberately spanning event types so no single kind of event drives the model:
//  GENERAL SOCIAL/PARTIES: ~60% of RSVPs attend on average ("the 60% rule", borne out
//    across ~100 coordinated events), ~70% typical party attendance, rising to ~75% for
//    close friends & family (OMG Hitched; After Work Wonders; nolimitsowasso show-rate).
//  CASUAL / OPEN-DOOR (cookouts, BBQ, block parties): the "20% rule" — expect ≥~80% of
//    invited, plus plus-ones/walk-ins common (BBQ/party-planning guidance).
//  RSVP'D MILESTONES (showers, birthdays, dinners): cluster ~70–85% of invited.
//  FORMAL (weddings, galas, paid/registered): weddings ~83% attend / ~17% decline;
//    paid events 90–97% attend; in-person events average ~68% (RSVPify; nunify 2025–26).
//  FREE / OPEN-INVITE: 40–60% no-show — the widest, least predictable (Glue Up; oniva).
export const ATTENDANCE_SOURCES = [
  { label: 'OMG Hitched — what % of RSVPs actually show up (general)', url: 'https://omghitched.com/what-percentage-of-rsvps-actually-show-up/' },
  { label: 'After Work Wonders — % of invited guests who attend a party', url: 'https://afterworkwonders.com/what-percentage-of-invited-guests-attend-a-party' },
  { label: 'No Limits — event show-rate (the 60% rule)', url: 'https://nolimitsowasso.com/show-rate/' },
  { label: 'BBQ Party Calculator — casual cookout planning buffers', url: 'https://www.onlycalculators.com/food/party/bbq-party-calculator/' },
  { label: 'RSVPify — wedding guest-list attendance', url: 'https://rsvpify.com/percent-of-guest-list-expected-to-come-wedding/' },
  { label: 'Glue Up — RSVP no-show rates (free vs paid)', url: 'https://www.glueup.com/blog/fix-high-event-rsvp-no-show-rate' },
  { label: 'nunify — in-person attendance benchmarks 2025–26', url: 'https://www.nunify.com/blogs/event-attendance-rate' },
];

// class → expected band as a FRACTION of the host's planned/expected count, + a plain
// "what to expect" note. low = realistic floor (no-shows), high = realistic ceiling to
// SIZE to so you don't run short (no-shows recovered + plus-ones/walk-ins).
const CLASS = {
  formal:         { low: 0.90, high: 1.00, note: 'usually ~5–10% no-shows, walk-ins rare.' },
  rsvp_social:    { low: 0.85, high: 1.05, note: 'usually ~10–15% no-shows, a few plus-ones.' },
  casual_open:    { low: 0.80, high: 1.15, note: 'some no-shows, some plus-ones and walk-ins.' },
  community_free: { low: 0.55, high: 1.10, note: 'open-invite turnout swings wide.' },
};

// Type → class. Keyword-matched, with a sensible middle default. A playbook can override
// via meta.attendanceClass (one of the CLASS keys) or meta.attendanceFactors {low,high}.
const KEY = [
  [/wedding|quincea|vow ?renewal|gala|board meeting|conference|retirement|funeral|memorial/i, 'formal'],
  [/cookout|bbq|barbecue|\bboil\b|fish fry|crab|crawfish|day party|block party|housewarming|watch party|reunion|repast|kwanzaa|pupusa|picnic|tailgate|fest/i, 'casual_open'],
  [/dinner|shower|gender reveal|birthday|sweet ?16|graduation|holiday party|bachelor|bachelorette|engagement|anniversary|coffee ceremony|card party|proposal|elopement|brunch|game night/i, 'rsvp_social'],
];

export function attendanceClass(type, playbook) {
  const override = playbook && playbook.meta && playbook.meta.attendanceClass;
  if (override && CLASS[override]) return override;
  const t = String(type || '');
  for (const [re, cls] of KEY) if (re.test(t)) return cls;
  return 'rsvp_social';
}

// attendanceShift(type, playbook) → { class, low, high, note }. The low/high are
// fractions of the planned count; multiply the host's number by them for the band.
export function attendanceShift(type, playbook) {
  const cls = attendanceClass(type, playbook);
  const base = CLASS[cls];
  const f = playbook && playbook.meta && playbook.meta.attendanceFactors;
  const low = f && Number(f.low) > 0 ? Number(f.low) : base.low;
  const high = f && Number(f.high) > 0 ? Number(f.high) : base.high;
  return { class: cls, low, high, note: base.note };
}

// expectedFromPlanned(n, type, playbook) → { low, high, planning, note, class } — the
// expected attendance band around a planned count `n`. planning = the high (size to it
// so you won't run short). Returns null for a non-positive count.
export function expectedFromPlanned(n, type, playbook) {
  const planned = Math.max(0, Math.round(Number(n) || 0));
  if (planned <= 0) return null;
  const sh = attendanceShift(type, playbook);
  const low = Math.round(planned * sh.low);
  const high = Math.round(planned * sh.high);
  return { planned, low, high, planning: high, note: sh.note, class: sh.class };
}
