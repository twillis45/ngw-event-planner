// ─── Research Playbooks (KMP-1 Bundle B) ──────────────────────────────────────
// Named, reusable research workflows. A research playbook is higher-level than a
// campaign template: it defines the GOAL ("Government Pricing Refresh"), the
// provider families to consult, the corroboration requirements, the freshness
// policy, and the review path. Campaign templates are action patterns; research
// playbooks are production workflows that compose campaign templates.
//
// Pure static data. Nothing executes here. The pipeline manifest (researchPipeline.js)
// tracks execution; the campaign system (campaign.js) handles acquisition.

import { PROVIDER_FAMILIES } from './providers';

export const FRESHNESS_POLICIES = {
  weekly:     { label: 'Weekly',     maxAgeDays: 7,   triggerMode: 'scheduled' },
  monthly:    { label: 'Monthly',    maxAgeDays: 30,  triggerMode: 'scheduled' },
  quarterly:  { label: 'Quarterly',  maxAgeDays: 90,  triggerMode: 'scheduled' },
  biannual:   { label: 'Bi-Annual',  maxAgeDays: 180, triggerMode: 'scheduled' },
  annual:     { label: 'Annual',     maxAgeDays: 365, triggerMode: 'scheduled' },
  event:      { label: 'Per-Event',  maxAgeDays: null, triggerMode: 'event-driven' },
  on_demand:  { label: 'On Demand',  maxAgeDays: null, triggerMode: 'manual' },
};

export const RESEARCH_PLAYBOOKS = [
  // ── Pricing ──────────────────────────────────────────────────────────────────
  {
    id: 'govt-pricing-refresh',
    name: 'Government Pricing Refresh',
    objective: 'Update cost estimates using official BLS CPI and USDA ERS price indices. Ground unit cost ranges in government-tracked market data.',
    providerFamilies: ['government', 'academic'],
    campaignTemplates: ['government-data', 'academic-grounding'],
    expectedEvidenceCount: 5,
    corroborationRequired: 2,
    freshnessPolicy: 'quarterly',
    reviewPath: 'governance-cadence',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Verify prices against at minimum 2 government sources. Note CPI methodology changes in provenance.',
    knowledgeDimensions: ['Grounding', 'Freshness'],
    targetGapTypes: ['pricing', 'cost-factor'],
    estimatedHours: 2,
    domains: ['outdoor-cooking', 'milestone-celebrations', 'intimate-gatherings', 'social-celebrations'],
  },
  {
    id: 'wholesale-market-refresh',
    name: 'Wholesale Market Refresh',
    objective: 'Update commercial pricing from restaurant supply distributors (Sysco, GFS, Restaurant Depot). Capture bulk pricing for quantity-at-scale events.',
    providerFamilies: ['wholesale', 'commercial-pricing'],
    campaignTemplates: ['price-discovery', 'wholesale-grounding'],
    expectedEvidenceCount: 8,
    corroborationRequired: 2,
    freshnessPolicy: 'quarterly',
    reviewPath: 'commercial-reviewer',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Cross-reference at least 2 wholesale distributors. Document regional variation.',
    knowledgeDimensions: ['Grounding', 'Commercial', 'Regional'],
    targetGapTypes: ['pricing', 'quantity'],
    estimatedHours: 3,
    domains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations'],
  },
  {
    id: 'retail-price-survey',
    name: 'Retail Price Survey',
    objective: 'Capture consumer-level pricing from major retail chains (Costco, Kroger, Walmart, Harris Teeter) to bound host purchase costs.',
    providerFamilies: ['retail', 'community'],
    campaignTemplates: ['price-discovery', 'price-freshness'],
    expectedEvidenceCount: 10,
    corroborationRequired: 3,
    freshnessPolicy: 'quarterly',
    reviewPath: 'commercial-reviewer',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Capture prices from ≥3 retail chains in ≥2 regions. Note seasonal variation in survey period.',
    knowledgeDimensions: ['Grounding', 'Commercial', 'Regional', 'Seasonal'],
    targetGapTypes: ['pricing'],
    estimatedHours: 4,
    domains: ['outdoor-cooking', 'intimate-gatherings', 'social-celebrations', 'cultural-traditions'],
  },

  // ── Food Safety ───────────────────────────────────────────────────────────────
  {
    id: 'food-safety-review',
    name: 'Food Safety Review',
    objective: 'Validate food handling, temperature, timing, and storage guidance against current FDA, USDA, and CDC food safety standards.',
    providerFamilies: ['food-safety', 'government', 'standards'],
    campaignTemplates: ['food-safety-review', 'regulation-check'],
    expectedEvidenceCount: 6,
    corroborationRequired: 2,
    freshnessPolicy: 'annual',
    reviewPath: 'food-safety-reviewer',
    publicationRules: ['requires-review', 'no-auto-publish', 'requires-food-safety-sign-off'],
    validationExpectations: 'Cite specific FDA food code section or USDA guideline. Flag any year-over-year changes.',
    knowledgeDimensions: ['Grounding', 'Freshness', 'Professional'],
    targetGapTypes: ['food-safety', 'operational'],
    estimatedHours: 3,
    domains: ['outdoor-cooking', 'social-celebrations', 'cultural-traditions', 'intimate-gatherings'],
  },
  {
    id: 'fda-recall-sweep',
    name: 'FDA Recall Review',
    objective: 'Scan for active or recent FDA recalls affecting event food purchases. Flag any items in active playbook purchases that appear in recalls.',
    providerFamilies: ['food-safety', 'government'],
    campaignTemplates: ['recall-check'],
    expectedEvidenceCount: 2,
    corroborationRequired: 1,
    freshnessPolicy: 'monthly',
    reviewPath: 'food-safety-reviewer',
    publicationRules: ['requires-review', 'no-auto-publish', 'requires-food-safety-sign-off'],
    validationExpectations: 'Cite FDA recall number and date. If no active recalls affect playbooks, document date of scan.',
    knowledgeDimensions: ['Freshness', 'Grounding'],
    targetGapTypes: ['food-safety'],
    estimatedHours: 1,
    domains: ['outdoor-cooking', 'social-celebrations', 'intimate-gatherings'],
  },

  // ── Weather & Outdoor ──────────────────────────────────────────────────────────
  {
    id: 'noaa-weather-readiness',
    name: 'NOAA Weather Readiness',
    objective: 'Update outdoor event weather contingency guidance using NOAA climate normals and heat/cold index recommendations.',
    providerFamilies: ['weather', 'government'],
    campaignTemplates: ['weather-grounding'],
    expectedEvidenceCount: 4,
    corroborationRequired: 1,
    freshnessPolicy: 'annual',
    reviewPath: 'governance-cadence',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Reference specific NOAA data product (Climate Normals, Heat Index, etc.). Note region and season scope.',
    knowledgeDimensions: ['Grounding', 'Seasonal', 'Regional'],
    targetGapTypes: ['weather', 'contingency'],
    estimatedHours: 2,
    domains: ['outdoor-cooking'],
  },

  // ── Regulatory & Permits ───────────────────────────────────────────────────────
  {
    id: 'legal-permit-review',
    name: 'Legal & Permit Review',
    objective: 'Survey permit requirements for temporary food events, open fires, amplified music, and alcohol service by jurisdiction.',
    providerFamilies: ['government', 'standards'],
    campaignTemplates: ['permit-survey', 'regulation-check'],
    expectedEvidenceCount: 5,
    corroborationRequired: 1,
    freshnessPolicy: 'annual',
    reviewPath: 'governance-cadence',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Note jurisdiction (city/county/state). Flag year-over-year changes. Always marked as requiring local verification.',
    knowledgeDimensions: ['Grounding', 'Regional'],
    targetGapTypes: ['regulatory', 'operational'],
    estimatedHours: 4,
    domains: ['outdoor-cooking', 'milestone-celebrations', 'professional-events'],
  },

  // ── Hospitality & Standards ────────────────────────────────────────────────────
  {
    id: 'hospitality-standards',
    name: 'Hospitality Standards Review',
    objective: 'Update service ratios, staffing standards, and hospitality norms from authoritative trade sources (NACE, ILEA, NRA).',
    providerFamilies: ['hospitality', 'event-industry', 'catering'],
    campaignTemplates: ['industry-standard', 'sme-interview'],
    expectedEvidenceCount: 6,
    corroborationRequired: 2,
    freshnessPolicy: 'annual',
    reviewPath: 'domain-expert',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Cite specific association publication or year. Note member-access-only sources.',
    knowledgeDimensions: ['Grounding', 'Professional', 'Operational'],
    targetGapTypes: ['staffing', 'operational'],
    estimatedHours: 3,
    domains: ['milestone-celebrations', 'professional-events', 'lifecycle-partnerships'],
  },
  {
    id: 'venue-standards-review',
    name: 'Venue Standards Review',
    objective: 'Document venue requirements: COI minimums, load-in timing, noise ordinances, catering exclusivity rules, ADA compliance.',
    providerFamilies: ['venue', 'hospitality'],
    campaignTemplates: ['venue-survey'],
    expectedEvidenceCount: 5,
    corroborationRequired: 1,
    freshnessPolicy: 'annual',
    reviewPath: 'domain-expert',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Note venue type (private home, commercial, public park) and scale tier. Flag when requirements vary by jurisdiction.',
    knowledgeDimensions: ['Grounding', 'Professional'],
    targetGapTypes: ['venue', 'logistical'],
    estimatedHours: 3,
    domains: ['professional-events', 'lifecycle-partnerships', 'milestone-celebrations'],
  },

  // ── Accessibility ──────────────────────────────────────────────────────────────
  {
    id: 'accessibility-review',
    name: 'Accessibility Review',
    objective: 'Survey ADA compliance requirements and inclusive planning best practices for events at various venue types.',
    providerFamilies: ['standards', 'government'],
    campaignTemplates: ['accessibility-survey'],
    expectedEvidenceCount: 4,
    corroborationRequired: 1,
    freshnessPolicy: 'biannual',
    reviewPath: 'domain-expert',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Reference ADA title and section. Note non-binding best practice vs. legal requirement.',
    knowledgeDimensions: ['Grounding', 'Professional', 'Accessibility'],
    targetGapTypes: ['accessibility'],
    estimatedHours: 2,
    domains: ['professional-events', 'milestone-celebrations', 'social-celebrations'],
  },

  // ── Vendor & Commercial ────────────────────────────────────────────────────────
  {
    id: 'vendor-landscape-survey',
    name: 'Vendor Landscape Survey',
    objective: 'Map active vendor categories, typical pricing tiers, booking lead times, and deposit norms by event type and market.',
    providerFamilies: ['event-industry', 'catering', 'commercial-pricing', 'sme'],
    campaignTemplates: ['vendor-survey', 'sme-interview'],
    expectedEvidenceCount: 8,
    corroborationRequired: 2,
    freshnessPolicy: 'annual',
    reviewPath: 'commercial-reviewer',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Document market (metro area) and vendor tier. Do not cite specific vendor names as canonical.',
    knowledgeDimensions: ['Commercial', 'Regional', 'Professional'],
    targetGapTypes: ['vendor', 'commercial'],
    estimatedHours: 4,
    domains: ['lifecycle-partnerships', 'milestone-celebrations', 'professional-events'],
  },
  {
    id: 'commercial-pricing-survey',
    name: 'Commercial Pricing Survey',
    objective: 'Capture catering and event service pricing from commercial providers. Establish per-head ranges by event type and service level.',
    providerFamilies: ['catering', 'event-industry', 'commercial-pricing'],
    campaignTemplates: ['price-discovery', 'vendor-survey'],
    expectedEvidenceCount: 10,
    corroborationRequired: 3,
    freshnessPolicy: 'biannual',
    reviewPath: 'commercial-reviewer',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Include ≥3 market regions. Document service level (drop-off, full-service, etc.). Note outliers.',
    knowledgeDimensions: ['Commercial', 'Regional', 'Grounding'],
    targetGapTypes: ['pricing', 'vendor'],
    estimatedHours: 5,
    domains: ['lifecycle-partnerships', 'professional-events', 'milestone-celebrations'],
  },

  // ── Professional Practice ─────────────────────────────────────────────────────
  {
    id: 'planner-practices',
    name: 'Professional Planner Practices',
    objective: 'Document workflow, checklist, and coordination standards used by professional event planners. Ground operational guidance in professional norms.',
    providerFamilies: ['event-industry', 'sme', 'hospitality'],
    campaignTemplates: ['sme-interview', 'industry-standard'],
    expectedEvidenceCount: 6,
    corroborationRequired: 2,
    freshnessPolicy: 'annual',
    reviewPath: 'domain-expert',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Identify planner credential level (certified, experienced, entry-level). Document event type scope.',
    knowledgeDimensions: ['Professional', 'Operational', 'Grounding'],
    targetGapTypes: ['operational', 'planner-guidance'],
    estimatedHours: 4,
    domains: ['lifecycle-partnerships', 'professional-events', 'milestone-celebrations'],
  },

  // ── Regional & Cultural ────────────────────────────────────────────────────────
  {
    id: 'regional-customs',
    name: 'Regional Customs & Traditions',
    objective: 'Document regional variations in food customs, event timing, menu expectations, and cultural norms by US region.',
    providerFamilies: ['community', 'sme', 'academic'],
    campaignTemplates: ['regional-grounding', 'sme-interview'],
    expectedEvidenceCount: 8,
    corroborationRequired: 2,
    freshnessPolicy: 'biannual',
    reviewPath: 'domain-expert',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Corroborate community sources with SME or academic source. Note geographic specificity.',
    knowledgeDimensions: ['Regional', 'Cultural', 'Grounding'],
    targetGapTypes: ['cultural', 'regional'],
    estimatedHours: 3,
    domains: ['outdoor-cooking', 'cultural-traditions', 'social-celebrations'],
  },
  {
    id: 'cultural-review',
    name: 'Cultural Traditions Review',
    objective: 'Update cultural event knowledge: traditions, must-have elements, menu requirements, protocols, and significance for culturally specific events.',
    providerFamilies: ['community', 'sme', 'academic'],
    campaignTemplates: ['cultural-grounding', 'sme-interview'],
    expectedEvidenceCount: 6,
    corroborationRequired: 2,
    freshnessPolicy: 'biannual',
    reviewPath: 'domain-expert',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Require SME from within the cultural tradition. Do not rely solely on external academic sources.',
    knowledgeDimensions: ['Cultural', 'Grounding', 'Regional'],
    targetGapTypes: ['cultural'],
    estimatedHours: 4,
    domains: ['cultural-traditions'],
  },
  {
    id: 'seasonal-planning',
    name: 'Seasonal Planning Review',
    objective: 'Update seasonal adjustments: peak-season pricing, weather-related modifications, seasonal ingredient availability and pricing.',
    providerFamilies: ['government', 'commercial-pricing', 'academic', 'weather'],
    campaignTemplates: ['seasonal-grounding', 'government-data'],
    expectedEvidenceCount: 5,
    corroborationRequired: 2,
    freshnessPolicy: 'biannual',
    reviewPath: 'governance-cadence',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Document season and region explicitly. Cross-reference BLS seasonal price data with retail observations.',
    knowledgeDimensions: ['Seasonal', 'Regional', 'Commercial'],
    targetGapTypes: ['seasonal', 'pricing'],
    estimatedHours: 3,
    domains: ['outdoor-cooking', 'social-celebrations', 'intimate-gatherings'],
  },

  // ── Operational Depth ─────────────────────────────────────────────────────────
  {
    id: 'operational-best-practices',
    name: 'Operational Best Practices',
    objective: 'Document setup, staffing, timing, and execution best practices from experienced operators and professional coordinators.',
    providerFamilies: ['event-industry', 'catering', 'sme'],
    campaignTemplates: ['sme-interview', 'industry-standard'],
    expectedEvidenceCount: 6,
    corroborationRequired: 2,
    freshnessPolicy: 'annual',
    reviewPath: 'domain-expert',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Document operator experience level. Cross-reference ≥2 independent operators for key procedures.',
    knowledgeDimensions: ['Operational', 'Professional', 'Grounding'],
    targetGapTypes: ['operational'],
    estimatedHours: 4,
    domains: ['outdoor-cooking', 'milestone-celebrations', 'professional-events'],
  },
  {
    id: 'failure-pattern-investigation',
    name: 'Failure Pattern Investigation',
    objective: 'Surface common event failure patterns from failure records, SME interviews, and community sources. Generate KCRs for high-impact failure categories.',
    providerFamilies: ['sme', 'community', 'event-industry'],
    campaignTemplates: ['failure-analysis', 'sme-interview'],
    expectedEvidenceCount: 8,
    corroborationRequired: 2,
    freshnessPolicy: 'quarterly',
    reviewPath: 'domain-expert',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Require ≥2 independent reports of same failure pattern before generating KCR. Never publish single-source failure findings.',
    knowledgeDimensions: ['Operational', 'Grounding', 'Professional'],
    targetGapTypes: ['operational', 'contingency'],
    estimatedHours: 3,
    domains: ['outdoor-cooking', 'lifecycle-partnerships', 'professional-events'],
  },
  {
    id: 'competitive-landscape',
    name: 'Competitive Landscape',
    objective: 'Survey competing event planning platforms and catering services for feature, pricing, and UX benchmarks.',
    providerFamilies: ['commercial-pricing', 'event-industry', 'community'],
    campaignTemplates: ['competitive-survey'],
    expectedEvidenceCount: 8,
    corroborationRequired: 2,
    freshnessPolicy: 'biannual',
    reviewPath: 'governance-cadence',
    publicationRules: ['requires-review', 'no-auto-publish'],
    validationExpectations: 'Document observation date and competitor version. Do not use competitive findings as canonical operational guidance.',
    knowledgeDimensions: ['Commercial'],
    targetGapTypes: ['commercial'],
    estimatedHours: 4,
    domains: ['professional-events'],
  },
];

// ── Lookup utilities ──────────────────────────────────────────────────────────
export function getResearchPlaybook(id) {
  return RESEARCH_PLAYBOOKS.find((p) => p.id === id) || null;
}

export function suggestPlaybooks(gapType) {
  return RESEARCH_PLAYBOOKS.filter((p) => (p.targetGapTypes || []).includes(gapType));
}

export function playbooksForDomain(domainId) {
  return RESEARCH_PLAYBOOKS.filter((p) => (p.domains || []).includes(domainId));
}

export function playbooksForProvider(providerFamily) {
  return RESEARCH_PLAYBOOKS.filter((p) => (p.providerFamilies || []).includes(providerFamily));
}

export function validatePlaybook(playbook) {
  const required = ['id', 'name', 'objective', 'providerFamilies', 'corroborationRequired', 'freshnessPolicy', 'reviewPath'];
  const missing = required.filter((k) => !playbook[k]);
  const unknownProviders = (playbook.providerFamilies || []).filter((f) => !PROVIDER_FAMILIES.includes(f));
  return {
    valid: missing.length === 0 && unknownProviders.length === 0,
    missing,
    unknownProviders,
  };
}
