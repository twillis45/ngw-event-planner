// ─── Provider Executors (KRE-1 Bundle B) ──────────────────────────────────────
// Per-family executor definitions for autonomous research execution.
//
// TWO modes:
//   simulate — generates realistic synthetic records from gap/blueprint context.
//              Used in development, testing, and the golden test suite.
//   inject   — expects records handed in by a backend agent (the production path).
//              The actual fetch is NEVER done inside the browser.
//
// GOVERNANCE — executors NEVER:
//   produce findings, KCRs, knowledge edits, or publishable values.
//   Executors produce ONLY raw records suitable for providers.js::normalizeToObservations().
//
// Each executor:
//   id          — matches a provider family (government, commercial, ...)
//   providers   — individual provider IDs this executor covers
//   buildQuery  — describes what to search/fetch (for backend hand-off)
//   simulate    — returns synthetic records in providers.js::acquire() record format
//   normalizeResponse — accepts raw response and returns normalized records

// ── Record shape (providers.js format) ───────────────────────────────────────
// { statement, source, url, gapType, fieldPath, region, extractedFacts, at }

function makeRecord(overrides) {
  return {
    statement: '',
    source: '',
    url: null,
    gapType: 'grounding',
    fieldPath: null,
    region: null,
    extractedFacts: [],
    at: null,
    ...overrides,
  };
}

// ── Simulation helpers ────────────────────────────────────────────────────────

// Extract a price range from a field path + blueprint (for pricing simulations).
function simulatedPriceRange(fieldPath, blueprint) {
  // Use the claim's numeric content if available
  if (blueprint?.claim) {
    const m = blueprint.claim.match(/\$?([\d.]+)[–\-–—]([\d.]+)/);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  }
  // Defaults by field path segment
  if ((fieldPath || '').includes('crab')) return [7.50, 8.25];
  if ((fieldPath || '').includes('ice'))  return [0.15, 0.25];
  if ((fieldPath || '').includes('beer')) return [1.25, 1.75];
  if ((fieldPath || '').includes('venue')) return [800, 2500];
  return [5.00, 15.00];
}

function today(asOf) {
  return asOf || new Date().toISOString().slice(0, 10);
}

// ── Executor Registry ─────────────────────────────────────────────────────────

export const EXECUTOR_REGISTRY = {

  // ── Government family ──────────────────────────────────────────────────────
  government: {
    id: 'government',
    providers: ['data.gov', 'noaa', 'astm-iso'],
    label: 'Government Agencies',
    buildQuery(gap, blueprint) {
      return {
        type: 'api',
        endpoint: 'https://opendata.fda.gov / https://www.ams.usda.gov/market-news',
        searchTerms: [gap.fieldLabel || gap.fieldPath, blueprint?.knowledgeType].filter(Boolean),
        datasetHint: 'BLS CPI, USDA Market News, NOAA Climate Data',
        authRequired: false,
        expectedFormat: 'json',
      };
    },
    simulate(gap, blueprint, { asOf }) {
      const field = gap.fieldPath || '';
      const [lo, hi] = simulatedPriceRange(field, blueprint);
      const kind = blueprint?.knowledgeType || gap.gapKind || 'pricing';
      if (kind === 'safety') {
        return [makeRecord({
          statement: `FDA food safety standard: ${gap.fieldLabel || field} — standard temperature controls apply. Storage < 40°F for perishables.`,
          source: 'data.gov',
          url: 'https://www.fda.gov/food/food-safety-modernization-act-fsma',
          gapType: 'safety',
          fieldPath: field,
          extractedFacts: [{ field, value: '< 40°F storage', confidence: 'high' }],
          at: today(asOf),
        })];
      }
      if (kind === 'weather') {
        return [makeRecord({
          statement: `NOAA historical: event-season outdoor temperatures average 72–88°F in the Mid-Atlantic. High humidity mid-summer.`,
          source: 'noaa',
          url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/',
          gapType: 'weather',
          fieldPath: field,
          extractedFacts: [{ field, value: '72–88°F outdoor', confidence: 'high' }],
          at: today(asOf),
        })];
      }
      return [makeRecord({
        statement: `USDA Market News: ${gap.fieldLabel || field} — regional average $${lo.toFixed(2)}–$${hi.toFixed(2)} per unit (seasonal survey ${asOf || 'current'}).`,
        source: 'data.gov',
        url: 'https://www.ams.usda.gov/market-news',
        gapType: kind,
        fieldPath: field,
        extractedFacts: [{ field, value: [lo, hi], confidence: 'high' }],
        at: today(asOf),
      })];
    },
    normalizeResponse(raw) { return Array.isArray(raw) ? raw : (raw?.records || []); },
  },

  // ── Food Safety family ─────────────────────────────────────────────────────
  'food-safety': {
    id: 'food-safety',
    providers: ['fda-foodsafety'],
    label: 'Food Safety Authorities',
    buildQuery(gap, blueprint) {
      return {
        type: 'rss-api',
        endpoint: 'https://opendata.fda.gov/food/enforcement',
        searchTerms: [gap.fieldLabel, 'food safety', 'handling'],
        datasetHint: 'FDA Food Enforcement, USDA FSIS, CDC Food Safety',
        authRequired: false,
        expectedFormat: 'json',
      };
    },
    simulate(gap, blueprint, { asOf }) {
      const field = gap.fieldPath || '';
      return [makeRecord({
        statement: `FDA food safety: proper handling for ${gap.fieldLabel || 'seafood'} requires cold-chain maintenance < 40°F. ServSafe standard temp 41°F max for raw seafood. No active recalls as of ${asOf || 'current date'}.`,
        source: 'fda-foodsafety',
        url: 'https://www.fda.gov/food/buy-store-serve-safe-food/safe-food-handling',
        gapType: 'safety',
        fieldPath: field,
        extractedFacts: [
          { field, value: '< 41°F storage', confidence: 'high' },
          { field: 'recall_status', value: 'none-active', confidence: 'high' },
        ],
        at: today(asOf),
      })];
    },
    normalizeResponse(raw) { return Array.isArray(raw) ? raw : (raw?.records || []); },
  },

  // ── Commercial family ──────────────────────────────────────────────────────
  commercial: {
    id: 'commercial',
    providers: ['market-pricing', 'retail', 'restaurant-depot'],
    label: 'Commercial Sources',
    buildQuery(gap, blueprint) {
      return {
        type: 'web-scrape-api',
        endpoint: 'market-pricing-api / retail-API / restaurant-depot-api',
        searchTerms: [gap.fieldLabel || gap.fieldPath, 'price', 'cost', 'unit'],
        datasetHint: 'Sysco, Restaurant Depot, local market pricing data',
        authRequired: true,
        expectedFormat: 'json',
      };
    },
    simulate(gap, blueprint, { asOf }) {
      const field = gap.fieldPath || '';
      const [lo, hi] = simulatedPriceRange(field, blueprint);
      const kind = blueprint?.knowledgeType || gap.gapKind || 'pricing';
      return [
        makeRecord({
          statement: `Market pricing survey: ${gap.fieldLabel || field} retail price $${lo.toFixed(2)}–$${hi.toFixed(2)}/unit at 3 DMV retailers (${asOf || 'current season'}).`,
          source: 'market-pricing',
          url: null,
          gapType: kind,
          fieldPath: field,
          extractedFacts: [{ field, value: [lo, hi], confidence: 'medium' }],
          at: today(asOf),
        }),
        makeRecord({
          statement: `Restaurant Depot wholesale pricing: ${gap.fieldLabel || field} bulk price $${(lo * 0.85).toFixed(2)}–$${(hi * 0.90).toFixed(2)}/unit for 10+ units (${asOf || 'current season'}).`,
          source: 'restaurant-depot',
          url: null,
          gapType: kind,
          fieldPath: field,
          extractedFacts: [{ field, value: [(lo * 0.85), (hi * 0.90)], confidence: 'medium' }],
          at: today(asOf),
        }),
      ];
    },
    normalizeResponse(raw) { return Array.isArray(raw) ? raw : (raw?.records || []); },
  },

  // ── Industry family ────────────────────────────────────────────────────────
  industry: {
    id: 'industry',
    providers: ['hospitality-assoc', 'event-industry', 'tourism-board', 'venue-network', 'catering-network', 'sme-network'],
    label: 'Industry Sources',
    buildQuery(gap, blueprint) {
      return {
        type: 'publication-api',
        endpoint: 'hospitality-assoc-publications / event-industry-reports',
        searchTerms: [gap.fieldLabel, 'industry standard', 'benchmark'],
        datasetHint: 'NACE, MPI Event Industry Council, National Restaurant Association',
        authRequired: true,
        expectedFormat: 'json',
      };
    },
    simulate(gap, blueprint, { asOf }) {
      const field = gap.fieldPath || '';
      const kind = blueprint?.knowledgeType || gap.gapKind || 'quantity';
      const [lo, hi] = simulatedPriceRange(field, blueprint);
      return [makeRecord({
        statement: `Industry standard (Hospitality Assoc. survey): ${gap.fieldLabel || field} — recommended ${kind === 'quantity' ? '1–1.5 per guest' : `$${lo.toFixed(2)}–$${hi.toFixed(2)}/unit`} for mid-scale events. Based on 850+ event operator survey.`,
        source: 'hospitality-assoc',
        url: null,
        gapType: kind,
        fieldPath: field,
        extractedFacts: [{ field, value: kind === 'quantity' ? [1.0, 1.5] : [lo, hi], confidence: 'medium' }],
        at: today(asOf),
      })];
    },
    normalizeResponse(raw) { return Array.isArray(raw) ? raw : (raw?.records || []); },
  },

  // ── Academic family ────────────────────────────────────────────────────────
  academic: {
    id: 'academic',
    providers: ['scholar'],
    label: 'Academic Sources',
    buildQuery(gap, blueprint) {
      return {
        type: 'api',
        endpoint: 'https://scholar.google.com / semanticscholar.org / crossref.org',
        searchTerms: [gap.fieldLabel, 'peer review', 'study'],
        datasetHint: 'Published food science, hospitality management, event planning research',
        authRequired: false,
        expectedFormat: 'json',
      };
    },
    simulate(gap, blueprint, { asOf }) {
      const field = gap.fieldPath || '';
      const kind = blueprint?.knowledgeType || gap.gapKind || 'quantity';
      return [makeRecord({
        statement: `Peer-reviewed study (J. Hospitality Management, 2024): ${gap.fieldLabel || field} — corroborates industry per-guest benchmarks. N=312 events. Statistical significance p < 0.05.`,
        source: 'scholar',
        url: 'https://www.sciencedirect.com/journal/international-journal-of-hospitality-management',
        gapType: kind,
        fieldPath: field,
        extractedFacts: [{ field, value: 'industry-standard-confirmed', confidence: 'high' }],
        at: today(asOf),
      })];
    },
    normalizeResponse(raw) { return Array.isArray(raw) ? raw : (raw?.records || []); },
  },

  // ── Community family ───────────────────────────────────────────────────────
  community: {
    id: 'community',
    providers: ['community-forums'],
    label: 'Community Sources',
    buildQuery(gap, blueprint) {
      return {
        type: 'forum-scrape',
        endpoint: 'reddit.com/r/Canning / weddingbee.com / theknot.com',
        searchTerms: [gap.fieldLabel, 'experience', 'tips', 'cost'],
        datasetHint: 'Event planning forums, food communities, local Facebook groups',
        authRequired: false,
        expectedFormat: 'html',
      };
    },
    simulate(gap, blueprint, { asOf }) {
      const field = gap.fieldPath || '';
      return [makeRecord({
        statement: `Community forum (r/eventplanning): multiple planners report ${gap.fieldLabel || field} costs running ~10–15% above published industry ranges in DMV metro. N=24 reports 2024–2025.`,
        source: 'community-forums',
        url: null,
        gapType: blueprint?.knowledgeType || gap.gapKind || 'regional',
        fieldPath: field,
        extractedFacts: [{ field, value: '+10–15% above industry average in DMV', confidence: 'low' }],
        at: today(asOf),
      })];
    },
    normalizeResponse(raw) { return Array.isArray(raw) ? raw : (raw?.records || []); },
  },

  // ── Internal family ────────────────────────────────────────────────────────
  internal: {
    id: 'internal',
    providers: ['internal-validation'],
    label: 'Internal Validation',
    buildQuery(gap, blueprint) {
      return {
        type: 'internal',
        endpoint: 'event-outcomes-db',
        searchTerms: [gap.fieldPath, gap.playbookType],
        datasetHint: 'Completed event data in the NGW event corpus',
        authRequired: false,
        expectedFormat: 'json',
      };
    },
    simulate(gap, blueprint, { asOf }) {
      // Internal validation is honest-empty until we have a real corpus.
      return [];
    },
    normalizeResponse(raw) { return Array.isArray(raw) ? raw : (raw?.records || []); },
  },
};

// ── Family group → executor ID mapping ───────────────────────────────────────
// Maps the UI group IDs from campaign.js::PROVIDER_FAMILIES to executor registry keys.
const FAMILY_GROUP_TO_EXECUTOR = {
  internal:    'internal',
  government:  'government',
  'food-safety': 'food-safety',
  commercial:  'commercial',
  industry:    'industry',
  academic:    'academic',
  community:   'community',
};

// ── Individual provider ID → executor ─────────────────────────────────────────
const PROVIDER_TO_EXECUTOR = {
  'data.gov':             'government',
  'noaa':                 'government',
  'astm-iso':             'government',
  'fda-foodsafety':       'food-safety',
  'market-pricing':       'commercial',
  'retail':               'commercial',
  'restaurant-depot':     'commercial',
  'hospitality-assoc':    'industry',
  'event-industry':       'industry',
  'tourism-board':        'industry',
  'venue-network':        'industry',
  'catering-network':     'industry',
  'sme-network':          'industry',
  'scholar':              'academic',
  'community-forums':     'community',
  'internal-validation':  'internal',
};

// ── executeProvider ───────────────────────────────────────────────────────────
// Execute one provider.
//   mode: 'simulate' — generate synthetic records (testing / demo)
//   mode: 'inject'   — use `injected` records from caller (production path)
//
// Returns: records[] in providers.js record format.
// Throws on unexpected failure so campaignRunner.js can classify + retry.
export function executeProvider(providerId, gap, blueprint, {
  mode = 'simulate',
  asOf = null,
  injected = null,  // pre-fetched records (for 'inject' mode)
} = {}) {
  const executorId = PROVIDER_TO_EXECUTOR[providerId] || FAMILY_GROUP_TO_EXECUTOR[providerId];
  if (!executorId) {
    throw new Error(`executeProvider: no executor registered for provider '${providerId}'`);
  }
  const executor = EXECUTOR_REGISTRY[executorId];
  if (!executor) {
    throw new Error(`executeProvider: executor '${executorId}' not found in registry`);
  }

  if (mode === 'inject') {
    if (!injected) return [];
    return executor.normalizeResponse(injected);
  }

  // Simulate mode
  const raw = executor.simulate(gap, blueprint, { asOf });
  return executor.normalizeResponse(raw);
}

// ── buildQuery ────────────────────────────────────────────────────────────────
// Returns the query specification a backend agent should execute for this provider.
export function buildQuery(providerId, gap, blueprint) {
  const executorId = PROVIDER_TO_EXECUTOR[providerId] || FAMILY_GROUP_TO_EXECUTOR[providerId];
  const executor = EXECUTOR_REGISTRY[executorId];
  if (!executor) return null;
  return executor.buildQuery(gap, blueprint);
}

// ── executorFor ───────────────────────────────────────────────────────────────
export function executorFor(providerId) {
  const executorId = PROVIDER_TO_EXECUTOR[providerId] || FAMILY_GROUP_TO_EXECUTOR[providerId];
  return EXECUTOR_REGISTRY[executorId] || null;
}

// ── All known executor IDs ────────────────────────────────────────────────────
export const EXECUTOR_IDS = Object.keys(EXECUTOR_REGISTRY);
