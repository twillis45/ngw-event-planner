// ─── Research Source Catalog (KMP-1 Bundle C) ─────────────────────────────────
// Named, trusted research sources with full metadata. This is the authoritative
// record of WHERE research comes from. providers.js defines the 16 family
// categories; sourceCatalog.js names the SPECIFIC SOURCES within each family.
//
// Never use sources blindly. Everything is observable. Commercial bias is explicit.
// Contradiction history is tracked. Nothing is treated as infallible.
//
// Authority ladder (from providers.js evidence.js): official > primary > standards >
// trade > expert > derived > community

import { PROVIDER_FAMILIES } from './providers';

// ── Source schema ──────────────────────────────────────────────────────────────
// Each source has: id, name, family, authority, domain[], coverage, reliability,
// freshnessPolicy, commercialBias, regionalScope[], seasonal, licensing,
// evidenceTypes[], confidenceContribution, url (domain only), knowledgeDomains[],
// notes

export const SOURCE_CATALOG = [

  // ── Government / Primary ──────────────────────────────────────────────────────
  {
    id: 'bls-cpi',
    name: 'BLS Consumer Price Index',
    family: 'government',
    authority: 'official',
    domain: ['food-pricing', 'general-consumer', 'cost-indices'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'monthly',
    commercialBias: 'none',
    regionalScope: ['national', 'dmv', 'northeast', 'southeast', 'south', 'midwest', 'west', 'southwest'],
    seasonal: true,
    licensing: 'public-domain',
    evidenceTypes: ['price-index', 'trend-data', 'cost-range'],
    confidenceContribution: 'high',
    url: 'bls.gov/cpi',
    knowledgeDomains: ['all'],
    notes: 'Released monthly. City-level indices available for major metros. CPI-U most applicable for home events. Methodology changes annually in January.',
  },
  {
    id: 'usda-ers',
    name: 'USDA Economic Research Service',
    family: 'government',
    authority: 'official',
    domain: ['food-pricing', 'food-production', 'agricultural-economics'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'monthly',
    commercialBias: 'none',
    regionalScope: ['national'],
    seasonal: true,
    licensing: 'public-domain',
    evidenceTypes: ['price-data', 'trend-data', 'market-reports'],
    confidenceContribution: 'high',
    url: 'ers.usda.gov',
    knowledgeDomains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations', 'cultural-traditions'],
    notes: 'Food price outlook report published monthly. Best source for commodity-level food pricing (beef, pork, seafood, produce). Use Food Expenditure Series for total food spending.',
  },
  {
    id: 'usda-fdc',
    name: 'USDA FoodData Central',
    family: 'government',
    authority: 'official',
    domain: ['food-composition', 'nutrition', 'food-safety'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'annual',
    commercialBias: 'none',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'public-domain',
    evidenceTypes: ['food-data', 'nutritional-facts', 'ingredient-info'],
    confidenceContribution: 'high',
    url: 'fdc.nal.usda.gov',
    knowledgeDomains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations'],
    notes: 'Authoritative source for food composition data. Use for dietary restriction guidance and allergen documentation.',
  },
  {
    id: 'fda-food-safety',
    name: 'FDA Food Safety',
    family: 'food-safety',
    authority: 'official',
    domain: ['food-safety', 'regulations', 'food-handling'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'annual',
    commercialBias: 'none',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'public-domain',
    evidenceTypes: ['regulatory-guidance', 'food-safety-rules', 'recall-alerts'],
    confidenceContribution: 'high',
    url: 'fda.gov/food',
    knowledgeDomains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations', 'cultural-traditions'],
    notes: 'Food Code updated every 4 years; guidance documents updated more frequently. Always cite specific section and year. Recall alerts searchable by product category.',
  },
  {
    id: 'cdc-food-safety',
    name: 'CDC Food Safety',
    family: 'food-safety',
    authority: 'official',
    domain: ['food-safety', 'illness-prevention', 'public-health'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'annual',
    commercialBias: 'none',
    regionalScope: ['national'],
    seasonal: true,
    licensing: 'public-domain',
    evidenceTypes: ['health-guidelines', 'outbreak-reports', 'prevention-guidance'],
    confidenceContribution: 'high',
    url: 'cdc.gov/foodsafety',
    knowledgeDomains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations'],
    notes: 'Best for illness-prevention guidance (temperature danger zone, cooling times). Seasonal foodborne illness data useful for contingency planning.',
  },
  {
    id: 'noaa-weather',
    name: 'NOAA Climate & Weather',
    family: 'weather',
    authority: 'official',
    domain: ['weather', 'climate-normals', 'extreme-weather'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'weekly',
    commercialBias: 'none',
    regionalScope: ['national', 'northeast', 'southeast', 'south', 'midwest', 'west', 'dmv', 'southwest'],
    seasonal: true,
    licensing: 'public-domain',
    evidenceTypes: ['climate-normals', 'heat-index', 'forecast-data', 'historical-weather'],
    confidenceContribution: 'high',
    url: 'weather.gov',
    knowledgeDomains: ['outdoor-cooking'],
    notes: 'Climate Normals (30-year averages) are the standard for seasonal planning. Use Heat Index charts for summer outdoor guidance. Regional Climate Centers for historical data.',
  },

  // ── Academic / Standards ───────────────────────────────────────────────────────
  {
    id: 'cornell-hospitality',
    name: 'Cornell Center for Hospitality Research',
    family: 'academic',
    authority: 'standards',
    domain: ['hospitality', 'food-service', 'event-planning'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'annual',
    commercialBias: 'low',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'open-access-some',
    evidenceTypes: ['research-reports', 'industry-benchmarks', 'operational-standards'],
    confidenceContribution: 'high',
    url: 'scholarship.sha.cornell.edu',
    knowledgeDomains: ['professional-events', 'milestone-celebrations', 'lifecycle-partnerships'],
    notes: 'Best academic source for hospitality operations. Reports often behind paywall; many available via university library access.',
  },
  {
    id: 'journal-of-foodservice',
    name: 'Journal of Foodservice',
    family: 'academic',
    authority: 'standards',
    domain: ['food-service', 'catering', 'food-safety'],
    coverage: 'international',
    reliability: 'high',
    freshnessPolicy: 'annual',
    commercialBias: 'none',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'paywall',
    evidenceTypes: ['research-studies', 'operational-data', 'food-safety-research'],
    confidenceContribution: 'medium',
    url: 'wiley.com/en-us/Journal+of+Foodservice-p-9780470672778',
    knowledgeDomains: ['outdoor-cooking', 'social-celebrations', 'intimate-gatherings'],
    notes: 'Use for food safety and operational research. International scope; filter for US-applicable findings.',
  },

  // ── Trade / Professional Organizations ────────────────────────────────────────
  {
    id: 'nra-research',
    name: 'National Restaurant Association',
    family: 'hospitality',
    authority: 'trade',
    domain: ['food-service', 'staffing', 'restaurant-operations', 'pricing'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'annual',
    commercialBias: 'medium',
    regionalScope: ['national'],
    seasonal: true,
    licensing: 'member-some-public',
    evidenceTypes: ['industry-reports', 'staffing-ratios', 'pricing-benchmarks', 'trend-data'],
    confidenceContribution: 'high',
    url: 'restaurant.org',
    knowledgeDomains: ['outdoor-cooking', 'social-celebrations', 'professional-events'],
    notes: 'Restaurant Industry Outlook annual report is the industry standard. Member-only content requires association access. ServSafe food safety certification widely cited.',
  },
  {
    id: 'ilea',
    name: 'International Live Events Association (ILEA)',
    family: 'event-industry',
    authority: 'trade',
    domain: ['event-planning', 'event-production', 'vendor-standards'],
    coverage: 'national-US',
    reliability: 'medium',
    freshnessPolicy: 'annual',
    commercialBias: 'medium',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'member-only',
    evidenceTypes: ['industry-standards', 'vendor-practices', 'professional-norms'],
    confidenceContribution: 'medium',
    url: 'ileahub.com',
    knowledgeDomains: ['professional-events', 'milestone-celebrations', 'lifecycle-partnerships'],
    notes: 'Best for professional event producer and vendor practices. Content largely member-only. Annual salary/rate surveys useful for vendor pricing.',
  },
  {
    id: 'nace',
    name: 'National Association for Catering and Events (NACE)',
    family: 'catering',
    authority: 'trade',
    domain: ['catering', 'event-planning', 'food-service'],
    coverage: 'national-US',
    reliability: 'medium',
    freshnessPolicy: 'annual',
    commercialBias: 'medium',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'member-some-public',
    evidenceTypes: ['catering-standards', 'pricing-norms', 'service-ratios'],
    confidenceContribution: 'medium',
    url: 'nace.net',
    knowledgeDomains: ['lifecycle-partnerships', 'professional-events', 'milestone-celebrations'],
    notes: 'Primary source for catering service standards. Rate benchmarks require member access. Local chapter data most applicable to regional research.',
  },
  {
    id: 'abc-consultants',
    name: 'Association of Bridal Consultants',
    family: 'event-industry',
    authority: 'trade',
    domain: ['weddings', 'event-planning', 'vendor-relations'],
    coverage: 'national-US',
    reliability: 'medium',
    freshnessPolicy: 'annual',
    commercialBias: 'high',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'member-some-public',
    evidenceTypes: ['industry-reports', 'wedding-pricing', 'planning-standards'],
    confidenceContribution: 'medium',
    url: 'bridalassn.com',
    knowledgeDomains: ['lifecycle-partnerships'],
    notes: 'High commercial bias — vendor-focused. Use for trend data and pricing ranges only. Cross-reference with government or academic data.',
  },
  {
    id: 'mpi',
    name: 'Meeting Professionals International (MPI)',
    family: 'event-industry',
    authority: 'trade',
    domain: ['corporate-events', 'meetings', 'conferences'],
    coverage: 'national-US',
    reliability: 'medium',
    freshnessPolicy: 'annual',
    commercialBias: 'medium',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'member-some-public',
    evidenceTypes: ['industry-reports', 'pricing-benchmarks', 'planning-standards'],
    confidenceContribution: 'medium',
    url: 'mpi.org',
    knowledgeDomains: ['professional-events'],
    notes: 'Primary source for corporate and association event standards. MeetingsNet annual report useful for pricing benchmarks.',
  },

  // ── Commercial / Wholesale ─────────────────────────────────────────────────────
  {
    id: 'sysco-pricing',
    name: 'Sysco Price Lists',
    family: 'wholesale',
    authority: 'trade',
    domain: ['food-pricing', 'wholesale', 'food-service'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'monthly',
    commercialBias: 'medium',
    regionalScope: ['national', 'northeast', 'southeast', 'south', 'midwest', 'west', 'dmv'],
    seasonal: true,
    licensing: 'account-required',
    evidenceTypes: ['wholesale-prices', 'quantity-pricing', 'market-basket-data'],
    confidenceContribution: 'high',
    url: 'sysco.com',
    knowledgeDomains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations', 'cultural-traditions'],
    notes: 'Account required for pricing. Regional distribution means prices vary by location. Best source for volume/quantity pricing at professional event scale.',
  },
  {
    id: 'restaurant-depot',
    name: 'Restaurant Depot',
    family: 'wholesale',
    authority: 'trade',
    domain: ['food-pricing', 'wholesale', 'supplies'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'monthly',
    commercialBias: 'low',
    regionalScope: ['northeast', 'southeast', 'south', 'midwest', 'dmv'],
    seasonal: true,
    licensing: 'business-account-required',
    evidenceTypes: ['wholesale-prices', 'retail-unit-prices'],
    confidenceContribution: 'high',
    url: 'restaurantdepot.com',
    knowledgeDomains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations'],
    notes: 'Cash-and-carry wholesale. Prices observable in-store or with account access. Excellent for crab, seafood, and meat pricing. Not in all markets.',
  },
  {
    id: 'costco-business',
    name: 'Costco Business Center',
    family: 'retail',
    authority: 'trade',
    domain: ['food-pricing', 'wholesale', 'bulk'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'monthly',
    commercialBias: 'low',
    regionalScope: ['national'],
    seasonal: true,
    licensing: 'membership-required',
    evidenceTypes: ['bulk-prices', 'retail-unit-prices'],
    confidenceContribution: 'high',
    url: 'costcobusinesscenter.com',
    knowledgeDomains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations'],
    notes: 'Membership required. Business Center differs from regular Costco (food-service bulk sizes). Use for host-accessible bulk pricing research.',
  },
  {
    id: 'gfs',
    name: 'Gordon Food Service (GFS)',
    family: 'wholesale',
    authority: 'trade',
    domain: ['food-pricing', 'wholesale', 'food-service'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'monthly',
    commercialBias: 'medium',
    regionalScope: ['midwest', 'northeast', 'southeast', 'south'],
    seasonal: true,
    licensing: 'account-required',
    evidenceTypes: ['wholesale-prices', 'quantity-pricing'],
    confidenceContribution: 'high',
    url: 'gfs.com',
    knowledgeDomains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations'],
    notes: 'Strong Midwest and Southeast presence. Consumer stores (GFS Marketplace) in some markets without account. Professional pricing requires distributor account.',
  },

  // ── Community / Regional ──────────────────────────────────────────────────────
  {
    id: 'community-forums',
    name: 'Regional Community Forums & Groups',
    family: 'community',
    authority: 'community',
    domain: ['regional-customs', 'pricing-norms', 'cultural-practices', 'vendor-recommendations'],
    coverage: 'regional-US',
    reliability: 'low',
    freshnessPolicy: 'monthly',
    commercialBias: 'low',
    regionalScope: ['dmv', 'northeast', 'southeast', 'south', 'midwest', 'west', 'southwest'],
    seasonal: true,
    licensing: 'public',
    evidenceTypes: ['community-reports', 'price-observations', 'cultural-norms', 'vendor-experiences'],
    confidenceContribution: 'low',
    url: 'reddit.com, facebook.com/groups',
    knowledgeDomains: ['outdoor-cooking', 'social-celebrations', 'cultural-traditions', 'intimate-gatherings'],
    notes: 'High variance in quality. Require corroboration from higher-authority source before generating KCR. Best for price observations and regional customs discovery. Always note the specific community/platform.',
    corroborationNote: 'Never single-source a community observation. Always pair with at least one trade or government source.',
  },
  {
    id: 'reddit-events',
    name: 'Reddit Event Planning Communities',
    family: 'community',
    authority: 'community',
    domain: ['event-planning', 'vendor-experiences', 'pricing-norms'],
    coverage: 'national-US',
    reliability: 'low',
    freshnessPolicy: 'monthly',
    commercialBias: 'low',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'public',
    evidenceTypes: ['community-reports', 'vendor-experiences', 'planning-tips'],
    confidenceContribution: 'low',
    url: 'reddit.com/r/weddingplanning, r/Cooking, r/BBQ',
    knowledgeDomains: ['social-celebrations', 'outdoor-cooking', 'lifecycle-partnerships'],
    notes: 'r/weddingplanning, r/Cooking, r/BBQ, r/CrabCakes most relevant. Use for discovery only; require corroboration.',
  },

  // ── Professional / SME ─────────────────────────────────────────────────────────
  {
    id: 'sme-network',
    name: 'Subject Matter Expert Network',
    family: 'sme',
    authority: 'expert',
    domain: ['event-planning', 'catering', 'cultural-traditions', 'food-service'],
    coverage: 'varies-by-expert',
    reliability: 'medium',
    freshnessPolicy: 'on_demand',
    commercialBias: 'varies',
    regionalScope: ['national', 'regional-varies'],
    seasonal: false,
    licensing: 'internal',
    evidenceTypes: ['expert-opinion', 'professional-experience', 'regional-knowledge'],
    confidenceContribution: 'medium',
    url: null,
    knowledgeDomains: ['all'],
    notes: 'Individual experts must be vetted and their credential level documented. Regional and specialty scope must be noted in evidence. Expert opinion alone is not sufficient for pricing KCRs.',
  },
  {
    id: 'insurance-iii',
    name: 'Insurance Information Institute',
    family: 'standards',
    authority: 'standards',
    domain: ['event-insurance', 'liability', 'risk-management'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'annual',
    commercialBias: 'medium',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'public',
    evidenceTypes: ['risk-data', 'insurance-requirements', 'liability-guidance'],
    confidenceContribution: 'medium',
    url: 'iii.org',
    knowledgeDomains: ['professional-events', 'outdoor-cooking', 'lifecycle-partnerships'],
    notes: 'Use for event liability insurance requirements and COI guidance. Some commercial bias as insurance industry trade group.',
  },
  {
    id: 'servsafe',
    name: 'ServSafe / NRA Food Safety',
    family: 'food-safety',
    authority: 'standards',
    domain: ['food-safety', 'food-handling', 'food-certification'],
    coverage: 'national-US',
    reliability: 'high',
    freshnessPolicy: 'annual',
    commercialBias: 'low',
    regionalScope: ['national'],
    seasonal: false,
    licensing: 'public-some-paywall',
    evidenceTypes: ['food-safety-standards', 'temperature-guidelines', 'handling-procedures'],
    confidenceContribution: 'high',
    url: 'servsafe.com',
    knowledgeDomains: ['outdoor-cooking', 'social-celebrations', 'intimate-gatherings', 'cultural-traditions'],
    notes: 'De facto national standard for food safety training. Temperature guidelines and time-temperature abuse standards widely applicable to event food guidance.',
  },
];

// ── Lookup utilities ──────────────────────────────────────────────────────────
export function getSource(id) {
  return SOURCE_CATALOG.find((s) => s.id === id) || null;
}

export function sourcesForDomain(knowledgeDomain) {
  return SOURCE_CATALOG.filter((s) =>
    s.knowledgeDomains.includes(knowledgeDomain) || s.knowledgeDomains.includes('all')
  );
}

export function sourcesForProvider(providerFamily) {
  return SOURCE_CATALOG.filter((s) => s.family === providerFamily);
}

export function sourcesForEvidenceType(evidenceType) {
  return SOURCE_CATALOG.filter((s) => (s.evidenceTypes || []).includes(evidenceType));
}

export function highReliabilitySources(minReliability = 'high') {
  const tier = { high: 3, medium: 2, low: 1 };
  const minTier = tier[minReliability] || 2;
  return SOURCE_CATALOG.filter((s) => (tier[s.reliability] || 0) >= minTier);
}

export function unbiasedSources() {
  return SOURCE_CATALOG.filter((s) => s.commercialBias === 'none' || s.commercialBias === 'low');
}

export function catalogSummary() {
  const byFamily = SOURCE_CATALOG.reduce((m, s) => {
    m[s.family] = (m[s.family] || 0) + 1;
    return m;
  }, {});
  const byAuthority = SOURCE_CATALOG.reduce((m, s) => {
    m[s.authority] = (m[s.authority] || 0) + 1;
    return m;
  }, {});
  const withCommercialBias = SOURCE_CATALOG.filter((s) => s.commercialBias !== 'none').length;
  const publicDomain = SOURCE_CATALOG.filter((s) => s.licensing === 'public-domain' || s.licensing === 'public').length;
  return {
    total: SOURCE_CATALOG.length,
    byFamily,
    byAuthority,
    withCommercialBias,
    publicDomain,
    governmentSources: byFamily['government'] || 0,
    unverifiedFamilies: PROVIDER_FAMILIES.filter((f) => !byFamily[f]),
  };
}

export function validateSource(source) {
  const required = ['id', 'name', 'family', 'authority', 'domain', 'coverage', 'reliability', 'freshnessPolicy', 'evidenceTypes', 'confidenceContribution'];
  const missing = required.filter((k) => !source[k]);
  const unknownFamily = !PROVIDER_FAMILIES.includes(source.family);
  return { valid: missing.length === 0 && !unknownFamily, missing, unknownFamily };
}
