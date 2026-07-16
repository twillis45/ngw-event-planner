// demo/src/lib/knowledge/costProvenance.js
//
// Wave-2i GROUNDING — source the cost-factor provenance.
//
// The Grounding re-score (held 3) found the dimension min-governed by COST: only 1/46
// costFactor decisions (crab_size) carried `tier:'researched'`; the other 45 self-flagged
// "synthesized — needs verification." Its #1 lever: "research the 45 synthesized
// costFactorProvenance to dated market sources — even 10/46 with a costResearched predicate
// mirroring the cultural one would lift the cap off 2%."
//
// This registers REAL, dated market sources (USDA/BLS retail meat prices; 2026 catering
// per-person guides; the DMV crab-house survey crab_size already cites) so a cost factor's
// ratio claim can be GROUNDED. Same discipline as the other axes: researched only with real
// cited sources, nothing invented. Factors reference these ids from their costFactorProvenance.

export const COST_SOURCES = {
  'usda-meat-2026': {
    org: 'USDA ERS Meat Price Spreads / U.S. BLS retail food prices',
    url: 'https://www.ers.usda.gov/data-products/meat-price-spreads',
    fetched: '2026-07-16',
    claim: 'US retail, 2026: all-fresh beef ~$9.64/lb (record, +13% YoY); ground beef ~$5.63–6.83/lb; brisket ~$4.50/lb (range $2.50–8); pork chops ~$4.33/lb; chicken is the most affordable meat; premium beef cuts (ribeye ~$14.24/lb, strip ~$13.56/lb) run ~2–3x chicken — so a brisket/steak upgrade over a chicken/ribs base raises protein cost materially.',
  },
  'catering-perperson-2026': {
    org: 'The Catering Finder — Average Catering Cost Per Person 2026 (and corroborating 2026 catering guides)',
    url: 'https://thecateringfinder.com/advice/average-catering-cost-per-person-2026',
    fetched: '2026-07-16',
    claim: '2026 US catering per person: full-service $75–150; buffet with servers $45–85; drop-off buffet $28–50; drop-off $15–35. The food is often identical between drop-off and staffed — the price difference is LABOR — so full-service runs ~2–4x drop-off, and host-cooked/DIY is cheaper still. Add 20–30% for service, gratuity, and tax.',
  },
  'dmv-crab-2026': {
    org: 'DMV crab-house retail survey (Captain\'s White, Don\'s, Blue Crab House, Cameron\'s)',
    url: 'https://www.captainwhitesseafood.com/',
    fetched: '2026-07-03',
    claim: 'Four DMV blue-crab retail sources, July 2026: Large Male $72–98/dz baseline; Mediums $32–75; Large Females $52–75; XL Males $109–150; Jumbo $149–188 — establishing the size→price ratios used by crab_size.',
  },
};

// A costFactorProvenance is GROUNDED only when it is tier:'researched' AND cites >=1 real
// source id that resolves in COST_SOURCES (mirrors the other axes; an empty or synthesized
// provenance, or a sourceless 'researched' claim, is not grounding).
export function isGroundedCost(prov) {
  return !!(prov && typeof prov === 'object'
    && prov.tier === 'researched'
    && Array.isArray(prov.sources) && prov.sources.length > 0
    && prov.sources.every((s) => !!COST_SOURCES[s]));
}

export function costSourcesFor(prov) {
  if (!prov || !Array.isArray(prov.sources)) return [];
  return prov.sources.map((s) => COST_SOURCES[s]).filter(Boolean);
}
