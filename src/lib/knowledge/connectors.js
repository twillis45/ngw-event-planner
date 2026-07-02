// ─── Research Connectors — provider interface (KAS-2, architecture only) ──────
// A Connector is an acquisition source. It produces OBSERVATIONS ONLY — never Evidence
// findings, never conclusions, never edits. No crawlers, no scheduled jobs, no browser
// automation, no LLM orchestration (KAS-2 mandate). This is the interface + ONE working
// stub (the corpus connector); external connectors (official/vendor/weather/regulations/
// academic/publisher/SME) are declared but not executing.

import { AUTHORITY_LEVELS } from './evidence';
import { createObservation } from './observation';
import { buildPlaybookRegistry } from '../playbooks/playbookRegistry';

export const CONNECTOR_KINDS = ['official', 'vendor-pricing', 'weather', 'regulations', 'academic', 'publisher', 'sme', 'corpus'];

// Interface: { id, kind, authorityLevel, observe(ctx) -> Observation[] }
export function makeConnector({ id, kind, authorityLevel = 'community', observe }) {
  if (!CONNECTOR_KINDS.includes(kind)) throw new Error(`Connector: unknown kind '${kind}'`);
  if (authorityLevel && !AUTHORITY_LEVELS.includes(authorityLevel)) throw new Error(`Connector: bad authorityLevel '${authorityLevel}'`);
  return { id, kind, authorityLevel, observe: typeof observe === 'function' ? observe : () => [] };
}

// The ONE live connector: the corpus itself. It observes the Knowledge Registry's derived
// research queue (grounding/pricing/staleness gaps) and emits Observations. It produces
// NO evidence and NO findings — it only says "look here" (the honest boundary).
export const corpusConnector = makeConnector({
  id: 'corpus', kind: 'corpus', authorityLevel: 'derived',
  observe: ({ asOf } = {}) => {
    const reg = buildPlaybookRegistry(asOf);
    const KIND = { pricing: 'pricing', sources: 'missing-citation', cadence: 'stale', review: 'stale', 'food-safety': 'coverage' };
    return reg.research.map((r) => createObservation({
      kind: KIND[r.kind] || 'coverage',
      statement: r.reason,
      source: 'corpus',
      gapType: r.kind === 'pricing' ? 'pricing' : r.kind === 'sources' ? 'grounding' : 'coverage',
      assetId: r.type,
      fieldPath: r.kind === 'pricing' ? 'purchases[].unitCostRange' : r.kind === 'sources' ? 'knowledge.sources' : 'governance',
      at: asOf,
    }));
  },
});

// Declared external connectors — interfaces only, observe() = no-op (NOT executing).
export const DECLARED_CONNECTORS = [
  { id: 'usda', kind: 'official', authorityLevel: 'primary' },
  { id: 'restaurant-depot', kind: 'vendor-pricing', authorityLevel: 'trade' },
  { id: 'noaa', kind: 'weather', authorityLevel: 'official' },
  { id: 'fda', kind: 'regulations', authorityLevel: 'primary' },
  { id: 'sme-network', kind: 'sme', authorityLevel: 'expert' },
].map((c) => makeConnector({ ...c, observe: () => [] })); // no-op: architecture only, no crawlers
