// ─── Provider Monitor (KAW-1 Bundle B) ────────────────────────────────────────
// Monitoring rules for each provider family. Every provider declares:
// polling cadence, expected freshness, authority, failure tolerance, rate limits,
// monitoring strategy, and normalization rules. Makes provider monitoring observable.
//
// Nothing executes here — this is a data + pure-function module.
// The worker engine (knowledgeWorkers.js) consumes these rules to schedule work.

import { PROVIDER_FAMILIES } from './providers';

// ── Provider monitoring rules ─────────────────────────────────────────────────
// One rule object per provider family. Maps to PROVIDER_FAMILIES in providers.js.
export const PROVIDER_MONITOR_RULES = {

  government: {
    family: 'government',
    label: 'Government Agencies',
    pollingCadence: 'monthly',
    expectedFreshnessDays: 365,
    authority: 'official',
    failureTolerance: 'cache',          // use last known value; block if >2x stale
    rateLimit: 'none',
    monitoringStrategy: 'rss-or-api',  // preferred monitoring approach
    normalizationRules: [
      'cite specific publication date and revision number',
      'note when methodology changes',
      'flag annual CPI re-benchmarks',
    ],
    examples: ['BLS CPI', 'USDA ERS', 'FDA Food Safety', 'CDC Food Safety', 'NOAA Climate'],
    changeSignals: ['methodology-update', 'annual-benchmark', 'recall-alert', 'regulation-change'],
    monitoringNotes: 'BLS releases monthly; USDA monthly/annual; FDA continuous (recall alerts); NOAA weekly (forecasts) / 30-year (normals).',
  },

  'food-safety': {
    family: 'food-safety',
    label: 'Food Safety Authorities',
    pollingCadence: 'weekly',           // recalls can appear any day
    expectedFreshnessDays: 180,
    authority: 'official',
    failureTolerance: 'alert',          // food safety cannot be cached silently
    rateLimit: 'none',
    monitoringStrategy: 'rss-webhook',
    normalizationRules: [
      'cite specific recall number for recalls',
      'distinguish advisory vs. mandatory recall',
      'note product category and scope',
      'always include effective date',
    ],
    examples: ['FDA Recalls', 'USDA FSIS Recalls', 'CDC Outbreak Reports', 'ServSafe'],
    changeSignals: ['active-recall', 'new-food-code-section', 'illness-outbreak', 'guidance-update'],
    monitoringNotes: 'FDA and USDA FSIS post recall alerts continuously. Poll at least weekly. Treat food safety changes as high-priority observations.',
  },

  weather: {
    family: 'weather',
    label: 'Weather Services',
    pollingCadence: 'weekly',
    expectedFreshnessDays: 7,
    authority: 'official',
    failureTolerance: 'skip',           // weather data is time-sensitive; stale = useless
    rateLimit: 'low',
    monitoringStrategy: 'api',
    normalizationRules: [
      'distinguish forecast from climate normal',
      'note observation location and time window',
      'tag seasonal vs. event-specific guidance',
    ],
    examples: ['NOAA Climate Normals', 'National Weather Service Heat Index', 'Storm Prediction Center'],
    changeSignals: ['extreme-weather-alert', 'heat-index-update', 'new-climate-normal'],
    monitoringNotes: 'Climate Normals (30-year averages) refresh on 10-year cycle. Heat index advisory thresholds are stable. Use for outdoor event contingency knowledge only.',
  },

  academic: {
    family: 'academic',
    label: 'Academic Publications',
    pollingCadence: 'quarterly',
    expectedFreshnessDays: 730,
    authority: 'standards',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'journal-alerts',
    normalizationRules: [
      'cite journal, volume, issue, DOI',
      'note study methodology and sample size',
      'flag US-specific vs. international scope',
      'note when study is industry-funded',
    ],
    examples: ['Cornell Hospitality Quarterly', 'Journal of Foodservice', 'Journal of Event Management'],
    changeSignals: ['new-publication', 'methodology-revision', 'meta-analysis'],
    monitoringNotes: 'Academic knowledge changes slowly. Quarterly check is sufficient. Note paywall status.',
  },

  standards: {
    family: 'standards',
    label: 'Professional Standards Bodies',
    pollingCadence: 'biannual',
    expectedFreshnessDays: 365,
    authority: 'standards',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'newsletter-rss',
    normalizationRules: [
      'cite specific standard version and publication date',
      'note jurisdiction for legal requirements (ADA, permits)',
      'distinguish best practice from legal requirement',
    ],
    examples: ['ADA Standards', 'NFPA Fire Codes', 'Health Department Codes', 'Insurance Institute Standards'],
    changeSignals: ['standard-revision', 'new-section', 'jurisdiction-update'],
    monitoringNotes: 'Standards change slowly but have high impact when they do. Biannual check. Flag legal vs. voluntary.',
  },

  hospitality: {
    family: 'hospitality',
    label: 'Hospitality Industry',
    pollingCadence: 'biannual',
    expectedFreshnessDays: 180,
    authority: 'trade',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'member-publications',
    normalizationRules: [
      'note membership tier of source (member vs. public)',
      'distinguish regional chapter from national',
      'flag commercial bias in pricing data',
    ],
    examples: ['NRA Restaurant Industry Outlook', 'Cornell Hospitality Quarterly', 'Hospitality Technology'],
    changeSignals: ['annual-report', 'staffing-ratio-update', 'pricing-benchmark-update'],
    monitoringNotes: 'NRA annual report (spring) is the primary refresh trigger. Note member-access-only content.',
  },

  'event-industry': {
    family: 'event-industry',
    label: 'Event Industry Associations',
    pollingCadence: 'biannual',
    expectedFreshnessDays: 180,
    authority: 'trade',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'member-publications',
    normalizationRules: [
      'cite specific ILEA, NACE, or MPI publication',
      'note event type scope (corporate, social, wedding)',
      'flag member-only vs. publicly available',
    ],
    examples: ['ILEA', 'NACE', 'MPI', 'ABC (Association of Bridal Consultants)'],
    changeSignals: ['annual-state-of-industry', 'salary-survey', 'planning-standard-update'],
    monitoringNotes: 'ILEA and NACE publish annual reports. NACE catering standards are the primary reference for catering knowledge.',
  },

  'commercial-pricing': {
    family: 'commercial-pricing',
    label: 'Commercial Pricing Sources',
    pollingCadence: 'quarterly',
    expectedFreshnessDays: 45,
    authority: 'trade',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'price-survey',
    normalizationRules: [
      'capture observation date for all prices',
      'note market/geography for price observations',
      'flag seasonal pricing patterns',
      'distinguish list price from promotional price',
    ],
    examples: ['Commercial catering quotes', 'Event rental pricing', 'Venue pricing sheets'],
    changeSignals: ['price-spike', 'seasonal-adjustment', 'market-shift'],
    monitoringNotes: 'Commercial pricing changes faster than government data. Quarterly surveys recommended. Note local market variation.',
  },

  retail: {
    family: 'retail',
    label: 'Retail Pricing',
    pollingCadence: 'quarterly',
    expectedFreshnessDays: 45,
    authority: 'trade',
    failureTolerance: 'cache',
    rateLimit: 'low',
    monitoringStrategy: 'price-survey',
    normalizationRules: [
      'capture store and location with price',
      'note sale vs. regular price',
      'flag organic/conventional distinction',
      'note regional variation',
    ],
    examples: ['Costco', 'Kroger', 'Walmart', 'Harris Teeter', 'Publix', 'Safeway'],
    changeSignals: ['price-change', 'product-availability', 'seasonal-shift'],
    monitoringNotes: 'Retail prices vary by store and location. Capture 2-3 stores per market. Note promotional pricing.',
  },

  wholesale: {
    family: 'wholesale',
    label: 'Wholesale / Foodservice Distributors',
    pollingCadence: 'quarterly',
    expectedFreshnessDays: 45,
    authority: 'trade',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'account-survey',
    normalizationRules: [
      'note distributor (Sysco, GFS, Restaurant Depot)',
      'capture pack size and unit cost',
      'distinguish case price from each price',
      'note delivery vs. pickup pricing',
    ],
    examples: ['Sysco', 'GFS', 'Restaurant Depot', 'US Foods'],
    changeSignals: ['price-change', 'product-discontinued', 'minimum-order-change'],
    monitoringNotes: 'Account required for Sysco/GFS. Restaurant Depot is cash-and-carry; more observable. Note regional distribution footprint.',
  },

  catering: {
    family: 'catering',
    label: 'Catering Services',
    pollingCadence: 'biannual',
    expectedFreshnessDays: 180,
    authority: 'trade',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'quote-survey',
    normalizationRules: [
      'note service level (drop-off, full-service, staffed)',
      'capture per-head pricing separately from setup fees',
      'note minimum guest count',
      'flag geographic market',
    ],
    examples: ['Local caterers', 'Restaurant catering arms', 'Catering platforms'],
    changeSignals: ['pricing-update', 'menu-change', 'minimum-change'],
    monitoringNotes: 'Quote-based. Survey 3+ caterers per market per event type. Note service-level differences.',
  },

  sme: {
    family: 'sme',
    label: 'Subject Matter Experts',
    pollingCadence: 'on-demand',
    expectedFreshnessDays: 365,
    authority: 'expert',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'interview',
    normalizationRules: [
      'document expert credentials and market scope',
      'note interview date and method',
      'distinguish opinion from observed practice',
      'require corroboration for pricing claims',
    ],
    examples: ['Professional event planners', 'Caterers', 'Cultural community leaders', 'Venue operators'],
    changeSignals: ['expert-available', 'market-change-reported'],
    monitoringNotes: 'SME knowledge is the most contextually rich but hardest to scale. Require corroboration for any KCR from SME-only evidence.',
  },

  community: {
    family: 'community',
    label: 'Community Sources',
    pollingCadence: 'monthly',
    expectedFreshnessDays: 30,
    authority: 'community',
    failureTolerance: 'skip',
    rateLimit: 'low',
    monitoringStrategy: 'forum-scrape',
    normalizationRules: [
      'note platform and community (Reddit, Facebook Group)',
      'capture post date and engagement (upvotes/replies)',
      'note geographic specificity',
      'ALWAYS flag for corroboration — never single-source from community',
    ],
    examples: ['Reddit r/BBQ, r/DinnerParty', 'Facebook local community groups', 'Nextdoor'],
    changeSignals: ['price-report', 'vendor-experience', 'regional-custom'],
    monitoringNotes: 'Community data is high-volume, low-reliability. Use for discovery only. Corroborate every finding before KCR generation.',
  },

  tourism: {
    family: 'tourism',
    label: 'Tourism & Hospitality Boards',
    pollingCadence: 'annual',
    expectedFreshnessDays: 365,
    authority: 'trade',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'report-download',
    normalizationRules: [
      'cite specific city or state tourism board',
      'note survey methodology and sample',
      'flag visitor vs. resident pricing differences',
    ],
    examples: ['State tourism boards', 'CVBs', 'Local DMOs'],
    changeSignals: ['annual-report', 'market-study'],
    monitoringNotes: 'Tourism board data useful for venue pricing and regional market context.',
  },

  venue: {
    family: 'venue',
    label: 'Venue Operators',
    pollingCadence: 'biannual',
    expectedFreshnessDays: 365,
    authority: 'trade',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'quote-survey',
    normalizationRules: [
      'note venue type (private home, commercial, public park, ballroom)',
      'note capacity and event type scope',
      'capture COI requirements explicitly',
      'flag exclusivity clauses (catering, A/V)',
    ],
    examples: ['Event halls', 'Country clubs', 'Parks/outdoor venues', 'Restaurant private dining'],
    changeSignals: ['pricing-update', 'policy-change', 'capacity-change'],
    monitoringNotes: 'Venue policies change slowly but COI requirements have high impact on planning. Survey 5+ venues per market per type.',
  },

  'internal-validation': {
    family: 'internal-validation',
    label: 'Internal Validation',
    pollingCadence: 'monthly',
    expectedFreshnessDays: 90,
    authority: 'derived',
    failureTolerance: 'cache',
    rateLimit: 'none',
    monitoringStrategy: 'derived',
    normalizationRules: [
      'always cite the observation(s) that triggered the validation',
      'note whether validation was automated or manual',
      'document discrepancy between expected and observed',
    ],
    examples: ['Runtime outcome observations', 'User feedback observations', 'Failure intelligence records'],
    changeSignals: ['runtime-outcome', 'user-feedback', 'failure-record'],
    monitoringNotes: 'Internal validation closes the loop from knowledge → recommendation → outcome → observation. Highest-quality signal when available.',
  },
};

// ── Lookup + utilities ────────────────────────────────────────────────────────
export function getMonitorRule(family) {
  return PROVIDER_MONITOR_RULES[family] || null;
}

export function overdueProviders(lastCheckedAt = {}, asOf) {
  return Object.entries(PROVIDER_MONITOR_RULES)
    .filter(([family, rule]) => {
      const lastChecked = lastCheckedAt[family];
      if (!lastChecked) return true;  // never checked = overdue
      const msPerDay = 86_400_000;
      const ageDays = (new Date(asOf) - new Date(lastChecked)) / msPerDay;
      return ageDays > rule.expectedFreshnessDays;
    })
    .map(([family, rule]) => ({ family, label: rule.label, cadence: rule.pollingCadence, overdueBy: lastCheckedAt[family] ? 'unknown' : 'never-checked' }));
}

export function highPriorityProviders() {
  const highAuth = ['official', 'standards'];
  return Object.values(PROVIDER_MONITOR_RULES)
    .filter((r) => highAuth.includes(r.authority))
    .sort((a, b) => a.pollingCadence.localeCompare(b.pollingCadence));
}

export function providerHealthSummary(lastCheckedAt = {}, asOf) {
  const overdue = overdueProviders(lastCheckedAt, asOf);
  const total = PROVIDER_FAMILIES.length;
  const uncovered = PROVIDER_FAMILIES.filter((f) => !PROVIDER_MONITOR_RULES[f]);
  return {
    total,
    covered: total - uncovered.length,
    uncovered,
    overdue: overdue.length,
    neverChecked: overdue.filter((o) => o.overdueBy === 'never-checked').length,
  };
}

export function normalizeObservation(observation, family) {
  const rule = PROVIDER_MONITOR_RULES[family];
  if (!rule) return observation;
  return {
    ...observation,
    normalizedAt: observation.at,
    family,
    authority: rule.authority,
    expectedFreshnessDays: rule.expectedFreshnessDays,
    normalizationRules: rule.normalizationRules,
    requiresCorroboration: rule.authority === 'community',
  };
}
