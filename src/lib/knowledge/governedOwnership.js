// ─── GOVERNED FIELD OWNERSHIP — who actually controls runtime (Phase 5E.1) ───
//
// WHY THIS EXISTS. Phase 5E published `p_crabs.qtyPerGuest = 0.5` through every
// governance gate and measured the result:
//
//   WITH governed 0.5   -> qty: 6 dozens | perGuest: 0.5
//   WITHOUT (authored)  -> qty: 6 dozens | perGuest: 0.3333
//   COUNT MOVED: false  |  RATE MOVED: true
//
// The rate moved. The count did not. `p_crabs` is priced and counted by the crab
// engine, which quantises to real buying units — dozen for <=2 pickers, half
// bushel for 4-8, full bushel for 8-15 — and varies crabs-per-bushel by size. A
// governed per-guest rate cannot move a bushel.
//
// That is WORSE than a no-op. The line then states "0.5/guest" beside a count
// sized by something else: two numbers on one row that disagree, both wearing the
// authority of governance. A governance system that can publish a value which
// does not control the output is not a governance system.
//
// So ownership is now declared, and the correction UI refuses fields it does not
// own. Pure: no I/O, no UI, no storage.

/** Engines that own a field outright. The correction UI names them to the admin. */
export const ENGINES = Object.freeze({
  sourcingPrices: {
    id: 'sourcingPrices',
    label: 'the sourcing-price model',
    why: 'This protein is priced per CHANNEL — butcher, Costco, grocery — from its own '
       + 'researched `sourcingPrices` table. That table wins over `unitCostRange`, so a '
       + 'governed flat range is read by nothing.',
    governedBy: ['sourcingPrices'],
  },
  crabServing: {
    id: 'crabServing',
    label: 'the crab engine',
    why: 'Blue crabs are bought in real units — dozen, half bushel, bushel — and '
       + 'crabs-per-bushel changes with size. The engine quantises to those '
       + 'thresholds, so a per-guest rate cannot move the count.',
    // The fields that DO govern it. Correcting these changes host output.
    // The fields that DO govern it, each with a verified consumer. `servingModel`
    // and `purchaseThresholds` were named here in 5E.1 and DO NOT EXIST in the data
    // model — I invented them from an example. That was fake governance of exactly
    // the kind this contract forbids, introduced by the contract itself.
    governedBy: ['priceLadder', 'servingGuide'],
  },
});

// Fields a purchase carries that the crab engine overrides for p_crabs. Measured,
// not assumed: playbooks/index.js:3516 delegates the whole line when
// `p.id === 'p_crabs' && _crabDelegated`, replacing qty, unit and cost.
const CRAB_DELEGATED_FIELDS = ['qtyPerGuest', 'qtyFlat', 'unitCostRange'];

// THE RUNTIME CONSUMER SET (Phase 5E.2). A field is governable ONLY if
// governedPurchase() resolves it — that function is the single seam through which
// published knowledge reaches the food plan. Anything outside this list has no
// consumer, so publishing it would produce an authoritative value that changes
// nothing. Kept in sync with GOVERNED_PURCHASE_FIELDS by a test, not by memory.
export const RUNTIME_CONSUMED_FIELDS = Object.freeze([
  'unitCostRange', 'qtyPerGuest', 'qtyFlat', 'provenance', 'priceLadder', 'servingGuide',
  // costProvenance (2026-08-18). The cost registry grew from 27 sources to ~325 in one
  // session and NONE of them were reachable from the console, because this list is what
  // the picker derives its field menu from and cost was missing. It is genuinely
  // runtime-consumed — governedPurchase resolves it and purchaseCostProvenance reads it.
  'costProvenance',
]);

/**
 * fieldOwnership(assetId, fieldPath) -> {
 *   fieldPath, owner, drivesRuntime, editable, correctionType, engine?, why?
 * }
 *
 * `owner` is 'playbook' when the authored/governed value is what runtime reads,
 * or an engine id when something else computes it.
 *
 * `drivesRuntime` is the load-bearing flag: false means publishing this value
 * changes a displayed rate without changing what the host actually buys.
 */
// PURCHASES PRICED BY CHANNEL, NOT BY A FLAT RANGE (Phase 5E.4).
//
// `srcTierRange()` in playbooks/index.js returns `p.sourcingPrices[tier]` for a protein
// that authors one, and that WINS over `unitCostRange` — so governing the flat range on
// these lines publishes a number nothing reads. Found by the runtime contract test, not
// by reading: the raw output appeared to move because `governedFields` had changed.
//
// This list is a FALLBACK for callers that cannot supply the purchase object (the
// publish gate resolves a field path, not a playbook). It is pinned to reality by a
// test, and independently by the contract test, which checks OUTPUT and therefore fails
// if this list ever goes stale in either direction.
export const CHANNEL_PRICED_PURCHASES = Object.freeze([
  'p_protein', 'p_ribs', 'p_chicken', 'p_burgers_dogs',
]);

/** Does this purchase price itself per channel rather than from `unitCostRange`? */
function isChannelPriced(purchaseId, purchase) {
  if (purchase && typeof purchase === 'object') {
    return !!(purchase.sourcingPrices && typeof purchase.sourcingPrices === 'object');
  }
  return CHANNEL_PRICED_PURCHASES.includes(purchaseId);
}

export function fieldOwnership(assetId, fieldPath, purchase) {
  const parts = String(fieldPath || '').split('.');
  const purchaseId = parts[0] || '';
  const field = parts.length > 1 ? parts[parts.length - 1] : '';

  const base = {
    fieldPath, owner: 'playbook', drivesRuntime: true, editable: true,
    correctionType: 'value',
  };

  // Provenance is metadata: it drives the host's "Sourced -" line directly and is
  // never computed by an engine, so it is always correctable.
  if (field === 'provenance' || field === 'costProvenance') return { ...base, correctionType: 'provenance' };

  // A channel-priced protein. Same shape as the crab delegation and for the same
  // reason: another model already owns this number, so a governed value here would be
  // authoritative and unread.
  if (field === 'unitCostRange' && isChannelPriced(purchaseId, purchase)) {
    return {
      ...base,
      owner: 'sourcingPrices',
      drivesRuntime: false,
      editable: false,
      correctionType: 'delegated',
      engine: ENGINES.sourcingPrices,
      why: ENGINES.sourcingPrices.why,
    };
  }

  // The crab line. Delegation is per-purchase, not per-playbook: every OTHER
  // Crab Feast purchase (Old Bay, butter, corn) is priced straight off the
  // playbook and stays fully governable.
  if (purchaseId === 'p_crabs' && CRAB_DELEGATED_FIELDS.includes(field)) {
    return {
      ...base,
      owner: 'crabServing',
      drivesRuntime: false,
      editable: false,
      correctionType: 'delegated',
      engine: ENGINES.crabServing,
      why: ENGINES.crabServing.why,
    };
  }

  // The fields that DO govern the crab engine.
  if (purchaseId === 'p_crabs' && ENGINES.crabServing.governedBy.includes(field)) {
    return { ...base, correctionType: 'governing-model', governs: 'crabServing' };
  }

  // NO CONSUMER, NO GOVERNANCE. The contract, enforced structurally rather than by
  // a hand-maintained allowlist: if governedPurchase does not read the field, a
  // published value cannot reach a host, so it must not be publishable.
  // SCOPED TO PURCHASE PATHS. `RUNTIME_CONSUMED_FIELDS` describes what
  // governedPurchase() reads, which is a statement about PURCHASE fields (`p_*.x`)
  // and nothing else. Decisions, playbook-level fields and non-purchase paths have
  // other consumers or none, and this registry has no standing to judge them — a
  // contract that over-claims is as untrustworthy as one that under-claims.
  if (/^p_/.test(purchaseId) && !RUNTIME_CONSUMED_FIELDS.includes(field)) {
    return {
      ...base,
      owner: 'none',
      drivesRuntime: false,
      editable: false,
      correctionType: 'no-consumer',
      why: `No runtime consumer reads ${field}. Publishing it would create an `
         + 'authoritative value that changes nothing a host sees.',
    };
  }

  return base;
}

/**
 * correctableFields(assetId, purchaseId, candidates) -> string[]
 *
 * The subset of `candidates` an admin may actually correct for this purchase.
 * Used by the UI so a delegated field is never offered, rather than offered and
 * then refused.
 */
export function correctableFields(assetId, purchaseId, candidates) {
  return (candidates || []).filter((f) => fieldOwnership(assetId, `${purchaseId}.${f}`).editable);
}

/**
 * blockedMessage(ownership) -> string | null
 *
 * The sentence shown when a field is delegated. It names the engine and points
 * at the governing rule, because "you cannot edit this" without a next step is
 * how an admin concludes the system is broken.
 */
export function blockedMessage(o) {
  if (!o || o.drivesRuntime) return null;
  const govern = (o.engine && o.engine.governedBy) || [];
  return `This value is calculated by ${o.engine ? o.engine.label : 'an engine'}. `
       + `Correct the governing rule instead${govern.length ? ` — ${govern.join(', ')}` : ''}.`;
}
