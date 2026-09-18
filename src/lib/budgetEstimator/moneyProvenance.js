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
  version: '1.1.0',
  registeredAt: '2026-09-18',
  researchedAt: '2026-09-18',
  reviewCadence: 'yearly',
  // The honest headline, kept in the data so a console or a test can read it
  // rather than trusting a comment.
  groundedCount: 1,
  note: 'One research pass done (2026-09-18). 1 of 17 records is researched: factors.serviceCharge. '
      + '8 more now CITE real retrieved sources without being grounded by them — read each note for '
      + 'what the source actually says and how the shipped number differs. Everything else is still '
      + 'unsourced and must be presented marked.',
};

// ─── What the 2026-09-18 research pass found, in one place ──────────────────
//
// Seven pages were retrieved and read (not summarised from search results —
// RESEARCH_DOCTRINE §6). What came back was mostly NOT a confirmation:
//
//   PROMOTED (1)      factors.serviceCharge. Three independently published 2026
//                     pages state 18-22% and use 20% in their worked examples.
//                     The shipped 0.20 is that figure, on that base.
//
//   CONTRADICTED (2)  factors.dowPremium and factors.peakWeddingSeason. The
//                     largest US wedding survey publishes by-day and by-month
//                     spend that is an order of magnitude flatter than the
//                     shipped +20% Saturday and +15% peak premiums. Both stay
//                     ungrounded and BOTH KEEP THEIR SHIPPED NUMBERS — changing
//                     a dollar is a product decision, not a research finding.
//
//   CITED, NOT GROUNDED (6)  perHeadByType, perHeadByFamily, categoryShares,
//                     metroMarkets, rushFactor, peakWeddingSeason. A real source
//                     now sits behind each, saying something adjacent to — never
//                     the same as — what ships. The notes say exactly how far.
//
//   REFUSED           factors.usHolidays, factors.timeOfDay, factors.tax. No
//                     page was found that prices what these constants claim.
//                     Nothing was attached to them rather than attach something
//                     that merely sounds related.
//
// EVERY SOURCE BELOW IS A COMMERCIAL PRACTITIONER OR TRADE BODY. Not one
// independent or government measurement of US event pricing was found. That is
// the single most important limitation of this pass and it is why only the one
// record that a seller is genuinely authoritative about — the fee that seller
// charges — was promoted. `knowledge/commercialSourcePolicy.js` already states
// the rule this pass obeyed: a commercial source may carry `planning_guidance`
// and may NOT alone carry a `measured_finding` or a universal claim.

// ─── Source registry ────────────────────────────────────────────────────────
//
// Same field vocabulary as COST_SOURCES / QTY_SOURCES so a future researcher
// can move an entry between registries without reshaping it: `org` (named
// publisher), `url`, a date, `sourceClass`, and the `claim` the source
// actually makes.
//
// `recordedAt` vs `fetched` is load-bearing and must stay that way:
//   fetched     — THIS registry's author retrieved and read that page on that
//                 date. Every entry added by the 2026-09-18 pass carries it.
//   recordedAt  — the citation was already in the repo and was NOT re-fetched.
//                 One entry (`consumer-reports-supermarkets-2026`) is like this.
//
// `sourceClass` and `claimType` use the vocabulary already defined in
// `knowledge/commercialSourcePolicy.js` so a future move between registries is
// a copy, not a reshape.
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

  // ── THE KNOT REAL WEDDINGS STUDY (retrieved 2026-09-18) ──────────────────
  //
  // READ THE sourceClass BEFORE THE NUMBERS. The Knot Worldwide sells
  // advertising and lead generation to the wedding vendors whose prices this
  // study measures, and the sample is its own logged-in users. That is exactly
  // the shape the brief warned about: "an industry survey by a company that
  // sells leads to vendors is not an independent measurement." It is registered
  // as what it is, and it grounds NOTHING on its own.
  //
  // It is registered anyway because it is the largest published US figure of
  // its kind and because — usefully — it mostly DISAGREES with what we ship.
  // A commercially interested source that happens to undercut our own numbers
  // is not flattering evidence; it is evidence.
  'theknot-realweddings-2026': {
    org: 'The Knot, "This Is the Average Wedding Cost, Backed By Data" (page updated 2026-07-28), reporting The Knot 2026 Real Weddings Study',
    url: 'https://www.theknot.com/content/average-wedding-cost',
    corroboratingUrl: 'https://www.businesswire.com/news/home/20260218045442/en/The-Knot-Worldwide-Unveils-2026-Real-Weddings-Study',
    fetched: '2026-09-18',
    sourceClass: 'commercial_practitioner',
    claimType: 'measured_finding',
    limitations: [
      'commercial_interest_disclosed',
      'self_selected_sample_of_the_publishers_own_users',
      'category_averages_are_conditional_on_hiring_that_vendor_so_they_do_not_sum_to_the_total',
      'reception_venue_average_may_bundle_food_and_beverage_at_all_inclusive_venues',
    ],
    claim: 'The Knot 2026 Real Weddings Study surveyed 10,474 US couples married in 2025. '
         + 'Average wedding cost $34,200; average guest count 117; AVERAGE COST PER GUEST $292 '
         + '(up $8 from 2024); 13 vendors hired on average. By guest band: 1-50 guests $17,100, '
         + '51-100 $27,200, over 100 $43,300. By budget bracket: under $15K averages $8,900, '
         + '$15-40K averages $26,400, over $40K averages $70,300. By quarter: Jan-Mar $33,200, '
         + 'Apr-Jun $34,300, Jul-Sep $35,400, Oct-Dec $33,200. Category averages: reception venue '
         + '$12,900, catering $80 PER PERSON, photographer $3,000, live band $4,500, flowers $2,800, '
         + 'videographer $2,300, DJ $1,800, event rentals $2,000, lighting and decor $1,900, '
         + 'transportation $1,100, planner $2,100, cake $540, favors $480, officiant $260. '
         + 'City averages include New York City $88,000, Chicago $54,000, Boston $51,000, '
         + 'San Francisco $51,000, Los Angeles $45,000, Washington DC $42,000, Philadelphia $40,000, '
         + 'San Diego $38,000, Austin $37,000, Houston $33,000, Dallas $32,000, Charlotte $32,000, '
         + 'Denver $31,000, Seattle $31,000, Nashville $29,000, Phoenix $27,000, Indianapolis $25,000. '
         + 'The press release adds: ~2 million US couples married in 2025, average spend stated there '
         + 'as $34,000, study produced by TKWW\'s Insights & Research Team and fielded annually for '
         + 'nearly 20 years.',
  },
  'theknot-cheapest-days-2025': {
    org: 'The Knot, "Cheapest Months, Days and Seasons to Get Married, Based on Data" (page updated 2025-04-25), reporting The Knot 2025 Real Weddings Study',
    url: 'https://www.theknot.com/content/less-expensive-days-for-weddings',
    fetched: '2026-09-18',
    sourceClass: 'commercial_practitioner',
    claimType: 'measured_finding',
    limitations: [
      'commercial_interest_disclosed',
      'reports_average_TOTAL_SPEND_by_chosen_date_not_the_price_of_a_like_for_like_event',
      'conflates_price_with_selection_couples_who_pick_a_thursday_may_be_buying_a_smaller_wedding',
      'the_pages_own_least_to_most_expensive_day_ordering_contradicts_its_own_figures',
      'one_study_year_older_than_theknot_realweddings_2026',
    ],
    claim: 'Average TOTAL wedding spend by day of week: Thursday $31,100, Wednesday $32,000, '
         + 'Sunday $32,700, Saturday $33,100, Friday $33,200, Monday $33,500, Tuesday $33,900. '
         + '(The page lists these as "least to most expensive" but its own Monday and Tuesday '
         + 'figures exceed its Saturday and Friday figures, so the prose ordering and the numbers '
         + 'do not agree.) By month: January $29,900, December $30,900, November $31,400, '
         + 'August $32,500, March $32,700, April $32,800, February $33,100, June $33,100, '
         + 'September $33,300, October $33,500, July $33,800, May $33,900. By season: '
         + 'Winter (Jan-Mar) $32,000, Fall (Oct-Dec) $32,000, Spring (Apr-Jun) $33,000, '
         + 'Summer (Jul-Sep) $34,000. Only 23% of weddings fell between November and March. '
         + 'The page also notes a December 31 wedding "might not save you money since companies '
         + 'usually have a hard time finding staff willing to work on New Year\'s Eve" — a '
         + 'direction for New Year\'s Eve, with no figure attached.',
  },
  'theknot-wedding-season-2026': {
    org: 'The Knot, "When Is Wedding Season? The Most Popular Wedding Months" (page updated 2026-05-11), reporting The Knot Real Weddings Study',
    url: 'https://www.theknot.com/content/is-there-an-off-season-for-weddings',
    fetched: '2026-09-18',
    sourceClass: 'commercial_practitioner',
    claimType: 'measured_finding',
    limitations: [
      'commercial_interest_disclosed',
      'measures_WHEN_weddings_happen_not_what_they_cost',
      'says_prices_are_typically_higher_in_peak_season_without_publishing_a_figure',
    ],
    claim: '"Peak wedding season spans from May through October" and 76% of US weddings take place '
         + 'in that six-month window. October and June are the most popular months at 16% each, '
         + 'then May 14%, September 13%, August 10%. November through April is the off-season at '
         + '24% of weddings; December is the least popular month at 1%. On price the page says only '
         + 'that "prices are typically higher during this time due to the increase in demand" — it '
         + 'states NO percentage.',
  },

  // ── CATERING SERVICE CHARGE (retrieved 2026-09-18) ───────────────────────
  //
  // Three separately published 2026 pages, from three different positions in
  // the trade, all stating the same band. The third is the interesting one:
  // Chefry is a marketplace whose pitch is that the traditional 18-22% service
  // charge is bad for hosts and that its own flat 5% is better. It has a
  // commercial incentive to make that figure look HIGH, and it reports the same
  // band as an operator-side source telling caterers what to charge. A number
  // that survives being reported by parties with opposite incentives is the
  // closest thing to independence this subject offered.
  'restaurantcalcs-catering-2026': {
    org: 'RestaurantCalcs, "Catering Pricing: Off-Site Event Math (Beyond Food Cost)" by Brock Markarian, founder, former GM (published 2026-06-02)',
    url: 'https://restaurantcalcs.com/blog/catering-pricing-offsite-events/',
    fetched: '2026-09-18',
    sourceClass: 'commercial_practitioner',
    claimType: 'planning_guidance',
    limitations: [
      'commercial_interest_disclosed',
      'supply_side_it_tells_operators_what_to_charge_rather_than_measuring_what_is_charged',
      'states_a_prevailing_practice_not_a_survey',
    ],
    claim: 'The four components of a catering price are the per-head food price (28-35% food-cost '
         + 'target), then "a flat 18-22% mandatory service charge on the per-head subtotal ... It is '
         + 'not a gratuity", then an optional gratuity of 18-22% on top of that, then per-event flat '
         + 'fees. Its worked example applies 20%: a 100-person event at $48 per head is '
         + '"$4,800 + $960" service before setup, delivery, equipment and bartending. '
         + 'Also: catering labor 25-35% of revenue, typical minimum spends of $200-500 drop-off, '
         + '$1,000-2,500 buffet, $1,500-3,000 full service, $3,000-5,000 plated, $5,000-10,000 weddings.',
  },
  'cateringdirectory-perperson-2026': {
    org: 'CateringDirectory.app, "Catering Cost Per Person in 2026: What You\'ll Really Pay" by Lucia Romano, caterer of 18 years (published 2026-06-05)',
    url: 'https://catering-directory.app/articles/catering-cost-per-person-2026',
    fetched: '2026-09-18',
    sourceClass: 'commercial_practitioner',
    claimType: 'planning_guidance',
    limitations: [
      'commercial_interest_disclosed',
      'a_caterer_directory_publishing_about_caterers_it_lists',
      'one_practitioners_observed_ranges_not_a_survey',
    ],
    claim: 'A service charge "of 18 to 22 percent is common and it is not always gratuity", stated '
         + 'twice, and listed as "18 to 22 percent service charge on top" of a food/labor/rentals/bar '
         + 'split. Per person by SERVICE STYLE in mid-size US markets: drop-off $15-30, staffed buffet '
         + '$30-65, food stations $45-90, family style $50-95, plated $60-150+; "big coastal cities run '
         + '25 to 40 percent higher", smaller towns lower. Per person by EVENT TYPE: corporate lunch '
         + '$18-40, corporate dinner or gala $55-130, wedding $50-150+, birthday or private party '
         + '$25-70, holiday office party $35-80. Overall "most events ... land between $20 and $150 a '
         + 'head in 2026, with the typical mid-market event settling in the $40 to $75 range". '
         + 'Also states, without a figure, that "a Saturday in June costs more than a Tuesday in '
         + 'February because demand is real and my best staff get booked", and that smaller events '
         + 'cost MORE per head because fixed costs spread across fewer guests until roughly 75-100.',
  },
  'chefry-catering-2026': {
    org: 'Chefry, "How Much Does Catering Cost? Per-Person Pricing by Event (2026)" (published 2026-06-01)',
    url: 'https://www.chefry.io/blog/catering-cost-guide',
    fetched: '2026-09-18',
    sourceClass: 'commercial_practitioner',
    claimType: 'planning_guidance',
    limitations: [
      'commercial_interest_disclosed',
      'argues_AGAINST_the_18_22_percent_practice_while_reporting_it_so_its_incentive_runs_toward_a_higher_figure_not_a_lower_one',
      'marketplace_pitching_its_own_flat_5_percent_fee_as_the_alternative',
    ],
    claim: '"Most traditional caterers tack on a \'service charge\' of 18-22% of the food total, and '
         + '... that service charge usually is not the tip." Its worked example uses 20%: '
         + '"Food: 50 x $40 = $2,000, + 20% service charge = +$400", which with delivery, rentals and '
         + 'a suggested 18% gratuity turns a $2,000 headline into ~$3,363, a 68% jump. Per person by '
         + 'style: drop-off $15-30, buffet $25-55, family-style $35-70, plated $50-120, '
         + 'stations/premium $90-150+. By event: birthday $20-45, graduation $20-40, baby or bridal '
         + 'shower $25-50, quinceanera $30-60, cookout $18-38, corporate lunch $22-45, wedding $60-150+. '
         + 'Lists "Saturdays, holidays, and peak wedding months carry premiums" as a price driver, '
         + 'with no figure.',
  },

  // ── LEAD TIME AND DAY OF WEEK (retrieved 2026-09-18) ─────────────────────
  'wpic-rushfees-2026': {
    org: 'Wedding Planners Institute of Canada, "Rush Fees: What You Should Be Charging and Why" by Danielle Andrews, President and Co-Founder (published 2026-05-07)',
    url: 'https://wpic.ca/pricing-for-services/wedding-planner-rush-fees-pricing/',
    fetched: '2026-09-18',
    sourceClass: 'trade_association',
    claimType: 'planning_guidance',
    limitations: [
      'commercial_interest_disclosed',
      'ADVOCACY_it_tells_members_to_charge_more_its_thesis_is_literally_if_youre_not_charging_rush_fees_youre_leaving_money_on_the_table',
      'prices_the_PLANNERS_FEE_only_not_the_whole_event_or_a_vendor_cost_range',
      'canadian_trade_body_not_a_us_measurement',
    ],
    claim: 'A recommended rush-fee structure for wedding planners, applied to the PLANNING FEE: '
         + '"6 months or less: +10% to 15%"; "3 months or less: +20% to 30%"; '
         + '"8 weeks or less: +30% to 50% (or more, depending on scope)". A flat alternative of '
         + '$500-1,500 for moderate urgency or $2,000+ for extreme timelines. The article is explicit '
         + 'that this is what planners SHOULD charge, not what the market was measured to charge.',
  },
  'grandlady-dayofweek-2026': {
    org: 'The Grand Lady (an Austin, Texas wedding venue), "Friday vs Saturday vs Sunday weddings in Austin", written by co-owner Katie West (published 2026-07-01)',
    url: 'https://grandladyaustin.com/friday-saturday-sunday-weddings-austin/',
    fetched: '2026-09-18',
    sourceClass: 'commercial_practitioner',
    claimType: 'planning_guidance',
    limitations: [
      'commercial_interest_disclosed',
      'ONE_venue_in_ONE_market_it_is_a_rate_card_not_a_survey',
      'prices_VENUE_RENTAL_ONLY_not_a_whole_event_so_it_cannot_be_read_as_a_whole_estimate_multiplier',
      'ranges_span_season_so_the_across_day_comparison_mixes_seasons',
    ],
    claim: 'The venue\'s own published 2026 rates, all "varying by season": Saturday $7,500-14,500; '
         + 'Friday $6,500-10,500; Sunday $5,500-8,000; weekday (Mon-Thu) $4,000-5,000, or $8,000 on a '
         + 'holiday weekend. States peak-season Saturdays at most Austin venues book 14-18 months out, '
         + 'and that Sunday is "one of our most consistently booked days" rather than a dead day.',
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
    verificationStatus: 'partially-corroborated',
    sources: ['theknot-realweddings-2026'],
    count: 17,
    appliesTo: 'budgetEstimator/totalEstimate.js#PER_HEAD_BY_TYPE',
    claim: 'Per-head planning bands for 17 event types, from $50-180 (Graduation) to $250-600 (Gala).',
    note: 'RESEARCHED 2026-09-18. ONE of the 17 rows now has a source and it does not promote the '
        + 'record. The Knot 2026 Real Weddings Study (10,474 US couples married in 2025) publishes an '
        + 'average cost per wedding guest of $292. The shipped Wedding row is $200-500, so the survey '
        + 'mean falls INSIDE our band, at about the 31st percentile of its width — but the band\'s '
        + 'MIDPOINT is $350, which is 19.9% ABOVE the published mean. A band containing a mean is not '
        + 'the same claim as a band, and a source that publishes one number cannot ground two. '
        + 'DIVERGENCE FLAGGED, NOT ACTED ON: the shipped $200-500 is unchanged, because moving the '
        + 'number a host is shown first is a product decision. '
        + 'THE OTHER 16 ROWS HAVE NOTHING. Gala, Conference, Quinceanera, Sweet 16, Baby Shower, '
        + 'Reunion, Graduation and the rest were searched and no dated per-head figure for them was '
        + 'found. What WAS found was catering-only per-person pricing (see the three catering sources) '
        + 'and it is deliberately NOT cited here: those price the FOOD, this table prices the WHOLE '
        + 'EVENT per head, and reading a $25-70 birthday catering figure against a $60-250 whole-event '
        + 'band is the unit slip RESEARCH_DOCTRINE exists to prevent. '
        + 'Note also what the citation is worth: The Knot sells leads to the vendors it surveys and '
        + 'surveys its own users. It is registered as commercial_practitioner for that reason.',
    sufficientWhen: 'A dated, named, URL-bearing per-head survey (or two corroborating ones) is registered in MONEY_SOURCES and its published bands are reconciled against each of the 17 rows, row by row — a single source covering some rows promotes only those rows. Since only the Wedding row has any source at all, promotion realistically means splitting this record per row so 16 unsourced rows stop hiding behind one that is half-checked.',
  },
  'budget.perHeadByFamily': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'partially-corroborated',
    sources: ['theknot-realweddings-2026'],
    count: 5,
    appliesTo: 'budgetEstimator/totalEstimate.js#PER_HEAD_BY_FAMILY',
    claim: 'Per-head planning bands for 5 budget families, used when a type has no explicit band and no playbook per-guest cost.',
    note: 'Added in Sprint 53 to close a real coverage gap (~19 canonical types were falling to a flat $100-250). Closing a coverage gap with an unsourced band makes the COVERAGE honest, not the NUMBER — and the two were not distinguished at the time. The travel_led row additionally drives the destination blend, so it can raise a band it never priced. '
        + 'RESEARCHED 2026-09-18, one row touched. `full_service` is $200-500, the same band as the '
        + 'Wedding row, and The Knot 2026 per-guest mean of $292 sits inside it exactly as it does '
        + 'there — same evidence, same 19.9% gap to our midpoint, same refusal to move a dollar. '
        + '`home_hosted`, `host_driven`, `corporate` and `travel_led` have NOTHING: no dated '
        + 'whole-event per-head figure was found for any of them, and the catering-only per-person '
        + 'guides that exist measure a different thing. `travel_led` remains the worst of the five — '
        + 'it is unsourced AND it is the band the destination blend raises other types toward.',
    sufficientWhen: 'Each family band is reconciled against dated per-head figures for at least two representative types inside that family. Four of the five families still have zero.',
  },
  'budget.perHeadFallback': {
    tier: 'estimate',
    confidence: 'low',
    verificationStatus: 'removed-in-favour-of-refusal',
    sources: [],
    count: 0,
    appliesTo: 'budgetEstimator/totalEstimate.js#estimateTotalRange — NO LONGER A CONSTANT. The literal { low: 100, high: 250 } was replaced on 2026-09-18 with `return null`.',
    claim: 'THERE IS NO LONGER A LAST-RESORT PER-HEAD BAND. A type that resolves to no explicit band, no playbook cost and no family now produces no estimate at all.',
    note: 'RESOLVED 2026-09-18. The previous record measured this band UNREACHABLE: it fired only '
        + 'when budgetFamilyForType returned nothing, and it never did, because '
        + 'eventTaxonomy.mjs#intakeFamilyFor answers \'host_driven\' for anything it cannot resolve. '
        + 'That measurement still holds for every ordinary event type and is re-swept by test. '
        + 'IT IS NO LONGER UNREACHABLE, AND THAT IS THE BEST ARGUMENT FOR THE REFUSAL. Probing this '
        + 'branch turned up a separate defect: PER_HEAD_BY_TYPE[type] walked the prototype chain, so '
        + 'a type named \'__proto__\' or \'constructor\' matched Object.prototype — truthy, no .low, '
        + 'no .high — and the estimator emitted lowTotal: NaN, highTotal: NaN WHILE CITING '
        + '\'budget.perHeadByType\' as the table that produced them. Fixed to own-property lookups, '
        + 'those inputs now fall through (budgetFamilyForType already answers undefined for them) and '
        + 'land here. So the branch is live, it is reached by exactly the inputs that used to produce '
        + 'a NaN dollar figure with a false citation attached, and what it does now is decline. '
        + 'DELETE OR REFUSE — WHY REFUSE WON. Deleting the literal alone was not actually available: '
        + '`ph` is dereferenced immediately afterwards, so removing the assignment converts a silent '
        + 'wrong answer into a TypeError, which is worse — the estimator would crash instead of '
        + 'declining. The refusal removes the same unsourced dollar figure AND leaves a defined '
        + 'behaviour. It also costs nothing to adopt: estimateTotalRange ALREADY returns null when '
        + 'type or guestCount is missing, so every caller in the app has always had to handle null on '
        + 'this exact path. The refusal reuses a contract that is already proven at runtime rather '
        + 'than inventing one. '
        + 'WHAT IT BUYS. "We do not have a band for this" is a true sentence; "$100-250 per head" for '
        + 'an event the engine has never heard of is not. The engine can no longer answer a question '
        + 'it cannot answer. '
        + '"MAKE SURE NOTHING SILENTLY STARTS DEPENDING ON IT" — that is now enforced rather than '
        + 'hoped for. There is no figure left to depend on, and if the family resolver is ever made '
        + 'strict, the branch that used to invent $100-250 returns null instead. A test sweeps for '
        + 'both: that nothing reaches the branch today, and that the branch refuses rather than '
        + 'inventing when it is forced. '
        + 'THE RECORD IS KEPT, at count 0, because a deleted constant with no record is indistinguishable '
        + 'from a constant nobody ever looked at. This is the memory that someone looked.',
    sufficientWhen: 'Never promoted — there is nothing left to ground. This record is now a gravestone: it exists so that a future editor who is tempted to re-add a last-resort band finds the reasoning before the empty space.',
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
    verificationStatus: 'partially-corroborated',
    sources: ['theknot-realweddings-2026'],
    count: 29,
    appliesTo: 'budgetEstimator/categoryShares.js#WEDDING_SHARES / CORPORATE_SHARES / PRIVATE_SHARES / FALLBACK_SHARES',
    claim: '29 min/max share bands across 4 tables, splitting a total budget into per-category dollar ranges.',
    note: 'Recorded basis: "Numbers reflect commonly-cited US event planning bands" — the same uncheckable formula as the per-head table. The wedding split most resembles a widely published trade convention, but no publisher is named here, so it is registered as an estimate rather than a trade-heuristic: naming a convention we cannot point at would be a citation-shaped claim with nothing behind it. These shares also re-enter the total via the nights term, which multiplies the catering share. '
        + 'RESEARCHED 2026-09-18 — the WEDDING table only, and the check is weaker than it looks. '
        + 'READ THIS BEFORE THE NUMBERS: The Knot publishes CATEGORY AVERAGES CONDITIONAL ON HIRING '
        + 'THAT VENDOR (89% book a venue, 88% a photographer, 85% a caterer), so its category figures '
        + 'do not sum to its own $34,200 total — they sum well past it. Dividing each by the total is '
        + 'OUR arithmetic, not the source\'s claim, and it overstates every share. With that stated, '
        + 'the comparison against WEDDING_SHARES: catering (The Knot $80/person x 117 guests = $9,360, '
        + '27.4%) falls inside our 25-40%; photographer ($3,000, 8.8%) inside 8-15%; flowers ($2,800, '
        + '8.2%) inside 8-15%; DJ ($1,800, 5.3%) inside 5-12%; event rentals ($2,000, 5.8%) inside '
        + '4-10%; transportation ($1,100, 3.2%) inside 2-5%. SIX ROWS CONTAIN THE PUBLISHED AVERAGE. '
        + 'TWO DO NOT, and one of them matters: reception venue at $12,900 is 37.7% of the published '
        + 'total against our 12-20% band — roughly double the ceiling. That gap is NOT clean evidence '
        + 'we are wrong: The Knot\'s reception-venue average plausibly bundles food and beverage at '
        + 'all-inclusive venues, which is precisely the double-count this table was corrected to '
        + 'remove in Sprint 53. The source cannot settle it, and neither can this note. '
        + '(hair_makeup also misses, at 0.9% against 2-4%, but The Knot prices hair and makeup "for '
        + 'one to-be-wed" only, so that is a scope difference rather than a disagreement.) '
        + 'CORPORATE_SHARES, PRIVATE_SHARES and FALLBACK_SHARES — 20 of the 29 bands — were searched '
        + 'and have NOTHING.',
    sufficientWhen: 'Each table is reconciled against a dated, named budget-allocation study for that event family; per-table promotion, not all-or-nothing. For the wedding table specifically, promotion needs a source that publishes SHARES rather than conditional category averages, because only that can settle the venue row.',
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
    note: 'The DATE RULES are checkable arithmetic (last Monday of May, fourth Thursday of November) and are not in question. The PREMIUMS are not: no source records that a New Year\'s Eve event costs 30% more, or that it costs twice what Valentine\'s Day costs. The premium and the calendar rule live in one object and should not inherit each other\'s credibility. '
        + 'SEARCHED 2026-09-18 AND REFUSED — recorded so the gap is a finding rather than an absence '
        + 'nobody checked. Nothing was found that prices an event by holiday. The nearest retrieved '
        + 'statements are The Knot noting a December 31 wedding "might not save you money since '
        + 'companies usually have a hard time finding staff willing to work on New Year\'s Eve" and '
        + 'two catering guides listing "holidays" among price drivers — all three give a direction and '
        + 'none gives a figure, so none was attached. Nothing here can say why New Year\'s Eve is '
        + 'priced at twice Valentine\'s Day. Eight premiums, zero sources, unchanged.',
    sufficientWhen: 'A dated vendor- or venue-pricing survey reports holiday-date premiums by holiday. Absent that, the honest alternative is a single flag ("high-demand date") with no multiplier.',
    hostExplanation: true,
  },
  'factors.dowPremium': {
    tier: 'trade-heuristic',
    confidence: 'low',
    verificationStatus: 'contradicted-on-magnitude',
    sources: ['theknot-cheapest-days-2025', 'grandlady-dayofweek-2026'],
    count: 7,
    appliesTo: 'estimatorFactors.js#DOW_PREMIUM (7 rows, 2 non-zero: Friday +10%, Saturday +20%)',
    claim: 'Saturday carries a +20% and Friday a +10% planning premium; Sunday through Thursday carry none.',
    note: 'Registered as trade-heuristic rather than estimate because the DIRECTION is a convention the code states out loud to the host ("Saturdays book up faster — vendors and venues commonly charge more") and is not seriously disputed. The MAGNITUDES have no recorded source, and the Sunday-equals-Wednesday row is itself a claim: it asserts a Sunday carries no premium at all. '
        + 'RESEARCHED 2026-09-18, AND THE FINDING IS UNCOMFORTABLE. Two real sources were retrieved '
        + 'and they disagree with each other and with us — because they measure DIFFERENT THINGS, '
        + 'which is the whole lesson. '
        + '(1) THE SURVEY, on total spend. The Knot publishes average total wedding spend by day: '
        + 'Thursday $31,100, Wednesday $32,000, Sunday $32,700, Saturday $33,100, Friday $33,200, '
        + 'Monday $33,500, Tuesday $33,900. Saturday over Sunday is 1.2%. Friday over Sunday is 1.5%. '
        + 'The entire seven-day spread is 9.0%, and SATURDAY IS NOT THE MOST EXPENSIVE DAY IN IT — '
        + 'Tuesday and Monday both sit above it. We ship +20% and +10%. '
        + '(2) THE RATE CARD, on venue rental. The Grand Lady (Austin) publishes its own 2026 rates: '
        + 'Saturday $7,500-14,500, Friday $6,500-10,500, Sunday $5,500-8,000, weekday $4,000-5,000. '
        + 'Midpoint to midpoint that is Saturday 63% over Sunday and 29% over Friday — far ABOVE our '
        + '+20%, not below it. '
        + 'WHY BOTH ARE TRUE AND OUR NUMBER IS STILL NOT SUPPORTED. The rate card prices the one line '
        + 'that moves most with the calendar. The survey prices the whole event, most of which '
        + '(catering, florals, attire, rings) scales with headcount rather than weekday. '
        + 'DOW_PREMIUM multiplies the WHOLE ESTIMATE, so the survey is the matching unit — and on that '
        + 'unit the observed Saturday differential is about one sixteenth of what we apply. '
        + 'The catering sources corroborate only the DIRECTION, explicitly without a figure '
        + '("a Saturday in June costs more than a Tuesday in February"; "Saturdays ... carry premiums"). '
        + 'BOTH SOURCES ALSO CONTRADICT THE ZERO ROWS, in opposite directions: the venue prices Sunday '
        + '50% above a weekday, while the survey puts Monday and Tuesday ABOVE Sunday. Nothing found '
        + 'supports Sunday = Monday = Wednesday = 0. '
        + 'SCOPE, ours not theirs: both sources are wedding sources and DOW_PREMIUM is applied to a '
        + 'Board Meeting and a Conference too, where weekday demand is the opposite way round. '
        + 'NO DOLLAR MOVED. +20%/+10% still ship. This record says what was found and leaves the '
        + 'pricing decision to whoever owns pricing.',
    sufficientWhen: 'A dated source publishes day-of-week differentials ON THE SAME BASE the factor multiplies — whole-event cost, not venue rental — for more than one market and for non-wedding event types. Until then the honest alternative may be to shrink the premium toward the measured whole-event spread, or to demote it to a flag ("Saturdays book up faster") with no multiplier.',
    hostExplanation: true,
  },
  'factors.peakWeddingSeason': {
    tier: 'trade-heuristic',
    confidence: 'low',
    verificationStatus: 'month-set-corroborated-premium-contradicted',
    sources: ['theknot-wedding-season-2026', 'theknot-cheapest-days-2025', 'theknot-realweddings-2026'],
    count: 2,
    appliesTo: 'estimatorFactors.js#isPeakWeddingSeason (May-Oct month set) + the +15% season premium in getDatePremium',
    claim: 'May through October are peak wedding-demand months in most US markets, worth a +15% planning premium for wedding-family types.',
    note: 'The SEASON is a well-attested trade convention. The +15% is not sourced, and the month set is stated as "most US markets" — a hedge the code makes honestly and this record keeps rather than launders. Applies only to the 5 wedding-family types. '
        + 'RESEARCHED 2026-09-18. THIS RECORD HOLDS TWO NUMBERS AND THE RESEARCH SPLIT THEM. '
        + 'THE MONTH SET IS CORROBORATED, verbatim and by name: The Knot states "Peak wedding season '
        + 'spans from May through October" and that 76% of US weddings fall in that window (October '
        + 'and June 16% each, May 14%, September 13%, August 10%; November-April is 24%). '
        + 'PEAK_WEDDING_MONTHS_SET is exactly May-October. That is as clean a match as this pass found. '
        + 'THE +15% IS CONTRADICTED by the same publisher\'s own cost data. The Knot\'s by-month '
        + 'average total spend runs from $29,900 (January) to $33,900 (May) — a 13.4% spread across '
        + 'the ENTIRE YEAR, which is less than the premium we apply to half of it. Grouping its months '
        + 'into our own May-Oct / Nov-Apr split (OUR arithmetic over its published figures, unweighted '
        + 'by wedding volume, not a claim the source makes) gives $33,350 against $31,800 — a peak '
        + 'premium of 4.9%. Its published quarters give Jul-Sep $35,400 against Jan-Mar $33,200, '
        + 'or 6.6%. Its published seasons give Summer $34,000 against Winter $32,000, or 6.3%. Three '
        + 'independent cuts of the same survey land between 5% and 7%. We ship 15%. '
        + 'THE HONEST CAVEAT, which cuts toward us: average spend by chosen month conflates price with '
        + 'selection — a January couple may be buying a smaller wedding, not the same wedding cheaper — '
        + 'so the observed 5-7% is a floor on the true price effect, not a measurement of it. It is '
        + 'still the only measured figure anyone published, and it is a third of ours. '
        + 'The source explicitly declines to publish a percentage ("prices are typically higher during '
        + 'this time due to the increase in demand"), so nothing here reproduces a figure it states. '
        + 'That is why the tier does not move: one number checked out and one did not, and a record '
        + 'carrying both cannot be called researched. NO DOLLAR MOVED.',
    sufficientWhen: 'Splitting this record in two would let the month set stand on its own evidence instead of being held down by the premium. Promoting the PREMIUM needs a month-by-month PRICE index for comparable events — not average spend by chosen date — and would very likely land well below 15%.',
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
    note: 'Each slot already ships the host a real, plausible reason (extended staffing, lighting, bar service, overtime, transport). Those reasons are sound; the multipliers attached to them are not sourced. A good explanation next to an unsourced number is the most persuasive form this problem takes, which is why the slot keeps its explanation and gains this marker rather than trading one for the other. '
        + 'SEARCHED 2026-09-18 AND REFUSED. The catering sources price by SERVICE STYLE (drop-off '
        + '$15-30, buffet $25-65, plated $60-150+ per person) and by event type, never by time of day. '
        + 'The one adjacent statement retrieved is a planner quoted by The Knot that "daytime weddings '
        + 'are usually discounted" and that buffets cost less per head than plated meals — which is a '
        + 'real observation about SERVICE STYLE tracking time of day, not a multiplier for time of '
        + 'day. Attaching it to 0.85/1.00/1.10/1.25 would be a citation for a different claim. '
        + 'Four multipliers, zero sources, unchanged.',
    sufficientWhen: 'Dated catering or staffing rate data prices a morning, evening and late-night event of comparable scope — same menu, same service style, different hour. A source that prices brunch against dinner is pricing the MENU, and will look like a time-of-day source without being one.',
    hostExplanation: true,
  },
  // ── THE ONE PROMOTION ────────────────────────────────────────────────────
  'factors.serviceCharge': {
    tier: 'researched',
    confidence: 'medium',
    verificationStatus: 'verified-2026-09-18',
    sources: [
      'restaurantcalcs-catering-2026',
      'cateringdirectory-perperson-2026',
      'chefry-catering-2026',
    ],
    count: 1,
    appliesTo: 'estimatorFactors.js#SERVICE_CHARGE_DEFAULT (0.20)',
    claim: 'A 20% service charge is a common US catering norm, applied to the food-and-beverage subtotal and distinct from gratuity.',
    note: 'PROMOTED 2026-09-18 — the first constant in this registry to pass isGroundedMoneyFactor, '
        + 'and the only one this research pass could honestly promote. '
        + 'WHY THIS ONE AND NOT THE OTHERS. Three separately published 2026 pages state the same band: '
        + 'RestaurantCalcs ("a flat 18-22% mandatory service charge on the per-head subtotal ... It is '
        + 'not a gratuity"), CateringDirectory ("a service charge of 18 to 22 percent is common and it '
        + 'is not always gratuity"), and Chefry ("a service charge of 18-22% of the food total"). '
        + 'All three then use 20% in their worked examples — the shipped figure appears VERBATIM in '
        + 'the sources rather than being a midpoint this registry picked. '
        + 'THE UNIT MATCHES, which is the test most of this pass\'s candidates failed. Each source '
        + 'applies the percentage to the food-and-beverage subtotal; getServiceTaxFactor applies '
        + 'SERVICE_CHARGE_DEFAULT to the subtotal too. No conversion, no re-basing, no derivation. '
        + 'THE INCENTIVES POINT DIFFERENT WAYS, which is the closest thing to independence this '
        + 'subject offered. RestaurantCalcs is telling operators what to CHARGE. Chefry is arguing the '
        + 'practice is bad for hosts and selling a flat 5% alternative — it has an incentive to report '
        + 'the number HIGH, and it reports the same band. A seller is also genuinely authoritative '
        + 'about its own posted fee in a way it is not about, say, a regional cost index. '
        + 'WHAT THIS GROUNDING IS NOT. All three are commercial_practitioner. Under '
        + 'knowledge/commercialSourcePolicy.js that supports `planning_guidance` and NOT a '
        + 'measured_finding or a universal claim — so the grounded claim is "20% is a common norm", '
        + 'never "your caterer will charge 20%". None of the three is a survey; each states prevailing '
        + 'practice. Confidence stays MEDIUM, not high, for exactly that reason. '
        + 'The studio-override path is unaffected and still matters more than this default: '
        + 'getServiceTaxFactor already reports source:\'studio\'|\'mixed\'|\'default\', so a surface can '
        + 'still tell a host-supplied rate from this one. A grounded default is a better default, not '
        + 'a substitute for the real contract. '
        + 'NO DOLLAR MOVED: 0.20 shipped before this pass and ships after it. The evidence arrived to '
        + 'meet the number, not the other way round.',
    sufficientWhen: 'Already researched. It would be STRENGTHENED by an independent or trade-association survey of prevailing rates, which would let confidence rise from medium and would let the claim carry more than planning guidance. It would be WEAKENED — and should be demoted — if a reader finds these three pages share an upstream source; they were checked for that and read as independently authored, but three commercial pages agreeing is corroboration, not proof.',
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
    note: 'The weakest constant in estimatorFactors and the code says so in four words: "varies wildly by state". It is not a jurisdiction rate and cannot become one — US sales-tax treatment of catering and service charges differs by state, by locality and by whether service is taxed at all. The honest end state is the studio override or a jurisdiction lookup, never a better national guess. '
        + 'NOT SEARCHED ON PURPOSE, 2026-09-18. The service-charge sources sit right next to a tax '
        + 'line in every worked example (one uses "8% sales tax on base"), and it would have been easy '
        + 'to lift a number from beside a figure that WAS researched. There is no such thing as a '
        + 'correct national catering tax rate, so a citation here would be a decoration attached to '
        + 'the most checkable-looking constant in the file. 0.06 stands, sourceless, on purpose. '
        + 'Note the asymmetry now in this file: factors.serviceCharge is grounded and factors.tax sits '
        + 'immediately beside it in the same multiplier — getServiceTaxFactor returns (1+sr)*(1+tr) — '
        + 'so the composite it produces is UNGROUNDED no matter how good the service half gets.',
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
    verificationStatus: 'directionally-checked-not-corroborated',
    sources: ['theknot-realweddings-2026'],
    count: 29,
    appliesTo: 'vendorEstimator.js#METRO_MARKETS (29 markets, factors 0.80-1.65)',
    claim: 'A 29-market cost index against a US national baseline, from 0.80 (rural / small market) to 1.65 (New York / New Jersey).',
    note: 'The widest-swinging factor in the stack: 0.80 to 1.65 is a 2.06x spread applied to the whole estimate. The code is already honest in prose — "directional planning multipliers against a US national baseline, not a live market feed" — and a prior audit (SPRINT_56B) independently graded this axis C and named its resolution gaps. No source is recorded for any of the 29 factors. Two entries are not market claims at all and should not be read as measurements: \'other\' sits at 1.00 as a no-claim default, and \'rural\' at 0.80 covers every small market in the country with one number. '
        + 'RESEARCHED 2026-09-18 AND DELIBERATELY NOT PROMOTED. The Knot publishes average total '
        + 'wedding spend for 23 US cities, which is the closest thing to a per-metro figure anyone '
        + 'publishes — and it is the WRONG QUANTITY. It measures what couples in a city SPEND, which '
        + 'mixes the local price level with local incomes and wedding scale; METRO_MARKETS claims to '
        + 'be a PRICE index for the same event moved between markets. Using one for the other is the '
        + 'unit slip this repo has been caught by before, so it is recorded here and not cited as '
        + 'corroboration. '
        + 'What the comparison looks like anyway, as city average over the $34,200 national average '
        + 'against our shipped factor: New York 2.57 vs 1.65; Chicago 1.58 vs 1.35; Boston 1.49 vs '
        + '1.45; San Francisco 1.49 vs 1.60; Los Angeles 1.32 vs 1.50; Washington DC 1.23 vs 1.45; '
        + 'Philadelphia 1.17 vs 1.15; San Diego 1.11 vs 1.25; Austin 1.08 vs 1.20; Houston 0.96 vs '
        + '1.05; Dallas 0.94 vs 1.15; Charlotte 0.94 vs 1.00; Denver 0.91 vs 1.20; Seattle 0.91 vs '
        + '1.40; Nashville 0.85 vs 1.15; Phoenix 0.79 vs 1.10; Columbus 0.88 vs 0.95; Indianapolis '
        + '0.73 vs 0.90. Eighteen of our 29 rows have a counterpart; ELEVEN HAVE NONE (Miami, '
        + 'Portland, Atlanta, Minneapolis, Tampa/Orlando, Salt Lake City, Pittsburgh, Kansas City, '
        + 'St. Louis, and the two non-claims \'rural\' and \'other\'). '
        + 'The shape of the disagreement is consistent enough to be worth stating: our factor is '
        + 'HIGHER than the spend ratio in 16 of those 18, and much LOWER in the one market where the '
        + 'spend ratio is extreme (New York, 2.57 against our 1.65). Our spread is 2.06x end to end; '
        + 'the published city spread is 3.52x. Seattle is the widest single gap — we ship 1.40 against '
        + 'a spend ratio of 0.91. '
        + 'Boundaries differ too and were not reconciled: our \'New York / New Jersey\' is not its '
        + '"New York City", and our \'Tampa / Orlando\' has no counterpart at all (it publishes '
        + 'Jacksonville). NO FACTOR MOVED.',
    sufficientWhen: 'A dated regional cost-of-services index (or per-market vendor rate data) is registered and reconciled market by market; per-market promotion, since a source covering the top metros says nothing about \'rural\'. The Knot city averages are NOT that source and should not be used as one, however tempting the coverage is.',
  },
  'vendor.rushFactor': {
    tier: 'trade-heuristic',
    confidence: 'low',
    verificationStatus: 'direction-corroborated-windows-and-base-differ',
    sources: ['wpic-rushfees-2026'],
    count: 3,
    appliesTo: 'vendorEstimator.js#getRushFactor (1.25 / 1.12 / 1.05 at <30 / <60 / <120 days)',
    claim: 'Short-notice bookings carry a premium: ~25% inside 30 days, ~12% inside 60, ~5% inside 120, none beyond.',
    note: 'READ THIS ONE CLOSELY. Its comment attributes the premiums to "planner surveys + Wedding Wire / The Knot patterns" — it NAMES two publishers but records no dated citation, no URL and no figure from either. That is an uncheckable attribution, and it is the most dangerous form in these files: it reads like a citation to anyone skimming, and it cannot be followed by anyone who tries. It is registered as trade-heuristic with EMPTY sources, and the named publishers are deliberately NOT written into `sources` — an id that does not resolve in MONEY_SOURCES would fail the predicate anyway, and writing them in would dress the record up as cited when nothing was fetched. '
        + 'RESEARCHED 2026-09-18 — AND THE NAME-DROP IS STILL NOT A CITATION. Neither Wedding Wire nor '
        + 'The Knot was found publishing a lead-time premium schedule; The Knot\'s only statement on '
        + 'short timelines is a quoted planner saying a band with an empty date "could ... chop off a '
        + 'few hundred bucks", which points the OPPOSITE way to a rush premium. So the comment\'s two '
        + 'publishers remain uncited, deliberately. '
        + 'WHAT WAS FOUND INSTEAD is the Wedding Planners Institute of Canada\'s published rush-fee '
        + 'structure: +10-15% at six months or less, +20-30% at three months or less, +30-50% at eight '
        + 'weeks or less. It is now cited — a real, dated, named page in place of a memory — and it '
        + 'does NOT promote the record, for three reasons that are worth keeping separate. '
        + '(1) DIFFERENT BASE. WPIC prices the PLANNER\'S FEE. getRushFactor multiplies a whole vendor '
        + 'cost range. Applying a planner-fee uplift to a vendor quote is a unit error. '
        + '(2) DIFFERENT WINDOWS, AND WE ARE UNIFORMLY GENTLER. At 30 days WPIC says +30-50% and we '
        + 'say +25%. At 60 days WPIC says +20-30% and we say +12%. At 120 days WPIC says +10-15% and '
        + 'we say +5%. At 150 days WPIC still says +10-15% and we say nothing at all — our ladder ends '
        + 'at 120 days, theirs runs to 180. Every rung of ours sits below every rung of theirs. '
        + '(3) IT IS ADVOCACY, NOT MEASUREMENT. The article\'s thesis is "if you\'re not charging rush '
        + 'fees, you\'re leaving money on the table", addressed to planners about what they SHOULD '
        + 'charge. A trade body telling its members to charge more is evidence that the practice '
        + 'exists and evidence skewed high about its size. Registered as trade_association with that '
        + 'stated. '
        + 'NET: the DIRECTION of the shipped ladder is now genuinely sourced and its MAGNITUDE still '
        + 'is not. No factor moved.',
    sufficientWhen: 'Someone finds a dated page that states lead-time premiums ON A VENDOR QUOTE rather than a planning fee, for US vendors, from a party that is not advising its members to raise prices — and reconciles the 30/60/120-day windows against it. The WPIC citation is a floor for this record, not a finish line: it is the difference between an uncheckable memory and a checkable disagreement.',
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
