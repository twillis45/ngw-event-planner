// ─── Acquisition Providers (KEP-2 Bundle A) ───────────────────────────────────
// The production acquisition framework. A Provider produces ONLY Observations — never
// findings, never KCRs, never edits. External providers normalize FETCHED source records
// (the fetch itself is executed by an agent/backend and handed in — the app never crawls);
// internal providers derive from our own estate. Pure. Reuses createObservation/evidence
// authority levels. No new registry (this is the KAS pipeline set, made production).

import { createObservation } from './observation';
import { createEvidence, AUTHORITY_LEVELS } from './evidence';

export const PROVIDER_FAMILIES = [
  'government', 'academic', 'standards', 'food-safety', 'weather', 'hospitality',
  'event-industry', 'commercial-pricing', 'retail', 'wholesale', 'tourism', 'venue',
  'catering', 'sme', 'internal-validation', 'community',
];
export const TRIGGER_MODES = ['manual', 'scheduled', 'event-driven', 'administrator', 'campaign'];

// Default authority + freshness per family (evidence expiry inherits from these).
export const FAMILY_DEFAULTS = {
  government: { authorityLevel: 'primary', freshnessDays: 365 },
  academic: { authorityLevel: 'standards', freshnessDays: 730 },
  standards: { authorityLevel: 'standards', freshnessDays: 365 },
  'food-safety': { authorityLevel: 'primary', freshnessDays: 180 },
  weather: { authorityLevel: 'official', freshnessDays: 7 },
  hospitality: { authorityLevel: 'trade', freshnessDays: 180 },
  'event-industry': { authorityLevel: 'trade', freshnessDays: 180 },
  'commercial-pricing': { authorityLevel: 'trade', freshnessDays: 45 },
  retail: { authorityLevel: 'trade', freshnessDays: 45 },
  wholesale: { authorityLevel: 'trade', freshnessDays: 45 },
  tourism: { authorityLevel: 'trade', freshnessDays: 180 },
  venue: { authorityLevel: 'trade', freshnessDays: 180 },
  catering: { authorityLevel: 'trade', freshnessDays: 180 },
  sme: { authorityLevel: 'expert', freshnessDays: 365 },
  'internal-validation': { authorityLevel: 'derived', freshnessDays: 90 },
  community: { authorityLevel: 'community', freshnessDays: 30 },
};

export function makeProvider({ id, family, acquire, authorityLevel, freshnessDays }) {
  if (!PROVIDER_FAMILIES.includes(family)) throw new Error(`Provider: unknown family '${family}'`);
  const def = FAMILY_DEFAULTS[family];
  return {
    id, family,
    authorityLevel: authorityLevel || def.authorityLevel,
    freshnessDays: freshnessDays != null ? freshnessDays : def.freshnessDays,
    trust: def.authorityLevel,                        // display: the family's baseline trust
    acquire: typeof acquire === 'function' ? acquire : () => [],  // → Observation[] ONLY
  };
}

// Normalize FETCHED source records into Observations (the external-provider contract).
// records: [{ statement, source, url, assetId, fieldPath, region, gapType, extractedFacts }]
export function normalizeToObservations(records, { source, at }) {
  return (records || []).map((r) => createObservation({
    kind: r.gapType === 'safety' ? 'regulation' : r.kind || 'pricing',
    statement: r.statement,
    source: r.source || source,
    gapType: r.gapType || 'pricing',
    assetId: r.assetId || null,
    fieldPath: r.fieldPath || null,
    region: r.region || null,
    at,
  }));
}

// The fetched records also carry the raw evidence facts — turn them into KnowledgeEvidence
// (the provider surfaces both the observation AND the candidate evidence it saw).
export function recordsToEvidence(records, provider, { at }) {
  return (records || []).map((r) => createEvidence({
    source: r.source || provider.id,
    sourceType: familyToSourceType(provider.family),
    authorityLevel: provider.authorityLevel,
    url: r.url || null, excerpt: r.excerpt || null,
    assetId: r.assetId || null, fieldPath: r.fieldPath || null, region: r.region || null,
    extractedFacts: r.extractedFacts || [],
    effectiveDate: at,
    expirationDate: addDays(at, provider.freshnessDays),
    at,
  }));
}

function familyToSourceType(family) {
  if (family === 'government' || family === 'standards' || family === 'food-safety' || family === 'weather') return 'official';
  if (family === 'commercial-pricing' || family === 'retail' || family === 'wholesale') return 'commercial';
  if (family === 'sme') return 'expert';
  if (family === 'internal-validation') return 'event';
  if (family === 'community') return 'community';
  return 'industry';
}
function addDays(iso, days) { if (!iso || days == null) return null; const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }

// ── The declared production providers (one per family). External families normalize
// handed-in fetched records; internal-validation derives from the estate (honest-empty). ──
export function buildProviders({ validationOutcomes = [] } = {}) {
  const external = (id, family) => makeProvider({ id, family, acquire: ({ records, at }) => normalizeToObservations(records, { source: id, at }) });
  return [
    external('data.gov', 'government'),
    external('scholar', 'academic'),
    external('astm-iso', 'standards'),
    external('fda-foodsafety', 'food-safety'),
    external('noaa', 'weather'),
    external('hospitality-assoc', 'hospitality'),
    external('event-industry', 'event-industry'),
    external('market-pricing', 'commercial-pricing'),
    external('retail', 'retail'),
    external('restaurant-depot', 'wholesale'),
    external('tourism-board', 'tourism'),
    external('venue-network', 'venue'),
    external('catering-network', 'catering'),
    external('sme-network', 'sme'),
    external('community-forums', 'community'),
    // Internal-validation is real: it observes our own event outcomes (honest-empty now).
    makeProvider({ id: 'internal-validation', family: 'internal-validation', acquire: ({ at }) =>
      (validationOutcomes || []).map((o) => createObservation({ kind: 'event-failed', statement: o.statement || 'validation signal', source: 'internal-validation', gapType: o.gapType || 'quality', assetId: o.assetId || null, fieldPath: o.fieldPath || null, at })) }),
  ];
}

export { AUTHORITY_LEVELS };
