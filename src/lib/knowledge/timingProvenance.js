// demo/src/lib/knowledge/timingProvenance.js
//
// Wave-2c-2 GROUNDING — source the per-decision `when` deadlines.
//
// The Grounding re-score (2/10, the floor) found "0 of 215 decisions carry grounded
// timingProvenance, yet all 215 `when` deadlines drive the entire sequencing engine —
// every deadline is an ungrounded guess." Wave-2c-1 grounded the STANDARD_LEAD fallback;
// this grounds the DECISION deadlines themselves.
//
// APPROACH — centralized, honest, conservative. Rather than hand-author 215 provenance
// blobs (toil + drift), a resolver maps a decision's semantic CATEGORY (booking a venue,
// sending invitations, locking the headcount, reserving rentals…) to a REAL, dated 2026
// source whose claim genuinely applies to that decision's timing. It grounds ONLY when
// the category confidently matches — an event-specific call (crab size, steam-vs-order,
// tribute format, theme) matches nothing and stays honestly `synthesized`. False
// negatives (a groundable decision left synthesized) are acceptable; a false POSITIVE
// (citing The Knot's 12-month caterer lead for "what sides to serve") is not, so the
// patterns are deliberately narrow. This mirrors the cost-provenance discipline already
// in the codebase: researched with dated sources, or honestly labeled a heuristic.

// Real, dated sources (fetched 2026-07-15). Shared with STANDARD_LEAD_SOURCES in spirit;
// kept here so the decision-timing registry is self-contained and auditable.
export const TIMING_SOURCES = {
  'theknot-vendors': {
    url: 'https://www.theknot.com/content/when-to-book-wedding-vendors',
    fetched: '2026-07-15',
    claim: 'Venue and caterer book 12–18 months out; band/DJ and florist 9–12 months.',
  },
  'theknot-headcount': {
    url: 'https://www.theknot.com/content/when-should-we-give-the-wedding-caterer-our-head-count',
    fetched: '2026-07-15',
    claim: 'Caterers/venues need a final headcount 7–14 days before the event (occasionally up to 30); set the RSVP deadline 3–4 weeks out so there is time to chase non-responders.',
  },
  'paperlesspost-invites': {
    url: 'https://www.paperlesspost.com/blog/when-to-send-party-invitations/',
    fetched: '2026-07-15',
    claim: 'Casual/dinner party invitations 2–4 weeks ahead; formal 8+ weeks; milestone birthdays 4–5 weeks; save-the-dates 6–9 months; RSVP 1–4 weeks before.',
  },
  'stuart-rentals': {
    url: 'https://www.stuartrental.com/event-planning/how-far-in-advance-reserve-party-rentals/',
    fetched: '2026-07-15',
    claim: 'Reserve party rentals (tables, chairs, tents, linens) ~3–4 months out for standard items; 6–12 months for large/peak-season; a few weeks is fine for a small backyard party.',
  },
  'sweetery-cake': {
    url: 'https://thesweetery.com/2026/04/15/how-far-in-advance-should-you-order-a-custom-cake/',
    fetched: '2026-07-15',
    claim: 'Order a custom party/birthday cake ~2–3 weeks ahead (simple designs 3–5 days); a wedding or tiered cake 6–8 weeks, more in busy holiday season.',
  },
  'partyguides-venue': {
    url: 'https://partygeniusai.com/birthday-party-planning-timeline',
    fetched: '2026-07-15',
    claim: 'Book a weekend party venue / event space 2–3 months ahead; restaurants and event rooms 6–8 weeks out.',
  },
};

// Category → grounding. `pattern` matches the decision's id + label; `antiPattern`
// vetoes a false match; `leadDays: [min, max]` is the lead window the SOURCE actually
// supports — a decision only grounds if its own `when` deadline falls inside it. This
// is the Wave-2c-2.1 fix for the false positives the re-score caught: a T-18d
// "indoor or outdoor" setting call whose id happens to contain "venue" must NOT cite a
// source about booking a wedding venue 12–18 MONTHS out — the number contradicts the
// deadline. The window makes the grounding self-consistent: match the category AND the
// timing, or stay honestly synthesized. Order matters — first confident match wins.
const TIMING_CATEGORIES = [
  {
    category: 'save_the_date',
    pattern: /save.?the.?date/i,
    leadDays: [120, 400], // 6–9 months out
    sources: ['paperlesspost-invites'],
    claim: 'Save-the-dates go out 6–9 months ahead so traveling guests can plan.',
  },
  {
    category: 'invitation',
    pattern: /\binvit|send.*(card|invite)|\brsvp\b.*send|announce the (date|party)/i,
    // veto incidental "share on the invite" mentions on registry/gift/menu decisions —
    // those aren't invitation-SEND timing.
    antiPattern: /head.?count|final count|dietary|allerg|registr|gift|\bmenu\b/i,
    leadDays: [10, 90], // 2–8 weeks (casual → formal/travel)
    sources: ['paperlesspost-invites'],
    claim: 'Invitations go out 2–4 weeks ahead for a casual gathering, 6–8+ weeks when guests travel or the event is formal.',
  },
  {
    category: 'headcount_rsvp',
    pattern: /head.?count|final count|guest count|lock.*(count|guests)|rsvp deadline|confirm.*(numbers|attendance)/i,
    leadDays: [2, 35], // final headcount 7–14d; RSVP deadline 3–4 weeks
    sources: ['theknot-headcount'],
    claim: 'Caterers/venues want a final headcount 7–14 days out; set the RSVP deadline ~3–4 weeks before to leave time to chase replies.',
  },
  {
    category: 'venue',
    // A venue-scale noun. The two GUARDS against false positives are the antiPattern
    // (setting-choice phrases like "indoor or outdoor" whose id merely contains "venue")
    // and the [60,600] lead window (a real venue booking is ≥2 months out; a T-18/T-35
    // setting call can't cite a 2–18-month booking source).
    pattern: /\bvenue\b|reception (hall|site)|banquet hall|event space/i,
    antiPattern: /buy|steam|cater the food|indoor or outdoor|at home or|home vs|backyard or|which room|inside or out/i,
    leadDays: [60, 600], // party space 2–3 months → wedding venue 12–18 months
    sources: ['theknot-vendors', 'partyguides-venue'],
    claim: 'Book the venue early — 2–3 months for a weekend party space, 12–18 months for a wedding-scale venue; it anchors the date and most other vendors.',
  },
  {
    category: 'catering_vendor',
    pattern: /book.*cater|hire.*(cater|chef)|catering (company|service)|full.?service cater/i,
    antiPattern: /menu|dish|what to (serve|order)|potluck/i,
    leadDays: [60, 600], // book a caterer months out; not a T-3w menu lock
    sources: ['theknot-vendors'],
    claim: 'Book a caterer ~12 months out for a large formal event (menus, tastings); sooner is safer in peak season.',
  },
  {
    category: 'rentals',
    pattern: /\brental|rent (tables|chairs|a tent)|\btent\b|tables? (and|&) chairs|linens?|place setting/i,
    leadDays: [10, 200], // small party a few weeks → standard items 3–4 months
    sources: ['stuart-rentals'],
    claim: 'Reserve rentals (tables, chairs, tent, linens) ~3–4 months out for standard items; a few weeks is fine for a small backyard party, longer in peak season.',
  },
  {
    category: 'cake',
    pattern: /\bcake\b|custom cake|dessert table|order.*(cake|dessert)|bakery/i,
    // veto when cake is just one item in a broader menu/catering lock — that decision's
    // timing is the menu, not the cake order.
    antiPattern: /cupcake mix|box cake|bake it yourself|\bmenu\b|catering (order|company)/i,
    leadDays: [3, 90], // party cake 2–3 weeks → wedding/tiered 6–8 weeks
    sources: ['sweetery-cake'],
    claim: 'Order a custom cake ~2–3 weeks ahead for a party (a wedding or tiered cake 6–8 weeks); simple designs need only a few days.',
  },
  {
    category: 'entertainment',
    pattern: /\bdj\b|\bband\b|live music|hire.*(music|entertain)|\bflorist\b|the flowers\b/i,
    antiPattern: /playlist|speaker|spotify|curated/i,
    leadDays: [90, 500], // book a band/DJ/florist 9–12 months out
    sources: ['theknot-vendors'],
    claim: 'Book a band/DJ or florist 9–12 months out for a formal event — the good ones take one booking per date.',
  },
];

// Parse a decision's `when` ('T-Nd') into a lead in days, or null if unparseable.
function parseLeadDays(when) {
  const m = /T-?(\d+)\s*d/i.exec(String(when || ''));
  return m ? Number(m[1]) : null;
}

// Detect a decision's timing category from its id + label (text match only). Returns the
// category object or null. Conservative: an antiPattern hit vetoes the match. This is the
// TEXT gate; resolveTimingProvenance adds the lead-window consistency gate.
export function detectTimingCategory(decision) {
  if (!decision) return null;
  const hay = `${decision.id || ''} ${decision.label || ''}`;
  for (const cat of TIMING_CATEGORIES) {
    if (cat.pattern.test(hay) && !(cat.antiPattern && cat.antiPattern.test(hay))) {
      return cat;
    }
  }
  return null;
}

// resolveTimingProvenance(decision) → a grounded timingProvenance object when the
// decision's category confidently maps to a real source AND the decision's own `when`
// deadline is consistent with the source's supported lead window, else null (caller
// treats a null as still-ungrounded/synthesized — we never fabricate). An authored
// `decision.timingProvenance` always wins (callers check it first).
export function resolveTimingProvenance(decision) {
  const cat = detectTimingCategory(decision);
  if (!cat) return null;
  // Lead-window consistency (Wave-2c-2.1): the source's claim only applies if the
  // decision's deadline is actually in the source's lead range. A T-18d call must not
  // cite a 12–18-month booking source. An unparseable `when` fails closed (no grounding).
  const lead = parseLeadDays(decision.when);
  if (lead === null) return null;
  const [lo, hi] = cat.leadDays;
  if (lead < lo || lead > hi) return null;
  return {
    tier: 'researched',
    verificationStatus: 'researched',
    category: cat.category,
    sources: cat.sources.slice(),
    claim: cat.claim,
    resolvedBy: 'timing-category-resolver',
  };
}

// A resolved/authored timing provenance is GROUNDED only when tier:'researched' AND it
// cites ≥1 real source id that resolves in TIMING_SOURCES (mirrors isGroundedProvenance;
// an empty {} or a sourceless {tier:'researched'} is not grounding).
export function isGroundedTiming(prov) {
  return !!(prov && prov.tier === 'researched'
    && Array.isArray(prov.sources) && prov.sources.length > 0
    && prov.sources.every((s) => !!TIMING_SOURCES[s]));
}

// The effective timing provenance for a decision: an authored one if present and grounded,
// else the resolver's. Returns null when neither grounds it (honestly ungrounded).
export function effectiveTimingProvenance(decision) {
  if (decision && isGroundedTiming(decision.timingProvenance)) return decision.timingProvenance;
  return resolveTimingProvenance(decision);
}
