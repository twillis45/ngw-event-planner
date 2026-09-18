// ─── Money-engine provenance ─────────────────────────────────────────────────
//
// WHY THIS FILE EXISTS
// --------------------
// This product already built a real grounding system and pointed it at the
// grocery list. `knowledge/costProvenance.js` holds 297 dated, named, URL'd,
// class-tagged sources, and `isGroundedCost` is a registry-CHECKED predicate:
// tier must be 'researched' AND every cited source id must resolve. 532 of 622
// priced food lines pass it. That is the standard, and this file is its
// analogue for the other half of the money engine.
//
// The numbers a host sees FIRST and LARGEST were outside that system, and the
// reason was structural: the per-head bands, the category shares, the date and
// time premiums, the metro index, the rush premium and the sourcing tiers had
// NO PROVENANCE FIELD IN THEIR SHAPE AT ALL. There was nothing to fill in even
// if someone wanted to, and nothing a surface could ask before rendering a
// figure bare. A comment reading "Reflect commonly cited US bands" is not a
// citation, and the estimator's mid renders as a big number with a one-tap
// "Use $X" chip.
//
// WHAT THIS FILE IS AND IS NOT
// ----------------------------
// It is the FIELD and the HONESTY MARKER. It is NOT a set of new citations.
// Nothing here was researched in order to write it, so nothing here is marked
// 'researched'. Attaching sources we cannot stand behind would be exactly the
// fake grounding `06_AI_GROUNDING_NO_FAKE_INTELLIGENCE.md` forbids, and it
// would be worse than the current honest silence: a reader can see through
// silence and cannot see through a fabricated citation.
//
// So, measured and stated plainly: as of the date in MONEY_PROVENANCE_META,
// ZERO of the constants registered below pass `isGroundedMoneyFactor`. Every
// surface that renders any of them MUST mark the figure as an estimate. That
// is the finding, not a defect in this file.
//
// WHY IT LIVES IN budgetEstimator/
// --------------------------------
// The food corpus keeps its registry in `knowledge/`. This one sits with the
// budget estimator because that is where the largest cluster of the affected
// constants lives, and because `estimatorFactors`, `vendorEstimator` and
// `sourcing` can all import from a sibling directory without a cycle. The
// import direction is one-way: those files import FROM here, and this file
// imports nothing from them, so the provenance records can name constants by
// string key without dragging the math into a circular graph.
//
// RUNTIME IMPACT: none. No function in this file is called by any math path.
// It is metadata plus two pure predicates. No dollar figure moves.

export const MONEY_PROVENANCE_META = {
  version: '1.0.0',
  registeredAt: '2026-09-18',
  reviewCadence: 'yearly',
  // The honest headline, kept in the data so a console or a test can read it
  // rather than trusting a comment.
  groundedCount: 0,
  note: 'Shape only. No constant registered here is researched; every one must be presented marked.',
};

// ─── Source registry ────────────────────────────────────────────────────────
//
// Same field vocabulary as COST_SOURCES / QTY_SOURCES so a future researcher
// can move an entry between registries without reshaping it: `org` (named
// publisher), `url`, a date, `sourceClass`, and the `claim` the source
// actually makes.
//
// This registry is DELIBERATELY NEARLY EMPTY. It holds the one citation the
// repo already recorded for a constant in these files — nothing was added to
// make the registry look fuller. `recordedAt` is the git date the citation
// entered the repo, not a fetch date, because no one re-fetched it to write
// this; that distinction is kept in the field name rather than smoothed over.
export const MONEY_SOURCES = {
  'consumer-reports-supermarkets-2026': {
    org: 'Consumer Reports, "The Most and Least Expensive Supermarkets"',
    url: 'https://www.consumerreports.org/money/prices-price-comparison/most-and-least-expensive-supermarkets-a3157951568/',
    recordedAt: '2026-08-21',
    sourceClass: 'independent',
    claim: 'Costco runs about 21% cheaper overall than the average supermarket across a comparable basket.',
    limitations: [
      'recorded_in_repo_not_refetched',
      'states_a_whole_basket_figure_not_a_per_category_one',
    ],
  },
};

// ─── Tier vocabulary ────────────────────────────────────────────────────────
//
// Reuses the words already in this repo's provenance vocabulary ('researched',
// 'estimate', 'trade-heuristic') and adds one — 'editorial' — for the case the
// existing words could not say honestly: a number we CHOSE as a product
// guardrail or buffer, which is not a measurement of the market at all. The
// crab_size note already used the word ("this ratio is therefore an editorial
// blend, not a derivation"); this promotes it to a tier so the claim is
// machine-readable instead of buried in prose.
//
// `grounded` is the single bit the predicate reads. Only 'researched' is true,
// and 'researched' additionally requires resolvable sources — a tier alone
// never grounds anything.
export const MONEY_TIERS = {
  researched: {
    grounded: true,
    label: 'Researched',
    means: 'A named, dated, URL-bearing source in MONEY_SOURCES states this figure.',
  },
  editorial: {
    grounded: false,
    label: 'Our own choice',
    means: 'A guardrail, cap or buffer this product chose. Not a measurement of the market. May be informed by a source without reproducing its figure.',
  },
  'trade-heuristic': {
    grounded: false,
    label: 'Trade convention',
    means: 'A convention the trade is understood to follow. No publisher, date or URL is recorded here for it, so it cannot be checked.',
  },
  estimate: {
    grounded: false,
    label: 'Planning estimate',
    means: 'A planning figure with no recorded source of any kind.',
  },
};

// ─── The predicate ──────────────────────────────────────────────────────────
//
// Deliberately identical in structure to `isGroundedCost` (costProvenance.js)
// and `isGroundedItemQty` (quantityProvenance.js): tier:'researched' AND at
// least one source id AND EVERY id resolves in the registry. A sourceless
// 'researched' claim does not ground, and one bad id in a list of good ones
// fails the whole record — the same rule the food corpus enforces, because a
// list a reader cannot fully follow is not a citation.
export function isGroundedMoneyFactor(prov) {
  return !!(prov && typeof prov === 'object'
    && prov.tier === 'researched'
    && Array.isArray(prov.sources) && prov.sources.length > 0
    && prov.sources.every((s) => !!MONEY_SOURCES[s]));
}

// Resolve a record's cited sources to the real entries, dropping ids that do
// not resolve (mirrors costSourcesFor). A record can cite a source WITHOUT
// being grounded — 'editorial' records do exactly that — so this is a separate
// question from the predicate and must not be used as a stand-in for it.
export function moneySourcesFor(prov) {
  if (!prov || !Array.isArray(prov.sources)) return [];
  return prov.sources.map((s) => MONEY_SOURCES[s]).filter(Boolean);
}

// ─── The records ────────────────────────────────────────────────────────────
//
// One record per constant table, keyed by a stable string the UI can pass
// around. Field vocabulary matches a costFactorProvenance: `tier`,
// `confidence`, `verificationStatus`, `sources`, `claim`, `sufficientWhen`,
// `note`. Added here because these constants are TABLES rather than single
// decisions: `appliesTo` (where the numbers live) and `count` (how many
// numbers the record speaks for, so a census cannot drift from the data).
//
// `hostExplanation: true` marks the constants that ALREADY ship a
// plain-language string to the host on the slot objects themselves. Those
// strings are untouched and stay where they are; this flag only records that
// the host is already being told something, so a surface does not stack a
// second explanation on top of the first.
export const MONEY_PROVENANCE = {
  // ── Budget total ─────────────────────────────────────────────────────────
  'budget.perHeadByType': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 17,
    appliesTo: 'budgetEstimator/totalEstimate.js#PER_HEAD_BY_TYPE',
    claim: 'Per-head planning bands for 17 event types, from $50-180 (Graduation) to $250-600 (Gala).',
    note: 'The only basis ever recorded for these bands is the comment "Reflect commonly cited US bands" — no publisher, no date, no URL, and no record of which bands or who cited them. This table is the largest single input to the number a host is shown first: the estimator mid becomes the proposed budget behind a one-tap chip.',
    sufficientWhen: 'A dated, named, URL-bearing per-head survey (or two corroborating ones) is registered in MONEY_SOURCES and its published bands are reconciled against each of the 17 rows, row by row — a single source covering some rows promotes only those rows.',
  },
  'budget.perHeadByFamily': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 5,
    appliesTo: 'budgetEstimator/totalEstimate.js#PER_HEAD_BY_FAMILY',
    claim: 'Per-head planning bands for 5 budget families, used when a type has no explicit band and no playbook per-guest cost.',
    note: 'Added in Sprint 53 to close a real coverage gap (~19 canonical types were falling to a flat $100-250). Closing a coverage gap with an unsourced band makes the COVERAGE honest, not the NUMBER — and the two were not distinguished at the time. The travel_led row additionally drives the destination blend, so it can raise a band it never priced.',
    sufficientWhen: 'Each family band is reconciled against dated per-head figures for at least two representative types inside that family.',
  },
  'budget.perHeadFallback': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 1,
    appliesTo: 'budgetEstimator/totalEstimate.js#estimateTotalRange (literal { low: 100, high: 250 })',
    claim: 'A final $100-250/head band for any type that resolves to no explicit band, no playbook cost and no family.',
    note: 'MEASURED: THIS BAND IS UNREACHABLE. It fires only when budgetFamilyForType returns nothing, and it never does — eventTaxonomy.mjs#intakeFamilyFor returns \'host_driven\' for any type it cannot resolve, so PER_HEAD_BY_FAMILY always answers first. A sweep of estimateTotalRange across every canonical type plus unresolvable strings emits budget.perHeadByFamily and never this key. Registered anyway, at the floor tier, because an unreachable unsourced constant is still an unsourced constant sitting in the lookup chain: the day someone makes the family resolver strict, this becomes the silent answer.',
    sufficientWhen: 'It should not be promoted; it should be deleted or replaced with a refusal. The honest behaviour for a type the engine cannot place is to say it cannot estimate, not to name a dollar band for an event it has never heard of.',
  },
  'budget.playbookPerGuestCost': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 1,
    appliesTo: 'budgetEstimator/totalEstimate.js#playbookPerHead (reads playbooks/data/*.js meta.perGuestCost)',
    claim: 'A type\'s own authored per-guest cost band, used when PER_HEAD_BY_TYPE has no entry for it.',
    note: 'REGISTERED AT THE FLOOR ON PURPOSE. This band is authored on the playbook, not here, and the playbook knowledge system has its own provenance machinery (knowledge/costProvenance.js and friends) that this registry cannot read and must not speak for. Rather than omit it — which would let a figure reach a surface with no record at all — it is registered at the weakest tier with empty sources. That is conservative, not a verdict on the playbook: several of these bands may well be better grounded than anything else in this file. Promotion means teaching this record to defer to the playbook\'s own provenance, not raising the tier here.',
    sufficientWhen: 'A resolver reads the originating playbook\'s provenance for meta.perGuestCost and this record defers to it per type, so a well-sourced playbook band is not held down by a registry that never looked.',
  },
  'budget.categoryShares': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 29,
    appliesTo: 'budgetEstimator/categoryShares.js#WEDDING_SHARES / CORPORATE_SHARES / PRIVATE_SHARES / FALLBACK_SHARES',
    claim: '29 min/max share bands across 4 tables, splitting a total budget into per-category dollar ranges.',
    note: 'Recorded basis: "Numbers reflect commonly-cited US event planning bands" — the same uncheckable formula as the per-head table. The wedding split most resembles a widely published trade convention, but no publisher is named here, so it is registered as an estimate rather than a trade-heuristic: naming a convention we cannot point at would be a citation-shaped claim with nothing behind it. These shares also re-enter the total via the nights term, which multiplies the catering share.',
    sufficientWhen: 'Each table is reconciled against a dated, named budget-allocation study for that event family; per-table promotion, not all-or-nothing.',
  },

  // ── Date, time and invoice factors ───────────────────────────────────────
  'factors.usHolidays': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 8,
    appliesTo: 'estimatorFactors.js#US_HOLIDAYS',
    claim: '8 holiday-date premiums from +15% (Valentine\'s Day, Thanksgiving weekend) to +30% (New Year\'s Eve).',
    note: 'The DATE RULES are checkable arithmetic (last Monday of May, fourth Thursday of November) and are not in question. The PREMIUMS are not: no source records that a New Year\'s Eve event costs 30% more, or that it costs twice what Valentine\'s Day costs. The premium and the calendar rule live in one object and should not inherit each other\'s credibility.',
    sufficientWhen: 'A dated vendor- or venue-pricing survey reports holiday-date premiums by holiday. Absent that, the honest alternative is a single flag ("high-demand date") with no multiplier.',
    hostExplanation: true,
  },
  'factors.dowPremium': {
    tier: 'trade-heuristic',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 7,
    appliesTo: 'estimatorFactors.js#DOW_PREMIUM (7 rows, 2 non-zero: Friday +10%, Saturday +20%)',
    claim: 'Saturday carries a +20% and Friday a +10% planning premium; Sunday through Thursday carry none.',
    note: 'Registered as trade-heuristic rather than estimate because the DIRECTION is a convention the code states out loud to the host ("Saturdays book up faster — vendors and venues commonly charge more") and is not seriously disputed. The MAGNITUDES have no recorded source, and the Sunday-equals-Wednesday row is itself a claim: it asserts a Sunday carries no premium at all.',
    sufficientWhen: 'A dated venue- or vendor-rate card survey publishes day-of-week differentials. Two corroborating ones would also settle whether Sunday belongs at zero.',
    hostExplanation: true,
  },
  'factors.peakWeddingSeason': {
    tier: 'trade-heuristic',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 2,
    appliesTo: 'estimatorFactors.js#isPeakWeddingSeason (May-Oct month set) + the +15% season premium in getDatePremium',
    claim: 'May through October are peak wedding-demand months in most US markets, worth a +15% planning premium for wedding-family types.',
    note: 'The SEASON is a well-attested trade convention. The +15% is not sourced, and the month set is stated as "most US markets" — a hedge the code makes honestly and this record keeps rather than launders. Applies only to the 5 wedding-family types.',
    sufficientWhen: 'A dated wedding-industry report publishes month-by-month demand or price indices; the same source would also test whether the band is really six months everywhere.',
    hostExplanation: true,
  },
  'factors.datePremiumCap': {
    tier: 'editorial',
    confidence: 'medium',
    verificationStatus: 'unverified',
    sources: [],
    count: 1,
    appliesTo: 'estimatorFactors.js#DATE_PREMIUM_CAP (0.45)',
    claim: 'The stacked date premium is capped at +45% so an evening Saturday in peak season on a holiday weekend cannot compound without limit.',
    note: 'Correctly tiered editorial by the code\'s own words: "45% feels honest as a \'this is a high-demand date\' ceiling without pretending we modeled every contract." That is a product judgement, stated as one, and it is the right call — a cap makes the estimate MORE honest, not less. It is registered here so nobody later mistakes it for a measured ceiling. Confidence is medium rather than low because a guardrail only has to be defensible, not accurate.',
    sufficientWhen: 'Never promoted to researched. A cap is a choice; the honest improvement is that the surface discloses the cap fired, which getDatePremium already reports via cappedAtCap.',
    hostExplanation: true,
  },
  'factors.timeOfDay': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 4,
    appliesTo: 'estimatorFactors.js#TIME_OF_DAY_SLOTS (0.85 / 1.00 / 1.10 / 1.25)',
    claim: 'Morning runs 15% under an afternoon baseline; evening 10% over; late-night 25% over.',
    note: 'Each slot already ships the host a real, plausible reason (extended staffing, lighting, bar service, overtime, transport). Those reasons are sound; the multipliers attached to them are not sourced. A good explanation next to an unsourced number is the most persuasive form this problem takes, which is why the slot keeps its explanation and gains this marker rather than trading one for the other.',
    sufficientWhen: 'Dated catering or staffing rate data prices a morning, evening and late-night event of comparable scope.',
    hostExplanation: true,
  },
  'factors.serviceCharge': {
    tier: 'trade-heuristic',
    confidence: 'medium',
    verificationStatus: 'unverified',
    sources: [],
    count: 1,
    appliesTo: 'estimatorFactors.js#SERVICE_CHARGE_DEFAULT (0.20)',
    claim: 'A 20% service charge is a common US catering norm.',
    note: 'A 20% service charge is a widely stated convention and the code calls it a norm rather than a rate. No publisher is recorded. Note the real-world consequence of the shape: this default can be REPLACED by a studio-set rate at runtime, and getServiceTaxFactor already reports source:\'studio\'|\'mixed\'|\'default\' — so a surface can tell a host-supplied rate from this heuristic. Confidence is medium on that strength, not on any citation.',
    sufficientWhen: 'A dated catering-industry survey publishes prevailing service-charge rates. Until then the studio-override path, not a better guess, is the honest answer.',
    hostExplanation: true,
  },
  'factors.tax': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 1,
    appliesTo: 'estimatorFactors.js#TAX_DEFAULT (0.06)',
    claim: 'A 6% baseline tax rate, applied on the subtotal-plus-service bundle.',
    note: 'The weakest constant in estimatorFactors and the code says so in four words: "varies wildly by state". It is not a jurisdiction rate and cannot become one — US sales-tax treatment of catering and service charges differs by state, by locality and by whether service is taxed at all. The honest end state is the studio override or a jurisdiction lookup, never a better national guess.',
    sufficientWhen: 'Not promotable as a national constant. Promotion means replacing it with a jurisdiction-resolved rate that carries its own source.',
    hostExplanation: true,
  },
  'factors.contingency': {
    tier: 'editorial',
    confidence: 'medium',
    verificationStatus: 'unverified',
    sources: [],
    count: 1,
    appliesTo: 'estimatorFactors.js#CONTINGENCY_DEFAULT_RATE (0.10)',
    claim: 'A 10% planning buffer for last-minute changes, delivery fees and small misses.',
    note: 'Editorial and correctly so: a contingency is a buffer this product recommends, not a market measurement, and it is the one factor that defaults OFF (CONTINGENCY_DEFAULT_ON = false) and is opt-in. An opt-in buffer the host chooses to add is the most honest factor in the stack.',
    sufficientWhen: 'Never promoted to researched. A recommended buffer is advice; it should stay opt-in and stay labelled as the product\'s recommendation.',
    hostExplanation: true,
  },

  // ── Vendor factors ───────────────────────────────────────────────────────
  'vendor.metroMarkets': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 29,
    appliesTo: 'vendorEstimator.js#METRO_MARKETS (29 markets, factors 0.80-1.65)',
    claim: 'A 29-market cost index against a US national baseline, from 0.80 (rural / small market) to 1.65 (New York / New Jersey).',
    note: 'The widest-swinging factor in the stack: 0.80 to 1.65 is a 2.06x spread applied to the whole estimate. The code is already honest in prose — "directional planning multipliers against a US national baseline, not a live market feed" — and a prior audit (SPRINT_56B) independently graded this axis C and named its resolution gaps. No source is recorded for any of the 29 factors. Two entries are not market claims at all and should not be read as measurements: \'other\' sits at 1.00 as a no-claim default, and \'rural\' at 0.80 covers every small market in the country with one number.',
    sufficientWhen: 'A dated regional cost-of-services index (or per-market vendor rate data) is registered and reconciled market by market; per-market promotion, since a source covering the top metros says nothing about \'rural\'.',
  },
  'vendor.rushFactor': {
    tier: 'trade-heuristic',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 3,
    appliesTo: 'vendorEstimator.js#getRushFactor (1.25 / 1.12 / 1.05 at <30 / <60 / <120 days)',
    claim: 'Short-notice bookings carry a premium: ~25% inside 30 days, ~12% inside 60, ~5% inside 120, none beyond.',
    note: 'READ THIS ONE CLOSELY. Its comment attributes the premiums to "planner surveys + Wedding Wire / The Knot patterns" — it NAMES two publishers but records no dated citation, no URL and no figure from either. That is an uncheckable attribution, and it is the most dangerous form in these files: it reads like a citation to anyone skimming, and it cannot be followed by anyone who tries. It is registered as trade-heuristic with EMPTY sources, and the named publishers are deliberately NOT written into `sources` — an id that does not resolve in MONEY_SOURCES would fail the predicate anyway, and writing them in would dress the record up as cited when nothing was fetched.',
    sufficientWhen: 'Someone fetches an actual dated page from either named publisher (or any other) that states lead-time premiums, registers it in MONEY_SOURCES, and reconciles the three bands against it. Until that happens the attribution in the comment should be read as a memory, not a source.',
    hostExplanation: true,
  },

  // ── Sourcing ─────────────────────────────────────────────────────────────
  'sourcing.tiers': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'unverified',
    sources: [],
    count: 3,
    appliesTo: 'sourcing.js#SOURCING_TIERS (butcher 1.0 / costco 0.85 / grocery 1.18)',
    claim: 'Bulk sourcing re-prices every protein line at 0.85x the butcher baseline; a one-stop grocery run at 1.18x.',
    note: 'MEASURED, not asserted. The file states the grocery premium is "honestly backed by the raw per-channel data below" — CANONICAL_PROTEIN_PRICES, 10 proteins with real per-channel ranges and URLs. Computing the channel ratios from that table across all 10 proteins (midpoint to midpoint) gives a mean costco ratio of 0.706 and a mean grocery ratio of 1.064. The shipped factors are 0.85 and 1.18. So the table corroborates the DIRECTION of both factors and neither MAGNITUDE: the shipped costco factor is ~20% less generous than its own data and the shipped grocery premium ~11% steeper. The claim of backing was made in good faith and is directionally true; it does not survive arithmetic, and these factors re-price every protein line in the app.',
    sufficientWhen: 'Either the factors are derived from CANONICAL_PROTEIN_PRICES (making them arithmetic over already-sourced data, promotable once that table\'s own URLs are registered here), or a dated channel-price comparison is registered and the factors reconciled to it.',
    hostExplanation: true,
  },
  'sourcing.nonProteinChannel': {
    tier: 'editorial',
    confidence: 'medium',
    verificationStatus: 'unverified',
    sources: ['consumer-reports-supermarkets-2026'],
    count: 3,
    appliesTo: 'sourcing.js#NONPROTEIN_CHANNEL_FACTOR (butcher 1.0 / costco 0.90 / grocery 1.0)',
    claim: 'Non-protein groceries run ~10% cheaper through the bulk channel; the butcher and grocery channels do not move them.',
    note: 'The ONLY constant in these files that cites a real, named, dated, URL-bearing source — and it is still not grounded, on purpose. Consumer Reports states ~21% overall; this ships 10%, a deliberate conservative haircut the code explains (produce and dairy savings are modest and waste-prone). A record that cites a source but does not reproduce its figure is editorial, not researched, and `isGroundedMoneyFactor` returns false for it. That gap is the whole reason the predicate checks the tier AND the sources instead of just asking whether a citation exists.',
    sufficientWhen: 'A dated source prices the non-protein basket specifically (produce, dairy, staples) through the bulk channel, and the factor is reconciled to it. Reproducing the Consumer Reports 21% would also qualify — but would be a worse estimate, which is why it was not done.',
  },
};

// Look a record up by key. Returns null for an unknown key rather than an empty
// object, so a caller cannot mistake "no such constant" for "no provenance".
export function moneyProvenanceFor(key) {
  return Object.prototype.hasOwnProperty.call(MONEY_PROVENANCE, key)
    ? MONEY_PROVENANCE[key]
    : null;
}

// ─── What a surface asks before it renders a figure ─────────────────────────
//
// A displayed figure is usually composed from SEVERAL of these constants (the
// budget total multiplies a per-head band by a date premium by a time-of-day
// factor...). One ungrounded input makes the whole composite ungrounded, the
// same way one unresolvable source id fails a food line. So the surface passes
// every contributing key and gets one answer back.
//
// Returns:
//   grounded     — true only when EVERY contributing key is grounded. Today: never.
//   mustMark     — !grounded. The figure may not be rendered bare.
//   marker       — the suffix to render ('est.'), or null when grounded.
//   label        — the weakest contributing tier's host-facing label.
//   tiers        — distinct contributing tiers, weakest first.
//   contributors — [{ key, tier, grounded, claim, note, count, appliesTo }], weakest first.
//   ungrounded   — the subset that fails the predicate (today: all of them).
//   sources      — resolved MONEY_SOURCES entries across all contributors, deduped.
//   unknownKeys  — keys with no record. A surface that gets a non-empty array here
//                  is composing a figure from something unregistered and must
//                  treat the result as ungrounded, which this function does.
//
// Weakest-first ordering is by TIER_RANK below, so a surface that wants one
// word can take contributors[0] without re-deriving the ranking.
const TIER_RANK = { estimate: 0, 'trade-heuristic': 1, editorial: 2, researched: 3 };
const rankOf = (tier) => (TIER_RANK[tier] === undefined ? -1 : TIER_RANK[tier]);

export function moneyDisclosure(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  const unknownKeys = [];
  const contributors = [];

  for (const key of list) {
    const prov = moneyProvenanceFor(key);
    if (!prov) { unknownKeys.push(key); continue; }
    contributors.push({
      key,
      tier: prov.tier,
      grounded: isGroundedMoneyFactor(prov),
      claim: prov.claim,
      note: prov.note,
      count: prov.count,
      appliesTo: prov.appliesTo,
      hostExplanation: !!prov.hostExplanation,
    });
  }

  contributors.sort((a, b) => rankOf(a.tier) - rankOf(b.tier));

  // An empty ask is NOT grounded. A surface that passes nothing has told us
  // nothing, and "nothing to check" must never read as "checked and clean".
  const grounded = contributors.length > 0
    && unknownKeys.length === 0
    && contributors.every((c) => c.grounded);

  const sources = [];
  const seen = new Set();
  for (const key of list) {
    for (const src of moneySourcesFor(moneyProvenanceFor(key))) {
      if (seen.has(src.url)) continue;
      seen.add(src.url);
      sources.push(src);
    }
  }

  const weakest = contributors[0] || null;
  const tiers = [];
  for (const c of contributors) if (!tiers.includes(c.tier)) tiers.push(c.tier);

  return {
    grounded,
    mustMark: !grounded,
    marker: grounded ? null : 'est.',
    label: weakest && MONEY_TIERS[weakest.tier] ? MONEY_TIERS[weakest.tier].label : 'Planning estimate',
    tiers,
    contributors,
    ungrounded: contributors.filter((c) => !c.grounded),
    sources,
    unknownKeys,
  };
}

// The two composites named in the money-engine audit, so a surface does not
// have to reassemble the key list by reading the math.
//
// BUDGET: the keys estimateTotalRange can touch. The live call reports the
// keys it ACTUALLY used on its result (`provenanceKeys`) — prefer that; this
// constant is the superset, for a surface describing the estimator in general.
export const BUDGET_TOTAL_FACTOR_KEYS = [
  'budget.perHeadByType',
  'budget.playbookPerGuestCost',
  'budget.perHeadByFamily',
  'budget.perHeadFallback',
  'budget.categoryShares',
  'factors.timeOfDay',
  'factors.usHolidays',
  'factors.dowPremium',
  'factors.peakWeddingSeason',
  'factors.datePremiumCap',
  'vendor.metroMarkets',
];

// VENDOR: only the factors these files own. The BASE cost range a vendor row
// starts from is authored in the playbook and carries the playbook's own
// provenance, which this module cannot speak for and does not claim to — a
// vendor row is therefore ungrounded even if every key here were grounded,
// until the base range answers for itself too.
export const VENDOR_RANGE_FACTOR_KEYS = [
  'vendor.metroMarkets',
  'vendor.rushFactor',
];
