// ─── Governed Asset — the generalization above "playbook" ─────────────────────
// A Governed Asset is any canonical knowledge object that inherits the SAME governance
// capabilities (lifecycle · maturity · health · provenance · review cadence · dependency
// graph · KCR history · version history · validation history). Playbook is kind #1; the
// abstraction is what lets 40 → 40,000 assets scale without a new operating model.
//
// CRITICAL (no duplication): this does NOT re-implement any capability. It DELEGATES to
// the Knowledge Registry derivations (playbookRegistry.js). A new kind becomes governed
// by conforming to the shared shape + registering its `kind` — never by copying logic.
//
// DOCTRINE NOTE (challenged, per the sprint's own rule): the candidate list includes
// Runbook / Checklist / Template. Per KNOWLEDGE_OPERATING_SYSTEM §Knowledge Model, those
// are PROJECTIONS of an authored asset (a coordinator runbook = project(playbook, role,
// phase)), NOT independently-authored kinds. They are governed as VIEWS of their source
// asset, not as separate corpus entries — otherwise truth forks. Only kinds that carry
// INDEPENDENT authored truth are governed assets below.

import { playbookRegistryEntry } from '../playbooks/playbookRegistry';

// Kinds that carry INDEPENDENT authored truth (governed as corpus entries).
export const GOVERNED_ASSET_KINDS = [
  'playbook',            // occasion knowledge (39 live today)
  'venue-kit',           // operator knowledge for a venue
  'guide',               // cuisine / regional / holiday / safety reference that refines a plan
  'policy',              // org rules
  'procedure',           // operational SOP / emergency procedure
  'prompt-pack',         // governed AI prompt sets (authored + versioned + validated like any knowledge)
  'corporate-standard',  // enterprise standard
  'reference',           // non-projecting lookup
];

// Kinds that are DERIVED PROJECTIONS of an authored asset — governed as views, not entries.
export const PROJECTED_KINDS = ['runbook', 'checklist', 'template', 'workflow'];

export function isGovernedKind(kind) { return GOVERNED_ASSET_KINDS.includes(kind); }
export function isProjectedKind(kind) { return PROJECTED_KINDS.includes(kind); }

// The shared capability set every governed asset inherits — DELEGATED, not duplicated.
// Today only `playbook` has a concrete deriver (the shipped registry); other kinds plug
// in a deriver of the same SHAPE and inherit lifecycle/maturity/health/etc. for free.
const DERIVERS = {
  playbook: (asset, asOf) => playbookRegistryEntry(asset, asOf),
};

export function governedAssetEntry(asset, kind, asOf) {
  if (isProjectedKind(kind)) {
    throw new Error(`governedAsset: '${kind}' is a projection, not a governed kind — govern its source asset and project it (KNOWLEDGE_OPERATING_SYSTEM §Knowledge Model)`);
  }
  const derive = DERIVERS[kind];
  if (!derive) {
    // Honest-empty: the kind is recognized but has no concrete deriver yet. It still
    // inherits the CONTRACT (the capability keys), so the Command Center can show it as
    // "governed, deriver pending" rather than fabricate metrics.
    return {
      kind, id: null, type: (asset && asset.type) || null,
      capabilities: CAPABILITIES, derived: false,
      note: `'${kind}' is a governed kind; its registry deriver is not built yet — capabilities inherited, metrics awaiting a deriver.`,
    };
  }
  return { kind, derived: true, capabilities: CAPABILITIES, ...derive(asset, asOf) };
}

// The permanent capability contract every governed asset answers (keys, not values).
export const CAPABILITIES = [
  'lifecycle', 'maturity', 'health', 'provenance', 'reviewCadence',
  'dependencyGraph', 'kcrHistory', 'versionHistory', 'validationHistory',
];
