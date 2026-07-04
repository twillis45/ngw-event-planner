// ─── Campaign Templates (KOP-1 Bundle D) ───────────────────────────────────────
// Reusable campaign patterns — each template pre-configures providers, priority,
// trigger, and field-path patterns so the operator can launch from intent rather
// than configuration. Pure static data. Compose with createCampaign(); do not add
// lifecycle or stores here.

// fieldPathPattern: substring that a FieldPath must contain to match this template.
// Null = template is field-agnostic (applies to any field).
export const CAMPAIGN_TEMPLATES = [
  {
    id: 'price-discovery',
    label: 'Price Discovery',
    description: 'Research current market prices for a purchase item.',
    gapTypes: ['pricing'],
    fieldPathPattern: 'unitCostRange',
    defaultProviders: ['market-pricing', 'retail', 'community-forums'],
    defaultPriority: 'high',
    defaultTrigger: 'research',
    tags: ['pricing', 'market'],
  },
  {
    id: 'price-freshness',
    label: 'Price Freshness Check',
    description: 'Validate that existing prices are still current (post-season or annual refresh).',
    gapTypes: ['pricing'],
    fieldPathPattern: 'unitCostRange',
    defaultProviders: ['market-pricing', 'retail'],
    defaultPriority: 'med',
    defaultTrigger: 'freshness',
    tags: ['pricing', 'freshness'],
  },
  {
    id: 'cost-factor-grounding',
    label: 'Cost Factor Grounding',
    description: 'Ground decision-branch cost multipliers in observed market data (e.g., jumbo vs. large crab ratio).',
    gapTypes: ['cost-factor'],
    fieldPathPattern: 'costFactors',
    defaultProviders: ['market-pricing', 'retail', 'restaurant-depot'],
    defaultPriority: 'high',
    defaultTrigger: 'research',
    tags: ['cost-factor', 'pricing'],
  },
  {
    id: 'qty-per-guest-grounding',
    label: 'Qty-per-Guest Grounding',
    description: 'Validate quantity-per-guest ratios against hospitality industry norms.',
    gapTypes: ['quantity'],
    fieldPathPattern: 'qtyPerGuest',
    defaultProviders: ['hospitality-assoc', 'catering-network', 'community-forums'],
    defaultPriority: 'med',
    defaultTrigger: 'sme',
    tags: ['quantity', 'hospitality'],
  },
  {
    id: 'food-safety-review',
    label: 'Food Safety Review',
    description: 'SME or regulatory review of handling, temp, and storage practices.',
    gapTypes: ['safety'],
    fieldPathPattern: 'risks',
    defaultProviders: ['fda-foodsafety', 'sme-network'],
    defaultPriority: 'high',
    defaultTrigger: 'sme',
    tags: ['food-safety', 'regulation'],
  },
  {
    id: 'sourcing-options',
    label: 'Sourcing Options Research',
    description: 'Research where to source: retail vs. wholesale vs. direct from vendor.',
    gapTypes: ['pricing', 'sourcing'],
    fieldPathPattern: null,
    defaultProviders: ['market-pricing', 'retail', 'restaurant-depot', 'community-forums'],
    defaultPriority: 'med',
    defaultTrigger: 'research',
    tags: ['sourcing', 'pricing'],
  },
  {
    id: 'governance-cadence',
    label: 'Governance Cadence',
    description: 'Set or update the review cadence for a playbook lacking governance.',
    gapTypes: ['governance'],
    fieldPathPattern: 'governance',
    defaultProviders: ['internal-validation', 'sme-network'],
    defaultPriority: 'low',
    defaultTrigger: 'freshness',
    tags: ['governance'],
  },
  {
    id: 'vendor-network-check',
    label: 'Vendor Network Check',
    description: 'Research which vendors serve this event type (via venue-network or catering-network).',
    gapTypes: ['sourcing'],
    fieldPathPattern: 'vendors',
    defaultProviders: ['venue-network', 'catering-network', 'event-industry'],
    defaultPriority: 'med',
    defaultTrigger: 'research',
    tags: ['vendor', 'sourcing'],
  },
  {
    id: 'vendor-capability-sourcing',
    label: 'Vendor Capability Sourcing',
    description: 'Research available vendors and their specific capabilities (e.g., can a pitmaster handle this event size? What cuisines do they offer?).',
    gapTypes: ['vendor-capability'],
    fieldPathPattern: null,
    defaultProviders: ['catering-network', 'event-industry', 'community-forums', 'venue-network'],
    defaultPriority: 'high',
    defaultTrigger: 'research',
    tags: ['vendor', 'capability', 'sourcing'],
  },
  {
    id: 'regulation-compliance',
    label: 'Regulation & Compliance',
    description: 'Identify permits, health codes, or regulations affecting this event type.',
    gapTypes: ['safety', 'governance'],
    fieldPathPattern: null,
    defaultProviders: ['fda-foodsafety', 'data.gov', 'astm-iso'],
    defaultPriority: 'high',
    defaultTrigger: 'sme',
    tags: ['regulation', 'compliance'],
  },
  {
    id: 'community-validation',
    label: 'Community Validation',
    description: 'Get corroboration from community/forum sources for existing facts.',
    gapTypes: ['pricing', 'quantity'],
    fieldPathPattern: null,
    defaultProviders: ['community-forums'],
    defaultPriority: 'low',
    defaultTrigger: 'validation',
    tags: ['community', 'validation'],
  },
  {
    id: 'academic-grounding',
    label: 'Academic Grounding',
    description: 'Find authoritative academic or research sources to cite for key claims.',
    gapTypes: ['citation'],
    fieldPathPattern: 'knowledge.sources',
    defaultProviders: ['scholar'],
    defaultPriority: 'med',
    defaultTrigger: 'research',
    tags: ['academic', 'citation'],
  },
  {
    id: 'government-data',
    label: 'Government Data Pull',
    description: 'Pull authoritative government statistics: USDA prices, NOAA data, BLS CPI.',
    gapTypes: ['pricing', 'citation'],
    fieldPathPattern: null,
    defaultProviders: ['data.gov', 'noaa'],
    defaultPriority: 'med',
    defaultTrigger: 'research',
    tags: ['government', 'official', 'pricing'],
  },
  {
    id: 'cross-vendor-price-check',
    label: 'Cross-Vendor Price Check',
    description: 'Compare prices across 2+ commercial sources to derive a corroborated range.',
    gapTypes: ['pricing'],
    fieldPathPattern: 'unitCostRange',
    defaultProviders: ['market-pricing', 'retail', 'restaurant-depot'],
    defaultPriority: 'high',
    defaultTrigger: 'research',
    tags: ['pricing', 'cross-check'],
  },
  {
    id: 'sme-interview',
    label: 'SME Interview',
    description: 'Queue a subject matter expert interview for domain-specific knowledge gaps.',
    gapTypes: ['sme-revision'],
    fieldPathPattern: null,
    defaultProviders: ['sme-network'],
    defaultPriority: 'med',
    defaultTrigger: 'sme',
    tags: ['sme', 'expert'],
  },
  {
    id: 'seasonal-adjustment',
    label: 'Seasonal Adjustment',
    description: 'Research seasonal pricing variation or availability windows.',
    gapTypes: ['pricing'],
    fieldPathPattern: null,
    defaultProviders: ['market-pricing', 'noaa', 'tourism-board'],
    defaultPriority: 'med',
    defaultTrigger: 'freshness',
    tags: ['seasonal', 'pricing', 'availability'],
  },
  {
    id: 'contradiction-resolution',
    label: 'Contradiction Resolution',
    description: 'Resolve a detected contradiction between two evidence records (requires SME).',
    gapTypes: ['contradiction'],
    fieldPathPattern: null,
    defaultProviders: ['sme-network', 'internal-validation'],
    defaultPriority: 'high',
    defaultTrigger: 'validation',
    tags: ['contradiction', 'conflict'],
  },
];

// Get a template by id. Returns undefined if not found.
export function getTemplate(id) {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === id);
}

// Suggest templates for a given fieldPath (returns matching templates, most specific first).
export function suggestTemplates(fieldPath) {
  if (!fieldPath) return CAMPAIGN_TEMPLATES;
  const matched = CAMPAIGN_TEMPLATES.filter(
    (t) => t.fieldPathPattern && fieldPath.includes(t.fieldPathPattern)
  );
  const agnostic = CAMPAIGN_TEMPLATES.filter((t) => t.fieldPathPattern === null);
  return [...matched, ...agnostic];
}

// Apply a template to campaign creation params (merges template defaults with overrides).
export function applyTemplate(templateId, overrides = {}) {
  const t = getTemplate(templateId);
  if (!t) return overrides;
  return {
    gapType: t.gapTypes[0],
    gapTypes: t.gapTypes,
    providers: t.defaultProviders,
    priority: t.defaultPriority,
    trigger: t.defaultTrigger,
    goal: t.label,        // caller should override with specific goal
    ...overrides,
  };
}
